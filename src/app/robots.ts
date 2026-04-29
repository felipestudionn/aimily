import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/account',
          '/my-collections',
          '/collection/',
          '/calendar',
          '/new-collection',
          '/planner/',
          '/p/',
          '/presentation/',
          '/tech-pack/',
        ],
      },
    ],
    sitemap: 'https://www.aimily.app/sitemap.xml',
    host: 'https://www.aimily.app',
  };
}
