import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../index.js';
const env={AI_OWNER_EMAIL:'owner@example.com',GEMINI_API_KEY:'unit-test-key',GEMINI_MODEL:'test-model'};
const request=(body,extra={})=>new Request('https://test.example/api/assistant',{method:'POST',headers:{origin:'https://test.example','content-type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.com',...extra},body:JSON.stringify(body)});
const body={messages:[{role:'user',content:'你好'}],context:{tasks:[],notes:[]}};
test('anonymous and other accounts cannot access the shared API key',async()=>{
 const anonymous=await handleRequest(new Request('https://test.example/api/assistant/status'),env);
 assert.equal(anonymous.status,401);
 const other=await handleRequest(request(body,{'oai-authenticated-user-email':'other@example.com'}),env);
 assert.equal(other.status,403);
});
test('cross-origin and oversized requests are rejected before calling the provider',async()=>{
 assert.equal((await handleRequest(request(body,{origin:'https://other.example'}),env)).status,403);
 assert.equal((await handleRequest(request({...body,padding:'x'.repeat(250000)}),env)).status,413);
});
test('successful chat returns the structured plan and secrets never appear in response',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\//);
  assert.equal(options.headers['x-goog-api-key'],'unit-test-key');
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'你好',actions:[],navigate:'none'})}]}}]});
 });
 const response=await handleRequest(request(body),env);assert.equal(response.status,200);
 const result=await response.text();assert.doesNotMatch(result,/unit-test-key/);assert.equal(JSON.parse(result).message,'你好');
});
test('provider key failures are explicit and never expose upstream detail',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:{message:'API key not valid',secret:'unit-test-key'}},{status:400}));
 const response=await handleRequest(request(body),env);const result=await response.json();
 assert.equal(result.code,'invalid_key');assert.doesNotMatch(JSON.stringify(result),/unit-test-key/);
});
test('ready status requires a successful provider model check',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({name:'models/test-model'}));
 const response=await handleRequest(new Request('https://test.example/api/assistant/status',{headers:{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.com'}}),env);
 assert.equal(response.status,200);assert.equal((await response.json()).ready,true);
});
test('status never claims readiness for an invalid key',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:{message:'API key not valid'}},{status:400}));
 const response=await handleRequest(new Request('https://test.example/api/assistant/status',{headers:{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.com'}}),env);
 assert.equal(response.status,502);assert.equal((await response.json()).code,'invalid_key');
});
