import {createHash} from 'node:crypto';
import {MAX_BYTES,sanitizeImage} from './image.mjs';
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const route=new RegExp(`^/api/request-photos/(${uuid})/(${uuid})$`,'i');
export async function boundedBytes(request){
 if(Number(request.headers.get('content-length'))>MAX_BYTES)throw Error('Too large');
 const reader=request.body?.getReader();if(!reader)throw Error('Empty body');
 const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw Error('Too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 return Buffer.concat(chunks,length);
}
// Auth/storage adapters are injected for offline tests; the real adapter verifies JWT via getUser.
export function photoHandler(adapter){
 let running=0;
 return async request=>{
  const reply=(status,message)=>new Response(JSON.stringify({message}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  const match=route.exec(new URL(request.url).pathname);
  if(request.method!=='POST'||!match)return reply(404,'Bulunamadı.');
  const token=/^Bearer (\S+)$/.exec(request.headers.get('authorization')??'')?.[1];
  if(!token)return reply(401,'Giriş yapmalısınız.');
  if(running>=2)return reply(429,'Lütfen tekrar deneyin.');
  running++;
  try{
   const user=await adapter.identity(token);if(!user)return reply(401,'Oturum doğrulanamadı.');
   const requestId=match[1].toLowerCase(),uploadId=match[2].toLowerCase();
   if(!await adapter.owns(token,user.id,requestId))return reply(403,'Başvuruya erişilemiyor.');
   let image;
   try{image=await sanitizeImage(await boundedBytes(request),request.headers.get('content-type'),decodeURIComponent(request.headers.get('x-photo-name')??''));}
   catch{return reply(400,'Fotoğraf geçersiz. JPG, PNG veya WebP biçiminde, en fazla 5 MB bir görsel seçin.');}
   const hash=createHash('sha256').update(image).digest('hex');
   const slot=await adapter.reserve(user.id,requestId,uploadId,hash);
   if(!slot)return reply(409,'Fotoğraf sınırına ulaşıldı veya yükleme isteği değişti.');
   if(!slot.complete){
    await adapter.store(slot.path,image,hash);
    await adapter.complete(user.id,requestId,uploadId,hash);
   }
   return reply(200,'Fotoğraf yüklendi.');
  }catch{return reply(503,'Fotoğraf yüklenemedi. Aynı dosyayla tekrar deneyin; başvurunuz kayıtlıdır.');}
  finally{running--;}
 };
}
