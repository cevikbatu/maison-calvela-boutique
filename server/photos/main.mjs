// Standalone Node service; never imported by Vite/Cloudflare/browser code.
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {photoHandler} from './handler.mjs';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,secret=process.env.PHOTO_UPLOAD_SERVICE_ROLE_KEY;
if(!url||!key||!secret)throw Error('Upload service configuration missing');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const timedFetch=apiKey=>(input,init={})=>{
 const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(init.headers).forEach((v,k)=>headers.set(k,v));
 if(/^(sb_secret_|sb_publishable_)/.test(apiKey)&&headers.get('Authorization')===`Bearer ${apiKey}`)headers.delete('Authorization');
 return fetch(input,{...init,headers,signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(10_000)]):AbortSignal.timeout(10_000)});
};
const admin=createClient(url,secret,{...options,global:{fetch:timedFetch(secret)}});
const caller=token=>createClient(url,key,{...options,global:{fetch:timedFetch(key),headers:{Authorization:`Bearer ${token}`}}});
const bucket=admin.storage.from('service-request-photos');
const handler=photoHandler({
 async identity(token){const {data,error}=await caller(token).auth.getUser(token);return error?null:data.user;},
 async owns(token,user,id){const {data,error}=await caller(token).from('service_requests').select('id').eq('id',id).eq('user_id',user).in('status',['pending','reviewing']).maybeSingle();return !error&&!!data;},
 async reserve(user,request,upload,hash){const {data,error}=await admin.rpc('reserve_request_photo',{p_user:user,p_request:request,p_upload:upload,p_hash:hash});if(error)throw Error('Reservation failed');return data;},
 async store(path,bytes,hash){
  const {error}=await bucket.upload(path,bytes,{contentType:'image/webp',upsert:false});
  if(error){
   // A lost response or simultaneous replay may have already stored this exact object.
   const {data,error:readError}=await bucket.download(path);
   if(readError||!data||createHash('sha256').update(Buffer.from(await data.arrayBuffer())).digest('hex')!==hash)throw Error('Storage save not confirmed');
  }
 },
 async complete(user,request,upload,hash){const {error}=await admin.rpc('complete_request_photo',{p_user:user,p_request:request,p_upload:upload,p_hash:hash});if(error)throw Error('Completion failed');},
});
const server=createServer(async(req,res)=>{
 try{
  const request=new Request(`http://localhost${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req),duplex:'half'});
  const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'cache-control':'no-store'});res.end('Upload unavailable');}
});
server.requestTimeout=30_000;server.headersTimeout=10_000;
const port=Number(process.env.PHOTO_UPLOAD_PORT||9889);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid upload service port');
server.listen(port,'127.0.0.1');
