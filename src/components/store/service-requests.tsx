import {useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';import {Textarea} from '@/components/ui/textarea';
import {useCatalog} from './catalog-provider';import {ServiceRequestDetail} from './service-request-detail';
import {requestKinds,requestStatuses,validateRequest,validateRequestPhotos,type ServiceRequest,type RequestDraft,type RequestKind} from '@/lib/service-request-model';
type Item={id:string;order_id:string;product_id:string;variant_id:string|null};
export function ServiceRequests({userId,email}:{userId:string;email:string}){
 const {products}=useCatalog();const [rows,setRows]=useState<ServiceRequest[]>([]),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [draft,setDraft]=useState<RequestDraft>({itemId:'',kind:'return',email,reason:'',description:''});
 const [loading,setLoading]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [files,setFiles]=useState<File[]>([]),[fileVersion,setFileVersion]=useState(0),[retry,setRetry]=useState(false);
 const pending=useRef<{id:string;draft:RequestDraft}|null>(null),writing=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[userId]);
 async function load(){setLoading(true);setError('');try{
  const [r,i]=await Promise.all([supabase.from('service_requests').select('*').eq('user_id',userId).order('created_at',{ascending:false}),supabase.from('order_items').select('id,order_id,product_id,variant_id,orders!inner(user_id)').eq('orders.user_id',userId)]);
  if(r.error||i.error)throw new Error();if(alive.current){setRows(r.data??[]);setItems(i.data??[]);setReady(true);}
 }catch{if(alive.current){setReady(false);setError('Başvurular şu anda yüklenemiyor. Lütfen tekrar deneyin.');}}finally{if(alive.current)setLoading(false);}}
 async function submit(event:FormEvent){event.preventDefault();if(writing.current)return;writing.current=true;setBusy(true);setError('');setNotice('');
  try{
   if(!pending.current)pending.current={id:crypto.randomUUID(),draft:validateRequest(draft)};
   const p=pending.current,v=p.draft;const {error}=await supabase.rpc('create_service_request',{p_id:p.id,p_order_item_id:v.itemId,p_kind:v.kind,p_email:v.email,p_reason:v.reason,p_description:v.description});
   if(error)throw new Error('Başvuru kaydı doğrulanamadı. Aynı başvuruyu Tekrar Dene ile güvenle kontrol edin.');
   if(!alive.current)return;pending.current=null;setRetry(false);setDraft({...draft,reason:'',description:''});setSelected(p.id);setNotice(`Başvurunuz alındı. Başvuru numarası: ${p.id}`);await load();
  }catch(cause){if(alive.current){setError(cause instanceof Error?cause.message:'Başvuru kaydedilemedi.');setRetry(!!pending.current);}}
  finally{writing.current=false;if(alive.current)setBusy(false);}
 }
 async function upload(){if(writing.current||!selected)return;writing.current=true;setBusy(true);setError('');
  try{validateRequestPhotos(files);if(!files.length)throw new Error('Fotoğraf seçin.');
   for(const file of files){const suffix=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';const {error}=await supabase.storage.from('service-request-photos').upload(`${selected}/${crypto.randomUUID()}.${suffix}`,file,{upsert:false,contentType:file.type});if(error)throw new Error('Bazı fotoğraflar yüklenemedi. Başvurunuz kayıtlıdır; detayı yeniden açıp yüklenenleri kontrol edin.');}
   if(alive.current){setFiles([]);setFileVersion(v=>v+1);setNotice('Fotoğraflar yüklendi. Görmek için başvuru detayını yeniden açabilirsiniz.');}
  }catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'Fotoğraf yüklenemedi.');}finally{writing.current=false;if(alive.current)setBusy(false);}
 }
 const current=rows.find(r=>r.id===selected);
 return <section className="border-t border-border pt-6"><h2 className="font-display text-3xl">İade &amp; Değişim Taleplerim</h2>
  {error&&<p role="alert" className="mt-4 text-sm">{error}</p>}{notice&&<p role="status" className="mt-4 break-words text-sm">{notice}</p>}
  {loading?<p className="mt-4 text-sm">Başvurular yükleniyor…</p>:!ready?<Button variant="luxuryOutline" className="mt-4" onClick={()=>void load()}>Tekrar Dene</Button>:<>
  {!rows.length&&<p className="mt-4 text-sm text-muted-foreground">Henüz başvurunuz yok.</p>}
  <ul className="mt-4 space-y-3">{rows.map(r=><li key={r.id}><button className="text-left text-sm underline" onClick={()=>setSelected(selected===r.id?null:r.id)}>{requestKinds[r.kind]} · {requestStatuses[r.status]} · {new Date(r.created_at).toLocaleDateString('tr-TR')} · #{r.id.slice(0,8)}</button></li>)}</ul>
  {current&&<><ServiceRequestDetail key={`${current.id}-${fileVersion}`} request={current}/>{['pending','reviewing'].includes(current.status)&&<div className="mt-4 space-y-3"><label className="block text-sm">Fotoğraf ekle (isteğe bağlı)<Input key={fileVersion} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>setFiles(Array.from(e.target.files??[]))}/></label><Button disabled={busy||!files.length} variant="luxuryOutline" onClick={()=>void upload()}>Fotoğrafları Yükle</Button></div>}</>}
  {!items.length?<p className="mt-6 text-sm text-muted-foreground">Başvuru yapılabilecek sipariş ürünü bulunmuyor.</p>:<form onSubmit={e=>void submit(e)} className="mt-6 space-y-4">
   <fieldset disabled={busy||retry} className="space-y-4"><label className="block text-sm">Sipariş / Ürün<select required className="mt-2 w-full border border-border bg-background p-3" value={draft.itemId} onChange={e=>setDraft({...draft,itemId:e.target.value})}><option value="">Seçin</option>{items.map(i=><option key={i.id} value={i.id}>#{i.order_id.slice(0,8)} · {products.find(p=>p.id===i.product_id)?.name??`Ürün ${i.product_id.slice(0,8)}`} · {i.variant_id?.slice(0,8)??'Varyant yok'}</option>)}</select></label>
   <label className="block text-sm">Talep türü<select className="mt-2 w-full border border-border bg-background p-3" value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as RequestKind})}>{Object.entries(requestKinds).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label className="block text-sm">E-posta<Input type="email" required maxLength={254} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
   <label className="block text-sm">Neden {draft.kind==='exchange'?'':'(isteğe bağlı)'}<Input required={draft.kind==='exchange'} maxLength={1000} value={draft.reason} onChange={e=>setDraft({...draft,reason:e.target.value})}/></label>
   <label className="block text-sm">Açıklama (isteğe bağlı)<Textarea maxLength={5000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
   </fieldset><Button type="submit" variant="luxuryOutline" disabled={busy}>{busy?'Kaydediliyor…':retry?'Tekrar Dene':'Başvuru Oluştur'}</Button>
  </form>}</>}
 </section>;
}
