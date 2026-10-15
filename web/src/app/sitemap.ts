import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/hi', '/privacy', '/terms'].map(path => ({ url: `https://batraconnect.com${path}` }));
}
