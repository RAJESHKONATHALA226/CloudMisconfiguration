from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from typing import Dict, List, Any

import pandas as pd
import numpy as np
import joblib
import os

from sklearn.preprocessing import LabelEncoder
from datetime import datetime

app = FastAPI(title="CSPM Misconfiguration API")

templates = Jinja2Templates(directory="templates")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# Global Variables
# ------------------------
model = None
trained_features = None
label_encoders = {}
original_data = None


# ------------------------
# Request Models
# ------------------------



# ------------------------
# Load Model
# ------------------------

def load_model_and_data():
    global model, trained_features, original_data

    model_path = "cspm_misconfiguration_model.pkl"

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"{model_path} not found")

    model = joblib.load(model_path)
    trained_features = model.feature_names_in_

    print(f"Loaded Model with {len(trained_features)} features")

    if os.path.exists("output.csv"):
        original_data = pd.read_csv("output.csv")
        print(f"Loaded Dataset : {len(original_data)} rows")

    if original_data is not None:

        df_prep = original_data.copy()

        df_prep.drop(columns=["id"], inplace=True, errors="ignore")

        df_prep["timestamp"] = pd.to_datetime(
            df_prep["timestamp"],
            errors="coerce"
        )

        df_prep["year"] = df_prep["timestamp"].dt.year
        df_prep["month"] = df_prep["timestamp"].dt.month
        df_prep["day"] = df_prep["timestamp"].dt.day

        df_prep.drop(columns=["timestamp"], inplace=True)

        df_prep.fillna("Unknown", inplace=True)

        for col in df_prep.columns:

            if (
                pd.api.types.is_object_dtype(df_prep[col])
                or pd.api.types.is_string_dtype(df_prep[col])
            ):
                le = LabelEncoder()
                le.fit(df_prep[col].astype(str))
                label_encoders[col] = le

                print(
                    f"Encoder Created : {col} ({len(le.classes_)})"
                )


# ------------------------
# Preprocessing
# ------------------------

def preprocess_input(data_dict):

    df = pd.DataFrame([data_dict])

    df.drop(columns=["id"], inplace=True, errors="ignore")

    if "timestamp" in df.columns:

        df["timestamp"] = pd.to_datetime(
            df["timestamp"],
            errors="coerce"
        )

        df["year"] = df["timestamp"].dt.year
        df["month"] = df["timestamp"].dt.month
        df["day"] = df["timestamp"].dt.day

        df.drop(columns=["timestamp"], inplace=True)

    elif "year" not in df.columns:

        now = datetime.now()

        df["year"] = now.year
        df["month"] = now.month
        df["day"] = now.day

    df.fillna("Unknown", inplace=True)

    for col in df.columns:

        if (
            col in label_encoders and
            (
                pd.api.types.is_object_dtype(df[col]) or
                pd.api.types.is_string_dtype(df[col])
            )
        ):

            df[col] = df[col].astype(str)

            try:
                df[col] = label_encoders[col].transform(df[col])

            except ValueError:

                default = label_encoders[col].classes_[0]

                df[col] = label_encoders[col].transform(
                    [default]
                )[0]

    for feature in trained_features:

        if feature not in df.columns:

            if feature in ["year", "month", "day"]:

                now = datetime.now()

                if feature == "year":
                    df[feature] = now.year

                elif feature == "month":
                    df[feature] = now.month

                else:
                    df[feature] = now.day

            else:
                df[feature] = 0

    df = df[trained_features]

    return df


# ------------------------
# Startup Event
# ------------------------

@app.on_event("startup")
def startup():

    print("Starting CSPM API...")

    load_model_and_data()

    print("API Ready")


# ------------------------
# Home Page
# ------------------------

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

# ------------------------
# Sample Records
# ------------------------

@app.get("/api/samples")
async def get_samples(num: int = 10):

    try:

        if original_data is None:
            raise HTTPException(
                status_code=404,
                detail="Dataset not loaded"
            )

        num = max(1, min(num, len(original_data)))

        samples = original_data.sample(n=num).to_dict(orient="records")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "count": len(samples),
                "samples": samples
            }
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ------------------------
# Prediction
# ------------------------

@app.post("/api/predict")
async def predict(data: Dict[str, Any]):

    try:

        processed_df = preprocess_input(data)

        prediction = int(model.predict(processed_df)[0])

        probabilities = model.predict_proba(processed_df)[0]

        secure_prob = probabilities[0]

        risk_score = float((1 - secure_prob) * 100)

        status = (
            "⚠️ Misconfiguration Detected"
            if prediction != 0
            else "✅ Secure Configuration"
        )

        return {
            "success": True,
            "prediction": prediction,
            "status": status,
            "risk_score": round(risk_score, 2),
            "probabilities": [
                round(float(x * 100), 2)
                for x in probabilities
            ],
            "message": f"Risk Score : {risk_score:.2f}%"
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
@app.post("/api/batch_predict")
async def batch_predict(data: List[Dict[str, Any]]):

    try:

        results = []

        for item in data:

            processed_df = preprocess_input(item)

            prediction = int(model.predict(processed_df)[0])

            probabilities = model.predict_proba(processed_df)[0]

            secure_prob = probabilities[0]

            risk_score = float((1 - secure_prob) * 100)

            results.append({
                "prediction": prediction,
                "risk_score": round(risk_score, 2),
                "status": (
                    "⚠️ Misconfiguration Detected"
                    if prediction != 0
                    else "✅ Secure Configuration"
                )
            })

        return {
            "success": True,
            "results": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )