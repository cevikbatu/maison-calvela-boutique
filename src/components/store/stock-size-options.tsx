import type { Product, Size } from '@/data/catalog';
import { Button } from '@/components/ui/button';
import { catalogStockMessage, getSizeAvailability, type CatalogStockState } from './stock-selection';

export function StockVerificationNotice({ catalog, onRetry }: {
  catalog: CatalogStockState; onRetry: () => Promise<void>;
}) {
  const message = catalogStockMessage(catalog);
  if (!message) return null;
  return <div className="mt-3">
    <p role={catalog.loading ? 'status' : 'alert'} className="text-sm text-muted-foreground">{message}</p>
    {catalog.error && !catalog.loading && <Button type="button" variant="outline" className="mt-3"
      onClick={() => void onRetry()}>Tekrar Dene</Button>}
  </div>;
}

export function StockSizeOptions({ product, color, size, onSelect, catalog, onRetry }: {
  product: Product; color: string; size: Size | null; onSelect: (size: Size) => void;
  catalog: CatalogStockState; onRetry: () => Promise<void>;
}) {
  return <>
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Beden seçenekleri" aria-busy={catalog.loading}>
      {product.sizes.map(value => {
        const stock = getSizeAvailability(product, color, value, catalog);
        return <Button key={value} type="button" variant={size === value && stock.available ? 'default' : 'outline'}
          disabled={!stock.available} aria-pressed={size === value && stock.available}
          aria-label={value + (stock.label ? ' — ' + stock.label : '')}
          onClick={() => { if (stock.available) onSelect(value); }} className="h-auto min-h-11 min-w-12 flex-col gap-0.5 rounded-none px-3 py-2">
          <span>{value}</span>{stock.label && <span className="text-[10px] font-normal">{stock.label}</span>}
        </Button>;
      })}
    </div>
    <StockVerificationNotice catalog={catalog} onRetry={onRetry}/>
  </>;
}