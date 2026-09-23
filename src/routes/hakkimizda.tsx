import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/store/info-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/hakkimizda')({
  head: () => pageMeta('Hakkımızda', 'Maison Calvela: sadelik, rafine detaylar ve zamansız giyim anlayışı.'),
  component: () => <InfoPage eyebrow="BİZİM HİKÂYEMİZ" title="Maison Calvela" paragraphs={[
    'Maison Calvela, günlük giyimin en sade halini özenle yeniden düşünür. Kadın ve erkek için tasarlanan parçalarımızda dengeli siluetler, dikkatle seçilmiş dokular ve sessiz bir özgüven buluşur.',
    'Her koleksiyon, sezonlardan bağımsız bir gardırobun parçası olmayı amaçlar. Gösterişten uzak ama etkisi kalıcı bir stil; Maison Calvela’nın çıkış noktasıdır.',
  ]}/> ,
});