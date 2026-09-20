"""
SQLite-Powered Offline Clinical Knowledge Base & Triage Matcher.
Enables offline and low-bandwidth intelligent clinical assessment,
disease-symptom resolution, immediate first-aid, and recommended next steps.
"""

import os
import json
import re
import sqlite3
from typing import Dict, Any, List, Optional
from pathlib import Path

DB_PATH = os.getenv("SQLITE_KB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "clinical_kb.db"))

CLINICAL_SEED_DATA = [
    {
        "name": "Myocardial Infarction (Heart Attack)",
        "category": "Cardiology",
        "aliases": ["heart attack", "cardiac arrest", "chest pain", "chest tightness", "chest pressure", "crushing chest pain", "angina"],
        "key_symptoms": ["chest pain", "left arm pain", "jaw pain", "shortness of breath", "cold sweat", "nausea", "lightheadedness", "palpitations"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Symptoms indicate potential acute myocardial ischemia or heart attack requiring immediate emergency medical resuscitation.",
        "immediate_actions": [
            "Call 108 Emergency Ambulance immediately.",
            "Have the person sit down, rest calmly, and avoid physical exertion or walking.",
            "Loosen any tight clothing around the neck and chest.",
            "If prescribed Nitroglycerin and systolic BP is stable, administer as directed.",
            "If not allergic to Aspirin, chew a non-enteric coated 300mg/325mg Aspirin while awaiting ambulance.",
            "Do NOT drive yourself to the hospital."
        ],
        "recommended_steps": [
            "Immediate 12-lead Electrocardiogram (ECG / EKG) within 10 minutes of arrival.",
            "Serial cardiac enzymes (High-sensitivity Troponin I or T).",
            "Emergency coronary angiography (Cath lab evaluation).",
            "Continuous telemetry monitoring and supplemental oxygen if SpO2 < 90%."
        ],
        "recommended_specialist": "Emergency Cardiologist / Interventional Cardiologist",
        "diagnostic_tests": ["12-Lead ECG", "Cardiac Troponin I", "Echocardiogram", "Chest X-Ray"],
        "red_flags": ["Loss of consciousness", "Unresponsiveness", "Severe breathlessness with blue lips (cyanosis)", "Cold clammy skin with unmeasurable BP"]
    },
    {
        "name": "Hypertensive Crisis",
        "category": "Cardiology",
        "aliases": ["high blood pressure", "hypertension", "bp spike", "severe high bp"],
        "key_symptoms": ["high blood pressure", "severe headache", "blurred vision", "dizziness", "nosebleed", "chest ache", "shortness of breath"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Severe elevation in blood pressure (>180/120 mmHg) with potential target organ compromise.",
        "immediate_actions": [
            "Rest quietly in a seated position for 5 minutes and recheck BP.",
            "Do not consume coffee, tea, or sodium.",
            "If BP remains >180/120 with headache, chest pain, or vision changes, proceed to Emergency room immediately.",
            "Do not double down on medications without physician guidance."
        ],
        "recommended_steps": [
            "Clinical evaluation for end-organ damage (heart, brain, kidneys, eyes).",
            "Serum creatinine and electrolytes test.",
            "Urinalysis to rule out proteinuria/hematuria.",
            "Gradual controlled blood pressure titration under medical supervision."
        ],
        "recommended_specialist": "Cardiologist / Internal Medicine Specialist",
        "diagnostic_tests": ["Renal Function Panel", "ECG", "Fundoscopy (Eye Exam)", "Urinalysis"],
        "red_flags": ["Chest pain", "Confusion or slurred speech", "Loss of vision", "Seizures"]
    },
    {
        "name": "Acute Asthma Attack / Bronchospasm",
        "category": "Pulmonology",
        "aliases": ["asthma", "asthma attack", "wheezing", "cannot breathe", "bronchospasm"],
        "key_symptoms": ["wheezing", "shortness of breath", "chest tightness", "persistent coughing", "inability to speak full sentences", "rapid breathing"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Acute constriction of bronchial airways limiting ventilation and oxygen exchange.",
        "immediate_actions": [
            "Sit completely upright; do NOT lie down.",
            "Use quick-relief rescue inhaler (Salbutamol / Albuterol) immediately: 2-4 puffs via spacer, repeat every 20 minutes if needed.",
            "Keep breathing slow and steady, using pursed-lip breathing.",
            "If inhaler fails to relieve distress or lips turn pale/blue, call 108 immediately."
        ],
        "recommended_steps": [
            "Peak Expiratory Flow (PEF) rate measurement.",
            "Pulse oximetry continuous SpO2 monitoring.",
            "Nebulization therapy with bronchodilators and systemic corticosteroids in clinic.",
            "Review asthma action plan and trigger identification."
        ],
        "recommended_specialist": "Pulmonologist / Respiratory Specialist",
        "diagnostic_tests": ["Spirometry / Peak Flow", "Chest X-Ray", "Arterial Blood Gas (ABG)", "Pulse Oximetry"],
        "red_flags": ["Straining neck muscles to breathe", "Peak flow < 50% personal best", "Blue fingernails/lips", "Extreme fatigue or confusion"]
    },
    {
        "name": "Pneumonia",
        "category": "Pulmonology",
        "aliases": ["chest infection", "lung infection", "pneumonia", "productive cough with fever"],
        "key_symptoms": ["fever with chills", "cough with green or rusty phlegm", "sharp chest pain on deep breathing", "rapid breathing", "fatigue", "sweating"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Infection inflaming the air sacs in one or both lungs, filling them with fluid or purulent material.",
        "immediate_actions": [
            "Monitor body temperature and SpO2 using a pulse oximeter.",
            "Stay thoroughly hydrated with warm fluids and electrolyte broths.",
            "Rest in an elevated chest posture to aid lung expansion.",
            "Do not take OTC cough suppressants without doctor approval, as clearing mucus is crucial."
        ],
        "recommended_steps": [
            "Consult a physician today for lung auscultation (listening for crackles/rales).",
            "Obtain a Chest X-ray (PA view) to confirm consolidation.",
            "Complete Blood Count (CBC) with differential to assess bacterial vs viral cause.",
            "Prescription antibiotic or antiviral therapy based on etiology."
        ],
        "recommended_specialist": "Pulmonologist / General Physician",
        "diagnostic_tests": ["Chest X-Ray PA", "Complete Blood Count (CBC)", "Sputum Culture", "C-Reactive Protein (CRP)"],
        "red_flags": ["Oxygen saturation dropping below 92%", "Confusion in older adults", "Persistent vomiting unable to retain fluids", "Coughing up fresh blood"]
    },
    {
        "name": "Dengue Fever",
        "category": "Infectious Disease",
        "aliases": ["dengue", "breakbone fever", "dengue hemorrhagic", "mosquito fever"],
        "key_symptoms": ["sudden high fever", "severe headache", "pain behind the eyes", "severe joint and muscle pain", "skin rash", "mild bleeding gums", "nausea"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Mosquito-borne viral infection characterized by sudden severe fever and potential thrombocytopenia (drop in platelets).",
        "immediate_actions": [
            "Aggressive oral rehydration: drink ORS, coconut water, and clean fluids continuously.",
            "CRITICAL: Avoid Aspirin, Ibuprofen, Naproxen, or any NSAIDs as they increase bleeding hemorrhage risks. Use ONLY Paracetamol for fever.",
            "Rest completely under mosquito netting to prevent secondary transmission.",
            "Schedule daily complete blood count (CBC) to monitor platelet count and hematocrit."
        ],
        "recommended_steps": [
            "Confirm via Dengue NS1 Antigen test (days 1-5) or IgM/IgG antibody test (day 5+).",
            "Monitor platelet count daily; if platelets < 50,000/mcL, hospital admission is mandatory.",
            "Check hematocrit for plasma leakage signs.",
            "Hydration maintenance protocol."
        ],
        "recommended_specialist": "Infectious Disease Specialist / General Physician",
        "diagnostic_tests": ["Dengue NS1 Antigen", "Dengue IgM/IgG ELISA", "Complete Blood Count (Platelet Count)", "Liver Function Test"],
        "red_flags": ["Severe abdominal pain", "Persistent vomiting", "Bleeding from gums/nose or under skin petechiae", "Black tarry stools", "Sudden drop in body temperature accompanied by severe lethargy"]
    },
    {
        "name": "Malaria",
        "category": "Infectious Disease",
        "aliases": ["malaria", "plasmodium", "chills and rigors", "periodic fever"],
        "key_symptoms": ["cyclical high fever", "violent shivering and chills", "profuse sweating", "headache", "nausea", "vomiting", "body aches"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Parasitic infection transmitted by Anopheles mosquitoes causing cyclical erythrocyte destruction and systemic fever.",
        "immediate_actions": [
            "Record fever pattern and timing of shivering cycles.",
            "Paracetamol for temperature control; avoid self-medicating with unconfirmed antimalarials.",
            "High fluid intake to counter dehydration from sweating.",
            "Prompt diagnostic blood test within 12-24 hours."
        ],
        "recommended_steps": [
            "Malaria Rapid Diagnostic Test (RDT) or peripheral blood smear (thick and thin smear).",
            "Determine species (P. falciparum vs P. vivax) for targeted Artemisinin-based Combination Therapy (ACT).",
            "Follow-up smear post-treatment to verify parasite clearance."
        ],
        "recommended_specialist": "General Physician / Tropical Medicine Consultant",
        "diagnostic_tests": ["Peripheral Blood Smear for MP", "Malaria Antigen RDT (Falciparum/Vivax)", "CBC", "Liver Panel"],
        "red_flags": ["Extreme jaundice (yellow eyes)", "Dark tea-colored urine", "Confusion or altered sensorium (Cerebral Malaria)", "Respiratory distress"]
    },
    {
        "name": "Typhoid Fever",
        "category": "Infectious Disease",
        "aliases": ["typhoid", "enteric fever", "salmonella typhi"],
        "key_symptoms": ["step-ladder progressive fever", "abdominal pain", "weakness and fatigue", "headache", "constipation or diarrhea", "coated tongue", "loss of appetite"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Systemic bacterial infection caused by Salmonella Typhi spread through contaminated water or food.",
        "immediate_actions": [
            "Drink only boiled or certified bottled water.",
            "Consume soft, bland, easily digestible meals (rice congee, boiled potatoes, bananas).",
            "Maintain strict hand hygiene to prevent family transmission.",
            "Avoid heavy physical work; complete bed rest is indicated."
        ],
        "recommended_steps": [
            "Typhidot IgM or Blood Culture (gold standard in 1st week).",
            "Widal test evaluation (after 7-10 days of fever).",
            "Prescription antibiotic course (Cephalosporins or Azithromycin as indicated by doctor).",
            "Stool culture after recovery to ensure carrier status clearance."
        ],
        "recommended_specialist": "Internal Medicine Physician / Gastroenterologist",
        "diagnostic_tests": ["Blood Culture for Salmonella", "Typhidot IgM", "Widal Test", "Stool Culture"],
        "red_flags": ["Sudden severe acute abdomen (risk of intestinal perforation)", "Internal GI bleeding", "Hypotension and septic shock"]
    },
    {
        "name": "Acute Gastroenteritis / Food Poisoning",
        "category": "Gastroenterology",
        "aliases": ["food poisoning", "loose motions", "diarrhea", "stomach flu", "vomiting", "stomach bug"],
        "key_symptoms": ["watery diarrhea", "frequent vomiting", "cramping stomach pain", "low grade fever", "dry mouth", "weakness", "dizziness"],
        "severity_level": "MODERATE",
        "urgency_code": "doctor_consult",
        "triage_summary": "Inflammation of gastrointestinal tract lining caused by bacterial, viral, or toxic food contamination.",
        "immediate_actions": [
            "Primary goal: replace fluid and electrolyte loss. Drink WHO-formula Oral Rehydration Salts (ORS) in sips after every loose stool.",
            "Do NOT take antimotility agents (like Loperamide) if you have high fever or bloody stools, as they trap bacteria in the gut.",
            "Follow BRAT diet: Bananas, Rice, Applesauce, Toast once vomiting slows.",
            "Avoid dairy, caffeine, spicy, oily foods, and artificial sweeteners."
        ],
        "recommended_steps": [
            "If diarrhea exceeds 48 hours or signs of dehydration appear, consult a clinic.",
            "Stool routine and microscopy to check for protozoa, ova, or occult blood.",
            "Electrolyte panel if severe vomiting prevents liquid retention.",
            "Short course of zinc supplements and probiotics."
        ],
        "recommended_specialist": "General Physician / Gastroenterologist",
        "diagnostic_tests": ["Stool Examination", "Serum Electrolytes", "Complete Blood Count"],
        "red_flags": ["No urine output for over 8 hours", "Inability to keep liquids down for 12 hours", "Bloody or tarry stools", "High persistent fever > 102°F"]
    },
    {
        "name": "Acute Appendicitis",
        "category": "Gastroenterology",
        "aliases": ["appendicitis", "right lower abdominal pain", "appendix pain"],
        "key_symptoms": ["pain starting near navel moving to lower right abdomen", "sharp localized pain on McBurney's point", "pain worsens with coughing or walking", "nausea and vomiting", "loss of appetite", "low-grade fever"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Acute inflammation of the vermiform appendix carrying imminent risk of rupture, peritonitis, and sepsis.",
        "immediate_actions": [
            "Do NOT eat or drink anything (keep strict NPO - Nil Per Os) in case emergency surgery is needed.",
            "Do NOT take laxatives or apply heating pads to the abdomen (heat can cause inflamed appendix to rupture).",
            "Do NOT take pain painkillers that mask symptoms before surgical exam.",
            "Proceed to the nearest hospital Emergency Department with surgical facility immediately."
        ],
        "recommended_steps": [
            "Immediate physical exam: check for rebound tenderness and guarding in right lower quadrant.",
            "Emergency Ultrasound Abdomen or Contrast-Enhanced CT Abdomen.",
            "Complete Blood Count (leukocytosis / elevated white blood cells).",
            "Emergency Laparoscopic or open appendectomy."
        ],
        "recommended_specialist": "General Surgeon / Emergency Medicine",
        "diagnostic_tests": ["Ultrasound Abdomen & Pelvis", "Abdominal CT Scan", "CBC with WBC differential", "Urinalysis (to rule out renal stone)"],
        "red_flags": ["Sudden temporary relief followed by severe generalized abdominal pain (indicates ruptured appendix)", "Rigid board-like abdomen", "High spiking fever and chills"]
    },
    {
        "name": "GERD / Acid Reflux",
        "category": "Gastroenterology",
        "aliases": ["acidity", "acid reflux", "gerd", "heartburn", "sour burps", "indigestion"],
        "key_symptoms": ["burning sensation in chest (heartburn)", "sour or bitter taste in mouth", "difficulty swallowing", "regurgitation of food or sour liquid", "sensation of lump in throat", "chronic dry cough"],
        "severity_level": "MILD",
        "urgency_code": "home_care",
        "triage_summary": "Chronic or acute backward flow of stomach acid into the esophagus irritating the epithelial lining.",
        "immediate_actions": [
            "Drink a small glass of room-temperature water or cold milk to soothe esophageal burn.",
            "Remain completely upright for at least 2 to 3 hours after eating; do NOT lie flat.",
            "Elevate the head of your bed by 6 inches.",
            "Avoid triggers: citrus, tomatoes, chocolates, peppermint, caffeine, and heavy fried meals.",
            "Over-the-counter antacid (magnesium/aluminum hydroxide) or H2 blocker can provide rapid temporary relief."
        ],
        "recommended_steps": [
            "If symptoms occur more than twice a week, consult a physician for proton-pump inhibitor (PPI) therapy.",
            "Upper GI Endoscopy if chronic or if accompanied by difficulty swallowing.",
            "H. Pylori screening test if refractory to standard antacids.",
            "Dietary and meal-timing lifestyle restructuring."
        ],
        "recommended_specialist": "Gastroenterologist / Family Medicine",
        "diagnostic_tests": ["Upper GI Endoscopy (EGD)", "Esophageal pH monitoring", "H. Pylori Stool Antigen"],
        "red_flags": ["Pain radiating to left arm or jaw (mimics cardiac ischemia)", "Difficulty or pain swallowing food (dysphagia)", "Unexplained weight loss", "Vomiting blood or coffee-ground material"]
    },
    {
        "name": "Kidney Stones (Renal Colic)",
        "category": "Nephrology / Urology",
        "aliases": ["kidney stone", "renal stone", "flank pain", "back pain with urine burning"],
        "key_symptoms": ["excruciating sharp pain in back and side (flank)", "pain radiating to lower abdomen and groin", "pain comes in waves and fluctuates in intensity", "pain or burning during urination", "pink red or brown urine", "nausea and vomiting"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Hard mineral deposits that form inside kidneys and cause severe ureteral spasm while passing through urinary tract.",
        "immediate_actions": [
            "Drink plenty of water (2 to 3 liters daily) unless contraindicated, to help flush small stones.",
            "Apply a warm compress or heating pad to the flank area for spasm relief.",
            "Over-the-counter NSAIDs (like Ibuprofen) under medical guidance for ureteral smooth muscle inflammation.",
            "Collect urine through a strainer to catch any passed stone for laboratory analysis."
        ],
        "recommended_steps": [
            "Non-contrast Computed Tomography of Kidneys, Ureters, and Bladder (NCCT KUB) to locate stone size and position.",
            "Urinalysis to assess microscopic hematuria and infection.",
            "Kidney function test (Serum Creatinine and BUN).",
            "Urological consultation for medical expulsive therapy (Tamsulosin) or lithotripsy (ESWL) if stone > 5mm."
        ],
        "recommended_specialist": "Urologist / Nephrologist",
        "diagnostic_tests": ["NCCT KUB (CT Scan)", "Renal Ultrasound", "Urinalysis", "Serum Creatinine"],
        "red_flags": ["Severe pain accompanied by high fever and chills (infected obstructed kidney is a life-threatening emergency)", "Inability to pass urine at all", "Intractable nausea and vomiting"]
    },
    {
        "name": "Urinary Tract Infection (UTI)",
        "category": "Urology / Nephrology",
        "aliases": ["uti", "urine infection", "burning urine", "frequent urination"],
        "key_symptoms": ["strong persistent urge to urinate", "burning sensation when urinating (dysuria)", "passing frequent small amounts of urine", "cloudy or strong-smelling urine", "pelvic pressure or lower belly ache"],
        "severity_level": "MODERATE",
        "urgency_code": "doctor_consult",
        "triage_summary": "Bacterial proliferation in the urinary system, commonly affecting bladder (cystitis) or urethra.",
        "immediate_actions": [
            "Increase water intake substantially to flush bacteria from the urinary tract.",
            "Avoid coffee, alcohol, citrus juices, and carbonated soft drinks which irritate the bladder.",
            "Urinate as soon as the urge strikes; do not hold urine.",
            "Use a hot water bottle on your lower abdomen to ease pelvic discomfort."
        ],
        "recommended_steps": [
            "Urinalysis (urine routine) to test for nitrites, leukocyte esterase, and white blood cells.",
            "Urine culture and sensitivity to identify specific bacterial strain before starting targeted antibiotics.",
            "Complete full course of prescribed antibiotic even if symptoms disappear after 2 days."
        ],
        "recommended_specialist": "General Physician / Urologist / Gynecologist",
        "diagnostic_tests": ["Urine Routine & Microscopy", "Urine Culture & Sensitivity", "Renal Ultrasound if recurrent"],
        "red_flags": ["High fever with shaking chills", "Pain in upper back and side (indicates infection has climbed to kidneys - Pyelonephritis)", "Nausea and vomiting"]
    },
    {
        "name": "Migraine Headache",
        "category": "Neurology",
        "aliases": ["migraine", "severe headache", "throbbing head pain", "one-sided headache", "aura"],
        "key_symptoms": ["pulsing or throbbing pain usually on one side of head", "extreme sensitivity to light sound or smells", "nausea and vomiting", "visual aura (zigzag lines blind spots flashing lights)", "worsens with physical movement"],
        "severity_level": "MODERATE",
        "urgency_code": "doctor_consult",
        "triage_summary": "Neurological condition characterized by recurring, moderate-to-severe throbbing unilateral headaches with sensory hyper-reactivity.",
        "immediate_actions": [
            "Rest in a completely dark, quiet room with eyes closed.",
            "Apply a cold ice pack or cool damp cloth across forehead and temples.",
            "Sip a small amount of caffeine (coffee or tea) early in the attack if it helps abort your headache.",
            "Take prescribed migraine abortive medication (e.g. Triptan) or NSAID at the very onset of symptoms."
        ],
        "recommended_steps": [
            "Keep a headache diary tracking foods, sleep patterns, screen time, and stress triggers.",
            "Neurological evaluation if attacks happen more than 4 times a month for prophylactic preventive therapy.",
            "Rule out secondary headaches via MRI Brain if headache pattern changes abruptly."
        ],
        "recommended_specialist": "Neurologist / Headache Specialist",
        "diagnostic_tests": ["MRI Brain (if red flags present)", "Neurological Cranial Nerve Exam", "Fundoscopic exam"],
        "red_flags": ["Sudden 'thunderclap' headache reaching maximum intensity in seconds (rule out Subarachnoid Hemorrhage)", "Headache with fever, stiff neck, and confusion (Meningitis)", "Headache accompanied by weakness, numbness, or speech difficulty"]
    },
    {
        "name": "Acute Stroke / TIA (Transient Ischemic Attack)",
        "category": "Neurology",
        "aliases": ["stroke", "brain attack", "paralysis", "facial droop", "slurred speech", "tia"],
        "key_symptoms": ["sudden facial drooping on one side", "sudden weakness or numbness in arm or leg", "slurred speech or inability to understand words", "sudden vision loss in one or both eyes", "sudden loss of balance or coordination"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Interrupted or reduced blood supply to part of the brain preventing tissue from getting oxygen and nutrients (Ischemic or Hemorrhagic).",
        "immediate_actions": [
            "ACT FAST: Face drooping? Arm weakness? Speech difficulty? Time to call 108 immediately!",
            "Note the exact time symptoms began (critical for clot-dissolving tPA window within 4.5 hours).",
            "Do NOT give anything to eat, drink, or swallow (high choking risk due to impaired gag reflex).",
            "Do NOT give Aspirin until hospital CT scan rules out brain hemorrhage.",
            "Keep patient lying flat on their side (recovery position) if vomiting."
        ],
        "recommended_steps": [
            "Immediate Non-Contrast CT Brain / MRI Brain Stroke Protocol within 20 minutes of hospital triage.",
            "Evaluate candidacy for IV Thrombolytic therapy (tPA/TNK) or mechanical endovascular thrombectomy.",
            "Continuous vital monitoring in dedicated Stroke ICU."
        ],
        "recommended_specialist": "Stroke Neurologist / Interventional Neuro-radiologist",
        "diagnostic_tests": ["NCCT Brain", "CT Angiography Brain & Neck", "MRI Brain DWI", "Carotid Doppler"],
        "red_flags": ["Rapidly progressing loss of consciousness", "Seizures", "Total hemiplegia (inability to move one half of body)"]
    },
    {
        "name": "Hypoglycemia (Low Blood Sugar)",
        "category": "Endocrinology / Diabetes",
        "aliases": ["low sugar", "hypoglycemia", "insulin shock", "diabetic shakiness"],
        "key_symptoms": ["shakiness and trembling", "profuse sweating and chills", "dizziness and lightheadedness", "fast pounding heartbeat", "intense hunger", "confusion or irritability", "blurred vision"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Blood glucose dropping below safe physiological threshold (<70 mg/dL), starving the brain of fuel.",
        "immediate_actions": [
            "Follow the 'Rule of 15': Consume 15 grams of fast-acting simple carbohydrates immediately (half cup fruit juice, 3-4 glucose tablets, or 1 tablespoon of sugar/honey).",
            "Wait 15 minutes, rest, and recheck blood glucose with glucometer.",
            "If blood sugar is still below 70 mg/dL, repeat with another 15g of fast-acting sugar.",
            "Once normal, eat a small snack with protein and complex carbs (bread with cheese, crackers) to prevent relapse.",
            "If patient is unconscious or unable to swallow safely, do NOT put food/liquids in mouth; call 108 and administer emergency Glucagon injection if trained."
        ],
        "recommended_steps": [
            "Review diabetes medications and insulin dosing with physician.",
            "Investigate trigger (missed meal, vigorous unplanned exercise, excess medication).",
            "Continuous Glucose Monitoring (CGM) evaluation."
        ],
        "recommended_specialist": "Endocrinologist / Diabetologist",
        "diagnostic_tests": ["Random Blood Glucose", "HbA1c", "Fasting & Postprandial Glucose", "C-Peptide"],
        "red_flags": ["Unresponsiveness or seizure", "Inability to swallow", "Persistent low readings despite two doses of carbohydrates"]
    },
    {
        "name": "Diabetic Ketoacidosis (DKA) / Hyperglycemia",
        "category": "Endocrinology / Diabetes",
        "aliases": ["high sugar", "dka", "diabetic coma", "hyperglycemia", "high blood sugar"],
        "key_symptoms": ["blood sugar consistently >250 mg/dL", "excessive extreme thirst", "frequent urination", "fruity sweet breath odor", "nausea and persistent vomiting", "deep rapid breathing (Kussmaul)", "abdominal pain", "confusion"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Life-threatening diabetes complication where lack of insulin forces body to break down fat into toxic ketones.",
        "immediate_actions": [
            "Check blood glucose and urine/blood ketone levels immediately.",
            "Drink plenty of plain water to counter severe cellular dehydration (do NOT drink sugary juices).",
            "If ketones are moderate or high, proceed to the nearest emergency facility immediately.",
            "Never stop baseline basal insulin without direct endocrinologist instructions."
        ],
        "recommended_steps": [
            "Immediate hospital admission for continuous IV insulin infusion.",
            "Aggressive IV fluid rehydration and electrolyte replacement (potassium monitoring).",
            "Arterial Blood Gas (ABG) monitoring for metabolic acidosis.",
            "Identify underlying infection or trigger."
        ],
        "recommended_specialist": "Endocrinologist / Critical Care Specialist",
        "diagnostic_tests": ["Serum Ketones & Urine Ketones", "Arterial Blood Gas (ABG)", "Comprehensive Metabolic Panel (Electrolytes)", "HbA1c"],
        "red_flags": ["Vomiting unable to hold fluids", "Confusion or decreased consciousness", "Rapid laboured breathing"]
    },
    {
        "name": "Anaphylaxis (Severe Allergic Reaction)",
        "category": "Allergy & Immunology",
        "aliases": ["severe allergy", "allergic reaction", "anaphylaxis", "food allergy attack", "bee sting allergy"],
        "key_symptoms": ["swelling of lips tongue throat or eyes", "difficulty breathing and stridor wheezing", "widespread itchy hives and skin flushing", "sudden drop in blood pressure", "dizziness or fainting", "abdominal cramps and vomiting"],
        "severity_level": "EMERGENCY",
        "urgency_code": "immediate_er",
        "triage_summary": "Rapidly progressing, life-threatening multi-organ allergic response causing airway occlusion and cardiovascular collapse.",
        "immediate_actions": [
            "Use Epinephrine Auto-Injector (EpiPen) into the outer mid-thigh immediately if available.",
            "Call 108 emergency ambulance immediately; state 'Anaphylaxis'.",
            "Lay the person flat on their back with feet elevated. If vomiting or struggling to breathe, sit them up or place in recovery position.",
            "Remove the allergen source if identifiable (e.g. scrape away bee stinger; do not squeeze).",
            "A secondary reaction (biphasic) can occur hours later, so emergency room monitoring for at least 4-6 hours is mandatory even if feeling better."
        ],
        "recommended_steps": [
            "Emergency IM Epinephrine administration every 5-15 minutes if symptoms persist.",
            "Supplemental oxygen and IV fluids for vascular tone support.",
            "Antihistamines and IV Corticosteroids as secondary adjunctive therapy.",
            "Comprehensive post-discharge allergy testing (IgE panels)."
        ],
        "recommended_specialist": "Allergist / Immunologist / Emergency Physician",
        "diagnostic_tests": ["Serum Tryptase (within 2-4 hours)", "Specific IgE Allergy Blood Test", "Skin Prick Testing (post-recovery)"],
        "red_flags": ["Feeling of throat closing", "Hoarseness or inability to speak", "Cyanosis (blueness)", "Fainting or collapse"]
    },
    {
        "name": "Acute Bone Fracture / Musculoskeletal Trauma",
        "category": "Orthopedics",
        "aliases": ["broken bone", "fracture", "bone injury", "broken arm", "broken leg", "wrist fracture"],
        "key_symptoms": ["intense localized bone pain", "visible deformity or unnatural angle", "rapid severe swelling and bruising", "inability to bear weight or move limb", "bone grinding sensation (crepitus)", "numbness or tingling below injury"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Break or crack in the continuity of bone structure resulting from traumatic force or impact.",
        "immediate_actions": [
            "Immobilize the injured area; do NOT attempt to realign or push protruding bones back into place.",
            "If bone has pierced skin (compound open fracture), cover with sterile clean cloth and apply gentle pressure around edges to control bleeding.",
            "Apply ice pack wrapped in a cloth to reduce swelling (do not apply ice directly on bare skin).",
            "Keep patient calm, warm, and resting. Do NOT give food or drink in case emergency reduction or surgery is required.",
            "Transport to orthopedic emergency facility."
        ],
        "recommended_steps": [
            "X-ray imaging of the injured bone and adjacent joints above and below.",
            "Neurovascular assessment (checking distal pulse, sensation, and capillary refill).",
            "Closed reduction with casting/splinting or open reduction internal fixation (ORIF) surgery.",
            "Tetanus prophylaxis toxoid if skin integrity is breached."
        ],
        "recommended_specialist": "Orthopedic Surgeon / Traumatologist",
        "diagnostic_tests": ["Digital X-Ray (AP & Lateral views)", "CT Scan for complex intra-articular fractures", "MRI for soft tissue ligament tears"],
        "red_flags": ["Bone protruding through skin (Open fracture)", "Loss of pulse or sensation in fingers/toes past the break", "Severe pale cold limb below injury"]
    },
    {
        "name": "Viral Fever / Acute Upper Respiratory Infection",
        "category": "General Medicine",
        "aliases": ["viral fever", "common cold", "flu", "running nose", "sore throat", "cough and cold"],
        "key_symptoms": ["mild to moderate fever", "runny or stuffy nose", "sore throat", "dry or loose cough", "body aches and fatigue", "sneezing and mild headache"],
        "severity_level": "MILD",
        "urgency_code": "home_care",
        "triage_summary": "Self-limiting viral illness affecting upper respiratory tract and immune response.",
        "immediate_actions": [
            "Adequate rest: get 8-10 hours of sleep to support immune recovery.",
            "Hydration: drink warm water, herbal teas, soups, and electrolyte fluids.",
            "Warm salt water gargles (half tsp salt in warm water) 3-4 times daily for sore throat relief.",
            "Steam inhalation to loosen nasal and sinus congestion.",
            "Paracetamol (500-650mg) as needed for fever and body aches (avoid antibiotics as they are ineffective against viruses)."
        ],
        "recommended_steps": [
            "If fever persists beyond 3 days without improvement, consult a doctor to rule out secondary bacterial infection.",
            "Complete Blood Count (CBC) if symptoms worsen.",
            "Influenza / COVID-19 rapid swab if widespread outbreak exposure is suspected."
        ],
        "recommended_specialist": "General Physician / Family Doctor",
        "diagnostic_tests": ["Complete Blood Count (CBC)", "Rapid Flu Antigen / COVID-19 RT-PCR if indicated"],
        "red_flags": ["Fever spiking > 103°F unyielding to medication", "Shortness of breath or chest discomfort", "Stiff neck and inability to touch chin to chest"]
    },
    {
        "name": "High Pediatric Fever with Febrile Seizure Risk",
        "category": "Pediatrics",
        "aliases": ["baby fever", "child fever", "pediatric fever", "toddler high fever"],
        "key_symptoms": ["temperature above 101°F in infants or 103°F in children", "extreme fussiness or unusual lethargy", "refusal to feed or drink", "rapid breathing", "hot forehead with shivering"],
        "severity_level": "HIGH",
        "urgency_code": "urgent_care",
        "triage_summary": "Elevated core body temperature in infants or young children posing risks of dehydration and febrile convulsions.",
        "immediate_actions": [
            "Dress child in lightweight, single-layer cotton clothes; do NOT bundle them in heavy blankets.",
            "Lukewarm sponge bath (do NOT use cold water or rubbing alcohol as it triggers shivering and raises internal temp).",
            "Offer frequent sips of water, milk, or pediatric electrolyte solution.",
            "Administer weight-appropriate pediatric Paracetamol or Ibuprofen (strictly follow pediatrician dosage; NEVER give Aspirin to children).",
            "If seizure occurs: place child gently on side on floor, clear surrounding objects, do NOT place anything in mouth, time the seizure, and call 108 immediately."
        ],
        "recommended_steps": [
            "In infants under 3 months: ANY fever > 100.4°F requires immediate emergency pediatric evaluation.",
            "Clinical exam for ear infection (Otitis Media), throat pharyngitis, or urinary tract source.",
            "Urine routine and culture if no obvious respiratory focus."
        ],
        "recommended_specialist": "Pediatrician / Pediatric Emergency",
        "diagnostic_tests": ["Pediatric CBC", "Urine Routine", "Ear Examination (Otoscopy)"],
        "red_flags": ["Inconsolable continuous crying or extreme limpness", "Child cannot be awakened", "Purple or dark red non-blanching skin spots (Petechiae)", "Bulging soft spot (Fontanelle) on baby's head"]
    }
]


class SQLiteClinicalKB:
    """Manager for SQLite Clinical Knowledge Base and Offline Triage."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initializes tables and seeds initial disease protocols if empty."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Diseases & clinical triage protocols table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS diseases_kb (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    category TEXT NOT NULL,
                    aliases TEXT NOT NULL,
                    key_symptoms TEXT NOT NULL,
                    severity_level TEXT NOT NULL,
                    urgency_code TEXT NOT NULL,
                    triage_summary TEXT NOT NULL,
                    immediate_actions TEXT NOT NULL,
                    recommended_steps TEXT NOT NULL,
                    recommended_specialist TEXT NOT NULL,
                    diagnostic_tests TEXT NOT NULL,
                    red_flags TEXT NOT NULL
                )
            """)

            # Chat history for offline session persistence
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    structured_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Check if seed needed
            cursor.execute("SELECT COUNT(*) FROM diseases_kb")
            count = cursor.fetchone()[0]
            if count == 0:
                for item in CLINICAL_SEED_DATA:
                    cursor.execute("""
                        INSERT INTO diseases_kb (
                            name, category, aliases, key_symptoms, severity_level, urgency_code,
                            triage_summary, immediate_actions, recommended_steps, recommended_specialist,
                            diagnostic_tests, red_flags
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item["name"],
                        item["category"],
                        json.dumps(item["aliases"]),
                        json.dumps(item["key_symptoms"]),
                        item["severity_level"],
                        item["urgency_code"],
                        item["triage_summary"],
                        json.dumps(item["immediate_actions"]),
                        json.dumps(item["recommended_steps"]),
                        item["recommended_specialist"],
                        json.dumps(item["diagnostic_tests"]),
                        json.dumps(item["red_flags"])
                    ))
            conn.commit()

    def get_all_conditions(self) -> List[Dict[str, Any]]:
        """Returns all conditions for offline client pack export."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM diseases_kb ORDER BY name ASC")
            rows = cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "name": row["name"],
                    "category": row["category"],
                    "aliases": json.loads(row["aliases"]),
                    "key_symptoms": json.loads(row["key_symptoms"]),
                    "severity_level": row["severity_level"],
                    "urgency_code": row["urgency_code"],
                    "triage_summary": row["triage_summary"],
                    "immediate_actions": json.loads(row["immediate_actions"]),
                    "recommended_steps": json.loads(row["recommended_steps"]),
                    "recommended_specialist": row["recommended_specialist"],
                    "diagnostic_tests": json.loads(row["diagnostic_tests"]),
                    "red_flags": json.loads(row["red_flags"]),
                })
            return results

    def match_symptoms(self, query: str) -> Dict[str, Any]:
        """
        Evaluates user problem or symptoms query against SQLite KB.
        Returns top clinical match with recommendations, next steps, and first-aid.
        """
        normalized = query.lower()
        words = set(re.findall(r'\b[a-z]{3,}\b', normalized))

        # Check emergency words
        emergency_indicators = [
            "unconscious", "fainted", "collapsed", "cannot breathe", "chest pain",
            "heart attack", "stroke", "bleeding profusely", "severe burn", "seizure",
            "convulsion", "suicidal", "severe allergic", "throat closing"
        ]
        is_direct_emergency = any(indicator in normalized for indicator in emergency_indicators)

        all_conditions = self.get_all_conditions()
        best_match = None
        highest_score = 0

        for cond in all_conditions:
            score = 0
            # 1. Exact condition name match
            if cond["name"].lower() in normalized:
                score += 50

            # 2. Aliases match
            for alias in cond["aliases"]:
                if alias.lower() in normalized:
                    score += 35
                else:
                    alias_words = set(re.findall(r'\b[a-z]{3,}\b', alias.lower()))
                    overlap = len(words.intersection(alias_words))
                    score += overlap * 8

            # 3. Key symptoms match
            for symptom in cond["key_symptoms"]:
                if symptom.lower() in normalized:
                    score += 20
                else:
                    sym_words = set(re.findall(r'\b[a-z]{3,}\b', symptom.lower()))
                    overlap = len(words.intersection(sym_words))
                    score += overlap * 6

            if score > highest_score:
                highest_score = score
                best_match = cond

        # If critical emergency indicators are present and no definitive EMERGENCY condition matched strongly
        if is_direct_emergency and (not best_match or best_match.get("severity_level") != "EMERGENCY" or highest_score < 30):
            return {
                "matched": False,
                "condition_name": "Immediate Emergency Triage Warning",
                "severity_level": "EMERGENCY",
                "urgency_code": "immediate_er",
                "confidence": "high",
                "triage_summary": "Your described symptoms contain critical emergency warning signs requiring immediate medical intervention.",
                "immediate_actions": [
                    "Call 108 Emergency Ambulance immediately.",
                    "Stay calm, sit or lie in a comfortable resting position.",
                    "Do NOT attempt to drive yourself to the hospital.",
                    "Unlock your front door if alone so emergency paramedics can access you."
                ],
                "recommended_steps": [
                    "Immediate transport to the nearest tertiary emergency department.",
                    "Vital signs stabilization (Airway, Breathing, Circulation).",
                    "Comprehensive emergency diagnostic workup."
                ],
                "recommended_specialist": "Emergency Medicine / Trauma Critical Care",
                "diagnostic_tests": ["Emergency Vitals Panel", "ECG", "Blood Gases", "Blood Glucose"],
                "red_flags": ["Difficulty breathing", "Loss of consciousness", "Crushing chest pain", "Sudden numbness or paralysis"],
                "reply_text": self._format_response({
                    "name": "Potential Medical Emergency",
                    "severity_level": "EMERGENCY",
                    "triage_summary": "Your reported symptoms match acute emergency criteria. Please seek immediate professional medical attention without delay.",
                    "immediate_actions": [
                        "Call 108 Emergency Ambulance immediately.",
                        "Do not exert yourself physically; rest in a safe position.",
                        "Keep your airway clear and alert family members or neighbors."
                    ],
                    "recommended_steps": [
                        "Emergency room evaluation.",
                        "Vital telemetry and rapid clinical stabilization."
                    ],
                    "recommended_specialist": "Emergency Medicine Department",
                    "red_flags": ["Loss of consciousness", "Severe respiratory distress", "Severe chest pressure"]
                })
            }

        # Fallback if no specific high score match found
        if not best_match or highest_score < 15:
            # General medical advice fallback
            return {
                "matched": False,
                "condition_name": "General Health Assessment",
                "severity_level": "MODERATE",
                "urgency_code": "doctor_consult",
                "confidence": "general",
                "triage_summary": "We analyzed your query. While symptoms don't point to an isolated single illness in our local protocols, clinical evaluation by a medical doctor is advised.",
                "immediate_actions": [
                    "Rest, stay hydrated with clean water or electrolyte fluids.",
                    "Record when your symptoms started, their frequency, and any aggravating triggers.",
                    "Avoid taking unprescribed antibiotics or strong painkillers."
                ],
                "recommended_steps": [
                    "Schedule a consultation with a General Physician for physical examination.",
                    "Maintain a symptom log (temperature, pain scale 1-10, blood pressure).",
                    "Routine baseline tests: Complete Blood Count (CBC) and basic metabolic check."
                ],
                "recommended_specialist": "General Physician / Family Doctor",
                "diagnostic_tests": ["Complete Blood Count (CBC)", "Vitals Checkup"],
                "red_flags": ["High fever > 102°F lasting > 3 days", "Severe sudden pain", "Shortness of breath", "Inability to keep liquids down"],
                "reply_text": self._format_response({
                    "name": "General Health Consultation Advised",
                    "severity_level": "MODERATE",
                    "triage_summary": "Your reported concern is best evaluated by a doctor. Here are immediate care instructions and recommended diagnostic steps:",
                    "immediate_actions": [
                        "Rest and maintain adequate hydration.",
                        "Monitor your temperature and symptom progression.",
                        "Avoid unprescribed medications that can mask symptoms."
                    ],
                    "recommended_steps": [
                        "Consult a General Physician for a physical checkup.",
                        "Bring your previous medical history and current prescriptions."
                    ],
                    "recommended_specialist": "General Physician / Family Practitioner",
                    "red_flags": ["Fever above 102°F", "Severe breathlessness", "Severe unexplained pain", "Dizziness upon standing"]
                })
            }

        # Matched successfully
        return {
            "matched": True,
            "condition_name": best_match["name"],
            "category": best_match["category"],
            "severity_level": best_match["severity_level"],
            "urgency_code": best_match["urgency_code"],
            "confidence": "high" if highest_score >= 30 else "moderate",
            "triage_summary": best_match["triage_summary"],
            "immediate_actions": best_match["immediate_actions"],
            "recommended_steps": best_match["recommended_steps"],
            "recommended_specialist": best_match["recommended_specialist"],
            "diagnostic_tests": best_match["diagnostic_tests"],
            "red_flags": best_match["red_flags"],
            "reply_text": self._format_response(best_match)
        }

    def _format_response(self, match: Dict[str, Any]) -> str:
        """Constructs rich Markdown reply."""
        severity_badges = {
            "EMERGENCY": "🚨 **CRITICAL EMERGENCY — Seek Immediate Medical Care**",
            "HIGH": "⚠️ **HIGH URGENCY — Prompt Clinical Attention Needed**",
            "MODERATE": "🟡 **MODERATE — Doctor Consultation Advised**",
            "MILD": "🟢 **MILD — Home Care & Symptom Monitoring**"
        }
        urgency_badge = severity_badges.get(match.get("severity_level", "MODERATE"), "🟡 **Doctor Consultation Advised**")

        lines = [
            f"### {match['name']}",
            f"{urgency_badge}\n",
            f"**Clinical Summary:** {match.get('triage_summary', '')}\n",
            "#### ⚡ Immediate Actions (What To Do Right Now):"
        ]
        for act in match.get("immediate_actions", []):
            lines.append(f"- {act}")

        lines.append("\n#### 🩺 Recommended Next Steps & Diagnostics:")
        for step in match.get("recommended_steps", []):
            lines.append(f"- {step}")

        if match.get("recommended_specialist"):
            lines.append(f"\n**Recommended Specialist:** `{match['recommended_specialist']}`")

        if match.get("red_flags"):
            lines.append("\n#### ⚠️ Red Flag Warnings (Rush to Emergency if present):")
            for rf in match["red_flags"]:
                lines.append(f"- {rf}")

        lines.append("\n*Disclaimer: MediConnect Clinical Grid provides decision support and does not replace in-person physician evaluation.*")
        return "\n".join(lines)

    def save_message(self, session_id: str, role: str, content: str, structured_data: Optional[Dict[str, Any]] = None):
        """Saves chat interaction to SQLite history table."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_history (session_id, role, content, structured_data)
                VALUES (?, ?, ?, ?)
            """, (session_id, role, content, json.dumps(structured_data) if structured_data else None))
            conn.commit()

    def get_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves session messages from SQLite."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM chat_history
                WHERE session_id = ?
                ORDER BY id ASC
                LIMIT ?
            """, (session_id, limit))
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "session_id": r["session_id"],
                    "role": r["role"],
                    "content": r["content"],
                    "structured_data": json.loads(r["structured_data"]) if r["structured_data"] else None,
                    "created_at": r["created_at"]
                }
                for r in rows
            ]

    def clear_history(self, session_id: str):
        """Clears chat history for a session."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
            conn.commit()


# Singleton instance
sqlite_kb = SQLiteClinicalKB()
