import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/store/info-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/hakkimizda')({
  head: () => pageMeta('Hikâyemiz', 'Maison Calvela’nın kendi tekstil şirketinde kumaştan son sevkiyata uzanan özenli üretim yolculuğu.'),
  component: () => <InfoPage eyebrow="MAISON CALVELA / HİKÂYEMİZ" title="Bir parçanın ardındaki özen." paragraphs={[
    'Maison Calvela’da bir giysinin hikâyesi, kumaşın seçimiyle başlar. Kadın ve erkek için tasarladığımız her parçanın üretimi, kendi tekstil şirketimizde, başlangıcından son adımına kadar yakından takip edilir.',
    'Kumaş tedariği, kesim, dikim, ütü, paketleme ve sevkiyat: Her aşama aynı sorumluluğun parçasıdır. El işçiliğine duyulan saygı, düzenli kalite kontrolü ve küçük detaylara gösterilen dikkat, ortaya çıkan parçanın karakterini belirler.',
    'Amacımız gösterişli vaatler değil; giyildiğinde hissedilen kalite ve yıllarca yer bulabilecek sade, güçlü tasarımlardır.',
  ]}/> ,
});