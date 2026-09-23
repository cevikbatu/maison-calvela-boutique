import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { verifyAdmin } from '@/lib/admin-api';
import { AdminDashboard } from '@/components/admin/dashboard';

type State='checking'|'login'|'denied'|'authorized';
export const Route = createFileRoute('/yonetim')({
  head:()=>({meta:[{title:'Özel Yönetim | Maison Calvela'},{name:'description',content:'Maison Calvela özel yönetim alanı.'},{property:'og:title',content:'Özel Yönetim | Maison Calvela'},{property:'og:description',content:'Maison Calvela özel yönetim alanı.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex, nofollow'}]}),component:Admin,
});
function Admin(){
  const [state,setState]=useState<State>('checking');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const navigate=useNavigate();
  useEffect(()=>{let active=true;void (async()=>{const {data}=await supabase.auth.getSession();if(!active)return;if(!data.session){setState('login');return}try{await verifyAdmin({headers:{Authorization:`Bearer ${data.session.access_token}`}});if(active)setState('authorized')}catch{if(active)setState('denied')}})();return()=>{active=false}},[]);
  async function signIn(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');const {data,error:authError}=await supabase.auth.signInWithPassword({email,password});setPassword('');if(authError||!data.session){setError('Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.');setBusy(false);return}try{await verifyAdmin({headers:{Authorization:`Bearer ${data.session.access_token}`}});setState('authorized')}catch{await supabase.auth.signOut();setError('Bu hesap için yönetici yetkisi tanımlanmamış.');setState('login')}setBusy(false)}
  async function signOut(){await supabase.auth.signOut();setState('login');void navigate({to:'/'})}
  if(state==='checking')return <main className="container-wide min-h-[60vh] py-32 text-center text-sm text-muted-foreground">Yetki kontrol ediliyor…</main>;
  if(state==='denied')return <main className="container-wide min-h-[60vh] py-28 text-center"><LockKeyhole className="mx-auto" size={34}/><h1 className="editorial-title mt-6 text-5xl">Erişim kısıtlı</h1><p className="mt-5 text-sm text-muted-foreground">Yönetim yalnızca yetkili hesaplara açıktır.</p><Button variant="luxuryOutline" className="mt-8" onClick={()=>void signOut()}>Çıkış Yap</Button></main>;
  if(state==='login')return <main className="container-wide flex min-h-[70vh] items-center justify-center py-16"><div className="w-full max-w-sm"><p className="label-caps text-gold">MAISON CALVELA / ÖZEL ALAN</p><h1 className="editorial-title mt-4 text-5xl">Yönetim Girişi</h1><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Yalnızca yetkilendirilmiş hesaplar içindir.</p><form onSubmit={e=>void signIn(e)} className="mt-9 space-y-5"><label className="block text-xs font-medium uppercase tracking-widest">E-posta<Input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-12 rounded-none"/></label><label className="block text-xs font-medium uppercase tracking-widest">Şifre<Input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 h-12 rounded-none"/></label>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" variant="luxury" className="w-full" disabled={busy}>{busy?'Kontrol ediliyor…':'Giriş Yap'}</Button></form><Link to="/" className="mt-8 inline-block text-xs underline underline-offset-4">Mağazaya dön</Link></div></main>;
  return <main className="container-wide min-h-screen py-10 md:py-16"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-8"><div><p className="label-caps text-gold">MAISON CALVELA / ÖZEL ALAN</p><h1 className="editorial-title mt-3 text-5xl">Yönetim</h1></div><Button variant="outline" onClick={()=>void signOut()}><LogOut size={15}/> Çıkış Yap</Button></div><AdminDashboard/></main>;
}
