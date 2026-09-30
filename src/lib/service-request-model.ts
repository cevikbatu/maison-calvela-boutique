export const requestKinds={return:'İade',exchange:'Değişim',defect:'Kusurlu ürün bildirimi'} as const;
export const requestStatuses={pending:'Beklemede',reviewing:'İnceleniyor',approved:'Onaylandı',rejected:'Reddedildi',processing:'İşlemde',completed:'Tamamlandı'} as const;
export type RequestKind=keyof typeof requestKinds;
export type RequestStatus=keyof typeof requestStatuses;
export type ServiceRequest={id:string;user_id:string;order_id:string;order_item_id:string;kind:RequestKind;email:string;reason:string;description:string;status:RequestStatus;decision_reason:string;decided_by:string|null;decided_at:string|null;created_at:string;updated_at:string};
export type RequestHistory={id:string;request_id:string;status:RequestStatus;description:string;actor_id:string;created_at:string};
export type RequestDraft={itemId:string;kind:RequestKind;email:string;reason:string;description:string};
export function validateRequest(draft:RequestDraft):RequestDraft{
 const value={...draft,email:draft.email.trim(),reason:draft.reason.trim(),description:draft.description.trim()};
 if(!value.itemId||!(value.kind in requestKinds))throw new Error('Sipariş ürününü ve talep türünü seçin.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)||value.email.length>254)throw new Error('Geçerli bir e-posta adresi girin.');
 if(value.kind==='exchange'&&!value.reason)throw new Error('Değişim nedenini belirtin.');
 if(value.reason.length>1000||value.description.length>5000)throw new Error('Açıklama veya neden izin verilen uzunluğu aşıyor.');
 return value;
}
export function decisionOptions(request:Pick<ServiceRequest,'kind'|'status'>):RequestStatus[]{
 if(request.status==='completed'||request.status==='rejected')return [];
 if(request.status==='processing')return ['completed'];
 if(request.status==='approved')return ['processing'];
 return ['reviewing','approved','processing',...(request.kind==='exchange'?['rejected' as const]:[])];
}
export function validateRequestPhotos(files:readonly Pick<File,'type'|'size'>[]){
 if(files.length>3)throw new Error('En fazla 3 fotoğraf seçin.');
 if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024||f.size===0))throw new Error('Fotoğraflar JPG, PNG veya WebP olmalı ve 5 MB değerini aşmamalı.');
}
// Plain-text preview only. There is deliberately no sender, network provider or send method.
export function requestEmailPreview(id:string,event:'received'|RequestStatus,reason=''){
 if(event==='rejected'&&!reason.trim())throw new Error('Ret açıklaması gerekli.');
 return {subject:`Maison Calvela · Başvuru ${id}`,text:`Başvuru numaranız: ${id}\n${event==='received'?'Başvurunuz alındı.':`Durum: ${requestStatuses[event]}`}\n${reason.trim()}`,deliveryEnabled:false as const};
}
