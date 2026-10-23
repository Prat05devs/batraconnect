import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/hi', '/about-the-app', '/privacy', '/terms', '/delete-account'].map(path => ({
    url: `https://batraconnect.com${path}`,
  }));
}
