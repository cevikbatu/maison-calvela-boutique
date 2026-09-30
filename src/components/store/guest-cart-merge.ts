import type { CartItem } from '@/data/catalog';
import { supabase } from '@/integrations/supabase/client';

const STATE_KEY = 'mc-cart-state-v2';
const LEGACY_CART_KEY = 'mc-cart';

const MAX_RECEIPTS = 32;

type MergeLine = { productId: string; size: string; color: string; quantity: number };

type PendingMerge = {
  requestId: string;
  items: MergeLine[];
  createdAt: string;
};

type CartState = {
  version: 2;
  cart: MergeLine[];
  suppressedByUser: Record<string, MergeLine[]>;
  pendingByUser: Record<string, PendingMerge>;
  appliedRequestIds: string[];
};

export type MergeReceiptLine = {
  productId: string;
  size: string;
  color: string;
  accepted: number;
  remaining: number;
};

export type GuestCartMergeResult = {
  attempted: boolean;
  accepted: number;
  remaining: number;
};

const identity = (item: Pick<MergeLine, 'productId' | 'size' | 'color'>) =>
  `${item.productId}\u0000${item.size}\u0000${item.color}`;

function isLine(value: unknown): value is MergeLine {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MergeLine>;
  return (
    typeof item.productId === 'string' &&
    typeof item.size === 'string' &&
    typeof item.color === 'string' &&
    Number.isSafeInteger(item.quantity) &&
    (item.quantity ?? 0) > 0
  );
}

export function normalizeMergeLines(lines: readonly MergeLine[]): MergeLine[] {
  const combined = new Map<string, MergeLine>();
  for (const line of lines) {
    if (!isLine(line)) continue;
    const id = identity(line);
    const current = combined.get(id);
    const quantity=(current?.quantity ?? 0)+line.quantity;
    if(!Number.isSafeInteger(quantity)||quantity>2147483647)throw new Error('Geçersiz sepet miktarı.');
    combined.set(id, { ...line, quantity });
  }
  return [...combined.values()].sort((a, b) => identity(a).localeCompare(identity(b)));
}

function emptyState(): CartState {
  return { version: 2, cart: [], suppressedByUser: {}, pendingByUser: {}, appliedRequestIds: [] };
}

function parseLines(value: unknown): MergeLine[] {
  return Array.isArray(value) ? normalizeMergeLines(value.filter(isLine)) : [];
}

function readState(): CartState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CartState>;
      if (parsed.version === 2) {
        const suppressedByUser: Record<string, MergeLine[]> = {};
        for (const [userId, lines] of Object.entries(parsed.suppressedByUser ?? {})) {
          suppressedByUser[userId] = parseLines(lines);
        }
        const pendingByUser: Record<string, PendingMerge> = {};
        for (const [userId, pending] of Object.entries(parsed.pendingByUser ?? {})) {
          if (
            pending &&
            typeof pending.requestId === 'string' &&
            typeof pending.createdAt === 'string' &&
            Array.isArray(pending.items)
          ) {
            const items = parseLines(pending.items);
            if (items.length) pendingByUser[userId] = { ...pending, items };
          }
        }
        return {
          version: 2,
          cart: parseLines(parsed.cart),
          suppressedByUser,
          pendingByUser,
          appliedRequestIds: Array.isArray(parsed.appliedRequestIds)
            ? parsed.appliedRequestIds.filter((value): value is string => typeof value === 'string').slice(-MAX_RECEIPTS)
            : [],
        };
      }
    }
  } catch {
    // Fall through to legacy cart recovery.
  }

  try {
    const legacy = parseLines(JSON.parse(localStorage.getItem(LEGACY_CART_KEY) || '[]'));
    const migrated = { ...emptyState(), cart: legacy };
    localStorage.setItem(STATE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_CART_KEY);
    return migrated;
  } catch {
    return emptyState();
  }
}

function writeState(state: CartState) {
  const serialized=JSON.stringify(state);
  if(localStorage.getItem(STATE_KEY)!==serialized)localStorage.setItem(STATE_KEY, serialized);
  localStorage.removeItem(LEGACY_CART_KEY);
}

export function readGuestCart(): CartItem[] {
  return readState().cart as CartItem[];
}

export function cartStateStorageKey() {
  return STATE_KEY;
}

function subtractLines(source: readonly MergeLine[], subtraction: readonly MergeLine[]) {
  const subtract = new Map(subtraction.map((line) => [identity(line), line.quantity]));
  const next: MergeLine[] = [];
  for (const line of normalizeMergeLines(source)) {
    const quantity = Math.max(0, line.quantity - (subtract.get(identity(line)) ?? 0));
    if (quantity > 0) next.push({ ...line, quantity });
  }
  return next;
}

function clampSuppressed(cart: readonly MergeLine[], suppressed: readonly MergeLine[]) {
  const cartQty = new Map(normalizeMergeLines(cart).map((line) => [identity(line), line.quantity]));
  return normalizeMergeLines(suppressed)
    .map((line) => ({ ...line, quantity: Math.min(line.quantity, cartQty.get(identity(line)) ?? 0) }))
    .filter((line) => line.quantity > 0);
}

export function eligibleGuestLines(cart: readonly MergeLine[], suppressed: readonly MergeLine[]) {
  return subtractLines(normalizeMergeLines(cart), normalizeMergeLines(suppressed));
}

async function withCartLock<T>(task: () => Promise<T>): Promise<T> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && 'locks' in nav) {
    const locks = (nav as Navigator & {
      locks: { request<R>(name: string, callback: () => Promise<R>): Promise<R> };
    }).locks;
    return locks.request('maison-calvela-cart', task);
  }
  throw new Error('Güvenli sepet eşitlemesi bu tarayıcıda desteklenmiyor. Lütfen güncel bir tarayıcı kullanın.');
}

export async function persistGuestCart(cart: readonly CartItem[], expected?: readonly CartItem[]) {
  if (typeof localStorage === 'undefined') return;
  await withCartLock(async () => {
    const state = readState();
    const next=normalizeMergeLines(cart);
    if(JSON.stringify(state.cart)===JSON.stringify(next))return;
    if(Object.keys(state.pendingByUser).length)throw new Error('Bekleyen sepet birleştirmesi tamamlanmadan değişiklik kaydedilemiyor.');
    if(expected&&JSON.stringify(state.cart)!==JSON.stringify(normalizeMergeLines(expected)))throw new Error('Sepet başka bir sekmede değişti. Güncel sepet yüklendi; lütfen tekrar deneyin.');
    state.cart = next;
    for (const userId of Object.keys(state.suppressedByUser)) {
      state.suppressedByUser[userId] = clampSuppressed(state.cart, state.suppressedByUser[userId] ?? []);
      if (!state.suppressedByUser[userId].length) delete state.suppressedByUser[userId];
    }
    writeState(state);
  });
}

function validateReceipt(pending: PendingMerge, value: unknown): MergeReceiptLine[] {
  if (!Array.isArray(value) || value.length !== pending.items.length) throw new Error('Invalid merge receipt');
  const expected = new Map(pending.items.map((line) => [identity(line), line.quantity]));
  const seen = new Set<string>();
  const receipt: MergeReceiptLine[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid merge receipt');
    const line = raw as Partial<MergeReceiptLine>;
    if (
      typeof line.productId !== 'string' || typeof line.size !== 'string' || typeof line.color !== 'string' ||
      !Number.isSafeInteger(line.accepted) || !Number.isSafeInteger(line.remaining) ||
      (line.accepted ?? -1) < 0 || (line.remaining ?? -1) < 0
    ) throw new Error('Invalid merge receipt');
    const id = identity(line as MergeReceiptLine);
    const quantity = expected.get(id);
    if (quantity === undefined || seen.has(id) || line.accepted! + line.remaining! !== quantity) {
      throw new Error('Invalid merge receipt');
    }
    seen.add(id);
    receipt.push(line as MergeReceiptLine);
  }
  return receipt;
}

export async function mergeGuestCartForUser(userId: string, isActive: () => boolean = () => true): Promise<GuestCartMergeResult> {
  if (typeof localStorage === 'undefined') return { attempted: false, accepted: 0, remaining: 0 };

  return withCartLock(async () => {
    if(!isActive())throw new Error('Oturum değişti.');
    let state = readState();
    let pending = state.pendingByUser[userId];
    if (!pending) {
      const suppressed = state.suppressedByUser[userId] ?? [];
      const items = eligibleGuestLines(state.cart, suppressed);
      if (!items.length) return { attempted: false, accepted: 0, remaining: suppressed.reduce((n, line) => n + line.quantity, 0) };
      pending = { requestId: crypto.randomUUID(), items, createdAt: new Date().toISOString() };
      state.pendingByUser[userId] = pending;
      // Persist request id + immutable snapshot before the network request.
      writeState(state);
    }

    const { data, error } = await supabase.rpc('merge_guest_cart', {
      p_expected_user_id: userId,
      p_request_id: pending.requestId,
      p_items: pending.items,
    });
    if (error) throw error;

    if(!isActive())throw new Error('Oturum değişti; bekleyen birleştirme korundu.');
    const receipt = validateReceipt(pending, data);
    const acceptedLines = receipt
      .filter((line) => line.accepted > 0)
      .map((line) => ({ productId: line.productId, size: line.size, color: line.color, quantity: line.accepted }));
    const remainderLines = receipt
      .filter((line) => line.remaining > 0)
      .map((line) => ({ productId: line.productId, size: line.size, color: line.color, quantity: line.remaining }));

    // Re-read under the same lock so additions made before lock acquisition are preserved.
    state = readState();
    if (!state.appliedRequestIds.includes(pending.requestId)) {
      state.cart = subtractLines(state.cart, acceptedLines);
      state.suppressedByUser[userId] = clampSuppressed(
        state.cart,
        normalizeMergeLines([...(state.suppressedByUser[userId] ?? []), ...remainderLines]),
      );
      if (!state.suppressedByUser[userId].length) delete state.suppressedByUser[userId];
      state.appliedRequestIds = [...state.appliedRequestIds, pending.requestId].slice(-MAX_RECEIPTS);
    }
    delete state.pendingByUser[userId];
    writeState(state);

    return {
      attempted: true,
      accepted: receipt.reduce((total, line) => total + line.accepted, 0),
      remaining: receipt.reduce((total, line) => total + line.remaining, 0),
    };
  });
}
