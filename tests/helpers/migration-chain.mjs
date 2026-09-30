import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const directory=new URL('../../supabase/migrations/',import.meta.url);
export const migrations=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort();
export const legacy=migrations.filter(name=>name.startsWith('20260923'));
export const pending=migrations.filter(name=>!legacy.includes(name));
// Platform interfaces only. Application tables/functions/policies come from the actual migration chain.
// This is not the Supabase Auth/Storage service and cannot prove HTTP/JWT/file handling.
export const platformSql=`
 CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text NOT NULL,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),name text NOT NULL,metadata jsonb,UNIQUE(bucket_id,name));
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
`;
export async function isolatedDatabase(){
 const {PGlite}=await import(pathToFileURL(process.env.MC_PGLITE_MODULE).href);
 const db=new PGlite();await db.exec(platformSql);return db;
}
export async function apply(db,names){for(const name of names){
 try{await db.exec(`BEGIN;\n${readFileSync(new URL(name,directory),'utf8')}\nCOMMIT;`);}
 catch(cause){await db.exec('ROLLBACK');throw new Error(`Migration failed: ${name}: ${cause.message}`,{cause});}
}}
export async function asActor(db,id,role='authenticated'){
 await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);
 if(!['authenticated','anon','service_role'].includes(role))throw Error('Invalid test role');
 await db.exec(`SET ROLE ${role}`);
}
