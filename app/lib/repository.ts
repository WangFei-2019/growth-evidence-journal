import type { Store } from './types';
import { demoStore, emptyStore, KEY, validateStore } from './data';
export type Workspace='personal'|'demo';
export type Envelope={revision:number;updatedAt:string;data:Store};
export class ConflictError extends Error { constructor(public remote:Envelope,public base:Store){super('另一个页面修改了同一项内容，你的修改已保留为恢复草稿。');} }
import {assertSession,checkSecurity,decode,encode,legacySession,rawGet,sessionDatabase,withProfileLock,type Session} from './profile-store';
import {isCipher,passwordKey,seal,unseal,type Protection,type CipherValue} from './local-crypto';
export function db(session=legacySession){return sessionDatabase(session);}
function draftKey(key:string){if(typeof sessionStorage==='undefined')return key;let id=sessionStorage.getItem('growth-evidence-tab');if(!id){id=crypto.randomUUID();sessionStorage.setItem('growth-evidence-tab',id);}return `${key}:tab:${id}`;}
export async function getValue<T>(bucket:string,key:string,session=legacySession):Promise<T|undefined>{assertSession(session);const d=await db(session),actual=bucket==='drafts'?draftKey(key):key;let raw=await rawGet(d,bucket,actual),where=actual;if(raw===undefined&&bucket==='drafts'){raw=await rawGet(d,bucket,key);where=key;}return decode<T>(session,bucket,where,raw);}
export async function putValue(bucket:string,key:string,value:unknown,session=legacySession){return withProfileLock(session,async()=>{const d=await db(session),keys=bucket==='drafts'?[...new Set([key,draftKey(key)])]:[key],encoded=await Promise.all(keys.map(k=>encode(session,bucket,k,value)));await new Promise<void>((resolve,reject)=>{const tx=d.transaction([...new Set([bucket,'meta'])],'readwrite');checkSecurity(tx,session,()=>keys.forEach((k,i)=>tx.objectStore(bucket).put(encoded[i],k)));tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error('档案已锁定、保护设置已改变或保存失败。'));});});}
export async function deleteValue(bucket:string,key:string,session=legacySession){return withProfileLock(session,async()=>{const d=await db(session);await new Promise<void>((resolve,reject)=>{const tx=d.transaction([...new Set([bucket,'meta'])],'readwrite');checkSecurity(tx,session,()=>{tx.objectStore(bucket).delete(key);if(bucket==='drafts')tx.objectStore(bucket).delete(draftKey(key));});tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error('档案状态改变，请重新打开。'));});});}
export async function openWorkspace(space:Workspace,session=legacySession):Promise<Envelope>{
 const stored=await getValue<Envelope>('spaces',space,session);if(stored)return {...stored,data:validateStore(stored.data)};
 const old=session.identity.database==='growth-evidence-library'?localStorage.getItem(KEY):null;let data=space==='demo'?demoStore():emptyStore();
 if(space==='personal'&&old){const migrated=validateStore(JSON.parse(old));data={...migrated,mode:'personal'};await putValue('meta','migration',{at:new Date().toISOString(),from:migrated.mode},session);}
 const fresh={revision:0,updatedAt:new Date().toISOString(),data};
 await withProfileLock(session,async()=>{const d=await db(session),encoded=await encode(session,'spaces',space,fresh);await new Promise<void>((resolve,reject)=>{const tx=d.transaction(['spaces','meta'],'readwrite');checkSecurity(tx,session,()=>{const r=tx.objectStore('spaces').get(space);r.onsuccess=()=>{if(r.result===undefined)tx.objectStore('spaces').put(encoded,space);};});tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error('档案初始化没有完成。'));});});
 if(old&&space==='personal'&&session!==legacySession)localStorage.removeItem(KEY);
 return (await getValue<Envelope>('spaces',space,session))!;
}
export function hasArchiveContent(data:Store){return [data.projects,data.fragments,data.evidence,data.reviews,data.trash||[],data.followUps||[],data.workTasks||[]].some(items=>items.length>0);}
export async function initialWorkspace(session=legacySession){
 const preference=await getValue<Workspace>('meta','workspace-preference',session);
 if(preference==='personal'||preference==='demo')return {space:preference,envelope:await openWorkspace(preference,session)};
 const personal=await openWorkspace('personal',session);
 if(hasArchiveContent(personal.data))return {space:'personal' as const,envelope:personal};
 return {space:'demo' as const,envelope:await openWorkspace('demo',session)};
}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeStores(base:Store,local:Store,remote:Store,prefer?:'local'|'remote'):Store {
 const result={...remote};
 for(const key of ['projects','fragments','evidence','reviews','trash','followUps','processing','workTasks','taskLinks'] as const){
  const before=new Map((base[key]||[]).map(v=>[v.id,v])),mine=new Map((local[key]||[]).map(v=>[v.id,v])),theirs=new Map((remote[key]||[]).map(v=>[v.id,v]));
  for(const id of new Set([...before.keys(),...mine.keys()])){const b=before.get(id),l=mine.get(id),r=theirs.get(id);if(equal(b,l))continue;if(!equal(b,r)&&!equal(l,r)){if(!prefer)throw new Error(`同一项内容发生冲突：${id}`);if(prefer==='remote')continue;}if(l)theirs.set(id,l);else theirs.delete(id);}
  (result as unknown as Record<string,unknown>)[key]=[...theirs.values()];
 }
 return result;
}
export async function commitWorkspace(space:Workspace,base:Envelope,local:Store,session=legacySession):Promise<Envelope>{return withProfileLock(session,async()=>{
 const d=await db(session);
 for(let attempt=0;attempt<8;attempt++){
  const raw=await rawGet(d,'spaces',space),remote=(await decode<Envelope>(session,'spaces',space,raw))||base;let data=local;
  if(remote.revision!==base.revision){try{data=mergeStores(base.data,local,remote.data);}catch{throw new ConflictError(remote,base.data);}}
  const next={revision:remote.revision+1,updatedAt:new Date().toISOString(),data:validateStore(data)},checkpoint=`checkpoint:${space}:${remote.revision%5}`;
  const encoded=await encode(session,'spaces',space,next),saved=await encode(session,'meta',checkpoint,remote);
  const committed=await new Promise<boolean>((resolve,reject)=>{const tx=d.transaction(['spaces','meta'],'readwrite');let ok=false;checkSecurity(tx,session,()=>{const r=tx.objectStore('spaces').get(space);r.onsuccess=()=>{const latest=r.result;const unchanged=isCipher(raw)?isCipher(latest)&&latest.stamp===raw.stamp:JSON.stringify(latest)===JSON.stringify(raw);if(unchanged){tx.objectStore('spaces').put(encoded,space);tx.objectStore('meta').put(saved,checkpoint);ok=true;}};});tx.oncomplete=()=>resolve(ok);tx.onabort=tx.onerror=()=>reject(new Error('档案已锁定或保护设置改变，修改未提交。'));});
  if(committed)return next;
 }
 throw new Error('其他页面正在频繁保存，请稍后重试。');
});}
export async function checkpoints(space:Workspace,session=legacySession){const entries=await Promise.all([0,1,2,3,4].map(i=>getValue<Envelope>('meta',`checkpoint:${space}:${i}`,session)));return entries.filter((e):e is Envelope=>!!e).sort((a,b)=>b.revision-a.revision);}
export async function backupBundle(space:Workspace,data:Store,session=legacySession){const bundle={format:'growth-evidence-backup',exportedAt:new Date().toISOString(),data:validateStore(data),workspace:space};if(session.security)return {format:'growth-evidence-encrypted-backup',security:session.security,payload:await seal(bundle,session.key!,'backup')};return bundle;}
export function readBackup(input:unknown){const value=input as {format?:string;data?:unknown};return validateStore(value?.format==='growth-evidence-backup'?value.data:input);}

export async function decodeBackup(input:unknown,password=''){const v=input as {format?:string;security:Protection;payload:CipherValue};if(v?.format==='growth-evidence-encrypted-backup'){if(!v.security||v.security.iterations!==310000||typeof v.security.salt!=='string'||!isCipher(v.payload))throw new Error('加密备份格式不正确。');return readBackup(await unseal(v.payload,await passwordKey(password,v.security),'backup'));}return readBackup(input);}
export function backupName(space:Workspace,session=legacySession){return `成长证据簿-${session.identity.id}-${space==='personal'?'个人档案':'示例档案'}.json`;}
export function repository(session:Session){return {session,getValue:<T>(b:string,k:string)=>getValue<T>(b,k,session),putValue:(b:string,k:string,v:unknown)=>putValue(b,k,v,session),deleteValue:(b:string,k:string)=>deleteValue(b,k,session),openWorkspace:(s:Workspace)=>openWorkspace(s,session),initialWorkspace:()=>initialWorkspace(session),commitWorkspace:(s:Workspace,b:Envelope,l:Store)=>commitWorkspace(s,b,l,session),checkpoints:(s:Workspace)=>checkpoints(s,session),backupBundle:(s:Workspace,d:Store)=>backupBundle(s,d,session),backupName:(s:Workspace)=>backupName(s,session)};}
