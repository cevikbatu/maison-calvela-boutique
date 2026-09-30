import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
import { legalCopy } from '@/lib/legal-copy';
const content=legalCopy['iletisim-satici']!;
export const Route=createFileRoute('/iletisim-satici')({head:()=>pageMeta(content.title,'Maison Calvela '+content.title+'.'),component:()=> <LegalPage title={content.title} sections={content.sections}/>});
