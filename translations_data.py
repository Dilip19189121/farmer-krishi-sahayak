# Translations for schemes
# Format: { scheme_id: { name_hi, name_te, desc_hi, desc_te, elig_hi, elig_te } }
# Missing keys will fall back to English

# Common English terms mapped to Hindi/Telugu
TERM_MAP = {
    "agricultural": {"hi": "कृषि", "te": "కృషి"},
    "scheme": {"hi": "योजना", "te": "పథకం"},
    "scheme": {"hi": "పథకం", "te": "పథకం"},
    "scheme": {"hi": "పథకం", "te": "పథకం"},
    "government": {"hi": "सरकार", "te": "सरకారు"},
    "central": {"hi": "केंद्र", "te": "కేంద్ర"},
    "state": {"hi": "राज्य", "te": "రాష్ట్రం"},
    "farmer": {"hi": "किसान", "te": "రైతు"},
    "farmers": {"hi": "किसानों", "te": "రైతులు"},
    "farmer": {"hi": "రైతువు", "te": "రైతు"},
    "credit": {"hi": "ऋण", "te": "రుణం"},
    "insurance": {"hi": "बीमा", "te": "బీమా"},
    "irrigation": {"hi": "सिंचाई", "te": "నీరింపు"},
    "organic": {"hi": "आदर्श", "te": "ఆదర్శ"},
    "equipment": {"hi": "उपकरण", "te": "పరికరాలు"},
    "equipment": {"hi": "పరికరాలు", "te": "పరికరాలు"},
    "dbt": {"hi": "आదాయ సహాయ", "te": "ఆదాయ సహాయం"},
    "dbt": {"hi": "ఆదాయ సహాయం", "te": "ఆదాయ సహాయం"},
    "dbt": {"hi": "ఆదాయ సహాయం", "te": "ఆదాయ సహాయం"},
    "all": {"hi": "सब", "te": "అన్నీ"},
    "all": {"hi": "అన్నీ", "te": "అన్నీ"},
    "all": {"hi": "అన్నీ", "te": "అన్నీ"},
    "small": {"hi": "छोटे", "te": "చిన్న"},
    "small": {"hi": "చిన్న-చిన్న", "te": "చిన్న"},
    "tenant": {"hi": "किरायेदार", "te": "ఎగ విక్రె వ్యక్తులు"},
    "women": {"hi": "महिलाएं", "te": "మహిళలు"},
    "women": {"hi": "మహిళలు", "te": "మహిళలు"},
    "women": {"hi": "మహిళలు", "te": "మహిళలు"},
    "protection": {"hi": "संरक्षण", "te": "రక్షణ"},
    "crop": {"hi": "फसल", "te": "పంట"},
    "crops": {"hi": "फसलों", "te": "పంటలు"},
    "insurance": {"hi": "BIMA", "te": "బీమా"},
    "insurance": {"hi": "బీమా", "te": "బీమా"},
    "temporary": {"hi": "अस्थायी", "te": "తాత్కాలిక"},
    "financial": {"hi": "वित्तीय", "te": "సార్థక"},
    "support": {"hi": "सहायता", "te": "సహాయం"},
    "income": {"hi": "आదాయ", "te": "ఆదాయం"},
    "family": {"hi": "परिवार", "te": "కుటుంబం"},
    "families": {"hi": "परिवारों", "te": "కుటుంబాలు"},
    "agriculture": {"hi": "कृषि", "te": "వ్యవసాయం"},
    "agriculture": {"hi": "వ్యవసాయం", "te": "వ్యవసాయం"},
    "farming": {"hi": "खेती", "te": "వ్యవసాయం"},
    "farmers": {"hi": "రైతులు", "te": "రైతులు"},
    "india": {"hi": "भारत", "te": "భారతదేశం"},
    "state": {"hi": "రాష్ట్రం", "te": "రాష్ట్రం"},
    "market": {"hi": "बाजार", "te": "మార్కెట్"},
    "marketing": {"hi": "विपणन", "te": "మార్కెటింగ్"},
    "energy": {"hi": "ऊर्जा", "te": "శక్తి"},
    "power": {"hi": "बिजली", "te": "బిల్లి"},
}

def translate_en_to_hi(text):
    """Simple translation helper - replace known terms"""
    result = text
    for en, trans in TERM_MAP.items():
        if en in result:
            result = result.replace(en, trans["hi"])
    return result

def translate_en_to_te(text):
    """Simple translation helper"""
    result = text
    for en, trans in TERM_MAP.items():
        if en in result:
            result = result.replace(en, trans["te"])
    return result

# Define translations for each scheme
# Format: { id: { name: {en, hi, te}, description: {en, hi, te}, eligibility: {en, hi, te} } }
translations = {}

# Key schemes with full translations
translations["pmfby"] = {
    "name": {"en": "Pradhan Mantri Fasal Bima Yojana (PMFBY)", "hi": "प्रधान मंत्री फसल बीमा योजना (PMFBY)", "te": "ప్రధాన మంత్రి పంట బీమా పథకం (PMFBY)"},
    "description": {
        "en": "Comprehensive crop insurance cover against failure of notified crops - assured insurance protection from natural calamities, pests & diseases, with farmers paying only 2% premium for Kharif, 1.5% for Rabi and 5% for annual commercial/horticultural crops; technology like remote sensing and drones is used for loss estimation.",
        "hi": "सूचना प्राप्त फसलों की विफलता के खिलाफ व्यापक फसल बीमा कवर - प्राकृतिक आपदाओं, कीटों और बीमारियों से निश्चित बीमा संरक्षण, किसान 2% प्रीमियम का भुगतान करते हैं खरीफ के लिए, 1.5% रबी के लिए और वार्षिक वाणिज्यिक/होर्टिकल्चर फसलों के लिए 5%; रिमोट सेंसिंग और ड्रोन जैसी तकनीक का उपयोग क्षति अनुमानन के लिए।",
        "te": "సూచిత పంటల వైఫల్యం వైపకాల కోసం వ్యాపక పంట బీమా కవర్ - ప్రకృతి విపత్తులు, కీటకాలు మరియు వ్యాధుల చేత నిరంతర బీమా రక్షణ, రైతులు కేవలం 2% ప్రీమియమ్ చెల్లించారు ఖరీఫ్ కోసం, 1.5% రబీ కోసం మరియు సంవత్సరిక వ్యాపారిక/సాగుల రెండు రకాల పంటల కోసం 5%; రిమోట్ సెన్సింగ్ మరియు డ్రోన్ల వంటి టెక్నాలజీని నష్ట అంచనా కోసం ఉపయోగిస్తారు."
    },
    "eligibility": {
        "en": "All farmers growing notified crops in a notified area. Compulsory for loanee farmers with a Crop Loan/KCC account for notified crops, voluntary for non-loanee farmers.",
        "hi": "सूचना प्राप्त क्षेत्र में सूचना प्राप्त फसल बो रहे सभी किसान। नोटिफाइड फसल के लिए क्रॉप लोन/ KCC खाते वाले ऋण लेने वाले किसानों के लिए आवश्यक, गैर-ऋण लेने वाले किसानों के लिए स्वैच्छिक।",
        "te": "సూచిత ప్రాంతంలో సూచిత పంటలను పండించే అన్ని రైతులు. సూచిత పంటల కోసం పంట రుణం/ KCC నోటీకరించిన రైతులకు అవసరం, రుణం లేకుండా రైతులకు రాయబడినది."
    }
}

# More translations go here...
# This is a placeholder structure
print("Translations structure ready")
