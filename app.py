from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from datetime import datetime
import os

app = Flask(__name__)

# Global variables
model = None
trained_features = None
label_encoders = {}
original_data = None

def load_model_and_data():
    """Load the trained model and prepare encoders"""
    global model, trained_features, original_data
    
    # Load model
    model_path = "cspm_misconfiguration_model.pkl"
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        trained_features = model.feature_names_in_
        print(f"✅ Model loaded with {len(trained_features)} features")
        print(f"Features: {list(trained_features)}")
    else:
        raise FileNotFoundError(f"Model file {model_path} not found")
    
    # Load original data for samples
    if os.path.exists("output.csv"):
        original_data = pd.read_csv("output.csv")
        print(f"✅ Dataset loaded with {len(original_data)} records")
    
    # Create label encoders for each categorical column (matching notebook preprocessing)
    if original_data is not None:
        # Prepare data exactly like notebook
        df_prep = original_data.copy()
        df_prep.drop(columns=["id"], inplace=True, errors='ignore')
        df_prep["timestamp"] = pd.to_datetime(df_prep["timestamp"], errors="coerce")
        df_prep["year"] = df_prep["timestamp"].dt.year
        df_prep["month"] = df_prep["timestamp"].dt.month
        df_prep["day"] = df_prep["timestamp"].dt.day
        df_prep.drop(columns=["timestamp"], inplace=True)
        df_prep.fillna("Unknown", inplace=True)
        
        # Create encoders for each categorical column (matching notebook approach)
        for col in df_prep.columns:
            if df_prep[col].dtype == "object":
                le = LabelEncoder()
                le.fit(df_prep[col])
                label_encoders[col] = le
                print(f"✅ Encoder created for {col} with {len(le.classes_)} classes")

def preprocess_input(data_dict):
    """Preprocess input data to match model requirements (exactly like notebook)"""
    # Create a DataFrame from the input
    df = pd.DataFrame([data_dict])
    
    # Drop ID if present (not used in model)
    df.drop(columns=['id'], inplace=True, errors='ignore')
    
    # Convert timestamp to year, month, day (matching notebook)
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df['year'] = df['timestamp'].dt.year
        df['month'] = df['timestamp'].dt.month
        df['day'] = df['timestamp'].dt.day
        df.drop(columns=['timestamp'], inplace=True)
    elif 'year' not in df.columns:
        # If no timestamp, use current date
        now = datetime.now()
        df['year'] = now.year
        df['month'] = now.month
        df['day'] = now.day
    
    # Handle missing values (matching notebook)
    df.fillna("Unknown", inplace=True)
    
    # Encode categorical columns (matching notebook approach)
    for col in df.columns:
        if df[col].dtype == "object" and col in label_encoders:
            # Handle unseen values by using the first class (or most common)
            try:
                df[col] = label_encoders[col].transform(df[col])
            except ValueError:
                # Value not seen during training - use first class as default
                default_value = label_encoders[col].classes_[0]
                df[col] = label_encoders[col].transform([default_value])[0]
    
    # Ensure all required features are present
    if trained_features is not None:
        for feature in trained_features:
            if feature not in df.columns:
                # Use default value based on feature type
                if feature in ['year', 'month', 'day']:
                    now = datetime.now()
                    if feature == 'year':
                        df[feature] = now.year
                    elif feature == 'month':
                        df[feature] = now.month
                    else:
                        df[feature] = now.day
                else:
                    df[feature] = 0  # Default for encoded categorical
    
    # Select only trained features in correct order
    if trained_features is not None:
        df = df[trained_features]
    
    return df

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/samples', methods=['GET'])
def get_samples():
    """Get sample data from dataset"""
    if original_data is None:
        return jsonify({'error': 'Dataset not loaded'}), 404
    
    num_samples = request.args.get('num', default=10, type=int)
    samples = original_data.sample(min(num_samples, len(original_data))).to_dict('records')
    
    return jsonify({'samples': samples})

@app.route('/api/predict', methods=['POST'])
def predict():
    """Make prediction on input data"""
    try:
        data = request.json
        
        # Preprocess the input
        processed_df = preprocess_input(data)
        
        # Make prediction
        prediction = model.predict(processed_df)[0]
        probabilities = model.predict_proba(processed_df)[0]
        
        # Get risk score - use the highest probability class as risk indicator
        # For multi-class, we'll use 1 - probability of class 0 (secure) as risk
        max_prob_idx = np.argmax(probabilities)
        max_prob = probabilities[max_prob_idx]
        
        # Risk score: higher probability of non-zero classes indicates higher risk
        # Class 0 is typically "secure", so risk = 1 - P(class 0)
        if len(probabilities) > 0:
            secure_prob = probabilities[0] if len(probabilities) > 0 else 0
            risk_score = float((1 - secure_prob) * 100)
        else:
            risk_score = 50.0  # Default
        
        # Determine status - prediction != 0 means misconfiguration
        status = "⚠️ Misconfiguration Detected" if prediction != 0 else "✅ Secure Configuration"
        
        # Get all class probabilities for visualization
        class_probs = [float(p * 100) for p in probabilities]
        
        return jsonify({
            'success': True,
            'prediction': int(prediction),
            'status': status,
            'risk_score': round(risk_score, 2),
            'probabilities': class_probs,
            'message': f'Risk Score: {round(risk_score, 2)}%'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/batch_predict', methods=['POST'])
def batch_predict():
    """Make predictions on multiple inputs"""
    try:
        data_list = request.json.get('data', [])
        results = []
        
        for data in data_list:
            processed_df = preprocess_input(data)
            prediction = model.predict(processed_df)[0]
            probabilities = model.predict_proba(processed_df)[0]
            max_prob_idx = np.argmax(probabilities)
            secure_prob = probabilities[0] if len(probabilities) > 0 else 0
            risk_score = float((1 - secure_prob) * 100)
            
            results.append({
                'prediction': int(prediction),
                'risk_score': round(risk_score, 2),
                'status': "⚠️ Misconfiguration Detected" if prediction != 0 else "✅ Secure Configuration"
            })
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    print("🚀 Starting CSPM Simulator...")
    load_model_and_data()
    print("✅ Ready to serve predictions!")
    app.run(debug=True, host='0.0.0.0', port=5000)

