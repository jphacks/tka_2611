'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const {createServer}=require('./server.cjs');
let checks=0,calls=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const origin='https://wakaranai-test.onrender.com';
const body={requestId:'public-test',kind:'analysis',questionId:'linear-1',promptIndex:3,answer:'左右に同じ操作をすると等しさが保たれるから'};
const provider=async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({status:'good',reason:'等しさが保たれると説明しています。',evidenceQuote:null})}}]})};};
function send(server,{path='/api/analyze',method='POST',host='wakaranai-test.onrender.com',from=origin,headers={}}={}){
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:server.address().port,path,method,headers:{Host:host,Origin:from,'Content-Type':'application/json',...headers}},res=>{
   let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,text:data,headers:res.headers}));
  });req.on('error',reject);req.end(method==='POST'?JSON.stringify(body):undefined);
 });
}
async function withServer(options,fn){
 const server=createServer({apiKey:'fake-public-key',publicOrigin:origin,fetchImpl:provider,...options});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await fn(server);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
async function main(){
 for(const publicOrigin of ['http://example.com','https://example.com/path','https://user:pass@example.com','https://example.com?x=1']){assert.throws(()=>createServer({publicOrigin}));checks++;}
 await withServer({maxDailyRequests:2},async server=>{
  const previous=calls;
  eq((await send(server,{from:'https://evil.example'})).status,403);
  eq((await send(server,{host:'evil.example'})).status,403);
  eq((await send(server,{from:'null'})).status,403);
  eq((await send(server,{from:'http://wakaranai-test.onrender.com'})).status,403);
  eq((await send(server,{from:'https://evil.example',headers:{'X-Forwarded-Host':'wakaranai-test.onrender.com','X-Forwarded-Proto':'https'}})).status,403);
  eq(calls,previous);
  const response=await send(server);eq(response.status,200);eq(JSON.parse(response.text).assessment.source,'ai');eq(response.text.includes('fake-public-key'),false);
  eq((await send(server)).status,200);eq((await send(server)).status,429);eq(calls,previous+2);
  eq((await send(server,{path:'/healthz',method:'GET'})).status,200);
  for(const path of ['/server.cjs','/.env','/.git/config','/package.json','/test-public.cjs','/DEPLOY.md'])eq((await send(server,{path,method:'GET'})).status,404);
  for(const path of ['/','/style.css','/app.js','/engine.js'])eq((await send(server,{path,method:'GET'})).status,200);
 });
 await withServer({maxRequests:1},async server=>{eq((await send(server)).status,200);eq((await send(server)).status,429);});
 let release,entered;
 const started=new Promise(r=>entered=r);
 await withServer({maxConcurrent:1,fetchImpl:async()=>{entered();await new Promise(r=>release=r);return provider();}},async server=>{
  const pending=send(server);await started;eq((await send(server)).status,429);release();eq((await pending).status,200);
 });
 console.log(checks+' public hosting checks passed. No real AI API calls.');
}
const watchdog=setTimeout(()=>{console.error('Public tests timed out');process.exit(1);},10000);
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
