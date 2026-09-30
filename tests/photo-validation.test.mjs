import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {sanitizeImage,MAX_BYTES} from '../server/photos/image.mjs';
import {photoHandler} from '../server/photos/handler.mjs';
const fixture=format=>sharp({create:{width:4,height:4,channels:3,background:'#ac9b87'}}).toFormat(format).toBuffer();
for(const format of ['jpeg','png','webp'])test(`real ${format} decodes and re-encodes without metadata`,async()=>{
 const input=await fixture(format),out=await sanitizeImage(input,`image/${format}`,`image.${format}`);
 const meta=await sharp(out).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,4);assert.equal(meta.exif,undefined);
});
test('fake extension, fake MIME, zero bytes, unsupported and oversize files rejected',async()=>{
 const png=await fixture('png');
 for(const [bytes,mime,name] of [[png,'image/png','a.jpg'],[png,'image/jpeg','a.jpg'],[Buffer.alloc(0),'image/png','a.png'],[Buffer.from('<html>evil</html>'),'image/jpeg','a.jpg'],[Buffer.alloc(MAX_BYTES+1),'image/png','a.png']])await assert.rejects(sanitizeImage(bytes,mime,name));
});
test('truncated and corrupt images and trailing polyglots rejected',async()=>{
 for(const format of ['jpeg','png','webp']){const bytes=await fixture(format);await assert.rejects(sanitizeImage(bytes.subarray(0,bytes.length-4),`image/${format}`,`a.${format}`));await assert.rejects(sanitizeImage(Buffer.concat([bytes,Buffer.from('<script>evil</script>')]),`image/${format}`,`a.${format}`));}
 const broken=Buffer.from(await fixture('png'));broken.fill(0,40,55);await assert.rejects(sanitizeImage(broken,'image/png','a.png'));
});
test('decompression pixel limit rejects large dimensions',async()=>{
 const image=await sharp({create:{width:4100,height:4000,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(sanitizeImage(image,'image/png','a.png'));
});
const id='10000000-0000-0000-0000-000000000001',upload='20000000-0000-0000-0000-000000000001';
test('upload endpoint verifies identity and ownership before any reservation or write',async()=>{
 const image=await fixture('png');let writes=0,reservations=0;
 const adapter={identity:async token=>token==='owner'?{id:'owner'}:token==='other'?{id:'other'}:null,owns:async(_token,user)=>user==='owner',reserve:async()=>{reservations++;return {path:`${id}/${upload}.webp`,complete:false};},store:async()=>{writes++;},complete:async()=>{}};
 const handle=photoHandler(adapter),request=token=>new Request(`http://localhost/api/request-photos/${id}/${upload}`,{method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),'content-type':'image/png','x-photo-name':'a.png'},body:image});
 assert.equal((await handle(request())).status,401);assert.equal((await handle(request('invalid'))).status,401);assert.equal((await handle(request('other'))).status,403);
 assert.equal(reservations,0);assert.equal(writes,0);assert.equal((await handle(request('owner'))).status,200);assert.equal(writes,1);
 adapter.reserve=async()=>({path:`${id}/${upload}.webp`,complete:true});assert.equal((await handle(request('owner'))).status,200);assert.equal(writes,1);
 adapter.reserve=async()=>null;assert.equal((await handle(request('owner'))).status,409);assert.equal(writes,1);
});
test('upload route refuses guessed path traversal',async()=>{
 const handle=photoHandler({identity:()=>{throw Error('Must not authenticate invalid path');}});
 assert.equal((await handle(new Request('http://localhost/api/request-photos/not-a-uuid/../guess',{method:'POST'}))).status,404);
});
