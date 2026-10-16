import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  ApiError,
  createGrievance,
  getGrievance,
  GrievanceOut,
} from '../api/client';

interface GrievancesScreenProps {
  showToast: (msg: string) => void;
  onNavigateToOfficerHub?: () => void;
}

interface GrievanceCardItem {
  id: string;
  token: string;
  categoryTag: Record<string, string>;
  categoryTagBg: string;
  categoryTagText: string;
  status: Record<string, string>;
  statusBg: string;
  statusText: string;
  farmerName: string;
  village: string;
  mandal: string;
  district: string;
  cropName: Record<string, string>;
  cropImage: string;
  damageCause: Record<string, string>;
  lossPercent: number;
  reliefAmount: string;
  assignedOfficer: string;
  officerDesignation: string;
  filedDate: string;
  slaRemaining: string;
  gpsCoords: string;
  aadhaarMasked: string;
}

const gI18n = {
  seasonCycle: {
    en: '2026 Season Redressal Cycle',
    te: '2026 సీజన్ ఫిర్యాదుల పరిష్కార చక్రం',
    hi: '2026 सीजन निवारण चक्र',
    ta: '2026 பருவகால தீர்வு சுழற்சி',
    kn: '2026 ಹಂಗಾಮಿನ ಪರಿಹಾರ ಚಕ್ರ',
    mr: '२०२६ हंगाम निवारण चक्र',
    bn: '২০২৬ মৌসুমের নিষ্পত্তি চক্র',
    gu: '2026 સીઝન નિવારણ ચક્ર',
    pa: '2026 ਸੀਜ਼ਨ ਨਿਵਾਰਨ ਚੱਕਰ',
  },
  todayNew: {
    en: '+128 Today',
    te: '+128 ఈరోజు',
    hi: '+128 आज नए',
    ta: '+128 இன்று',
    kn: '+128 ಇಂದು',
    mr: '+१२८ आज',
    bn: '+১২৮ আজ',
    gu: '+128 આજે',
    pa: '+128 ਅੱਜ',
  },
  directToBank: {
    en: 'Direct to Aadhaar Bank Acc.',
    te: 'నేరుగా ఆధార్ బ్యాంక్ ఖాతాకు',
    hi: 'सीधे आधार बैंक खाते में',
    ta: 'நேரடியாக ஆதார் வங்கி கணக்கில்',
    kn: 'ನೇರವಾಗಿ ಆಧಾರ್ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ',
    mr: 'थेट आधार बँक खात्यात',
    bn: 'সরাসরি আধার ব্যাংক অ্যাকাউন্টে',
    gu: 'સીધા આધાર બેંક ખાતામાં',
    pa: 'ਸਿੱਧਾ ਆਧਾਰ ਬੈਂਕ ਖਾਤੇ ਚ',
  },
  disbursalRate: {
    en: '94.2% Rate',
    te: '94.2% విడుదల రేటు',
    hi: '94.2% संवितरण दर',
    ta: '94.2% தீர்வு விகிதம்',
    kn: '94.2% ವಿತರಣಾ ದರ',
    mr: '९४.२% संवितरण दर',
    bn: '৯৪.২% বিতরণ হার',
    gu: '94.2% ચુકવણી દર',
    pa: '94.2% ਵੰਡ ਦਰ',
  },
  slaTarget: {
    en: 'Govt SLA Target: 48 Hours',
    te: 'ప్రభుత్వ SLA లక్ష్యం: 48 గంటలు',
    hi: 'सरकारी एसएलए लक्ष्य: 48 घंटे',
    ta: 'அரசு SLA இலக்கு: 48 மணிநேரம்',
    kn: 'ಸರ್ಕಾರಿ ಎಸ್‌ಎಲ್‌ಎ ಗುರಿ: 48 ಗಂಟೆಗಳು',
    mr: 'शासकीय SLA उद्दिष्ट: ४८ तास',
    bn: 'সরকারি এসএলএ লক্ষ্য: ৪৮ ঘণ্টা',
    gu: 'સરકારી SLA લક્ષ્ય: 48 કલાક',
    pa: 'ਸਰਕਾਰੀ SLA ਟੀਚਾ: 48 ਘੰਟੇ',
  },
  ekycBadge: {
    en: 'e-KYC Enabled',
    te: 'ఈ-కేవైసీ ధృవీకరించబడింది',
    hi: 'ई-केवाईसी सक्षम',
    ta: 'இ-கேஒய்சி இயக்கப்பட்டது',
    kn: 'ಇ-ಕೆವೈಸಿ ಸಕ್ರಿಯ',
    mr: 'ई-केवायसी सक्षम',
    bn: 'ই-কেওয়াইসি সক্রিয়',
    gu: 'ઇ-કેવાયસી સક્ષમ',
    pa: 'ਈ-ਕੇਵਾਈਸੀ ਸਮਰੱਥ',
  },
  passbookLabel: {
    en: 'Pattadar Passbook / Khata Number',
    te: 'పట్టాదారు పాస్‌బుక్ / ఖాతా సంఖ్య',
    hi: 'पट्टादार पासबुक / खाता संख्या',
    ta: 'பட்டாதாரர் பாஸ்புக் / கணக்கு எண்',
    kn: 'ಪಟ್ಟಾದಾರ ಪಾಸ್‌ಬುಕ್ / ಖಾತಾ ಸಂಖ್ಯೆ',
    mr: 'पट्टेदार पासबुक / खाते क्रमांक',
    bn: 'পাট্টাদার পাসবই / খতিয়ান নম্বর',
    gu: 'પટ્ટાદાર પાસબુક / ખાતા નંબર',
    pa: 'ਪੱਟੇਦਾਰ ਪਾਸਬੁੱਕ / ਖਾਤਾ ਨੰਬਰ',
  },
  districtLabel: {
    en: 'District Jurisdiction',
    te: 'జిల్లా అధికార పరిధి',
    hi: 'जिला क्षेत्राधिकार',
    ta: 'மாவட்ட அதிகார வரம்பு',
    kn: 'ಜಿಲ್ಲಾ ವ್ಯಾಪ್ತಿ',
    mr: 'जिल्हा कार्यक्षेत्र',
    bn: 'জেলা আওতাধীন এলাকা',
    gu: 'જિલ્લા અધિકાર ક્ષેત્ર',
    pa: 'ਜ਼ਿਲ੍ਹਾ ਅਧਿਕਾਰ ਖੇਤਰ',
  },
  mandalLabel: {
    en: 'Mandal Cluster',
    te: 'మండల క్లస్టర్',
    hi: 'मंडल क्लस्टर',
    ta: 'மண்டலப் பிரிவு',
    kn: 'ಮಂಡಲ ಕ್ಲಸ್ಟರ್',
    mr: 'मंडळ गट',
    bn: 'মন্ডল ক্লাস্টার',
    gu: 'મંડળ ક્લસ્ટર',
    pa: 'ਮੰਡਲ ਕਲੱਸਟਰ',
  },
  villageLabel: {
    en: 'Village / Habitation',
    te: 'గ్రామం / నివాస ప్రాంతం',
    hi: 'गाँव / बस्ती',
    ta: 'கிராமம் / வாழ்விடம்',
    kn: 'ಗ್ರಾಮ / ವಾಸಸ್ಥಳ',
    mr: 'गाव / वस्ती',
    bn: 'গ্রাম / জনবসতি',
    gu: 'ગામ / વસવાટ',
    pa: 'ਪਿੰਡ / ਬਸਤੀ',
  },
  cropStageLabel: {
    en: 'Current Phenological Stage',
    te: 'ప్రస్తుత పంట ఎదుగుదల దశ',
    hi: 'वर्तमान फसल अवस्था',
    ta: 'தற்போதைய பயிர் வளர்ச்சி நிலை',
    kn: 'ಪ್ರಸ್ತುತ ಬೆಳೆ ಹಂತ',
    mr: 'सध्याची पीक वाढ अवस्था',
    bn: 'বর্তমান ফসল বৃদ্ধির পর্যায়',
    gu: 'વર્તમાન પાક તબક્કો',
    pa: 'ਮੌਜੂਦਾ ਫ਼ਸਲੀ ਪੜਾਅ',
  },
  stages: {
    pod: {
      en: 'Pod / Fruit Maturation',
      te: 'కాయ / గింజ పక్వత దశ',
      hi: 'फली / फल परिपक्वता',
      ta: 'காய் / பழ முதிர்ச்சி நிலை',
      kn: 'ಕಾಯಿ / ಹಣ್ಣು ಪಕ್ವತೆಯ ಹಂತ',
      mr: 'शेंग / फळ परिपक्वता',
      bn: 'শুঁটি / ফল পরিপক্ক পর্যায়',
      gu: 'શીંગ / ફળ પરિપક્વતા',
      pa: 'ਫਲੀ / ਫਲ ਪੱਕਣ ਦਾ ਪੜਾਅ',
    },
    flower: {
      en: 'Flowering & Pollination',
      te: 'పూత & పరాగసంపర్క దశ',
      hi: 'फूल आना एवं परागण',
      ta: 'பூக்கும் & மகரந்தச் சேர்க்கை',
      kn: 'ಹೂಬಿಡುವ ಮತ್ತು ಪರಾಗಸ್ಪರ್ಶ ಹಂತ',
      mr: 'फुलोरा आणि परागीभवन',
      bn: 'ফুল ফোটা ও পরাগায়ন',
      gu: 'ફૂલ આવવા અને પરાગનયન',
      pa: 'ਫੁੱਲ ਪੈਣ ਅਤੇ ਪਰਾਗਣ',
    },
    vegetative: {
      en: 'Vegetative Canopy Growth',
      te: 'శాకీయ ఏపుగా పెరిగే దశ',
      hi: 'वानस्पतिक वृद्धि अवस्था',
      ta: 'தாவர வளர்ச்சி நிலை',
      kn: 'ಸಸ್ಯೀಯ ಬೆಳವಣಿಗೆಯ ಹಂತ',
      mr: 'शाकीय वाढीची अवस्था',
      bn: 'অঙ্গজ বৃদ্ধির পর্যায়',
      gu: 'વાનસ્પતિક વૃદ્ધિ તબક્કો',
      pa: 'ਬਨਸਪਤੀ ਵਾਧਾ ਪੜਾਅ',
    },
    preharvest: {
      en: 'Pre-Harvest Sheaf Stage',
      te: 'కోతకు ముందు దశ',
      hi: 'कटाई पूर्व अवस्था',
      ta: 'அறுவடைக்கு முந்தைய நிலை',
      kn: 'ಕೊಯ್ಲು ಪೂರ್ವ ಹಂತ',
      mr: 'कापणीपूर्व अवस्था',
      bn: 'ফসল তোলার আগের পর্যায়',
      gu: 'લણણી પૂર્વેનો તબક્કો',
      pa: 'ਵਾਢੀ ਤੋਂ ਪਹਿਲਾਂ ਦਾ ਪੜਾਅ',
    },
  },
  calamities: {
    rain: {
      en: 'Excessive Rainfall & Flooding (Canal / River Inundation)',
      te: 'భారీ వర్షాలు & వరదలు (కాలువ / నది మునక)',
      hi: 'अत्यधिक वर्षा एवं बाढ़ (नहर / नदी जलप्लावन)',
      ta: 'கடும் மழை & வெள்ளம் (கால்வாய் / நதி மூழ்குதல்)',
      kn: 'ಅತಿಯಾದ ಮಳೆ ಮತ್ತು ಪ್ರವಾಹ (ಕಾಲುವೆ / ನದಿ ನೀರು)',
      mr: 'अतिवृष्टी आणि पूर (कालवा / नदी पाणी भरणे)',
      bn: 'ভারী বৃষ্টিপাত ও বন্যা (খাল / নদীর জলপ্লাবন)',
      gu: 'અતિવૃષ્ટિ અને પૂર (કેનાલ / નદીના પાણી)',
      pa: 'ਭਾਰੀ ਬਾਰਸ਼ ਅਤੇ ਹੜ੍ਹ (ਨਹਿਰ / ਦਰਿਆ ਪਾਣੀ)',
    },
    pest: {
      en: 'Severe Pest / Thrips Outbreak (Leaf Curl / Root Rot)',
      te: 'తీవ్ర తెగుళ్లు / తామర పురుగు (ఆకుముడత / వేరుకుళ్లు)',
      hi: 'गंभीर कीट प्रकोप (पत्ती मरोड़ / जड़ सड़न)',
      ta: 'கடுமையான பூச்சி தாக்குதல் (இலை சுருட்டை / வேர் அழுகல்)',
      kn: 'ತೀವ್ರ ಕೀಟ ಬಾಧೆ (ಎಲೆ ಮುದುಡು / ಬೇರು ಕೊಳೆತ)',
      mr: 'तीव्र कीड / रोगाचा प्रादुर्भाव (चुरडा-मुरडा / मूळकुज)',
      bn: 'মারাত্মক পোকার আক্রমণ (পাতা কোঁকড়ানো / শিকড় পচা)',
      gu: 'તીવ્ર જીવાત ઉપદ્રવ (પાન કોકડાવું / મૂળનો સડો)',
      pa: 'ਗੰਭੀਰ ਕੀੜਿਆਂ ਦਾ ਹਮਲਾ (ਪੱਤਾ ਮਰੋੜ / ਜੜ੍ਹ ਗਲਣ)',
    },
    sluice: {
      en: 'Canal Sluice Water Delay / Irrigation Shutoff',
      te: 'కాలువ తూము నీటి ఆలస్యం / సాగునీటి నిలిపివేత',
      hi: 'नहर जल आपूर्ति में देरी / सिंचाई बंद',
      ta: 'கால்வாய் மதகு நீர் தாமதம் / பாசன நிறுத்தம்',
      kn: 'ಕಾಲುವೆ ನೀರು ವಿಳಂಬ / ನೀರಾವರಿ ಸ್ಥಗಿತ',
      mr: 'कालवा पाणी विलंबाने सुटणे / सिंचन बंद',
      bn: 'খালের জল সরবরাহে বিলম্ব / সেচ বন্ধ',
      gu: 'કેનાલ પાણીમાં વિલંબ / સિંચાઈ બંધ',
      pa: 'ਨਹਿਰੀ ਪਾਣੀ ਦੀ ਦੇਰੀ / ਸਿੰਚਾਈ ਬੰਦ',
    },
    spurious: {
      en: 'Spurious Seed / Ineffective Pesticide Lot',
      te: 'నకిలీ విత్తనాలు / నాణ్యతలేని పురుగుమందులు',
      hi: 'नकली बीज / अप्रभावी कीटनाशक लाट',
      ta: 'போலி விதைகள் / செயலற்ற பூச்சிக்கொல்லி',
      kn: 'ಕಳಪೆ ಬೀಜಗಳು / ಪರಿಣಾಮಕಾರಿಯಲ್ಲದ ಕೀಟನಾಶಕ',
      mr: 'बनावट बियाणे / निकृष्ट कीटकनाशके',
      bn: 'ভেজাল বীজ / অকার্যকর কীটনাশক',
      gu: 'નકલી બિયારણ / બિનઅસરકારક જંતુનાશક',
      pa: 'ਨਕਲੀ ਬੀਜ / ਬੇਅਸਰ ਕੀਟਨਾਸ਼ਕ',
    },
    hailstorm: {
      en: 'Unseasonal Hailstorm & Squall Wind Lodging',
      te: 'అకాల వడగళ్ల వాన & ఈదురు గాలుల నష్టం',
      hi: 'बेमौसम ओलावृष्टि एवं तेज आंधी से फसल गिरना',
      ta: 'பருவம் தவறிய ஆலங்கட்டி மழை & சூறாவளி காற்று',
      kn: 'ಅಕಾಲಿಕ ಆಲಿಕಲ್ಲು ಮಳೆ ಮತ್ತು ಬಿರುಗಾಳಿ ಹಾನಿ',
      mr: 'अवकाळी गारपीट आणि वादळी वाऱ्यामुळे नुकसान',
      bn: 'অসময়ের শিলাবৃষ্টি ও কালবৈশাখী ঝড়ে ক্ষতি',
      gu: 'કમોસમી કરા અને તોફાની પવનથી નુકસાન',
      pa: 'ਬੇਮੌਸਮੀ ਗੜੇਮਾਰੀ ਅਤੇ ਤੇਜ਼ ਝੱਖੜ',
    },
    drought: {
      en: 'Severe Drought / Soil Moisture Failure',
      te: 'తీవ్ర వర్షాభావం / భూమి తేమ కొరత',
      hi: 'गंभीर सूखा / मृदा नमी की कमी',
      ta: 'கடும் வறட்சி / மண் ஈரப்பதம் பற்றாக்குறை',
      kn: 'ತೀವ್ರ ಬರಗಾಲ / ಮಣ್ಣಿನ ತೇವಾಂಶ ಕೊರತೆ',
      mr: 'तीव्र दुष्काळ / जमिनीतील ओलावा नष्ट होणे',
      bn: 'মারাত্মক খরা / মাটির আর্দ্রতা অভাব',
      gu: 'ભારે દુષ્કાળ / જમીનમાં ભેજનો અભાવ',
      pa: 'ਗੰਭੀਰ ਸੋਕਾ / ਜ਼ਮੀਨੀ ਨਮੀ ਦੀ ਘਾਟ',
    },
  },
  acreageLost: {
    en: 'Acreage Lost',
    te: 'నష్టపోయిన విస్తీర్ణం',
    hi: 'क्षतिग्रस्त रकबा',
    ta: 'இழந்த பரப்பளவு',
    kn: 'ನಷ್ಟವಾದ ವಿಸ್ತೀರ್ಣ',
    mr: 'बाधित क्षेत्र',
    bn: 'ক্ষতিগ্রস্ত জমি',
    gu: 'નુકસાન પામેલ વિસ્તાર',
    pa: 'ਨੁਕਸਾਨਿਆ ਰਕਬਾ',
  },
  severity15: {
    en: '15% (Minor Spot Damage)',
    te: '15% (స్వల్ప నష్టం)',
    hi: '15% (मामूली नुकसान)',
    ta: '15% (குறைந்த சேதம்)',
    kn: '15% (ಸ್ವಲ್ಪ ಹಾನಿ)',
    mr: '१५% (किरकोळ नुकसान)',
    bn: '১৫% (সামান্য ক্ষতি)',
    gu: '15% (સામાન્ય નુકસાન)',
    pa: '15% (ਮਾਮੂਲੀ ਨੁਕਸਾਨ)',
  },
  severity50: {
    en: '50% (Substantial Loss)',
    te: '50% (గణనీయమైన నష్టం)',
    hi: '50% (पर्याप्त नुकसान)',
    ta: '50% (குறிப்பிடத்தக்க இழப்பு)',
    kn: '50% (ಗಮನಾರ್ಹ ನಷ್ಟ)',
    mr: '५०% (मोठे नुकसान)',
    bn: '৫০% (উল্লেখযোগ্য ক্ষতি)',
    gu: '50% (નોંધપાત્ર નુકસાન)',
    pa: '50% (ਕਾਫ਼ੀ ਨੁਕਸਾਨ)',
  },
  severity75: {
    en: '75%+ (Catastrophic Calamity)',
    te: '75%+ (తీవ్ర విపత్తు నష్టం)',
    hi: '75%+ (अति गंभीर क्षति)',
    ta: '75%+ (பேரிடர் சேதம்)',
    kn: '75%+ (ತೀವ್ರ ವಿಪತ್ತು ನಷ್ಟ)',
    mr: '७५%+ (अतिगंभीर आपत्ती)',
    bn: '৭৫%+ (চরম বিপর্যয়)',
    gu: '75%+ (ભારે હોનારત)',
    pa: '75%+ (ਭਾਰੀ ਤਬਾਹੀ)',
  },
  notesLabel: {
    en: 'Field Observations & Damage Description',
    te: 'క్షేత్ర పరిశీలనలు & నష్ట వివరణ',
    hi: 'खेत निरीक्षण एवं क्षति का विवरण',
    ta: 'களக் கண்காணிப்புகள் & சேத விவரம்',
    kn: 'ಕ್ಷೇತ್ರ ವೀಕ್ಷಣೆಗಳು ಮತ್ತು ಹಾನಿಯ ವಿವರಣೆ',
    mr: 'शेत निरीक्षण आणि नुकसानीचे तपशील',
    bn: 'ক্ষেত্রের পর্যবেক্ষণ ও ক্ষয়ক্ষতির বিবরণ',
    gu: 'ખેતર અવલોકનો અને નુકસાનની વિગત',
    pa: 'ਖੇਤੀ ਨਿਰੀਖਣ ਅਤੇ ਨੁਕਸਾਨ ਦਾ ਵੇਰਵਾ',
  },
  notesPlaceholder: {
    en: 'Provide specific field landmarks, affected survey acreage, canal reach, or date of calamity...',
    te: 'ల్యాండ్‌మార్కులు, సర్వే నంబర్లు, కాలువ వివరాలు లేదా విపత్తు సంభవించిన తేదీని పేర్కొనండి...',
    hi: 'विशिष्ट स्थल चिह्न, प्रभावित सर्वेक्षण रकबा, नहर खंड, या आपदा की तारीख बताएं...',
    ta: 'குறிப்பிட்ட அடையாளங்கள், பாதிக்கப்பட்ட நிலப்பரப்பு, கால்வாய் விவரம் குறிப்பிடவும்...',
    kn: 'ನಿರ್ದಿಷ್ಟ ಹೆಗ್ಗುರುತುಗಳು, ಬಾಧಿತ ಸರ್ವೆ ವಿಸ್ತೀರ್ಣ, ಕಾಲುವೆ ಮಾಹಿತಿ ನಮೂದಿಸಿ...',
    mr: 'महत्त्वाच्या खुणा, बाधित सर्व्हे क्षेत्र, कालवा माहिती किंवा आपत्तीची तारीख द्या...',
    bn: 'নির্দিষ্ট এলাকা চিহ্ন, ক্ষতিগ্রস্ত জমির পরিমাণ, খালের বিবরণ উল্লেখ করুন...',
    gu: 'ચોક્કસ સ્થળની ઓળખ, અસરગ્રસ્ત સર્વે નંબર, કેનાલની વિગત જણાવો...',
    pa: 'ਖੇਤ ਦੇ ਨਿਸ਼ਾਨ, ਪ੍ਰਭਾਵਿਤ ਰਕਬਾ, ਨਹਿਰ ਦਾ ਵੇਰਵਾ ਜਾਂ ਤਾਰੀਖ ਦਰਜ ਕਰੋ...',
  },
  evidenceTitle: {
    en: 'Tap to capture live field photo or upload documents',
    te: 'లైవ్ ఫోటో తీయడానికి లేదా పత్రాలు అప్‌లోడ్ చేయడానికి నొక్కండి',
    hi: 'लाइव फोटो खींचने या दस्तावेज़ अपलोड करने के लिए टैप करें',
    ta: 'நேரடி புகைப்படம் எடுக்க அல்லது ஆவணங்களை பதிவேற்ற தட்டவும்',
    kn: 'ಲೈವ್ ಫೋಟೋ ಸೆರೆಹಿಡಿಯಲು ಅಥವಾ ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    mr: 'थेट फोटो काढण्यासाठी किंवा कागदपत्रे अपलोड करण्यासाठी टॅप करा',
    bn: 'লাইভ ছবি তুলতে বা নথি আপলোড করতে ট্যাপ করুন',
    gu: 'લાઈવ ફોટો પાડવા અથવા દસ્તાવેજ અપલોડ કરવા ટેપ કરો',
    pa: 'ਲਾਈਵ ਫ਼ੋਟੋ ਲੈਣ ਜਾਂ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ',
  },
  evidenceSub: {
    en: 'Supports JPEG, PNG, PDF with automatic GPS metadata geotagging',
    te: 'ఆటోమేటిక్ GPS జియోట్యాగింగ్‌తో JPEG, PNG, PDF సపోర్ట్ చేస్తుంది',
    hi: 'स्वचालित जीपीएस जियोटैगिंग के साथ JPEG, PNG, PDF समर्थित',
    ta: 'தானியங்கி ஜிபிஎஸ் ஜியோடேக்கிங்குடன் JPEG, PNG, PDF ஐ ஆதரிக்கிறது',
    kn: 'ಸ್ವಯಂಚಾಲಿತ ಜಿಪಿಎಸ್ ಜಿಯೋಟ್ಯಾಗಿಂಗ್‌ನೊಂದಿಗೆ JPEG, PNG, PDF ಬೆಂಬಲ',
    mr: 'स्वयंचलित GPS जिओटॅगिंगसह JPEG, PNG, PDF समर्थित',
    bn: 'স্বয়ংক্রিয় জিপিএস জিওট্যাগিং সহ JPEG, PNG, PDF সমর্থিত',
    gu: 'સ્વચાલિત જીપીએસ જીઓટેગીંગ સાથે JPEG, PNG, PDF સપોર્ટેડ',
    pa: 'ਸਵੈਚਾਲਿਤ ਜੀਪੀਐਸ ਜੀਓਟੈਗਿੰਗ ਨਾਲ JPEG, PNG, PDF ਸਮਰਥਿਤ',
  },
  maxSize: {
    en: 'Max 10MB per file',
    te: 'ఫైల్ గరిష్ట పరిమాణం 10MB',
    hi: 'अधिकतम 10MB प्रति फ़ाइल',
    ta: 'ஒரு கோப்பிற்கு அதிகபட்சம் 10MB',
    kn: 'ಪ್ರತಿ ಫೈಲ್‌ಗೆ ಗರಿಷ್ಠ 10MB',
    mr: 'प्रति फाइल कमाल १०MB',
    bn: 'ফাইল প্রতি সর্বোচ্চ ১০MB',
    gu: 'ફાઇલ દીઠ મહત્તમ 10MB',
    pa: 'ਵੱਧ ਤੋਂ ਵੱਧ 10MB ਪ੍ਰਤੀ ਫ਼ਾਈਲ',
  },
  transmittingText: {
    en: 'Transmitting to Cadre Node...',
    te: 'క్యాడర్ నోడ్‌కు బదిలీ చేస్తోంది...',
    hi: 'कैडर नोड को भेजा जा रहा है...',
    ta: 'அலுவலர் முனைக்கு அனுப்பப்படுகிறது...',
    kn: 'ಕೇಡರ್ ನೋಡ್‌ಗೆ ರವಾನಿಸಲಾಗುತ್ತಿದೆ...',
    mr: 'केडर नोडला पाठवत आहे...',
    bn: 'ক্যাডার নোডে প্রেরণ করা হচ্ছে...',
    gu: 'કેડર નોડ પર મોકલી રહ્યા છીએ...',
    pa: 'ਕਾਡਰ ਨੋਡ ਨੂੰ ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ...',
  },
  clearFormBtn: {
    en: 'Clear Form',
    te: 'ఫారం క్లియర్ చేయండి',
    hi: 'फॉर्म खाली करें',
    ta: 'படிவத்தை அழிக்கவும்',
    kn: 'ಫಾರ್ಮ್ ಅಳಿಸಿ',
    mr: 'फॉर्म साफ करा',
    bn: 'ফর্ম খালি করুন',
    gu: 'ફોર્મ સાફ કરો',
    pa: 'ਫ਼ਾਰਮ ਸਾਫ਼ ਕਰੋ',
  },
  slaHeader: {
    en: 'Statutory 48h SLA Process',
    te: 'చట్టబద్ధమైన 48 గంటల SLA ప్రక్రియ',
    hi: 'वैधानिक 48 घंटे एसएलए प्रक्रिया',
    ta: 'சட்டப்பூர்வ 48 மணிநேர SLA செயல்முறை',
    kn: 'ಶಾಸನಬದ್ಧ 48 ಗಂಟೆಗಳ SLA ಪ್ರಕ್ರಿಯೆ',
    mr: 'वैधानिक ४८ तास SLA प्रक्रिया',
    bn: 'সংবিধিবদ্ধ ৪৮ ঘণ্টার এসএলএ প্রক্রিয়া',
    gu: 'વૈધાનિક 48 કલાક SLA પ્રક્રિયા',
    pa: 'ਕਾਨੂੰਨੀ 48 ਘੰਟੇ SLA ਪ੍ਰਕਿਰਿਆ',
  },
  slaSteps: [
    {
      title: {
        en: 'e-Crop Auto Verification',
        te: 'ఈ-పంట ఆటో వెరిఫికేషన్',
        hi: 'ई-क्रॉप स्वचालित सत्यापन',
        ta: 'இ-பயிர் தானியங்கி சரிபார்ப்பு',
        kn: 'ಇ-ಬೆಳೆ ಸ್ವಯಂಚಾಲಿತ ಪರಿಶೀಲನೆ',
        mr: 'ई-पीक स्वयंचलित पडताळणी',
        bn: 'ই-ফসল স্বয়ংক্রিয় যাচাই',
        gu: 'ઇ-ક્રોપ સ્વચાલિત ચકાસણી',
        pa: 'ਈ-ਫ਼ਸਲ ਸਵੈਚਾਲਿਤ ਪੜਤਾਲ',
      },
      desc: {
        en: 'Cross-matches survey number against agricultural database within 6 hours.',
        te: '6 గంటల్లో వ్యవసాయ డేటాబేస్‌తో సర్వే నంబర్‌ను సరిపోలుస్తుంది.',
        hi: '6 घंटे के भीतर कृषि डेटाबेस से सर्वे नंबर का मिलान किया जाता है।',
        ta: '6 மணி நேரத்திற்குள் சர்வே எண் வேளாண் தரவுத்தளத்துடன் ஒப்பிடப்படுகிறது.',
        kn: '6 ಗಂಟೆಗಳಲ್ಲಿ ಕೃಷಿ ದತ್ತಸಂಚಯದೊಂದಿಗೆ ಸರ್ವೆ ನಂಬರ್ ಪರಿಶೀಲನೆ.',
        mr: '६ तासांत कृषी डेटाबेसशी सर्व्हे नंबरची पडताळणी होते.',
        bn: '৬ ঘণ্টার মধ্যে কৃষি ডেটাবেসের সাথে সার্ভে নম্বর মেলানো হয়।',
        gu: '6 કલાકમાં કૃષિ ડેટાબેઝ સાથે સર્વે નંબરની ચકાસણી.',
        pa: '6 ਘੰਟਿਆਂ ਦੇ ਅੰਦਰ ਖੇਤੀ ਡਾਟਾਬੇਸ ਨਾਲ ਸਰਵੇ ਨੰਬਰ ਮਿਲਾਇਆ ਜਾਂਦਾ ਹੈ।',
      },
    },
    {
      title: {
        en: 'MAO Spot Geotagged Survey',
        te: 'MAO స్పాట్ జియోట్యాగ్ సర్వే',
        hi: 'एमएओ स्थल जियोटैग सर्वेक्षण',
        ta: 'MAO நேரடி கள ஆய்வு',
        kn: 'ಎಂಎಒ ಸ್ಥಳೀಯ ಜಿಯೋಟ್ಯಾಗ್ ಸಮೀಕ್ಷೆ',
        mr: 'MAO प्रत्यक्ष स्थळ पाहणी',
        bn: 'এমএও স্পট জিওট্যাগড সমীক্ষা',
        gu: 'MAO સ્થળ જીઓટેગ સર્વેક્ષણ',
        pa: 'ਐਮਏਓ ਸਪੌਟ ਜੀਓਟੈਗਡ ਸਰਵੇਖਣ',
      },
      desc: {
        en: 'Local Mandal Officer visits field within 24 hours to record photographic & soil metrics.',
        te: 'మండల అధికారి 24 గంటల్లో క్షేత్రాన్ని సందర్శించి ఫోటోలు & నేల వివరాలు నమోదు చేస్తారు.',
        hi: 'मंडल कृषि अधिकारी 24 घंटे में खेत का दौरा कर फोटो और मिट्टी रिपोर्ट दर्ज करते हैं।',
        ta: 'மண்டல அதிகாரி 24 மணி நேரத்திற்குள் புகைப்படங்கள் மற்றும் மண் தரவை பதிவு செய்கிறார்.',
        kn: 'ಮಂಡಲ ಅಧಿಕಾರಿ 24 ಗಂಟೆಗಳಲ್ಲಿ ಭೇಟಿ ನೀಡಿ ಫೋಟೋ ಮತ್ತು ಮಣ್ಣಿನ ವರದಿ ದಾಖಲಿಸುತ್ತಾರೆ.',
        mr: 'मंडळ अधिकारी २४ तासांत भेट देऊन फोटो व मातीचे निकष नोंदवतात.',
        bn: 'মন্ডল কর্মকর্তা ২৪ ঘণ্টার মধ্যে সরেজমিনে গিয়ে ছবি ও মাটির তথ্য সংগ্রহ করেন।',
        gu: 'મંડળ અધિકારી 24 કલાકમાં મુલાકાત લઈ ફોટો અને માટીના અહેવાલ નોંધે છે.',
        pa: 'ਮੰਡਲ ਅਧਿਕਾਰੀ 24 ਘੰਟਿਆਂ ਚ ਖੇਤ ਜਾ ਕੇ ਫ਼ੋਟੋ ਤੇ ਮਿੱਟੀ ਦੇ ਨਮੂਨੇ ਦਰਜ ਕਰਦਾ ਹੈ।',
      },
    },
    {
      title: {
        en: 'DAO Cadre Sanction',
        te: 'DAO క్యాడర్ ఆమోదం',
        hi: 'डीएओ संवर्ग स्वीकृति',
        ta: 'DAO அலுவலர் ஒப்புதல்',
        kn: 'ಡಿಎಒ ಕೇಡರ್ ಮಂಜೂರಾತಿ',
        mr: 'DAO प्रशासकीय मंजुरी',
        bn: 'ডিএও ক্যাডার অনুমোদন',
        gu: 'DAO કેડર મંજૂરી',
        pa: 'ਡੀਏਓ ਕਾਡਰ ਮਨਜ਼ੂਰੀ',
      },
      desc: {
        en: 'DAO reviews loss quotient and approves Direct Benefit Transfer (DBT) sanction.',
        te: 'జిల్లా అధికారి నష్టాన్ని సమీక్షించి డీబీటీ పరిహారాన్ని ఆమోదిస్తారు.',
        hi: 'जिला कृषि अधिकारी क्षति का आकलन कर डीबीटी राहत राशि स्वीकृत करते हैं।',
        ta: 'மாவட்ட அதிகாரி இழப்பை மதிப்பாய்வு செய்து டிபிடி நிவாரணத்தை ஒப்புதல் அளிக்கிறார்.',
        kn: 'ಜಿಲ್ಲಾ ಅಧಿಕಾರಿಗಳು ನಷ್ಟ ಪರಿಶೀಲಿಸಿ ಡಿಬಿಟಿ ಪರಿಹಾರ ಮಂಜೂರು ಮಾಡುತ್ತಾರೆ.',
        mr: 'जिल्हा अधिकारी नुकसान तपासून डीबीटी मदत मंजूर करतात.',
        bn: 'ডিএও ক্ষয়ক্ষতি পর্যালোচনা করে ডিবিটি ত্রাণ অনুমোদন করেন।',
        gu: 'DAO નુકસાનની સમીક્ષા કરી ડીબીટી રાહત મંજૂર કરે છે.',
        pa: 'ਡੀਏਓ ਨੁਕਸਾਨ ਦੀ ਸਮੀਖਿਆ ਕਰਕੇ ਡੀਬੀਟੀ ਮੁਆਵਜ਼ਾ ਮਨਜ਼ੂਰ ਕਰਦਾ ਹੈ।',
      },
    },
    {
      title: {
        en: 'Treasury DBT Disbursal',
        te: 'ట్రెజరీ DBT విడుదల',
        hi: 'ट्रेजरी डीबीटी संवितरण',
        ta: 'கருவூல டிபிடி பட்டுவாடா',
        kn: 'ಖಜಾನೆ ಡಿಬಿಟಿ ವಿತರಣೆ',
        mr: 'तिजोरीतून थेट डीबीटी वितरण',
        bn: 'ট্রেজারি ডিবিটি বিতরণ',
        gu: 'ટ્રેઝરી ડીબીટી ચુકવણી',
        pa: 'ਖ਼ਜ਼ਾਨਾ ਡੀਬੀਟੀ ਵੰਡ',
      },
      desc: {
        en: 'Relief fund credited directly to farmer’s bank within 48 statutory hours.',
        te: 'పరిహార నిధులు 48 గంటల్లో నేరుగా రైతు బ్యాంక్ ఖాతాలో జమ చేయబడతాయి.',
        hi: 'राहत राशि 48 वैधानिक घंटों के भीतर सीधे किसान के बैंक खाते में जमा होती है।',
        ta: 'நிவாரண நிதி 48 மணி நேரத்திற்குள் நேரடியாக வங்கி கணக்கில் வரவு வைக்கப்படுகிறது.',
        kn: '48 ಗಂಟೆಗಳ ಒಳಗೆ ನೇರವಾಗಿ ರೈತರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಪರಿಹಾರ ಹಣ ಜಮಾ.',
        mr: '४८ तासांच्या आत थेट शेतकऱ्याच्या बँक खात्यात रक्कम जमा केली जाते.',
        bn: '৪৮ ঘণ্টার মধ্যে সরাসরি কৃষকের ব্যাংক অ্যাকাউন্টে অনুদান জমা হয়।',
        gu: '48 કલાકમાં સીધા ખેડૂતના બેંક ખાતામાં રાહત રકમ જમા.',
        pa: '48 ਘੰਟਿਆਂ ਦੇ ਅੰਦਰ ਮੁਆਵਜ਼ਾ ਸਿੱਧਾ ਕਿਸਾਨ ਦੇ ਬੈਂਕ ਖਾਤੇ ਚ ਜਮ੍ਹਾਂ ਹੁੰਦਾ ਹੈ।',
      },
    },
  ],
  tollFreeTitle: {
    en: 'Kisan Call Center & Grievance Desk',
    te: 'కిసాన్ కాల్ సెంటర్ & ఫిర్యాదుల డెస్క్',
    hi: 'किसान कॉल सेंटर एवं शिकायत निवारण पटल',
    ta: 'கிசான் கால் சென்டர் & குறைதீர்ப்பு உதவி மையம்',
    kn: 'ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್ ಮತ್ತು ಕುಂದುಕೊರತೆ ಡೆಸ್ಕ್',
    mr: 'किसान कॉल सेंटर आणि तक्रार निवारण कक्ष',
    bn: 'কিষাণ কল সেন্টার ও অভিযোগ কেন্দ্র',
    gu: 'કિસાન કોલ સેન્ટર અને ફરિયાદ ડેસ્ક',
    pa: 'ਕਿਸਾਨ ਕਾਲ ਸੈਂਟਰ ਅਤੇ ਸ਼ਿਕਾਇਤ ਡੈਸਕ',
  },
  tollFreeDesc: {
    en: 'Toll-free telephone assistance operating 24x7 in multiple Indian languages for farmers needing assistance filing petitions:',
    te: 'పిటిషన్లు దాఖలు చేయడంలో సహాయం కావాల్సిన రైతుల కోసం 24x7 బహుళ భారతీయ భాషలలో ఉచిత సహాయం:',
    hi: 'याचिका दर्ज करने में सहायता चाहने वाले किसानों के लिए 24x7 कई भारतीय भाषाओं में निःशुल्क सहायता:',
    ta: 'மனு தாக்கல் செய்ய உதவி தேவைப்படும் விவசாயிகளுக்கு 24x7 பல இந்திய மொழிகளில் கட்டணமில்லா உதவி:',
    kn: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಹಾಯ ಅಗತ್ಯವಿರುವ ರೈತರಿಗೆ 24x7 ಬಹು ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಉಚಿತ ಕರೆ ಸೌಲಭ್ಯ:',
    mr: 'अर्ज दाखल करण्यासाठी शेतकऱ्यांसाठी २४x७ मोफत दूरध्वनी मदत:',
    bn: 'আবেদন জানাতে সহায়তার জন্য কৃষকদের ২৪x৭ একাধিক ভারতীয় ভাষায় টোল-ফ্রি টেলিফোন সহায়তা:',
    gu: 'અરજી દાખલ કરવામાં સહાય મેળવવા માટે 24x7 વિવિધ ભારતીય ભાષાઓમાં ટોલ-ફ્રી ટેલિફોન સહાય:',
    pa: 'ਅਰਜ਼ੀ ਦਾਖਲ ਕਰਨ ਚ ਮਦਦ ਲਈ ਕਿਸਾਨਾਂ ਵਾਸਤੇ 24x7 ਕਈ ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਚ ਮੁਫ਼ਤ ਟੈਲੀਫ਼ੋਨ ਸਹਾਇਤਾ:',
  },
  freeCallNotice: {
    en: 'Free call from all mobile operators',
    te: 'అన్ని మొబైల్ నెట్‌వర్క్‌ల నుండి ఉచిత కాల్',
    hi: 'सभी मोबाइल नेटवर्क से निःशुल्क कॉल',
    ta: 'அனைத்து மொபைல் நெட்வொர்க்குகளிலிருந்தும் இலவச அழைப்பு',
    kn: 'ಎಲ್ಲಾ ಮೊಬೈಲ್ ನೆಟ್‌ವರ್ಕ್‌ಗಳಿಂದ ಉಚಿತ ಕರೆ',
    mr: 'सर्व मोबाइल नेटवर्कवरून मोफत कॉल',
    bn: 'সব মোবাইল নেটওয়ার্ক থেকে সম্পূর্ণ বিনামূল্যে কল',
    gu: 'તમામ મોબાઈલ નેટવર્ક પરથી મફત કૉલ',
    pa: 'ਸਾਰੇ ਮੋਬਾਈਲ ਨੈੱਟਵਰਕਾਂ ਤੋਂ ਮੁਫ਼ਤ ਕਾਲ',
  },
  trackSub: {
    en: 'Enter your grievance acknowledgment token or Aadhaar number to view real-time satellite inspection and statutory officer approvals.',
    te: 'రియల్ టైమ్ ఉపగ్రహ తనిఖీ మరియు అధికారిక ఆమోదాలను చూడటానికి మీ టోకెన్ లేదా ఆధార్ నంబర్‌ను నమోదు చేయండి.',
    hi: 'उपग्रह निरीक्षण और अधिकारी अनुमोदन देखने के लिए अपना टोकन या आधार नंबर दर्ज करें।',
    ta: 'நேரடி செயற்கைக்கோள் ஆய்வு மற்றும் அதிகாரி ஒப்புதல்களைப் பார்க்க உங்கள் டோக்கன் அல்லது ஆதார் எண்ணை உள்ளிடவும்.',
    kn: 'ನೈಜ-ಸಮಯದ ಉಪಗ್ರಹ ಪರಿಶೀಲನೆ ಮತ್ತು ಅಧಿಕೃತ ಅನುಮೋದನೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ನಿಮ್ಮ ಟೋಕನ್ ಅಥವಾ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.',
    mr: 'थेट उपग्रह पाहणी आणि अधिकारी मंजुरी तपासण्यासाठी तुमचा टोकन किंवा आधार क्रमांक प्रविष्ट करा.',
    bn: 'রিয়েল-টাইম স্যাটেলাইট পরিদর্শন এবং অফিসার অনুমোদন দেখতে আপনার টোকেন বা আধার নম্বর লিখুন।',
    gu: 'સેટેલાઇટ નિરીક્ષણ અને સત્તાવાર મંજૂરી જોવા માટે તમારો ટોકન અથવા આધાર નંબર દાખલ કરો.',
    pa: 'ਲਾਈਵ ਸੈਟੇਲਾਈਟ ਨਿਰੀਖਣ ਅਤੇ ਸਰਕਾਰੀ ਪ੍ਰਵਾਨਗੀ ਦੇਖਣ ਲਈ ਆਪਣਾ ਟੋਕਨ ਜਾਂ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ।',
  },
  trackBtn: {
    en: 'Track Now',
    te: 'ఇప్పుడే తనిఖీ చేయండి',
    hi: 'स्थिति जांचें',
    ta: 'தற்போது கண்காணிக்கவும்',
    kn: 'ಈಗಲೇ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    mr: 'आताच तपासा',
    bn: 'এখনই ট্র্যাক করুন',
    gu: 'ટ્રેક કરો',
    pa: 'ਹੁਣੇ ਟਰੈਕ ਕਰੋ',
  },
  quickTokens: {
    en: 'Quick Sample Tokens:',
    te: 'నమూనా టోకెన్లు:',
    hi: 'त्वरित नमूना टोकन:',
    ta: 'மாதிரி டோக்கன்கள்:',
    kn: 'ಮಾದರಿ ಟೋಕನ್‌ಗಳು:',
    mr: 'नमुना टोकन्स:',
    bn: 'নমুনা টোকেন:',
    gu: 'નમૂના ટોકન:',
    pa: 'ਨਮੂਨਾ ਟੋਕਨ:',
  },
  reliefAssessment: {
    en: 'RELIEF ASSESSMENT',
    te: 'మదింపు చేసిన పరిహారం',
    hi: 'राहत मूल्यांकन',
    ta: 'நிவாரண மதிப்பீடு',
    kn: 'ಪರಿಹಾರ ಅಂದಾಜು',
    mr: 'नुकसानभरपाई मूल्यांकन',
    bn: 'ত্রাণ মূল্যায়ন',
    gu: 'રાહત આકારણી',
    pa: 'ਮੁਆਵਜ਼ਾ ਮੁਲਾਂਕਣ',
  },
  milestonesTitle: {
    en: 'Statutory 48-Hour SLA Redressal Milestones',
    te: 'చట్టబద్ధమైన 48 గంటల SLA పరిష్కార మైలురాళ్లు',
    hi: 'वैधानिक 48 घंटे एसएलए निवारण चरण',
    ta: 'சட்டப்பூர்வ 48 மணிநேர SLA தீர்வு மைல்கற்கள்',
    kn: 'ಶಾಸನಬದ್ಧ 48 ಗಂಟೆಗಳ SLA ಪರಿಹಾರ ಮೈಲಿಗಲ್ಲುಗಳು',
    mr: 'वैधानिक ४८ तास SLA टप्पे',
    bn: 'সংবিধিবদ্ধ ৪৮ ঘণ্টার এসএলএ নিষ্পত্তির মাইলফলক',
    gu: 'વૈધાનિક 48 કલાક SLA નિવારણ તબક્કા',
    pa: 'ਕਾਨੂੰਨੀ 48 ਘੰਟੇ SLA ਨਿਵਾਰਨ ਪੜਾਅ',
  },
  reportedCause: {
    en: 'Reported Cause:',
    te: 'నమోదైన కారణం:',
    hi: 'दर्ज कारण:',
    ta: 'பதிவு செய்யப்பட்ட காரணம்:',
    kn: 'ವರದಿ ಮಾಡಲಾದ ಕಾರಣ:',
    mr: 'नोंदवलेले कारण:',
    bn: 'প্রতিবেদিত কারণ:',
    gu: 'નોંધાયેલ કારણ:',
    pa: 'ਦਰਜ ਕਾਰਨ:',
  },
  viewFieldReportBtn: {
    en: 'View Geotagged Field Report',
    te: 'జియోట్యాగ్ క్షేత్ర నివేదిక చూడండి',
    hi: 'जियोटैग फील्ड रिपोर्ट देखें',
    ta: 'கள அறிக்கையைப் பார்க்கவும்',
    kn: 'ಕ್ಷೇತ್ರ ವರದಿ ವೀಕ್ಷಿಸಿ',
    mr: 'जिओटॅग शेत अहवाल पहा',
    bn: 'জিওট্যাগড ফিল্ড রিপোর্ট দেখুন',
    gu: 'જીઓટેગ ખેતર અહેવાલ જુઓ',
    pa: 'ਜੀਓਟੈਗਡ ਫੀਲਡ ਰਿਪੋਰਟ ਦੇਖੋ',
  },
  downloadPdfBtn: {
    en: 'Download PDF Receipt',
    te: 'పీడీఎఫ్ రసీదు డౌన్‌లోడ్',
    hi: 'पीडीएफ रसीद डाउनलोड करें',
    ta: 'PDF ரசீதை பதிவிறக்கவும்',
    kn: 'ಪಿಡಿಎಫ್ ರಶೀದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
    mr: 'पीडीएफ पावती डाउनलोड करा',
    bn: 'পিডিএফ রসিদ ডাউনলোড করুন',
    gu: 'પીડીએફ રસીદ ડાઉનલોડ કરો',
    pa: 'ਪੀਡੀਐਫ ਰਸੀਦ ਡਾਊਨਲੋਡ ਕਰੋ',
  },
  searchLedgerPlaceholder: {
    en: 'Search by token, farmer name, mandal, or crop...',
    te: 'టోకెన్, రైతు పేరు, మండలం లేదా పంట ద్వారా శోధించండి...',
    hi: 'टोकन, किसान का नाम, मंडल या फसल द्वारा खोजें...',
    ta: 'டோக்கன், விவசாயி பெயர், மண்டலம் அல்லது பயிர் மூலம் தேடவும்...',
    kn: 'ಟೋಕನ್, ರೈತರ ಹೆಸರು, ಮಂಡಲ ಅಥವಾ ಬೆಳೆ ಮೂಲಕ ಹುಡುಕಿ...',
    mr: 'टोकन, शेतकरी नाव, मंडळ किंवा पिकाद्वारे शोधा...',
    bn: 'টোকেন, কৃষকের নাম, মন্ডল বা ফসল দিয়ে খুঁজুন...',
    gu: 'ટોકન, ખેડૂતનું નામ, મંડળ અથવા પાક દ્વારા શોધો...',
    pa: 'ਟੋਕਨ, ਕਿਸਾਨ ਦਾ ਨਾਮ, ਮੰਡਲ ਜਾਂ ਫ਼ਸਲ ਰਾਹੀਂ ਖੋਜੋ...',
  },
  catAll: {
    en: 'Category: All',
    te: 'వర్గం: అన్నీ',
    hi: 'श्रेणी: सभी',
    ta: 'பிரிவு: அனைத்தும்',
    kn: 'ವರ್ಗ: ಎಲ್ಲವೂ',
    mr: 'प्रवर्ग: सर्व',
    bn: 'বিভাগ: সব',
    gu: 'શ્રેણી: તમામ',
    pa: 'ਸ਼੍ਰੇਣੀ: ਸਾਰੇ',
  },
  distAll: {
    en: 'All Districts',
    te: 'అన్ని జిల్లాలు',
    hi: 'सभी जिले',
    ta: 'அனைத்து மாவட்டங்கள்',
    kn: 'ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು',
    mr: 'सर्व जिल्हे',
    bn: 'সব জেলা',
    gu: 'તમામ જિલ્લા',
    pa: 'ਸਾਰੇ ਜ਼ਿਲ੍ਹੇ',
  },
  fieldOfficerLabel: {
    en: 'Field Officer:',
    te: 'క్షేత్ర అధికారి:',
    hi: 'क्षेत्रीय अधिकारी:',
    ta: 'கள அதிகாரி:',
    kn: 'ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿ:',
    mr: 'क्षेत्रीय अधिकारी:',
    bn: 'ক্ষেত্র কর্মকর্তা:',
    gu: 'ક્ષેત્ર અધિકારી:',
    pa: 'ਖੇਤਰੀ ਅਧਿਕਾਰੀ:',
  },
  filedDateLabel: {
    en: 'Filed Date:',
    te: 'నమోదు తేదీ:',
    hi: 'आवेदन तिथि:',
    ta: 'தாக்கல் செய்த தேதி:',
    kn: 'ದಾಖಲಿಸಿದ ದಿನಾಂಕ:',
    mr: 'नोंदणी तारीख:',
    bn: 'আবেদনের তারিখ:',
    gu: 'દાખલ તારીખ:',
    pa: 'ਦਰਜ ਤਾਰੀਖ:',
  },
  trackSlaBtn: {
    en: 'Track SLA',
    te: 'SLA ట్రాక్ చేయండి',
    hi: 'स्थिति देखें',
    ta: 'கண்காணிக்கவும்',
    kn: 'ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    mr: 'तपासा',
    bn: 'ট্র্যাক করুন',
    gu: 'ટ્રેક કરો',
    pa: 'ਟਰੈਕ ਕਰੋ',
  },
  ms1Title: {
    en: 'Petition Registered',
    te: 'పిటిషన్ నమోదైంది',
    hi: 'याचिका पंजीकृत',
    ta: 'மனு பதிவு செய்யப்பட்டது',
    kn: 'ಅರ್ಜಿ ದಾಖಲಾಗಿದೆ',
    mr: 'अर्ज नोंदणीकृत',
    bn: 'আবেদন নথিভুক্ত',
    gu: 'અરજી નોંધાઈ',
    pa: 'ਅਰਜ਼ੀ ਦਰਜ ਕੀਤੀ ਗਈ',
  },
  ms2Title: {
    en: 'Satellite e-Crop Match',
    te: 'ఉపగ్రహ ఈ-క్రాప్ ధృవీకరణ',
    hi: 'उपग्रह ई-क्रॉप मिलान',
    ta: 'செயற்கைக்கோள் இ-பயிர் பொருத்தம்',
    kn: 'ಉಪಗ್ರಹ ಇ-ಬೆಳೆ ತಾಳೆ',
    mr: 'उपग्रह ई-पीक जुळवणी',
    bn: 'স্যাটেলাইট ই-ফসল যাচাই',
    gu: 'સેટેલાઇટ ઇ-ક્રોપ ચકાસણી',
    pa: 'ਸੈਟੇਲਾਈਟ ਈ-ਫ਼ਸਲ ਮਿਲਾਨ',
  },
  ms3Title: {
    en: 'MAO Spot Geotag',
    te: 'MAO క్షేత్ర జియోట్యాగ్',
    hi: 'एमएओ स्थल जियोटैग',
    ta: 'MAO கள ஆய்வு ஜியோடேக்',
    kn: 'ಎಂಎಒ ಸ್ಥಳ ಜಿಯೋಟ್ಯಾಗ್',
    mr: 'एमएओ प्रत्यक्ष पाहणी जिओटॅग',
    bn: 'এমএও স্পট জিওট্যাগ',
    gu: 'MAO સ્થળ જીઓટેગ',
    pa: 'ਐਮਏਓ ਸਪਾਟ ਜੀਓਟੈਗ',
  },
  ms4Title: {
    en: 'DAO Sanction',
    te: 'DAO అనుమతి / మంజూరు',
    hi: 'डीएओ संस्वीकृति',
    ta: 'DAO அனுமதி ஒப்புதல்',
    kn: 'ಡಿಎಒ ಮಂಜೂರಾತಿ',
    mr: 'डीएओ मंजुरी',
    bn: 'ডিএও অনুমোদন',
    gu: 'DAO મંજૂરી',
    pa: 'ਡੀਏਓ ਪ੍ਰਵਾਨਗੀ',
  },
  ms5Title: {
    en: 'DBT Disbursal',
    te: 'DBT ఖాతాకు జమ',
    hi: 'डीबीटी वितरण',
    ta: 'நேரடி பணப்பரிமாற்றம்',
    kn: 'ಡಿಬಿಟಿ ನೇರ ವರ್ಗಾವಣೆ',
    mr: 'डीबीटी वाटप',
    bn: 'ডিবিটি বিতরণ',
    gu: 'ડીબીટી ચૂકવણી',
    pa: 'ਡੀਬੀਟੀ ਵੰਡ',
  },
  cropLossLabel: {
    en: 'Crop',
    te: 'పంట',
    hi: 'फसल',
    ta: 'பயிர்',
    kn: 'ಬೆಳೆ',
    mr: 'पीक',
    bn: 'ফসল',
    gu: 'પાક',
    pa: 'ਫ਼ਸਲ',
  },
  lossSuffix: {
    en: 'Loss',
    te: 'నష్టం',
    hi: 'नुकसान',
    ta: 'சேதம்',
    kn: 'ನಷ್ಟ',
    mr: 'नुकसान',
    bn: 'ক্ষতি',
    gu: 'નુકસાન',
    pa: 'ਨੁਕਸਾਨ',
  },
  viewFieldReportShort: {
    en: 'View Field Report',
    te: 'క్షేత్ర నివేదిక చూడండి',
    hi: 'फील्ड रिपोर्ट देखें',
    ta: 'கள அறிக்கை பார்க்கவும்',
    kn: 'ಕ್ಷೇತ್ರ ವರದಿ ನೋಡಿ',
    mr: 'शेत अहवाल पहा',
    bn: 'ফিল্ড রিপোর্ট দেখুন',
    gu: 'ખેતર અહેવાલ જુઓ',
    pa: 'ਫੀਲਡ ਰਿਪੋਰਟ ਦੇਖੋ',
  },
};

export const GrievancesScreen: React.FC<GrievancesScreenProps> = ({
  showToast,
  onNavigateToOfficerHub,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'lodge' | 'track' | 'ledger'>('lodge');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');

  // Lodge Grievance Form State
  const [farmerName, setFarmerName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [passbookNo, setPassbookNo] = useState('');
  const [district, setDistrict] = useState('Kurnool');
  const [mandal, setMandal] = useState('Nandyal Rural');
  const [village, setVillage] = useState('Panyam');
  const [crop, setCrop] = useState('Guntur Red Chilli');
  const [cropStage, setCropStage] = useState('Pod / Fruit Maturation');
  const [damageCause, setDamageCause] = useState('Excessive Rainfall & Flooding');
  const [lossPercent, setLossPercent] = useState<number>(65);
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('APGB0002144');
  const [notes, setNotes] = useState('');
  const [declarationAgreed, setDeclarationAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Track Ticket State
  const [trackTokenInput, setTrackTokenInput] = useState('');
  const [searchedTicket, setSearchedTicket] = useState<GrievanceCardItem | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Grievances filed during this visit (source for the public ledger list)
  const [sessionGrievances, setSessionGrievances] = useState<GrievanceCardItem[]>([]);

  // Modals
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    token: string;
    farmerName: string;
    crop: string;
    mandal: string;
    lossPercent: number;
    reliefEst: string;
    time: string;
  } | null>(null);
  const [activeInspectionReport, setActiveInspectionReport] = useState<GrievanceCardItem | null>(null);

  // Multilingual Grievances Database
  // Grievances are backed by the real API:
  // - POST /grievance      → lodge form submission
  // - GET /grievance/{id}  → tracking (this tab + the quick tokens below)
  // The public ledger lists grievances filed during this visit (the full
  // officer/admin list lives behind the Bearer-protected officer endpoints).
  const grievanceList = sessionGrievances;

  const STATUS_DISPLAY: Record<
    GrievanceOut['status'],
    { en: string; bg: string; text: string }
  > = {
    new: { en: 'Verification Pending', bg: 'bg-amber-50', text: 'text-amber-800' },
    seen: { en: 'Seen by Officer', bg: 'bg-sky-50', text: 'text-sky-800' },
    in_progress: { en: 'Inspection Scheduled', bg: 'bg-indigo-50', text: 'text-indigo-800' },
    resolved: { en: 'Approved & Disbursed', bg: 'bg-emerald-50', text: 'text-[#007432]' },
  };

  // Maps a real backend GrievanceOut into the display card shape.
  const buildTicket = (out: GrievanceOut): GrievanceCardItem => {
    const st = STATUS_DISPLAY[out.status] ?? STATUS_DISPLAY.new;
    const localizedStatus: Record<string, string> = {
      en: st.en,
      te: st.en,
      hi: st.en,
      ta: st.en,
      kn: st.en,
      mr: st.en,
      bn: st.en,
      gu: st.en,
      pa: st.en,
    };
    return {
      id: out.grievance_id,
      token: out.grievance_id,
      categoryTag: { en: 'GRIEVANCE' },
      categoryTagBg: 'bg-[#dcfce7]',
      categoryTagText: 'text-[#15803d]',
      status: localizedStatus,
      statusBg: st.bg,
      statusText: st.text,
      farmerName: out.name || '—',
      village: out.village || '—',
      mandal: '—',
      district: '—',
      cropName: { en: '—' },
      cropImage: '',
      damageCause: { en: out.problem },
      lossPercent: 0,
      reliefAmount: out.status === 'resolved' ? 'Relief processed' : '—',
      assignedOfficer: 'Mandal Agriculture Officer',
      officerDesignation: 'Department of Agriculture',
      filedDate: new Date(out.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      slaRemaining:
        out.updated_at !== out.created_at
          ? `Last update: ${new Date(out.updated_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`
          : 'Awaiting first officer update (48h SLA)',
      gpsCoords: '—',
      aadhaarMasked: '—',
    };
  };

  const trackGrievance = async (grievanceId: string) => {
    const cleanId = grievanceId.trim();
    if (!cleanId) return;
    setIsTracking(true);
    setTrackError(null);
    try {
      const out = await getGrievance(cleanId);
      const ticket = buildTicket(out);
      setSearchedTicket(ticket);
      showToast(
        `Grievance ${out.grievance_id.slice(0, 8)}… status: ${out.status.toUpperCase()}`
      );
    } catch (err) {
      setSearchedTicket(null);
      if (err instanceof ApiError && err.status === 404) {
        setTrackError(`No grievance found for ID ${cleanId}`);
      } else {
        setTrackError(
          err instanceof ApiError
            ? err.message
            : 'Backend not reachable (is it running on port 8000?)'
        );
      }
    } finally {
      setIsTracking(false);
    }
  };

  const handleSubmitGrievance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName.trim() || !aadhaar.trim() || !mobile.trim()) {
      showToast('Please provide Farmer Name, Aadhaar and Mobile Number.');
      return;
    }
    setIsSubmitting(true);
    void (async () => {
      try {
        const problem = [
          `Crop: ${crop}`,
          `Crop stage: ${cropStage}`,
          `Cause: ${damageCause}`,
          `Estimated loss: ${lossPercent}%`,
          notes.trim() ? `Field notes: ${notes.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        const created = await createGrievance({
          problem,
          name: farmerName.trim(),
          village: [village, mandal, district].filter(Boolean).join(', '),
          phone: mobile.trim(),
        });

        const out = await getGrievance(created.grievance_id);
        const ticket = buildTicket(out);
        setSessionGrievances((prev) => [ticket, ...prev]);

        const estCompensation = `₹ ${Math.round(
          (lossPercent / 100) * 45000
        ).toLocaleString('en-IN')}`;
        setSubmittedReceipt({
          token: created.grievance_id,
          farmerName,
          crop,
          mandal: `${mandal}, ${district}`,
          lossPercent,
          reliefEst: estCompensation,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        showToast(`${t.grievance_title}: ${created.grievance_id}`);
      } catch (err) {
        const detail =
          err instanceof ApiError
            ? err.message
            : 'Backend not reachable (is it running on port 8000?)';
        showToast(`Grievance could not be filed: ${detail}`);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleTrackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void trackGrievance(trackTokenInput);
  };
  const filteredGrievances = grievanceList.filter((item) => {
    const query = searchQuery.toLowerCase();
    const curCrop = item.cropName[language] || item.cropName.en;
    const curCat = item.categoryTag[language] || item.categoryTag.en;
    const matchesQuery =
      item.token.toLowerCase().includes(query) ||
      item.farmerName.toLowerCase().includes(query) ||
      curCrop.toLowerCase().includes(query) ||
      item.mandal.toLowerCase().includes(query) ||
      item.village.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategory === 'All' || curCat.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesDistrict =
      selectedDistrict === 'All Districts' || item.district.toLowerCase() === selectedDistrict.toLowerCase();
    return matchesQuery && matchesCategory && matchesDistrict;
  });

  return (
    <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Title Card */}
      <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 sm:p-9 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/80 text-[11px] font-bold text-[#006b2c] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse"></span>
          <span>{t.grievance_badge}</span>
        </div>
        <h1 className="text-[34px] sm:text-[44px] font-bold text-[#111827] tracking-tight leading-tight">
          {t.grievance_title}
        </h1>
        <p className="text-[14px] sm:text-[15px] text-[#4b5563] max-w-3xl leading-relaxed">
          {t.grievance_subtitle}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {t.grievance_kpi_total}
              </span>
              <h4 className="text-[18px] font-bold text-[#111827] leading-tight tabular-nums">
                18,420 Petitions
              </h4>
              <p className="text-[11.5px] text-gray-500">{gI18n.seasonCycle[language] || gI18n.seasonCycle.en}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11.5px] font-bold">
              {gI18n.todayNew[language] || gI18n.todayNew.en}
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {t.grievance_kpi_disbursed}
              </span>
              <h4 className="text-[18px] font-bold text-[#111827] leading-tight tabular-nums">
                ₹ 42.85 Crores
              </h4>
              <p className="text-[11.5px] text-gray-500">{gI18n.directToBank[language] || gI18n.directToBank.en}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11.5px] font-bold">
              {gI18n.disbursalRate[language] || gI18n.disbursalRate.en}
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">timer</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {t.grievance_kpi_time}
              </span>
              <h4 className="text-[18px] font-bold text-[#111827] leading-tight tabular-nums">
                36.4 Hours
              </h4>
              <p className="text-[11.5px] text-[#15803d] font-bold">{gI18n.slaTarget[language] || gI18n.slaTarget.en}</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#e8f8eb] border border-white flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006b2c] animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full bg-white/75 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/60 p-2 sm:p-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('lodge')}
            className={`px-5 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lodge'
                ? 'bg-[#007432] text-white shadow-xs'
                : 'bg-white/60 hover:bg-white text-[#374151]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">edit_document</span>
            <span>{t.grievance_tab_lodge}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('track');
            }}
            className={`px-5 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'track'
                ? 'bg-[#007432] text-white shadow-xs'
                : 'bg-white/60 hover:bg-white text-[#374151]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">track_changes</span>
            <span>{t.grievance_tab_track}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-5 py-2 rounded-full text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-[#007432] text-white shadow-xs'
                : 'bg-white/60 hover:bg-white text-[#374151]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">table_chart</span>
            <span>{t.grievance_tab_ledger} ({grievanceList.length})</span>
          </button>
        </div>

        {onNavigateToOfficerHub && (
          <button
            type="button"
            onClick={onNavigateToOfficerHub}
            className="text-[12px] font-bold text-[#006b2c] hover:underline flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>{t.nav_officer_hub}</span>
          </button>
        )}
      </div>

      {activeTab === 'lodge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-200/60 pb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-bold text-[#111827]">
                  {t.grievance_form_title}
                </h2>
                <p className="text-[13px] text-[#4b5563] mt-0.5">
                  {t.grievance_form_subtitle}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#006b2c] border border-emerald-200 text-[11px] font-bold">
                {gI18n.ekycBadge[language] || gI18n.ekycBadge.en}
              </span>
            </div>

            <form onSubmit={handleSubmitGrievance} className="space-y-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-white/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-[#006b2c]">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#111827]">
                    {t.grievance_sec1_title}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_farmer_name}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kondareddy Venkat Reddy"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13.5px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_aadhaar}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      placeholder="XXXX-XXXX-XXXX"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13.5px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_mobile}
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98XXXXXXXX"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13.5px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {gI18n.passbookLabel[language] || gI18n.passbookLabel.en}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KHT-2026-81729"
                      value={passbookNo}
                      onChange={(e) => setPassbookNo(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13.5px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-white/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-[#006b2c]">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#111827]">
                    {t.grievance_sec2_title}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {gI18n.districtLabel[language] || gI18n.districtLabel.en}
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432] cursor-pointer"
                    >
                      <option value="Kurnool">Kurnool (Rayalaseema)</option>
                      <option value="Guntur">Guntur (Coastal Belt)</option>
                      <option value="Anantapur">Anantapur</option>
                      <option value="Palnadu">Palnadu</option>
                      <option value="Prakasam">Prakasam</option>
                      <option value="West Godavari">West Godavari</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {gI18n.mandalLabel[language] || gI18n.mandalLabel.en}
                    </label>
                    <select
                      value={mandal}
                      onChange={(e) => setMandal(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432] cursor-pointer"
                    >
                      <option value="Nandyal Rural">Nandyal Rural</option>
                      <option value="Tenali Command">Tenali Command</option>
                      <option value="Dhone Mandal">Dhone Mandal</option>
                      <option value="Kadiri Mandi Belt">Kadiri Mandi Belt</option>
                      <option value="Palnadu Belt">Palnadu Belt</option>
                      <option value="Markapur Taluk">Markapur Taluk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {gI18n.villageLabel[language] || gI18n.villageLabel.en}
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_crop_loss}
                    </label>
                    <select
                      value={crop}
                      onChange={(e) => setCrop(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432] cursor-pointer"
                    >
                      <option value="Guntur Red Chilli">Guntur Red Chilli (Mirchi)</option>
                      <option value="Groundnut / Peanuts">Groundnut / Peanuts (Kadiri-6 / Dharani)</option>
                      <option value="Paddy BPT 5204">Paddy Rice (Sona Masoori BPT 5204)</option>
                      <option value="Bt Cotton (Kapas)">Bt Cotton (Medium Staple)</option>
                      <option value="Bengal Gram (Chana)">Bengal Gram (Desi Variety)</option>
                      <option value="Yellow Corn (Maize)">Yellow Corn (Maize Hybrid)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {gI18n.cropStageLabel[language] || gI18n.cropStageLabel.en}
                    </label>
                    <select
                      value={cropStage}
                      onChange={(e) => setCropStage(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432] cursor-pointer"
                    >
                      <option value="Pod / Fruit Maturation">{gI18n.stages.pod[language] || gI18n.stages.pod.en}</option>
                      <option value="Flowering & Pollination">{gI18n.stages.flower[language] || gI18n.stages.flower.en}</option>
                      <option value="Vegetative Canopy Growth">{gI18n.stages.vegetative[language] || gI18n.stages.vegetative.en}</option>
                      <option value="Pre-Harvest Sheaf Stage">{gI18n.stages.preharvest[language] || gI18n.stages.preharvest.en}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-white/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-[#006b2c]">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#111827]">
                    {t.grievance_sec3_title}
                  </h3>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                    {t.grievance_calamity_cause}
                  </label>
                  <select
                    value={damageCause}
                    onChange={(e) => setDamageCause(e.target.value)}
                    className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432] cursor-pointer"
                  >
                    <option value="Excessive Rainfall & Flooding">{gI18n.calamities.rain[language] || gI18n.calamities.rain.en}</option>
                    <option value="Severe Pest / Thrips Outbreak">{gI18n.calamities.pest[language] || gI18n.calamities.pest.en}</option>
                    <option value="Canal Sluice Water Delay">{gI18n.calamities.sluice[language] || gI18n.calamities.sluice.en}</option>
                    <option value="Spurious Seed / Pesticide Lot">{gI18n.calamities.spurious[language] || gI18n.calamities.spurious.en}</option>
                    <option value="Unseasonal Hailstorm & Wind">{gI18n.calamities.hailstorm[language] || gI18n.calamities.hailstorm.en}</option>
                    <option value="Severe Drought / Soil Moisture Failure">{gI18n.calamities.drought[language] || gI18n.calamities.drought.en}</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#111827]">
                      {t.grievance_loss_slider}
                    </span>
                    <span
                      className={`text-[15px] font-extrabold px-3 py-0.5 rounded-full ${
                        lossPercent >= 70
                          ? 'bg-red-100 text-red-700'
                          : lossPercent >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {lossPercent}% {gI18n.acreageLost[language] || gI18n.acreageLost.en}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={lossPercent}
                    onChange={(e) => setLossPercent(Number(e.target.value))}
                    className="w-full accent-[#007432] h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                    <span>{gI18n.severity15[language] || gI18n.severity15.en}</span>
                    <span>{gI18n.severity50[language] || gI18n.severity50.en}</span>
                    <span>{gI18n.severity75[language] || gI18n.severity75.en}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                    {gI18n.notesLabel[language] || gI18n.notesLabel.en}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={gI18n.notesPlaceholder[language] || gI18n.notesPlaceholder.en}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-white/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-[#006b2c]">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#111827]">
                    {t.grievance_sec4_title}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_bank_acc}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 308910029318"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#374151] mb-1.5">
                      {t.grievance_ifsc}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. APGB0002144 / SBIN0000843"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full h-11 px-4 rounded-full bg-emerald-50/60 border border-emerald-200/70 text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007432]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-white/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#006b2c]">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#111827]">
                      {t.grievance_sec5_title}
                    </h3>
                  </div>
                  <span className="text-[11.5px] text-gray-500">{gI18n.maxSize[language] || gI18n.maxSize.en}</span>
                </div>

                <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-5 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#007432] flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                  </div>
                  <p className="text-[13px] font-bold text-[#111827]">
                    {gI18n.evidenceTitle[language] || gI18n.evidenceTitle.en}
                  </p>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    {gI18n.evidenceSub[language] || gI18n.evidenceSub.en}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPhotos((prev) => [
                        ...prev,
                        'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
                      ]);
                      showToast('Attached field evidence photo with GPS tag.');
                    }}
                    className="mt-3 px-5 py-2 rounded-full bg-[#132a1e] hover:bg-black text-white font-semibold text-[12px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Attach Evidence Photo</span>
                  </button>
                </div>

                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center gap-3 pt-2">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-300 shadow-2xs">
                        <img src={photo} alt="Evidence" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center font-mono py-0.5">
                          GPS Tagged
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="declaration"
                  checked={declarationAgreed}
                  onChange={(e) => setDeclarationAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#007432] focus:ring-[#007432] cursor-pointer"
                />
                <label htmlFor="declaration" className="text-[12px] text-gray-600 leading-snug cursor-pointer">
                  {t.grievance_declaration}
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !declarationAgreed}
                  className="w-full sm:flex-1 py-3.5 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{isSubmitting ? (gI18n.transmittingText[language] || gI18n.transmittingText.en) : t.grievance_submit_btn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFarmerName('');
                    setAadhaar('');
                    setMobile('');
                    setNotes('');
                    showToast('Form cleared.');
                  }}
                  className="px-6 py-3.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[13px] transition-colors cursor-pointer"
                >
                  {gI18n.clearFormBtn[language] || gI18n.clearFormBtn.en}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#006b2c] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                </div>
                <h3 className="text-[16px] font-bold text-[#111827]">
                  {gI18n.slaHeader[language] || gI18n.slaHeader.en}
                </h3>
              </div>
              <div className="space-y-3.5 text-[12.5px] text-gray-700">
                {gI18n.slaSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#007432] text-white flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <strong className="text-[#111827] block">
                        {step.title[language] || step.title.en}
                      </strong>
                      <span>
                        {step.desc[language] || step.desc.en}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 space-y-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {t.schemes_btn_call_help || 'TOLL-FREE SUPPORT'}
              </span>
              <h4 className="text-[17px] font-bold text-[#111827] leading-snug">
                {gI18n.tollFreeTitle[language] || gI18n.tollFreeTitle.en}
              </h4>
              <p className="text-[12.5px] text-gray-600">
                {gI18n.tollFreeDesc[language] || gI18n.tollFreeDesc.en}
              </p>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[20px] font-extrabold text-[#006b2c] tracking-wider block font-mono">
                  1800-180-1551
                </span>
                <span className="text-[11px] text-emerald-900 font-medium">
                  {gI18n.freeCallNotice[language] || gI18n.freeCallNotice.en}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'track' && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 sm:p-9 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-bold text-[#111827]">
              {t.grievance_tab_track}
            </h2>
            <p className="text-[13.5px] text-[#4b5563] mt-1">
              Enter your grievance acknowledgment token or Aadhaar number to view real-time satellite inspection and
              statutory officer approvals.
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[19px]">
                search
              </span>
              <input
                type="text"
                value={trackTokenInput}
                onChange={(e) => setTrackTokenInput(e.target.value)}
                placeholder="e.g. AP-PV-8842 or AP-PV-5120"
                className="w-full h-11 pl-10 pr-4 rounded-full bg-white/90 border border-gray-200 text-[13.5px] text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#007432]"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
            >
              Track Now
            </button>
          </form>

          {isTracking && (
            <div className="flex items-center gap-2 max-w-xl p-4 rounded-2xl bg-white/90 border border-gray-200 shadow-xs text-[12.5px] font-bold text-[#374151]">
              <span className="w-4 h-4 rounded-full border-2 border-[#007432] border-t-transparent animate-spin"></span>
              <span>Checking the backend for your grievance...</span>
            </div>
          )}
          {!isTracking && trackError && (
            <div className="flex items-center gap-2 max-w-xl p-4 rounded-2xl bg-[#fff5f5] border border-red-200 shadow-xs text-[12.5px] font-bold text-[#b91c1c]">
              <span className="material-symbols-outlined text-[18px]">report</span>
              <span>{trackError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-gray-600">
            <span className="font-semibold">
              {sessionGrievances.length > 0
                ? 'Your grievance IDs this visit:'
                : 'Paste the grievance ID from your acknowledgment to track:'}
            </span>
            {grievanceList.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTrackTokenInput(item.token);
                  void trackGrievance(item.token);
                }}
                className="px-3 py-1 rounded-full bg-white/90 hover:bg-emerald-100 border border-gray-200 text-[#007432] font-mono font-bold cursor-pointer transition-colors"
              >
                {item.token} ({item.status[language] || item.status.en})
              </button>
            ))}
          </div>

          {searchedTicket && (
            <div className="mt-6 border-t border-gray-200/60 pt-6 space-y-6">
              <div className="p-5 rounded-2xl bg-white/90 border border-white/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">                  <div className="flex items-center gap-4">
                  {searchedTicket.cropImage ? (
                    <img
                      src={searchedTicket.cropImage}
                      alt={searchedTicket.cropName[language] || searchedTicket.cropName.en}
                      className="w-14 h-14 rounded-2xl object-cover border border-emerald-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#eef7ee] border border-emerald-300 shadow-2xs flex items-center justify-center">
                      <span className="material-symbols-outlined text-[26px] text-[#006b2c]">nature</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[17px] text-[#111827]">
                        {searchedTicket.token}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${searchedTicket.statusBg} ${searchedTicket.statusText}`}
                      >
                        {searchedTicket.status[language] || searchedTicket.status.en}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-600">
                      <strong>{searchedTicket.farmerName}</strong> • {searchedTicket.village}, {searchedTicket.mandal} (
                      {searchedTicket.district})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    {gI18n.reliefAssessment[language] || gI18n.reliefAssessment.en}
                  </span>
                  <span className="text-[17px] font-extrabold text-[#007432] block">
                    {searchedTicket.reliefAmount}
                  </span>
                  <span className="text-[11px] text-gray-500">{searchedTicket.slaRemaining}</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/90 border border-white/90 shadow-2xs space-y-4">
                <h3 className="text-[15px] font-bold text-[#111827]">
                  {gI18n.milestonesTitle[language] || gI18n.milestonesTitle.en}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-[#007432] text-white text-[10px] font-bold flex items-center justify-center">
                        ✓
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800">T+0h</span>
                    </div>
                    <h4 className="text-[12px] font-bold text-[#111827]">{gI18n.ms1Title[language] || gI18n.ms1Title.en}</h4>
                    <p className="text-[11px] text-gray-600">SMS token dispatched to {searchedTicket.aadhaarMasked}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-[#007432] text-white text-[10px] font-bold flex items-center justify-center">
                        ✓
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800">T+6h</span>
                    </div>
                    <h4 className="text-[12px] font-bold text-[#111827]">{gI18n.ms2Title[language] || gI18n.ms2Title.en}</h4>
                    <p className="text-[11px] text-gray-600">Geofence verified at {searchedTicket.gpsCoords}</p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl space-y-1 ${
                      searchedTicket.status.en === 'Inspection Scheduled'
                        ? 'bg-amber-50 border border-amber-300'
                        : 'bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          searchedTicket.status.en === 'Inspection Scheduled'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-[#007432] text-white'
                        }`}
                      >
                        {searchedTicket.status.en === 'Inspection Scheduled' ? '3' : '✓'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-700">T+24h</span>
                    </div>
                    <h4 className="text-[12px] font-bold text-[#111827]">{gI18n.ms3Title[language] || gI18n.ms3Title.en}</h4>
                    <p className="text-[11px] text-gray-600">Assigned: {searchedTicket.assignedOfficer}</p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl space-y-1 ${
                      searchedTicket.status.en === 'Cadre Review'
                        ? 'bg-indigo-50 border border-indigo-300'
                        : searchedTicket.status.en === 'Approved & Disbursed'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-gray-50 border border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          searchedTicket.status.en === 'Approved & Disbursed'
                            ? 'bg-[#007432] text-white'
                            : searchedTicket.status.en === 'Cadre Review'
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {searchedTicket.status.en === 'Approved & Disbursed' ? '✓' : '4'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-700">T+36h</span>
                    </div>
                    <h4 className="text-[12px] font-bold text-[#111827]">{gI18n.ms4Title[language] || gI18n.ms4Title.en}</h4>
                    <p className="text-[11px] text-gray-600">Relief computation approved</p>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl space-y-1 ${
                      searchedTicket.status.en === 'Approved & Disbursed'
                        ? 'bg-emerald-100 border border-emerald-300'
                        : 'bg-gray-50 border border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          searchedTicket.status.en === 'Approved & Disbursed'
                            ? 'bg-[#007432] text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {searchedTicket.status.en === 'Approved & Disbursed' ? '✓' : '5'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-700">T+48h</span>
                    </div>
                    <h4 className="text-[12px] font-bold text-[#111827]">{gI18n.ms5Title[language] || gI18n.ms5Title.en}</h4>
                    <p className="text-[11px] text-gray-600">Treasury release to bank</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-[12px] text-gray-600">
                    <strong>{gI18n.reportedCause[language] || gI18n.reportedCause.en}</strong> {searchedTicket.damageCause[language] || searchedTicket.damageCause.en}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveInspectionReport(searchedTicket)}
                      className="px-4 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#007432] font-semibold text-[12px] border border-emerald-200 cursor-pointer"
                    >
                      {gI18n.viewFieldReportBtn[language] || gI18n.viewFieldReportBtn.en}
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast(`Downloaded Praja Vani Certificate for ${searchedTicket.token}`)}
                      className="px-4 py-1.5 rounded-full bg-[#132a1e] hover:bg-black text-white font-semibold text-[12px] cursor-pointer"
                    >
                      {gI18n.downloadPdfBtn[language] || gI18n.downloadPdfBtn.en}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-5">
          <div className="w-full bg-white/75 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/60 p-2 sm:p-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full pl-2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[19px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={gI18n.searchLedgerPlaceholder[language] || gI18n.searchLedgerPlaceholder.en}
                className="w-full h-10 pl-9 pr-4 rounded-full bg-transparent text-[13px] text-[#111827] placeholder:text-[#6b7280] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pr-1">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 px-3.5 pr-8 rounded-full bg-white/90 text-[12px] font-semibold text-[#1f2937] border border-white/80 shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#007432]"
                >
                  <option value="All">{gI18n.catAll[language] || gI18n.catAll.en}</option>
                  <option value="CROP INUNDATION">Crop Inundation</option>
                  <option value="PEST OUTBREAK">Pest Outbreak</option>
                  <option value="CANAL SLUICE BREACH">Canal Sluice Breach</option>
                  <option value="SPURIOUS SEEDS">Spurious Seeds</option>
                </select>
                <span className="material-symbols-outlined text-[16px] text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="h-9 px-3.5 pr-8 rounded-full bg-white/90 text-[12px] font-semibold text-[#1f2937] border border-white/80 shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#007432]"
                >
                  <option value="All Districts">{gI18n.distAll[language] || gI18n.distAll.en}</option>
                  <option value="Kurnool">Kurnool</option>
                  <option value="Guntur">Guntur</option>
                  <option value="Anantapur">Anantapur</option>
                  <option value="Palnadu">Palnadu</option>
                </select>
                <span className="material-symbols-outlined text-[16px] text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGrievances.map((item) => {
              const curCat = item.categoryTag[language] || item.categoryTag.en;
              const curStatus = item.status[language] || item.status.en;
              const curCrop = item.cropName[language] || item.cropName.en;
              const curDamage = item.damageCause[language] || item.damageCause.en;
              return (
                <div
                  key={item.id}
                  className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${item.categoryTagBg} ${item.categoryTagText} shadow-2xs`}
                      >
                        {curCat}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.statusBg} ${item.statusText} shadow-2xs`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{curStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      {item.cropImage ? (
                        <img
                          src={item.cropImage}
                          alt={curCrop}
                          className="w-12 h-12 rounded-2xl object-cover border border-emerald-200 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#eef7ee] border border-emerald-200 shadow-2xs shrink-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[22px] text-[#006b2c]">nature</span>
                        </div>
                      )}
                      <div>
                        <span className="font-mono text-[11.5px] font-bold text-[#007432] block">
                          {item.token}
                        </span>
                        <h3 className="text-[16px] font-bold text-[#111827] leading-snug">
                          {item.farmerName}
                        </h3>
                        <p className="text-[12px] text-gray-500">
                          {item.village}, {item.mandal}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-[12.5px] space-y-1 mb-4">
                      <div className="flex justify-between items-center text-[#111827] font-semibold">
                        <span>{gI18n.cropLossLabel[language] || gI18n.cropLossLabel.en}: {curCrop}</span>
                        <span className="text-red-700 font-bold">{item.lossPercent}% {gI18n.lossSuffix[language] || gI18n.lossSuffix.en}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed">
                        {curDamage}
                      </p>
                    </div>

                    <div className="space-y-1 text-[12px] text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{gI18n.reliefAssessment[language] || gI18n.reliefAssessment.en}:</span>
                        <strong className="text-[#007432] font-mono">{item.reliefAmount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{gI18n.fieldOfficerLabel[language] || gI18n.fieldOfficerLabel.en}</span>
                        <span className="text-gray-800 font-medium">{item.assignedOfficer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{gI18n.filedDateLabel[language] || gI18n.filedDateLabel.en}</span>
                        <span className="text-gray-700">{item.filedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveInspectionReport(item)}
                      className="flex-1 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#007432] font-semibold text-[12px] text-center transition-colors cursor-pointer"
                    >
                      {gI18n.viewFieldReportShort[language] || gI18n.viewFieldReportShort.en}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackTokenInput(item.token);
                        setSearchedTicket(item);
                        setActiveTab('track');
                        showToast(`Navigated to timeline for ${item.token}`);
                      }}
                      className="flex-1 py-2 rounded-full bg-[#132a1e] hover:bg-black text-white font-semibold text-[12px] text-center transition-colors cursor-pointer"
                    >
                      {gI18n.trackSlaBtn[language] || gI18n.trackSlaBtn.en}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Submission Success Receipt */}
      {submittedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#007432] mx-auto flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold text-[#007432] uppercase tracking-wider">
                PRAJA VANI • GRIEVANCE REDRESSAL 2026
              </span>
              <h2 className="text-[22px] font-bold text-[#111827]">
                Grievance Formally Registered
              </h2>
              <p className="text-[13px] text-gray-600">
                Token generated and queued directly into the Command Ledger.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                STATUTORY ACKNOWLEDGMENT TOKEN
              </span>
              <span className="text-[24px] font-mono font-extrabold text-[#111827] tracking-wider block">
                {submittedReceipt.token}
              </span>
              <div className="text-[12px] text-emerald-900 grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/70">
                <div>
                  <span className="text-gray-500 block">Farmer:</span>
                  <strong>{submittedReceipt.farmerName}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Crop &amp; Loss:</span>
                  <strong>
                    {submittedReceipt.crop} ({submittedReceipt.lossPercent}%)
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Mandal:</span>
                  <strong>{submittedReceipt.mandal}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Est. Relief:</span>
                  <strong className="text-[#007432]">{submittedReceipt.reliefEst}</strong>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-gray-500 text-center leading-relaxed">
              Statutory 48-Hour SLA timeline active. Field inspection alert has been transmitted to Mandal Agriculture
              Officer (MAO) via mobile dispatch.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const receiptToken = submittedReceipt.token;
                  setSubmittedReceipt(null);
                  setTrackTokenInput(receiptToken);
                  setActiveTab('track');
                  void trackGrievance(receiptToken);
                }}
                className="flex-1 py-3 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[13px] text-center cursor-pointer shadow-xs"
              >
                Track SLA Live
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Downloaded official Praja Vani token slip.');
                  setSubmittedReceipt(null);
                }}
                className="px-5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[13px] cursor-pointer"
              >
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Geotagged Field Report */}
      {activeInspectionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#007432] uppercase tracking-wider block">
                  GEOTAGGED AUDIT DOSSIER 2026
                </span>
                <h3 className="text-[20px] font-bold text-[#111827]">
                  Field Inspection Report: {activeInspectionReport.token}
                </h3>
                <p className="text-[12.5px] text-gray-500">
                  {activeInspectionReport.farmerName} • {activeInspectionReport.village},{' '}
                  {activeInspectionReport.mandal}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInspectionReport(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-gray-200 max-h-56 bg-[#eef7ee] flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-[#006b2c]">nature</span>
              <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-black/75 text-white text-[11px] font-mono backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>GPS: {activeInspectionReport.gpsCoords}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned Inspecting Cadre:</span>
                <strong className="text-[#111827]">{activeInspectionReport.assignedOfficer}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Officer Designation:</span>
                <span className="text-gray-800">{activeInspectionReport.officerDesignation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Satellite Remote Sensing Match:</span>
                <span className="text-emerald-800 font-bold">100% Polygon Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Relief Sanction Recommendation:</span>
                <strong className="text-[#007432]">{activeInspectionReport.reliefAmount}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[12px] text-gray-700 space-y-1">
              <strong className="text-[#111827] block">Field Remarks:</strong>
              <p>{activeInspectionReport.damageCause[language] || activeInspectionReport.damageCause.en}</p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  showToast(`Downloaded verified audit packet for ${activeInspectionReport.token}`);
                  setActiveInspectionReport(null);
                }}
                className="flex-1 py-3 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[13px] cursor-pointer"
              >
                Download Signed Audit Packet
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectionReport(null)}
                className="px-5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[13px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
