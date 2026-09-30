import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAdminRole,isMissingAdminRole} from '../docs/drafts/admin-access.ts';
function client(result){const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},maybeSingle:async()=>result};return {from:()=>q,filters};}
test('admin verification requires exact actor and admin role',async()=>{const c=client({data:{role:'admin'},error:null});assert.deepEqual(await assertAdminRole(c,'actor'),{ok:true});assert.deepEqual(c.filters,[['user_id','actor'],['role','admin']]);});
test('role absence is distinct from database failure',async()=>{
 await assert.rejects(assertAdminRole(client({data:null,error:null}),'actor'),isMissingAdminRole);
 await assert.rejects(assertAdminRole(client({data:null,error:{message:'offline'}}),'actor'),e=>!isMissingAdminRole(e)&&e.message==='ADMIN_VERIFICATION_FAILED');
});
test('unknown auth and configuration errors are not treated as missing roles',()=>{assert.equal(isMissingAdminRole(new Error('Unauthorized')),false);assert.equal(isMissingAdminRole(new Error('Missing configuration')),false);});
