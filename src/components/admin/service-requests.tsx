import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';import {Button} from '@/components/ui/button';import {Textarea} from '@/components/ui/textarea';
import {ServiceRequestDetail} from '@/components/store/service-request-detail';
import {decisionOptions,requestKinds,requestStatuses,type ServiceRequest,type RequestStatus} from '@/lib/service-request-model';
export function AdminServiceRequests(){
 const [rows,setRows]=useState<ServiceRequest[]>([]),[filter,setFilter]=useState(''),[selected,setSelected]=useState<string|null>(null),[reason,setReason]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[]);
 async function load(){setLoading(true);setError('');try{const {data,error}=await supabase.from('service_requests').select('*').order('created_at',{ascending:false});if(error)throw error;if(alive.current)setRows(data??[]);}catch{if(alive.current)setError('Başvurular yüklenemedi. Lütfen tekrar deneyin.');}finally{if(alive.current)setLoading(false);}}
 const current=rows.find(r=>r.id===selected);
 async function decide(status:RequestStatus){if(!current||lock.current)return;if(status==='rejected'&&!reason.trim()){setError('Reddetme gerekçesini yazın.');return;}
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{const {data,error}=await supabase.rpc('decide_service_request',{p_id:current.id,p_expected_updated_at:current.updated_at,p_status:status,p_reason:reason.trim()});
   if(error||data!==true)throw new Error();if(alive.current){setNotice('Karar kaydedildi. Müşteri hesabına yansıtıldı; e-posta gönderimi kapalıdır.');setReason('');await load();}
  }catch{if(alive.current){setError('Karar doğrulanamadı veya başvuru değişti. Güncel kaydı yenileyip tekrar kontrol edin.');setSelected(null);}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="py-8"><h2 className="font-display text-3xl">İade &amp; Değişim Talepleri</h2>
  {notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}{error&&<p role="alert" className="mt-4 text-sm">{error}</p>}
  <div className="mt-6 flex flex-wrap gap-3"><label className="text-sm">Durum<select className="ml-3 border border-border bg-background p-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tümü</option>{Object.entries(requestStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><Button variant="luxuryOutline" disabled={busy||loading} onClick={()=>void load()}>Yenile</Button></div>
  {loading?<p className="mt-5">Başvurular yükleniyor…</p>:<><ul className="mt-6 divide-y divide-border">{rows.filter(r=>!filter||r.status===filter).map(r=><li key={r.id} className="py-3"><button disabled={busy} className="text-left text-sm underline" onClick={()=>{setSelected(r.id);setReason('');setError('');}}>{requestKinds[r.kind]} · {requestStatuses[r.status]} · #{r.id.slice(0,8)} · {r.email}</button></li>)}</ul>{!error&&!rows.filter(r=>!filter||r.status===filter).length&&<p className="mt-5 text-sm">Bu durumda başvuru bulunmuyor.</p>}</>}
  {current&&<><ServiceRequestDetail key={current.id} request={current}/>{current.kind!=='exchange'&&<p className="mt-4 text-xs text-muted-foreground">Kanuni hak bildirimi ön onaya bağlı değildir. Bu modülde iade veya kusurlu ürün bildirimi reddedilmez.</p>}
   {!!decisionOptions(current).length&&<fieldset disabled={busy||loading} className="mt-5 space-y-4"><label className="block text-sm">Karar açıklaması (reddetmede zorunlu)<Textarea maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="flex flex-wrap gap-3">{decisionOptions(current).map(status=><Button key={status} variant="luxuryOutline" onClick={()=>void decide(status)}>{requestStatuses[status]}</Button>)}</div></fieldset>}</>}
 </section>;
}
