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
  tomato: 'https://cdn.pixabay.com/photo/2018/07/01/19/55/tomatoes-3509822_640.jpg',
  potato: 'https://cdn.pixabay.com/photo/2016/09/09/19/54/potatoes-1659111_640.jpg',
  onion: 'https://cdn.pixabay.com/photo/2016/09/10/17/47/onion-1659236_640.jpg',
  rice: 'https://cdn.pixabay.com/photo/2018/05/10/11/13/rice-3387261_640.jpg',
  wheat: 'https://cdn.pixabay.com/photo/2014/12/11/02/55/wheat-563996_640.jpg',
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

// Case-insensitive, partial match against the mapped crop names.
export const getImageForCrop = (name: string): string => {
  if (!name) return '';
  const query = name.toLowerCase().trim();
  const detected = Object.keys(cropImageMap).find((crop) =>
    query.includes(crop)
  );
  return detected !== undefined ? cropImageMap[detected] : '';
};

// Live fallback: query Pixabay and return the top result's webformatURL,
// or an empty string when the request fails or no photo is found.
export const fetchLiveImage = async (name: string): Promise<string> => {
  if (!name) return '';
  try {
    const queryName = encodeURIComponent(name.trim());
    const response = await fetch(
      `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${queryName}&image_type=photo&per_page=3&safesearch=true`
    );
    if (!response.ok) return '';
    const data = await response.json();
    const firstHit = data?.hits?.[0];
    const url = firstHit?.webformatURL;
    if (url) {
      cropImageMap[name.toLowerCase()] = url;
    }
    return url ?? '';
  } catch {
    return '';
  }
};
