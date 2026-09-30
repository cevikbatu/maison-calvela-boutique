import {publicIndexingSite as site} from './indexing-config';
export function pageMeta(title: string, description: string, path?:string) {
  const fullTitle = `${title} | Maison Calvela`;
  const canonical=site&&path?`${site}${path}`:undefined;
  return { meta: [
    { title: fullTitle },
    { name: 'description', content: description },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ], ...(canonical?{links:[{rel:'canonical',href:canonical}]}:{}) };
}
