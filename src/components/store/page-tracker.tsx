import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
const allowed = new Set(['/kadin','/erkek','/koleksiyon','/yeni-gelenler','/hakkimizda']);
export function PageTracker(){
  const {pathname}=useLocation();
  useEffect(()=>{const path=pathname.startsWith('/urun/')?'/urun':pathname;if(allowed.has(path)||path==='/urun')void supabase.from('page_views').insert({path});},[pathname]);
  return null;
}
