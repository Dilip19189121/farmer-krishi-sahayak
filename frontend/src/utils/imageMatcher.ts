// Crop image matching utility for commodity price cards.
// Crop image matching utility for commodity price cards.
// Image URLs follow the Wikimedia Commons upload path pattern:
// https://upload.wikimedia.org/wikipedia/commons/thumb/<SHA1-folder>/<filename>

const PIXABAY_API_KEY = '58137616-9d4517e7233de18ff1b4aef7e';

const cropImageMap: Record<string, string> = {
  'tomato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Salad_garden_Tomato_je.jpg/320px-Salad_garden_Tomato_je.jpg',
  'potato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Potato_and_cross_section.jpg/320px-Potato_and_cross_section.jpg',
  'onion': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Onion_on_White.JPG/320px-Onion_on_White.JPG',
  'banana': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg',
  'mango': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mango_Whole_and_Split.jpg/320px-Mango_Whole_and_Split.jpg',
  'apple': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg',
  'bajra': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Bajra.jpg/640px-Bajra.jpg',
  'barley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Barley.jpg/640px-Barley.jpg',
  'jowar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Jowar.jpg/640px-Jowar.jpg',
  'wheat': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Wheat.jpg/640px-Wheat.jpg',
  'brinjal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Brinjal.jpg/640px-Brinjal.jpg',
  'bhindi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Brinjal.jpg/640px-Brinjal.jpg',
  'drumstick': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Drumstick.jpg/640px-Drumstick.jpg',
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
