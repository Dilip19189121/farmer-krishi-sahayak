import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { parsedSchemes } from '../data/parsedSchemes';

interface SchemesScreenProps {
  showToast: (msg: string) => void;
}

const TAG_STYLES = [
  { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]' },
  { bg: 'bg-[#e0f2fe]', text: 'text-[#0369a1]' },
  { bg: 'bg-[#fef9c3]', text: 'text-[#a16207]' },
  { bg: 'bg-[#fae8ff]', text: 'text-[#a21caf]' },
  { bg: 'bg-[#ffe4e6]', text: 'text-[#be123c]' },
  { bg: 'bg-[#ccfbf1]', text: 'text-[#0f766e]' },
];

export const SchemesScreen: React.FC<SchemesScreenProps> = ({ showToast }) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedEligibility, setSelectedEligibility] = useState<string>('all');

  // Schemes are parsed locally from the dataset files in "multiligual datasets/" (frontend-only).
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [visibleSchemes, setVisibleSchemes] = useState(4);

  const loadMoreTextByLang: Record<string, string> = {
    en: 'Load More',
    te: 'మరిన్ని చూడండి',
    hi: 'और देखें',
    ta: 'மேலும் காட்டு',
    kn: 'ಇನ್ನಷ್ಟು ವೀಕ್ಷಿಸಿ',
    mr: 'अधिक पहा',
    bn: 'আরও দেখুন',
    gu: 'વધુ જુઓ',
    pa: 'ਹੋਰ ਦੇਖੋ',
  };

  const eligibilityLabelByLang: Record<string, string> = {
    en: 'Eligibility',
    te: 'అర్హత',
    hi: 'पात्रता',
    ta: 'தகுதி',
    kn: 'ಅರ್ಹತೆ',
    mr: 'पात्रता',
    bn: 'যোগ্যতা',
    gu: 'પાત્રતા',
    pa: 'ਯੋਗਤਾ',
  };

  const visitPortalTextByLang: Record<string, string> = {
    en: 'Visit Official Portal',
    te: 'అధికారిక పోర్టల్ సందర్శించండి',
    hi: 'आधिकारिक पोर्टल देखें',
    ta: 'அதிகாரப்பூர்வ தளத்தை பார்வையிடுங்கள்',
    kn: 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ನೋಡಿ',
    mr: 'अधिकृत पोर्टल पहा',
    bn: 'সরকারি পোর্টাল দেখুন',
    gu: 'સત્તાવાર પોર્ટલ જુઓ',
    pa: 'ਸਰਕਾਰੀ ਪੋਰਟਲ ਵੇਖੋ',
  };

  const noLinkTextByLang: Record<string, string> = {
    en: 'Official link not in dataset',
    hi: 'आधिकारिक लिंक डेटासेट में नहीं है',
  };  const [farmerLandArea, setFarmerLandArea] = useState('2.5');


  const getLocalized = (field: Record<string, string> | string | undefined): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[language] || field.en || Object.values(field)[0] || '';
  };





  const stateFilterLabelsByLang: Record<string, string> = {
    en: 'State: All (Central & State)',
    te: 'రాష్ట్రం: అన్నీ (కేంద్ర & రాష్ట్ర)',
    hi: 'राज्य: सभी (केंद्र व राज्य)',
    ta: 'மாநிலம்: அனைத்தும்',
    kn: 'ರಾಜ್ಯ: ಎಲ್ಲವೂ',
    mr: 'राज्य: सर्व',
    bn: 'রাজ্য: সমস্ত',
    gu: 'રાજ્ય: બધા',
    pa: 'ਰਾਜ: ਸਾਰੇ',
  };

  const centralOnlyLabelsByLang: Record<string, string> = {
    en: 'Central Government Schemes',
    te: 'కేంద్ర ప్రభుత్వ పథకాలు',
    hi: 'केंद्र सरकार की योजनाएं',
    ta: 'மத்திய அரசு திட்டங்கள்',
    kn: 'ಕೇಂದ್ರ ಸರ್ಕಾರದ ಯೋಜನೆಗಳು',
    mr: 'केंद्र शासन योजना',
    bn: 'কেন্দ্রীয় সরকারি প্রকল্প',
    gu: 'કેન્દ્ર સરકારની યોજનાઓ',
    pa: 'ਕੇਂਦਰ ਸਰਕਾਰ ਦੀਆਂ ਸਕੀਮਾਂ',
  };

  const stateOnlyLabelsByLang: Record<string, string> = {
    en: 'State Government Schemes',
    te: 'రాష్ట్ర ప్రభుత్వ పథకాలు',
    hi: 'राज्य सरकार की योजनाएं',
    ta: 'மாநில அரசு திட்டங்கள்',
    kn: 'ರಾಜ್ಯ ಸರ್ಕಾರದ ಯೋಜನೆಗಳು',
    mr: 'राज्य शासन योजना',
    bn: 'রাজ্য সরকারি প্রকল্প',
    gu: 'રાજ્ય સરકારની યોજનાઓ',
    pa: 'ਰਾਜ ਸਰਕਾਰ ਦੀਆਂ ਸਕੀਮਾਂ',
  };

  const eligFilterLabelsByLang: Record<string, string> = {
    en: 'Eligibility: All Farmers',
    te: 'అర్హత: రైతులందరూ',
    hi: 'पात्रता: सभी किसान',
    ta: 'தகுதி: அனைத்து விவசாயிகள்',
    kn: 'ಅರ್ಹತೆ: ಎಲ್ಲಾ ರೈತರು',
    mr: 'पात्रता: सर्व शेतकरी',
    bn: 'যোগ্যতা: সমস্ত কৃষক',
    gu: 'પાત્રતા: બધા ખેડૂતો',
    pa: 'ਯੋਗਤਾ: ਸਾਰੇ ਕਿਸਾਨ',
  };

  const optSmallByLang: Record<string, string> = {
    en: 'Small & Marginal Farmers',
    te: 'చిన్న & సన్నకారు రైతులు',
    hi: 'लघु एवं सीमांत किसान',
    ta: 'சிறு & குறு விவசாயிகள்',
    kn: 'ಸಣ್ಣ ಮತ್ತು ಅತಿ ಸಣ್ಣ ರೈತರು',
    mr: 'अल्प व अत्यल्प भूधारक शेतकरी',
    bn: 'ক্ষুদ্র ও প্রান্তিক কৃষক',
    gu: 'નાના અને સીમાંત ખેડૂતો',
    pa: 'ਛੋਟੇ ਅਤੇ ਸੀਮਾਂਤ ਕਿਸਾਨ',
  };

  const optTenantByLang: Record<string, string> = {
    en: 'Tenant Farmers (CCRC)',
    te: 'కౌలు రైతులు (CCRC కార్డుదారులు)',
    hi: 'बटाईदार / पट्टेदार किसान (CCRC)',
    ta: 'குத்தகை விவசாயிகள் (CCRC)',
    kn: 'ಗೇಣಿದಾರ ರೈತರು (CCRC)',
    mr: 'कुळ / भाडेकरू शेतकरी (CCRC)',
    bn: 'বর্গাদার / ভাগচাষী (CCRC)',
    gu: 'ભાગીદાર / ગણોતિયા ખેડૂતો (CCRC)',
    pa: 'ਕਾਸ਼ਤਕਾਰ / ਮੁਜ਼ਾਰੇ (CCRC)',
  };

  const optWomenByLang: Record<string, string> = {
    en: 'Women Cultivators',
    te: 'మహిళా సాగుదారులు',
    hi: 'महिला कृषक',
    ta: 'பெண் விவசாயிகள்',
    kn: 'ಮಹಿಳಾ ರೈತರು',
    mr: 'महिला शेतकरी',
    bn: 'মহিলা কৃষক',
    gu: 'મહિલા ખેડૂતો',
    pa: 'ਮਹਿਲਾ ਕਿਸਾਨ',
  };

  const reqDocsLabelByLang: Record<string, string> = {
    en: 'Required Documents & Details',
    te: 'అవసరమైన పత్రాలు & వివరాలు',
    hi: 'आवश्यक दस्तावेज़ एवं विवरण',
    ta: 'தேவையான ஆவணங்கள் & விவரங்கள்',
    kn: 'ಅಗತ್ಯ ದಾಖಲೆಗಳು & ವಿವರಗಳು',
    mr: 'आवश्यक कागदपत्रे आणि तपशील',
    bn: 'প্রয়োজনীয় নথিপত্র ও বিবরণ',
    gu: 'જરૂરી દસ્તાવેજો અને વિગતો',
    pa: 'ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਅਤੇ ਵੇਰਵੇ',
  };

  const checklistLabelByLang: Record<string, string> = {
    en: 'Checklist for instant approval:',
    te: 'తక్షణ ఆమోదం కోసం చెక్‌లిస్ట్:',
    hi: 'त्वरित अनुमोदन चेकलिस्ट:',
    ta: 'உடனடி ஒப்புதலுக்கான சரிபார்ப்பு பட்டியல்:',
    kn: 'ತ್ವರಿತ ಅನುಮೋದನೆ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ:',
    mr: 'त्वरित मंजुरीसाठी चेकलिस्ट:',
    bn: 'তাত্ক্ষণিক অনুমোদনের জন্য চেকলিস্ট:',
    gu: 'ત્વરિત મંજૂરી માટે ચેકલિસ્ટ:',
    pa: 'ਤੁਰੰਤ ਪ੍ਰਵਾਨਗੀ ਲਈ ਚੈੱਕਲਿਸਟ:',
  };

  const targetLabelByLang: Record<string, string> = {
    en: 'Target:',
    te: 'లక్ష్యం (Target):',
    hi: 'पात्रता लक्ष्य:',
    ta: 'இலக்கு:',
    kn: 'ಗುರಿ:',
    mr: 'पात्रता निकष:',
    bn: 'লক্ষ্যমাত্রা:',
    gu: 'પાત્રતા લક્ષ્ય:',
    pa: 'ਨਿਸ਼ਾਨਾ:',
  };

  const helpBannerTitleByLang: Record<string, string> = {
    en: 'Need help navigating scheme applications?',
    te: 'పథకాల దరఖాస్తులలో సహాయం కావాలా?',
    hi: 'योजना आवेदनों में सहायता चाहिए?',
    ta: 'திட்ட விண்ணப்பங்களில் உதவி தேவையா?',
    kn: 'ಯೋಜನೆ ಅರ್ಜಿಗಳಿಗೆ ಸಹಾಯ ಬೇಕೇ?',
    mr: 'योजना अर्जांमध्ये मदत हवी आहे का?',
    bn: 'প্রকল্প আবেদনে সহায়তার প্রয়োজন?',
    gu: 'યોજના અરજીઓમાં સહાય જોઈએ છે?',
    pa: 'ਸਕੀਮ ਅਰਜ਼ੀਆਂ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?',
  };

  const helpBannerSubByLang: Record<string, string> = {
    en: 'Connect with your Gram Panchayat Village Agriculture Assistant (VAA) or call 1800-180-1551 (Kisan Call Center).',
    te: 'మీ గ్రామ పంచాయతీ గ్రామ వ్యవసాయ సహాయకుడిని (VAA) సంప్రదించండి లేదా 1800-180-1551 (కిసాన్ కాల్ సెంటర్) కు కాల్ చేయండి.',
    hi: 'अपने ग्राम पंचायत ग्राम कृषि सहायक (VAA) से संपर्क करें या 1800-180-1551 (किसान कॉल सेंटर) पर कॉल करें।',
    ta: 'உங்கள் கிராம பஞ்சாயத்து கிராம வேளாண்மை உதவியாளரை (VAA) தொடர்பு கொள்ளவும் அல்லது 1800-180-1551 (கிசான் கால் சென்டர்) ஐ அழைக்கவும்.',
    kn: 'ನಿಮ್ಮ ಗ್ರಾಮ ಪಂಚಾಯತ್ ಗ್ರಾಮ ಕೃಷಿ ಸಹಾಯಕರನ್ನು (VAA) ಸಂಪರ್ಕಿಸಿ ಅಥವಾ 1800-180-1551 (ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್) ಕರೆ ಮಾಡಿ.',
    mr: 'तुमच्या ग्रामपंचायत ग्राम कृषी सहाय्यकाशी (VAA) संपर्क साधा किंवा 1800-180-1551 (किसान कॉल सेंटर) वर कॉल करा.',
    bn: 'আপনার গ্রাম পঞ্চায়েত গ্রাম কৃষি সহায়ক (VAA)-এর সাথে যোগাযোগ করুন বা 1800-180-1551 (কিষাণ কল সেন্টার)-এ কল করুন।',
    gu: 'તમારા ગ્રામ પંચાયત ગ્રામ કૃષિ સહાયક (VAA) નો સંપર્ક કરો અથવા 1800-180-1551 (કિસાન કોલ સેન્ટર) પર કૉલ કરો.',
    pa: 'ਆਪਣੇ ਗ੍ਰਾਮ ਪੰਚਾਇਤ ਗ੍ਰਾਮ ਖੇਤੀਬਾੜੀ ਸਹਾਇਕ (VAA) ਨਾਲ ਸੰਪਰਕ ਕਰੋ ਜਾਂ 1800-180-1551 (ਕਿਸਾਨ ਕਾਲ ਸੈਂਟਰ) ਤੇ ਕਾਲ ਕਰੋ।',
  };

  const btnCheckDocsByLang: Record<string, string> = {
    en: 'Check Required Documents',
    te: 'అవసరమైన పత్రాలు సరిచూడండి',
    hi: 'आवश्यक दस्तावेज़ जांचें',
    ta: 'தேவையான ஆவணங்களை சரிபார்க்கவும்',
    kn: 'ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    mr: 'आवश्यक कागदपत्रे तपासा',
    bn: 'প্রয়োজনীয় নথিপত্র পরীক্ষা করুন',
    gu: 'જરૂરી દસ્તાવેજો તપાસો',
    pa: 'ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਚੈੱਕ ਕਰੋ',
  };

  const btnDialHelpByLang: Record<string, string> = {
    en: 'Dial Toll-Free Help',
    te: 'టోల్-ఫ్రీ సహాయం కాల్ చేయండి',
    hi: 'टोल-फ्री सहायता डायल करें',
    ta: 'கட்டணமில்லா உதவிக்கு அழைக்கவும்',
    kn: 'ಟೋಲ್-ಫ್ರೀ ಸಹಾಯಕ್ಕೆ ಕರೆ ಮಾಡಿ',
    mr: 'टोल-फ्री मदतीसाठी कॉल करा',
    bn: 'টোল-ফ্রি হেল্পলাইনে কল করুন',
    gu: 'ટોલ-ફ્રી સહાય ડાયલ કરો',
    pa: 'ਟੋਲ-ਫ੍ਰੀ ਮਦਦ ਤੇ ਕਾਲ ਕਰੋ',
  };

  const appModalDirectByLang: Record<string, string> = {
    en: 'e-Governance Direct Application',
    te: 'ఈ-గవర్నెన్స్ ప్రత్యక్ష దరఖాస్తు',
    hi: 'ई-गवर्नेंस प्रत्यक्ष आवेदन',
    ta: 'மின்-ஆளுமை நேரடி விண்ணப்பம்',
    kn: 'ಇ-ಆಡಳಿತ ನೇರ ಅರ್ಜಿ',
    mr: 'ई-प्रशासन थेट अर्ज',
    bn: 'ই-গভর্ন্যান্স সরাসরি আবেদন',
    gu: 'ઈ-ગવર્નન્સ પ્રત્યક્ષ અરજી',
    pa: 'ਈ-ਗਵਰਨੈਂਸ ਸਿੱਧੀ ਅਰਜ਼ੀ',
  };

  const appModalAadhaarByLang: Record<string, string> = {
    en: 'Farmer Aadhaar (UIDAI 12-Digits)',
    te: 'రైతు ఆధార్ (UIDAI 12 అంకెలు)',
    hi: 'किसान आधार (UIDAI 12-अंक)',
    ta: 'விவசாயி ஆதார் (UIDAI 12-இலக்கங்கள்)',
    kn: 'ರೈತ ಆಧಾರ್ (UIDAI 12-ಅಂಕಿಗಳು)',
    mr: 'शेतकरी आधार (UIDAI 12-अंकी)',
    bn: 'কৃষক আধার (UIDAI ১২-সংখ্যা)',
    gu: 'ખેડૂત આધાર (UIDAI 12-અંક)',
    pa: 'ਕਿਸਾਨ ਆਧਾਰ (UIDAI 12-ਅੰਕ)',
  };

  const appModalLandByLang: Record<string, string> = {
    en: 'Cultivable Land Holding (in Acres)',
    te: 'సాగు భూమి విస్తీర్ణం (ఎకరాలలో)',
    hi: 'कृषि भूमि जोत (एकड़ में)',
    ta: 'சாகுபடி நில பரப்பளவு (ஏக்கரில்)',
    kn: 'ಕೃಷಿ ಭೂಮಿ ವಿಸ್ತೀರ್ಣ (ಎಕರೆಗಳಲ್ಲಿ)',
    mr: 'लागवडीखालील जमीन (एकरमध्ये)',
    bn: 'চাষযোগ্য জমির পরিমাণ (একর)',
    gu: 'ખેતીલાયક જમીનનું ક્ષેત્રફળ (એકરમાં)',
    pa: 'ਖੇਤੀਯੋਗ ਜ਼ਮੀਨ (ਏਕੜਾਂ ਵਿੱਚ)',
  };

  const appModalSubmitByLang: Record<string, string> = {
    en: 'Submit e-KYC Application to Rythu Bharosa Kendra',
    te: 'రైతు భరోసా కేంద్రానికి ఇ-కేవైసీ దరఖాస్తు సమర్పించు',
    hi: 'रायथु भरोसा केंद्र को ई-केवाईसी आवेदन जमा करें',
    ta: 'ரைத்து பரோசா மையத்தில் இ-கேஒய்சி விண்ணப்பத்தை சமர்ப்பிக்கவும்',
    kn: 'ರೈತು ಭರೋಸಾ ಕೇಂದ್ರಕ್ಕೆ ಇ-ಕೆವೈಸಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    mr: 'रयतु भरोसा केंद्राकडे ई-केवायसी अर्ज सादर करा',
    bn: 'রায়থু ভরসা কেন্দ্রে ই-কেওয়াইসি আবেদন জমা দিন',
    gu: 'રાયથુ ભરોસા કેન્દ્રમાં ઈ-કેવાયસી અરજી સબમિટ કરો',
    pa: 'ਰੈਥੂ ਭਰੋਸਾ ਕੇਂਦਰ ਨੂੰ ਈ-ਕੇਵਾਈਸੀ ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ',
  };

  const protocolTitleByLang: Record<string, string> = {
    en: 'Instant Verification Protocol:',
    te: 'తక్షణ ధృవీకరణ ప్రోటోకాల్:',
    hi: 'त्वरित सत्यापन प्रोटोकॉल:',
    ta: 'உடனடி சரிபார்ப்பு நெறிமுறை:',
    kn: 'ತ್ವರಿತ ಪರಿಶೀಲನಾ ಶಿಷ್ಟಾಚಾರ:',
    mr: 'त्वरित पडताळणी नियमावली:',
    bn: 'তাত্ক্ষণিক যাচাইকরণ প্রোটোকল:',
    gu: 'ત્વરિત ચકાસણી પ્રોટોકોલ:',
    pa: 'ਤੁਰੰਤ ਤਸਦੀਕ ਪ੍ਰੋਟੋਕੋਲ:',
  };

  const protocolDescByLang: Record<string, string> = {
    en: 'Upon submission, your land records are verified with Andhra Pradesh Meebhoomi 1B/Adangal and linked with your PM-KISAN biometric e-KYC.',
    te: 'దరఖాస్తు సమర్పించిన తర్వాత, మీ భూమి రికార్డులు ఆంధ్రప్రదేశ్ మీభూమి 1B/అడంగల్‌తో సరిచూడబడి, PM-కిసాన్ బయోమెట్రిక్ e-KYC తో అనుసంధానించబడతాయి.',
    hi: 'जमा करने के उपरांत, आपके भू-अभिलेख आंध्र प्रदेश मीभूमि 1B/अडंगल से सत्यापित होकर पीएम-किसान बायोमेट्रिक ई-केवाईसी से लिंक होंगे।',
    ta: 'சமர்ப்பித்தவுடன், உங்கள் நில ஆவணங்கள் ஆந்திரப் பிரதேச மீபூமி 1B/அடங்கலுடன் சரிபார்க்கப்பட்டு பிஎம்-கிசான் பயோமெட்ரிக் இ-கேஒய்சியுடன் இணைக்கப்படும்.',
    kn: 'ಸಲ್ಲಿಸಿದ ನಂತರ, ನಿಮ್ಮ ಭೂ ದಾಖಲೆಗಳು ಆಂಧ್ರಪ್ರದೇಶ ಮೀಭೂಮಿ 1B/ಅಡಂಗಲ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟು PM-ಕಿಸಾನ್ ಬಯೋಮೆಟ್ರಿಕ್ ಇ-ಕೆವೈಸಿಯೊಂದಿಗೆ ಜೋಡಿಸಲ್ಪಡುತ್ತವೆ.',
    mr: 'सादर केल्यावर, तुमचे जमीन अभिलेख आंध्र प्रदेश मीभूमी 1B/अडंगलशी पडताळले जातील आणि पीएम-किसान बायोमेट्रिक ई-केवायसीशी जोडले जातील.',
    bn: 'জমা দেওয়ার পর, আপনার জমির রেকর্ড অন্ধ্রপ্রদেশ মীভূমি 1B/আদাঙ্গালের সাথে যাচাই করা হবে এবং পিএম-কিষাণ বায়োমেট্রিক ই-কেওয়াইসির সাথে লিঙ্ক করা হবে।',
    gu: 'સબમિટ કર્યા પછી, તમારા જમીન રેકોર્ડ્સ આંધ્રપ્રદેશ મીભૂમિ 1B/અડંગલ સાથે ચકાસવામાં આવશે અને પીએમ-કિસાન બાયોમેટ્રિક ઈ-કેવાયસી સાથે લિંક કરવામાં આવશે.',
    pa: 'ਜਮ੍ਹਾਂ ਕਰਾਉਣ ਤੇ, ਤੁਹਾਡੇ ਜ਼ਮੀਨੀ ਰਿਕਾਰਡ ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼ ਮੀਭੂਮੀ 1B/ਅਡੰਗਲ ਨਾਲ ਤਸਦੀਕ ਹੋ ਕੇ PM-ਕਿਸਾਨ ਬਾਇਓਮੈਟ੍ਰਿਕ ਈ-ਕੇਵਾਈਸੀ ਨਾਲ ਲਿੰਕ ਕੀਤੇ ਜਾਣਗੇ।',
  };

  const docsModalTitleByLang: Record<string, string> = {
    en: 'Statutory Documents for Agriculture Subsidies',
    te: 'వ్యవసాయ రాయితీల కోసం అవసరమైన చట్టబద్ధమైన పత్రాలు',
    hi: 'कृषि सब्सिडी के लिए आवश्यक वैधानिक दस्तावेज़',
    ta: 'விவசாய மானியங்களுக்கான சட்டப்பூர்வ ஆவணங்கள்',
    kn: 'ಕೃಷಿ ಸಬ್ಸಿಡಿಗಳಿಗೆ ಅಗತ್ಯವಿರುವ ಶಾಸನಬದ್ಧ ದಾಖಲೆಗಳು',
    mr: 'कृषी अनुदानासाठी आवश्यक वैधानिक कागदपत्रे',
    bn: 'কৃষি ভর্তুকির জন্য প্রয়োজনীয় সংবিধিবদ্ধ নথিপত্র',
    gu: 'કૃષિ સબસિડી માટે જરૂરી વૈધાનિક દસ્તાવેજો',
    pa: 'ਖੇਤੀਬਾੜੀ ਸਬਸਿਡੀਆਂ ਲਈ ਲੋੜੀਂਦੇ ਕਾਨੂੰਨੀ ਦਸਤਾਵੇਜ਼',
  };

  const docsModalSubByLang: Record<string, string> = {
    en: 'Keep original soft copies ready for verification at your Gram Panchayat Rythu Bharosa Kendra (RBK):',
    te: 'మీ గ్రామ పంచాయతీ రైతు భరోసా కేంద్రం (RBK) వద్ద ధృవీకరణ కోసం అసలు పత్రాలను సిద్ధంగా ఉంచుకోండి:',
    hi: 'अपने ग्राम पंचायत रायथु भरोसा केंद्र (RBK) पर सत्यापन के लिए मूल प्रतियों को तैयार रखें:',
    ta: 'உங்கள் கிராம பஞ்சாயத்து ரைத்து பரோசா மையத்தில் சரிபார்ப்புக்கு அசல் நகல்களை தயாராக வைக்கவும்:',
    kn: 'ನಿಮ್ಮ ಗ್ರಾಮ ಪಂಚಾಯತ್ ರೈತು ಭರೋಸಾ ಕೇಂದ್ರದಲ್ಲಿ ಪರಿಶೀಲನೆಗಾಗಿ ಮೂಲ ಪ್ರತಿಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ:',
    mr: 'तुमच्या ग्रामपंचायत रयतु भरोसा केंद्रावर पडताळणीसाठी मूळ कागदपत्रे तयार ठेवा:',
    bn: 'আপনার গ্রাম পঞ্চায়েত রায়থু ভরসা কেন্দ্রে যাচাইয়ের জন্য মূল কপি প্রস্তুত রাখুন:',
    gu: 'તમારા ગ્રામ પંચાયત રાયથુ ભરોસા કેન્દ્ર પર ચકાસણી માટે મૂળ નકલો તૈયાર રાખો:',
    pa: 'ਆਪਣੇ ਗ੍ਰਾਮ ਪੰਚਾਇਤ ਰੈਥੂ ਭਰੋਸਾ ਕੇਂਦਰ ਵਿਖੇ ਤਸਦੀਕ ਲਈ ਅਸਲ ਕਾਪੀਆਂ ਤਿਆਰ ਰੱਖੋ:',
  };

  const statDocsList: Record<string, string>[] = [
    {
      en: 'Pattadar Passbook / 1B Namuna (or CCRC Tenant Card)',
      te: 'పట్టాదారు పాస్‌బుక్ / 1B నమూనా (లేదా CCRC కౌలుదారు కార్డు)',
      hi: 'पट्टादार पासबुक / 1B खतौनी (या CCRC बटाईदार कार्ड)',
      ta: 'பட்டாதாரர் பாஸ்புக் / 1B ஆவணம் (அல்லது CCRC குத்தகை அட்டை)',
      kn: 'ಪಟ್ಟಾದಾರ ಪಾಸ್‌ಬುಕ್ / 1B ನಮೂನೆ (ಅಥವಾ CCRC ಗೇಣಿದಾರ ಕಾರ್ಡ್)',
      mr: 'पट्टेदार पासबुक / 1B नमुना (किंवा CCRC भाडेकरू कार्ड)',
      bn: 'পাট্টাদার পাসবুক / 1B নমুনা (বা CCRC বর্গাদার কার্ড)',
      gu: 'પટ્ટાધાર પાસબુક / 1B નમૂનો (અથવા CCRC ગણોતિયા કાર્ડ)',
      pa: 'ਪੱਟੇਦਾਰ ਪਾਸਬੁੱਕ / 1B ਨਮੂਨਾ (ਜਾਂ CCRC ਮੁਜ਼ਾਰਾ ਕਾਰਡ)',
    },
    {
      en: 'Aadhaar Card (Linked with Bank NPCI Direct Benefit Transfer)',
      te: 'ఆధార్ కార్డు (బ్యాంక్ NPCI డీబీటీతో అనుసంధానించబడినది)',
      hi: 'आधार कार्ड (बैंक NPCI प्रत्यक्ष लाभ अंतरण से लिंक)',
      ta: 'ஆதார் அட்டை (வங்கி NPCI நேரடி பணப்பரிமாற்றத்துடன் இணைக்கப்பட்டது)',
      kn: 'ಆಧಾರ್ ಕಾರ್ಡ್ (ಬ್ಯಾಂಕ್ NPCI ನೇರ ನಗದು ವರ್ಗಾವಣೆಗೆ ಜೋಡಿಸಲಾಗಿದೆ)',
      mr: 'आधार कार्ड (बँक NPCI थेट लाभ हस्तांतरणाशी जोडलेले)',
      bn: 'আধার কার্ড (ব্যাংক NPCI সরাসরি সুবিধার সাথে সংযুক্ত)',
      gu: 'આધાર કાર્ડ (બેંક NPCI ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર સાથે લિંક)',
      pa: 'ਆਧਾਰ ਕਾਰਡ (ਬੈਂਕ NPCI ਸਿੱਧੇ ਲਾਭ ਤਬਾਦਲੇ ਨਾਲ ਲਿੰਕ)',
    },
    {
      en: 'e-Crop Booking Survey Receipt (Kharif / Rabi 2026)',
      te: 'ఈ-పంట బుకింగ్ సర్వే రసీదు (ఖరీఫ్ / రబీ 2026)',
      hi: 'ई-फसल बुकिंग सर्वेक्षण रसीद (खरीफ / रबी 2026)',
      ta: 'மின்-பயிர் முன்பதிவு கணக்கெடுப்பு ரசீது (காரீஃப் / ரபி 2026)',
      kn: 'ಇ-ಬೆಳೆ ಬುಕಿಂಗ್ ಸಮೀಕ್ಷೆ ರಶೀದಿ (ಖಾರಿಫ್ / ರಬಿ 2026)',
      mr: 'ई-पीक नोंदणी पाहणी पावती (खरीप / रब्बी २०२६)',
      bn: 'ই-ফসল বুকিং সমীক্ষা রসিদ (খরিফ / রবি ২০২৬)',
      gu: 'ઈ-પાક બુકિંગ સર્વે રસીદ (ખરીફ / રવી 2026)',
      pa: 'ਈ-ਫ਼ਸਲ ਬੁਕਿੰਗ ਸਰਵੇਖਣ ਰਸੀਦ (ਖਰੀਫ / ਰਬੀ 2026)',
    },
    {
      en: 'Active Mobile Number for UIDAI Biometric OTP',
      te: 'UIDAI బయోమెట్రిక్ OTP కొరకు యాక్టివ్ మొబైల్ నంబర్',
      hi: 'UIDAI बायोमेट्रिक ओटीपी हेतु सक्रिय मोबाइल नंबर',
      ta: 'UIDAI பயோமெட்ரிக் OTP-க்கான செயலில் உள்ள மொபைல் எண்',
      kn: 'UIDAI ಬಯೋಮೆಟ್ರಿಕ್ OTP ಗಾಗಿ ಸಕ್ರಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
      mr: 'UIDAI बायोमेट्रिक OTP साठी सक्रिय मोबाइल क्रमांक',
      bn: 'UIDAI বায়োমেট্রিক ওটিপির জন্য সক্রিয় মোবাইল নম্বর',
      gu: 'UIDAI બાયોમેટ્રિક ઓટીપી માટે સક્રિય મોબાઇલ નંબર',
      pa: 'UIDAI ਬਾਇਓਮੈਟ੍ਰਿਕ OTP ਲਈ ਸਰਗਰਮ ਮੋਬਾਈਲ ਨੰਬਰ',
    },
  ];

  const understoodBtnByLang: Record<string, string> = {
    en: 'Understood & Proceed',
    te: 'అర్థమైంది & కొనసాగించండి',
    hi: 'समझ गया एवं आगे बढ़ें',
    ta: 'புரிந்தது & தொடரவும்',
    kn: 'ಅರ್ಥವಾಯಿತು & ಮುಂದುವರಿಯಿರಿ',
    mr: 'समजले व पुढे जा',
    bn: 'বুঝেছি ও এগিয়ে যান',
    gu: 'સમજાયું અને આગળ વધો',
    pa: 'ਸਮਝ ਗਿਆ ਤੇ ਅੱਗੇ ਵਧੋ',
  };

  const aadhaarPlaceholderByLang: Record<string, string> = {
    en: 'Enter 12-digit Aadhaar Number',
    te: '12 అంకెల ఆధార్ సంఖ్యను నమోదు చేయండి',
    hi: '12-अंकों का आधार नंबर दर्ज करें',
    ta: '12-இலக்க ஆதார் எண்ணை உள்ளிடவும்',
    kn: '12-ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    mr: '१२-अंकी आधार क्रमांक प्रविष्ट करा',
    bn: '১২-সংখ্যার আধার নম্বর লিখুন',
    gu: '12-અંકનો આધાર નંબર દાખલ કરો',
    pa: '12-ਅੰਕਾਂ ਦਾ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ',
  };

  const filteredSchemes = parsedSchemes.filter((s) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.eligibility.toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'all' || s.categoryKey === selectedCategory;

    const matchesState = selectedState === 'all' || s.stateType === selectedState;

    const matchesEligibility =
      selectedEligibility === 'all' ||
      s.eligibilityKey === selectedEligibility ||
      s.eligibilityKey === 'all';

    return matchesSearch && matchesCategory && matchesState && matchesEligibility;
  });

  return (
    <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* 1. Main Title Banner Card */}
      <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 sm:p-9 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/80 text-[11px] font-bold text-[#006b2c] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse"></span>
          <span>{t.schemes_badge}</span>
        </div>
        <h1 className="text-[34px] sm:text-[44px] font-bold text-[#111827] tracking-tight leading-tight">
          {t.schemes_title}
        </h1>
        <p className="text-[14px] sm:text-[15px] text-[#4b5563] max-w-3xl leading-relaxed">
          {t.schemes_subtitle}
        </p>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="w-full bg-white/75 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/60 p-2 sm:p-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full pl-2">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[19px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.schemes_search_placeholder}
            className="w-full h-10 pl-9 pr-4 rounded-full bg-transparent text-[13px] text-[#111827] placeholder:text-[#6b7280] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pr-1">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3.5 pr-8 rounded-full bg-white/90 text-[12px] font-semibold text-[#1f2937] border border-white/80 shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#006b2c]"
            >
              <option value="all">{t.schemes_filter_all}</option>
              <option value="dbt">{t.schemes_filter_dbt}</option>
              <option value="insurance">{t.schemes_filter_insurance}</option>
              <option value="equipment">{t.schemes_filter_equipment}</option>
              <option value="irrigation">{t.schemes_filter_irrigation}</option>
              <option value="organic">{t.schemes_filter_organic}</option>
              <option value="credit">{t.schemes_filter_credit}</option>
            </select>
            <span className="material-symbols-outlined text-[16px] text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* State / Central Dropdown */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="h-9 px-3.5 pr-8 rounded-full bg-white/90 text-[12px] font-semibold text-[#1f2937] border border-white/80 shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#006b2c]"
            >
              <option value="all">{stateFilterLabelsByLang[language] || stateFilterLabelsByLang.en}</option>
              <option value="central">{centralOnlyLabelsByLang[language] || centralOnlyLabelsByLang.en}</option>
              <option value="state">{stateOnlyLabelsByLang[language] || stateOnlyLabelsByLang.en}</option>
            </select>
            <span className="material-symbols-outlined text-[16px] text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Eligibility Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedEligibility}
              onChange={(e) => setSelectedEligibility(e.target.value)}
              className="h-9 px-3.5 pr-8 rounded-full bg-white/90 text-[12px] font-semibold text-[#1f2937] border border-white/80 shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#006b2c]"
            >
              <option value="all">{eligFilterLabelsByLang[language] || eligFilterLabelsByLang.en}</option>
              <option value="small">{optSmallByLang[language] || optSmallByLang.en}</option>
              <option value="tenant">{optTenantByLang[language] || optTenantByLang.en}</option>
              <option value="women">{optWomenByLang[language] || optWomenByLang.en}</option>
            </select>
            <span className="material-symbols-outlined text-[16px] text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* 3. Scheme Cards Grid — parsed from "multiligual datasets/" scheme files (4 shown by default) */}
      {filteredSchemes.length === 0 && (
        <div className="flex items-center justify-center gap-2 p-6 rounded-3xl bg-white/75 backdrop-blur-xl border border-white/60 shadow-xs text-[13px] font-semibold text-[#6b7280]">
          <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          <span>No schemes match your filter or search.</span>
        </div>
      )}

      {filteredSchemes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSchemes.slice(0, visibleSchemes).map((scheme) => {
            const catLabel =
              scheme.categoryKey === 'insurance' ? 'INSURANCE' :
              scheme.categoryKey === 'credit' ? 'CREDIT' :
              scheme.categoryKey === 'irrigation' ? 'IRRIGATION' : 'GOVERNMENT SCHEME';
            const catStyle =
              scheme.categoryKey === 'insurance' ? 'bg-[#dcfce7] text-[#15803d]' :
              scheme.categoryKey === 'credit' ? 'bg-[#e0f2fe] text-[#0369a1]' :
              scheme.categoryKey === 'irrigation' ? 'bg-[#ccfbf1] text-[#0f766e]' : 'bg-[#f3f4f6] text-[#374151]';
            return (
              <div
                key={scheme.id}
                className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${catStyle} shadow-2xs`}
                    >
                      {catLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-xs text-[10.5px] font-semibold text-[#374151] border border-gray-200 shadow-2xs max-w-[55%]">
                      <span className="material-symbols-outlined text-[13px] text-gray-600">
                        description
                      </span>
                      <span className="truncate">{scheme.sourceFile.split(',')[0]}</span>
                    </span>
                  </div>

                  <h3 className="text-[19px] sm:text-[20px] font-bold text-[#111827] leading-snug">
                    {scheme.name}
                  </h3>

                  <p className="mt-3 text-[12.5px] text-[#374151] leading-relaxed line-clamp-4">
                    {scheme.description}
                  </p>

                  <div className="mt-3 bg-[#f0fdf4] rounded-2xl p-3 border border-[#dcfce7] shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#15803d] uppercase tracking-wider block mb-1">
                      {eligibilityLabelByLang[language] || eligibilityLabelByLang.en}
                    </span>
                    <span className="text-[12px] text-[#1f2937] font-medium leading-snug">
                      {scheme.eligibility}
                    </span>
                  </div>
                </div>

                {scheme.link ? (
                  <a
                    href={scheme.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full py-3 px-4 rounded-full bg-[#006b2c] hover:bg-[#005a24] text-white font-bold text-[13.5px] flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span>{visitPortalTextByLang[language] || visitPortalTextByLang.en}</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_outward</span>
                  </a>
                ) : (
                  <div className="mt-4 w-full py-3 px-4 rounded-full bg-gray-100 text-[#6b7280] font-bold text-[13.5px] flex items-center justify-center gap-1.5 shadow-xs">
                    <span>{noLinkTextByLang[language] || noLinkTextByLang.en}</span>
                    <span className="material-symbols-outlined text-[17px]">link_off</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More — reveals 4 more scheme cards */}
      {visibleSchemes < filteredSchemes.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleSchemes((v) => v + 4)}
            className="px-7 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#006b2c] border border-[#006b2c]/30 font-bold text-[13px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <span>{loadMoreTextByLang[language] || loadMoreTextByLang.en}</span>
            <span className="material-symbols-outlined text-[17px]">expand_more</span>
          </button>
        </div>
      )}

      {/* 4. Bottom Helpline & Navigation Banner */}
      <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white text-[#006b2c] flex items-center justify-center shrink-0 border border-white/80 shadow-xs">
            <span className="material-symbols-outlined text-[24px]">support_agent</span>
          </div>
          <div>
            <h4 className="text-[15px] sm:text-[16px] font-bold text-[#111827] leading-tight">
              {helpBannerTitleByLang[language] || helpBannerTitleByLang.en}
            </h4>
            <p className="text-[12px] sm:text-[13px] text-[#4b5563] mt-0.5 leading-snug">
              {helpBannerSubByLang[language] || helpBannerSubByLang.en}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setShowDocsModal(true)}
            className="px-5 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#111827] border border-white/80 font-bold text-[12.5px] sm:text-[13px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] text-gray-700">
              description
            </span>
            <span>{btnCheckDocsByLang[language] || btnCheckDocsByLang.en}</span>
          </button>
          <button
            type="button"
            onClick={() => showToast('Connecting to Kisan Call Centre hotline: 1800-180-1551 (Toll-Free 24x7)')}
            className="px-5 py-2.5 rounded-full bg-[#006b2c] hover:bg-[#005a24] text-white font-bold text-[12.5px] sm:text-[13px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">
              call
            </span>
            <span>{btnDialHelpByLang[language] || btnDialHelpByLang.en}</span>
          </button>
        </div>
      </div>

      {/* Required Documents Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-white relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowDocsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-[19px] font-bold text-[#111827] mb-2">
              {docsModalTitleByLang[language] || docsModalTitleByLang.en}
            </h3>
            <p className="text-[12.5px] text-[#4b5563] mb-4">
              {docsModalSubByLang[language] || docsModalSubByLang.en}
            </p>
            <div className="space-y-2 text-[13px] text-[#1f2937]">
              {statDocsList.map((docItem, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className="text-[#006b2c] font-bold">{idx + 1}.</span>
                  <span>{getLocalized(docItem)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDocsModal(false)}
              className="w-full mt-5 py-2.5 rounded-full bg-[#006b2c] text-white font-bold text-[13px] hover:bg-[#005a24] cursor-pointer"
            >
              {understoodBtnByLang[language] || understoodBtnByLang.en}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
