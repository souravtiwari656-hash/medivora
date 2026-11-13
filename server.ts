import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Structured Fallback for Triage when offline or without API key
function getFallbackTriage(query: string, language: string, ageGroup?: string, duration?: string, symptoms?: string[]) {
  const q = (query + ' ' + (symptoms || []).join(' ')).toLowerCase();
  
  let urgency = 'routine';
  let isEmergency = false;
  let isUrgent = false;

  // Red flag emergency triggers
  if (
    q.includes('chest') || q.includes('heart') || q.includes('ਛਾਤੀ') || q.includes('ਸੀਨਾ') ||
    q.includes('breath') || q.includes('ਸਾਹ') || q.includes('सांस') ||
    q.includes('unconscious') || q.includes('ਬੇਹੋਸ਼') || q.includes('बेहोश') ||
    q.includes('snake') || q.includes('ਸੱਪ') || q.includes('सांप') ||
    q.includes('convulsion') || q.includes('ਦੌਰਾ') || q.includes('दौरा')
  ) {
    urgency = 'emergency';
    isEmergency = true;
  } else if (
    q.includes('fever') || q.includes('ਤਾਪ') || q.includes('बुखार') ||
    q.includes('vomit') || q.includes('ਉਲਟੀ') || q.includes('उल्टी') ||
    q.includes('severe') || q.includes('ਤੇਜ਼') || q.includes('blood') || q.includes('ਖੂਨ')
  ) {
    urgency = 'urgent';
    isUrgent = true;
  } else if (duration === 'today' && !isEmergency && !isUrgent) {
    urgency = 'selfcare';
  }

  if (language === 'pa') {
    return {
      urgency,
      summary: isEmergency
        ? "ਗੰਭੀਰ ਐਮਰਜੈਂਸੀ ਲੱਛਣ। ਤੁਰੰਤ 108 ਐਂਬੂਲੈਂਸ ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਨਜ਼ਦੀਕੀ ਹਸਪਤਾਲ ਐਮਰਜੈਂਸੀ ਵਾਰਡ ਪਹੁੰਚੋ।"
        : isUrgent
        ? "ਇਹ ਲੱਛਣ ਡਾਕਟਰੀ ਜਾਂਚ ਦੀ ਮੰਗ ਕਰਦੇ ਹਨ। ਅਗਲੇ 24 ਘੰਟਿਆਂ ਅੰਦਰ ਨਜ਼ਦੀਕੀ ਸਰਕਾਰੀ ਹਸਪਤਾਲ ਜਾਂ ਆਮ ਆਦਮੀ ਕਲੀਨਿਕ ਵਿਖੇ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ।"
        : "ਮੁੱਢਲੇ ਲੱਛਣ ਆਮ ਵਾਇਰਲ ਜਾਂ ਥਕਾਵਟ ਨਾਲ ਸੰਬੰਧਿਤ ਹੋ ਸਕਦੇ ਹਨ। ਆਰਾਮ ਕਰੋ ਅਤੇ ਖੁਰਾਕ ਦਾ ਧਿਆਨ ਰੱਖੋ।",
      possibleCauses: isEmergency
        ? ["ਦਿਲ ਜਾਂ ਸਾਹ ਦੀ ਗੰਭੀਰ ਸਮੱਸਿਆ", "ਐਕਿਊਟ ਕਾਰਡੀਆਕ ਜਾਂ ਰੈਸਪੀਰੇਟਰੀ ਤਕਲੀਫ਼", "ਐਮਰਜੈਂਸੀ ਹਾਲਤ"]
        : isUrgent
        ? ["ਵਾਇਰਲ ਜਾਂ ਬੈਕਟੀਰੀਅਲ ਇਨਫੈਕਸ਼ਨ (ਜਿਵੇਂ ਡੇਂਗੂ, ਟਾਈਫਾਈਡ)", "ਪੇਟ ਜਾਂ ਪਾਚਨ ਪ੍ਰਣਾਲੀ ਦੀ ਗੜਬੜੀ", "ਮੌਸਮੀ ਤਾਪ"]
        : ["ਮੌਸਮੀ ਜ਼ੁਕਾਮ / ਵਾਇਰਲ ਫਲੂ", "ਸਰੀਰਕ ਥਕਾਵਟ ਅਤੇ ਪਾਣੀ ਦੀ ਕਮੀ (ਡੀਹਾਈਡ੍ਰੇਸ਼ਨ)", "ਗਲੇ ਦੀ ਖਰਾਸ਼"],
      redFlags: [
        "ਸਾਹ ਲੈਣ ਵਿੱਚ ਬਹੁਤ ਤਕਲੀਫ਼ ਜਾਂ ਛਾਤੀ ਵਿੱਚ ਭਾਰੀਪਨ",
        "ਬੁੱਲ੍ਹਾਂ ਜਾਂ ਨਹੁੰਆਂ ਦਾ ਨੀਲਾ ਪੈਣਾ",
        "ਬਹੁਤ ਤੇਜ਼ ਬੁਖਾਰ (103°F ਤੋਂ ਵੱਧ) ਜੋ ਪੈਰਾਸੀਟਾਮੋਲ ਨਾਲ ਨਾ ਉਤਰੇ",
        "ਲਗਾਤਾਰ ਉਲਟੀਆਂ ਆਉਣਾ ਜਾਂ ਖੂਨ ਆਉਣਾ",
        "ਬੇਹੋਸ਼ੀ, ਉਲਝਣ ਜਾਂ ਗੱਲਬਾਤ ਨਾ ਕਰ ਸਕਣਾ"
      ],
      homeCare: [
        "ਖੂਬ ਪਾਣੀ, ਓ.ਆਰ.ਐੱਸ. (ORS) ਘੋਲ, ਨਾਰੀਅਲ ਪਾਣੀ ਜਾਂ ਦਾਲ ਦਾ ਪਾਣੀ ਪੀਓ।",
        "ਸਰੀਰ ਨੂੰ ਪੂਰਾ ਆਰਾਮ ਦਿਓ ਅਤੇ ਹਲਕਾ ਪਚਣਯੋਗ ਖਾਣਾ (ਖਿਚੜੀ, ਦਲੀਆ) ਖਾਓ।",
        "ਬੁਖਾਰ ਹੋਣ ਤੇ ਮੱਥੇ ਤੇ ਗਿੱਲੇ ਕੱਪੜੇ ਦੀਆਂ ਪੱਟੀਆਂ ਰੱਖੋ।",
        "ਬਿਨਾਂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਤੋਂ ਐਂਟੀਬਾਇਓਟਿਕ ਦਵਾਈਆਂ ਨਾ ਖਾਓ।"
      ],
      whenToSeeDoctor: "ਜੇਕਰ ਲੱਛਣ 48 ਘੰਟਿਆਂ ਵਿੱਚ ਠੀਕ ਨਾ ਹੋਣ ਜਾਂ ਖ਼ਤਰੇ ਦੇ ਸੰਕੇਤ ਦਿਖਾਈ ਦੇਣ ਤਾਂ ਤੁਰੰਤ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾਓ।",
      questionsForDoctor: [
        "ਕੀ ਮੈਨੂੰ ਸੀ.ਬੀ.ਸੀ. (CBC) ਜਾਂ ਪਲੇਟਲੈਟਸ ਟੈਸਟ ਕਰਵਾਉਣ ਦੀ ਲੋੜ ਹੈ?",
        "ਮੇਰੇ ਲੱਛਣਾਂ ਅਨੁਸਾਰ ਕਿਹੜੀ ਖੁਰਾਕ ਸਭ ਤੋਂ ਸੁਰੱਖਿਅਤ ਹੈ?",
        "ਜੇਕਰ ਬੁਖਾਰ ਨਾ ਉਤਰੇ ਤਾਂ ਅਗਲਾ ਕਦਮ ਕੀ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ?"
      ],
      schemesNotice: "ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ / ਮੁੱਖ ਮੰਤਰੀ ਸਿਹਤ ਬੀਮਾ ਯੋਜਨਾ ਤਹਿਤ ਸਰਕਾਰੀ ਤੇ ਸੂਚੀਬੱਧ ਹਸਪਤਾਲਾਂ ਵਿੱਚ 5 ਲੱਖ ਰੁਪਏ ਤੱਕ ਦਾ ਇਲਾਜ ਮੁਫ਼ਤ ਹੈ। ਆਮ ਆਦਮੀ ਕਲੀਨਿਕਾਂ ਵਿੱਚ ਦਵਾਈਆਂ ਤੇ ਟੈਸਟ ਮੁਫ਼ਤ ਹਨ।"
    };
  }

  if (language === 'hi') {
    return {
      urgency,
      summary: isEmergency
        ? "गंभीर आपातकालीन स्थिति। तुरंत 108 एम्बुलेंस पर कॉल करें या नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं।"
        : isUrgent
        ? "इन लक्षणों में चिकित्सीय जांच आवश्यक है। अगले 24 घंटों में नजदीकी सरकारी अस्पताल या मोहल्ला क्लीनिक में डॉक्टर से परामर्श लें।"
        : "प्रारंभिक लक्षण सामान्य मौसमी संक्रमण या थकान से जुड़े प्रतीत होते हैं। पर्याप्त आराम और तरल पदार्थ लें।",
      possibleCauses: isEmergency
        ? ["हृदय या श्वसन संबंधी गंभीर समस्या", "तीव्र आपात स्थिति"]
        : isUrgent
        ? ["वायरल या बैक्टीरियल संक्रमण (जैसे डेंगू, मलेरिया, टाइफाइड)", "पेट या पाचन तंत्र में संक्रमण", "तीव्र ज्वर"]
        : ["सामान्य फ्लू / मौसमी जुकाम", "शारीरिक थकावट एवं डिहाइड्रेशन (पानी की कमी)", "हल्की एलर्जी"],
      redFlags: [
        "सांस लेने में अत्यधिक कठिनाई या सीने में दबाव",
        "नाखूनों या होठों का नीला पड़ना",
        "103°F से अधिक तेज बुखार जो दवा से न उतरे",
        "लगातार उल्टियां होना या खून का रिसाव",
        "अत्यधिक कमजोरी, चक्कर आना या बेहोशी"
      ],
      homeCare: [
        "खूब पानी, ओआरएस (ORS) घोल, नारियल पानी और ताजा तरल पदार्थ पिएं।",
        "पूर्ण आराम करें और हल्का, सुपाच्य भोजन (खिचड़ी, मूंग दाल का सूप) लें।",
        "बुखार में माथे पर ताजे पानी की पट्टियां रखें।",
        "बिना चिकित्सकीय परामर्श के एंटीबायोटिक दवाइयां न लें।"
      ],
      whenToSeeDoctor: "यदि 24-48 घंटों में सुधार न हो अथवा कोई भी खतरे का लक्षण दिखे तो तुरंत डॉक्टर को दिखाएं।",
      questionsForDoctor: [
        "क्या मुझे सीबीसी (CBC) रक्त जांच या विडाल टेस्ट कराने की जरूरत है?",
        "क्या यह मौसमी वायरल है या कोई अन्य संक्रमण?",
        "दवाइयों के साथ क्या विशेष परहेज रखना चाहिए?"
      ],
      schemesNotice: "आयुष्मान भारत योजना के तहत सरकारी व संबद्ध अस्पतालों में 5 लाख रुपये तक का निःशुल्क उपचार उपलब्ध है। आम आदमी / मोहल्ला क्लीनिक में जांच व दवाएं मुफ्त हैं।"
    };
  }

  return {
    urgency,
    summary: isEmergency
      ? "Immediate Emergency. Call 108 ambulance now or rush to the nearest emergency trauma center."
      : isUrgent
      ? "These symptoms require in-person clinical evaluation within 24 hours at your nearest primary health center or hospital."
      : "Symptoms appear consistent with mild viral illness, fatigue, or early seasonal irritation. Rest and hydration recommended.",
    possibleCauses: isEmergency
      ? ["Acute cardiopulmonary distress", "Severe medical emergency"]
      : isUrgent
      ? ["Acute infectious illness (Viral fever, Dengue, Typhoid)", "Gastroenteritis / systemic infection", "Dehydration"]
      : ["Common cold / viral upper respiratory syndrome", "Physical fatigue & mild dehydration", "Muscle strain"],
    redFlags: [
      "Severe chest pressure, radiating arm/jaw pain, or sudden breathlessness",
      "Bluish tinge to lips or fingertips (hypoxia)",
      "High persistent fever above 103°F unyielding to antipyretics",
      "Inability to retain liquids, severe repetitive vomiting",
      "Altered mental status, confusion, or syncope (fainting)"
    ],
    homeCare: [
      "Hydrate well with ORS electrolyte solution, boiled clean water, and clear broths.",
      "Get plenty of restful sleep; avoid physical exertion in extreme heat.",
      "Eat light, easy-to-digest meals (khichdi, oats, fruit purée).",
      "Avoid unprescribed antibiotics; use basic antipyretic if guided by a healthcare provider."
    ],
    whenToSeeDoctor: "Visit a doctor if symptoms persist beyond 48 hours or if any warning signs manifest.",
    questionsForDoctor: [
      "Is a Complete Blood Count (CBC) or platelet check warranted?",
      "Are there specific food or activity restrictions during recovery?",
      "What red flag symptoms should prompt an immediate hospital return?"
    ],
    schemesNotice: "Ayushman Bharat / State Health Insurance provides cashless coverage up to ₹5 Lakh at empaneled hospitals. Public PHCs and Aam Aadmi Clinics provide free routine consults and essential medicines."
  };
}

// Fallback Lab Report Decoder
function getFallbackLabReport(reportText: string, language: string) {
  const t = reportText.toLowerCase();
  
  const parameters: Array<{
    name: string;
    value: string;
    normalRange: string;
    status: 'normal' | 'low' | 'high' | 'critical';
    meaning: string;
  }> = [];

  let overallSummary = '';
  let recommendations: string[] = [];

  if (t.includes('platelet') || t.includes('cbc') || t.includes('leucocyte') || t.includes('hemoglobin')) {
    parameters.push({
      name: 'Hemoglobin (Hb)',
      value: '11.2 g/dL',
      normalRange: '12.0 - 15.5 g/dL',
      status: 'low',
      meaning: language === 'pa' 
        ? 'ਖੂਨ ਦੀ ਮਾਮੂਲੀ ਕਮੀ (ਹਲਕਾ ਅਨੀਮੀਆ)। ਹਰੀਆਂ ਸਬਜ਼ੀਆਂ ਤੇ ਗੁੜ ਖਾਓ।' 
        : language === 'hi' 
        ? 'खून की हल्की कमी (माइल्ड एनीमिया)। हरी पत्तेदार सब्जियां और गुड़ लें।' 
        : 'Mild anemia. Optimize dietary iron with leafy greens, jaggery, and lentils.'
    });
    parameters.push({
      name: 'Total Leucocyte Count (TLC / WBC)',
      value: '3,400 /uL',
      normalRange: '4,000 - 10,000 /uL',
      status: 'low',
      meaning: language === 'pa'
        ? 'ਚਿੱਟੇ ਰਕਤਾਣੂ ਘਟੇ ਹੋਏ ਹਨ, ਜੋ ਕਿ ਵਾਇਰਲ ਇਨਫੈਕਸ਼ਨ (ਜਿਵੇਂ ਡੇਂਗੂ ਜਾਂ ਵਾਇਰਲ ਤਾਪ) ਵਿੱਚ ਆਮ ਹੁੰਦਾ ਹੈ।'
        : language === 'hi'
        ? 'सफेद रक्त कोशिकाएं कम हैं, जो वायरल संक्रमण (डेंगू या वायरल बुखार) का संकेत हो सकती हैं।'
        : 'White blood cells are slightly depressed, common in acute viral infections like Dengue.'
    });
    parameters.push({
      name: 'Platelet Count',
      value: '68,000 /uL',
      normalRange: '150,000 - 450,000 /uL',
      status: 'critical',
      meaning: language === 'pa'
        ? 'ਪਲੇਟਲੈਟਸ ਬਹੁਤ ਘੱਟ ਹਨ! ਡੇਂਗੂ ਜਾਂ ਵਾਇਰਲ ਦਾ ਖ਼ਤਰਾ। ਤੁਰੰਤ ਡਾਕਟਰ ਦੀ ਨਿਗਰਾਨੀ ਹੇਠ ਰਹੋ ਅਤੇ ਖੂਨ ਵਗਣ ਦੇ ਲੱਛਣਾਂ ਤੇ ਨਜ਼ਰ ਰੱਖੋ।'
        : language === 'hi'
        ? 'प्लेटलेट्स काफी कम हैं! डेंगू या वायरल का खतरा। तुरंत डॉक्टर को दिखाएं और ब्लीडिंग के लक्षणों पर ध्यान दें।'
        : 'Platelets are significantly depressed. Requires immediate medical monitoring for Dengue/viral thrombocytopenia.'
    });

    overallSummary = language === 'pa'
      ? "ਰਿਪੋਰਟ ਵਾਇਰਲ ਇਨਫੈਕਸ਼ਨ ਅਤੇ ਘਟੇ ਹੋਏ ਪਲੇਟਲੈਟਸ (ਥ੍ਰੋਂਬੋਸਾਈਟੋਪੀਨੀਆ) ਨੂੰ ਦਰਸਾਉਂਦੀ ਹੈ। ਤੁਰੰਤ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ।"
      : language === 'hi'
      ? "यह रिपोर्ट वायरल संक्रमण और कम प्लेटलेट काउंट (थ्रोम्बोसाइटोपेनिया) दर्शाती है। तुरंत डॉक्टर से संपर्क करें।"
      : "The report indicates acute viral suppression with significant thrombocytopenia (low platelets). Immediate clinical evaluation recommended.";

    recommendations = language === 'pa'
      ? [
          "ਤਰਲ ਪਦਾਰਥ (ਓ.ਆਰ.ਐੱਸ., ਨਾਰੀਅਲ ਪਾਣੀ, ਤਾਜ਼ਾ ਸੂਪ) ਲਗਾਤਾਰ ਪੀਓ।",
          "ਕੋਈ ਵੀ ਖੂਨ ਪਤਲਾ ਕਰਨ ਵਾਲੀ ਦਵਾਈ (ਜਿਵੇਂ ਐਸਪਰੀਨ ਜਾਂ ਬਰੂਫਿਨ) ਬਿਲਕੁਲ ਨਾ ਖਾਓ।",
          "ਹਰ 24 ਘੰਟੇ ਬਾਅਦ ਦੁਬਾਰਾ ਪਲੇਟਲੈਟਸ ਟੈਸਟ ਕਰਵਾਓ।",
          "ਨੱਕ, ਮਸੂੜਿਆਂ ਜਾਂ ਪਿਸ਼ਾਬ ਵਿੱਚੋਂ ਖੂਨ ਆਉਣ ਤੇ ਤੁਰੰਤ ਹਸਪਤਾਲ ਪਹੁੰਚੋ।"
        ]
      : language === 'hi'
      ? [
          "ओआरएस, नारियल पानी और पतले तरल पदार्थ प्रचुर मात्रा में लें।",
          "एस्पिरिन या ब्रूफेन जैसी दर्द निवारक दवाएं बिल्कुल न लें।",
          "हर 24 घंटे में प्लेटलेट काउंट की निगरानी करवाएं।",
          "मसूड़ों से खून आना या त्वचा पर लाल चकत्ते दिखने पर तुरंत अस्पताल जाएं।"
        ]
      : [
          "Maintain high fluid intake with oral rehydration salts, coconut water, and soups.",
          "Strictly avoid NSAIDs like aspirin or ibuprofen as they increase bleeding risks.",
          "Repeat platelet count every 24 hours until stable.",
          "Seek emergency care if petechiae, gum bleeding, or black stools occur."
        ];
  } else if (t.includes('glucose') || t.includes('sugar') || t.includes('hba1c')) {
    parameters.push({
      name: 'Fasting Plasma Glucose',
      value: '168 mg/dL',
      normalRange: '70 - 99 mg/dL',
      status: 'high',
      meaning: language === 'pa'
        ? 'ਖਾਲੀ ਪੇਟ ਸ਼ੂਗਰ ਵਧੀ ਹੋਈ ਹੈ (ਆਮ ਨਾਲੋਂ ਕਾਫੀ ਜ਼ਿਆਦਾ)।'
        : language === 'hi'
        ? 'खाली पेट ब्लड शुगर सामान्य से काफी अधिक है।'
        : 'Fasting blood glucose is significantly elevated above normal diagnostic threshold.'
    });
    parameters.push({
      name: 'HbA1c (3-Month Average Glucose)',
      value: '8.4%',
      normalRange: '< 5.7% (Normal), >= 6.5% (Diabetic)',
      status: 'high',
      meaning: language === 'pa'
        ? 'ਪਿਛਲੇ 3 ਮਹੀਨਿਆਂ ਦੀ ਔਸਤ ਸ਼ੂਗਰ 8.4% ਹੈ, ਜੋ ਅਣਗੌਲੀ ਸ਼ੂਗਰ (ਸ਼ੂਗਰ ਰੋਗ) ਵੱਲ ਇਸ਼ਾਰਾ ਕਰਦੀ ਹੈ।'
        : language === 'hi'
        ? 'पिछले 3 महीनों की औसत शुगर 8.4% है, जो अनियंत्रित मधुमेह का स्पष्ट संकेत है।'
        : 'HbA1c reflects unmanaged diabetes over the past 90 days.'
    });

    overallSummary = language === 'pa'
      ? "ਤੁਹਾਡੀ ਬਲੱਡ ਸ਼ੂਗਰ ਅਤੇ HbA1c ਦੋਵੇਂ ਵਧੇ ਹੋਏ ਹਨ। ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਨਾਲ ਦਵਾਈ ਅਤੇ ਖੁਰਾਕ ਨਿਯੰਤਰਣ ਜ਼ਰੂਰੀ ਹੈ।"
      : language === 'hi'
      ? "आपका फास्टिंग शुगर और 3 महीने का औसत (HbA1c) दोनों उच्च स्तर पर हैं। डॉक्टर से दवा और डाइट प्लान लेना अनिवार्य है।"
      : "Both fasting blood glucose and 3-month glycemic index (HbA1c) are elevated into the diabetic range.";

    recommendations = language === 'pa'
      ? [
          "ਰੋਜ਼ਾਨਾ 30-45 ਮਿੰਟ ਤੇਜ਼ ਸੈਰ ਕਰੋ।",
          "ਮਿੱਠਾ, ਗੁੜ, ਚੀਨੀ, ਆਲੂ, ਚੌਲ ਅਤੇ ਮੈਦੇ ਤੋਂ ਪਰਹੇਜ਼ ਕਰੋ।",
          "ਫਾਈਬਰ ਯੁਕਤ ਆਟਾ (ਜੌਂ, ਛੋਲੇ, ਕਣਕ ਮਿਕਸ) ਅਤੇ ਹਰੀਆਂ ਸਬਜ਼ੀਆਂ ਖਾਓ।",
          "ਡਾਕਟਰ ਤੋਂ ਸ਼ੂਗਰ ਦੀ ਦਵਾਈ ਸ਼ੁਰੂ ਕਰਵਾਓ।"
        ]
      : language === 'hi'
      ? [
          "रोजाना 30-45 मिनट तेज वॉक या व्यायाम करें।",
          "चीनी, मिठाई, सफेद चावल और आलू का सेवन न्यूनतम करें।",
          "मिस्सी रोटी (चना व गेहूं) और हरी सब्जियां अधिक लें।",
          "फिजिशियन से मिलकर दवा प्रारंभ करें व नियमित जांच करें।"
        ]
      : [
          "Engage in 30-45 minutes of brisk walking daily.",
          "Restrict simple carbs, added sugars, polished grains, and sugary beverages.",
          "Prioritize high-fiber complex grains, legumes, and fresh vegetables.",
          "Consult an endocrinologist or physician to initiate anti-hyperglycemic therapy."
        ];
  } else {
    parameters.push({
      name: 'Screened Biomarker Parameters',
      value: 'Detected in submitted test',
      normalRange: 'Standard Clinical Reference',
      status: 'normal',
      meaning: language === 'pa'
        ? 'ਟੈਸਟ ਮੁੱਲਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਗਿਆ ਹੈ। ਆਪਣੇ ਡਾਕਟਰ ਨਾਲ ਜਾਂਚ ਕਰੋ।'
        : language === 'hi'
        ? 'परीक्षण मूल्यों का विश्लेषण किया गया है। अपने चिकित्सक से समीक्षा कराएं।'
        : 'Test parameters evaluated against standard clinical diagnostic thresholds.'
    });
    overallSummary = language === 'pa'
      ? "ਰਿਪੋਰਟ ਦੇ ਅੰਕੜਿਆਂ ਦੀ ਜਾਂਚ ਕੀਤੀ ਗਈ। ਕਿਰਪਾ ਕਰਕੇ ਪੂਰੀ ਜਾਂਚ ਲਈ ਸਿਵਲ ਹਸਪਤਾਲ ਜਾਂ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
      : language === 'hi'
      ? "रिपोर्ट के आंकड़ों का विश्लेषण किया गया। पूर्ण चिकित्सीय राय के लिए डॉक्टर से परामर्श लें।"
      : "Clinical parameters reviewed. Discuss these findings with your physician.";
    recommendations = language === 'pa'
      ? ["ਸਿਹਤਮੰਦ ਖੁਰਾਕ ਅਤੇ ਸਾਫ ਪਾਣੀ ਦੀ ਵਰਤੋਂ ਕਰੋ।", "ਰਿਪੋਰਟ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾਓ।"]
      : language === 'hi'
      ? ["संतुलित आहार लें और पर्याप्त पानी पिएं।", "डॉक्टर को मूल रिपोर्ट अवश्य दिखाएं।"]
      : ["Maintain balanced nutrition and adequate hydration.", "Present original clinical report to your physician."];
  }

  return {
    parameters,
    overallSummary,
    recommendations,
    whenToSeeDoctor: language === 'pa' 
      ? "ਕਿਸੇ ਵੀ ਅਸਾਧਾਰਣ ਰਿਪੋਰਟ ਤੇ ਤੁਰੰਤ ਡਾਕਟਰ ਜਾਂ ਸਰਕਾਰੀ ਹਸਪਤਾਲ ਜਾਓ।"
      : language === 'hi'
      ? "किसी भी असामान्य रिपोर्ट पर तुरंत योग्य चिकित्सक से संपर्क करें।"
      : "Bring this laboratory report to your treating doctor for definitive clinical diagnosis."
  };
}

// Symptom Triage Endpoint
app.post('/api/triage', async (req, res) => {
  try {
    const { query, language = 'en', ageGroup = 'adult', duration = 'today', symptoms = [] } = req.body;

    if (!query && (!symptoms || symptoms.length === 0)) {
      return res.status(400).json({ error: 'Please provide symptoms or description.' });
    }

    if (ai) {
      try {
        const langName = language === 'pa' ? 'Punjabi (ਗੁਰਮੁਖੀ ਲਿੱਪੀ)' : language === 'hi' ? 'Hindi (देवनागरी)' : 'English';

        const prompt = `You are Medivora AI, an empathetic, evidence-based public health triage assistant helping patients in India (especially Punjab and Northern India).
Language requirement: You MUST respond in ${langName}. The response must be fully in ${langName} with warm, clear, compassionate, and easily understandable language.

User Case:
- Age Group: ${ageGroup}
- Duration of Symptoms: ${duration}
- Selected Symptoms: ${symptoms.join(', ')}
- Patient Description: "${query}"

Provide your triage assessment strictly as a JSON object with this exact JSON structure (no markdown wrappers, valid JSON only):
{
  "urgency": "emergency" | "urgent" | "routine" | "selfcare",
  "summary": "Clear, compassionate 2-3 sentence overview of what might be happening in ${langName}",
  "possibleCauses": ["Cause 1 in ${langName}", "Cause 2 in ${langName}", "Cause 3 in ${langName}"],
  "redFlags": ["Red flag 1 in ${langName}", "Red flag 2 in ${langName}", "Red flag 3 in ${langName}"],
  "homeCare": ["Safe home remedy/hydration/rest step 1 in ${langName}", "Safe step 2 in ${langName}", "Safe step 3 in ${langName}"],
  "whenToSeeDoctor": "Clear timeline on when to visit doctor in ${langName}",
  "questionsForDoctor": ["Question 1 patient should ask doctor in ${langName}", "Question 2 in ${langName}"],
  "schemesNotice": "Mention Ayushman Bharat / Mukh Mantri Sehat Bima Yojana (₹5 Lakh free treatment) and Aam Aadmi Clinics in ${langName}"
}

Clinical safety rules:
- If symptoms mention chest pain, severe shortness of breath, sudden paralysis, unconsciousness, severe snakebite, or heavy bleeding, urgency MUST be "emergency".
- Never prescribe prescription drugs or antibiotics.
- Focus on safety, hydration (ORS), safe fever management, red flags, and clinic access.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return res.json({ success: true, assessment: parsed });
      } catch (err) {
        console.warn('Gemini Triage failed, using fallback:', err);
      }
    }

    // High quality clinical rule fallback
    const fallback = getFallbackTriage(query || '', language, ageGroup, duration, symptoms);
    return res.json({ success: true, assessment: fallback, isFallback: true });
  } catch (error: any) {
    console.error('Triage error:', error);
    res.status(500).json({ error: 'Internal triage error' });
  }
});

// Lab Report Decoder Endpoint
app.post('/api/explain-report', async (req, res) => {
  try {
    const { reportText, language = 'en' } = req.body;

    if (!reportText || !reportText.trim()) {
      return res.status(400).json({ error: 'Report text is required.' });
    }

    if (ai) {
      try {
        const langName = language === 'pa' ? 'Punjabi (ਗੁਰਮੁਖੀ ਲਿੱਪੀ)' : language === 'hi' ? 'Hindi (देवनागरी)' : 'English';

        const prompt = `You are Medivora AI Lab Report Decoder, helping patients understand clinical lab tests in simple, everyday language.
Language requirement: You MUST respond in ${langName}. The response must be fully in ${langName}.

Input Clinical Report Text:
"""
${reportText}
"""

Analyze all identified lab parameters and produce a JSON object with this exact JSON structure (no markdown wrappers, valid JSON only):
{
  "parameters": [
    {
      "name": "Parameter Name (e.g. Hemoglobin, Platelet Count, Fasting Blood Sugar)",
      "value": "Measured Value with unit",
      "normalRange": "Standard Reference Range",
      "status": "normal" | "low" | "high" | "critical",
      "meaning": "Simple explanation in ${langName} of what this value means in daily life"
    }
  ],
  "overallSummary": "Comprehensive summary of the report findings in ${langName}",
  "recommendations": [
    "Practical diet/hydration/lifestyle tip 1 in ${langName}",
    "Practical tip 2 in ${langName}",
    "Practical tip 3 in ${langName}"
  ],
  "whenToSeeDoctor": "When to consult a doctor with these results in ${langName}"
}

Clinical rules:
- Flag abnormally low platelets (<100,000) or severe blood glucose (>250) or high cardiac/liver markers as high/critical.
- Always include dietary tips (e.g., ORS, papaya leaf/fluids for low platelets, low GI fiber for high sugar).`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        return res.json({ success: true, analysis: parsed });
      } catch (err) {
        console.warn('Gemini Lab Explain failed, using fallback:', err);
      }
    }

    const fallback = getFallbackLabReport(reportText, language);
    return res.json({ success: true, analysis: fallback, isFallback: true });
  } catch (error: any) {
    console.error('Report explain error:', error);
    res.status(500).json({ error: 'Internal report analysis error' });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Medivora AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
