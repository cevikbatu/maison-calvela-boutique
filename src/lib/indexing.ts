// Public build-time SEO configuration; contains no secret.
export function indexingSite(site:unknown, enabled:unknown):string|undefined {
 if(enabled!=='true'||typeof site!=='string')return undefined;
 try {
  const url=new URL(site);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/')return undefined;
  if(!url.hostname.includes('.')||/(^|[.-])(localhost|staging|preview|test)([.-]|$)/i.test(url.hostname)||/^[\d.]+$/.test(url.hostname))return undefined;
  return url.origin;
 }catch{return undefined;}
}
export function indexingHeaders(response:Response,site:string|undefined):Response {
 if(site)return response;
 const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function robotsText(site:string|undefined):string {
 return site?`User-agent: *\nDisallow: /yonetim\nDisallow: /profil\nDisallow: /sifre-yenile\nSitemap: ${site}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
}
