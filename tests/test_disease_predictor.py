import pytest
from tests.conftest import auth_headers
from app.services.kaggle_dataset import get_all_symptoms, get_all_diseases, get_disease_profile_matrix
from app.services.disease_predictor import predict_diseases, normalize_and_match_symptoms



def test_kaggle_dataset_knowledge_base():
    """Verify Kaggle dataset dimensions: 773 conditions and 377 symptoms."""
    symptoms = get_all_symptoms()
    assert len(symptoms) == 377
    assert "sharp chest pain" in symptoms
    assert "shortness of breath" in symptoms
    assert "palpitations" in symptoms

    diseases = get_all_diseases()
    assert len(diseases) == 773

    matrix = get_disease_profile_matrix()
    assert matrix.shape == (773, 377)


def test_symptom_normalization_and_alias_matching():
    """Verify that user/frontend symptom names map to Kaggle dataset features."""
    raw = ["chest_pain", "difficulty_breathing", "fever"]
    matched = normalize_and_match_symptoms(raw, free_text="patient has dizziness and palpitations")
    assert "sharp chest pain" in matched or "chest tightness" in matched
    assert "shortness of breath" in matched or "breathing fast" in matched
    assert "fever" in matched
    assert "dizziness" in matched
    assert "palpitations" in matched


def test_cardiac_symptoms_disease_prediction():
    """Verify cardiac symptoms predict cardiac conditions and route to cardiology."""
    results = predict_diseases(
        symptoms=["sharp chest pain", "palpitations", "shortness of breath"],
        vitals={"heart_rate": 110, "spo2": 96, "blood_pressure_sys": 140},
        top_k=5,
    )
    assert len(results) == 5
    top_prediction = results[0]
    assert top_prediction["confidence_pct"] >= 50.0
    assert top_prediction["recommended_specialty"] == "cardiology"
    assert "12-Lead ECG" in top_prediction["recommended_diagnostics"]
    assert "ECG" in top_prediction["required_equipment"]


def test_respiratory_disease_prediction():
    """Verify respiratory symptoms and hypoxia predict respiratory conditions."""
    results = predict_diseases(
        symptoms=["cough", "breathing fast", "shortness of breath"],
        vitals={"spo2": 88, "heart_rate": 105},
        top_k=5,
    )
    assert len(results) == 5
    assert any(r["recommended_specialty"] in ["pulmonology", "general_medicine", "emergency_medicine"] for r in results)


@pytest.mark.asyncio
async def test_api_symptoms_catalog_endpoint(client):
    """Verify the public symptoms catalog endpoint returns all 377 symptoms."""
    resp = await client.get("/api/v1/recommendations/symptoms-catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_symptoms"] == 377
    assert len(data["symptoms"]) == 377
    assert "sharp chest pain" in data["symptoms"]


@pytest.mark.asyncio
async def test_api_predict_disease_endpoint(client, patient_token):
    """Verify the authenticated /predict-disease endpoint returns structured predictions."""
    headers = auth_headers(patient_token)
    payload = {
        "symptoms": ["sharp chest pain", "palpitations", "shortness of breath"],
        "vitals": {"heart_rate": 105, "spo2": 97, "blood_pressure_sys": 135},
        "chief_complaint": "Acute onset chest pressure during exertion",
        "top_k": 3,
    }
    resp = await client.post("/api/v1/recommendations/predict-disease", headers=headers, json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_predictions"] == 3
    assert len(data["predictions"]) == 3
    assert data["top_recommended_specialty"] == "cardiology"
    first = data["predictions"][0]
    assert "disease_name" in first
    assert first["confidence_pct"] > 0
    assert "recommended_diagnostics" in first
    assert len(first["recommended_diagnostics"]) > 0


@pytest.mark.asyncio
async def test_api_recommendation_match_includes_predicted_diseases(client, patient_token):

    """Verify that /recommendations/match integrates Kaggle disease predictions."""
    headers = auth_headers(patient_token)
    payload = {
        "symptoms": ["sharp chest pain", "palpitations"],
        "vitals": {"heart_rate": 100, "spo2": 98, "blood_pressure_sys": 125},
        "chief_complaint": "Palpitations and sharp chest pain",
    }
    resp = await client.post("/api/v1/recommendations/match", headers=headers, json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "predicted_diseases" in data
    assert len(data["predicted_diseases"]) > 0
    assert data["recommended_specialty"] == "cardiology"
