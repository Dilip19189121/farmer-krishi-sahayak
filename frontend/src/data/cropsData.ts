export interface CropInfo {
  id: string;
  name: string;
  teluguName: string;
  scientificName: string;
  category: 'Commercial' | 'Cereal' | 'Pulse' | 'Oilseed' | 'Spice';
  mandiPrice: string;
  mspPrice: string;
  topDistricts: string[];
  chlorophyllA: string;
  chlorophyllB: string;
  waterStatus: 'Optimal' | 'Low' | 'Adequate';
  humidity: string;
  lightCondition: 'Direct Sunlight' | 'Indirect' | 'High Intensity';
  fertilization: 'Moderate' | 'Heavy' | 'Light';
  growthRate: string;
  image: string;
  description: string;
  soilMoisture: string;
  recentAlert: string;
}

export const CROPS_DATA: CropInfo[] = [
  {
    id: 'spathiphyllum',
    name: 'Spathiphyllum Plant',
    teluguName: 'పీస్ లిల్లీ (Spathiphyllum)',
    scientificName: 'Spathiphyllum wallisii',
    category: 'Commercial',
    mandiPrice: '₹ 450 / pot',
    mspPrice: 'N/A',
    topDistricts: ['Kadiyam Nursery Belt', 'East Godavari', 'Chittoor'],
    chlorophyllA: '0.749 ± 0.02',
    chlorophyllB: '0.253 ± 0.01',
    waterStatus: 'Low',
    humidity: '56%',
    lightCondition: 'Indirect',
    fertilization: 'Moderate',
    growthRate: '5%',
    image: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=800&q=80',
    description: 'Foliage and air-purifying perennial monitored under greenhouse telemetry in Andhra horticulture clusters.',
    soilMoisture: 'Low (Needs misting within 6 hrs)',
    recentAlert: 'Soil moisture: Low. Prompt root rehydration suggested.',
  },
  {
    id: 'groundnut',
    name: 'Groundnut / Peanuts',
    teluguName: 'వేరుశనగ (Groundnut)',
    scientificName: 'Arachis hypogaea',
    category: 'Oilseed',
    mandiPrice: '₹ 7,150 / qtl',
    mspPrice: '₹ 6,783 / qtl',
    topDistricts: ['Kurnool', 'Anantapur', 'Kadapa', 'Chittoor'],
    chlorophyllA: '0.812 ± 0.03',
    chlorophyllB: '0.285 ± 0.01',
    waterStatus: 'Adequate',
    humidity: '48%',
    lightCondition: 'Direct Sunlight',
    fertilization: 'Moderate',
    growthRate: '6.2%',
    image: 'https://images.unsplash.com/photo-1567892326423-f36551b94e36?auto=format&fit=crop&w=800&q=80',
    description: 'Premier oilseed crop of Rayalaseema. Kadiri-6 and Dharani varieties harvested across red sandy loams.',
    soilMoisture: 'Adequate (Pod filling stage)',
    recentAlert: 'Pod development stage active. Protect against collar rot.',
  },
  {
    id: 'chilli',
    name: 'Guntur Red Chilli',
    teluguName: 'మిరప (Mirchi)',
    scientificName: 'Capsicum annuum',
    category: 'Spice',
    mandiPrice: '₹ 18,400 / qtl',
    mspPrice: 'Market Driven',
    topDistricts: ['Guntur', 'Palnadu', 'Prakasam', 'Kurnool'],
    chlorophyllA: '0.690 ± 0.02',
    chlorophyllB: '0.241 ± 0.02',
    waterStatus: 'Low',
    humidity: '42%',
    lightCondition: 'High Intensity',
    fertilization: 'Heavy',
    growthRate: '4.8%',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
    description: 'Famous Guntur Sannam (S4) and Teja varieties. Global export hub with Asia’s largest market yard.',
    soilMoisture: 'Low (Requires scheduled drip fertigation)',
    recentAlert: 'Thrips alert issued for Palnadu taluk. Apply neem-based sprays.',
  },
  {
    id: 'paddy',
    name: 'Paddy Rice (Samba Mahsuri)',
    teluguName: 'వరి (Paddy BPT 5204)',
    scientificName: 'Oryza sativa',
    category: 'Cereal',
    mandiPrice: '₹ 2,420 / qtl',
    mspPrice: '₹ 2,300 / qtl',
    topDistricts: ['West Godavari', 'East Godavari', 'Krishna', 'Nellore'],
    chlorophyllA: '0.885 ± 0.04',
    chlorophyllB: '0.310 ± 0.02',
    waterStatus: 'Optimal',
    humidity: '72%',
    lightCondition: 'Direct Sunlight',
    fertilization: 'Heavy',
    growthRate: '7.1%',
    image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=800&q=80',
    description: 'Staple foodgrain grown across the Krishna-Godavari Delta known as the Rice Bowl of India.',
    soilMoisture: 'Optimal (Flooded 3-5 cm level maintained)',
    recentAlert: 'Canal sluice discharge scheduled for release from Prakasam Barrage.',
  },
  {
    id: 'cotton',
    name: 'Bt Cotton (Kapas)',
    teluguName: 'పత్తి (Cotton)',
    scientificName: 'Gossypium hirsutum',
    category: 'Commercial',
    mandiPrice: '₹ 7,850 / qtl',
    mspPrice: '₹ 7,521 / qtl',
    topDistricts: ['Guntur', 'Kurnool', 'Adoni', 'Nandyal'],
    chlorophyllA: '0.765 ± 0.02',
    chlorophyllB: '0.270 ± 0.01',
    waterStatus: 'Adequate',
    humidity: '52%',
    lightCondition: 'Direct Sunlight',
    fertilization: 'Moderate',
    growthRate: '5.5%',
    image: 'https://images.unsplash.com/photo-1594897030560-6921389e3ec4?auto=format&fit=crop&w=800&q=80',
    description: 'White gold of Andhra drylands. Adoni & Guntur terminal markets handle peak boll pickings.',
    soilMoisture: 'Adequate (Boll bursting cycle underway)',
    recentAlert: 'Pink bollworm pheromone trap counts remain below economic threshold.',
  },
  {
    id: 'corn',
    name: 'Maize / Yellow Corn',
    teluguName: 'మొక్కజొన్న (Maize)',
    scientificName: 'Zea mays',
    category: 'Cereal',
    mandiPrice: '₹ 2,380 / qtl',
    mspPrice: '₹ 2,225 / qtl',
    topDistricts: ['Guntur', 'West Godavari', 'Khammam Border', 'Palnadu'],
    chlorophyllA: '0.820 ± 0.03',
    chlorophyllB: '0.290 ± 0.02',
    waterStatus: 'Optimal',
    humidity: '60%',
    lightCondition: 'Direct Sunlight',
    fertilization: 'Moderate',
    growthRate: '6.8%',
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
    description: 'High-yield hybrid corn grown extensively for poultry feed & starch industries in coastal AP.',
    soilMoisture: 'Optimal (Silking and grain development)',
    recentAlert: 'Fall armyworm monitoring sensors active. Nil infestation reported.',
  },
  {
    id: 'chana',
    name: 'Bengal Gram / Chickpea',
    teluguName: 'శనగలు (Chana)',
    scientificName: 'Cicer arietinum',
    category: 'Pulse',
    mandiPrice: '₹ 5,850 / qtl',
    mspPrice: '₹ 5,440 / qtl',
    topDistricts: ['Kurnool', 'Nandyal', 'Prakasam', 'Kadapa'],
    chlorophyllA: '0.730 ± 0.02',
    chlorophyllB: '0.260 ± 0.01',
    waterStatus: 'Adequate',
    humidity: '45%',
    lightCondition: 'Direct Sunlight',
    fertilization: 'Light',
    growthRate: '5.0%',
    image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=800&q=80',
    description: 'Major rabi pulse crop cultivated in black cotton soils of Kurnool and Rayalaseema belt.',
    soilMoisture: 'Adequate (Flowering stage)',
    recentAlert: 'Wilt resistant varieties showing steady nitrogen fixation nodulation.',
  },
];

export interface MandiRate {
  id: string;
  commodity: string;
  marketYard: string;
  district: string;
  variety: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  msp: number;
  arrivalsQtl: number;
  trend: 'up' | 'down' | 'steady';
}

export const MANDI_RATES: MandiRate[] = [
  {
    id: 'mr-1',
    commodity: 'Red Chilli (Mirchi)',
    marketYard: 'Guntur AMC',
    district: 'Guntur',
    variety: 'Teja Supreme',
    minPrice: 17200,
    maxPrice: 19800,
    modalPrice: 18400,
    msp: 16500,
    arrivalsQtl: 42500,
    trend: 'up',
  },
  {
    id: 'mr-2',
    commodity: 'Groundnut (Pods)',
    marketYard: 'Kurnool Market Yard',
    district: 'Kurnool',
    variety: 'Kadiri-6',
    minPrice: 6850,
    maxPrice: 7400,
    modalPrice: 7150,
    msp: 6783,
    arrivalsQtl: 14200,
    trend: 'up',
  },
  {
    id: 'mr-3',
    commodity: 'Cotton (Kapas)',
    marketYard: 'Adoni Commercial AMC',
    district: 'Kurnool',
    variety: 'Medium Long Staple',
    minPrice: 7450,
    maxPrice: 8100,
    modalPrice: 7850,
    msp: 7521,
    arrivalsQtl: 28400,
    trend: 'steady',
  },
  {
    id: 'mr-4',
    commodity: 'Paddy (Common)',
    marketYard: 'Tenali Mandi',
    district: 'Guntur',
    variety: 'BPT 5204 (Samba)',
    minPrice: 2350,
    maxPrice: 2500,
    modalPrice: 2420,
    msp: 2300,
    arrivalsQtl: 56000,
    trend: 'up',
  },
  {
    id: 'mr-5',
    commodity: 'Bengal Gram (Chana)',
    marketYard: 'Nandyal AMC',
    district: 'Nandyal',
    variety: 'JG-11 Desi',
    minPrice: 5600,
    maxPrice: 6100,
    modalPrice: 5850,
    msp: 5440,
    arrivalsQtl: 18900,
    trend: 'up',
  },
  {
    id: 'mr-6',
    commodity: 'Maize (Corn)',
    marketYard: 'Miryalaguda / Guntur Gate',
    district: 'Palnadu',
    variety: 'Yellow Hybrid',
    minPrice: 2280,
    maxPrice: 2450,
    modalPrice: 2380,
    msp: 2225,
    arrivalsQtl: 31200,
    trend: 'steady',
  },
];

export interface SchemeInfo {
  id: string;
  name: string;
  teluguTitle: string;
  category: 'Direct Income' | 'Crop Insurance' | 'Input Subsidy' | 'Irrigation';
  disbursementAmount: string;
  beneficiariesCount: string;
  eligibility: string;
  deadline: string;
  status: 'Open for Registration' | 'Disbursement Active' | 'Auto-Enrolled';
}

export const AP_SCHEMES: SchemeInfo[] = [
  {
    id: 'rythu-bharosa',
    name: 'YSR Rythu Bharosa - PM KISAN',
    teluguTitle: 'వైఎస్సార్ రైతు భరోసా',
    category: 'Direct Income',
    disbursementAmount: '₹ 13,500 / year (3 Installments)',
    beneficiariesCount: '52.3 Lakh Farmer Families',
    eligibility: 'All landholding farmer families and SC/ST/BC/Minority tenant farmers in AP.',
    deadline: 'Ongoing FY 2026-27',
    status: 'Disbursement Active',
  },
  {
    id: 'free-crop-insurance',
    name: 'Dr. YSR Free Crop Insurance Scheme',
    teluguTitle: 'ఉచిత పంటల బీమా పథకం',
    category: 'Crop Insurance',
    disbursementAmount: '100% Premium State-Borne',
    beneficiariesCount: '34.8 Lakh Enrolled Cultivators',
    eligibility: 'All cultivators enrolled in e-Crop booking at Rythu Bharosa Kendras (RBK).',
    deadline: 'Kharif Cutoff 30 Nov',
    status: 'Auto-Enrolled',
  },
  {
    id: 'sunna-vaddi',
    name: 'YSR Sunna Vaddi Panta Runalu (Zero-Interest Crop Loans)',
    teluguTitle: 'సున్నా వడ్డీ పంట రుణాలు',
    category: 'Input Subsidy',
    disbursementAmount: 'Up to ₹ 1,00,000 Zero Interest',
    beneficiariesCount: '16.7 Lakh Farmers',
    eligibility: 'Farmers repaying crop loans within 1 year of sanction through PACs/DCCBs.',
    deadline: 'Rolling Annual Cycle',
    status: 'Open for Registration',
  },
  {
    id: 'micro-irrigation',
    name: 'AP Micro Irrigation Project (APMIP)',
    teluguTitle: 'సూక్ష్మ సేద్యం ప్రాజెక్ట్ (Drip/Sprinkler)',
    category: 'Irrigation',
    disbursementAmount: '90% Subsidy for SC/ST, 70% General',
    beneficiariesCount: '2.4 Lakh Hectares Covered',
    eligibility: 'Farmers with verified borewell or canal water source across drought taluks.',
    deadline: 'Phase 4 Applications Open',
    status: 'Open for Registration',
  },
];
