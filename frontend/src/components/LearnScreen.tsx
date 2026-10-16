import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LearnScreenProps {
  showToast: (msg: string) => void;
}

interface KnowledgeModule {
  id: string;
  categoryTag: string;
  categoryKey: 'financial' | 'subsidy' | 'crop_care' | 'fpo' | 'cooperative' | 'organic';
  readingTime: string;
  title: Record<string, string>;
  description: Record<string, string>;
  metricLabel: string;
  metricValue: string;
  metricNotes: string[];
  checkpoints: string[];
  actionText: Record<string, string>;
  actionCode: string;
  image: string;
  fullManualContent?: {
    overview: string;
    steps: string[];
    dos: string[];
    donts: string[];
  };
}

export const LearnScreen: React.FC<LearnScreenProps> = ({ showToast }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const { t, language } = useLanguage();
  const [activeManualModal, setActiveManualModal] = useState<KnowledgeModule | null>(null);
  const [showWheatManualModal, setShowWheatManualModal] = useState(false);
  const [showAgronomistModal, setShowAgronomistModal] = useState(false);

  const filterTabs = [
    { key: 'all', label: t.learn_tab_all, icon: 'apps' },
    { key: 'financial', label: t.learn_tab_financial, icon: 'account_balance' },
    { key: 'crop_care', label: t.learn_tab_crop_care, icon: 'event_note' },
    { key: 'fpo', label: t.learn_tab_fpo, icon: 'handshake' },
    { key: 'organic', label: t.learn_tab_organic, icon: 'eco' },
  ];

  const modules: KnowledgeModule[] = [
    {
      id: 'mod-1',
      categoryTag: 'Financial Literacy',
      categoryKey: 'financial',
      readingTime: '6 min read',
      title: {
        en: 'KCC Interest Subvention & Low-Rate Renewal Blueprint',
        te: 'కేసీసీ వడ్డీ రాయితీ & తక్కువ వడ్డీ పునరుద్ధరణ విధానం',
        hi: 'केसीसी ब्याज सबवेंशन और कम दर नवीनीकरण ब्लूप्रिंट',
        ta: 'கேசிசி வட்டி மானியம் & குறைந்த வட்டி புதுப்பித்தல்',
        kn: 'ಕೆಸಿಸಿ ಬಡ್ಡಿ ಸಬ್ವೆನ್ಷನ್ & ಕಡಿಮೆ ದರದ ನವೀಕರಣ',
        mr: 'केसीसी व्याज अनुदान आणि कमी व्याजदर नूतनीकरण',
        bn: 'কেসিসি সুদ ভর্তুকি ও স্বল্প সুদে পুনর্নবীকরণ',
        gu: 'કેસીસી વ્યાજ સબવેન્શન અને નીચા દરે નવીનીકરણ',
        pa: 'ਕੇਸੀਸੀ ਵਿਆਜ ਸਬਵੈਂਸ਼ਨ ਅਤੇ ਘੱਟ ਦਰ ਨਵਿਆਉਣ',
      },
      description: {
        en: 'Master prompt repayment timelines to unlock the 3% prompt repayment incentive, securing an effective 4% annual interest rate under the modified interest subvention scheme (MISS).',
        te: 'సమయానికి తిరిగి చెల్లించి 3% ప్రోత్సాహకం పొంది, 4% వార్షిక వడ్డీ రేటుతో కేసీసీ రుణాలు పొందండి.',
        hi: 'समय पर पुनर्भुगतान करके 3% प्रोत्साहन प्राप्त करें और (MISS) के तहत प्रभावी 4% वार्षिक ब्याज दर सुनिश्चित करें।',
        ta: 'சரியான நேரத்தில் திருப்பிச் செலுத்தி 3% ஊக்கத்தொகையுடன், 4% ஆண்டு வட்டி விகிதத்தில் கடன் பெறுங்கள்.',
        kn: 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಮರುಪಾವತಿಸಿ 3% ಪ್ರೋತ್ಸಾಹ ಪಡೆದು, 4% ವಾರ್ಷಿಕ ಬಡ್ಡಿದರದಲ್ಲಿ ಸಾಲ ನವೀಕರಿಸಿ.',
        mr: 'वेळेवर परतफेड करून 3% सवलत मिळवा आणि 4% वार्षिक दराने कर्ज मिळवा.',
        bn: 'সময়মতো পরিশোধ করে ৩% ইনসেনটিভ পান এবং ৪% বার্ষিক সুদে ঋণ সচল রাখুন।',
        gu: 'સમયસર પુનઃચુકવણી કરીને 3% પ્રોત્સાહન મેળવો અને 4% વાર્ષિક વ્યાજ દરે ધિરાણ મેળવો.',
        pa: 'ਸਮੇਂ ਸਿਰ ਮੋੜ ਕੇ 3% ਪ੍ਰੋਤਸਾਹਨ ਪ੍ਰਾਪਤ ਕਰੋ ਅਤੇ 4% ਸਾਲਾਨਾ ਵਿਆਜ ਦਰ ਪ੍ਰਾਪਤ ਕਰੋ।',
      },
      metricLabel: 'Effective Net Rate',
      metricValue: '4.0% p.a.',
      metricNotes: ['7% Baseline Limit', '-3% Prompt Subvention'],
      checkpoints: [
        'Renewal without recurring land title re-mortgage fees',
        'Scale of Finance index expansion per irrigated acre',
      ],
      actionText: {
        en: 'Read Guide →',
        te: 'మార్గదర్శకం చదవండి →',
        hi: 'गाइड पढ़ें →',
        ta: 'வழிகாட்டியைப் படிக்கவும் →',
        kn: 'ಮಾರ್ಗದರ್ಶಿ ಓದಿ →',
        mr: 'मार्गदर्शिका वाचा →',
        bn: 'গাইড পড়ুন →',
        gu: 'માર્ગદર્શિકા વાંચો →',
        pa: 'ਗਾਈਡ ਪੜ੍ਹੋ →',
      },
      actionCode: 'KCC Guide',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Kisan Credit Card (KCC) offers crop loans up to ₹ 3,00,000 at a baseline 7% interest rate. Timely repayment within 12 months grants an additional 3% prompt repayment incentive (PRI), resulting in a net interest burden of just 4% per annum.',
        steps: [
          'Submit Land Holding record / Passbook extract to nearest PACS or bank branch.',
          'Execute annual renewal before March 31 without incurring fresh mortgage fees.',
          'Avail working capital limit up to ₹ 2 Lakh for animal husbandry or fisheries within overall KCC envelope.',
        ],
        dos: ['Repay principal within the scheduled 365-day crop cycle.', 'Keep mobile number Aadhaar-seeded.'],
        donts: ['Do not pay unofficial agent commissions.', 'Do not let interest accumulate beyond due date.'],
      },
    },
    {
      id: 'mod-2',
      categoryTag: 'Government Subsidies',
      categoryKey: 'subsidy',
      readingTime: '5 min read',
      title: {
        en: 'PM-KISAN DBT Lifecycle & Aadhaar e-KYC Verification',
        te: 'పీఎం-కిసాన్ డీబీటీ & ఆధార్ e-KYC ధృవీకరణ',
        hi: 'पीएम-किसान डीबीटी और आधार e-KYC सत्यापन',
        ta: 'பிஎம்-கிசான் DBT & ஆதார் e-KYC சரிபார்ப்பு',
        kn: 'ಪಿಎಂ-ಕಿಸಾನ್ ಡಿಬಿಟಿ & ಆಧಾರ್ e-KYC ಪರಿಶೀಲನೆ',
        mr: 'पीएम-किसान डीबीटी आणि आधार e-KYC पडताळणी',
        bn: 'পিএম-কিষাণ ডিবিটি ও আধার e-KYC যাচাইকরণ',
        gu: 'પીએમ-કિસાન ડીબીટી અને આધાર e-KYC ચકાસણી',
        pa: 'ਪੀਐਮ-ਕਿਸਾਨ ਡੀਬੀਟੀ ਅਤੇ ਆਧਾਰ e-KYC ਤਸਦੀਕ',
      },
      description: {
        en: 'Step-by-step resolution roadmap for resolving PFMS bank account invalidations, land seeding corrections, and facial recognition mobile e-KYC protocols for uninterrupted ₹ 6,000/year credits.',
        te: 'PFMS బ్యాంక్ ఖాతా సమస్యలు, భూమి నమోదు సరిదిద్దడం మరియు నిరంతరాయ ₹ 6,000 జమ కోసం ఆధార్ e-KYC మార్గదర్శి.',
        hi: 'PFMS बैंक सुधार, लैंड सीडिंग और निर्बाध ₹ 6,000/वर्ष जमा के लिए फेस e-KYC समाधान।',
        ta: 'PFMS வங்கி கணக்கு சிக்கல்கள் மற்றும் தடையில்லா ₹ 6,000 பெறுவதற்கான வழிகாட்டி.',
        kn: 'PFMS ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಮಸ್ಯೆಗಳ ನಿವಾರಣೆ ಮತ್ತು ₹ 6,000 ನೇರ ಜಮೆಗಾಗಿ e-KYC ಪರಿಹಾರಗಳು.',
        mr: 'बँक खाते दुरुस्ती, लँड सीडिंग आणि वार्षिक ₹ ६,००० च्या लाभासाठी e-KYC मार्गदर्शक.',
        bn: 'PFMS সমস্যা সমাধান এবং নিরবচ্ছিন্ন ₹ ৬,০০০ প্রাপ্তির জন্য সহজ e-KYC গাইড।',
        gu: 'બેંક ખાતાની ભૂલો સુધારીને વાર્ષિક ₹ 6,000 જમા કરાવવા માટે e-KYC માર્ગદર્શિકા.',
        pa: 'ਬੈਂਕ ਖਾਤੇ ਦੀਆਂ ਖ਼ਾਮੀਆਂ ਠੀਕ ਕਰਕੇ ਸਾਲਾਨਾ ₹ 6,000 ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ e-KYC ਗਾਈਡ।',
      },
      metricLabel: 'Direct Income Transfer',
      metricValue: '₹ 6,000 / Year',
      metricNotes: ['Installment 1: Apr–Jul', 'Installment 2: Aug–Nov', 'Installment 3: Dec–Mar'],
      checkpoints: [
        'NPCI DBT Aadhaar-bank account linking checklist',
        'Self-registration correction via Common Service Centres',
      ],
      actionText: {
        en: 'View Resolution Steps →',
        te: 'పరిష్కార దశలు చూడండి →',
        hi: 'समाधान चरण देखें →',
        ta: 'வழிமுறைகளைப் பார்க்கவும் →',
        kn: 'ಪರಿಹಾರ ಹಂತಗಳನ್ನು ವೀಕ್ಷಿಸಿ →',
        mr: 'पायऱ्या तपासा →',
        bn: 'সমাধানের ধাপ দেখুন →',
        gu: 'પગલાંઓ જુઓ →',
        pa: 'ਕਦਮ ਦੇਖੋ →',
      },
      actionCode: 'DBT Portal',
      image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Ensures eligible landholder farmers receive three equal 4-monthly installments directly into their Aadhaar-enabled bank accounts without intermediaries.',
        steps: [
          'Verify NPCI bank account mapping status at the nearest service centre or bank.',
          'Complete facial recognition e-KYC via the official PM-KISAN mobile application.',
          'Update land seeding status with local Revenue Officer (VRO/Tahsildar).',
        ],
        dos: ['Check e-KYC status before every installment release.', 'Ensure mobile number is linked to Aadhaar.'],
        donts: ['Never disclose OTP or biometric tokens over unauthorized calls.'],
      },
    },
    {
      id: 'mod-3',
      categoryTag: 'ICAR Crop Care',
      categoryKey: 'crop_care',
      readingTime: '7 min read',
      title: {
        en: 'Optimal Drip Fertigation & Pest Control Protocols',
        te: 'బిందు సేద్యం ఎరువుల యాజమాన్యం & పురుగుల నివారణ',
        hi: 'सटीक टपक उर्वरक अनुप्रयोग एवं कीट नियंत्रण',
        ta: 'சொட்டு நீர் உர பாசனம் மற்றும் பூச்சி கட்டுப்பாடு',
        kn: 'ನಿಖರ ಹನಿ ನೀರಾವರಿ ಗೊಬ್ಬರ ಮತ್ತು ಕೀಟ ನಿಯಂತ್ರಣ',
        mr: 'अचूक ठिबक खत व्यवस्थापन आणि कीड नियंत्रण',
        bn: 'সঠিক ড্রিপ ফার্টিগেশন এবং কীটপতঙ্গ নিয়ন্ত্রণ',
        gu: 'ટપક પિયત ખાતર વ્યવસ્થાપન અને જીવાત નિયંત્રણ',
        pa: 'ਤੁਪਕਾ ਸਿੰਚਾਈ ਖਾਦ ਪ੍ਰਬੰਧਨ ਅਤੇ ਕੀੜੇ-ਮਕੌੜੇ ਰੋਕਥਾਮ',
      },
      description: {
        en: 'Calibrated water-soluble fertilizer ratios (19:19:19 and 0:52:34) via venturi injectors, combined with integrated pest management (IPM) for cash crops.',
        te: 'వెంచురీ ఇంజెక్టర్ల ద్వారా నీటిలో కరిగే ఎరువుల (19:19:19 మరియు 0:52:34) నిష్పత్తులు మరియు సమగ్ర పురుగు నివారణ పద్ధతులు.',
        hi: 'वेंचुरी इंजेक्टरों द्वारा घुलनशील उर्वरकों (19:19:19 और 0:52:34) का सटीक उपयोग और एकीकृत कीट प्रबंधन।',
        ta: 'வென்ચூரி அமைப்பின் மூலம் உர பாசனம் மற்றும் ஒருங்கிணைந்த பூச்சி மேலாண்மை.',
        kn: 'ವೆಂಚುರಿ ಇಂಜೆಕ್ಟರ್ ಮೂಲಕ ಕರಗುವ ಗೊಬ್ಬರಗಳ ನಿಖರ ಬಳಕೆ ಮತ್ತು ಕೀಟ ನಿರ್ವಹಣೆ.',
        mr: 'वेंचुरी प्रणालीद्वारे विद्राव्य खतांचे अचूक नियोजन आणि एकात्मिक कीड नियंत्रण.',
        bn: 'ভেঞ্চুরি ইনজেক্টরের মাধ্যমে দ্রবণীয় সারের সঠিক প্রয়োগ এবং সমন্বিত বালাই দমন।',
        gu: 'વેન્ચુરી દ્વારા દ્રાવ્ય ખાતરોનો ચોક્કસ ઉપયોગ અને સંકલિત જીવાત નિયંત્રણ.',
        pa: 'ਵੈਂਚੂਰੀ ਇੰਜੈਕਟਰ ਰਾਹੀਂ ਘੁਲਣਸ਼ੀਲ ਖਾਦਾਂ ਦੀ ਸਹੀ ਵਰਤੋਂ ਅਤੇ ਕੀੜੇ-ਮਕੌੜੇ ਕੰਟਰੋਲ।',
      },
      metricLabel: 'Water & Fertilizer Efficiency',
      metricValue: '+45% Utilization',
      metricNotes: ['Venturi Ratio: 5g / Litre Flow', 'Pest Threshold: < 15 Aphids / Plant'],
      checkpoints: [
        'Trichogramma bio-parasitoid cards installation schedule',
        'Pressure compensator dripper cleaning with citric acid',
      ],
      actionText: {
        en: 'View Sowing & Spray Matrix →',
        te: 'పిచికారీ షెడ్యూల్ చూడండి →',
        hi: 'छिड़काव अनुसूची देखें →',
        ta: 'தெளிப்பு அட்டவணையைப் பார்க்கவும் →',
        kn: 'ಸಿಂಪರಣೆ ವೇಳಾಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ →',
        mr: 'फवारणी वेळापत्रक पहा →',
        bn: 'স্প্রে সময়সূচী দেখুন →',
        gu: 'છંટકાવ સમયપત્રક જુઓ →',
        pa: 'ਛਿੜਕਾਅ ਅਨੁਸੂਚੀ ਦੇਖੋ →',
      },
      actionCode: 'ICAR Manual',
      image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Drip fertigation delivers soluble macro and micronutrients directly to the plant root zone, preventing leaching and saving up to 50% irrigation water while boosting yields.',
        steps: [
          'Dissolve completely soluble NPK grades in non-corrosive plastic mixing tanks.',
          'Inject fertilizer solution during the middle third of the irrigation cycle.',
          'Flush drip lines with clear water for 15 minutes post-injection to prevent emitter clogging.',
        ],
        dos: ['Flush filter screens regularly.', 'Test irrigation water pH (optimal: 6.0 to 6.8).'],
        donts: ['Never mix calcium nitrate with sulphate or phosphate fertilizers in the same tank.'],
      },
    },
    {
      id: 'mod-4',
      categoryTag: 'PACS & FPO Operations',
      categoryKey: 'fpo',
      readingTime: '9 min read',
      title: {
        en: 'FPO Collective Grain Marketing & Direct Mandi Bargaining',
        te: 'రైతు ఉత్పత్తి సంఘాల (FPO) ఉమ్మడి మార్కెటింగ్ విధానం',
        hi: 'एफपीओ सामूहिक अनाज विपणन और सीधी मंडी सौदेबाजी',
        ta: 'உழவர் உற்பத்தியாளர் நிறுவன கூட்டு சந்தைப்படுத்தல்',
        kn: 'ಎಫ್‌ಪಿಒ ಸಾಮೂಹಿಕ ಧಾನ್ಯ ಮಾರುಕಟ್ಟೆ ಮತ್ತು ನೇರ ಚೌಕಾಶಿ',
        mr: 'एफपीओ सामूहिक धान्य विपणन आणि थेट बाजार सौदेबाजी',
        bn: 'এফপিও যৌথ শস্য বিপণন এবং সরাসরি বাজার দর কষাকষি',
        gu: 'એફપીઓ સામૂહિક અનાજ માર્કેટિંગ અને સીધા બજાર સોદા',
        pa: 'ਐਫਪੀਓ ਸਮੂਹਿਕ ਅਨਾਜ ਮੰਡੀਕਰਨ ਅਤੇ ਸਿੱਧਾ ਮੰਡੀ ਸੌਦਾ',
      },
      description: {
        en: 'Overcome commission agent (arthiya) intermediaries by aggregating lot sizes, leveraging e-NAM digital national e-auctions, and accessing institutional bulk purchase contracts.',
        te: 'దళారులను అధిగమించి e-NAM ద్వారా ఎక్కువ లాభం పొందడానికి ఉమ్మడి విక్రయాల వ్యూహం.',
        hi: 'बिचौलियों से बचकर e-NAM के माध्यम से अधिकतम मूल्य प्राप्त करने की रणनीति।',
        ta: 'இடைத்தரகர்களைத் தவிர்த்து e-NAM மூலம் அதிக லாபம் ஈட்டும் உத்தி.',
        kn: 'ಮಧ್ಯವರ್ತಿಗಳನ್ನು ತಪ್ಪಿಸಿ e-NAM ಮೂಲಕ ಗರಿಷ್ಠ ಬೆಲೆ ಪಡೆಯುವ ತಂತ್ರಗಳು.',
        mr: 'दलालांशिवाय थेट e-NAM द्वारे चांगला नफा मिळविण्याची कार्यपद्धती.',
        bn: 'মধ্যস্বত্বভোগীদের এড়িয়ে e-NAM এর মাধ্যমে সর্বোচ্চ দর পাওয়ার কৌশল।',
        gu: 'વચેટીયાઓ વિના e-NAM દ્વારા વધુ નફો મેળવવાની પદ્ધતિ.',
        pa: 'ਵਿਚੋਲਿਆਂ ਨੂੰ ਛੱਡ ਕੇ e-NAM ਰਾਹੀਂ ਵੱਧ ਮੁਨਾਫਾ ਕਮਾਉਣ ਦਾ ਤਰੀਕਾ।',
      },
      metricLabel: 'Net Price Realization',
      metricValue: '+18.5% Gain',
      metricNotes: ['Local Traders: 65% Value', 'FPO Clustered: 83.5%'],
      checkpoints: [
        'Bypassing the standard 8–12% commission deductions',
        'Electronic assay-based lot certification at mandi',
      ],
      actionText: {
        en: 'Explore FPO Playbook →',
        te: 'ఎఫ్పీవో విధానం చూడండి →',
        hi: 'एफपीओ हैंडबुक देखें →',
        ta: 'வழிகாட்டியைப் பார்க்கவும் →',
        kn: 'ಕೈಪಿಡಿ ವೀಕ್ಷಿಸಿ →',
        mr: 'पुस्तिका पहा →',
        bn: 'হ্যান্ডবুক দেখুন →',
        gu: 'માર્ગદર્શિકા જુઓ →',
        pa: 'ਗਾਈਡ ਦੇਖੋ →',
      },
      actionCode: 'e-NAM Standard',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Farmer Producer Organisations aggregate member yields, enabling scientific grading, moisture testing, and bulk warehouse receipts to secure premium prices.',
        steps: [
          'Form cluster aggregation committees with minimum 50 shareholder farmers.',
          'Assay crop moisture to under 12% before dispatching to electronic mandi gates.',
          'List lots directly on e-NAM to invite competing bids from corporate buyers nationwide.',
        ],
        dos: ['Maintain transparent weighbridge records.', 'Keep audited share capital books.'],
        donts: ['Never sell damp grains below national moisture standards.'],
      },
    },
    {
      id: 'mod-5',
      categoryTag: 'Cold Chain Logistics',
      categoryKey: 'cooperative',
      readingTime: '6 min read',
      title: {
        en: 'Solar Cold Storage Operations & Post-Harvest Preservation',
        te: 'సౌర విద్యుత్ శీతల గిడ్డంగులు & నిల్వ నిర్వహణ',
        hi: 'सौर कोल्ड स्टोरेज संचालन एवं कटाई उपरांत संरक्षण',
        ta: 'சூரிய சக்தி குளிர்பதன சேமிப்பு மற்றும் பராமரிப்பு',
        kn: 'ಸೌರ ಶೀತಲ ಸಂಗ್ರಹಾಗಾರ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಸಂರಕ್ಷಣೆ',
        mr: 'सौर कोल्ड स्टोरेज कार्यपद्धती आणि पीक साठवणूक',
        bn: 'সৌর কোল্ড স্টোরেজ পরিচালনা এবং ফসল সংরক্ষণ',
        gu: 'સોલાર કોલ્ડ સ્ટોરેજ સંચાલન અને પાક સંગ્રહ',
        pa: 'ਸੌਰ ਕੋਲਡ ਸਟੋਰੇਜ ਸੰਚਾਲਨ ਅਤੇ ਫ਼ਸਲ ਸਾਂਭ-ਸੰਭਾਲ',
      },
      description: {
        en: 'Prevent distress sales during peak harvest glut. Micro-climate temperature (2°C to 8°C) and 90% RH regulation protocols for perishables like tomatoes, chillies, and mangoes.',
        te: 'కోతల సమయంలో తక్కువ ధరలకు అమ్ముకోకుండా టమాటాలు, మిరపకాయలు ఎక్కువ రోజులు నిల్వ ఉంచే సౌర శీతల పద్ధతులు.',
        hi: 'टमाटर, मिर्च आदि खराब होने वाली फसलों को सुरक्षित रखने हेतु 2°C से 8°C तापमान प्रोटोकॉल।',
        ta: 'தக்காளி, மிளகாய் போன்ற அழுகக்கூடிய பயிர்களைப் பாதுகாக்க சூரிய குளிர்பதன முறைகள்.',
        kn: 'ಟೊಮೆಟೊ, ಮೆಣಸಿನಕಾಯಿ ಮುಂತಾದ ಬೆಳೆಗಳನ್ನು ಹೆಚ್ಚು ದಿನ ಸಂರಕ್ಷಿಸಲು ಸೌರ ಶೀತಲ ಸಂಗ್ರಹಣೆ.',
        mr: 'टोमॅटो, मिरची आदी नाशवंत पिके सुरक्षित ठेवण्यासाठी सौर शीतगृह मार्गदर्शक.',
        bn: 'টমেটো, লঙ্কা ইত্যাদি পচনশীল ফসল সংরক্ষণে সৌর কোল্ড স্টোরেজ প্রযুক্তি।',
        gu: 'ટામેટા, મરચાં જેવા નાશવંત પાકોના સંગ્રહ માટે સોલાર કોલ્ડ સ્ટોરેજ માર્ગદર્શિકા.',
        pa: 'ਟਮਾਟਰ, ਮਿਰਚਾਂ ਆਦਿ ਖ਼ਰਾਬ ਹੋਣ ਵਾਲੀਆਂ ਫ਼ਸਲਾਂ ਦੀ ਸਾਂਭ ਲਈ ਸੌਰ ਕੋਲਡ ਸਟੋਰੇਜ ਵਿਧੀ।',
      },
      metricLabel: 'Shelf-Life Extension',
      metricValue: '4.5x Factor',
      metricNotes: ['Ambient Storage: 4 Days', 'Micro-Chilled: 21 Days'],
      checkpoints: [
        'Pre-cooling protocols within 4 hours of field harvesting',
        'Ethylene scrubber maintenance and air ventilation logs',
      ],
      actionText: {
        en: 'Read Cold-Chain Manual →',
        te: 'కోల్డ్ చైన్ గైడ్ చదవండి →',
        hi: 'कोल्ड चेन मैनुअल पढ़ें →',
        ta: 'கையேட்டைப் படிக்கவும் →',
        kn: 'ಕೈಪಿಡಿ ಓದಿ →',
        mr: 'पुस्तिका वाचा →',
        bn: 'ম্যানুয়াল পড়ুন →',
        gu: 'માર્ગદર્શિકા વાંચો →',
        pa: 'ਮੈਨੂਅਲ ਪੜ੍ਹੋ →',
      },
      actionCode: 'PMKSY Cold-Chain',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Decentralised solar-powered micro cold rooms allow farming clusters to safely hold perishable produce for up to 30 days until mandi rates recover.',
        steps: [
          'Pre-cool harvested crops under shaded packing sheds immediately after picking.',
          'Sort and pack in food-grade perforated plastic crates.',
          'Avail 35–50% capital subsidy under the Agriculture Infrastructure Fund (AIF).',
        ],
        dos: ['Regularly inspect temperature sensors.', 'Stack crates on pallets away from floor dampness.'],
        donts: ['Do not overload cold rooms beyond 85% capacity.'],
      },
    },
    {
      id: 'mod-6',
      categoryTag: 'Organic Soil Vitality',
      categoryKey: 'organic',
      readingTime: '8 min read',
      title: {
        en: 'Jeevamrutha Preparation & Soil Microbial Vitality',
        te: 'జీవామృతం తయారీ & నేల సారం పెంపుదల',
        hi: 'जीवामृत निर्माण एवं मृदा सूक्ष्मजीव संवर्धन',
        ta: 'ஜீவாமிர்தம் தயாரிப்பு மற்றும் மண் வளம்',
        kn: 'ಜೀವಾಮೃತ ತಯಾರಿಕೆ ಮತ್ತು ಮಣ್ಣಿನ ಫಲವತ್ತತೆ',
        mr: 'जीवामृत निर्मिती आणि जमिनीची सुपीकता',
        bn: 'জীবামৃত প্রস্তুতি এবং মাটির উর্বরতা বৃদ্ধি',
        gu: 'જીવામૃત બનાવવાની રીત અને જમીનની ફળદ્રુપતા',
        pa: 'ਜੀਵਾਮ੍ਰਿਤ ਤਿਆਰ ਕਰਨ ਦੀ ਵਿਧੀ ਅਤੇ ਮਿੱਟੀ ਦੀ ਉਪਜਾਊ ਸ਼ਕਤੀ',
      },
      description: {
        en: 'Standardized ICAR-certified fermentation ratios for liquid Jeevamrutha and dry Ghanajeevamrutha, cultivating native aerobic beneficial bacteria to fix nitrogen naturally.',
        te: 'దేశవాళీ ఆవు పేడ, మూత్రం, బెల్లం మరియు పప్పు పిండితో సహజ సేంద్రీయ నత్రజని అందించే జీవామృతం తయారీ విధానం.',
        hi: 'देशी गाय के गोबर, गोमूत्र, गुड़ और बेसन से प्राकृतिक रूप से नाइट्रोजन व फास्फोरस संवर्धन हेतु जीवामृत नुस्खा।',
        ta: 'நாட்டு மாட்டு சாணம் மற்றும் சிறுநீரைப் பயன்படுத்தி இயற்கை நுண்ணுயிர் ஜீவாமிர்தம் தயாரிக்கும் முறை.',
        kn: 'ದೇಶಿ ಹಸುವಿನ ಸಗಣಿ, ಗೋಮೂತ್ರ, ಬೆಲ್ಲ ಮತ್ತು ಕಡಲೆಹಿಟ್ಟಿನಿಂದ ಜೀವಾಮೃತ ತಯಾರಿಸುವ ವಿಧಾನ.',
        mr: 'गायीचे शेण, गोमूत्र, गूळ आणि बेसनापासून जीवामृत तयार करण्याची शास्त्रोक्त पद्धत.',
        bn: 'দেশি গরুর গোবর ও গোমূত্র দিয়ে প্রাকৃতিকভাবে নাইট্রোজেন বাড়াতে জীবামৃত প্রস্তুতি।',
        gu: 'દેશી ગાયના છાણ અને ગૌમૂત્ર દ્વારા જૈવિક નાઇટ્રોજન વધારવા માટે જીવામૃત પદ્ધતિ.',
        pa: 'ਦੇਸੀ ਗਾਂ ਦੇ ਗੋਹੇ ਅਤੇ ਗਊ-ਮੂਤਰ ਰਾਹੀਂ ਕੁਦਰਤੀ ਨਾਈਟ੍ਰੋਜਨ ਵਧਾਉਣ ਲਈ ਜੀਵਾਮ੍ਰਿਤ ਵਿਧੀ।',
      },
      metricLabel: 'Standard 200L Drum Batch',
      metricValue: '1 Acre Application',
      metricNotes: ['10 kg Desi Cow Dung', '10 Litres Cow Urine', '2 kg + 2 kg Jaggery & Besan'],
      checkpoints: [
        'Azotobacter and PSB (Phosphate Solubilizing Bacteria) inoculation',
        'Soil organic carbon (SOC) growth benchmarks across 3 harvest seasons',
      ],
      actionText: {
        en: 'Step-by-step Recipe Guide →',
        te: 'తయారీ విధానం చూడండి →',
        hi: 'तैयारी विधि देखें →',
        ta: 'செய்முறை வழிகாட்டி →',
        kn: 'ತಯಾರಿಕಾ ವಿಧಾನ ವೀಕ್ಷಿಸಿ →',
        mr: 'कृती पहा →',
        bn: 'প্রস্তুত প্রণালী দেখুন →',
        gu: 'બનાવવાની રીત જુઓ →',
        pa: 'ਵਿਧੀ ਦੇਖੋ →',
      },
      actionCode: 'PKVY Organic',
      image: 'https://images.unsplash.com/photo-1592417817098-8f3d69104a47?auto=format&fit=crop&w=800&q=80',
      fullManualContent: {
        overview:
          'Jeevamrutha acts as a natural microbial inoculant that stimulates indigenous earthworms and beneficial soil microorganisms, reducing chemical fertilizer dependence by 50–100%.',
        steps: [
          'Mix 10 kg fresh indigenous (Desi) cow dung with 10 litres cow urine in a 200L barrel.',
          'Add 2 kg organic jaggery, 2 kg pulse flour (besan), and a handful of fertile virgin soil from tree roots.',
          'Fill drum with clean water, stir clockwise twice daily with a wooden stick, and ferment in shade for 48–72 hours.',
        ],
        dos: ['Apply fermented liquid within 7 days via irrigation channels or foliar spray.'],
        donts: ['Never store in direct scorching sunlight.', 'Do not mix with chemical pesticides.'],
      },
    },
  ];

  const filteredModules = modules.filter((m) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'financial') return m.categoryKey === 'financial' || m.categoryKey === 'subsidy';
    if (selectedFilter === 'crop_care') return m.categoryKey === 'crop_care';
    if (selectedFilter === 'fpo') return m.categoryKey === 'fpo' || m.categoryKey === 'cooperative';
    if (selectedFilter === 'organic') return m.categoryKey === 'organic';
    return true;
  });

  return (
    <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* 1. Main Title Banner Card */}
      <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/60 p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#006b2c]">
          <span className="material-symbols-outlined text-[17px] text-[#007432]">verified</span>
          <span>{t.learn_gateway}</span>
        </div>
        <div className="max-w-3xl space-y-2">
          <h1 className="text-[34px] sm:text-[44px] font-bold text-[#111827] tracking-tight leading-tight">
            {t.learn_title}
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#4b5563] leading-relaxed">
            {t.learn_subtitle}
          </p>
        </div>

        {/* Filter Pills Toolbar */}
        <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1 glass-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-2xs ${
                selectedFilter === tab.key
                  ? 'bg-[#132a1e] text-white'
                  : 'bg-white/80 hover:bg-white text-[#374151] border border-gray-200/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Featured Card: ICAR Spotlight 2026 */}
      <div className="w-full bg-white/85 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/70 p-6 sm:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-md group">
            <img
              src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=80"
              alt="Wheat Rust Prevention"
              className="w-full h-[260px] sm:h-[300px] object-cover group-hover:scale-102 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-extrabold text-[#111827] flex items-center gap-1 shadow-sm">
              <span className="text-amber-500">★</span>
              <span>ICAR Spotlight 2026</span>
            </div>
            <div className="absolute bottom-3 inset-x-3 p-3 rounded-xl bg-black/75 backdrop-blur-md text-white flex items-center justify-between text-[11.5px]">
              <div>
                <span className="text-gray-300 text-[10px] block uppercase font-medium">
                  Recommended Timing
                </span>
                <span className="font-bold">Crown Root Stage (21–25 DAS)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[10.5px]">
                Optimal Window
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-extrabold tracking-wide uppercase">
                {t.learn_hero_tag}
              </span>
              <span className="flex items-center gap-1 text-[11.5px] font-medium text-gray-500">
                <span className="material-symbols-outlined text-[15px]">schedule</span>
                <span>8 min read</span>
              </span>
              <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-[#007432] border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                <span>Verified by ICAR–IARI</span>
              </span>
            </div>

            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#111827] tracking-tight leading-snug">
              {t.learn_hero_title}
            </h2>
            <p className="text-[13.5px] sm:text-[14px] text-[#4b5563] leading-relaxed">
              {t.learn_hero_desc}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Preventive Fungicide
                </span>
                <span className="text-[14px] font-extrabold text-[#111827] block mt-0.5">
                  Propiconazole 25 EC
                </span>
                <span className="text-[11px] text-[#007432] font-semibold">1ml / Litre Water</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Irrigation Critical Point
                </span>
                <span className="text-[14px] font-extrabold text-[#111827] block mt-0.5">
                  CRI Stage (21 DAS)
                </span>
                <span className="text-[11px] text-[#007432] font-semibold">Crucial for Root Branching</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Yield Protection
                </span>
                <span className="text-[14px] font-extrabold text-[#15803d] block mt-0.5">
                  +18–24 Qtl/Ha
                </span>
                <span className="text-[11px] text-gray-500">Compared to delayed spray</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowWheatManualModal(true)}
                className="px-5 py-2.5 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[13px] shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">menu_book</span>
                <span>{t.learn_read_manual}</span>
              </button>
              <div className="flex items-center gap-1.5 text-[12px] text-gray-600 font-medium">
                <span className="material-symbols-outlined text-[17px] text-[#007432]">bookmark</span>
                <span>{t.learn_saved_farmers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Curated Educational Modules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827]">
              {t.learn_curated_title}
            </h2>
            <p className="text-[13px] text-[#4b5563]">
              {t.learn_curated_sub}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((item) => {
            const modTitle = item.title[language] || item.title.en;
            const modDesc = item.description[language] || item.description.en;
            const modAction = item.actionText[language] || item.actionText.en;
            return (
              <div
                key={item.id}
                className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/70 overflow-hidden flex flex-col justify-between hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img src={item.image} alt={modTitle} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 px-3 py-0.5 rounded-full bg-emerald-100 text-[#007432] text-[10.5px] font-extrabold shadow-xs">
                      {item.categoryTag}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10.5px] font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      <span>{item.readingTime}</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3.5">
                    <h3 className="text-[16px] font-bold text-[#111827] leading-snug">
                      {modTitle}
                    </h3>
                    <p className="text-[12.5px] text-[#4b5563] line-clamp-3 leading-relaxed">
                      {modDesc}
                    </p>

                    <div className="p-3 rounded-2xl bg-[#f0faf2] border border-emerald-100 space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          {item.metricLabel}
                        </span>
                        <span className="text-[15px] font-extrabold text-[#111827]">
                          {item.metricValue}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-600 font-semibold border-t border-emerald-200/60 pt-1">
                        {item.metricNotes.map((note, idx) => (
                          <span key={idx} className={idx === 1 ? 'text-[#007432]' : ''}>
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11.5px] text-[#374151]">
                      {item.checkpoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[#007432] shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveManualModal(item)}
                    className="text-[13px] font-bold text-[#007432] hover:text-[#005a24] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{modAction}</span>
                  </button>
                  <span className="text-[11px] font-semibold text-gray-500">{item.actionCode}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Strip: State Agronomist Advisory & ICAR Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 bg-white/85 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/70 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold text-[#111827] uppercase tracking-wider">
                {t.learn_agronomist_title}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#007432] text-[10.5px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#007432] animate-pulse"></span>
                <span>KVK Live</span>
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80"
                alt="Dr. Radha V. Sarma"
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-300 shadow-2xs shrink-0"
              />
              <div>
                <h4 className="text-[16px] font-bold text-[#111827] leading-tight">
                  Dr. Radha V. Sarma
                </h4>
                <p className="text-[12px] text-gray-500">{t.learn_agronomist_role}</p>
                <span className="inline-block mt-1 text-[11px] font-bold text-[#007432]">
                  Toll-Free Helpline: 1800-180-1551
                </span>
              </div>
            </div>

            <p className="text-[12.5px] text-gray-600 leading-relaxed pt-1">
              {t.learn_agronomist_desc}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAgronomistModal(true)}
            className="w-full py-3 rounded-full bg-[#007432] hover:bg-[#005a24] text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            <span>{t.learn_request_assistance}</span>
          </button>
        </div>

        <div className="lg:col-span-8 bg-white/85 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] border border-white/70 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <span className="text-[10.5px] font-bold text-[#007432] uppercase tracking-wider block">
                  ICAR PREDICTIVE TELEMETRY
                </span>
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#111827]">
                  {t.learn_telemetry_title}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-white text-[11px] font-bold text-gray-800 border border-gray-200 shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#007432]"></span>
                <span>{t.learn_telemetry_status}</span>
              </span>
            </div>

            <div className="w-full h-32 sm:h-36 pt-2">
              <svg className="w-full h-full" viewBox="0 0 600 120" fill="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 30,85 C 120,70 170,25 240,25 C 310,25 360,60 430,60 C 500,60 540,15 570,15 L 570,120 L 30,120 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M 30,85 C 120,70 170,25 240,25 C 310,25 360,60 430,60 C 500,60 540,15 570,15"
                  stroke="#15803d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="30" cy="85" r="5" fill="#ffffff" stroke="#15803d" strokeWidth="3" />
                <circle cx="240" cy="25" r="6" fill="#ffffff" stroke="#15803d" strokeWidth="3.5" />
                <circle cx="430" cy="60" r="5" fill="#ffffff" stroke="#15803d" strokeWidth="3" />
                <circle cx="570" cy="15" r="6" fill="#ffffff" stroke="#15803d" strokeWidth="3.5" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div className="p-3 rounded-2xl bg-white/70 border border-gray-100 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                October Sowing Baseline
              </span>
              <span className="text-[16px] font-extrabold text-[#111827] block mt-0.5">
                54% Moisture
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#dcfce7] border border-[#86efac] text-center">
              <span className="text-[10px] font-bold text-[#15803d] uppercase tracking-wider block">
                November Vegetative Peak
              </span>
              <span className="text-[16px] font-extrabold text-[#15803d] block mt-0.5">
                68% (+14% Optimal)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 border border-gray-100 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                December Flowering Target
              </span>
              <span className="text-[16px] font-extrabold text-[#111827] block mt-0.5">
                62% Moisture
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 border border-gray-100 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                January Maturity Forecast
              </span>
              <span className="text-[16px] font-extrabold text-[#111827] block mt-0.5">
                74% High Yield
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Wheat Rust Full Manual */}
      {showWheatManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-[#007432] text-[10.5px] font-extrabold tracking-wide uppercase">
                  ICAR–IARI SCIENTIFIC HANDBOOK 2026
                </span>
                <h3 className="text-[22px] font-bold text-[#111827] mt-1">
                  Rabi Season Wheat Rust Prevention Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWheatManualModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-[13.5px] text-gray-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <h4 className="font-bold text-[#007432] text-[14px] mb-1">Critical Stages &amp; Action Plan</h4>
                <p>
                  Yellow rust (Puccinia striiformis) appears as bright yellow pustules arranged in stripes on leaves.
                  Spray Propiconazole 25 EC @ 0.1% (1ml per litre water) at the initial appearance of symptoms. Repeat
                  after 15 days if cloudy conditions persist.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Step-by-Step Implementation:</h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Survey border crop rows weekly during December cold spells.</li>
                  <li>Use knapsack or tractor-mounted boom sprayers with flat-fan nozzles for uniform droplet deposition.</li>
                  <li>Maintain 500 litres of water per hectare for complete foliage coverage.</li>
                  <li>Do not spray during morning dew or preceding rain events.</li>
                </ol>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-[11px] font-bold text-green-800 uppercase block">Dos</span>
                  <span className="text-[12px] text-green-900">
                    Sow rust-resistant varieties like HD-2967, HD-3086, DBW-187, or PBW-725.
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 uppercase block">Don'ts</span>
                  <span className="text-[12px] text-amber-900">
                    Avoid excessive nitrogenous fertilizer application which fosters vegetative succulence and fungal susceptibility.
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowWheatManualModal(false);
                  showToast('Handbook downloaded to offline device storage.');
                }}
                className="px-5 py-2.5 rounded-full bg-[#007432] text-white font-bold text-[13px] hover:bg-[#005a24] cursor-pointer"
              >
                Download PDF Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Module Specific Manual */}
      {activeManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-[#007432] text-[10.5px] font-extrabold tracking-wide uppercase">
                  {activeManualModal.categoryTag}
                </span>
                <h3 className="text-[20px] font-bold text-[#111827] mt-1">
                  {activeManualModal.title[language] || activeManualModal.title.en}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveManualModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {activeManualModal.fullManualContent && (
              <div className="space-y-4 text-[13.5px] text-gray-700 leading-relaxed">
                <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  {activeManualModal.fullManualContent.overview}
                </p>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Procedural Guidelines:</h4>
                  <ul className="space-y-1.5">
                    {activeManualModal.fullManualContent.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#007432] font-bold">{i + 1}.</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                    <span className="text-[11px] font-bold text-green-800 uppercase block mb-1">
                      Recommended Dos
                    </span>
                    <ul className="text-[12px] text-green-900 space-y-1">
                      {activeManualModal.fullManualContent.dos.map((d, i) => (
                        <li key={i}>✓ {d}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1">
                      Precautions / Don'ts
                    </span>
                    <ul className="text-[12px] text-amber-900 space-y-1">
                      {activeManualModal.fullManualContent.donts.map((d, i) => (
                        <li key={i}>✕ {d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setActiveManualModal(null);
                  showToast('Module saved to personal offline binder.');
                }}
                className="px-5 py-2.5 rounded-full bg-[#007432] text-white font-bold text-[13px] hover:bg-[#005a24] cursor-pointer"
              >
                Close &amp; Save Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agronomist Assistance */}
      {showAgronomistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-[#007432] text-[10.5px] font-extrabold tracking-wide uppercase">
                  DIRECT TELE-CONSULTATION
                </span>
                <h3 className="text-[20px] font-bold text-[#111827] mt-1">
                  Connect with State Agronomist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAgronomistModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-[13.5px] text-gray-700">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80"
                  alt="Dr. Radha V. Sarma"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                />
                <div>
                  <h4 className="font-bold text-gray-900">Dr. Radha V. Sarma</h4>
                  <p className="text-[12px] text-gray-500">Available: Monday–Saturday (9:00 AM – 5:30 PM)</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-700 block">Your Primary Query Subject:</label>
                <select className="w-full p-2.5 rounded-xl border border-gray-300 text-[13px] bg-white focus:outline-emerald-600">
                  <option>Rabi Wheat Fungicide Dosage &amp; Spotting</option>
                  <option>Soil Test Report pH &amp; Nitrogen Correction</option>
                  <option>Drip Fertigation Venturi Blockage &amp; Acid Wash</option>
                  <option>Paddy Blast or Stem Borer Emergency Remedy</option>
                </select>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-900">
                Immediate Toll-Free Helpline: <strong>1800-180-1551</strong> (Kisan Call Centre). Your registered Aadhaar mobile will receive an SMS confirmation with token.
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowAgronomistModal(false);
                  showToast('Agronomist consultation ticket dispatched via SMS.');
                }}
                className="w-full py-2.5 rounded-full bg-[#007432] text-white font-bold text-[13px] hover:bg-[#005a24] cursor-pointer"
              >
                Confirm Call Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
