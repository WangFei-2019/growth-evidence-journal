// Run with Node 24: node --test tests/local-folder.test.mjs
// Compile the production module in memory; replace only IndexedDB/profile I/O
// with a private test store. No real browser files, profiles, or keys are read.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {beforeEach,test} from 'node:test';
import ts from 'typescript';

const state={values:new Map(),events:[],expireOnRead:false};
const session=()=>({identity:{id:crypto.randomUUID()},active:true});
const testStateKey=Symbol.for('growth-evidence.test.local-folder');
globalThis[testStateKey]={
 legacySession:session(),
 assertSession(value){if(!value.active)throw new Error('档案已锁定或切换，请重新打开后继续。');},
 async getValue(bucket,key,profile){
  state.events.push('storage-read');
  await Promise.resolve();
  if(state.expireOnRead)navigator.userActivation.isActive=false;
  return state.values.get(`${profile.identity.id}:${bucket}:${key}`);
 },
 async putValue(bucket,key,value,profile){state.events.push(`save:${key}`);state.values.set(`${profile.identity.id}:${bucket}:${key}`,value);},
 async deleteValue(bucket,key,profile){state.values.delete(`${profile.identity.id}:${bucket}:${key}`);},
 async openWorkspace(){return {data:{}};},
 async backupBundle(){return {};},
 backupName(){return 'backup.json';},
};
const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const mockModule=names=>dataModule(`const fixture=globalThis[Symbol.for('growth-evidence.test.local-folder')];${names.map(name=>`export const ${name}=fixture.${name};`).join('')}`);
const source=await readFile(new URL('../app/lib/local-folder.ts',import.meta.url),'utf8');
const transformed=source.replaceAll("'./profile-store'",JSON.stringify(mockModule(['legacySession','assertSession'])))
 .replaceAll("'./repository'",JSON.stringify(mockModule(['backupBundle','backupName','getValue','putValue','deleteValue','openWorkspace'])));
const compiled=ts.transpileModule(transformed,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.filter(item=>item.category===ts.DiagnosticCategory.Error).length,0);
const {backupFolderCapability,chooseBackupFolder,getBackupDirectory,authorizeBackupFolder,disconnectBackupFolder,writeBackupFolder,isFolderSelectionCancelled,backupFolderErrorMessage}=await import(dataModule(compiled.outputText));

function directory(name='测试备份'){
 return {name,async queryPermission(){return 'granted';},async requestPermission(){state.events.push('permission-request');assert.equal(navigator.userActivation.isActive,true);return 'granted';}};
}
function saveDirectory(profile,handle){state.values.set(`${profile.identity.id}:meta:backup-directory`,handle);}

beforeEach(()=>{
 state.values.clear();state.events.length=0;state.expireOnRead=false;
 const browser={isSecureContext:true,location:{origin:'https://example.test'},top:null,async showDirectoryPicker(){return directory();}};
 browser.top=browser;
 globalThis.window=browser;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userActivation:{isActive:true}}});
});

test('unsupported browsers receive an actionable download alternative',()=>{
 delete window.showDirectoryPicker;
 const result=backupFolderCapability();
 assert.equal(result.supported,false);
 assert.match(result.reason,/Chrome.*Edge/);
 assert.match(result.reason,/下载完整备份/);
});

test('insecure contexts and cross-origin embeds are detected',()=>{
 window.isSecureContext=false;
 assert.match(backupFolderCapability().reason,/HTTPS/);
 window.isSecureContext=true;
 window.top={location:{get origin(){throw new DOMException('cross origin','SecurityError');}}};
 assert.equal(backupFolderCapability().supported,false);
 assert.match(backupFolderCapability().reason,/独立标签页/);
});

test('directory picker keeps the native Window receiver and opens before storage I/O',async()=>{
 const profile=session(),handle=directory();
 window.showDirectoryPicker=function(options){
  assert.equal(this,window,'native Window receiver must be retained');
  assert.deepEqual(options,{mode:'readwrite',id:'growth-evidence-backup'});
  assert.deepEqual(state.events,[],'no awaited storage can precede the picker');
  state.events.push('picker');return Promise.resolve(handle);
 };
 assert.equal(await chooseBackupFolder(profile),handle);
 assert.deepEqual(state.events,['picker','save:backup-directory','save:backup-folder-status']);
 assert.equal(await getBackupDirectory(profile),handle);
});

test('canceling directory selection preserves the existing folder and status',async()=>{
 const profile=session(),previous=directory('原备份位置');saveDirectory(profile,previous);
 const aborted=new DOMException('The user aborted a request.','AbortError');
 window.showDirectoryPicker=async()=>{throw aborted;};
 await assert.rejects(chooseBackupFolder(profile),error=>error===aborted);
 assert.equal(isFolderSelectionCancelled(aborted),true);
 assert.equal(await getBackupDirectory(profile),previous);
 assert.equal(state.events.some(event=>event.startsWith('save:')),false);
});

test('a preloaded handle requests authorization synchronously within the click',async()=>{
 const profile=session(),handle=directory();state.expireOnRead=true;
 const operation=authorizeBackupFolder(profile,handle);
 assert.deepEqual(state.events,['permission-request'],'permission must start before returning to the click handler');
 assert.equal(await operation,handle);
 assert.equal(state.events.includes('storage-read'),false);
});

test('the existing one-argument authorization API also uses a preloaded session cache',async()=>{
 const profile=session(),handle=directory();saveDirectory(profile,handle);
 assert.equal(await getBackupDirectory(profile),handle);
 state.events.length=0;state.expireOnRead=true;
 const operation=authorizeBackupFolder(profile);
 assert.deepEqual(state.events,['permission-request']);
 assert.equal(await operation,handle);
});

test('uncached legacy authorization fails clearly if storage outlasts the user gesture',async()=>{
 const profile=session();saveDirectory(profile,directory());state.expireOnRead=true;
 await assert.rejects(authorizeBackupFolder(profile),/再次点击/);
 assert.deepEqual(state.events,['storage-read']);
});

test('permission denial is not mistaken for a cancelled picker',async()=>{
 const profile=session(),handle=directory();handle.requestPermission=async()=> 'denied';
 await assert.rejects(authorizeBackupFolder(profile,handle),/未获得写入授权/);
 assert.equal(isFolderSelectionCancelled(new DOMException('Permission denied','NotAllowedError')),false);
 assert.match(backupFolderErrorMessage(new DOMException('Permission denied','NotAllowedError')),/重新选择/);
});

test('session handles are isolated and disconnect clears the cached authorization',async()=>{
 const first=session(),second=session(),handle=directory();saveDirectory(first,handle);
 await getBackupDirectory(first);
 assert.equal(await getBackupDirectory(second),null);
 await assert.rejects(authorizeBackupFolder(second),/请先选择/);
 await disconnectBackupFolder(first);
 await assert.rejects(authorizeBackupFolder(first),/请先选择/);
});

test('locked profiles do not open a picker or request file permissions',async()=>{
 const profile=session();profile.active=false;
 await assert.rejects(chooseBackupFolder(profile),/档案已锁定/);
 await assert.rejects(authorizeBackupFolder(profile,directory()),/档案已锁定/);
 assert.deepEqual(state.events,[]);
});

test('browser error categories have useful messages and unexpected details are preserved',()=>{
 assert.match(backupFolderErrorMessage(new DOMException('gesture lost','SecurityError')),/独立标签页/);
 assert.match(backupFolderErrorMessage(new DOMException('not found','NotFoundError')),/重新选择/);
 assert.match(backupFolderErrorMessage(new DOMException('cannot clone','DataCloneError')),/无法保存文件夹授权/);
 assert.match(backupFolderErrorMessage(new TypeError('Illegal invocation')),/Chrome/);
 assert.equal(backupFolderErrorMessage(new Error('磁盘空间不足')),'磁盘空间不足');
});

test('automatic backup persists a helpful error when a saved directory disappears',async()=>{
 const profile=session(),handle=directory();saveDirectory(profile,handle);
 handle.queryPermission=async()=>{throw new DOMException('A requested file or directory could not be found.','NotFoundError');};
 await assert.rejects(writeBackupFolder('personal',undefined,profile),error=>error.name==='NotFoundError');
 const status=state.values.get(`${profile.identity.id}:meta:backup-folder-status`);
 assert.equal(status.name,handle.name);
 assert.match(status.error,/重新选择保存文件夹/);
});
