import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../../integrations/supabase/types';

export type Address = Tables<'addresses'>;
export type AddressDraft = Pick<Address,'label'|'recipient'|'line1'|'line2'|'district'|'city'|'postal_code'>;
export const emptyAddress: AddressDraft = {label:'Ev',recipient:'',line1:'',line2:'',district:'',city:'',postal_code:''};
type Client = SupabaseClient<Database>;

export function validateAddress(draft: AddressDraft): AddressDraft {
 const value = Object.fromEntries(Object.entries(draft).map(([key,text])=>[key,text.trim()])) as AddressDraft;
 for(const key of ['recipient','line1','district','city'] as const){
  if(!value[key])throw new Error('Alıcı adı, adres, ilçe ve il alanlarını doldurun.');
 }
 if(Object.values(value).some(text=>text.length>300))throw new Error('Adres alanları en fazla 300 karakter olabilir.');
 if(value.postal_code&&!/^\d{5}$/.test(value.postal_code))throw new Error('Posta kodu 5 rakam olmalı.');
 return value;
}

export async function saveAddress(client:Client,userId:string,id:string|null,draft:AddressDraft):Promise<Address>{
 if(!userId)throw new Error('Adres kaydetmek için giriş yapın.');
 const payload={...validateAddress(draft),user_id:userId};
 const result=id
  ?await client.from('addresses').update(payload).eq('id',id).eq('user_id',userId).select('*').single()
  :await client.from('addresses').insert(payload).select('*').single();
 if(result.error||!result.data)throw new Error('Adres kaydedilemedi. Lütfen tekrar deneyin.');
 return result.data;
}

export async function removeAddress(client:Client,userId:string,id:string):Promise<void>{
 if(!userId)throw new Error('Adres silmek için giriş yapın.');
 const result=await client.from('addresses').delete().eq('id',id).eq('user_id',userId).select('id').single();
 if(result.error||!result.data)throw new Error('Adres silinemedi. Lütfen tekrar deneyin.');
}
