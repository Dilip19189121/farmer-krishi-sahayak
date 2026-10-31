// Crop image matching utility for commodity price cards.
// Image URLs use Wikimedia Commons Special:Redirect/file/ paths, which
// resolve to the live upload URL without hard-coding the SHA-1 hash folders.
// Every filename below was verified to exist on Commons.

const PIXABAY_API_KEY = '58137616-9d4517e7233de18ff1b4aef7e';

const S = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/';

const cropImageMap: Record<string, string> = {
  'tomato': `${S}Bright_red_tomato_and_cross_section02.jpg`,
  'potato': `${S}Patatas.jpg`,
  'onion': `${S}Onion_on_White.JPG`,
  'banana': `${S}Banana-Single.jpg`,
  'mango': `${S}Mangos_-_single_and_halved.jpg`,
  'apple': `${S}Red_Apple.jpg`,
  'bajra': `${S}Bajra_-_pearl_millet.jpg`,
  'barley': `${S}Barley.jpg`,
  'jowar': `${S}Jowar.jpg`,
  'wheat': `${S}Wheat.jpg`,
  'brinjal': `${S}Brinjal.jpg`,
  'bhindi': `${S}Brinjal.jpg`,
  'drumstick': `${S}Moringa_oleifera_drumstick_pods.JPG`,
  'blueberry': `${S}Blueberries.jpg`,
  'cherry': `${S}Cherry_Stella444.jpg`,
  'lemon': `${S}Lemon.jpg`,
  'orange': `${S}Orange-Fruit-Pieces.jpg`,
  'strawberry': `${S}Strawberries.jpg`,
  'watermelon': `${S}Watermelon_cross_BNC.jpg`,
  'broccoli': `${S}Sa_broccoli_florets.jpg`,
  'carrot': `${S}Carrot.jpg`,
  'cauliflower': `${S}Cauliflower_white.jpg`,
  'cabbage': `${S}Cabbage_and_cross_section_on_white.jpg`,
  'lettuce': `${S}Iceberg_lettuce_in_SB.jpg`,
  'spinach': `${S}Spinach_leaves.jpg`,
};

export const getImageForCrop = (name: string): string => {
  if (!name) return '';
  const query = name.toLowerCase().trim();
  const detected = Object.keys(cropImageMap).find((crop) =>
    crop.split(/\s+/).every((word) => query.split(/\s+/).includes(word))
  );
  if (detected !== undefined) return cropImageMap[detected];

  // Local fallback for Indian produce that Pixabay struggles with.
  const lower = query.toLowerCase().trim();
  if (lower === 'bhindi') return cropImageMap.bhindi;
  if (lower === 'brinjal') return cropImageMap.brinjal;
  if (lower === 'drumstick') return cropImageMap.drumstick;
  if (lower === 'bitter gourd') return cropImageMap['bitter gourd'];
  if (lower === 'bottle gourd') return cropImageMap['bottle gourd'];
  if (lower === 'ridge gourd') return cropImageMap['ridge gourd'];
  if (lower === 'raw banana') return cropImageMap['raw banana'];
  if (lower === 'colocasia') return cropImageMap.colocasia;
  return '';
};

export const fetchLiveImage = async (name: string): Promise<string> => {
  if (!name) return '';
  const cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(hybrid|fresh)\b/gi, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const candidates = [cleaned, ...words.slice(0, 1)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const response = await fetch(
        `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(candidate)}&image_type=photo&per_page=3&safesearch=true`
      );
      if (!response.ok) continue;
      const data = await response.json();
      const firstHit = data?.hits?.[0];
      const url = firstHit?.webformatURL;
      if (url) {
        cropImageMap[name.toLowerCase()] = url;
        return url;
      }
    } catch {
      continue;
    }
  }
  return '';
};
