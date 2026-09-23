import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const OWNER_EMAIL = 'cevikbatu11@gmail.com';

async function ownerClient() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

/** Only a Boolean is exposed; the owner address and account status stay on the server. */
export const getOwnerSetupStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await ownerClient();
  const { count, error } = await admin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw new Error('Kurulum durumu kontrol edilemedi.');
  return { available: count === 0 };
});

/** Invitation emails go only to the fixed owner address, never caller input. No public signups. */
export const requestOwnerInvitation = createServerFn({ method: 'POST' }).handler(async () => {
  const { getOwnerBootstrapOrigin } = await import('./owner-bootstrap-origins.server');
  const origin = getOwnerBootstrapOrigin(getRequestHeader('origin'));
  if (!origin) return { ok: false };

  const admin = await ownerClient();
  const { count, error } = await admin.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error || count !== 0) return { ok: false };

  // Redirect only to the normalized, explicitly allowed origin; never caller-supplied paths.
  const redirectTo = `${origin}/yonetim`;

  // The provider rejects repeat invites for existing users. In that case the
  // owner can sign in and activate, or use the account's password recovery.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(OWNER_EMAIL, { redirectTo });
  return { ok: !inviteError };
});

/** The authenticated, verified owner can claim the only admin role atomically. */
export const activateFirstOwner = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: identity, error: identityError } = await context.supabase.auth.getUser();
    if (identityError || !identity.user || identity.user.id !== context.userId ||
        identity.user.email !== OWNER_EMAIL || !identity.user.email_confirmed_at) {
      throw new Error('Doğrulanmış sahip hesabı gerekli.');
    }
    const admin = await ownerClient();
    const { data, error } = await admin.rpc('activate_first_owner', {
      _user_id: context.userId,
      _email: identity.user.email,
    });
    if (error || data !== true) throw new Error('İlk yönetici kurulumu artık kullanılamıyor.');
    return { ok: true };
  });
