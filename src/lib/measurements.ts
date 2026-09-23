export const measurementColumns = [
  { key: 'shoulder', label: 'Omuz' },
  { key: 'chest', label: 'Göğüs' },
  { key: 'waist', label: 'Bel' },
  { key: 'length', label: 'Ürün Boyu' },
  { key: 'sleeve', label: 'Kol Boyu' },
] as const;

export type MeasurementKey = (typeof measurementColumns)[number]['key'];
export type ProductMeasurements = Record<string, Partial<Record<MeasurementKey, number>>>;

// Existing products can contain string measurements; only display valid numeric values.
export function parseMeasurements(value: unknown): ProductMeasurements {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ProductMeasurements = {};
  for (const [size, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const row: Partial<Record<MeasurementKey, number>> = {};
    for (const { key } of measurementColumns) {
      const entry = record[key];
      if (typeof entry !== 'string' && typeof entry !== 'number') continue;
      const text = String(entry).trim().replace(',', '.');
      if (!/^\d+(?:\.\d+)?$/.test(text)) continue;
      const number = Number(text);
      if (Number.isFinite(number) && number > 0) row[key] = number;
    }
    if (Object.keys(row).length) result[size] = row;
  }
  return result;
}