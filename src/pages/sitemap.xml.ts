import type { APIRoute } from 'astro';

const paths = ['/', '/cobrar', '/cobros'];

export const GET: APIRoute = ({ site, url }) => {
  const urls = paths.map((path) => `<url><loc>${new URL(path, site ?? url.origin).href}</loc></url>`).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
