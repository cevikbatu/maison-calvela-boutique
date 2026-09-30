import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

test('public retail price policy only exposes published prices and grants no writes',{skip:!process.env.MC_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.MC_PGLITE_MODULE).href);const db=new PGlite();
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
   CREATE TABLE products(id integer PRIMARY KEY,published boolean);
   CREATE TABLE product_prices(product_id integer REFERENCES products(id),price numeric(12,2),sale_price numeric(12,2));
   ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
   GRANT SELECT ON products TO anon,authenticated;
   INSERT INTO products VALUES(1,true),(2,false);
   INSERT INTO product_prices VALUES(1,1234.56,NULL),(2,999,NULL);`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260930180000_public_product_prices.sql',import.meta.url),'utf8'));
  for(const role of ['anon','authenticated']){
   await db.exec(`SET ROLE ${role}`);
   assert.deepEqual((await db.query('SELECT product_id FROM product_prices')).rows,[{product_id:1}]);
   await assert.rejects(db.exec('UPDATE product_prices SET price=1'),/permission denied/);
   await assert.rejects(db.exec('INSERT INTO product_prices VALUES(1,0,NULL)'),/permission denied/);
   await db.exec('RESET ROLE');
  }
 }finally{await db.close();}
});
