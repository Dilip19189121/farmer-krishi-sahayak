import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DaoCommandCenterProps {
  onLogout: () => void;
  showToast: (msg: string) => void;
}

interface GrievanceItem {
  id: string;
  farmerName: string;
  mandal: string;
  village: string;
  crop: Record<string, string>;
  lossPercent: string;
  claimAmount: string;
  status: 'Pending Verification' | 'Approved' | 'Disbursed';
  filingDate: string;
}

export const DaoCommandCenter: React.FC<DaoCommandCenterProps> = ({
  onLogout,
  showToast,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'grievances' | 'subsidies' | 'water-canals'>('grievances');

  const [grievances, setGrievances] = useState<GrievanceItem[]>([
    {
      id: 'AP-GR-8821',
      farmerName: 'K. Venkata Subbaiah',
      mandal: 'Nandyal Rural',
      village: 'Mahanandi Katta',
      crop: {
        en: 'Bengal Gram (Chana)',
        te: 'శనగలు (Bengal Gram)',
        hi: 'चना (बंगाल चना)',
        ta: 'கொண்டைக்கடலை',
        kn: 'ಕಡಲೆ',
        mr: 'हरभरा',
        bn: 'ছোলা',
        gu: 'ચણા',
        pa: 'ਛੋਲੇ',
      },
      lossPercent: '42%',
      claimAmount: '₹ 38,500',
      status: 'Pending Verification',
      filingDate: '10 Oct 2026',
    },
    {
      id: 'AP-GR-8822',
      farmerName: 'B. Sivaji Rao',
      mandal: 'Guntur West',
      village: 'Prathipadu',
      crop: {
        en: 'Guntur Red Chilli',
        te: 'గుంటూరు ఎర్ర మిరప',
        hi: 'गुंटूर लाल मिर्च',
        ta: 'குண்டூர் மிளகாய்',
        kn: 'ಗುಂಟೂರು ಕೆಂಪು ಮೆಣಸಿನಕಾಯಿ',
        mr: 'गुंटूर लाल मिरची',
        bn: 'গুন্টুর লাল লঙ্কা',
        gu: 'ગુંટુર લાલ મરચું',
        pa: 'ਗੁੰਟੂਰ ਲਾਲ ਮਿਰਚ',
      },
      lossPercent: '65%',
      claimAmount: '₹ 72,000',
      status: 'Approved',
      filingDate: '08 Oct 2026',
    },
    {
      id: 'AP-GR-8823',
      farmerName: 'M. Chenna Kesavulu',
      mandal: 'Dhone',
      village: 'Veldurthi',
      crop: {
        en: 'Groundnut (Pods)',
        te: 'వేరుశనగ (Groundnut)',
        hi: 'मूंगफली (दाने)',
        ta: 'வேர்க்கடலை',
        kn: 'ಕಡಲೆಕಾಯಿ',
        mr: 'भुईमूग शेंगा',
        bn: 'চীনাবাদাম',
        gu: 'મગફળી',
        pa: 'ਮੂੰਗਫਲੀ',
      },
      lossPercent: '38%',
      claimAmount: '₹ 31,000',
      status: 'Pending Verification',
      filingDate: '09 Oct 2026',
    },
    {
      id: 'AP-GR-8824',
      farmerName: 'P. Lakshmi Devi',
      mandal: 'Tenali Command',
      village: 'Chavali',
      crop: {
        en: 'Paddy BPT 5204',
        te: 'వరి బీపీటీ 5204 (సాంబ మసూరి)',
        hi: 'धान बीपीटी 5204',
        ta: 'நெல் பிபிடி 5204',
        kn: 'ಭತ್ತ ಬಿಪಿಟಿ 5204',
        mr: 'भात बीपीटी 5204',
        bn: 'ধান বিপিটি ৫২০৪',
        gu: 'ડાંગર બીપીટી 5204',
        pa: 'ਝੋਨਾ ਬੀਪੀਟੀ 5204',
      },
      lossPercent: '28%',
      claimAmount: '₹ 22,400',
      status: 'Disbursed',
      filingDate: '03 Oct 2026',
    },
  ]);

  // Multilingual labels for table and cards
  const statusLabelsByLang: Record<string, Record<string, string>> = {
    'Pending Verification': {
      en: 'Pending Verification',
      te: 'పరిశీలన పెండింగ్',
      hi: 'सत्यापन लंबित',
      ta: 'சரிபார்ப்பு நிலுவையில்',
      kn: 'ಪರಿಶೀಲನೆ ಬಾಕಿ',
      mr: 'पडताळणी प्रलंबित',
      bn: 'যাচাই বিচারাধীন',
      gu: 'ચકાસણી બાકી',
      pa: 'ਪੜਤਾਲ ਬਕਾਇਆ',
    },
    'Approved': {
      en: 'Approved',
      te: 'ఆమోదించబడింది',
      hi: 'स्वीकृत',
      ta: 'ஒப்புதல் அளிக்கப்பட்டது',
      kn: 'ಅನುಮೋದಿಸಲಾಗಿದೆ',
      mr: 'मंजूर',
      bn: 'অনুমোদিত',
      gu: 'મંજૂર',
      pa: 'ਪ੍ਰਵਾਨਿਤ',
    },
    'Disbursed': {
      en: 'Disbursed',
      te: 'ఖాతాలో జమ చేయబడింది',
      hi: 'डीबीटी संवितरित',
      ta: 'பட்டுவாடா செய்யப்பட்டது',
      kn: 'ವಿತರಿಸಲಾಗಿದೆ',
      mr: 'संवितरित',
      bn: 'বিতরণ সম্পন্ন',
      gu: 'જમા કરાયેલ',
      pa: 'ਜਾਰੀ ਕੀਤਾ',
    },
  };

  const tableHeadersByLang: Record<string, Record<string, string>> = {
    petitionId: {
      en: 'Petition ID',
      te: 'దరఖాస్తు ఐడీ',
      hi: 'याचिका क्रमांक',
      ta: 'மனு எண்',
      kn: 'ಅರ್ಜಿ ಐಡಿ',
      mr: 'तक्रार आयडी',
      bn: 'আবেদন আইডি',
      gu: 'અરજી આઇડી',
      pa: 'ਅਰਜ਼ੀ ਆਈਡੀ',
    },
    farmerLoc: {
      en: 'Farmer & Location',
      te: 'రైతు & ప్రాంతం',
      hi: 'किसान व स्थान',
      ta: 'விவசாயி & இருப்பிடம்',
      kn: 'ರೈತ ಮತ್ತು ಸ್ಥಳ',
      mr: 'शेतकरी आणि ठिकाण',
      bn: 'কৃষক ও এলাকা',
      gu: 'ખેડૂત અને સ્થળ',
      pa: 'ਕਿਸਾਨ ਅਤੇ ਸਥਾਨ',
    },
    cropAffected: {
      en: 'Crop Affected',
      te: 'నష్టపోయిన పంట',
      hi: 'प्रभावित फसल',
      ta: 'பாதிக்கப்பட்ட பயிர்',
      kn: 'ಬಾಧಿತ ಬೆಳೆ',
      mr: 'बाधित पीक',
      bn: 'ক্ষতিগ্রস্ত ফসল',
      gu: 'અસરગ્રસ્ત પાક',
      pa: 'ਪ੍ਰਭਾਵਿਤ ਫ਼ਸਲ',
    },
    surveyLoss: {
      en: 'Survey Loss',
      te: 'సర్వే నష్టం (%)',
      hi: 'सर्वेक्षण क्षति',
      ta: 'கணக்கெடுப்பு இழப்பு',
      kn: 'ಸಮೀಕ್ಷೆ ನಷ್ಟ',
      mr: 'पाहणी नुकसान',
      bn: 'জরিপ ক্ষতি',
      gu: 'સર્વે નુકસાન',
      pa: 'ਸਰਵੇਖਣ ਨੁਕਸਾਨ',
    },
    assessedRelief: {
      en: 'Assessed Relief',
      te: 'మదింపు చేసిన పరిహారం',
      hi: 'आकलित राहत राशि',
      ta: 'மதிப்பிடப்பட்ட நிவாரணம்',
      kn: 'ಅಂದಾಜು ಪರಿಹಾರ',
      mr: 'मंजूर नुकसानभरपाई',
      bn: 'ধার্যকৃত ক্ষতিপূরণ',
      gu: 'અંદાજિત રાહત',
      pa: 'ਨਿਰਧਾਰਤ ਮੁਆਵਜ਼ਾ',
    },
    cadreStatus: {
      en: 'Cadre Status',
      te: 'అధికారిక స్థితి',
      hi: 'सत्यापन स्थिति',
      ta: 'அதிகாரப்பூர்வ நிலை',
      kn: 'ಪರಿಶೀಲನಾ ಸ್ಥಿತಿ',
      mr: 'प्रशासकीय स्थिती',
      bn: 'বর্তমান স্ট্যাটাস',
      gu: 'ચકાસણી સ્થિતિ',
      pa: 'ਕਾਰਵਾਈ ਸਥਿਤੀ',
    },
    actions: {
      en: 'Official Actions',
      te: 'అధికారిక చర్యలు',
      hi: 'अधिकारी कार्रवाई',
      ta: 'அதிகாரப்பூர்வ நடவடிக்கைகள்',
      kn: 'ಅಧಿಕೃತ ಕ್ರಮಗಳು',
      mr: 'कारवाई',
      bn: 'প্রশাসনিক পদক্ষেপ',
      gu: 'સત્તાવાર પગલાં',
      pa: 'ਸਰਕਾਰੀ ਕਾਰਵਾਈ',
    },
  };

  const btnApproveByLang: Record<string, string> = {
    en: 'Approve Relief',
    te: 'పరిహారం ఆమోదించు',
    hi: 'राहत स्वीकृत करें',
    ta: 'நிவாரணம் ஒப்புதல்',
    kn: 'ಪರಿಹಾರ ಅನುಮೋದಿಸಿ',
    mr: 'मदत मंजूर करा',
    bn: 'ত্রাণ অনুমোদন করুন',
    gu: 'રાહત મંજૂર કરો',
    pa: 'ਮੁਆਵਜ਼ਾ ਮਨਜ਼ੂਰ ਕਰੋ',
  };

  const btnDbtByLang: Record<string, string> = {
    en: 'Authorize DBT',
    te: 'డీబీటీ చెల్లింపు జారీ',
    hi: 'डीबीटी अधिकृत करें',
    ta: 'டிபிடி அனுமதி',
    kn: 'ಡಿಬಿಟಿ ಅಧಿಕೃತಗೊಳಿಸಿ',
    mr: 'डीबीटी जारी करा',
    bn: 'ডিবিটি অনুমোদন',
    gu: 'ડીબીટી અધિકૃત કરો',
    pa: 'ਡੀਬੀਟੀ ਜਾਰੀ ਕਰੋ',
  };

  const disbursedBankByLang: Record<string, string> = {
    en: 'Disbursed to Bank',
    te: 'బ్యాంకు ఖాతాకు జమ అయ్యింది',
    hi: 'खाते में प्रेषित',
    ta: 'வங்கியில் செலுத்தப்பட்டது',
    kn: 'ಬ್ಯಾಂಕಿಗೆ ಜಮಾ ಮಾಡಲಾಗಿದೆ',
    mr: 'बँकेत जमा केले',
    bn: 'ব্যাংক অ্যাকাউন্টে প্রেরিত',
    gu: 'બેંકમાં જમા થયેલ',
    pa: 'ਬੈਂਕ ਖਾਤੇ ਚ ਜਮ੍ਹਾਂ',
  };

  const directorBadgeByLang: Record<string, string> = {
    en: 'Zone VII Director',
    te: 'జోన్ VII డైరెక్టర్',
    hi: 'जोन VII निदेशक',
    ta: 'மண்டலம் VII இயக்குனர்',
    kn: 'ವಲಯ VII ನಿರ್ದೇಶಕ',
    mr: 'झोन VII संचालक',
    bn: 'জোন VII ডিরেক্টর',
    gu: 'ઝોન VII નિયામક',
    pa: 'ਜ਼ੋਨ VII ਡਾਇਰੈਕਟਰ',
  };

  const activeSessionByLang: Record<string, string> = {
    en: 'Active Session',
    te: 'క్రియాశీల సెషన్',
    hi: 'सक्रिय सत्र',
    ta: 'செயலில் உள்ள அமர்வு',
    kn: 'ಸಕ್ರಿಯ ಸೆಷನ್',
    mr: 'सक्रिय सत्र',
    bn: 'সক্রিয় সেশন',
    gu: 'સક્રિય સત્ર',
    pa: 'ਐਕਟਿਵ ਸੈਸ਼ਨ',
  };

  const adjustSluiceBtnByLang: Record<string, string> = {
    en: 'Adjust Sluice',
    te: 'తూము సర్దుబాటు',
    hi: 'गेट समायोजित करें',
    ta: 'மதகு சரிசெய்',
    kn: 'ಗೇಟ್ ಹೊಂದಿಸಿ',
    mr: 'गेट समायोजित करा',
    bn: 'স্লুইস সমন্বয়',
    gu: 'દરવાજો વ્યવસ્થિત કરો',
    pa: 'ਗੇਟ ਐਡਜਸਟ ਕਰੋ',
  };

  const bufferNotesByLang: Record<string, string> = {
    en: 'Buffer available across Kurnool and Guntur central godowns.',
    te: 'కర్నూలు మరియు గుంటూరు కేంద్ర గోదాములలో బఫర్ నిల్వ అందుబాటులో ఉంది.',
    hi: 'कुरनूल और गुंटूर केंद्रीय गोदामों में बफर स्टॉक उपलब्ध।',
    ta: 'கர்னூல் மற்றும் குண்டூர் மத்திய கிடங்குகளில் கையிருப்பு உள்ளது.',
    kn: 'ಕರ್ನೂಲ್ ಮತ್ತು ಗುಂಟೂರು ಕೇಂದ್ರ ಗೋದಾಮುಗಳಲ್ಲಿ ಬಫರ್ ಲಭ್ಯವಿದೆ.',
    mr: 'कुर्नूल आणि गुंटूर मध्यवर्ती गोदामांमध्ये साठा उपलब्ध.',
    bn: 'কুর্নুল এবং গুন্টুর কেন্দ্রীয় গুদামে বাফার উপলব্ধ।',
    gu: 'કુર્નૂલ અને ગુંટુર કેન્દ્રીય ગોદામોમાં બફર સ્ટોક ઉપલબ્ધ.',
    pa: 'ਕੁਰਨੂਲ ਅਤੇ ਗੁੰਟੂਰ ਕੇਂਦਰੀ ਗੋਦਾਮਾਂ ਵਿੱਚ ਬਫ਼ਰ ਸਟਾਕ ਉਪਲਬਧ।',
  };

  const rbkDispatchNotesByLang: Record<string, string> = {
    en: 'Dispatched to 628 Rythu Bharosa Kendras (RBKs).',
    te: '628 రైతు భరోసా కేంద్రాలకు (RBK) పంపిణీ చేయబడింది.',
    hi: '628 रायथु भरोसा केंद्रों (आरबीके) को भेजा गया।',
    ta: '628 ரைத்து பரோசா மையங்களுக்கு (RBK) அனுப்பப்பட்டது.',
    kn: '628 ರೈತು ಭರೋಸಾ ಕೇಂದ್ರಗಳಿಗೆ (ಆರ್‌ಬಿಕೆ) ರವಾನಿಸಲಾಗಿದೆ.',
    mr: '६२८ रयतु भरोसा केंद्रांवर पाठवले.',
    bn: '৬২৮টি রায়থু ভরসা কেন্দ্রে প্রেরিত।',
    gu: '628 રાયથુ ભરોસા કેન્દ્રો (RBKs) પર મોકલવામાં આવ્યા.',
    pa: '628 ਰੈਥੂ ਭਰੋਸਾ ਕੇਂਦਰਾਂ (RBKs) ਨੂੰ ਭੇਜਿਆ ਗਿਆ।',
  };

  const seedDispatchNotesByLang: Record<string, string> = {
    en: 'Bengal Gram JG-11 & Groundnut Dharani distribution active.',
    te: 'శనగలు JG-11 & వేరుశనగ ధరణి విత్తనాల పంపిణీ చురుగ్గా సాగుతోంది.',
    hi: 'चना जेजी-11 एवं मूंगफली धरणी बीज वितरण सक्रिय।',
    ta: 'கொண்டைக்கடலை JG-11 & வேர்க்கடலை தரணி விநியோகம் நடைபெறுகிறது.',
    kn: 'ಕಡಲೆ ಜೆಜಿ-11 ಮತ್ತು ಕಡಲೆಕಾಯಿ ಧಾರಣಿ ವಿತರಣೆ ಸಕ್ರಿಯವಾಗಿದೆ.',
    mr: 'हरभरा JG-11 आणि भुईमूग धारणी बियाणे वाटप सुरू आहे.',
    bn: 'ছোলা JG-11 ও চীনাবাদাম ধারণী বীজ বিতরণ সক্রিয়।',
    gu: 'ચણા JG-11 અને મગફળી ધારણી બિયારણ વિતરણ ચાલુ છે.',
    pa: 'ਛੋਲੇ JG-11 ਅਤੇ ਮੂੰਗਫਲੀ ਧਾਰਣੀ ਬੀਜ ਵੰਡ ਸਰਗਰਮ ਹੈ।',
  };

  const dapTitleByLang: Record<string, string> = {
    en: 'DAP Fertilizer Reserve',
    te: 'డిఎపి (DAP) ఎరువుల నిల్వ',
    hi: 'डीएपी उर्वरक भंडार',
    ta: 'DAP உர இருப்பு',
    kn: 'ಡಿಎಪಿ ರಸಗೊಬ್ಬರ ಸಂಗ್ರಹ',
    mr: 'डीएपी खत साठा',
    bn: 'ডিএপি সার রিজার্ভ',
    gu: 'DAP ખાતર અનામત',
    pa: 'ਡੀਏਪੀ ਖਾਦ ਭੰਡਾਰ',
  };

  const ureaTitleByLang: Record<string, string> = {
    en: 'Urea Subsidized Bags',
    te: 'యూరియా రాయితీ బస్తాలు',
    hi: 'यूरिया रियायती बैग',
    ta: 'மானிய விலை யூரியா பைகள்',
    kn: 'ಯೂರಿಯಾ ಸಬ್ಸಿಡಿ ಚೀಲಗಳು',
    mr: 'युरिया अनुदानित पिशव्या',
    bn: 'ইউরিয়া ভর্তুকিযুক্ত ব্যাগ',
    gu: 'સબસિડીવાળી યુરિયા થેલીઓ',
    pa: 'ਸਬਸਿਡੀ ਵਾਲੇ ਯੂਰੀਆ ਬੈਗ',
  };

  const seedTitleByLang: Record<string, string> = {
    en: 'Certified Seed Packets (Rabi 2026)',
    te: 'ధృవీకరించిన విత్తన ప్యాకెట్లు (రబీ 2026)',
    hi: 'प्रमाणित बीज पैकेट (रबी 2026)',
    ta: 'சான்றளிக்கப்பட்ட விதை பாக்கெட்டுகள் (ரபி 2026)',
    kn: 'ಪ್ರಮಾಣೀಕೃತ ಬೀಜ ಪ್ಯಾಕೆಟ್‌ಗಳು (ರಬಿ 2026)',
    mr: 'प्रमाणित बियाणे पाकिटे (रब्बी २०२६)',
    bn: 'প্রত্যয়িত বীজ প্যাকেট (রবি ২০২৬)',
    gu: 'પ્રમાણિત બિયારણ પેકેટો (રવિ 2026)',
    pa: 'ਪ੍ਰਮਾਣਿਤ ਬੀਜ ਪੈਕੇਟ (ਹਾੜੀ 2026)',
  };

  const handleApprove = (id: string) => {
    setGrievances((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Approved' } : item
      )
    );
    showToast(`Claim ${id} verified and approved for state compensation.`);
  };

  const handleDisburse = (id: string) => {
    setGrievances((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Disbursed' } : item
      )
    );
    showToast(`DBT electronic payment voucher generated for ${id}.`);
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 py-8">
      {/* Officer Welcome Header */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm border border-white/60 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
            alt="S. Ramanathan IAS"
            className="w-16 h-16 rounded-full object-cover ring-4 ring-[#006b2c]/30 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#6bff8f] text-[#002109] text-[11px] font-bold uppercase tracking-wide">
                {directorBadgeByLang[language] || directorBadgeByLang.en}
              </span>
              <span className="text-[12px] text-[#006b2c] font-semibold">
                {activeSessionByLang[language] || activeSessionByLang.en}
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-[#141e17] mt-0.5">
              S. Ramanathan, IAS • {t.dao_welcome_title}
            </h1>
            <p className="text-[13px] text-[#3e4a3d]">
              {t.dao_jurisdiction}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-100 text-[#ba1a1a] border border-black/10 text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t.dao_exit_btn}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm">
          <span className="text-[12px] text-[#3e4a3d] font-medium block">
            {t.dao_kpi_registered}
          </span>
          <span className="text-[26px] font-bold text-[#141e17] mt-1 block tabular-nums">482,910 ha</span>
          <span className="text-[11px] text-[#006b2c] font-semibold">▲ 98.4% Mandals Synced</span>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm">
          <span className="text-[12px] text-[#3e4a3d] font-medium block">
            {t.dao_kpi_pending}
          </span>
          <span className="text-[26px] font-bold text-[#ba1a1a] mt-1 block tabular-nums">142 cases</span>
          <span className="text-[11px] text-[#3e4a3d]">24h target turnaround</span>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm">
          <span className="text-[12px] text-[#3e4a3d] font-medium block">
            {t.dao_kpi_disbursed}
          </span>
          <span className="text-[26px] font-bold text-[#141e17] mt-1 block tabular-nums">₹ 184.2 Cr</span>
          <span className="text-[11px] text-[#006b2c] font-semibold">100% Aadhaar Seeded</span>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm">
          <span className="text-[12px] text-[#3e4a3d] font-medium block">
            {t.dao_kpi_canal}
          </span>
          <span className="text-[26px] font-bold text-[#006e2f] mt-1 block tabular-nums">14,200 cusecs</span>
          <span className="text-[11px] text-[#3e4a3d]">Nagarjuna Sagar &amp; Srisailam</span>
        </div>
      </div>

      {/* Main Command Ledger */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm border border-white/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('grievances')}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'grievances' ? 'bg-[#006b2c] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.dao_tab_loss}
            </button>
            <button
              onClick={() => setActiveTab('subsidies')}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'subsidies' ? 'bg-[#006b2c] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.dao_tab_fertilizer}
            </button>
            <button
              onClick={() => setActiveTab('water-canals')}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'water-canals' ? 'bg-[#006b2c] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.dao_tab_canal}
            </button>
          </div>
          <span className="text-[12px] text-[#3e4a3d] font-mono">
            Statutory Seal: AP-SEC-REV-2026
          </span>
        </div>

        {activeTab === 'grievances' && (
          <div className="overflow-x-auto pt-4">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-[#3e4a3d] font-semibold">
                  <th className="py-3 px-3">
                    {tableHeadersByLang.petitionId[language] || tableHeadersByLang.petitionId.en}
                  </th>
                  <th className="py-3 px-3">
                    {tableHeadersByLang.farmerLoc[language] || tableHeadersByLang.farmerLoc.en}
                  </th>
                  <th className="py-3 px-3">
                    {tableHeadersByLang.cropAffected[language] || tableHeadersByLang.cropAffected.en}
                  </th>
                  <th className="py-3 px-3">
                    {tableHeadersByLang.surveyLoss[language] || tableHeadersByLang.surveyLoss.en}
                  </th>
                  <th className="py-3 px-3">
                    {tableHeadersByLang.assessedRelief[language] || tableHeadersByLang.assessedRelief.en}
                  </th>
                  <th className="py-3 px-3">
                    {tableHeadersByLang.cadreStatus[language] || tableHeadersByLang.cadreStatus.en}
                  </th>
                  <th className="py-3 px-3 text-right">
                    {tableHeadersByLang.actions[language] || tableHeadersByLang.actions.en}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-[#141e17]">
                {grievances.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#006b2c]">
                      {item.id}
                      <span className="block text-[11px] font-sans font-normal text-slate-500">
                        {item.filingDate}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold block">{item.farmerName}</span>
                      <span className="text-[11px] text-slate-500">{item.village}, {item.mandal}</span>
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {item.crop[language] || item.crop.en}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-amber-700">{item.lossPercent}</td>
                    <td className="py-3.5 px-3 font-bold tabular-nums">{item.claimAmount}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          item.status === 'Approved'
                            ? 'bg-[#dcfce7] text-[#15803d]'
                            : item.status === 'Disbursed'
                            ? 'bg-[#6bff8f]/30 text-[#002109]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {statusLabelsByLang[item.status]?.[language] || item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      {item.status === 'Pending Verification' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(item.id)}
                          className="px-3 py-1.5 rounded-full bg-[#006b2c] hover:bg-[#00873a] text-white text-[11px] font-semibold cursor-pointer shadow-sm transition-colors"
                        >
                          {btnApproveByLang[language] || btnApproveByLang.en}
                        </button>
                      )}
                      {item.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleDisburse(item.id)}
                          className="px-3 py-1.5 rounded-full bg-[#111827] hover:bg-black text-white text-[11px] font-semibold cursor-pointer shadow-sm transition-colors"
                        >
                          {btnDbtByLang[language] || btnDbtByLang.en}
                        </button>
                      )}
                      {item.status === 'Disbursed' && (
                        <span className="text-[11px] text-slate-500 italic">
                          {disbursedBankByLang[language] || disbursedBankByLang.en}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'subsidies' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5">
              <span className="text-[12px] text-slate-500 font-semibold block">
                {dapTitleByLang[language] || dapTitleByLang.en}
              </span>
              <span className="text-[22px] font-bold text-slate-900 mt-1 block">18,450 MT</span>
              <p className="text-[12px] text-slate-600 mt-2">
                {bufferNotesByLang[language] || bufferNotesByLang.en}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5">
              <span className="text-[12px] text-slate-500 font-semibold block">
                {ureaTitleByLang[language] || ureaTitleByLang.en}
              </span>
              <span className="text-[22px] font-bold text-slate-900 mt-1 block">42,100 MT</span>
              <p className="text-[12px] text-slate-600 mt-2">
                {rbkDispatchNotesByLang[language] || rbkDispatchNotesByLang.en}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5">
              <span className="text-[12px] text-slate-500 font-semibold block">
                {seedTitleByLang[language] || seedTitleByLang.en}
              </span>
              <span className="text-[22px] font-bold text-slate-900 mt-1 block">96,800 Pkts</span>
              <p className="text-[12px] text-slate-600 mt-2">
                {seedDispatchNotesByLang[language] || seedDispatchNotesByLang.en}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'water-canals' && (
          <div className="space-y-4 pt-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-[15px]">Nagarjuna Sagar Right Main Canal</span>
                <span className="text-[12px] text-slate-500">Feeding Palnadu &amp; Guntur ayacut zones</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-mono font-bold text-emerald-700">8,400 cusecs (Active)</span>
                <button
                  type="button"
                  onClick={() => showToast('Discharge telemetry synced with Irrigation Command Desk')}
                  className="px-3 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold cursor-pointer"
                >
                  {adjustSluiceBtnByLang[language] || adjustSluiceBtnByLang.en}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-black/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-[15px]">Srisailam Right Branch Canal (SRBC)</span>
                <span className="text-[12px] text-slate-500">Feeding Kurnool &amp; Nandyal command zones</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-mono font-bold text-emerald-700">5,800 cusecs (Optimal)</span>
                <button
                  type="button"
                  onClick={() => showToast('SRBC canal gate telemetry verified')}
                  className="px-3 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold cursor-pointer"
                >
                  {adjustSluiceBtnByLang[language] || adjustSluiceBtnByLang.en}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
