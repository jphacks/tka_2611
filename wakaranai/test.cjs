'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js'),vm=require('node:vm'),fs=require('node:fs');
let checks=0;const eq=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};const rejects=fn=>{assert.throws(fn);checks++;};
const reason='左右は同じ値だから、両辺に同じ操作をすると等しさが保たれる。';
const opts=(d,unit='simultaneous',count=10)=>({unit,count,due:E.addDays(E.day(),7),studentIds:d.students.map(s=>s.id)});
function finishRegular(d){while(E.currentItem(d)?.kind==='regular'){const q=E.currentItem(d).question;E.answerRegular(d,String(q.answer),String(q.y??''));E.advance(d);}}
function wrongAndAnalyze(d,answers){E.answerRegular(d,'99');E.chooseReason(d,'分からない');answers.forEach(x=>E.answerAnalysis(d,x));E.advance(d);}
function review(d,fail=false){while(E.currentItem(d)){const i=E.currentItem(d),q=i.question;if(i.kind==='regular')E.answerRegular(d,String(q.answer),String(q.y??''));else E.answerReview(d,fail?'間違い':q.type==='reason'?reason:String(q.answer),String(q.y??''),fail);E.advance(d);}}
for(const [input,want] of [['３',3],['x = −3',-3],['1/2',.5],['1/0',null],['',null],['3oops',null]])eq(E.numeric(input),want,'numeric');
eq(E.languageStatus(reason),'good');eq(E.languageStatus('6を反対側に持っていけばいいから'),'check');eq(E.languageStatus('わからない'),'unknown');
for(const q of [...E.LINEAR,...E.SIMULTANEOUS])for(const p of E.prompts(q))eq(E.assessPrompt(p,p.type==='reason'?reason:String(p.answer)).status,'good',q.id);
let d=E.createState();rejects(()=>E.submitHomework(d));rejects(()=>E.answerRegular(d,'abc'));eq(E.currentItem(d).phase,'problem');
E.answerRegular(d,'3');eq(E.currentItem(d).phase,'result');eq(E.currentItem(d).entries.length,0);rejects(()=>E.answerRegular(d,'3'));rejects(()=>E.answerAnalysis(d,'3'));E.advance(d);finishRegular(d);E.submitHomework(d);eq(E.stats(E.work(d)).correct,3);eq(E.candidateCounts(d).length,0);E.submitHomework(d);eq(d.events.filter(e=>e.type==='submitted').length,1);
d=E.createState();wrongAndAnalyze(d,['3x+6','9','3','移項すればいい']);eq(E.candidateCounts(d).length,0,'unsubmitted candidates hidden');eq(Object.keys(d.issues).length,0);finishRegular(d);E.submitHomework(d);eq(d.issues['kou:equality'].status,'need');eq(E.stats(E.work(d)).correct,2);eq(E.candidateCounts(d).find(x=>x.id==='equality').count,1);
rejects(()=>E.markTaught(d,'not-real'));E.markTaught(d,'kou:equality','天秤で説明');eq(d.issues['kou:equality'].status,'taught');eq(d.issues['kou:equality'].masteredAt,null);rejects(()=>E.markTaught(d,'kou:equality'));
let plan=E.assignmentPlan(d,opts(d));eq(plan.map(p=>[p.studentId,p.regular,p.review]),[['kou',8,2],['tanaka',10,0],['sato',10,0]]);
eq(E.assignmentPlan(d,{...opts(d),due:E.day()})[0].review,0,'same-day review excluded');
const oldId=d.activeAssignment,oldAnswers=JSON.stringify(E.work(d));E.createAssignment(d,opts(d));eq(E.work(d).items.length,10);eq(E.work(d).items.filter(i=>i.kind==='review').map(i=>i.question.skill),['equality','equality']);eq(JSON.stringify(E.assignment(d,oldId).works.kou),oldAnswers);
eq(E.assignmentPlan(d,opts(d))[0].review,0,'do not duplicate reserved review');finishRegular(d);E.answerReview(d,'5');E.advance(d);eq(d.issues['kou:equality'].status,'taught','one question cannot master');rejects(()=>E.submitHomework(d));E.answerReview(d,reason);E.advance(d);eq(d.issues['kou:equality'].status,'taught','not mastered until submission');E.submitHomework(d);eq(d.issues['kou:equality'].status,'mastered');eq(E.currentItem(d),undefined);eq(E.assignmentPlan(d,opts(d))[0].review,0,'mastered not automatically requeued');
const copy=JSON.parse(JSON.stringify(d));eq(E.studentStates(copy).equality,'mastered');eq(E.assignment(copy).works.kou.submitted,true);
let fail=E.seedDemo();E.markTaught(fail,'kou:equality');E.createAssignment(fail,opts(fail));review(fail,true);E.submitHomework(fail);eq(fail.issues['kou:equality'].status,'need');eq(E.candidateCounts(fail).find(s=>s.id==='equality').count,2);E.markTaught(fail,'kou:equality');eq(E.assignmentPlan(fail,opts(fail))[0].review,2,'retry after instruction');
let demo=E.seedDemo();eq(E.candidateCounts(demo).map(s=>[s.id,s.count]),[['expand',1],['equality',2]]);eq(E.stats(E.work(demo)).correct,2);
E.markTaught(demo,'kou:equality');E.markTaught(demo,'sato:expand');eq(E.assignmentPlan(demo,opts(demo)).map(p=>p.target?.skill||null),['equality',null,'expand']);
// New evidence must not overwrite a teacher's previous record until submitted.
let newer=E.seedDemo();E.markTaught(newer,'kou:equality');E.createAssignment(newer,opts(newer,'linear',3));wrongAndAnalyze(newer,['10x','99','99','移項すればいい']);eq(newer.issues['kou:equality'].status,'taught');review(newer);E.submitHomework(newer);eq(newer.issues['kou:equality'].status,'need','fresh evidence prevents stale review mastery');eq(E.work(newer).items.filter(i=>i.kind==='review')[0].reviewOutcome,'superseded');
for(const change of [{unit:'bad'},{count:2},{count:11},{due:'2000-01-01'},{due:'2026-02-31'},{studentIds:[]},{studentIds:['unknown']}])rejects(()=>E.createAssignment(d,{...opts(d),...change}));
// Render smoke tests and storage restoration use an isolated document, not a real browser.
const store=new Map(),nodes=new Map();const node=()=>({innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},focus(){}});const document={querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(){return []}};const context=vm.createContext({HomeworkEngine:E,document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout(){},console,Blob,URL});vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);eq(nodes.get('#app').innerHTML.includes('data-role="student"'),true);eq(nodes.get('#app').innerHTML.includes('data-role="teacher"'),true);for(const view of ['learn','map','teacher','history']){vm.runInContext(`workspaceRole='${view==='teacher'?'teacher':'student'}';view='${view}';render();`,context);eq(nodes.get('#app').innerHTML.includes('Wakaran'),true);}
vm.runInContext("workspaceRole='teacher';db=E.seedDemo();view='teacher';render();teacherTab='assign';render();save();",context);eq(JSON.parse(store.get('wakaranai-v2-main')).issues['kou:equality'].status,'need');eq(nodes.get('#app').innerHTML.includes('生徒ごとの出題プレビュー'),true);
console.log(`${checks} checks passed: 20 questions, answer routing, submission, class aggregation, individualized assignment, instruction/review transitions, stale evidence, persistence and rendering.`);
// API integration tests: all provider responses are fake; no external AI calls.
vm.runInContext("workspaceRole='student';view='learn';render();",context);eq(nodes.get('#app').innerHTML.includes('data-view="teacher"'),false);vm.runInContext("workspaceRole='teacher';render();",context);eq(nodes.get('#app').innerHTML.includes('data-view="learn"'),false);
vm.runInContext("action('choose-workspace');",context);eq(nodes.get('#app').innerHTML.includes('data-role="student"'),true,'return to role entry');
vm.runInContext("workspaceRole='student';action('student-history');",context);eq(vm.runInContext('view',context),'history','submitted student goes to history');
vm.runInContext("pendingAI={};action('choose-workspace');",context);eq(vm.runInContext('workspaceRole',context),'student','cannot switch roles during AI request');vm.runInContext("pendingAI=null;",context);
async function testAI(){
 const {createServer,resolvePrompt,analyze}=require('./server.cjs');
 const body={requestId:'test-1',kind:'analysis',questionId:'linear-1',promptIndex:3,answer:reason};
 const result={status:'good',reason:'等しさを保つ理由を説明しています。',evidenceQuote:'両辺に同じ操作'};
 const assessment={...result,source:'ai',model:'openai/gpt-oss-120b',promptVersion:'equality-v1'};
 let calls=0;
 const provider=async(url,options)=>{calls++;eq(url,'https://api.groq.com/openai/v1/chat/completions');const payload=JSON.parse(options.body);eq(payload.response_format.json_schema.strict,true);eq(Object.keys(JSON.parse(payload.messages[1].content)).sort(),['answer','originalQuestion','question']);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]})};};
 eq((await analyze(resolvePrompt(body),{apiKey:'fake-test-key',fetchImpl:provider})).status,'good');
 for(const status of ['check','unknown'])eq(E.validateAIResult({...result,status},reason).status,status);
 rejects(()=>resolvePrompt({...body,answer:' '}));rejects(()=>resolvePrompt({...body,promptIndex:0}));rejects(()=>resolvePrompt({...body,kind:'review',skillId:'calc',reviewIndex:0}));
 eq(resolvePrompt({...body,kind:'review',skillId:'equality',reviewIndex:1}).p.type,'reason');
 rejects(()=>E.validateAIResult({...result,status:'wrong'},reason));rejects(()=>E.validateAIResult({...result,evidenceQuote:'存在しない引用'},reason));rejects(()=>E.validateAIResult({...result,extra:true},reason));
 const failing=[
  [{ok:false,status:400},'AI_REQUEST'],[{ok:false,status:404},'AI_MODEL'],[{ok:false,status:503},'AI_SERVICE'],[{ok:false,status:429},'AI_LIMIT'],[{ok:false,status:401},'AI_AUTHENTICATION'],[{ok:false,status:403},'AI_FORBIDDEN'],
  [{ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:JSON.stringify(result)}}]})},'AI_INVALID_RESULT'],
  [{ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]})},'AI_INVALID_RESULT']
 ];
 for(const [response,code] of failing){await assert.rejects(()=>analyze(resolvePrompt(body),{apiKey:'fake',fetchImpl:async()=>response}),e=>e.code===code);checks++;}
 await assert.rejects(()=>analyze(resolvePrompt(body),{apiKey:'',fetchImpl:provider}),e=>e.code==='AI_NOT_CONFIGURED');checks++;
 await assert.rejects(()=>analyze(resolvePrompt(body),{apiKey:'fake',fetchImpl:async()=>{throw Object.assign(Error(),{name:'TimeoutError'});}}),e=>e.code==='AI_TIMEOUT');checks++;
 for(const [cause,code] of [['ENOTFOUND','AI_DNS'],['CERT_HAS_EXPIRED','AI_TLS'],['ECONNRESET','AI_NETWORK']]){
  await assert.rejects(()=>analyze(resolvePrompt(body),{apiKey:'fake',fetchImpl:async()=>{throw Object.assign(new TypeError('secret-test-value'),{cause:{code:cause}});}}),e=>e.code===code&&!e.message.includes('secret-test-value'));checks++;
 }
 await assert.rejects(()=>analyze(resolvePrompt(body),{apiKey:'日本語',fetchImpl:provider}),e=>e.code==='AI_KEY_FORMAT');checks++;
 let state=E.createState();E.answerRegular(state,'99');E.chooseReason(state,'分からない');['3x+6','9','3'].forEach(a=>E.answerAnalysis(state,a));
 const before=JSON.stringify(state);rejects(()=>E.answerAnalysis(state,reason,{...assessment,status:'bad'}));eq(JSON.stringify(state),before,'bad result cannot mutate records');
 E.answerAnalysis(state,reason,assessment);eq(E.currentItem(state).entries[3].source,'ai');eq(E.currentItem(state).entries.length,4);rejects(()=>E.answerAnalysis(state,reason,assessment));
 state=E.seedDemo();E.markTaught(state,'kou:equality');E.createAssignment(state,opts(state));finishRegular(state);E.answerReview(state,'5');E.advance(state);E.answerReview(state,reason,'',false,assessment);eq(E.currentItem(state).entries[0].source,'ai');E.advance(state);E.submitHomework(state);eq(state.issues['kou:equality'].status,'mastered');
 for(const key of ['', 'fake-test-key']){
  const server=createServer({apiKey:key,fetchImpl:provider});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const send=(data,origin=base)=>fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
  try{
   const statusResponse=await fetch(base+'/api/status');eq(await statusResponse.json(),{version:'groq-connection-v3',keyConfigured:!!key});
   let response=await send(body);eq(response.status,key?200:503);const data=await response.json();if(key){eq(data.requestId,body.requestId);eq(data.assessment.source,'ai');}else eq(data.error.code,'AI_NOT_CONFIGURED');eq(JSON.stringify(data).includes('fake-test-key'),false);
   const previous=calls;eq((await send({...body,promptIndex:0})).status,400);eq(calls,previous,'numeric questions never call provider');
   eq((await send(body,'https://example.com')).status,403);eq((await send({...body,answer:'a'.repeat(17000)})).status,400);
   for(const file of ['/server.cjs','/.env','/README.md','/test.cjs'])eq((await fetch(base+file)).status,404);
   eq((await fetch(base+'/')).status,200);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 }
 // Isolated UI: retry preserves text, pending submission deduplicates, stale responses discarded.
 context.crypto={randomUUID:()=> 'ui-test'};context.AbortController=AbortController;context.clearTimeout=()=>{};
 let resolveFetch,uiCalls=0;
 context.fetch=(url)=>{if(url==='/api/status')return Promise.resolve({ok:true,json:async()=>({version:'groq-connection-v3',keyConfigured:true})});uiCalls++;return new Promise(r=>resolveFetch=r);};
 const prepare=()=>{vm.runInContext("workspaceRole='student';db=E.createState();mode='main';view='learn';E.answerRegular(db,'99');E.chooseReason(db,'分からない');['3x+6','9','3'].forEach(v=>E.answerAnalysis(db,v));render();",context);document.querySelector('#chat-input').value=reason;};
 const success=()=>({ok:true,json:async()=>({ok:true,requestId:'ui-test',assessment})});
 prepare();let promise=vm.runInContext("submitReason('analysis')",context);await vm.runInContext("submitReason('analysis')",context);await new Promise(r=>setImmediate(r));eq(uiCalls,1,'double click only sends once');resolveFetch({ok:false,json:async()=>({ok:false,error:{message:'仮の通信失敗'}})});await promise;eq(vm.runInContext('item().entries.length',context),3);eq(nodes.get('#chat-input').value,reason,'failed request preserves input');
 promise=vm.runInContext("submitReason('analysis')",context);await new Promise(r=>setImmediate(r));resolveFetch(success());await promise;eq(vm.runInContext('item().entries.length',context),4,'retry commits once');
 prepare();promise=vm.runInContext("submitReason('analysis')",context);vm.runInContext("db.activeStudent='tanaka'",context);await new Promise(r=>setImmediate(r));resolveFetch(success());await promise;eq(vm.runInContext('item().entries.length',context),0,'no result on another student');
 prepare();nodes.get('#chat-input').value=' ';const prior=uiCalls;await vm.runInContext("submitReason('analysis')",context);eq(uiCalls,prior,'empty answer never sends');
 eq(E.seedDemo().issues['kou:equality'].evidence.method,'自由記述・固定ルール','demo stays offline');

 // Exercise the real form routing, not just the async helper.
 const chatNode=document.querySelector('#chat-form'),answerNode=document.querySelector('#answer-form');
 chatNode.addEventListener=(type,fn)=>chatNode[type]=fn;
 answerNode.addEventListener=(type,fn)=>answerNode[type]=fn;
 vm.runInContext("db=E.createState();mode='main';E.answerRegular(db,'99');E.chooseReason(db,'分からない');render();",context);
 const numericCalls=uiCalls;document.querySelector('#chat-input').value='3x+6';chatNode.submit({preventDefault(){}});eq(uiCalls,numericCalls);eq(vm.runInContext('item().entries.length',context),1);
 prepare();vm.runInContext("mode='demo';render();",context);chatNode.submit({preventDefault(){}});eq(uiCalls,numericCalls,'demo form does not call AI');eq(vm.runInContext('item().entries.length',context),4);
 vm.runInContext("db=E.seedDemo();mode='main';E.markTaught(db,'kou:equality');E.createAssignment(db,{unit:'linear',count:3,due:E.addDays(E.day(),7),studentIds:['kou']});E.answerRegular(db,String(item().question.answer));E.advance(db);E.answerReview(db,'5');E.advance(db);render();",context);
 document.querySelector('#answer').value=reason;promise=vm.runInContext("submitReason('review')",context);await new Promise(r=>setImmediate(r));resolveFetch(success());await promise;eq(vm.runInContext('item().entries[0].source',context),'ai');
 console.log(checks+' total checks passed, including mocked Groq/server/UI tests. No real AI API calls.');
}
const watchdog=setTimeout(()=>{console.error('API tests did not finish');process.exitCode=1;},10000);
testAI().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
