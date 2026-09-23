import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import lookbook from '@/assets/lookbook.jpg';
export function InfoPage({eyebrow,title,paragraphs}:{eyebrow:string;title:string;paragraphs:string[]}){return <main><div className="container-wide grid gap-12 py-16 md:grid-cols-2 md:gap-24 md:py-24"><div><p className="label-caps text-gold">{eyebrow}</p><h1 className="editorial-title mt-5 text-6xl md:text-[84px]">{title}</h1></div><div className="max-w-lg self-center">{paragraphs.map((p,i)=><p key={i} className="mb-6 text-base leading-[1.9] text-ink-soft">{p}</p>)}<Button asChild variant="luxuryOutline" className="mt-4"><Link to="/koleksiyon">Koleksiyonu Keşfet <ArrowUpRight/></Link></Button></div></div><img src={lookbook} alt="Maison Calvela kadın ve erkek koleksiyonu" loading="lazy" width={1600} height={1100} className="h-[360px] w-full object-cover object-center md:h-[550px]"/></main>}
