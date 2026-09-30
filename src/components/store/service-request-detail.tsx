import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {requestKinds,requestStatuses,type ServiceRequest,type RequestHistory} from '@/lib/service-request-model';
import {useCatalog} from './catalog-provider';

export function ServiceRequestDetail({request}:{request:ServiceRequest}){
 const {products}=useCatalog();
 const [item,setItem]=useState<{product_id:string;variant_id:string|null;quantity:number}|null>(null);
 const [history,setHistory]=useState<RequestHistory[]>([]),[photos,setPhotos]=useState<string[]>([]),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setHistory([]);setPhotos([]);setError('');
  void (async()=>{try{
   const [h,p,i]=await Promise.all([supabase.from('service_request_history').select('*').eq('request_id',request.id).order('created_at'),supabase.storage.from('service-request-photos').list(request.id,{limit:100}),supabase.from('order_items').select('product_id,variant_id,quantity').eq('id',request.order_item_id).eq('order_id',request.order_id).single()]);
   if(h.error||p.error||i.error)throw new Error();
   const paths=(p.data??[]).filter(p=>p.id).map(p=>`${request.id}/${p.name}`);
   const signed=paths.length?await supabase.storage.from('service-request-photos').createSignedUrls(paths,300):{data:[],error:null};
   if(signed.error)throw new Error();
   if(alive){setItem(i.data);setHistory(h.data??[]);setPhotos((signed.data??[]).flatMap(p=>p.signedUrl?[p.signedUrl]:[]));}
  }catch{if(alive)setError('Başvuru geçmişi veya fotoğrafları yüklenemedi. Detayı yeniden açarak deneyin.');}})();
  return()=>{alive=false;};
 },[request.id,request.updated_at,request.order_item_id,request.order_id]);
 const product=products.find(p=>p.id===item?.product_id),variant=product?.variants.find(v=>v.id===item?.variant_id);
 return <div className="mt-4 space-y-3 border border-border p-4 text-sm">
  <p className="break-all">Başvuru no: {request.id}</p><p>{requestKinds[request.kind]} · {requestStatuses[request.status]}</p>
  <p className="break-all">Sipariş: {request.order_id}</p><p className="break-all">Sipariş ürünü: {request.order_item_id}</p><p>{request.email}</p>
  {item&&<p className="break-all">{product?.name??`Ürün: ${item.product_id}`} · {variant?`${variant.color} / ${variant.size}`:item.variant_id??'Varyant belirtilmemiş'} · {item.quantity} adet</p>}
  {request.reason&&<p className="whitespace-pre-wrap break-words">Neden: {request.reason}</p>}{request.description&&<p className="whitespace-pre-wrap break-words">{request.description}</p>}
  {request.decision_reason&&<p className="whitespace-pre-wrap break-words">Karar açıklaması: {request.decision_reason}</p>}
  {error&&<p role="alert">{error}</p>}
  <ol className="space-y-2">{history.map(h=><li key={h.id}>{new Date(h.created_at).toLocaleString('tr-TR')} · {requestStatuses[h.status]}{h.description&&` · ${h.description}`}</li>)}</ol>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((url,index)=><a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Başvuru fotoğrafı ${index+1}`} className="aspect-square w-full object-contain"/></a>)}</div>
 </div>;
}
