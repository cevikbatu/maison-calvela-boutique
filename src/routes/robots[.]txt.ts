import { createFileRoute } from '@tanstack/react-router';
const site=process.env['VITE_PUBLIC_SITE_URL']?.replace(/\/$/,'');
const valid=site&&/^https:\/\/(?!.*(?:preview|localhost|127\.0\.0\.1))[^/]+$/i.test(site);
export const Route=createFileRoute('/robots.txt')({server:{handlers:{GET:()=>new Response(valid?`User-agent: *\nDisallow: /yonetim\nDisallow: /profil\nDisallow: /sifre-yenile\nSitemap: ${site}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'content-type':'text/plain; charset=utf-8','x-robots-tag':valid?'index':'noindex'}})}}});
