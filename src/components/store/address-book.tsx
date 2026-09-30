import {useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {emptyAddress,saveAddress,removeAddress,type Address,type AddressDraft} from './address-data';

export function AddressBook({userId}:{userId:string}){
 const [addresses,setAddresses]=useState<Address[]>([]),[draft,setDraft]=useState<AddressDraft>({...emptyAddress});
 const [editing,setEditing]=useState<string|null>(null),[defaultId,setDefaultId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [defaultReady,setDefaultReady]=useState(false);
 const alive=useRef(true),writing=useRef(false);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[userId]);
 async function load(){
  setLoading(true);setError('');
  try{
   const [a,d]=await Promise.all([supabase.from('addresses').select('*').eq('user_id',userId).order('created_at'),supabase.from('default_addresses').select('address_id').eq('user_id',userId).maybeSingle()]);
   if(!alive.current)return;
   if(a.error)throw new Error('Adresler yüklenemedi. Lütfen tekrar deneyin.');
   setAddresses(a.data??[]);setDefaultId(d.data?.address_id??null);setDefaultReady(!d.error);
  }catch{if(alive.current)setError('Adresler yüklenemedi. Lütfen tekrar deneyin.');}
  finally{if(alive.current)setLoading(false);}
 }
 async function action(task:()=>Promise<void>){
  if(writing.current)return;writing.current=true;setBusy(true);setError('');setNotice('');
  try{await task();}catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'İşlem tamamlanamadı.');}
  finally{writing.current=false;if(alive.current)setBusy(false);}
 }
 async function save(event:FormEvent){event.preventDefault();await action(async()=>{
  const result=await saveAddress(supabase,userId,editing,draft);if(!alive.current)return;
  setAddresses(current=>editing?current.map(a=>a.id===editing?result:a):[...current,result]);
  setEditing(null);setDraft({...emptyAddress});setNotice('Adres kaydedildi.');
 });}
 async function remove(id:string){await action(async()=>{
  await removeAddress(supabase,userId,id);if(!alive.current)return;
  setAddresses(current=>current.filter(a=>a.id!==id));if(defaultId===id)setDefaultId(null);
  if(editing===id){setEditing(null);setDraft({...emptyAddress});}setNotice('Adres silindi.');
 });}
 async function chooseDefault(id:string){await action(async()=>{
  const {error}=await supabase.from('default_addresses').upsert({user_id:userId,address_id:id},{onConflict:'user_id'});
  if(error)throw new Error('Varsayılan adres kaydedilemedi. Lütfen tekrar deneyin.');
  if(alive.current){setDefaultId(id);setNotice('Varsayılan teslimat adresi güncellendi.');}
 });}
 return <section className="border-t border-border pt-6"><h2 className="font-display text-3xl">Adreslerim</h2>
  {error&&<p role="alert" className="mt-4 text-sm">{error} <button type="button" className="underline" disabled={busy||loading} onClick={()=>void load()}>Tekrar Dene</button></p>}
  {notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}
  {loading?<p className="mt-4 text-sm">Adresler yükleniyor…</p>:<>
  {!defaultReady&&<p className="mt-4 text-xs text-muted-foreground">Varsayılan adres seçimi şu anda kullanılamıyor. Adreslerinizi yönetmeye devam edebilirsiniz.</p>}
  {!error&&addresses.length===0&&<p className="mt-4 text-sm text-muted-foreground">Kayıtlı adresiniz yok.</p>}
  <fieldset disabled={busy} className="min-w-0">{addresses.map(a=><div key={a.id} className="mt-5 border-b border-border pb-4 text-sm">
   <p className="font-medium">{a.label} · {a.recipient}</p><p className="mt-1 break-words text-muted-foreground">{a.line1}{a.line2&&`, ${a.line2}`} · {a.district}, {a.city} {a.postal_code}</p>
   {a.id===defaultId&&<p className="mt-2 text-xs">Varsayılan teslimat adresi</p>}
   <div className="mt-2 flex flex-wrap gap-4"><button type="button" className="underline" onClick={()=>{setEditing(a.id);setDraft({label:a.label,recipient:a.recipient,line1:a.line1,line2:a.line2,district:a.district,city:a.city,postal_code:a.postal_code});}}>Düzenle</button><button type="button" className="underline" onClick={()=>{if(window.confirm('Bu adres silinsin mi?'))void remove(a.id);}}>Sil</button>
   {defaultReady&&a.id!==defaultId&&<button type="button" className="underline" onClick={()=>void chooseDefault(a.id)}>Varsayılan yap</button>}</div>
  </div>)}
  <h3 className="mt-7 text-sm font-medium">{editing?'Adresi düzenle':'Yeni adres'}</h3>
  <form onSubmit={e=>void save(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
   {([['label','Adres adı'],['recipient','Alıcı adı'],['line1','Adres satırı'],['line2','Ek adres'],['district','İlçe'],['city','İl'],['postal_code','Posta kodu']] as const).map(([key,label])=><label key={key} className={`text-xs ${key==='line1'?'sm:col-span-2':''}`}>{label}<Input required={['recipient','line1','district','city'].includes(key)} maxLength={key==='postal_code'?5:300} inputMode={key==='postal_code'?'numeric':undefined} pattern={key==='postal_code'?'[0-9]{5}':undefined} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} className="mt-1 rounded-none"/></label>)}
   <div className="flex gap-3 sm:col-span-2"><Button type="submit" variant="luxuryOutline">{busy?'Kaydediliyor…':'Adresi Kaydet'}</Button>{editing&&<Button type="button" variant="ghost" onClick={()=>{setEditing(null);setDraft({...emptyAddress});}}>Vazgeç</Button>}</div>
  </form></fieldset></>}
 </section>;
}
