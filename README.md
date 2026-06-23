# 🛡️ AI-Powered Cloud Misconfiguration Detection (Next-Gen CSPM)

An AI-driven Cloud Security Posture Management (CSPM) simulator that detects cloud infrastructure misconfigurations across multiple cloud providers using Machine Learning.

This project leverages a trained classification model to analyze cloud configuration metadata and predict potential security risks, helping organizations proactively identify insecure cloud resources before they become vulnerabilities.

---

## 🚀 Features

### 🔍 Intelligent Misconfiguration Detection
- Detects insecure cloud configurations using a trained ML model.
- Generates risk scores for analyzed resources.
- Identifies potentially vulnerable cloud deployments.

### ☁️ Multi-Cloud Support
Supports security analysis across:

- AWS
- Microsoft Azure
- Google Cloud Platform (GCP)
- Oracle Cloud
- IBM Cloud
- Alibaba Cloud

### 📊 Risk Assessment Engine
- Probability-based classification.
- Risk scoring (0–100%).
- Secure vs Misconfigured status reporting.
- Batch prediction support.

### 🌐 Interactive Web Interface
- Modern Flask-based dashboard.
- Real-time prediction API.
- Sample dataset visualization.
- User-friendly risk reporting.

---

# 🏗️ Project Architecture

```text
┌────────────────────┐
│   User Interface   │
│  (Flask Frontend)  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Flask Backend    │
│     (app.py)       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Data Preprocessing │
│ Label Encoding     │
│ Feature Creation   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Trained ML Model   │
│ Random Forest      │
│ (Serialized PKL)   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Prediction Engine  │
│ Risk Score Output  │
└────────────────────┘
```

---

# 📂 Project Structure

```text
AI-powered-cloud-misconfiguration-detection/
│
├── app.py
├── cspm_misconfiguration_model.pkl
├── output.csv
├── input.jsonl
├── requirements.txt
├── run_app.sh
├── run_app.bat
│
├── templates/
│   └── index.html
│
├── static/
│   ├── style.css
│   └── script.js
│
└── AI_powered_cloud_Misconfiguration_Detection_(Next_Gen_CSPM).ipynb
```

---

# ⚙️ Tech Stack

## Backend
- Python
- Flask

## Machine Learning
- Scikit-Learn
- Random Forest Classifier
- Joblib

## Data Processing
- Pandas
- NumPy

## Frontend
- HTML
- CSS
- JavaScript

---

# 🧠 Machine Learning Workflow

## Data Preparation

The system processes cloud security findings and extracts:

- Cloud Provider
- Category
- Description
- Timestamp Features
  - Year
  - Month
  - Day

### Preprocessing Steps

1. Remove unnecessary identifiers.
2. Convert timestamps into numerical features.
3. Handle missing values.
4. Apply Label Encoding.
5. Align features with training schema.

---

## Model Training

The trained model is stored as:

```text
cspm_misconfiguration_model.pkl
```

The model learns patterns from cloud misconfiguration datasets and predicts whether a configuration is secure or vulnerable.

---

# 📈 Risk Scoring Logic

After prediction:

```python
Risk Score = (1 - Secure Probability) * 100
```

### Example

| Secure Probability | Risk Score |
|-------------------|------------|
| 0.95 | 5% |
| 0.75 | 25% |
| 0.50 | 50% |
| 0.20 | 80% |

---

# 🔌 API Endpoints

---

## Home Page

```http
GET /
```

Returns the web dashboard.

---

## Get Sample Records

```http
GET /api/samples
```

### Example

```http
GET /api/samples?num=10
```

### Response

```json
[
  {
    "id": "VUL001",
    "cloud_provider": "AWS",
    "category": "Misconfiguration"
  }
]
```

---

## Predict Single Configuration

```http
POST /api/predict
```

### Request

```json
{
  "cloud_provider": "AWS",
  "category": "Misconfiguration",
  "description": "Publicly accessible S3 bucket"
}
```

### Response

```json
{
  "success": true,
  "prediction": 1,
  "status": "⚠️ Misconfiguration Detected",
  "risk_score": 87.2
}
```

---

## Batch Prediction

```http
POST /api/batch_predict
```

### Request

```json
{
  "data": [
    {
      "cloud_provider": "AWS"
    },
    {
      "cloud_provider": "Azure"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "results": [
    {
      "prediction": 1,
      "risk_score": 90.4
    },
    {
      "prediction": 0,
      "risk_score": 12.3
    }
  ]
}
```

---

# 🗄️ Dataset Overview

The dataset contains examples of:

- Public Cloud Storage Buckets
- Weak IAM Policies
- Open Firewall Rules
- Public Databases
- Exposed APIs
- Kubernetes Misconfigurations
- Access Control Weaknesses
- Authentication Failures

Example cloud findings include:

| Cloud Provider | Example Issue |
|---------------|--------------|
| AWS | Public S3 Bucket |
| Azure | Anonymous Blob Storage |
| GCP | Unauthenticated Cloud Function |
| Oracle Cloud | Public Object Storage |
| IBM Cloud | Exposed Kubernetes API |
| Alibaba Cloud | Weak OSS CORS Policy |

---

# ▶️ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/next-gen-cspm.git
cd next-gen-cspm
```

---

## Create Virtual Environment

### Linux / Mac

```bash
python -m venv venv
source venv/bin/activate
```

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# 🚀 Run Application

## Linux

```bash
chmod +x run_app.sh
./run_app.sh
```

## Windows

```powershell
run_app.bat
```

## Manual Launch

```bash
python app.py
```

Application starts at:

```text
http://localhost:5000
```

---

# 📋 Requirements

```text
Flask==3.0.0
pandas==2.2.2
numpy==2.0.2
scikit-learn==1.6.1
joblib==1.5.3
```

---

# 🔐 Security Use Cases

This project can be used for:

- Cloud Security Posture Management (CSPM)
- Cloud Risk Assessment
- Security Operations Centers (SOC)
- Compliance Monitoring
- Security Training Simulators
- DevSecOps Pipelines
- Multi-Cloud Governance

---

# 🚧 Current Limitations

- Uses a static trained model.
- Limited feature engineering.
- No real-time cloud integration.
- No cloud API ingestion.
- No automated remediation workflows.

---

# 🔮 Future Enhancements

### Phase 2
- Real-time AWS/Azure/GCP integrations.
- Terraform and Kubernetes scanning.
- Compliance Mapping (CIS, NIST, ISO 27001).

### Phase 3
- LLM-Powered Risk Explanations.
- Remediation Recommendations.
- AI Security Copilot.

### Phase 4
- Multi-Tenant SaaS Architecture.
- Vector Database for Security Knowledge.
- Agentic AI Security Analyst.
- Autonomous Remediation Engine.

---

# 👨‍💻 Author

Developed as a Next-Generation CSPM Proof-of-Concept demonstrating how Machine Learning can enhance cloud security posture management through automated misconfiguration detection and risk assessment.

---

## ⭐ Project Goal

To build an intelligent cloud security platform capable of automatically detecting, explaining, prioritizing, and eventually remediating cloud misconfigurations across multi-cloud environments using AI.