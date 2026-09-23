import { createFileRoute, notFound } from '@tanstack/react-router';

// Management remains unavailable to visitors. Enable it only with a server-side
// authentication gate and a separate user_roles check before loading any data.
export const Route = createFileRoute('/yonetim')({
  beforeLoad: () => { throw notFound(); },
  head: () => ({ meta: [
    { title: 'Sayfa Bulunamadı | Maison Calvela' },
    { name: 'description', content: 'Maison Calvela mağazası.' },
    { property: 'og:title', content: 'Sayfa Bulunamadı | Maison Calvela' },
    { property: 'og:description', content: 'Maison Calvela mağazası.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => null,
});