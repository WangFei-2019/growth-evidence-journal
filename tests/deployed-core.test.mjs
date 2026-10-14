// Node 24: node --test tests/deployed-core.test.mjs
// Production TypeScript runs in memory. Fixtures contain fictional work only;
// configuration tests use private in-memory stores and never call a model.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import ts from 'typescript';

const sourceRoot=new URL('../app/',import.meta.url).href;
registerHooks({
 resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&context.parentURL?.startsWith(sourceRoot)){
   const candidate=new URL(specifier,context.parentURL);
   if(!/\.[^/]+$/.test(candidate.pathname)){
    const typed=new URL(candidate.href+'.ts');
    if(existsSync(typed))return {url:typed.href,shortCircuit:true};
   }
  }
  return nextResolve(specifier,context);
 },
 load(url,context,nextLoad){
  if(url.startsWith(sourceRoot)&&url.endsWith('.ts')){
   const source=readFileSync(new URL(url),'utf8');
   const compiled=ts.transpileModule(source,{fileName:fileURLToPath(url),compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
   assert.equal(compiled.diagnostics?.filter(item=>item.category===ts.DiagnosticCategory.Error).length,0);
   return {format:'module',source:compiled.outputText,shortCircuit:true};
  }
  return nextLoad(url,context);
 },
});

const {emptyStore,demoStore,validateStore}=await import('../app/lib/data.ts');
const {duplicateIndex,findRecordDuplicates,batchRecordDuplicates,duplicateReviewKey,requireDuplicateReview}=await import('../app/lib/record-duplicates.ts');
const {recycle,restoreTrash}=await import('../app/lib/lifecycle.ts');
const {newWorkTask,validateGrouping,emptyTaskPlan,appendGrouping,planContextTasks,commitTaskPlan,validateTaskStore}=await import('../app/lib/work-tasks.ts');
const {loadModelConfig,saveModelConfig,clearModelKey}=await import('../app/lib/model-config.ts');

function fragment(id,text,overrides={}){
 return {id,date:'2026-10-14',project:'虚构工作台',category:'日常工作',text,link:'',createdAt:'2026-10-14T01:00:00Z',...overrides};
}
function card(source,id='fictional-card'){
 return {id,title:'虚构性能排查记录',date:source.date,project:source.project,problem:'背景待补充',action:source.text,outcome:'结果待补充',skills:[],missing:[],sourceRefs:[{fragmentId:source.id,quote:source.text,field:'action'}],status:'draft',createdAt:'2026-10-14T01:00:00Z'};
}
function fixtureStore(fragments,evidence=[]){return validateStore({...emptyStore(),fragments,evidence});}
function memoryStorage(values=new Map(),user='test-user'){
 return {async getValue(bucket,key){const value=values.get(`${user}:${bucket}:${key}`);return value===undefined?undefined:structuredClone(value);},async putValue(bucket,key,value){values.set(`${user}:${bucket}:${key}`,structuredClone(value));}};
}

test('the initial fictional demo is a valid complete archive',()=>{
 const sample=demoStore(),validated=validateStore(structuredClone(sample));
 assert.ok(validated.fragments.length>0);
 assert.ok(validated.evidence.some(item=>item.status==='confirmed'));
 assert.ok(validated.reviews[0].sourceSnapshot.length>0);
 assert.equal(validated.fragments.length,sample.fragments.length);
 assert.doesNotThrow(()=>validateTaskStore(validated));
});

test('exact duplicates ignore date headings while keeping the prior record visible',()=>{
 const body='我整理了虚构工作台的接口边界清单，并邀请测试同事核对了三个异常场景。';
 const saved=fragment('saved','# 2026-10-13\n'+body,{date:'2026-10-13'});
 const incoming=fragment('incoming','# 2026-10-14\n'+body);
 const matches=findRecordDuplicates(incoming,duplicateIndex([saved]));
 assert.equal(matches.length,1);
 assert.equal(matches[0].kind,'exact');
 assert.equal(matches[0].origin,'saved');
 assert.equal(matches[0].fragment.id,saved.id);
});

test('similar progress is flagged for review rather than silently discarded',()=>{
 const body='我整理了虚构工作台的接口边界清单，并邀请测试同事核对了三个异常场景，随后补充了复现步骤和验证条件。';
 const saved=fragment('saved-similar',body);
 const incoming=fragment('incoming-similar',body+'补充第四个场景。');
 const matches=findRecordDuplicates(incoming,duplicateIndex([saved]));
 assert.equal(matches.length,1);
 assert.equal(matches[0].kind,'similar');
 assert.ok(matches[0].score<1);
 assert.equal(incoming.text,body+'补充第四个场景。');
});

test('a record never matches its own ID and unchanged saved IDs need no new duplicate approval',()=>{
 const saved=fragment('saved-id','我整理了虚构工作台的接口边界清单，并补充了异常场景验证步骤。');
 assert.deepEqual(findRecordDuplicates({...saved},duplicateIndex([saved])),[]);
 assert.doesNotThrow(()=>requireDuplicateReview([{...saved}],[saved]));
});

test('batch duplicates require approval and editing an approved candidate resets it',()=>{
 const first=fragment('batch-first','我整理了虚构工作台的接口边界清单，并补充了异常场景验证步骤。');
 const second={...first,id:'batch-second'};
 const rows=[first,second],matches=batchRecordDuplicates(rows,[]);
 assert.deepEqual(matches.get(first.id),[]);
 assert.equal(matches.get(second.id)[0].origin,'batch');
 assert.throws(()=>requireDuplicateReview(rows,[]),/尚未核对/);
 const review={[second.id]:duplicateReviewKey(second,matches.get(second.id))};
 assert.doesNotThrow(()=>requireDuplicateReview(rows,[],review));
 assert.throws(()=>requireDuplicateReview([first,{...second,date:'2026-10-15'}],[],review),/尚未核对/);
});

test('original records referenced by evidence or completed follow-ups cannot be recycled',()=>{
 const source=fragment('protected-original','我为虚构工作台编写了异常场景验证步骤。');
 assert.throws(()=>recycle(fixtureStore([source],[card(source)]),'fragment',source.id),/已有证据引用/);
 const linked={...fixtureStore([source]),followUps:[{fragmentId:source.id}]};
 assert.throws(()=>recycle(linked,'fragment',source.id),/跟进结果的依据/);
});

test('recycling and restoring a record retains its original text and attachment',()=>{
 const source=fragment('unreferenced-original','我整理了一份虚构工作台的归档说明。',{attachments:[{id:'fictional-attachment',name:'fictional.txt',type:'text/plain',size:3,data:'data:text/plain;base64,YWJj'}]});
 const original=fixtureStore([source]),removed=recycle(original,'fragment',source.id);
 assert.equal(removed.fragments.length,0);
 assert.equal(removed.trash.length,1);
 const restored=validateStore(restoreTrash(removed,removed.trash[0].id));
 assert.deepEqual(restored.fragments,[source]);
 assert.equal(restored.trash.length,0);
 assert.deepEqual(original.fragments,[source],'the original store is not mutated');
});

test('restoring an old evidence snapshot preserves subsequently edited original records',()=>{
 const source=fragment('snapshot-original','我为虚构工作台补充了第一轮异常场景验证步骤。');
 const removed=recycle(fixtureStore([source],[card(source)]),'evidence','fictional-card');
 const newer={...source,text:'我重新核对了虚构工作台的原始日志，并更正了验证步骤。'};
 const restored=validateStore(restoreTrash({...removed,fragments:[newer]},removed.trash[0].id));
 const recovered=restored.evidence.find(item=>item.id==='fictional-card');
 assert.deepEqual(restored.fragments.find(item=>item.id===newer.id),newer);
 assert.notEqual(recovered.sourceRefs[0].fragmentId,source.id);
 assert.equal(restored.fragments.find(item=>item.id===recovered.sourceRefs[0].fragmentId).text,source.text);
});

test('grouping an existing work task reuses its canonical name and labels',()=>{
 const source=fragment('existing-task-record','我补充了虚构工作台的异常场景验证步骤。');
 const task=newWorkTask('接口边界核对',source.project,['需求边界','异常场景']);
 const grouping=validateGrouping({groups:[{name:'模型自行改名',labels:['模型自行改标签'],existingTaskId:task.id,items:[{fragmentId:source.id,quote:source.text,kind:'action'}]}]},[source],{workTasks:[task]});
 const group=grouping.groups[0];
 assert.equal(group.name,task.name);
 assert.deepEqual(group.labels,task.labels);
 const plan=appendGrouping(emptyTaskPlan([source]),grouping,[source]);
 const result=validateStore(commitTaskPlan({...fixtureStore([source],[card(source)]),workTasks:[task]},plan,[source]));
 assert.equal(result.workTasks.length,1);
 assert.equal(result.taskLinks[0].taskId,task.id);
 assert.equal(result.evidence[0].workTaskName,task.name);
 assert.deepEqual(result.evidence[0].workTaskLabels,task.labels);
});

test('separate days of the same proposed work remain one task across batches',()=>{
 const first=fragment('day-one','我为虚构工作台整理了第一轮边界案例。',{date:'2026-10-13'});
 const second=fragment('day-two','我根据反馈为虚构工作台补充了第二轮边界案例。');
 let plan=emptyTaskPlan([first,second]);
 const firstResult=validateGrouping({groups:[{name:'边界案例整理',labels:['需求边界'],items:[{fragmentId:first.id,quote:first.text,kind:'action'}]}]},[first]);
 plan=appendGrouping(plan,firstResult,[first]);
 const proposal=planContextTasks([],plan)[0];
 const nextResult=validateGrouping({groups:[{name:'另一名称',existingTaskId:proposal.id,labels:['另一标签'],items:[{fragmentId:second.id,quote:second.text,kind:'action'}]}]},[second],{workTasks:[proposal]});
 plan=appendGrouping(plan,nextResult,[second]);
 assert.equal(plan.complete,true);
 assert.equal(plan.groups.length,1);
 assert.equal(plan.groups[0].items.length,2);
 const result=validateStore(commitTaskPlan(emptyStore(),plan,[first,second]));
 assert.equal(result.workTasks.length,1);
 assert.equal(new Set(result.taskLinks.map(item=>item.taskId)).size,1);
 assert.deepEqual(result.workTasks[0].labels,['需求边界']);
});

test('unknown or ungrounded grouping cannot silently become confirmed work',()=>{
 const source=fragment('unmatched-quote','我整理了虚构工作台的日志，具体结果仍需核对。');
 const result=validateGrouping({groups:[{name:'虚构工作',items:[{fragmentId:source.id,quote:'不存在于原文的成果',kind:'result'}]}]},[source]);
 assert.equal(result.groups.length,0);
 assert.equal(result.unassigned[0].quote,source.text);
 const plan=appendGrouping(emptyTaskPlan([source]),result,[source]);
 assert.throws(()=>commitTaskPlan(emptyStore(),plan,[source]),/未归组事项/);
});

test('saved model configuration survives a new storage view and clearing the key preserves the endpoint',async()=>{
 const values=new Map(),config={baseUrl:'https://model.example.test/v1',model:'fictional-chat-model',apiKey:'fixture-only-not-a-real-credential'};
 await saveModelConfig(memoryStorage(values),config);
 assert.deepEqual(await loadModelConfig(memoryStorage(values)),config);
 assert.deepEqual(await clearModelKey(memoryStorage(values)),{...config,apiKey:''});
 assert.deepEqual(await loadModelConfig(memoryStorage(values)),{...config,apiKey:''});
});

test('model configuration and key deletion remain isolated between local users',async()=>{
 const values=new Map(),first=memoryStorage(values,'fictional-user-a'),second=memoryStorage(values,'fictional-user-b');
 const config={baseUrl:'https://model.example.test/v1',model:'fictional-chat-model',apiKey:'fixture-only-never-sent'};
 await saveModelConfig(first,config);
 assert.deepEqual(await loadModelConfig(second),{baseUrl:'',model:'',apiKey:''});
 await saveModelConfig(second,{...config,model:'another-fictional-model',apiKey:'another-fixture-only-key'});
 await clearModelKey(first);
 assert.equal((await loadModelConfig(second)).apiKey,'another-fixture-only-key');
 assert.equal((await loadModelConfig(second)).model,'another-fictional-model');
 assert.equal((await loadModelConfig(first)).apiKey,'');
});
