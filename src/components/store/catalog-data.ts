import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategorySlug, Gender, Product, Size } from '../../data/catalog';
import type { Database } from '../../integrations/supabase/types';
import { parseMeasurements } from '../../lib/measurements.ts';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ImageRow = Database['public']['Tables']['product_images']['Row'];
type VariantRow = Pick<Database['public']['Tables']['product_variants']['Row'], 'id'|'product_id'|'color'|'size'|'inventory'|'sku'|'updated_at'>;
function adapt(row:Pick<ProductRow,'id'|'slug'|'title'|'gender'|'category_id'|'description'|'fabric'|'production_note'|'model_height'|'model_size'|'size_measurements'|'sizes'|'colors'|'published'|'featured'|'new_arrival'>, categories:Record<string,CategorySlug>, images:ImageRow[], variants:VariantRow[]): Product {
  const rawColors=Array.isArray(row.colors)?row.colors:[];
  const colors=rawColors.filter((v):v is {name:string;token:string}=>typeof v==='object'&&v!==null&&!Array.isArray(v)&&typeof v['name']==='string'&&typeof v['token']==='string');
  return {id:row.id,slug:row.slug,name:row.title,gender:row.gender as Gender,category:categories[row.category_id]??'tshirt',price:0,description:row.description,fabric:row.fabric,productionNote:row.production_note,modelHeight:row.model_height,modelSize:row.model_size,sizeMeasurements:parseMeasurements(row.size_measurements),colors,sizes:row.sizes as Size[],images:images.filter(i=>i.product_id===row.id).sort((a,b)=>a.sort_order-b.sort_order).map(i=>i.url),featured:row.featured,newArrival:row.new_arrival,visible:row.published,collectionIds:[],variants:variants.filter(v=>v.product_id===row.id).map(v=>({id:v.id,productId:v.product_id,color:v.color,size:v.size,inventory:v.inventory,sku:v.sku,updatedAt:v.updated_at,colorToken:colors.find(c=>c.name===v.color)?.token??null}))};
}

// Read-only loader. Any query failure rejects the load and reaches CatalogProvider's error state.
export async function loadCatalog(client: SupabaseClient<Database>, resolveImage: (url:string)=>Promise<string>): Promise<Product[]> {
  const [p,c,i]=await Promise.all([
    client.from('products').select('id,slug,title,gender,category_id,description,fabric,production_note,model_height,model_size,size_measurements,sizes,colors,published,featured,new_arrival,created_at,updated_at').eq('published',true).order('created_at'),
    client.from('categories').select('id,slug'),
    client.from('product_images').select('id,product_id,url,alt,sort_order,created_at'),
  ]);
  if(p.error||c.error||i.error) throw p.error??c.error??i.error;
  const rows=p.data??[];
  const variants:VariantRow[]=[];
  if(rows.length){
    const productIds=rows.map(row=>row.id);
    const pageSize=1000;
    for(let offset=0;;offset+=pageSize){
      const v=await client.from('product_variants').select('id,product_id,color,size,inventory,sku,updated_at')
        .in('product_id',productIds).order('id').range(offset,offset+pageSize-1);
      if(v.error) throw v.error;
      variants.push(...(v.data??[]));
      if((v.data?.length??0)<pageSize) break;
    }
  }
  const resolved=await Promise.all((i.data??[]).map(async image=>({...image,url:await resolveImage(image.url)})));
  const categories=Object.fromEntries((c.data??[]).map(cat=>[cat.id,cat.slug as CategorySlug]));
  return rows.map(row=>adapt(row,categories,resolved,variants));
}