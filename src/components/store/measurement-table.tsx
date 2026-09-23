import type { Product } from '@/data/catalog';
import { measurementColumns } from '@/lib/measurements';

export function MeasurementTable({ product }: { product: Product }) {
  const rows = product.sizes
    .map(size => ({ size, values: product.sizeMeasurements?.[size] }))
    .filter(row => row.values && Object.keys(row.values).length > 0);

  if (!rows.length) return null;
  return <div className="mt-5 max-w-full overflow-x-auto border-y border-border">
    <table className="w-full min-w-[570px] border-collapse text-left text-xs sm:text-sm">
      <caption className="sr-only">{product.name} beden ölçüleri, santimetre</caption>
      <thead><tr className="border-b border-border bg-panel text-muted-foreground"><th scope="col" className="px-3 py-3 font-medium">Beden</th>{measurementColumns.map(({key,label})=><th scope="col" key={key} className="whitespace-nowrap px-3 py-3 font-medium">{label}</th>)}</tr></thead>
      <tbody>{rows.map(({size,values})=><tr key={size} className="border-b border-border last:border-b-0"><th scope="row" className="px-3 py-3 font-medium">{size}</th>{measurementColumns.map(({key})=><td key={key} className="px-3 py-3 tabular-nums">{values?.[key] ?? '—'}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}