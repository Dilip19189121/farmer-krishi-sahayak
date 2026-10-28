import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError, getPrices, PriceRecord } from '../api/client';
import { getImageForCrop, fetchLiveImage } from '../utils/imageMatcher';
import { parsedPriceItems, ParsedPriceItem } from '../data/parsedPrices';

interface PricesScreenProps {
  showToast: (msg: string) => void;
}

interface CommodityCardData {
  id: string;
  name: Record<string, string>;
  variety: Record<string, string>;
  mandi: Record<string, string>;
  stateKey: 'Telangana' | 'Andhra Pradesh' | 'Maharashtra' | 'Karnataka' | 'Punjab' | null;
  price: string;
  perKg: string;
  mspNote: string;
  premiumText: string;
  isDiscount?: boolean;
  trendType: 'up' | 'down';
  trendPercent: string;
  image: string;
  sparklineColor: string;
  arrival: number | null;
}

export const PricesScreen: React.FC<PricesScreenProps> = ({ showToast }) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketTab, setSelectedMarketTab] = useState<string>('All');

  // Prices come from the backend (GET /prices) — no mock source.
  const [commodities, setCommodities] = useState<CommodityCardData[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);

  // Parsed-dataset subsections ("multilingual datasets/prices"): 6 cards shown by default.
  const [visibleVegetables, setVisibleVegetables] = useState(6);
  const [visibleFruits, setVisibleFruits] = useState(6);
  const [liveImages, setLiveImages] = useState<Record<string, string>>({});

  const vegetablesTextByLang: Record<string, string> = {
    en: 'Vegetables',
    te: 'కూరగాయలు',
    hi: 'सब्जियां',
    ta: 'காய்கறிகள்',
    kn: 'ತರಕಾರಿಗಳು',
    mr: 'भाज्या',
    bn: 'সবজি',
    gu: 'શાકભાજી',
    pa: 'ਸਬਜ਼ੀਆਂ',
  };

  const fruitsTextByLang: Record<string, string> = {
    en: 'Fruits',
    te: 'పండ్లు',
    hi: 'फल',
    ta: 'பழங்கள்',
    kn: 'ಹಣ್ಣುಗಳು',
    mr: 'फळे',
    bn: 'ফল',
    gu: 'ફળો',
    pa: 'ਫਲ',
  };

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

  const noProduceTextByLang: Record<string, string> = {
    en: 'No records for this produce category in the parsed market dataset.',
    te: 'పార్స్ చేసిన మార్కెట్ డేటాసెట్‌లో ఈ కేటగికీ రికార్డులు లేవు.',
    hi: 'पार्स किए गए मंडी डेटा में इस श्रेणी के रिकॉर्ड नहीं हैं।',
    ta: 'பார்ஸ் செய்யப்பட்ட சந்தை தரவில் இந்த வகைக்கு பதிவுகள் இல்லை.',
    kn: 'ಪಾರ್ಸ್ ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ ದತ್ತಾಂಶದಲ್ಲಿ ಈ ವರ್ಗಕ್ಕೆ ದಾಖಲೆಗಳಿಲ್ಲ.',
    mr: 'पार्स केलेल्या बाजार डेटामध्ये या श्रेणीसाठी रेकॉर्ड नाहीत.',
    bn: 'পার্স করা বাজার ডেটাসেটে এই বিভাগের কোনো রেকর্ড নেই।',
    gu: 'પાર્સ કરેલ બજાર ડેટાસેટમાં આ શ્રેણી માટે રેકોર્ડ નથી.',
    pa: 'ਪਾਰਸ ਕੀਤੇ ਮੰਡੀ ਡੇਟਾ ਵਿੱਚ ਇਸ ਸ਼੍ਰੇਣੀ ਲਈ ਰਿਕਾਰਡ ਨਹੀਂ ਹਨ।',
  };

  const stateLabelsByLang: Record<string, Record<string, string>> = {
    'Andhra Pradesh': {
      en: 'Andhra Pradesh',
      te: 'ఆంధ్రప్రదేశ్',
      hi: 'आंध्र प्रदेश',
      ta: 'ஆந்திரப் பிரதேசம்',
      kn: 'ಆಂಧ್ರಪ್ರದೇಶ',
      mr: 'आंध्र प्रदेश',
      bn: 'অন্ধ্রপ্রদেশ',
      gu: 'આંધ્ર પ્રદેશ',
      pa: 'ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼',
    },
    'Telangana': {
      en: 'Telangana',
      te: 'తెలంగాణ',
      hi: 'तेलंगाना',
      ta: 'தெலுங்கானா',
      kn: 'ತೆಲಂಗಾಣ',
      mr: 'तेलंगणा',
      bn: 'তেলেঙ্গানা',
      gu: 'તેલંગાણા',
      pa: 'ਤੇਲੰਗਾਨਾ',
    },
    'Maharashtra': {
      en: 'Maharashtra',
      te: 'మహారాష్ట్ర',
      hi: 'महाराष्ट्र',
      ta: 'மகாராஷ்டிரா',
      kn: 'ಮಹಾರಾಷ್ಟ್ರ',
      mr: 'महाराष्ट्र',
      bn: 'মহারাষ্ট্র',
      gu: 'મહારાષ્ટ્ર',
      pa: 'ਮਹਾਰਾਸ਼ਟਰ',
    },
    'Karnataka': {
      en: 'Karnataka',
      te: 'కర్ణాటక',
      hi: 'कर्नाटक',
      ta: 'கர்நாடகா',
      kn: 'ಕರ್ನಾಟಕ',
      mr: 'कर्नाटक',
      bn: 'কর্ণাটক',
      gu: 'કર્ણાટક',
      pa: 'ਕਰਨਾਟਕ',
    },
    'Punjab': {
      en: 'Punjab',
      te: 'పంజాబ్',
      hi: 'पंजाब',
      ta: 'பஞ்சாப்',
      kn: 'ಪಂಜಾಬ್',
      mr: 'पंजाब',
      bn: 'পাঞ্জাব',
      gu: 'પંજાબ',
      pa: 'ਪੰਜਾਬ',
    },
  };

  const arrivalsTextByLang: Record<string, string> = {
    en: 'Arrivals',
    te: 'మార్కెట్ రాకడలు (Arrivals)',
    hi: 'मंडी आवक',
    ta: 'வரத்து (Arrivals)',
    kn: 'ಆವಕ (Arrivals)',
    mr: 'मंडी आवक',
    bn: 'আমদানি (Arrivals)',
    gu: 'મંડી આવક',
    pa: 'ਮੰਡੀ ਆਮਦ',
  };

  const pointsTextByLang: Record<string, string> = {
    en: 'Points',
    te: 'పాయింట్లు',
    hi: 'अंक (Points)',
    ta: 'புள்ளிகள்',
    kn: 'ಅಂಕಗಳು',
    mr: 'पॉइंट्स',
    bn: 'পয়েন্ট',
    gu: 'પોઈન્ટ્સ',
    pa: 'ਪੁਆਇੰਟ',
  };

  const mspFloorTextByLang: Record<string, string> = {
    en: '+2.1% Above MSP Floor',
    te: '+2.1% కనీస మద్దతు ధర కంటే ఎక్కువ',
    hi: '+2.1% एमएसपी से अधिक',
    ta: '+2.1% அரசு MSP விட அதிகம்',
    kn: '+2.1% ಎಂಎಸ್‌ಪಿಗಿಂತ ಹೆಚ್ಚು',
    mr: '+2.1% हमीभावापेक्षा जास्त',
    bn: '+২.১% এমএসপির উপরে',
    gu: '+2.1% ટેકાના ભાવથી વધુ',
    pa: '+2.1% ਐਮਐਸਪੀ ਨਾਲੋਂ ਵੱਧ',
  };

  const govtMspLabelByLang: Record<string, string> = {
    en: 'Govt MSP',
    te: 'ప్రభుత్వ MSP',
    hi: 'सरकारी एमएसपी',
    ta: 'அரசு MSP',
    kn: 'ಸರ್ಕಾರಿ MSP',
    mr: 'शासकीय हमीभाव',
    bn: 'সরকারি এমএসপি',
    gu: 'સરકારી ટેકાના ભાવ',
    pa: 'ਸਰਕਾਰੀ MSP',
  };

  const premiumLabelByLang: Record<string, string> = {
    en: 'premium',
    te: 'ప్రీమియం',
    hi: 'प्रीमियम',
    ta: 'கூடுதல் விலை',
    kn: 'ಪ್ರೀಮಿಯಂ',
    mr: 'प्रीमियम',
    bn: 'প্রিমিয়াম',
    gu: 'પ્રીમિયમ',
    pa: 'ਪ੍ਰੀਮੀਅਮ',
  };

  const discountLabelByLang: Record<string, string> = {
    en: 'discount',
    te: 'తగ్గింపు',
    hi: 'छूट',
    ta: 'தள்ளுபடி',
    kn: 'ರಿಯಾಯಿತಿ',
    mr: 'सवलत',
    bn: 'ঘাটতি',
    gu: 'ઘટાડો',
    pa: 'ਕਟੌਤੀ',
  };

  const benchmarkFloorLabelByLang: Record<string, string> = {
    en: 'Benchmark Floor',
    te: 'ప్రామాణిక కనీస ధర',
    hi: 'मानक न्यूनतम मूल्य',
    ta: 'அடிப்படை விலை',
    kn: 'ಮೂಲ ಮಾನದಂಡ ದರ',
    mr: 'आधारभूत किमान किंमत',
    bn: 'বেঞ্চমার্ক মূল্য',
    gu: 'બેંચમાર્ક ભાવ',
    pa: 'ਬੈਂਚਮਾਰਕ ਫਲੋਰ',
  };

  const perKgSuffixByLang: Record<string, string> = {
    en: '/kg',
    te: '/కిలో',
    hi: '/किग्रा',
    ta: '/கிலோ',
    kn: '/ಕೆಜಿ',
    mr: '/किलो',
    bn: '/কেজি',
    gu: '/કિલો',
    pa: '/ਕਿਲੋ',
  };

  const mtTextByLang: Record<string, string> = {
    en: 'MT',
    te: 'మెట్రిక్ టన్నులు (MT)',
    hi: 'मीट्रिक टन (MT)',
    ta: 'மெட்ரிக் டன்',
    kn: 'ಮೆಟ್ರಿಕ್ ಟನ್',
    mr: 'मेट्रिक टन',
    bn: 'মেট্রিক টন',
    gu: 'મેટ્રિક ટન',
    pa: 'ਮੀਟਰਿਕ ਟਨ',
  };

  const filteredRatesTextByLang: Record<string, string> = {
    en: 'Filtered market rates',
    te: 'ఫిల్టర్ చేసిన మార్కెట్ ధరలు',
    hi: 'फ़िल्टर किए गए मंडी भाव',
    ta: 'வடிகட்டப்பட்ட சந்தை விலைகள்',
    kn: 'ಫಿಲ್ಟರ್ ಮಾಡಿದ ಮಾರುಕಟ್ಟೆ ದರಗಳು',
    mr: 'फिल्टर केलेले बाजारभाव',
    bn: 'ফিল্টার করা বাজারদর',
    gu: 'ફિલ્ટર કરેલ બજાર ભાવ',
    pa: 'ਫਿਲਟਰ ਕੀਤੇ ਮੰਡੀ ਭਾਅ',
  };

  const marketTabs = [
    { key: 'All', label: t.prices_all_markets },
    { key: 'Andhra Pradesh', label: stateLabelsByLang['Andhra Pradesh']?.[language] || 'Andhra Pradesh' },
    { key: 'Telangana', label: stateLabelsByLang['Telangana']?.[language] || 'Telangana' },
    { key: 'Maharashtra', label: stateLabelsByLang['Maharashtra']?.[language] || 'Maharashtra' },
    { key: 'Karnataka', label: stateLabelsByLang['Karnataka']?.[language] || 'Karnataka' },
    { key: 'Punjab', label: stateLabelsByLang['Punjab']?.[language] || 'Punjab' },
  ];

  // Real market price cards built from GET /prices (national aggregate report).
  const mapPriceRecord = (r: PriceRecord, idx: number): CommodityCardData => {
    const price = r.price;
    const msp = r.msp;
    const isUp = price !== null && msp !== null && price >= msp;
    const diff = price !== null && msp !== null ? price - msp : null;
    const pct =
      price !== null && msp !== null && msp !== 0 ? ((price - msp) / msp) * 100 : null;
    const pctStr = pct === null ? null : Math.abs(pct).toFixed(1);
    const slug = r.commodity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      id: `${slug}-${r.date}-${idx}`,
      name: { en: r.commodity },
      variety: { en: r.group || 'Market Report Group' },
      mandi: { en: r.market || 'National Aggregate' },
      stateKey: null,
      price: price !== null ? `₹ ${price.toLocaleString('en-IN')}` : '—',
      perKg: price !== null ? `₹ ${(price / 100).toFixed(2)}/kg` : '—',
      mspNote: `Govt MSP: ${msp !== null ? `₹ ${msp.toLocaleString('en-IN')}` : '—'}`,
      premiumText:
        diff === null
          ? '—'
          : diff >= 0
          ? `(+₹ ${diff.toLocaleString('en-IN')} premium)`
          : `(-₹ ${Math.abs(diff).toLocaleString('en-IN')} discount)`,
      isDiscount: diff !== null && diff < 0,
      trendType: isUp ? 'up' : 'down',
      trendPercent: pctStr === null ? '—' : isUp ? `▲ +${pctStr}%` : `▼ -${pctStr}%`,
      image: getImageForCrop(r.commodity),
      sparklineColor: isUp ? '#16a34a' : '#dc2626',
      arrival: r.arrival,
    };
  };

  // Fetch market prices from the backend once per visit.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getPrices();
        if (cancelled) return;
        const dates = data.report?.dates ?? [];
        const latestDate = dates[dates.length - 1];
        const latest = (data.records ?? []).filter(
          (r) => !latestDate || r.date === latestDate
        );
        setCommodities(latest.slice(0, 12).map((rec, idx) => mapPriceRecord(rec, idx)));
        setPricesError(null);
      } catch (err) {
        if (cancelled) return;
        setPricesError(
          err instanceof ApiError
            ? err.message
            : 'Could not load market prices (backend on port 8000 not reachable).'
        );
      } finally {
        if (!cancelled) setIsLoadingPrices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Parsed items split into the two produce subsections.
  const cleanQueryName = (c: string): string =>
    c.replace(/\([^)]*\)/g, '').split('/')[0].trim();

  const vegetableItems = parsedPriceItems.filter(
    (item) => item.group.toLowerCase() === 'vegetables'
  );

  // Fruits: deduplicate by commodity name, keeping only the latest price
  // entry per commodity (the highest price value in the prices array).
  // The raw parsed dataset repeats the same commodity several times with
  // different price rows, so show each fruit once.
  const fruitItems = (() => {
    const seen = new Map<string, ParsedPriceItem>();
    for (const item of parsedPriceItems) {
      if (!item.group.toLowerCase().includes('fruit')) continue;
      const name = item.commodity.trim();
      if (!seen.has(name)) {
        seen.set(name, item);
        continue;
      }
      const existing = seen.get(name)!;
      const existingPrice = existing.prices
        .map((p) => p.price)
        .filter((p): p is number => p !== null && p > 0);
      const newestPrice = item.prices
        .map((p) => p.price)
        .filter((p): p is number => p !== null && p > 0);
      if (newestPrice.length > 0 &&
          (existingPrice.length === 0 ||
           Math.max(...newestPrice) > Math.max(...existingPrice))) {
        seen.set(name, item);
      }
    }
    return Array.from(seen.values());
  })();

  // Live Pixabay fallback for parsed items without a pre-mapped image.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const targets = [...vegetableItems, ...fruitItems].filter(
        (item) => !getImageForCrop(item.commodity)
      );
      const updates: Record<string, string> = {};
      for (const item of targets) {
        const q = cleanQueryName(item.commodity);
        if (!q || liveImages[q]) continue;
        const url = await fetchLiveImage(q);
        if (url) updates[q] = url;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setLiveImages((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liveImages]);

  const filteredVegetables = vegetableItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.commodity.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  });

  const filteredFruits = fruitItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.commodity.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  });

  // One produce subsection: header, larger-image cards, and Load More below.
  const renderSubsection = (
    items: ParsedPriceItem[],
    visibleCount: number,
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>,
    labels: Record<string, string>,
    icon: string
  ) => {
    const shown = items.slice(0, visibleCount);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[19px] text-[#006b2c]">{icon}</span>
          <h2 className="text-[17px] font-bold text-[#111827] tracking-tight">
            {labels[language] || labels.en}
          </h2>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
            {items.length}
          </span>
        </div>
        {items.length === 0 && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/80 border border-white/80 shadow-xs text-[12.5px] font-semibold text-[#6b7280]">
            <span className="material-symbols-outlined text-[17px]">info</span>
            <span>{noProduceTextByLang[language] || noProduceTextByLang.en}</span>
          </div>
        )}
        {shown.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map((item) => {
              const latest = item.prices.find(p => p.price !== null && p.price > 0)?.price ?? null;
              // Use the SECOND non-zero price for the trend calculation; the
              // first (latest) is the current card price and the PDF zero must
              // not count as a previous value.
              const prev = item.prices
                .filter(p => p.price !== null && p.price > 0)
                .at(1)?.price ?? null;
              const isUp = latest !== null && prev !== null && latest >= prev;
              const diff = latest !== null && prev !== null ? latest - prev : null;
              const pct = diff !== null && prev ? (diff / prev) * 100 : null;
              const pctStr = pct === null ? null : Math.abs(pct).toFixed(1);
              const img =
                getImageForCrop(item.commodity) ||
                liveImages[cleanQueryName(item.commodity)] ||
                '';
              return (
                <div
                  key={`${item.commodity}-${item.sourceFile}`}
                  className="bg-white/95 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={item.commodity}
                      className="w-full h-44 object-cover"
                    />
                  ) : (
                    <div className="w-full h-44 bg-[#dcfce7] text-[#15803d] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[44px]">spa</span>
                    </div>
                  )}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-[18px] font-bold text-[#111827] leading-snug">
                            {item.commodity}
                          </h3>
                          <p className="text-[11.5px] text-[#6b7280] font-medium">
                            {item.prices[0]?.date ?? ''}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#f3f4f6] text-[#374151] text-[11px] font-semibold whitespace-nowrap shadow-2xs">
                          {item.group}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mt-2">
                        <div className="flex items-baseline">
                          <span className="text-[30px] sm:text-[32px] font-bold text-[#111827] tracking-tight tabular-nums">
                            {latest !== null ? `₹ ${latest.toLocaleString('en-IN')}` : '—'}
                          </span>
                          <span className="text-[12px] text-[#6b7280] font-medium ml-1">
                            {t.prices_per_quintal}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#e8f8eb] text-[#006b2c] text-[11.5px] font-bold shadow-2xs tabular-nums">
                          {latest !== null ? `₹ ${(latest / 100).toFixed(2)}` : '—'}
                          {perKgSuffixByLang[language] || '/kg'}
                        </span>
                      </div>

                      <div className="mt-1 text-[11.5px] text-[#4b5563] flex flex-wrap items-center gap-x-3">
                        {item.msp !== null && (
                          <span>
                            {govtMspLabelByLang[language] || 'Govt MSP'}: ₹ {item.msp.toLocaleString('en-IN')}
                          </span>
                        )}
                        {item.arrivals[0]?.arrival != null && (
                          <span>
                            {arrivalsTextByLang[language] || arrivalsTextByLang.en}:
                            {' '}
                            {item.arrivals[0].arrival.toLocaleString('en-IN')} {mtTextByLang[language] || 'MT'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg width="64" height="20" viewBox="0 0 64 20" className="overflow-visible">
                          {isUp ? (
                            <path
                              d="M 2 16 Q 16 14, 28 15 T 44 8 T 62 4"
                              fill="none"
                              stroke={isUp ? '#16a34a' : '#dc2626'}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          ) : (
                            <path
                              d="M 2 5 Q 16 8, 28 6 T 44 14 T 62 17"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                        <span className="text-[11px] text-[#6b7280] font-medium">{t.prices_trend}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold shadow-2xs tabular-nums ${
                          isUp ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}
                      >
                        {pctStr === null ? '—' : isUp ? `▲ +${pctStr}%` : `▼ -${pctStr}%`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {visibleCount < items.length && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 4)}
              className="px-7 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#006b2c] border border-[#006b2c]/30 font-bold text-[13px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <span>{loadMoreTextByLang[language] || loadMoreTextByLang.en}</span>
              <span className="material-symbols-outlined text-[17px]">expand_more</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      <div className="w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-white/60 p-6 sm:p-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#006b2c] animate-pulse"></span>
            <div className="flex items-baseline gap-2">
              <h1 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-tight">
                {t.prices_title}
              </h1>
              <span className="text-[11px] font-bold text-[#6b7280] tracking-wider uppercase">
                {t.prices_subtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-[#374151]">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px] text-gray-500">
                sync
              </span>
              <span>{t.prices_refreshed}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] font-bold text-[11px] shadow-2xs">
              {t.prices_mandis_active}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.prices_search_placeholder}
              className="w-full h-12 pl-12 pr-32 rounded-full bg-white/95 border border-gray-200/80 text-[13.5px] text-[#111827] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#006b2c]/30 shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => showToast(`${filteredRatesTextByLang[language] || 'Filtered market rates'}: ${filteredVegetables.length + filteredFruits.length}`)}
            className="absolute right-1.5 px-6 py-2.5 rounded-full bg-[#132a1e] hover:bg-black text-white font-semibold text-[13px] shadow-xs cursor-pointer transition-colors"
          >
            {t.prices_find_rates}
          </button>
        </div>

        {/* Market State Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 glass-scrollbar">
          {marketTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedMarketTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedMarketTab === tab.key
                  ? 'bg-[#005a24] text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-[#374151] border border-gray-100 shadow-2xs'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Error states (real GET /prices backend data) */}
        {isLoadingPrices && (
          <div className="flex items-center justify-center gap-2 p-6 rounded-2xl bg-white/80 border border-white/80 shadow-xs text-[13px] font-bold text-[#374151]">
            <span className="w-4 h-4 rounded-full border-2 border-[#006b2c] border-t-transparent animate-spin"></span>
            <span>Loading market prices from the backend...</span>
          </div>
        )}
        {!isLoadingPrices && pricesError && (
          <div className="flex items-center justify-between gap-3 p-5 rounded-2xl bg-[#fff5f5] border border-red-200 shadow-xs">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[#b91c1c]">
              <span className="material-symbols-outlined text-[18px]">wifi_off</span>
              <span>{pricesError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoadingPrices(true);
                setPricesError(null);
                setTimeout(() => {
                  getPrices()
                    .then((data) => {
                      const dates = data.report?.dates ?? [];
                      const latestDate = dates[dates.length - 1];
                      const latest = (data.records ?? []).filter(
                        (r) => !latestDate || r.date === latestDate
                      );
                      setCommodities(latest.slice(0, 12).map((rec, idx) => mapPriceRecord(rec, idx)));
                    })
                    .catch((refreshErr) => {
                      setPricesError(
                        refreshErr instanceof ApiError
                          ? refreshErr.message
                          : 'Could not load market prices (backend on port 8000 not reachable).'
                      );
                    })
                    .finally(() => setIsLoadingPrices(false));
                }, 10);
              }}
              className="px-4 py-1.5 rounded-full bg-[#b91c1c] hover:bg-[#991b1b] text-white text-[12px] font-bold cursor-pointer shadow-xs"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoadingPrices && !pricesError && filteredVegetables.length === 0 && filteredFruits.length === 0 && (
          <div className="flex items-center justify-center gap-2 p-6 rounded-2xl bg-white/80 border border-white/80 shadow-xs text-[13px] font-semibold text-[#6b7280]">
            <span className="material-symbols-outlined text-[18px]">search_off</span>
            <span>No produce records match your search or market filter.</span>
          </div>
        )}

        {/* Top 3 KPI Cards Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {t.prices_kpi_highest}
                </span>
                <h4 className="text-[16px] font-bold text-[#111827] leading-tight">
                  {commodities[1]?.name?.[language] || commodities[1]?.name?.en || '—'}
                </h4>
                <p className="text-[11.5px] text-gray-500">{commodities[1]?.mandi?.[language] || commodities[1]?.mandi?.en || ''}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11.5px] font-bold">
                {commodities[1]?.trendPercent || '—'}
              </span>
              <span className="text-[12px] text-gray-700 font-semibold block mt-0.5 tabular-nums">
                {commodities[1]?.price || '—'} {t.prices_per_quintal}
              </span>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {t.prices_kpi_volume}
                </span>
                <h4 className="text-[16px] font-bold text-[#111827] leading-tight">
                  {commodities[0]?.name?.[language] || commodities[0]?.name?.en || '—'}
                </h4>
                <p className="text-[11.5px] text-gray-500">{commodities[0]?.mandi?.[language] || commodities[0]?.mandi?.en || ''}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[18px] font-bold text-[#111827] block tabular-nums leading-tight">
                {commodities[0]?.arrival != null
                  ? commodities[0].arrival.toLocaleString('en-IN')
                  : '—'}{' '}
                {mtTextByLang[language] || 'MT'}
              </span>
              <span className="text-[11px] text-gray-500 block">
                {arrivalsTextByLang[language] || arrivalsTextByLang.en}
              </span>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">balance</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {t.prices_kpi_msp}
                </span>
                <h4 className="text-[17px] font-bold text-[#111827] leading-tight tabular-nums">
                  108.4 {pointsTextByLang[language] || pointsTextByLang.en}
                </h4>
                <p className="text-[11.5px] text-[#15803d] font-bold">
                  {mspFloorTextByLang[language] || mspFloorTextByLang.en}
                </p>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#e8f8eb] border border-white flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006b2c]"></span>
            </div>
          </div>
        </div>

        {/* Vegetables subsection (parsed from the price PDFs) — 4 cards by default */}
        {renderSubsection(filteredVegetables, visibleVegetables, setVisibleVegetables, vegetablesTextByLang, 'eco')}

        {/* Fruits subsection (parsed from the price PDFs) — 4 cards by default */}
        {renderSubsection(filteredFruits, visibleFruits, setVisibleFruits, fruitsTextByLang, 'nutrition')}
      </div>
    </div>
  );
};