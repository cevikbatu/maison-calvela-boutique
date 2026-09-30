// Node decoder runs in a separate service; no native dependency enters Workers or the browser.
export async function proxyPhotoUpload(request:Request):Promise<Response>{
 const unavailable=()=>new Response('Fotoğraf yükleme şu anda kullanılamıyor.',{status:503,headers:{'cache-control':'no-store'}});
 const endpoint=process.env['PHOTO_UPLOAD_SERVER_URL'];if(!endpoint)return unavailable();
 let base:URL;try{base=new URL(endpoint);}catch{return unavailable();}
 const local=process.env['NODE_ENV']!=='production'&&['localhost','127.0.0.1'].includes(base.hostname);
 if((base.protocol!=='https:'&&!(local&&base.protocol==='http:'))||base.username||base.password||base.search||base.hash||base.pathname!=='/')return unavailable();
 if(request.method!=='POST')return new Response(null,{status:405});
 const headers=new Headers();for(const name of ['authorization','content-type','x-photo-name']){const value=request.headers.get(name);if(value)headers.set(name,value);}
 const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});
 const chunks:Uint8Array[]=[];let size=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024){await reader.cancel();return new Response('Fotoğraf çok büyük.',{status:413});}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return await fetch(new URL(new URL(request.url).pathname,base),{method:'POST',headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(25_000)});
 }catch{return unavailable();}finally{reader.releaseLock();}
}
