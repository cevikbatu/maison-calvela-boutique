import { products, type Product } from '@/data/catalog';

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function searchProducts(query: string): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return products.filter(product => product.visible);
  return products.filter(product => {
    if (!product.visible) return false;
    const category = product.category === 'tshirt' ? 't shirt tshirt' : product.category === 'polo' ? 'polo yaka' : 'uzun kollu';
    const text = normalize(`${product.name} ${product.description} ${product.gender} ${product.gender === 'kadin' ? 'kadın' : 'erkek'} ${category}`);
    return terms.every(term => text.includes(term));
  });
}