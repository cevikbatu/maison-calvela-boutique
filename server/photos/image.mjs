import sharp from 'sharp';
export const MAX_BYTES=5*1024*1024;
export const MAX_PIXELS=16_000_000;

function kind(bytes){
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
 throw Error('Unsupported image');
}
function exactContainer(bytes,format){
 // Reject trailing payloads rather than letting a permissive decoder ignore them.
 if(format==='jpeg'&&(bytes.at(-2)!==255||bytes.at(-1)!==217))throw Error('Invalid JPEG end');
 if(format==='webp'&&(bytes.length<20||bytes.readUInt32LE(4)+8!==bytes.length))throw Error('Invalid WebP length');
 if(format==='png'){
  let offset=8,ended=false;
  while(offset+12<=bytes.length){
   const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
   if(length>MAX_BYTES||offset+length+12>bytes.length)throw Error('Truncated PNG');
   offset+=length+12;
   if(type==='IEND'){if(length!==0||offset!==bytes.length)throw Error('Invalid PNG end');ended=true;break;}
  }
  if(!ended)throw Error('Missing PNG end');
 }
}
export async function sanitizeImage(input,mime,filename){
 const bytes=Buffer.from(input);
 if(!bytes.length||bytes.length>MAX_BYTES)throw Error('Invalid image size');
 const format=kind(bytes),extension=/\.([a-z0-9]+)$/i.exec(filename??'')?.[1]?.toLowerCase();
 if(mime!==`image/${format}`||!(format==='jpeg'?['jpg','jpeg']:[format]).includes(extension))throw Error('Image type mismatch');
 exactContainer(bytes,format);
 // Conservative rejection of executable/polyglot markers even inside optional metadata.
 if(/<script\b|<html\b|<svg\b|<\?php|%PDF-|PK\x03\x04/i.test(bytes.toString('latin1')))throw Error('Suspicious image content');
 const image=sharp(bytes,{failOn:'warning',limitInputPixels:MAX_PIXELS,limitInputChannels:4,animated:false});
 const metadata=await image.metadata();
 if(metadata.format!==format||!metadata.width||!metadata.height||metadata.width*metadata.height>MAX_PIXELS||(metadata.pages??1)>1)throw Error('Image dimensions or format rejected');
 // Full decode + canonical re-encode. No withMetadata()/keepMetadata(): EXIF is removed.
 const output=await image.rotate().webp({quality:85}).timeout({seconds:5}).toBuffer();
 if(output.length>MAX_BYTES)throw Error('Encoded image too large');
 return output;
}
