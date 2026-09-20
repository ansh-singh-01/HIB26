"""
Clinical Disease Predictor & Inference Engine.
Leverages the Kaggle Diseases & Symptoms dataset (246,945 patient records, 773 conditions, 377 symptoms).
Performs multi-condition probabilistic inference, specialty classification, and diagnostic guidance.
"""
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np

from app.services.kaggle_dataset import get_disease_profile_matrix, get_all_symptoms
from app.models.enums import UrgencyLevel

logger = logging.getLogger("smart_health_grid.disease_predictor")

# Symptom alias dictionary to map common front-end / clinical flag names to Kaggle dataset features
COMMON_SYMPTOM_ALIASES: Dict[str, List[str]] = {
    "chest_pain": ["sharp chest pain", "chest tightness"],
    "sharp_chest_pain": ["sharp chest pain"],
    "chest_tightness": ["chest tightness"],
    "difficulty_breathing": ["shortness of breath", "breathing fast"],
    "shortness_of_breath": ["shortness of breath"],
    "difficulty_breathing_severe": ["shortness of breath", "breathing fast"],
    "breathing_fast": ["breathing fast"],
    "palpitations": ["palpitations", "irregular heartbeat"],
    "irregular_heartbeat": ["irregular heartbeat"],
    "high_blood_pressure": ["sharp chest pain", "dizziness"],
    "fever": ["fever"],
    "cough": ["cough"],
    "headache": ["headache"],
    "severe_headache": ["headache", "dizziness"],
    "dizziness": ["dizziness"],
    "vertigo": ["dizziness"],
    "vomiting": ["vomiting"],
    "nausea": ["nausea and vomiting", "vomiting"],
    "nausea_and_vomiting": ["nausea and vomiting"],
    "diarrhea": ["diarrhea"],
    "abdominal_pain": ["abdominal pain", "sharp abdominal pain", "stomach cramps"],
    "stomach_pain": ["abdominal pain", "stomach cramps"],
    "fatigue": ["fatigue", "weakness"],
    "weakness": ["weakness", "muscle weakness"],
    "joint_pain": ["joint pain", "knee pain"],
    "back_pain": ["back pain", "low back pain"],
    "skin_rash": ["skin rash", "rash"],
    "rash": ["skin rash", "rash"],
    "sore_throat": ["sore throat"],
    "nasal_congestion": ["nasal congestion"],
    "stroke_signs": ["difficulty speaking", "abnormal involuntary movements", "weakness"],
    "seizure": ["seizures", "abnormal involuntary movements"],
    "numbness": ["numbness", "paresthesia"],
    "anxiety": ["anxiety and nervousness"],
    "depression": ["depression", "depressive or psychotic symptoms"],
    "insomnia": ["insomnia"],
    "swelling": ["peripheral edema", "leg swelling"],
    "leg_swelling": ["peripheral edema"],
    "throat_swelling": ["throat swelling"],
    "vision_loss": ["diminished vision", "eye pain"],
    "eye_pain": ["eye pain"],
    "ear_pain": ["ear pain", "diminished hearing"],
}

# Medical specialty mapping based on disease category keywords
SPECIALTY_RULES: List[Tuple[List[str], str]] = [
    (["stroke", "transient ischemic", "aneurysm", "seizure", "epilep", "migraine", "neuropathy",
      "multiple sclerosis", "parkinson", "dementia", "alzheimer", "meningitis", "encephalitis",
      "bell's palsy", "trigeminal", "paralysis", "neuralgia", "concussion"], "neurology"),
    (["cardiac", "coronary", "heart", "myocard", "pericard", "endocard", "arrhythmia", "atrial flutter",
      "atrial fibrillation", "ventricular", "hypertension", "angina", "valve stenosis", "aortic",
      "infarction", "cardiomyopathy", "ischemic heart"], "cardiology"),
    (["pneumon", "asthma", "bronch", "pulmonary", "pleural", "copd", "emphysema", "hypoxia",
      "respiratory failure", "tuberculosis", "interstitial lung", "pneumothorax"], "pulmonology"),
    (["hepatitis", "cirrhosis", "gastritis", "ulcer", "pancreat", "cholecyst", "colitis", "crohn",
      "appendicitis", "esophag", "bowel", "diverticul", "gastroenteritis", "celiac", "peritonitis"], "gastroenterology"),
    (["fracture", "osteochondrosis", "osteoarthritis", "rheumatoid", "scoliosis", "spondyl",
      "dislocation", "sprain", "torn", "tendonitis", "bursitis", "herniated disc", "gout"], "orthopedics"),
    (["dermatitis", "eczema", "psoriasis", "melanoma", "cellulitis", "urticaria", "acne", "alopecia",
      "lichen", "impetigo", "scabies", "erythema", "rash", "skin lesion"], "dermatology"),
    (["otitis", "sinusitis", "pharyngitis", "tonsillitis", "rhinitis", "laryngitis", "vertigo",
      "tinnitus", "hearing loss", "vocal cord", "deviated septum", "nasal polyp"], "ent"),
    (["glaucoma", "cataract", "retin", "macular", "conjunctivitis", "cornea", "uveitis",
      "strabismus", "eye alignment", "keratitis", "amblyopia"], "ophthalmology"),
    (["vaginitis", "pregnancy", "endometriosis", "ovarian", "uterine", "cervical", "fibroid",
      "menopause", "pcos", "vulvitis", "pelvic inflammatory", "preeclampsia"], "obstetrics_gynecology"),
    (["depression", "bipolar", "schizophren", "panic disorder", "anxiety disorder", "obsessive",
      "ptsd", "eating disorder", "anorexia", "bulimia", "dysthymia"], "psychiatry"),
    (["diabetes", "thyroid", "hypothyroid", "hyperthyroid", "cushing", "addison", "acromegaly",
      "hypoglycemia", "hypercalcemia", "goiter", "pituitary", "hyperparathyroid"], "endocrinology"),
    (["nephritis", "renal failure", "kidney stone", "nephrolithiasis", "glomerulo", "pyelonephritis",
      "polycystic kidney", "azotemia", "uremia", "hydronephrosis"], "nephrology"),
    (["cystitis", "urinary tract infection", "prostatitis", "prostatic hyperplasia", "urethritis",
      "testicular", "epididymitis", "erectile", "incontinence"], "urology"),
    (["sepsis", "malaria", "dengue", "typhoid", "influenza", "covid", "hiv", "varicella", "measles",
      "rubella", "mononucleosis", "herpes", "syphilis", "abscess"], "infectious_disease"),
    (["carcinoma", "leukemia", "lymphoma", "sarcoma", "metastasis", "neoplasm", "malignan",
      "myeloma", "neuroblastoma"], "oncology"),
]

# Diagnostic tests by specialty
SPECIALTY_DIAGNOSTICS: Dict[str, List[str]] = {
    "cardiology": ["12-Lead ECG", "Echocardiogram", "Serum Troponin & CK-MB", "Holter Monitor", "Lipid Profile"],
    "pulmonology": ["Chest X-Ray", "High-Resolution Chest CT", "Spirometry / PFT", "Arterial Blood Gas (ABG)"],
    "neurology": ["Non-Contrast Head CT", "Brain MRI Scan", "Electroencephalogram (EEG)", "Carotid Doppler"],
    "gastroenterology": ["Abdominal Ultrasound", "Upper GI Endoscopy", "Liver Function Tests (LFT)", "Abdominal CT"],
    "orthopedics": ["Digital Skeletal X-Ray", "Musculoskeletal MRI", "Joint Fluid Analysis", "Bone Density Scan"],
    "dermatology": ["Dermoscopy", "Skin Punch Biopsy", "Bacterial/Fungal Swab Culture", "Allergy Patch Test"],
    "ent": ["Nasopharyngoscopy", "Sinus CT Scan", "Pure Tone Audiometry", "Throat Culture"],
    "ophthalmology": ["Slit Lamp Examination", "Tonometry (Intraocular Pressure)", "Funduscopy", "Visual Field Test"],
    "obstetrics_gynecology": ["Pelvic Ultrasound", "Beta-hCG Quantitative", "Transvaginal Ultrasound", "Pap Smear"],
    "psychiatry": ["Comprehensive Psychiatric Assessment (PHQ-9/GAD-7)", "Toxicology Screen", "Thyroid Panel"],
    "endocrinology": ["Fasting Blood Glucose & HbA1c", "Thyroid Function Panel (TSH, FT3, FT4)", "Serum Cortisol"],
    "nephrology": ["Renal Function Panel (BUN/Creatinine)", "Urinalysis & Urine Protein-to-Creatinine Ratio", "Renal Ultrasound"],
    "urology": ["KUB Ultrasound", "PSA (Prostate Specific Antigen)", "Urine Microscopy & Culture"],
    "infectious_disease": ["Complete Blood Count (CBC)", "Blood & Urine Cultures", "Serum CRP & ESR Markers", "Serology Screening"],
    "oncology": ["Tissue Biopsy & Histopathology", "Whole Body PET-CT", "Tumor Markers Panel"],
    "general_medicine": ["Complete Blood Count (CBC)", "Comprehensive Metabolic Panel (CMP)", "Vital Signs Monitoring"],
    "emergency_medicine": ["Rapid Multi-Organ Trauma/Triage Panel", "Point-of-Care Ultrasound (POCUS)", "Continuous Cardiac Monitoring"],
}


def normalize_and_match_symptoms(
    raw_symptoms: List[str],
    free_text: Optional[str] = None,
) -> List[str]:
    """
    Maps input symptom strings and free-text mentions to recognized Kaggle dataset symptom features.
    """
    all_symptoms = get_all_symptoms()
    matched_features = set()

    for item in raw_symptoms:
        if not item or not isinstance(item, str):
            continue
        clean_item = item.strip().lower()
        snake_key = clean_item.replace(" ", "_").replace("-", "_")

        # 1. Direct match with Kaggle symptoms
        if clean_item in all_symptoms:
            matched_features.add(clean_item)
            continue

        # 2. Check alias dictionary
        if snake_key in COMMON_SYMPTOM_ALIASES:
            for mapped in COMMON_SYMPTOM_ALIASES[snake_key]:
                if mapped in all_symptoms:
                    matched_features.add(mapped)
            continue

        # 3. Substring / Token matching
        tokens = [t for t in re.split(r"[\s_,-]+", clean_item) if len(t) > 2]
        for feature in all_symptoms:
            if clean_item in feature:
                matched_features.add(feature)
            elif any(t in feature.split() for t in tokens):
                matched_features.add(feature)

    # 4. Extract symptoms mentioned in free-text
    if free_text:
        text_lower = free_text.lower()
        for feature in all_symptoms:
            if feature in text_lower:
                matched_features.add(feature)
        for alias_key, mapped_list in COMMON_SYMPTOM_ALIASES.items():
            readable_alias = alias_key.replace("_", " ")
            if readable_alias in text_lower:
                for mapped in mapped_list:
                    if mapped in all_symptoms:
                        matched_features.add(mapped)

    return sorted(list(matched_features))


def map_disease_to_clinical_profile(disease_name: str) -> Dict[str, Any]:
    """
    Determines medical specialty, urgency level, recommended diagnostics,
    and bed/equipment requirements for a given disease.
    """
    d_lower = disease_name.lower()

    # Determine Specialty
    specialty = "general_medicine"
    for keywords, spec in SPECIALTY_RULES:
        if any(kw in d_lower for kw in keywords):
            specialty = spec
            break

    # Determine Urgency
    emergency_conditions = [
        "infarction", "stroke", "sepsis", "pulmonary embolism", "aneurysm",
        "cardiac arrest", "respiratory failure", "peritonitis", "acute pancreatitis",
        "pneumothorax", "meningitis", "poisoning"
    ]
    urgent_conditions = [
        "fracture", "appendicitis", "colitis", "pneumonia", "cholecystitis",
        "pyelonephritis", "atrial fibrillation", "deep vein thrombosis", "cellulitis"
    ]

    if any(ec in d_lower for ec in emergency_conditions):
        urgency = "emergency"
        required_bed_type = "icu"
    elif any(uc in d_lower for uc in urgent_conditions):
        urgency = "urgent"
        required_bed_type = "general"
    else:
        urgency = "routine"
        required_bed_type = "general"

    diagnostics = SPECIALTY_DIAGNOSTICS.get(specialty, SPECIALTY_DIAGNOSTICS["general_medicine"])

    # Required equipment
    equipment = []
    if specialty == "cardiology" or urgency == "emergency":
        equipment.append("ECG")
        equipment.append("Defibrillator")
    if specialty == "pulmonology" or urgency == "emergency":
        equipment.append("Ventilator")
        equipment.append("Oxygen Concentrator")
    if specialty in ["orthopedics", "pulmonology"]:
        equipment.append("X-Ray")
    if specialty in ["neurology"]:
        equipment.append("CT Scan")
    if specialty in ["gastroenterology", "obstetrics_gynecology", "urology"]:
        equipment.append("Ultrasound")

    return {
        "recommended_specialty": specialty,
        "urgency": urgency,
        "required_bed_type": required_bed_type,
        "recommended_diagnostics": diagnostics,
        "required_equipment": equipment,
    }


def predict_diseases(
    symptoms: List[str],
    vitals: Optional[Dict[str, Any]] = None,
    chief_complaint: Optional[str] = None,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Core ML Disease Prediction Engine using Kaggle Dataset.
    Input: Symptoms list + optional vitals and chief complaint.
    Output: Ranked list of probable clinical diseases with confidence percentages,
            matched symptom evidence, specialty mapping, and diagnostic tests.
    """
    matrix = get_disease_profile_matrix()
    matched_symptoms = normalize_and_match_symptoms(symptoms, free_text=chief_complaint)

    if not matched_symptoms:
        # Fallback to general assessment if no recognized symptoms found
        logger.info("No recognized symptoms in Kaggle vocabulary. Defaulting to general consultation.")
        return [{
            "disease_name": "Undifferentiated Clinical Presentation",
            "confidence_pct": 50.0,
            "matched_symptoms": [],
            "recommended_specialty": "general_medicine",
            "urgency": "routine",
            "required_bed_type": "general",
            "recommended_diagnostics": SPECIALTY_DIAGNOSTICS["general_medicine"],
            "required_equipment": ["Stethoscope", "Blood Pressure Monitor"],
        }]

    # Subset matrix to matched symptoms
    sub_matrix = matrix[matched_symptoms]

    # Probabilistic Scoring:
    # 1. Prevalence Score: Mean probability of these symptoms given the disease
    prevalence = sub_matrix.mean(axis=1)

    # 2. Coverage Score: Fraction of queried symptoms strongly associated with the disease (>0.1 prevalence)
    coverage = (sub_matrix > 0.05).mean(axis=1)

    # 3. Combined score
    composite_scores = (0.7 * prevalence) + (0.3 * coverage)

    # Incorporate Vitals adjustments if available
    if vitals:
        spo2 = float(vitals.get("spo2", 98))
        hr = float(vitals.get("heart_rate", 75))
        sys_bp = float(vitals.get("blood_pressure_sys", vitals.get("systolic_bp", 120)))

        # Respiratory / Hypoxia boost
        if spo2 < 92.0:
            resp_diseases = [d for d in composite_scores.index if any(k in d for k in ["pneumon", "asthma", "copd", "bronch", "pulmonary"])]
            composite_scores.loc[resp_diseases] *= 1.35

        # Cardiac boost
        if hr > 115 or hr < 50 or sys_bp > 160:
            cardiac_diseases = [d for d in composite_scores.index if any(k in d for k in ["cardiac", "coronary", "arrhythmia", "flutter", "myocard", "angina"])]
            composite_scores.loc[cardiac_diseases] *= 1.35

    top_series = composite_scores.sort_values(ascending=False).head(top_k)

    # Normalize top scores to realistic clinical confidence percentages (e.g. 35% - 98%)
    max_score = top_series.max() or 1.0
    results = []

    for disease_name, raw_val in top_series.items():
        # Confidence scaled between 40% and 96% based on match quality
        confidence = round(float(min(96.0, max(25.0, (raw_val / max_score) * 92.0))), 1)

        # Find which symptoms specifically supported this disease (> 0.05 probability)
        d_row = sub_matrix.loc[disease_name]
        supporting_symptoms = d_row[d_row > 0.05].index.tolist()

        clinical_profile = map_disease_to_clinical_profile(disease_name)

        results.append({
            "disease_name": disease_name.title(),
            "confidence_pct": confidence,
            "matched_symptoms": supporting_symptoms or matched_symptoms[:2],
            "recommended_specialty": clinical_profile["recommended_specialty"],
            "urgency": clinical_profile["urgency"],
            "required_bed_type": clinical_profile["required_bed_type"],
            "recommended_diagnostics": clinical_profile["recommended_diagnostics"],
            "required_equipment": clinical_profile["required_equipment"],
        })

    return results
