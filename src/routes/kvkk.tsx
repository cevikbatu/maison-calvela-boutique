import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
import { legalCopy } from '@/lib/legal-copy';
const content=legalCopy['kvkk']!;
export const Route=createFileRoute('/kvkk')({head:()=>pageMeta(content.title,'Maison Calvela '+content.title+'.'),component:()=> <LegalPage title={content.title} sections={content.sections}/>});
