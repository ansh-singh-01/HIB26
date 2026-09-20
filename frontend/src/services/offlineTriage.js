/**
 * Offline Triage Engine for MediConnect.
 * Evaluates symptoms and diseases client-side when network is disconnected or low-bandwidth.
 */

// Bundled Core Offline Knowledge Base for zero-network environments
export const BUNDLED_OFFLINE_CONDITIONS = [
  {
    name: "Myocardial Infarction (Heart Attack)",
    category: "Cardiology",
    aliases: ["heart attack", "cardiac arrest", "chest pain", "chest tightness", "chest pressure", "crushing chest pain", "angina"],
    key_symptoms: ["chest pain", "left arm pain", "jaw pain", "shortness of breath", "cold sweat", "nausea", "lightheadedness", "palpitations"],
    severity_level: "EMERGENCY",
    urgency_code: "immediate_er",
    triage_summary: "Symptoms indicate potential acute myocardial ischemia or heart attack requiring immediate emergency medical resuscitation.",
    immediate_actions: [
      "Call 108 Emergency Ambulance immediately.",
      "Have the person sit down, rest calmly, and avoid physical exertion or walking.",
      "Loosen any tight clothing around the neck and chest.",
      "If not allergic to Aspirin, chew a non-enteric coated 300mg/325mg Aspirin while awaiting ambulance.",
      "Do NOT drive yourself to the hospital."
    ],
    recommended_steps: [
      "Immediate 12-lead Electrocardiogram (ECG / EKG) within 10 minutes of arrival.",
      "Serial cardiac enzymes (High-sensitivity Troponin I or T).",
      "Emergency coronary angiography (Cath lab evaluation).",
      "Continuous telemetry monitoring and supplemental oxygen if SpO2 < 90%."
    ],
    recommended_specialist: "Emergency Cardiologist / Interventional Cardiologist",
    diagnostic_tests: ["12-Lead ECG", "Cardiac Troponin I", "Echocardiogram", "Chest X-Ray"],
    red_flags: ["Loss of consciousness", "Unresponsiveness", "Severe breathlessness with blue lips (cyanosis)", "Cold clammy skin"]
  },
  {
    name: "Acute Asthma Attack / Bronchospasm",
    category: "Pulmonology",
    aliases: ["asthma", "asthma attack", "wheezing", "cannot breathe", "bronchospasm"],
    key_symptoms: ["wheezing", "shortness of breath", "chest tightness", "persistent coughing", "inability to speak full sentences", "rapid breathing"],
    severity_level: "EMERGENCY",
    urgency_code: "immediate_er",
    triage_summary: "Acute constriction of bronchial airways limiting ventilation and oxygen exchange.",
    immediate_actions: [
      "Sit completely upright; do NOT lie down.",
      "Use quick-relief rescue inhaler (Salbutamol / Albuterol) immediately: 2-4 puffs via spacer, repeat every 20 minutes if needed.",
      "Keep breathing slow and steady, using pursed-lip breathing.",
      "If inhaler fails to relieve distress or lips turn pale/blue, call 108 immediately."
    ],
    recommended_steps: [
      "Peak Expiratory Flow (PEF) rate measurement.",
      "Pulse oximetry continuous SpO2 monitoring.",
      "Nebulization therapy with bronchodilators and systemic corticosteroids in clinic.",
      "Review asthma action plan and trigger identification."
    ],
    recommended_specialist: "Pulmonologist / Respiratory Specialist",
    diagnostic_tests: ["Spirometry / Peak Flow", "Chest X-Ray", "Arterial Blood Gas (ABG)", "Pulse Oximetry"],
    red_flags: ["Straining neck muscles to breathe", "Peak flow < 50% personal best", "Blue fingernails/lips", "Extreme fatigue or confusion"]
  },
  {
    name: "Dengue Fever",
    category: "Infectious Disease",
    aliases: ["dengue", "breakbone fever", "dengue hemorrhagic", "mosquito fever"],
    key_symptoms: ["sudden high fever", "severe headache", "pain behind the eyes", "severe joint and muscle pain", "skin rash", "mild bleeding gums", "nausea"],
    severity_level: "HIGH",
    urgency_code: "urgent_care",
    triage_summary: "Mosquito-borne viral infection characterized by sudden severe fever and potential thrombocytopenia (drop in platelets).",
    immediate_actions: [
      "Aggressive oral rehydration: drink ORS, coconut water, and clean fluids continuously.",
      "CRITICAL: Avoid Aspirin, Ibuprofen, Naproxen, or any NSAIDs as they increase bleeding hemorrhage risks. Use ONLY Paracetamol for fever.",
      "Rest completely under mosquito netting to prevent secondary transmission.",
      "Schedule daily complete blood count (CBC) to monitor platelet count and hematocrit."
    ],
    recommended_steps: [
      "Confirm via Dengue NS1 Antigen test (days 1-5) or IgM/IgG antibody test (day 5+).",
      "Monitor platelet count daily; if platelets < 50,000/mcL, hospital admission is mandatory.",
      "Check hematocrit for plasma leakage signs.",
      "Hydration maintenance protocol."
    ],
    recommended_specialist: "Infectious Disease Specialist / General Physician",
    diagnostic_tests: ["Dengue NS1 Antigen", "Dengue IgM/IgG ELISA", "Complete Blood Count (Platelet Count)", "Liver Function Test"],
    red_flags: ["Severe abdominal pain", "Persistent vomiting", "Bleeding from gums/nose or under skin petechiae", "Black tarry stools"]
  },
  {
    name: "Acute Appendicitis",
    category: "Gastroenterology",
    aliases: ["appendicitis", "right lower abdominal pain", "appendix pain"],
    key_symptoms: ["pain starting near navel moving to lower right abdomen", "sharp localized pain on McBurney's point", "pain worsens with coughing or walking", "nausea and vomiting", "loss of appetite", "low-grade fever"],
    severity_level: "EMERGENCY",
    urgency_code: "immediate_er",
    triage_summary: "Acute inflammation of the vermiform appendix carrying imminent risk of rupture, peritonitis, and sepsis.",
    immediate_actions: [
      "Do NOT eat or drink anything (keep strict NPO) in case emergency surgery is needed.",
      "Do NOT take laxatives or apply heating pads to the abdomen (heat can cause inflamed appendix to rupture).",
      "Do NOT take pain painkillers that mask symptoms before surgical exam.",
      "Proceed to the nearest hospital Emergency Department with surgical facility immediately."
    ],
    recommended_steps: [
      "Immediate physical exam: check for rebound tenderness and guarding in right lower quadrant.",
      "Emergency Ultrasound Abdomen or Contrast-Enhanced CT Abdomen.",
      "Complete Blood Count (leukocytosis / elevated white blood cells).",
      "Emergency Laparoscopic or open appendectomy."
    ],
    recommended_specialist: "General Surgeon / Emergency Medicine",
    diagnostic_tests: ["Ultrasound Abdomen & Pelvis", "Abdominal CT Scan", "CBC with WBC differential"],
    red_flags: ["Sudden temporary relief followed by severe generalized abdominal pain", "Rigid board-like abdomen", "High spiking fever"]
  },
  {
    name: "Migraine Headache",
    category: "Neurology",
    aliases: ["migraine", "severe headache", "throbbing head pain", "one-sided headache", "aura"],
    key_symptoms: ["pulsing or throbbing pain usually on one side of head", "extreme sensitivity to light sound or smells", "nausea and vomiting", "visual aura (zigzag lines blind spots flashing lights)", "worsens with physical movement"],
    severity_level: "MODERATE",
    urgency_code: "doctor_consult",
    triage_summary: "Neurological condition characterized by recurring, moderate-to-severe throbbing unilateral headaches with sensory hyper-reactivity.",
    immediate_actions: [
      "Rest in a completely dark, quiet room with eyes closed.",
      "Apply a cold ice pack or cool damp cloth across forehead and temples.",
      "Sip a small amount of caffeine (coffee or tea) early in the attack if it helps abort your headache.",
      "Take prescribed migraine abortive medication (e.g. Triptan) or NSAID at the very onset of symptoms."
    ],
    recommended_steps: [
      "Keep a headache diary tracking foods, sleep patterns, screen time, and stress triggers.",
      "Neurological evaluation if attacks happen more than 4 times a month for prophylactic preventive therapy.",
      "Rule out secondary headaches via MRI Brain if headache pattern changes abruptly."
    ],
    recommended_specialist: "Neurologist / Headache Specialist",
    diagnostic_tests: ["MRI Brain (if red flags present)", "Neurological Cranial Nerve Exam", "Fundoscopic exam"],
    red_flags: ["Sudden 'thunderclap' headache reaching maximum intensity in seconds", "Headache with fever, stiff neck, and confusion", "Weakness or speech difficulty"]
  },
  {
    name: "Acute Stroke / TIA",
    category: "Neurology",
    aliases: ["stroke", "brain attack", "paralysis", "facial droop", "slurred speech", "tia"],
    key_symptoms: ["sudden facial drooping on one side", "sudden weakness or numbness in arm or leg", "slurred speech or inability to understand words", "sudden vision loss in one or both eyes", "sudden loss of balance or coordination"],
    severity_level: "EMERGENCY",
    urgency_code: "immediate_er",
    triage_summary: "Interrupted or reduced blood supply to part of the brain preventing tissue from getting oxygen and nutrients.",
    immediate_actions: [
      "ACT FAST: Face drooping? Arm weakness? Speech difficulty? Time to call 108 immediately!",
      "Note the exact time symptoms began (critical for clot-dissolving tPA window within 4.5 hours).",
      "Do NOT give anything to eat, drink, or swallow (high choking risk due to impaired gag reflex).",
      "Do NOT give Aspirin until hospital CT scan rules out brain hemorrhage.",
      "Keep patient lying flat on their side (recovery position) if vomiting."
    ],
    recommended_steps: [
      "Immediate Non-Contrast CT Brain / MRI Brain Stroke Protocol within 20 minutes of hospital triage.",
      "Evaluate candidacy for IV Thrombolytic therapy (tPA/TNK) or mechanical endovascular thrombectomy.",
      "Continuous vital monitoring in dedicated Stroke ICU."
    ],
    recommended_specialist: "Stroke Neurologist / Interventional Neuro-radiologist",
    diagnostic_tests: ["NCCT Brain", "CT Angiography Brain & Neck", "MRI Brain DWI"],
    red_flags: ["Rapidly progressing loss of consciousness", "Seizures", "Total hemiplegia"]
  },
  {
    name: "Viral Fever / Common Cold",
    category: "General Medicine",
    aliases: ["viral fever", "common cold", "flu", "running nose", "sore throat", "cough and cold"],
    key_symptoms: ["mild to moderate fever", "runny or stuffy nose", "sore throat", "dry or loose cough", "body aches and fatigue", "sneezing and mild headache"],
    severity_level: "MILD",
    urgency_code: "home_care",
    triage_summary: "Self-limiting viral illness affecting upper respiratory tract and immune response.",
    immediate_actions: [
      "Adequate rest: get 8-10 hours of sleep to support immune recovery.",
      "Hydration: drink warm water, herbal teas, soups, and electrolyte fluids.",
      "Warm salt water gargles (half tsp salt in warm water) 3-4 times daily for sore throat relief.",
      "Steam inhalation to loosen nasal and sinus congestion.",
      "Paracetamol (500-650mg) as needed for fever and body aches."
    ],
    recommended_steps: [
      "If fever persists beyond 3 days without improvement, consult a doctor to rule out secondary bacterial infection.",
      "Complete Blood Count (CBC) if symptoms worsen.",
      "Influenza / COVID-19 rapid swab if widespread outbreak exposure is suspected."
    ],
    recommended_specialist: "General Physician / Family Doctor",
    diagnostic_tests: ["Complete Blood Count (CBC)", "Rapid Flu Antigen / COVID-19 RT-PCR if indicated"],
    red_flags: ["Fever spiking > 103°F unyielding to medication", "Shortness of breath or chest discomfort", "Stiff neck"]
  },
  {
    name: "Acute Gastroenteritis / Food Poisoning",
    category: "Gastroenterology",
    aliases: ["food poisoning", "loose motions", "diarrhea", "stomach flu", "vomiting", "stomach bug"],
    key_symptoms: ["watery diarrhea", "frequent vomiting", "cramping stomach pain", "low grade fever", "dry mouth", "weakness", "dizziness"],
    severity_level: "MODERATE",
    urgency_code: "doctor_consult",
    triage_summary: "Inflammation of gastrointestinal tract lining caused by bacterial, viral, or toxic food contamination.",
    immediate_actions: [
      "Primary goal: replace fluid and electrolyte loss. Drink WHO-formula Oral Rehydration Salts (ORS) in sips after every loose stool.",
      "Do NOT take antimotility agents (like Loperamide) if you have high fever or bloody stools.",
      "Follow BRAT diet: Bananas, Rice, Applesauce, Toast once vomiting slows.",
      "Avoid dairy, caffeine, spicy, oily foods, and artificial sweeteners."
    ],
    recommended_steps: [
      "If diarrhea exceeds 48 hours or signs of dehydration appear, consult a clinic.",
      "Stool routine and microscopy to check for protozoa, ova, or occult blood.",
      "Electrolyte panel if severe vomiting prevents liquid retention."
    ],
    recommended_specialist: "General Physician / Gastroenterologist",
    diagnostic_tests: ["Stool Examination", "Serum Electrolytes", "Complete Blood Count"],
    red_flags: ["No urine output for over 8 hours", "Inability to keep liquids down for 12 hours", "Bloody or tarry stools"]
  }
];

const LOCAL_STORAGE_KB_KEY = 'mediconnect_offline_kb';
const LOCAL_STORAGE_CHAT_KEY = 'mediconnect_chat_history_';

/**
 * Initializes and refreshes offline knowledge pack from server when online.
 */
export async function syncOfflineKnowledgePack() {
  try {
    const res = await fetch('/api/v1/chatbot/knowledge-pack');
    if (res.ok) {
      const data = await res.json();
      if (data.conditions && data.conditions.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KB_KEY, JSON.stringify(data.conditions));
        return data.conditions;
      }
    }
  } catch (err) {
    console.warn('Network offline or knowledge pack sync skipped; using cached/bundled KB:', err);
  }

  // Check existing local storage
  const cached = localStorage.getItem(LOCAL_STORAGE_KB_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fallback
    }
  }
  return BUNDLED_OFFLINE_CONDITIONS;
}

/**
 * Get active knowledge base (cached in localStorage or bundled).
 */
export function getKnowledgeBase() {
  const cached = localStorage.getItem(LOCAL_STORAGE_KB_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
  }
  return BUNDLED_OFFLINE_CONDITIONS;
}

/**
 * Evaluates symptoms purely client-side without any internet or backend requirement.
 */
export function matchOfflineSymptoms(query) {
  const normalized = (query || '').toLowerCase();
  const words = normalized.match(/[a-z]{3,}/g) || [];
  const wordSet = new Set(words);

  const emergencyIndicators = [
    "unconscious", "fainted", "collapsed", "cannot breathe", "chest pain",
    "heart attack", "stroke", "bleeding profusely", "severe burn", "seizure",
    "convulsion", "suicidal", "severe allergic", "throat closing"
  ];
  const isDirectEmergency = emergencyIndicators.some(ind => normalized.includes(ind));

  const conditions = getKnowledgeBase();
  let bestMatch = null;
  let highestScore = 0;

  for (const cond of conditions) {
    let score = 0;
    if (normalized.includes(cond.name.toLowerCase())) {
      score += 50;
    }

    for (const alias of (cond.aliases || [])) {
      if (normalized.includes(alias.toLowerCase())) {
        score += 35;
      } else {
        const aliasWords = alias.toLowerCase().match(/[a-z]{3,}/g) || [];
        for (const w of aliasWords) {
          if (wordSet.has(w)) score += 8;
        }
      }
    }

    for (const sym of (cond.key_symptoms || [])) {
      if (normalized.includes(sym.toLowerCase())) {
        score += 20;
      } else {
        const symWords = sym.toLowerCase().match(/[a-z]{3,}/g) || [];
        for (const w of symWords) {
          if (wordSet.has(w)) score += 6;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = cond;
    }
  }

  if (isDirectEmergency && (!bestMatch || bestMatch.severity_level !== 'EMERGENCY' || highestScore < 30)) {
    return {
      matched: false,
      condition_name: "Potential Acute Medical Emergency",
      severity_level: "EMERGENCY",
      urgency_code: "immediate_er",
      confidence: "high",
      triage_summary: "Your symptoms contain critical emergency warning indicators. Immediate professional medical care is required.",
      immediate_actions: [
        "Call 108 Emergency Ambulance immediately.",
        "Rest calmly in a safe position; do not exert yourself.",
        "Do not drive yourself to hospital.",
        "Alert family or neighbors immediately."
      ],
      recommended_steps: [
        "Urgent emergency department resuscitation.",
        "Airway, Breathing, Circulation stabilization.",
        "Emergency diagnostic workup."
      ],
      recommended_specialist: "Emergency Medicine Department",
      diagnostic_tests: ["12-Lead ECG", "Emergency Blood Panel", "Chest X-Ray"],
      red_flags: ["Loss of consciousness", "Severe chest pain", "Severe shortness of breath", "Sudden numbness or paralysis"],
      source: "client_offline_engine"
    };
  }

  if (!bestMatch || highestScore < 15) {

    return {
      matched: false,
      condition_name: "General Health Assessment",
      severity_level: "MODERATE",
      urgency_code: "doctor_consult",
      confidence: "general",
      triage_summary: "Your symptoms warrant clinical evaluation by a medical professional. Here are immediate care instructions and next steps:",
      immediate_actions: [
        "Rest and maintain good hydration with clean fluids.",
        "Note the timeline and severity of your symptoms.",
        "Avoid unprescribed antibiotics or strong pain relievers."
      ],
      recommended_steps: [
        "Consult a General Physician for physical examination.",
        "Maintain a symptom log (temperature, pain level, duration)."
      ],
      recommended_specialist: "General Physician / Family Doctor",
      diagnostic_tests: ["Complete Blood Count (CBC)", "Vitals Checkup"],
      red_flags: ["High fever above 102°F for over 3 days", "Severe sudden pain", "Difficulty breathing"],
      source: "client_offline_engine"
    };
  }

  return {
    matched: true,
    condition_name: bestMatch.name,
    category: bestMatch.category,
    severity_level: bestMatch.severity_level,
    urgency_code: bestMatch.urgency_code,
    confidence: highestScore >= 30 ? "high" : "moderate",
    triage_summary: bestMatch.triage_summary,
    immediate_actions: bestMatch.immediate_actions || [],
    recommended_steps: bestMatch.recommended_steps || [],
    recommended_specialist: bestMatch.recommended_specialist,
    diagnostic_tests: bestMatch.diagnostic_tests || [],
    red_flags: bestMatch.red_flags || [],
    source: "client_offline_engine"
  };
}

/**
 * Saves chat message to local storage for offline session persistence.
 */
export function saveLocalChatMessage(sessionId, message) {
  try {
    const key = LOCAL_STORAGE_CHAT_KEY + (sessionId || 'default-session');
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      ...message,
      id: Date.now() + Math.random(),
      created_at: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
  } catch (err) {
    console.error('Failed to cache message locally:', err);
  }
}

/**
 * Loads locally stored chat messages.
 */
export function getLocalChatHistory(sessionId) {
  try {
    const key = LOCAL_STORAGE_CHAT_KEY + (sessionId || 'default-session');
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
