import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { verifyAdmin } from '@/lib/admin-api';
import { activateFirstOwner, getOwnerSetupStatus, requestOwnerInvitation } from '@/lib/owner-bootstrap';
import { AdminDashboard } from '@/components/admin/dashboard';

type State = 'checking' | 'login' | 'setup' | 'set-password' | 'denied' | 'authorized';
export const Route = createFileRoute('/yonetim')({
  head: () => ({ meta: [
    { title: 'Özel Yönetim | Maison Calvela' },
    { name: 'description', content: 'Maison Calvela özel yönetim alanı.' },
    { property: 'og:title', content: 'Özel Yönetim | Maison Calvela' },
    { property: 'og:description', content: 'Maison Calvela özel yönetim alanı.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: Admin,
});

function Admin() {
  const [state, setState] = useState<State>('checking');
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const checkAccess = useCallback(async (active: () => boolean) => {
    try {
      const { available } = await getOwnerSetupStatus();
      if (!active()) return;
      setSetupAvailable(available);
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active()) return;
      if (userError || !data.user) { setState('login'); return; }
      try { await verifyAdmin(); setState('authorized'); return; } catch { /* not yet an admin */ }
      if (!active()) return;
      if (available && data.user.email_confirmed_at) {
        setState('set-password');
      } else {
        setState('denied');
      }
    } catch {
      if (!active()) return;
      setError('Yönetim durumu kontrol edilemedi. Lütfen yeniden deneyin.');
      setState('denied');
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Supabase handles the invitation link and persists the verified session.
    // Wait for its initialization before checking the owner state.
    void checkAccess(() => active);
    return () => { active = false; };
  }, [checkAccess]);

  async function invite() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await requestOwnerInvitation();
      if (!result.ok) throw new Error('Davet gönderilemedi. Kurulum kapanmış veya e-posta zaten kayıtlı olabilir.');
      setNotice('Sahip adresine davet gönderildi. E-postadaki bağlantıyı açarak şifrenizi belirleyin.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Davet gönderilemedi.');
    } finally { setBusy(false); }
  }

  async function finishSetup(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password.length < 12) { setError('Şifreniz en az 12 karakter olmalı.'); return; }
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
    setBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email_confirmed_at) throw new Error('E-posta doğrulaması tamamlanmadı.');
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw new Error('Şifre kaydedilemedi. Daha güçlü bir şifre deneyin.');
      await activateFirstOwner();
      await verifyAdmin();
      setState('authorized'); setSetupAvailable(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kurulum tamamlanamadı.');
    } finally { setPassword(''); setConfirm(''); setBusy(false); }
  }

  async function signIn(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setPassword('');
    if (authError || !data.session) {
      setError('Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.'); setBusy(false); return;
    }
    try { await verifyAdmin(); setState('authorized'); }
    catch {
      // A verified invited owner can retry the one-time activation without another invite.
      if (setupAvailable && data.user.email === 'cevikbatu11@gmail.com' && data.user.email_confirmed_at) setState('set-password');
      else { await supabase.auth.signOut(); setError('Bu hesap için yönetici yetkisi tanımlanmamış.'); }
    }
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut(); setState('login'); void navigate({ to: '/' });
  }

  if (state === 'checking') return <main className="container-wide min-h-[60vh] py-32 text-center text-sm text-muted-foreground">Yetki kontrol ediliyor…</main>;
  if (state === 'denied') return <main className="container-wide min-h-[60vh] py-28 text-center"><LockKeyhole className="mx-auto" size={34}/><h1 className="editorial-title mt-6 text-5xl">Erişim kısıtlı</h1><p className="mt-5 text-sm text-muted-foreground">Yönetim yalnızca yetkili hesaplara açıktır.</p>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<Button variant="luxuryOutline" className="mt-8" onClick={() => void signOut()}>Çıkış Yap</Button></main>;
  if (state === 'authorized') return <main className="container-wide min-h-screen py-10 md:py-16"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-8"><div><p className="label-caps text-gold">MAISON CALVELA / ÖZEL ALAN</p><h1 className="editorial-title mt-3 text-5xl">Yönetim</h1></div><Button variant="outline" onClick={() => void signOut()}><LogOut size={15}/> Çıkış Yap</Button></div><AdminDashboard/></main>;

  return <main className="container-wide flex min-h-[70vh] items-center justify-center py-16"><div className="w-full max-w-sm">
    <p className="label-caps text-gold">MAISON CALVELA / ÖZEL ALAN</p>
    <h1 className="editorial-title mt-4 text-5xl">{state === 'setup' ? 'İlk Kurulum' : state === 'set-password' ? 'Şifrenizi Belirleyin' : 'Yönetim Girişi'}</h1>
    {state === 'setup' ? <><p className="mt-5 text-sm leading-relaxed text-muted-foreground">Sahip e-posta adresinize güvenli bir davet bağlantısı gönderilir. Bağlantıdaki doğrulama ardından şifrenizi kendiniz belirlersiniz.</p><Button variant="luxury" className="mt-9 w-full" onClick={() => void invite()} disabled={busy}>{busy ? 'Gönderiliyor…' : 'Davet Gönder'}</Button></> : null}
    {state === 'set-password' ? <><p className="mt-5 text-sm leading-relaxed text-muted-foreground">E-posta adresiniz doğrulandı. Yönetimi etkinleştirmek için kendi şifrenizi oluşturun.</p><form onSubmit={e => void finishSetup(e)} className="mt-9 space-y-5"><label className="block text-xs font-medium uppercase tracking-widest">Yeni şifre<Input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-12 rounded-none"/></label><label className="block text-xs font-medium uppercase tracking-widest">Şifreyi tekrar girin<Input type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 h-12 rounded-none"/></label><Button type="submit" variant="luxury" className="w-full" disabled={busy}>{busy ? 'Etkinleştiriliyor…' : 'Hesabı Etkinleştir'}</Button></form></> : null}
    {state === 'login' ? <><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Yalnızca yetkilendirilmiş hesaplar içindir.</p><form onSubmit={e => void signIn(e)} className="mt-9 space-y-5"><label className="block text-xs font-medium uppercase tracking-widest">E-posta<Input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 rounded-none"/></label><label className="block text-xs font-medium uppercase tracking-widest">Şifre<Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-12 rounded-none"/></label><Button type="submit" variant="luxury" className="w-full" disabled={busy}>{busy ? 'Kontrol ediliyor…' : 'Giriş Yap'}</Button></form>{setupAvailable && <Button variant="link" className="mt-4 px-0" onClick={() => { setState('setup'); setError(''); setNotice(''); }}>İlk sahip kurulumu</Button>}</> : null}
    {notice && <p role="status" className="mt-5 text-sm text-ink-soft">{notice}</p>}
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    {state !== 'login' && <Button variant="link" className="mt-5 px-0" onClick={() => { setState('login'); setError(''); setNotice(''); }}>Giriş ekranına dön</Button>}
    {state === 'set-password' && <Button variant="link" className="mt-2 block px-0" onClick={() => void signOut()}>Başka hesapla giriş</Button>}
    <div><Link to="/" className="mt-8 inline-block text-xs underline underline-offset-4">Mağazaya dön</Link></div>
  </div></main>;
}