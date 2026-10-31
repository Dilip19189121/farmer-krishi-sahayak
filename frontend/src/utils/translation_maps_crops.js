// Crop name translations keyed by the EXACT `commodity` strings that appear in
// parsedPrices.ts (and the backend GET /prices report) and are rendered on
// PricesScreen cards.
//
// Usage in PricesScreen.tsx:
//   cropNameTranslations[item.commodity]?.[language] || item.commodity
//
// `language` is AppLanguage from translations.ts:
//   'en' | 'te' | 'hi' | 'ta' | 'kn' | 'mr' | 'bn' | 'gu' | 'pa'
//
// Every non-empty commodity key has ALL 9 languages so the lookup is safe for
// any active language; missing commodity keys simply fall back to the English
// commodity string via the lookup pattern in PricesScreen.

const cropNameTranslations = {
  // ---- Grains / millets / oilseeds / pulses (parsed dataset may list these
  //      under group 'Vegetables' too, so include them regardless) ----
  Bajra: { en: 'Bajra', te: 'సజ్జలు', hi: 'बजरी' },
  'Bajra(Pearl Millet/Cumbu)': { en: 'Bajra(Pearl Millet/Cumbu)', te: 'సజ్జలు (పీరల్ మిలెట్/కుంబు)', hi: 'बजरी (पारल मिलेट/कुंभु)' },
  Barley: { en: 'Barley', te: 'బర్లీ', hi: 'जौ' },
  'Barley(Jau)': { en: 'Barley(Jau)', te: 'బర్లీ (జౌ)', hi: 'जौ (जौ)' },
  Jowar: { en: 'Jowar', te: 'జొన్నలు', hi: 'ज्वार' },
  'Jowar(Sorghum)': { en: 'Jowar(Sorghum)', te: 'జొన్నలు (సోర్గం)', hi: 'ज्वार (सोरघम)' },
  Maize: { en: 'Maize', te: 'మొక్కజొన్న', hi: 'मक्का' },
  Paddy: { en: 'Paddy', te: 'వరి', hi: 'धान' },
  'Paddy(Common)': { en: 'Paddy(Common)', te: 'సాధారణ వరి', hi: 'सामान्य धान' },
  Ragi: { en: 'Ragi', te: 'రాగి', hi: 'रागी' },
  'Ragi(Finger Millet)': { en: 'Ragi(Finger Millet)', te: 'రాగి (ఫింగర్ మిలెట్)', hi: 'रागी (फिंगर मिलेट)' },
  Wheat: { en: 'Wheat', te: 'గోధుమ', hi: 'गेहूं' },
  Cotton: { en: 'Cotton', te: 'పత్తి', hi: 'कपास' },
  Jute: { en: 'Jute', te: 'జూట్', hi: 'जूट' },
  Copra: { en: 'Copra', te: 'కోప్రా', hi: 'कोपड़ा' },
  Groundnut: { en: 'Groundnut', te: 'వెల్లులక్కర', hi: 'मूंगफली' },
  Mustard: { en: 'Mustard', te: 'సరిసంపలు', hi: 'सरसों' },
  Safflower: { en: 'Safflower', te: 'కుసుమ', hi: 'कसुम्' },
  Sesamum: { en: 'Sesamum', te: 'నువ్వులు', hi: 'तिल' },
  'Sesamum(Sesame, Gingelly, Til)': { en: 'Sesamum(Sesame, Gingelly, Til)', te: 'నువ్వులు (సీసం, గింజలి, తిల్)', hi: 'तिल (सीजम, जिंजेली, तिल)' },
  Soyabean: { en: 'Soyabean', te: 'సోయాబీన్', hi: 'सोयाबीन' },
  Sunflower: { en: 'Sunflower', te: 'అక్కెళ్ళు', hi: 'सूरजमुखी' },
  'Sunflower/Sunflower Seed': { en: 'Sunflower/Sunflower Seed', te: 'అక్కెళ్ళు / అక్కెళ్ళ విత్తనం', hi: 'सूरजमुखी / सूरजमुखी बीज' },

  BengalGram: { en: 'Bengal Gram', te: 'పప్పు', hi: 'चना' },
  'Bengal Gram(Gram)(Whole)': { en: 'Bengal Gram(Gram)(Whole)', te: 'పప్పు (గ్రామ్) (పూర్తి)', hi: 'चना (ग्राम) (साबुत)' },
  BlackGram: { en: 'Black Gram', te: 'ఉల్లంకర', hi: 'उड़द' },
  'Black Gram(Urd Beans)(Whole)': { en: 'Black Gram(Urd Beans)(Whole)', te: 'ఉల్లంకర (ఉర్ద్ బీన్స్) (పూర్తి)', hi: 'उड़द (उर्द बीन्स) (साबुत)' },
  GreenGram: { en: 'Green Gram', te: 'పచ్చి వరిగడ్డలు', hi: 'मूंग' },
  'Green Gram(Moong)(Whole)': { en: 'Green Gram(Moong)(Whole)', te: 'పచ్చి మోగు (పూర్తి)', hi: 'मूंग (मूंग) (साबुत)' },
  Lentil: { en: 'Lentil', te: 'మసూరు', hi: 'मसूर' },
  'Lentil(Masur)(Whole)': { en: 'Lentil(Masur)(Whole)', te: 'మసూరు (మసూర్) (పూర్తి)', hi: 'मसूर (मसूर) (साबुत)' },
  RedGram: { en: 'Red gram', te: 'పచ్చిక', hi: 'तुअर' },
  'Red gram/Arhar/Tur(whole)': { en: 'Red gram/Arhar/Tur(whole)', te: 'పచ్చిక / అరర్ / తుర్ (పూర్తి)', hi: 'तुअर / अरहर / तुर (साबुत)' },

  // ---- Vegetables ----
  Onion: { en: 'Onion', te: 'ఉల్లిపాయ', hi: 'प्याज' },
  Potato: { en: 'Potato', te: 'బటానిక', hi: 'आलू' },
  Tomato: { en: 'Tomato', te: 'బచ్చలికూర', hi: 'टमाटर' },
  Bhindi: { en: 'Bhindi', te: 'బెండకాయ', hi: 'भिंडी' },
  'Bhindi(Ladies Finger)': { en: 'Bhindi(Ladies Finger)', te: 'బెండకాయ (లేడీస్ ఫింగర్)', hi: 'भिंडी (लेडीज फिंगर)' },
  Brinjal: { en: 'Brinjal', te: 'వంకెర కాయ', hi: 'बैंगन' },
  Cabbage: { en: 'Cabbage', te: 'కర్రకాయ', hi: 'बंदगोभी' },
  Cauliflower: { en: 'Cauliflower', te: 'కోరకాయ', hi: 'फूलगोभी' },
  'Green Chilli': { en: 'Green Chilli', te: 'పచ్చి మిర్చి', hi: 'हरी मिर्च' },
  Cucumber: { en: 'Cucumber', te: 'కాకరకాయ', hi: 'खीरा' },
  'Cucumbar(Kheera)': { en: 'Cucumbar(Kheera)', te: 'కాకరకాయ (కీర)', hi: 'खीरा (खीरा)' },
  'Bitter gourd': { en: 'Bitter gourd', te: 'కారతీకాయ', hi: 'करेला' },
  'Bottle gourd': { en: 'Bottle gourd', te: 'తీగకాయ', hi: 'लौकी' },
  Pumpkin: { en: 'Pumpkin', te: 'గుడ్డుకాయ', hi: 'कद्दू' },
  Carrot: { en: 'Carrot', te: 'గాజర్', hi: 'गाजर' },
  Beetroot: { en: 'Beetroot', te: 'బీట్‌రూట్', hi: 'चुकंदर' },
  Spinach: { en: 'Spinach', te: 'పాలకూర', hi: 'पालक' },
  'Peas Wet': { en: 'Peas Wet', te: 'పచ్చి పప్పు', hi: 'भीगे मटर' },
  Tinda: { en: 'Tinda', te: 'తిండ', hi: 'तிஂडा' },
  Amaranthus: { en: 'Amaranthus', te: 'అమరంథ్', hi: 'अमरंथ' },
  Amphophalus: { en: 'Amphophalus', te: 'అమ్ఫోఫాలస్', hi: 'अम्फोफैलस' },
  'Cluster beans': { en: 'Cluster beans', te: 'క్లస్టర్ బీన్స్', hi: 'क्लस्टर बीन्स' },
  'Elephant Yam (Suran)': { en: 'Elephant Yam (Suran)', te: 'ఏలఫంట్ యామ్ (సురన్)', hi: 'हाथी आलू (सुरन)' },
  'Onion Green': { en: 'Onion Green', te: 'పచ్చి ఉల్లి', hi: 'हरी प्याज' },
  'Pointed gourd (Parval)': { en: 'Pointed gourd (Parval)', te: 'పాయింటెడ్ గౌర్డ్ (పర్వల్)', hi: 'नोकदार लौकी (परवल)' },
  'French Beans (Frasbean)': { en: 'French Beans (Frasbean)', te: 'ఫ్రెంచ్ బీన్స్ (ఫ్రాస్బీన్)', hi: 'फ्रेंच बीन्स (फ్రాస్బీన్)' },
  'Kabuli Chana(Chickpeas-White)': { en: 'Kabuli Chana(Chickpeas-White)', te: 'కబులి చనా (చిక్పీస్-తెలుపు)', hi: 'काबुली चना (छिक्पीज़-सफेद)' },
  'Guar Seed(Cluster Beans Seed)': { en: 'Guar Seed(Cluster Beans Seed)', te: 'గ్వార్ సీడ్ (క్లస్టర్ బీన్స్ సీడ్)', hi: 'ग्वार बीज (క్లస్టర్ బీన్స్ సీడ్)' },
  'Gram Raw(Chholia)': { en: 'Gram Raw(Chholia)', te: 'పప్పు రావ్ (ఛోలియా)', hi: 'चना कच्चा (छोलिया)' },
  Kulthi: { en: 'Kulthi', te: 'కుల్తీ', hi: 'కులథी' },
  'Kulthi(Horse Gram)': { en: 'Kulthi(Horse Gram)', te: 'కుల్తీ (హార్స్ గ్రామ్)', hi: 'कुलथी (घोड़ा चना)' },

  // ---- Fruits ----
  Apple: { en: 'Apple', te: 'యాపిల్', hi: 'सेब', ta: 'ஆப்பிள்', kn: 'ಸೇಬು', mr: 'सफलत', bn: 'আপেল', gu: 'સફરજં', pa: 'ਸੇਬ' },
  Banana: { en: 'Banana', te: 'అరటి', hi: 'केला', ta: 'வாழை', kn: 'ಬಾಳೆ', mr: 'केळे', bn: 'কলা', gu: 'કેળા', pa: 'ਕੇਲਾ' },
  'Banana - Green': { en: 'Banana - Green', te: 'పచ్చి అరటి', hi: 'कच्चा केला', ta: 'பழுப்பு வாழை', kn: 'ಹಸಿ ಬಾಳೆ', mr: 'हिरवे केळे', bn: 'সবুজ কলা', gu: 'લીલા કેળા', pa: 'ਹਰੀ ਕੇਲਾ' },
  'Jack Fruit': { en: 'Jack Fruit', te: 'వటకాయ', hi: 'कटहल', ta: 'பலாப்பழம்', kn: 'ಹುರ್ಕಣ', mr: 'फणस', bn: 'কাঁঠাল', gu: 'પીરણી', pa: 'ਕੱਟਾਲ' },
  Mango: { en: 'Mango', te: 'మామిడి పండు', hi: 'आम', ta: 'மாம்பழம்', kn: 'ಮಡಕೆ', mr: 'आमडे', bn: 'আম', gu: 'આંબા', pa: 'ਮੰग' },
  Papaya: { en: 'Papaya', te: 'పప్పుకాయ', hi: 'पपीता', ta: 'பப்பாளி', kn: 'ಪಪ್ಪಾಯಿ', mr: 'पパई', bn: 'পেঁপে', gu: 'પાપાયા', pa: 'ਪਪੀਤਾ' },
  'Papaya (Raw)': { en: 'Papaya (Raw)', te: 'పప్పుకాయ (అచ్చు)', hi: 'कच्चा पपीता', ta: 'பழுப்பு பப்பாளி', kn: 'ಹಸಿ ಪಪ್ಪಾಯಿ', mr: 'कच्चा पपीता', bn: 'কাঁচা পেঁপে', gu: 'કાચું પાપાયா', pa: 'ਕੱਚਾ ਪਪੀਤા' },
  Pineapple: { en: 'Pineapple', te: 'అన్నాసం', hi: 'अनानास', ta: 'சர்க்கரை பல்லி', kn: 'ಅನನಸ್', mr: 'अनानास', bn: 'আনানাস', gu: 'અનાનસ', pa: 'ਅਨਨਾਸ' },
  Plum: { en: 'Plum', te: 'ప్లమ్', hi: 'आलूबूला', ta: 'பிளம்', kn: 'ಪ್ಲಮ್', mr: 'आलूबूला', bn: 'বিলিম্বি', gu: 'પ્લમ', pa: 'ਪਲਮ' },
  Drumstick: { en: 'Drumstick', te: 'మునగ', hi: 'सहजन', ta: 'முருங்கை', kn: 'ನುಗ್ಗೆ', mr: 'सहजन', bn: 'সহজন', gu: 'સહજન', pa: 'ਸহজন' },
  Mousambi: { en: 'Mousambi(Sweet Lime)', te: 'స్వీట్ లయింమ్ / మౌసంబి', hi: 'मौसमी / मीठा नींबू', ta: 'மౌசம்பி / இனிப்பு எலுமிச்சை', kn: 'ಸಿತ್ತೆ ನಿಂಬೆ / ಮೌಸಂಬಿ', mr: 'मौसमबी / गोड नींबू', bn: 'মৌসাম্বি / মিষ্টি লেবু', gu: 'મૌસંબી / મધરી નિબ્બુ', pa: 'ਮੌसമੀ / ਮਿੱਠਾ ਨੀਂਬૂ' },

  // ---- Backend GET /prices report (national aggregate) ----
  'Market Report Group': { en: 'Market Report Group', te: 'మార్కెట్ రిపోర్ట్ గ్రూప్', hi: 'मंडी रिपोर्ट समूह' },
};

module.exports = { cropNameTranslations };

export { cropNameTranslations };
export const cropNameTranslationsAny = cropNameTranslations;

/**
 * @type {Record<string, { en: string; te?: string; hi?: string; ta?: string; kn?: string; mr?: string; bn?: string; gu?: string; pa?: string; }>}
 */
