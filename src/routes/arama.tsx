import { createFileRoute } from '@tanstack/react-router';
import { CatalogPage } from '@/components/store/catalog-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/arama')({
  validateSearch: (search: Record<string, unknown>): { q?: string } => typeof search['q'] === 'string' ? { q: search['q'] } : {},
  head: () => pageMeta('Arama', 'Maison Calvela kadın ve erkek koleksiyonunda aradığınız parçayı bulun.'),
  component: SearchResults,
});

function SearchResults() {
  const { q } = Route.useSearch();
  return <CatalogPage key={q ?? ''} title={q ? `“${q}”` : 'Arama'} eyebrow="ARAMA SONUÇLARI" intro={q ? `“${q}” için bulunan parçalar.` : 'Maison Calvela koleksiyonunu keşfedin.'} {...(q?{query:q}:{})}/>;
}