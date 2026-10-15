import { publicationImages } from './achievement-assets';
// Editorial selection removes layout backgrounds, masks, ornaments and unrelated stock photos.
const omitted = new Set([
  0, 1, 4, 7, 9, 10, 36, 46, 50, 52, 54, 56, 58, 60, 62, 64, 71, 72, 85, 87, 90, 93, 94, 103, 110, 111, 120,
  121, 126, 127, 131, 133, 134, 135, 139, 140, 143, 148, 151, 152, 154, 156, 160, 162, 164, 166, 170, 175,
  185, 186, 187, 188, 194, 200, 205, 207, 208, 217, 220, 222, 226, 229, 275,
]);
// Thin strips (dividers, flourishes) are layout decoration, not photographs.
const decorative = (item: { width: number; height: number }) =>
  item.height < 120 || item.width / item.height > 4 || item.height / item.width > 4;
export const galleryPhotos = publicationImages.filter(
  item => !omitted.has(Number(item.id.split('-')[1])) && !decorative(item),
);
export const photoAlbums = [
  {
    page: 4,
    pages: [1, 2, 3, 4, 5, 6, 7],
    en: 'Public journey & meetings',
    hi: 'जनसेवा की यात्रा और मुलाकातें',
    cover: 'image-028',
  },
  { page: 8, pages: [8, 9, 10, 11], en: 'Char Dham & transport', hi: 'चारधाम और परिवहन' },
  { page: 12, pages: [12, 13, 14], en: 'Technology & science', hi: 'प्रौद्योगिकी और विज्ञान' },
  { page: 15, pages: [15], en: 'Women’s participation', hi: 'महिला भागीदारी' },
  { page: 16, pages: [16, 17, 18, 19, 20, 21, 22, 23], en: 'Roorkee development', hi: 'रुड़की का विकास' },
  { page: 24, pages: [24, 25], en: 'Service centre', hi: 'सेवा केंद्र' },
  { page: 26, pages: [26, 27, 28, 29], en: 'Community & culture', hi: 'समुदाय और संस्कृति' },
  {
    page: 30,
    pages: [30, 31, 32, 33],
    en: 'City landmarks & representation',
    hi: 'शहर के स्थल और प्रतिनिधित्व',
  },
  { page: 34, pages: [34, 35, 36], en: 'Environment, yoga & sports', hi: 'पर्यावरण, योग और खेल' },
  {
    page: 38,
    pages: [37, 38, 39, 40, 41, 42, 43],
    en: 'Public life & a greener city',
    hi: 'जनजीवन और हरित शहर',
  },
];
export const photosForAlbum = (page: number) => {
  const album: { pages: number[]; cover?: string } | undefined = photoAlbums.find(item => item.page === page);
  const photos = galleryPhotos.filter(photo =>
    photo.pages.some(sourcePage => (album?.pages ?? [page]).includes(sourcePage)),
  );
  // The chosen cover leads the album; otherwise the largest real photograph does (not a portrait cut-out or banner).
  const cover =
    photos.find(photo => photo.id === album?.cover) ??
    [...photos]
      .filter(photo => photo.width / photo.height >= 0.7 && photo.width / photo.height <= 2)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return cover ? [cover, ...photos.filter(photo => photo !== cover)] : photos;
};
