import { getProductVariantStock } from '../../data/catalog.ts';
import type { Product, Size } from '../../data/catalog';

export type CatalogStockState = { loading: boolean; error: boolean };
const ready: CatalogStockState = { loading: false, error: false };
export const stockVerificationError = 'Stok bilgisi şu anda doğrulanamıyor. Lütfen tekrar deneyin.';

export function catalogStockMessage(state: CatalogStockState): string | null {
  return state.loading ? 'Stok bilgisi doğrulanıyor…' : state.error ? stockVerificationError : null;
}

export function getSizeAvailability(product: Product, color: string, size: string, catalog: CatalogStockState = ready) {
  if (catalog.loading || catalog.error) return {
    status: 'unavailable' as const, variant: null, inventory: null, available: false,
    label: catalog.loading ? 'Doğrulanıyor' : 'Doğrulanamıyor',
  };
  const stock = getProductVariantStock(product, color, size);
  const available = stock.status === 'known' && Number.isSafeInteger(stock.inventory) && stock.inventory > 0;
  return { ...stock, available, label: available ? '' : stock.status === 'unavailable' ? 'Stok bilgisi yok' : 'Tükendi' };
}

export function retainAvailableSize(product: Product, color: string, size: Size | null, catalog: CatalogStockState = ready): Size | null {
  return size && getSizeAvailability(product, color, size, catalog).available ? size : null;
}

// Recheck at the action boundary, even if a disabled option was selected externally.
export function stockSelectionError(product: Product | undefined, color: string, size: Size | null, catalog: CatalogStockState = ready): string | null {
  const message = catalogStockMessage(catalog);
  if (message) return message;
  if (!product) return 'Stok bilgisi şu anda alınamıyor. Lütfen tekrar deneyin.';
  if (!size) return 'Lütfen stokta olan bir beden seçin.';
  const stock = getSizeAvailability(product, color, size);
  if (stock.available) return null;
  return stock.status === 'unavailable'
    ? 'Bu renk ve beden için stok bilgisi mevcut değil.'
    : 'Bu renk ve beden şu anda tükenmiş.';
}
