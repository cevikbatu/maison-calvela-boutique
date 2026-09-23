import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Every administration request is authenticated and checked against database roles on the server. */
export const verifyAdmin = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
  const {data,error}=await context.supabase.from('user_roles').select('role').eq('user_id',context.userId).eq('role','admin').maybeSingle();
  if(error||!data)throw new Error('Yönetim erişimi reddedildi.');
  return {ok:true};
});
