// Crop image matching utility for commodity price cards.
// Image URLs follow the Pixabay photo-search endpoint pattern:
// https://pixabay.com/api/?key=YOUR_KEY&q=CROP_NAME&image_type=photo&per_page=3

const PIXABAY_API_KEY = '58137616-9d4517e7233de18ff1b4aef7e';

const PIXABAY_QUERY_PATTERN =
  'https://pixabay.com/api/?key=YOUR_KEY&q=CROP_NAME&image_type=photo&per_page=3';

const buildPixabayUrl = (cropName: string): string =>
  PIXABAY_QUERY_PATTERN.replace('YOUR_KEY', PIXABAY_API_KEY).replace(
    'CROP_NAME',
    encodeURIComponent(cropName)
  );

// In-map cache: crop name -> direct CDN image URL.
const cropImageMap: Record<string, string> = {
  'bitter gourd': 'https://cdn.pixabay.com/photo/2016/10/27/08/55/bitter-gourd-1776376_640.jpg',
  'bottle gourd': 'https://cdn.pixabay.com/photo/2016/09/22/13/00/bottle-gourd-1653858_640.jpg',
  'ridge gourd': 'https://cdn.pixabay.com/photo/2018/05/02/09/51/bottle-gourd-3372468_640.jpg',
  'raw banana': 'https://cdn.pixabay.com/photo/2016/08/21/05/06/banana-1609984_640.jpg',
  colocasia: 'https://cdn.pixabay.com/photo/2016/11/13/15/57/taro-1829503_640.jpg',
  cotton: 'https://cdn.pixabay.com/photo/2015/09/02/13/24/cotton-919049_640.jpg',
  maize: 'https://cdn.pixabay.com/photo/2016/07/12/13/54/corn-1511866_640.jpg',
  sugarcane: 'https://cdn.pixabay.com/photo/2017/08/10/02/05/tiles-2617112_640.jpg',
  soybean: 'https://cdn.pixabay.com/photo/2016/09/08/04/09/soy-1652612_640.jpg',
  groundnut: 'https://cdn.pixabay.com/photo/2016/08/09/00/10/peanuts-1580745_640.jpg',
  chilli: 'https://cdn.pixabay.com/photo/2016/03/05/22/47/peppers-1239279_640.jpg',
  turmeric: 'https://cdn.pixabay.com/photo/2015/05/29/19/18/turmeric-789914_640.jpg',
  banana: 'https://cdn.pixabay.com/photo/2018/01/24/18/45/banana-3104997_640.jpg',
  mango: 'https://cdn.pixabay.com/photo/2017/08/02/14/55/mango-2570958_640.jpg',
  apple: 'https://cdn.pixabay.com/photo/2016/01/05/13/58/apple-1122537_640.jpg',
  grapes: 'https://cdn.pixabay.com/photo/2016/03/26/16/44/grapes-1280_640.jpg',
  pomegranate: 'https://cdn.pixabay.com/photo/2017/09/26/13/31/pomegranate-2788599_640.jpg',
  watermelon: 'https://cdn.pixabay.com/photo/2016/07/22/14/11/watermelon-1533029_640.jpg',
  paddy: 'https://cdn.pixabay.com/photo/2018/05/10/11/13/rice-3387261_640.jpg',
  mustard: 'https://cdn.pixabay.com/photo/2019/09/16/07/41/mustard-4480356_640.jpg',
};
export const getImageForCrop = (name: string): string => {
  if (!name) return '';
  const query = name.toLowerCase().trim();
  const detected = Object.keys(cropImageMap).find((crop) =>
    query.includes(crop)
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
    .replace(/(hybrid|fresh)/gi, '')
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
