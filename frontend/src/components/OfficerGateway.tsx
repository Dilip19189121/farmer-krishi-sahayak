import React, { useState, useEffect } from 'react';
import { ApiError, officerLogin, setOfficerToken } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

interface OfficerGatewayProps {
  onAuthorizeSuccess: () => void;
  onNavigate: (path: string) => void;
  showToast: (msg: string) => void;
}

export const OfficerGateway: React.FC<OfficerGatewayProps> = ({
  onAuthorizeSuccess,
  showToast,
}) => {
  const { t, language } = useLanguage();
  const [cadreId, setCadreId] = useState('DAO-2026-8849');
  const [jurisdiction, setJurisdiction] = useState('central-command');
  const [password, setPassword] = useState('DAO#2026SecureCommand');
  const [showPassword, setShowPassword] = useState(false);
  const [auth2fa, setAuth2fa] = useState<'aadhaar' | 'nic-token'>('aadhaar');
  const [rememberTerminal, setRememberTerminal] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [istTime, setIstTime] = useState('07:34:43 IST');

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      setIstTime(now.toLocaleTimeString('en-GB', options) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Comprehensive Multilingual Dictionary for Officer Gateway
  const i18n = {
    topGov: {
      en: 'Ministry of Agriculture • National Command Gateway',
      te: 'వ్యవసాయ మంత్రిత్వ శాఖ • జాతీయ కమాండ్ గేట్‌వే',
      hi: 'कृषि मंत्रालय • राष्ट्रीय कमान पोर्टल',
      ta: 'விவசாய அமைச்சகம் • தேசிய கட்டுப்பாட்டு நுழைவாயில்',
      kn: 'ಕೃಷಿ ಸಚಿವಾಲಯ • ರಾಷ್ಟ್ರೀಯ ಕಮಾಂಡ್ ಗೇಟ್‌ವೇ',
      mr: 'कृषी मंत्रालय • राष्ट्रीय कमांड गेटवे',
      bn: 'কৃষি মন্ত্রক • জাতীয় কমান্ড গেটওয়ে',
      gu: 'કૃષિ મંત્રાલય • રાષ્ટ્રીય કમાન્ડ ગેટવે',
      pa: 'ਖੇਤੀਬਾੜੀ ਮੰਤਰਾਲਾ • ਰਾਸ਼ਟਰੀ ਕਮਾਂਡ ਗੇਟਵੇ',
    },
    ssl: {
      en: 'SSL 256-Bit Encrypted',
      te: 'SSL 256-బిట్ ఎన్‌క్రిప్టెడ్',
      hi: 'SSL 256-बिट एन्क्रिप्टेड',
      ta: 'SSL 256-பிட் குறியாக்கம்',
      kn: 'SSL 256-ಬಿಟ್ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿದೆ',
      mr: 'SSL 256-बिट सुरक्षित',
      bn: 'SSL ২৫৬-বিট এনক্রিপ্ট করা',
      gu: 'SSL 256-બીટ એન્ક્રિપ્ટેડ',
      pa: 'SSL 256-ਬਿੱਟ ਐਨਕ੍ਰਿਪਟਡ',
    },
    nicGate: {
      en: 'NIC / Praja Vani Integrated Gate',
      te: 'NIC / ప్రజా వాణి అనుసంధానిత గేట్',
      hi: 'एनआईसी / प्रजा वाणी एकीकृत गेटवे',
      ta: 'NIC / பிரஜா வாணி ஒருங்கிணைந்த நுழைவு',
      kn: 'ಎನ್‌ಐಸಿ / ಪ್ರಜಾ ವಾಣಿ ಸಂಯೋಜಿತ ಗೇಟ್',
      mr: 'NIC / प्रजा वाणी एकात्मिक गेट',
      bn: 'এনআইসি / প্রজা বাণী সমন্বিত গেট',
      gu: 'NIC / પ્રજા વાણી સંકલિત ગેટ',
      pa: 'ਐਨਆਈਸੀ / ਪ੍ਰਜਾ ਵਾਣੀ ਏਕੀਕ੍ਰਿਤ ਗੇਟ',
    },
    cadreNode: {
      en: 'Agrinet Cadre Node',
      te: 'అగ్రినెట్ క్యాడర్ నోడ్',
      hi: 'एग्रीनेट संवर्ग नोड',
      ta: 'அக்ரிநெட் அலுவலர் முனை',
      kn: 'ಅಗ್ರಿನೆಟ್ ಕೇಡರ್ ನೋಡ್',
      mr: 'अॅग्रीनेट केडर नोड',
      bn: 'অ্যাগ্রিনেট ক্যাডার নোড',
      gu: 'એગ્રીનેટ કેડર નોડ',
      pa: 'ਐਗਰੀਨੈੱਟ ਕਾਡਰ ਨੋਡ',
    },
    level4: {
      en: 'Level 4 Restrict',
      te: 'లెవల్ 4 రక్షిత జోన్',
      hi: 'स्तर 4 प्रतिबंधित',
      ta: 'நிலை 4 கட்டுப்பாடு',
      kn: 'ಹಂತ 4 ನಿರ್ಬಂಧಿತ',
      mr: 'स्तर ४ प्रतिबंधित',
      bn: 'লেভেল ৪ সুরক্ষিত',
      gu: 'લેવલ 4 પ્રતિબંધિત',
      pa: 'ਲੈਵਲ 4 ਸੁਰੱਖਿਅਤ',
    },
    brief: {
      en: 'Officer Command Brief',
      te: 'అధికారుల కార్యాచరణ సమాచారం',
      hi: 'अधिकारी कमान विवरण',
      ta: 'அதிகாரி கட்டுப்பாட்டு விவரம்',
      kn: 'ಅಧಿಕಾರಿ ಕಮಾಂಡ್ ವಿವರಣೆ',
      mr: 'अधिकारी कमांड माहिती',
      bn: 'অফিসার কমান্ড ব্রিফিং',
      gu: 'અધિકારી કમાન્ડ સંક્ષિપ્ત',
      pa: 'ਅਧਿਕਾਰੀ ਕਮਾਂਡ ਵੇਰਵਾ',
    },
    activeNode: {
      en: 'Active Agrinet Node',
      te: 'క్రియాశీల అగ్రినెట్ నోడ్',
      hi: 'सक्रिय एग्रीनेट नोड',
      ta: 'செயலில் உள்ள அக்ரிநெட் முனை',
      kn: 'ಸಕ್ರಿಯ ಅಗ್ರಿನೆಟ್ ನೋಡ್',
      mr: 'सक्रिय अॅग्रीनेट नोड',
      bn: 'সক্রিয় অ্যাগ্রিনেট নোড',
      gu: 'સક્રિય એગ્રીનેટ નોડ',
      pa: 'ਸਰਗਰਮ ਐਗਰੀਨੈੱਟ ਨੋਡ',
    },
    istSync: {
      en: 'IST Sync Time',
      te: 'భారతీయ ప్రామాణిక సమయం (IST)',
      hi: 'आईएसटी समकालिक समय',
      ta: 'IST ஒத்திசைவு நேரம்',
      kn: 'IST ಸಮಯ ಹೊಂದಾಣಿಕೆ',
      mr: 'IST प्रमाणवेळ',
      bn: 'আইএসটি সিঙ্ক সময়',
      gu: 'IST સિંક સમય',
      pa: 'ਭਾਰਤੀ ਸਮਾਂ (IST)',
    },
    sessionExpiry: {
      en: 'Session Expiry',
      te: 'సెషన్ ముగింపు సమయం',
      hi: 'सत्र समाप्ति सीमा',
      ta: 'அமர்வு காலாவதி',
      kn: 'ಸೆಷನ್ ಅವಧಿ ಮುಕ್ತಾಯ',
      mr: 'सत्र समाप्ती वेळ',
      bn: 'সেশন মেয়াদ শেষ',
      gu: 'સત્ર સમાપ્તિ',
      pa: 'ਸੈਸ਼ਨ ਸਮਾਪਤੀ',
    },
    eightHours: {
      en: '8 Hours Max',
      te: 'గరిష్టంగా 8 గంటలు',
      hi: 'अधिकतम 8 घंटे',
      ta: 'அதிகபட்சம் 8 மணிநேரம்',
      kn: 'ಗರಿಷ್ಠ 8 ಗಂಟೆಗಳು',
      mr: 'कमाल ८ तास',
      bn: 'সর্বোচ্চ ৮ ঘণ্টা',
      gu: 'મહત્તમ 8 કલાક',
      pa: 'ਵੱਧ ਤੋਂ ਵੱਧ 8 ਘੰਟੇ',
    },
    directorRole: {
      en: 'District Agronomy Director',
      te: 'జిల్లా వ్యవసాయ సంచాలకులు',
      hi: 'जिला कृषि निदेशक',
      ta: 'மாவட்ட வேளாண்மை இயக்குநர்',
      kn: 'ಜಿಲ್ಲಾ ಕೃಷಿ ನಿರ್ದೇಶಕರು',
      mr: 'जिल्हा कृषी संचालक',
      bn: 'জেলা কৃষি অধিকর্তা',
      gu: 'જિલ્લા કૃષિ નિયામક',
      pa: 'ਜ਼ਿਲ੍ਹਾ ਖੇਤੀਬਾੜੀ ਡਾਇਰੈਕਟਰ',
    },
    quote: {
      en: '“Direct authentication enables instantaneous settlement of district crop loss and water release petitions.”',
      te: '“ప్రత్యక్ష ప్రమాణీకరణ ద్వారా జిల్లా పంట నష్టాలు మరియు కాలువ నీటి విడుదల పిటిషన్లను వేగంగా పరిష్కరించవచ్చు.”',
      hi: '“प्रत्यक्ष प्रमाणीकरण जिला फसल क्षति और नहर जल वितरण याचिकाओं का त्वरित समाधान सुनिश्चित करता है।”',
      ta: '“நேரடி அங்கீகாரம் மாவட்ட பயிர் இழப்பு மற்றும் நீர் பாசன மனுக்களை உடனடியாக தீர்க்க உதவுகிறது.”',
      kn: '“ನೇರ ದೃಢೀಕರಣವು ಜಿಲ್ಲಾ ಬೆಳೆ ಹಾನಿ ಮತ್ತು ನೀರು ಬಿಡುಗಡೆ ಅರ್ಜಿಗಳನ್ನು ತ್ವರಿತವಾಗಿ ಪರಿಹರಿಸಲು ನೆರವಾಗುತ್ತದೆ.”',
      mr: '“थेट प्रमाणीकरणामुळे जिल्हा पीक नुकसान व कालवा पाणी सोडण्याच्या अर्जांचा त्वरित निपटारा होतो.”',
      bn: '“সরাসরি প্রমাণীকরণ জেলা স্তরের ফসল ক্ষতি এবং খালের জল ছাড়ার আবেদন দ্রুত নিষ্পত্তি করতে সাহায্য করে।”',
      gu: '“સીધા પ્રમાણીકરણથી જિલ્લા પાક નુકસાન અને કેનાલ પાણી છોડવાની અરજીઓનો ત્વરિત નિકાલ શક્ય બને છે.”',
      pa: '“ਸਿੱਧਾ ਪ੍ਰਮਾਣੀਕਰਨ ਜ਼ਿਲ੍ਹੇ ਦੇ ਫ਼ਸਲੀ ਨੁਕਸਾਨ ਅਤੇ ਨਹਿਰੀ ਪਾਣੀ ਦੀਆਂ ਅਰਜ਼ੀਆਂ ਦਾ ਤੁਰੰਤ ਨਿਪਟਾਰਾ ਯਕੀਨੀ ਬਣਾਉਂਦਾ ਹੈ।”',
    },
    ssoPortal: {
      en: 'Single Sign-On (SSO) Portal',
      te: 'సింగిల్ సైన్-ఆన్ (SSO) పోర్టల్',
      hi: 'सिंगल साइन-ऑन (एसएसओ) पोर्टल',
      ta: 'ஒற்றை உள்நுழைவு (SSO) தளம்',
      kn: 'ಸಿಂಗಲ್ ಸೈನ್-ಆನ್ (ಎಸ್‌ಎಸ್‌ಒ) ಪೋರ್ಟಲ್',
      mr: 'सिंगल साइन-ऑन (SSO) पोर्टल',
      bn: 'সিঙ্গেল সাইন-অন (SSO) পোর্টাল',
      gu: 'સિંગલ સાઇન-ઓન (SSO) પોર્ટલ',
      pa: 'ਸਿੰਗਲ ਸਾਈਨ-ਆਨ (SSO) ਪੋਰਟਲ',
    },
    gateRef: {
      en: 'Gate Reference',
      te: 'గేట్ రిఫరెన్స్ కోడ్',
      hi: 'प्रवेश संदर्भ कोड',
      ta: 'நுழைவு குறிப்பு எண்',
      kn: 'ಗೇಟ್ ಉಲ್ಲೇಖ ಕೋಡ್',
      mr: 'प्रवेश संदर्भ क्रमांक',
      bn: 'গেট রেফারেন্স কোড',
      gu: 'ગેટ સંદર્ભ કોડ',
      pa: 'ਗੇਟ ਰੈਫਰੈਂਸ ਕੋਡ',
    },
    assignedBy: {
      en: 'Assigned by National Agriculture Commission',
      te: 'జాతీయ వ్యవసాయ కమిషన్ ద్వారా కేటాయించబడింది',
      hi: 'राष्ट्रीय कृषि आयोग द्वारा आवंटित',
      ta: 'தேசிய வேளாண்மை ஆணையத்தால் ஒதுக்கப்பட்டது',
      kn: 'ರಾಷ್ಟ್ರೀಯ ಕೃಷಿ ಆಯೋಗದಿಂದ ನಿಯೋಜಿಸಲಾಗಿದೆ',
      mr: 'राष्ट्रीय कृषी आयोगाद्वारे नियुक्त',
      bn: 'জাতীয় কৃষি কমিশন কর্তৃক বরাদ্দকৃত',
      gu: 'રાષ્ટ્રીય કૃષિ પંચ દ્વારા ફાળવેલ',
      pa: 'ਰਾਸ਼ਟਰੀ ਖੇਤੀਬਾੜੀ ਕਮਿਸ਼ਨ ਵੱਲੋਂ ਅਲਾਟ',
    },
    zoneHub: {
      en: 'Zone VII Regional Command Hub',
      te: 'జోన్ VII ప్రాంతీయ కమాండ్ హబ్',
      hi: 'जोन VII क्षेत्रीय कमान केंद्र',
      ta: 'மண்டலம் VII பிராந்திய கட்டுப்பாட்டு மையம்',
      kn: 'ವಲಯ VII ಪ್ರಾದೇಶಿಕ ಕಮಾಂಡ್ ಹಬ್',
      mr: 'झोन VII प्रादेशिक कमांड हब',
      bn: 'জোন VII আঞ্চলিক কমান্ড হাব',
      gu: 'ઝોન VII પ્રાદેશિક કમાન્ડ હબ',
      pa: 'ਜ਼ੋਨ VII ਖੇਤਰੀ ਕਮਾਂਡ ਹੱਬ',
    },
    forgotKey: {
      en: 'Forgot Key?',
      te: 'పాస్‌వర్డ్ మర్చిపోయారా?',
      hi: 'पासवर्ड भूल गए?',
      ta: 'கடவுச்சொல் மறந்துவிட்டதா?',
      kn: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
      mr: 'पासवर्ड विसरलात?',
      bn: 'পাসওয়ার্ড ভুলে গেছেন?',
      gu: 'પાસવર્ડ ભૂલી ગયા?',
      pa: 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?',
    },
    mfa: {
      en: 'Multi-Factor Authentication (2FA)',
      te: 'మల్టీ-ఫాక్టర్ అథెంటికేషన్ (2FA)',
      hi: 'मल्टी-फैक्टर प्रमाणीकरण (2FA)',
      ta: 'இரு காரணி அங்கீகாரம் (2FA)',
      kn: 'ಮಲ್ಟಿ-ಫ್ಯಾಕ್ಟರ್ ದೃಢೀಕರಣ (2FA)',
      mr: 'मल्टी-फॅक्टर प्रमाणीकरण (2FA)',
      bn: 'মাল্টি-ফ্যাক্টর প্রমাণীকরণ (2FA)',
      gu: 'મલ્ટી-ફેક્ટર ઓથેન્ટિકેશન (2FA)',
      pa: 'ਮਲਟੀ-ਫੈਕਟਰ ਪ੍ਰਮਾਣੀਕਰਨ (2FA)',
    },
    aadhaarOtp: {
      en: 'Aadhaar OTP',
      te: 'ఆధార్ ఓటీపీ',
      hi: 'आधार ओटीपी',
      ta: 'ஆதார் OTP',
      kn: 'ಆಧಾರ್ ಒಟಿಪಿ',
      mr: 'आधार ओटीपी',
      bn: 'আধার ওটিপি',
      gu: 'આધાર ઓટીપી',
      pa: 'ਆਧਾਰ ਓਟੀਪੀ',
    },
    nicKey: {
      en: 'NIC Hard-Key',
      te: 'NIC హార్డ్-కీ',
      hi: 'एनआईसी हार्ड-की',
      ta: 'NIC ஹார்ட்-கீ',
      kn: 'ಎನ್‌ಐಸಿ ಹಾರ್ಡ್-ಕೀ',
      mr: 'NIC हार्ड-की',
      bn: 'এনআইসি হার্ড-কী',
      gu: 'NIC હાર્ડ-કી',
      pa: 'ਐਨਆਈਸੀ ਹਾਰਡ-ਕੀ',
    },
    rememberTerm: {
      en: 'Remember this authorized DAO terminal for 8 hours',
      te: 'ఈ అధికృత DAO టెర్మినల్‌ను 8 గంటల పాటు గుర్తుంచుకోండి',
      hi: 'इस अधिकृत डीएओ टर्मिनल को 8 घंटे तक याद रखें',
      ta: 'இந்த அங்கீகரிக்கப்பட்ட DAO முனையத்தை 8 மணிநேரம் நினைவில் கொள்க',
      kn: 'ಈ ಅಧಿಕೃತ ಡಿಎಒ ಟರ್ಮಿನಲ್ ಅನ್ನು 8 ಗಂಟೆಗಳ ಕಾಲ ನೆನಪಿಡಿ',
      mr: 'हे अधिकृत DAO टर्मिनल ८ तास लक्षात ठेवा',
      bn: 'এই অনুমোদিত ডিএও টার্মিনালটি ৮ ঘণ্টার জন্য মনে রাখুন',
      gu: 'આ અધિકૃત DAO ટર્મિનલને 8 કલાક યાદ રાખો',
      pa: 'ਇਸ ਅਧਿਕਾਰਤ DAO ਟਰਮੀਨਲ ਨੂੰ 8 ਘੰਟਿਆਂ ਲਈ ਯਾਦ ਰੱਖੋ',
    },
    sessionCertIn: {
      en: 'Session monitored by National CERT-IN',
      te: 'సెషన్ నేషనల్ CERT-IN పర్యవేక్షణలో ఉంది',
      hi: 'सत्र की निगरानी राष्ट्रीय सीईआरटी-इन द्वारा',
      ta: 'அமர்வு தேசிய CERT-IN மூலம் கண்காணிக்கப்படுகிறது',
      kn: 'ಸೆಷನ್ ರಾಷ್ಟ್ರೀಯ CERT-IN ನಿಂದ ಮೇಲ್ವಿಚಾರಣೆ',
      mr: 'सत्र राष्ट्रीय CERT-IN द्वारे निरीक्षण केले जाते',
      bn: 'সেশন জাতীয় CERT-IN দ্বারা নজরদারি করা হচ্ছে',
      gu: 'સત્રનું રાષ્ટ્રીય CERT-IN દ્વારા નિરીક્ષણ',
      pa: 'ਰਾਸ਼ਟਰੀ CERT-IN ਵੱਲੋਂ ਸੈਸ਼ਨ ਦੀ ਨਿਗਰਾਨੀ',
    },
    verifyingText: {
      en: 'Verifying Cadre Token & Praja Vani Session...',
      te: 'క్యాడర్ టోకెన్ & ప్రజా వాణి సెషన్‌ను ధృవీకరిస్తోంది...',
      hi: 'कैडर टोकन एवं प्रजा वाणी सत्र सत्यापित हो रहा है...',
      ta: 'அலுவலர் டோக்கன் & பிரஜா வாணி அமர்வு சரிபார்க்கப்படுகிறது...',
      kn: 'ಕೇಡರ್ ಟೋಕನ್ ಮತ್ತು ಪ್ರಜಾ ವಾಣಿ ಸೆಷನ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
      mr: 'केडर टोकन आणि प्रजा वाणी सत्र पडताळत आहे...',
      bn: 'ক্যাডার টোকেন এবং প্রজা বাণী সেশন যাচাই করা হচ্ছে...',
      gu: 'કેડર ટોકન અને પ્રજા વાણી સત્ર ચકાસી રહ્યા છીએ...',
      pa: 'ਕਾਡਰ ਟੋਕਨ ਅਤੇ ਪ੍ਰਜਾ ਵਾਣੀ ਸੈਸ਼ਨ ਦੀ ਪੜਤਾਲ ਹੋ ਰਹੀ ਹੈ...',
    },
    reqAllocation: {
      en: 'Request Cadre Allocation',
      te: 'క్యాడర్ కేటాయింపును అభ్యర్థించండి',
      hi: 'संवर्ग आवंटन का अनुरोध करें',
      ta: 'அலுவலர் ஒதுக்கீடு கோரிக்கை',
      kn: 'ಕೇಡರ್ ನಿಯೋಜನೆ ವಿನಂತಿ',
      mr: 'केडर वाटप विनंती करा',
      bn: 'ক্যাডার বরাদ্দের অনুরোধ',
      gu: 'કેડર ફાળવણી વિનંતી કરો',
      pa: 'ਕਾਡਰ ਅਲਾਟਮੈਂਟ ਦੀ ਬੇਨਤੀ ਕਰੋ',
    },
    autofillBtn: {
      en: 'Autofill Sample IAS Token',
      te: 'నమూనా IAS టోకెన్‌ను ఆటోఫిల్ చేయండి',
      hi: 'नमूना आईएएस टोकन स्वतः भरें',
      ta: 'மாதிரி IAS டோக்கனை நிரப்பவும்',
      kn: 'ಮಾದರಿ IAS ಟೋಕನ್ ಸ್ವಯಂ-ಭರ್ತಿ',
      mr: 'नमुना आयएएस टोकन ऑटोफिल करा',
      bn: 'নমুনা আইএএস টোকেন অটোফিল করুন',
      gu: 'નમૂના IAS ટોકન આપોઆપ ભરો',
      pa: 'ਨਮੂਨਾ IAS ਟੋਕਨ ਆਟੋਫਿਲ ਕਰੋ',
    },
    zeroTrust: {
      en: 'Zero Trust Architecture Active',
      te: 'జీరో ట్రస్ట్ ఆర్కిటెక్చర్ యాక్టివ్',
      hi: 'ज़ीरो ट्रस्ट सुरक्षा सक्रिय',
      ta: 'ஜீரோ டிரஸ்ட் கட்டமைப்பு செயலில் உள்ளது',
      kn: 'ಜೀರೋ ಟ್ರಸ್ಟ್ ಭದ್ರತೆ ಸಕ್ರಿಯ',
      mr: 'झिरो ट्रस्ट सुरक्षा सक्रिय',
      bn: 'জিরো ট্রাস্ট নিরাপত্তা সক্রিয়',
      gu: 'ઝીરો ટ્રસ્ટ સિક્યુરિટી સક્રિય',
      pa: 'ਜ਼ੀਰੋ ਟਰੱਸਟ ਸੁਰੱਖਿਆ ਐਕਟਿਵ',
    },
    jurisdictions: {
      'central-command': {
        en: 'Central Agronomic Command Zone',
        te: 'కేంద్ర వ్యవసాయ కమాండ్ జోన్',
        hi: 'केंद्रीय कृषि कमान क्षेत्र',
        ta: 'மத்திய வேளாண்மை கட்டுப்பாட்டு மண்டலம்',
        kn: 'ಕೇಂದ್ರ ಕೃಷಿ ಕಮಾಂಡ್ ವಲಯ',
        mr: 'मध्यवर्ती कृषी कमांड झोन',
        bn: 'কেন্দ্রীয় কৃষি কমান্ড জোন',
        gu: 'સેન્ટ્રલ કૃષિ કમાન્ડ ઝોન',
        pa: 'ਕੇਂਦਰੀ ਖੇਤੀਬਾੜੀ ਕਮਾਂਡ ਜ਼ੋਨ',
      },
      'northern-cluster': {
        en: 'Northern Agronomic & Wheat Belt',
        te: 'ఉత్తర వ్యవసాయ & గోధుమ క్లస్టర్',
        hi: 'उत्तरी कृषि एवं गेहूं क्षेत्र',
        ta: 'வடக்கு வேளாண்மை மற்றும் கோதுமை மண்டலம்',
        kn: 'ಉತ್ತರ ಕೃಷಿ ಮತ್ತು ಗೋಧಿ ವಲಯ',
        mr: 'उत्तर कृषी व गहू पट्टा',
        bn: 'উত্তর কৃষি ও গম বলয়',
        gu: 'ઉત્તરીય કૃષિ અને ઘઉં પટ્ટો',
        pa: 'ਉੱਤਰੀ ਖੇਤੀਬਾੜੀ ਅਤੇ ਕਣਕ ਖੇਤਰ',
      },
      'southern-zone': {
        en: 'Southern Coastal & Irrigation Belt',
        te: 'దక్షిణ తీరప్రాంత & సాగునీటి బెల్ట్',
        hi: 'दक्षिणी तटीय एवं सिंचाई क्षेत्र',
        ta: 'தெற்கு கடலோர மற்றும் பாசன மண்டலம்',
        kn: 'ದಕ್ಷಿಣ ಕರಾವಳಿ ಮತ್ತು ನೀರಾವರಿ ವಲಯ',
        mr: 'दक्षिण किनारपट्टी व सिंचन पट्टा',
        bn: 'দক্ষিণ উপকূলীয় ও সেচ বলয়',
        gu: 'દક્ષિણ દરિયાકાંઠા અને સિંચાઈ પટ્ટો',
        pa: 'ਦੱਖਣੀ ਤੱਟੀ ਅਤੇ ਸਿੰਚਾਈ ਖੇਤਰ',
      },
      'western-basin': {
        en: 'Western Rainfed & Dryland Cluster',
        te: 'పశ్చిమ వర్షాధార & మెట్టభూముల క్లస్టర్',
        hi: 'पश्चिमी वर्षा आधारित एवं शुष्क भूमि क्षेत्र',
        ta: 'மேற்கு மானாவாரி மற்றும் வறண்ட நில மண்டலம்',
        kn: 'ಪಶ್ಚಿಮ ಮಳೆಯಾಶ್ರಿತ ಮತ್ತು ಒಣಭೂಮಿ ವಲಯ',
        mr: 'पश्चिम कोरडवाहू व पर्जन्य आधारित पट्टा',
        bn: 'পশ্চিম বৃষ্টিপাত নির্ভর ও শুষ্ক অঞ্চল',
        gu: 'પશ્ચિમ વરસાદ આધારિત અને સૂકી જમીન ક્લસ્ટર',
        pa: 'ਪੱਛਮੀ ਬਰਾਨੀ ਅਤੇ ਖੁਸ਼ਕ ਖੇਤਰ',
      },
      'national-hq': {
        en: 'National Directorate Command HQ - New Delhi',
        te: 'జాతీయ డైరెక్టరేట్ కమాండ్ హెచ్‌క్యూ - న్యూఢిల్లీ',
        hi: 'राष्ट्रीय निदेशालय कमान मुख्यालय - नई दिल्ली',
        ta: 'தேசிய இயக்குநரக கட்டுப்பாட்டு தலைமையகம் - புது தில்லி',
        kn: 'ರಾಷ್ಟ್ರೀಯ ನಿರ್ದೇಶನಾಲಯ ಕಮಾಂಡ್ ಕೇಂದ್ರ - ನವದೆಹಲಿ',
        mr: 'राष्ट्रीय संचालनालय मुख्यालय - नवी दिल्ली',
        bn: 'জাতীয় অধিদপ্তর কমান্ড সদর দফতর - নতুন দিল্লি',
        gu: 'રાષ્ટ્રીય નિયામક કચેરી કમાન્ડ HQ - નવી દિલ્હી',
        pa: 'ਰਾਸ਼ਟਰੀ ਡਾਇਰੈਕਟੋਰੇਟ ਕਮਾਂਡ ਮੁੱਖ ਦਫ਼ਤਰ - ਨਵੀਂ ਦਿੱਲੀ',
      },
    },
  };

  const handleFillDemo = () => {
    setCadreId('DAO-2026-8849');
    setPassword('DAO#2026SecureCommand');
    setJurisdiction('central-command');
    showToast('Applied Official Cadre Credentials for S. Ramanathan, IAS');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthorizing(true);
    void (async () => {
      try {
        // Real backend auth: POST /officer/login → Bearer session token
        const res = await officerLogin(cadreId.trim(), password);
        setOfficerToken(res.access_token);
        showToast('Biometric Token Validated. Directing to Officer Hub Command Center...');
        setTimeout(() => {
          setIsAuthorizing(false);
          onAuthorizeSuccess();
        }, 600);
      } catch (err) {
        setIsAuthorizing(false);
        const detail =
          err instanceof ApiError
            ? err.status === 401
              ? 'Invalid cadre credentials (check OFFICER_USERNAME / OFFICER_PASSWORD in the backend .env).'
              : err.message
            : 'Auth backend not reachable (is it running on port 8000?)';
        showToast(`Login failed: ${detail}`);
      }
    })();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Subtle decorative ambient glows */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-[#006b2c]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 right-12 w-[380px] h-[380px] bg-[#6bff8f]/30 rounded-full blur-2xl pointer-events-none -z-10"></div>

      {/* Top Gov Badge */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#e0ebe0]/90 backdrop-blur-md shadow-sm mb-2 border border-white/40">
          <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-ping"></span>
          <span className="text-[11px] font-semibold text-[#3e4a3d] uppercase tracking-wider">
            {i18n.topGov[language] || i18n.topGov.en}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/80 text-[#006b2c] text-[11px] font-semibold shadow-sm backdrop-blur-md border border-white/60">
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            {i18n.ssl[language] || i18n.ssl.en}
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/80 text-[#3e4a3d] text-[11px] font-semibold shadow-sm backdrop-blur-md border border-white/60">
            <span className="material-symbols-outlined text-[15px]">account_balance</span>
            {i18n.nicGate[language] || i18n.nicGate.en}
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/80 text-[#3e4a3d] text-[11px] font-semibold shadow-sm backdrop-blur-md border border-white/60">
            <span className="material-symbols-outlined text-[15px] text-[#006b2f]">satellite_alt</span>
            {i18n.cadreNode[language] || i18n.cadreNode.en}
          </span>
        </div>
      </div>

      {/* Main Asymmetric Bento Shell */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Biometric Briefing Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl bg-[#ebf7eb]/85 backdrop-blur-xl p-6 shadow-sm border border-white/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#006b2c]">
                <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
              </div>
              <span className="px-3 py-0.5 rounded-full bg-[#6bff8f] text-[#002109] text-[11px] font-bold uppercase tracking-wide">
                {i18n.level4[language] || i18n.level4.en}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#006b2c] font-bold">
                {i18n.brief[language] || i18n.brief.en}
              </span>
              <p className="text-[18px] font-semibold text-[#141e17] mt-1 leading-snug">
                {t.officer_title}
              </p>
              <p className="text-[12px] text-[#3e4a3d] mt-2 leading-relaxed">
                {t.officer_desc}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 shadow-sm border border-white/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b2c] text-[18px]">dns</span>
                  <span className="text-[12px] font-medium text-[#141e17]">
                    {i18n.activeNode[language] || i18n.activeNode.en}
                  </span>
                </div>
                <span className="text-[11px] text-[#006b2c] font-bold">NAT-CMD-Z7</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 shadow-sm border border-white/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b2c] text-[18px]">schedule</span>
                  <span className="text-[12px] font-medium text-[#141e17]">
                    {i18n.istSync[language] || i18n.istSync.en}
                  </span>
                </div>
                <span className="text-[11px] text-[#141e17] font-semibold" id="live-ist-clock">
                  {istTime}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 shadow-sm border border-white/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b2c] text-[18px]">lock_reset</span>
                  <span className="text-[12px] font-medium text-[#141e17]">
                    {i18n.sessionExpiry[language] || i18n.sessionExpiry.en}
                  </span>
                </div>
                <span className="text-[11px] text-[#3e4a3d] font-medium">
                  {i18n.eightHours[language] || i18n.eightHours.en}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 bg-[#e0ebe0]/70 rounded-2xl p-3 border border-white/40">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white"
                alt="S. Ramanathan IAS"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
              />
              <div className="min-w-0">
                <p className="text-[12px] text-[#141e17] font-bold truncate">S. Ramanathan, IAS</p>
                <p className="text-[11px] text-[#3e4a3d] truncate">
                  {i18n.directorRole[language] || i18n.directorRole.en}
                </p>
              </div>
            </div>
            <p className="text-[12px] text-[#3e4a3d] mt-2 italic leading-snug">
              {i18n.quote[language] || i18n.quote.en}
            </p>
          </div>
        </div>

        {/* Right Column: Glassmorphic Authentication Card */}
        <div className="lg:col-span-8 rounded-3xl bg-white/90 backdrop-blur-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden border border-white/60">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#006b2c] via-[#6bff8f] to-[#006b2c]"></div>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-black/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#006b2c] animate-pulse"></div>
                  <span className="text-[11px] uppercase tracking-wider text-[#006b2c] font-bold">
                    {i18n.ssoPortal[language] || i18n.ssoPortal.en}
                  </span>
                </div>
                <h1 className="text-[28px] md:text-[32px] font-semibold text-[#141e17] tracking-tight mt-1">
                  {t.officer_title}
                </h1>
                <p className="text-[14px] text-[#3e4a3d] mt-0.5">
                  {t.officer_desc}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-[#3e4a3d]">
                  {i18n.gateRef[language] || i18n.gateRef.en}
                </span>
                <span className="text-[12px] text-[#006b2c] font-bold tracking-wider">
                  DAO-GATEWAY-2026
                </span>
              </div>
            </div>

            <form className="space-y-4 pt-5" id="officer-auth-form" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] text-[#141e17] font-semibold mb-1.5" htmlFor="cadre-id">
                    {t.officer_cadre_code}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#3e4a3d] text-[20px]">
                      badge
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-10 rounded-full bg-[#ebf7eb] text-[14px] text-[#141e17] placeholder:text-[#6e7b6c] focus:outline-none focus:ring-2 focus:ring-[#006b2c] shadow-sm transition-all border border-black/5"
                      id="cadre-id"
                      name="cadreId"
                      placeholder="e.g. DAO-2026-8849 or IAS/MAO Code"
                      required
                      type="text"
                      value={cadreId}
                      onChange={(e) => setCadreId(e.target.value)}
                    />
                    <span
                      className="material-symbols-outlined absolute right-3.5 text-[#006b2c] text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3e4a3d] mt-1 pl-3.5">
                    {i18n.assignedBy[language] || i18n.assignedBy.en}
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] text-[#141e17] font-semibold mb-1.5" htmlFor="jurisdiction-select">
                    {t.officer_jurisdiction}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#3e4a3d] text-[20px]">
                      map
                    </span>
                    <select
                      className="w-full h-11 pl-11 pr-9 rounded-full bg-[#ebf7eb] text-[14px] text-[#141e17] focus:outline-none focus:ring-2 focus:ring-[#006b2c] shadow-sm appearance-none cursor-pointer transition-all border border-black/5"
                      id="jurisdiction-select"
                      name="jurisdiction"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                    >
                      {Object.entries(i18n.jurisdictions).map(([key, dict]) => (
                        <option key={key} value={key}>
                          {dict[language] || dict.en}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3.5 text-[#3e4a3d] pointer-events-none text-[20px]">
                      expand_more
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3e4a3d] mt-1 pl-3.5">
                    {i18n.zoneHub[language] || i18n.zoneHub.en}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] text-[#141e17] font-semibold" htmlFor="password-input">
                      {t.officer_passcode}
                    </label>
                    <button
                      type="button"
                      className="text-[11px] text-[#006b2c] hover:underline font-semibold cursor-pointer"
                      onClick={() => showToast('OTP reset link dispatched to your registered Aadhaar mobile number.')}
                    >
                      {i18n.forgotKey[language] || i18n.forgotKey.en}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#3e4a3d] text-[20px]">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-11 rounded-full bg-[#ebf7eb] text-[14px] text-[#141e17] placeholder:text-[#6e7b6c] focus:outline-none focus:ring-2 focus:ring-[#006b2c] shadow-sm transition-all border border-black/5"
                      id="password-input"
                      name="password"
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-[#3e4a3d] hover:text-[#141e17] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] text-[#141e17] font-semibold mb-1.5">
                    {i18n.mfa[language] || i18n.mfa.en}
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-11">
                    <button
                      type="button"
                      onClick={() => setAuth2fa('aadhaar')}
                      className={`h-full rounded-full border text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        auth2fa === 'aadhaar'
                          ? 'bg-[#006b2c] text-white border-[#006b2c] shadow-xs'
                          : 'bg-[#ebf7eb] text-[#3e4a3d] border-black/5 hover:bg-[#e0ebe0]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                      <span>{i18n.aadhaarOtp[language] || i18n.aadhaarOtp.en}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuth2fa('nic-token')}
                      className={`h-full rounded-full border text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        auth2fa === 'nic-token'
                          ? 'bg-[#006b2c] text-white border-[#006b2c] shadow-xs'
                          : 'bg-[#ebf7eb] text-[#3e4a3d] border-black/5 hover:bg-[#e0ebe0]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">token</span>
                      <span>{i18n.nicKey[language] || i18n.nicKey.en}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={rememberTerminal}
                    onChange={(e) => setRememberTerminal(e.target.checked)}
                    className="rounded text-[#006b2c] focus:ring-[#006b2c] h-4 w-4"
                    id="remember-terminal"
                    type="checkbox"
                  />
                  <span className="text-[12px] text-[#141e17]">
                    {i18n.rememberTerm[language] || i18n.rememberTerm.en}
                  </span>
                </label>
                <div className="inline-flex items-center gap-1 text-[#3e4a3d] text-[11px]">
                  <span className="material-symbols-outlined text-[16px] text-[#006b2c]">security</span>
                  <span>{i18n.sessionCertIn[language] || i18n.sessionCertIn.en}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={isAuthorizing}
                  className="w-full py-3.5 px-6 rounded-full bg-[#006b2c] hover:bg-[#00873a] text-white text-[16px] md:text-[18px] font-semibold tracking-wide shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
                  id="auth-submit-btn"
                  type="submit"
                >
                  {isAuthorizing ? (
                    <>
                      <span className="inline-block animate-spin material-symbols-outlined text-[20px]">
                        progress_activity
                      </span>
                      <span>{i18n.verifyingText[language] || i18n.verifyingText.en}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.officer_login_btn}</span>
                      <span className="material-symbols-outlined text-[24px] transform group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  className="text-[12px] text-[#3e4a3d] hover:text-[#006b2c] transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => showToast('Directing to Secretariat IT Portal request desk...')}
                >
                  <span className="material-symbols-outlined text-[18px]">contact_support</span>
                  <span>{i18n.reqAllocation[language] || i18n.reqAllocation.en}</span>
                </button>
                <span className="text-[#bdcaba] text-[12px]">•</span>
                <button
                  type="button"
                  className="text-[12px] text-[#3e4a3d] hover:text-[#006b2c] transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => showToast('Dialing IT Cell Hotline (Toll Free: 1800-425-0302)')}
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  <span>IT Cell Helpdesk: 1800-425-0302</span>
                </button>
              </div>
              <button
                className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#e5f1e5] text-[#006b2c] hover:bg-[#dae6da] transition-colors cursor-pointer"
                onClick={handleFillDemo}
                type="button"
              >
                {i18n.autofillBtn[language] || i18n.autofillBtn.en}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Duty Notice Banner */}
      <div className="w-full max-w-5xl mt-4">
        <div className="rounded-3xl bg-[#e0ebe0]/70 backdrop-blur-md p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border border-white/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#93000a] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">gavel</span>
            </div>
            <div>
              <p className="text-[12px] text-[#141e17] font-bold">
                {t.officer_duty_title}
              </p>
              <p className="text-[12px] text-[#3e4a3d] leading-snug">
                {t.officer_duty_desc}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white text-[#006b2c] text-[11px] font-semibold shadow-sm border border-white/60">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {i18n.zeroTrust[language] || i18n.zeroTrust.en}
            </span>
            <span className="text-[11px] text-[#3e4a3d] mt-1 font-mono">
              IP Logged: 103.241.144.18 (Gov Static Pool)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
