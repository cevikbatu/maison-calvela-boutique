import { createFileRoute } from '@tanstack/react-router';
import {publicIndexingSite as site} from '@/lib/indexing-config';
export const Route=createFileRoute('/sitemap.xml')({server:{handlers:{GET:async()=>{
  if(!site)return new Response('İndeksleme kapalı.',{status:404,headers:{'x-robots-tag':'noindex, nofollow'}});
  const paths=['/','/kadin','/erkek','/yeni-gelenler','/koleksiyon','/hakkimizda','/iletisim'];
  const base=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_PUBLISHABLE_KEY'];
  if(base&&key){const url=new URL(`${base}/rest/v1/products`);url.searchParams.set('published','eq.true');url.searchParams.set('select','slug');const result=await fetch(url,{headers:{apikey:key}});if(result.ok){const rows=await result.json() as {slug:string}[];paths.push(...rows.map(p=>`/urun/${encodeURIComponent(p.slug)}`));}}
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${site}${p}</loc></url>`).join('')}</urlset>`;
  return new Response(xml,{headers:{'content-type':'application/xml; charset=utf-8'}});
}}}});
