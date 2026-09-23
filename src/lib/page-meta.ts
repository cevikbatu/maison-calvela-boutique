export function pageMeta(title: string, description: string, path?:string) {
  const fullTitle = `${title} | Maison Calvela`;
  const site=import.meta.env['VITE_PUBLIC_SITE_URL']?.replace(/\/$/,'');
  const canonical=site&&/^https:\/\/(?!.*(?:preview|localhost|127\.0\.0\.1))[^/]+$/i.test(site)&&path?`${site}${path}`:undefined;
  return { meta: [
    { title: fullTitle },
    { name: 'description', content: description },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ], ...(canonical?{links:[{rel:'canonical',href:canonical}]}:{}) };
}