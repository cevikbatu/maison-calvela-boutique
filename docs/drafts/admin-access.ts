export const adminRoleMissing = 'ADMIN_ROLE_MISSING';
export const adminVerificationFailed = 'ADMIN_VERIFICATION_FAILED';
export function isMissingAdminRole(cause: unknown): boolean {
  return cause instanceof Error && cause.message === adminRoleMissing;
}
export async function assertAdminRole(client: Pick<import('@supabase/supabase-js').SupabaseClient<import('../../src/integrations/supabase/types').Database>, 'from'>, userId: string) {
  const {data,error}=await client.from('user_roles').select('role').eq('user_id',userId).eq('role','admin').maybeSingle();
  if(error)throw new Error(adminVerificationFailed);
  if(!data)throw new Error(adminRoleMissing);
  return {ok:true};
}
