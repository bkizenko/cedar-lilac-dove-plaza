import test from 'node:test';import assert from 'node:assert/strict';import {staticPath,mime} from './play-server.mjs';
test('static assets stay inside a release, even with encoded traversal or malformed URLs',()=>{
 assert.equal(staticPath('/release/static','http://localhost/assets/game.js'),'/release/static/assets/game.js');assert.equal(staticPath('/release/static','http://localhost/%2e%2e%2fsecret.txt'),null);assert.equal(staticPath('/release/static','http://localhost/%ZZ'),null);assert.equal(mime['.js'],'text/javascript');assert.equal(mime['.mp3'],'audio/mpeg');
});
import {createPlayServer} from './play-server.mjs';
import {Readable} from 'node:stream';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
async function dispatch(server,url,method='GET',body=''){
 const request=Readable.from(body?[Buffer.from(body)]:[]);Object.assign(request,{url,method,headers:{'content-type':'application/json'}});
 const chunks=[];let status,headers;const response={headersSent:false,writeHead(code,h){status=code;headers=h;this.headersSent=true;},write(b){chunks.push(Buffer.from(b));},end(b){if(b)chunks.push(Buffer.from(b));}};
 await server.listeners('request')[0](request,response);return {status,headers,text:Buffer.concat(chunks).toString()};
}
test('the production adapter serves real asset types, rejects missing bundles and forwards SSR methods/body',async()=>{
 const root=mkdtempSync(join(tmpdir(),'hearthwild-server-test-'));mkdirSync(join(root,'static/assets'),{recursive:true});writeFileSync(join(root,'static/assets/game.js'),'export const ready=true;');let called=0;
 const server=createPlayServer(root,{async fetch(request){called++;assert.equal(request.method,'POST');assert.equal(await request.text(),'{"offer":2}');return new Response('accepted',{status:201,headers:{'content-type':'text/plain'}});}});
 try{
  const asset=await dispatch(server,'/assets/game.js');assert.equal(asset.status,200);assert.equal(asset.headers['content-type'],'text/javascript');assert.match(asset.text,/ready=true/);assert.equal((await dispatch(server,'/assets/missing.js')).status,404);assert.equal(called,0);assert.equal((await dispatch(server,'/assets/game.js','HEAD')).text,'');const post=await dispatch(server,'/api/trade','POST','{"offer":2}');assert.equal(post.status,201);assert.equal(post.text,'accepted');assert.equal(called,1);
 }finally{server.close();rmSync(root,{recursive:true,force:true});}
});
