import type { CartItem, Product } from '../../data/catalog';
import { catalogStockMessage, getSizeAvailability, stockSelectionError, type CatalogStockState } from './stock-selection.ts';

export const cartStockChangedMessage = 'Bu ürünün mevcut stoğu değişti.';
export const cartQuantityMessage = 'Miktar 1 ile 99 arasında bir tam sayı olmalıdır.';

// Validate the final total, never just the increment.
export function cartQuantityError(product: Product | undefined, item: CartItem, catalog: CatalogStockState): string | null {
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return cartQuantityMessage;
  const issue = stockSelectionError(product, item.color, item.size, catalog);
  if (issue) return issue;
  const stock = getSizeAvailability(product!, item.color, item.size, catalog);
  return stock.inventory !== null && item.quantity <= stock.inventory
    ? null : 'Bu renk ve beden için yeterli stok bulunmuyor.';
}

export function cartStockWarning(product: Product | undefined, item: CartItem, catalog: CatalogStockState): string | null {
  const message = catalogStockMessage(catalog);
  if (message) return message;
  if (!product) return 'Bu ürünün stok bilgisi mevcut değil.';
  const stock = getSizeAvailability(product, item.color, item.size, catalog);
  if (stock.status === 'unavailable') return 'Bu renk ve beden için stok bilgisi mevcut değil.';
  if (!stock.available || stock.inventory === null || item.quantity > stock.inventory) return cartStockChangedMessage;
  return item.quantity > 99 ? cartQuantityMessage : null;
}