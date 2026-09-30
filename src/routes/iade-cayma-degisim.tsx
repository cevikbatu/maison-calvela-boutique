import { createFileRoute, Link } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
import { returnsPolicy } from '@/lib/legal-copy';
export const Route=createFileRoute('/iade-cayma-degisim')({head:()=>pageMeta('İade ve Değişim','Maison Calvela iade ve değişim koşulları.'),component:()=> <><LegalPage title="İade ve Değişim" sections={returnsPolicy}/><div className="container-wide pb-14"><Link to="/profil" className="underline">Hesabım üzerinden başvurularımı yönet →</Link></div></>});
