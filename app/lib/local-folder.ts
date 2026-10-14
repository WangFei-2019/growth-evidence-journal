import {assertSession,legacySession,type Session} from './profile-store';
import type {Store} from './types';
import {backupBundle,backupName,getValue,putValue,deleteValue,openWorkspace,type Workspace} from './repository';
export type BackupDirectory=FileSystemDirectoryHandle&{queryPermission:(options:{mode:'readwrite'})=>Promise<PermissionState>;requestPermission:(options:{mode:'readwrite'})=>Promise<PermissionState>};
export type FolderStatus={name:string;lastWritten:string;error:string};
type FolderWindow=Window&{showDirectoryPicker?:(options:{mode:'readwrite';id:string})=>Promise<BackupDirectory>};
const directoryCache=new WeakMap<Session,BackupDirectory>();

export function backupFolderCapability():{supported:boolean;reason:string}{
 if(typeof window==='undefined')return {supported:false,reason:'请在浏览器中打开应用后选择保存文件夹。'};
 if(window.isSecureContext===false)return {supported:false,reason:'选择文件夹需要 HTTPS 安全连接，请打开正式网站；也可以下载完整备份。'};
 if(typeof (window as FolderWindow).showDirectoryPicker!=='function')return {supported:false,reason:'当前浏览器不支持选择本机文件夹。请用桌面版 Chrome 或 Edge 打开本站，或下载完整备份后自行保存。'};
 try{if(window.top&&window.top!==window&&window.top.location.origin!==window.location.origin)return {supported:false,reason:'当前页面嵌在其他网站中，无法选择本机文件夹。请在 Chrome 或 Edge 的独立标签页打开本站，或下载完整备份。'};}catch{return {supported:false,reason:'当前页面嵌在其他网站中，无法选择本机文件夹。请在 Chrome 或 Edge 的独立标签页打开本站，或下载完整备份。'};}
 return {supported:true,reason:''};
}

function errorName(error:unknown){return error&&typeof error==='object'&&'name' in error?String(error.name):'';}
export function isFolderSelectionCancelled(error:unknown){return errorName(error)==='AbortError';}
export function backupFolderErrorMessage(error:unknown){
 switch(errorName(error)){
  case 'AbortError':return '已取消选择文件夹，现有备份设置保持不变。';
  case 'NotAllowedError':return '未获得文件夹写入授权。请允许浏览器访问或重新选择文件夹；也可以下载完整备份。';
  case 'SecurityError':return '浏览器阻止了文件夹访问。请在桌面版 Chrome 或 Edge 的独立标签页打开本站，再直接点击按钮授权；也可以下载完整备份。';
  case 'NotFoundError':return '原保存文件夹已移动或不可访问，请重新选择保存文件夹。';
  case 'NoModificationAllowedError':return '此文件夹不可写入，请选择有写入权限的文件夹。';
  case 'DataCloneError':return '当前浏览器无法保存文件夹授权，请改用下载完整备份。';
  case 'InvalidStateError':return '浏览器尚未准备好访问文件夹，请回到当前页面后再次点击，或下载完整备份。';
  case 'TypeError':return '浏览器无法打开文件夹选择器，请更新桌面版 Chrome 或 Edge，或下载完整备份。';
  default:return error instanceof Error?error.message:'文件夹操作失败，请重试或下载完整备份。';
 }
}

export async function getBackupDirectory(session=legacySession):Promise<BackupDirectory|null>{
 const directory=await getValue<BackupDirectory>('meta','backup-directory',session);
 if(directory)directoryCache.set(session,directory);else directoryCache.delete(session);
 return directory||null;
}

export async function chooseBackupFolder(session=legacySession):Promise<BackupDirectory>{
 assertSession(session);
 const capability=backupFolderCapability();
 if(!capability.supported)throw new Error(capability.reason);
 const folderWindow=window as FolderWindow;
 // Native Window methods require their receiver and a direct user gesture.
 const handle=await folderWindow.showDirectoryPicker!.call(window,{mode:'readwrite',id:'growth-evidence-backup'});
 await putValue('meta','backup-directory',handle,session);
 await putValue('meta','backup-folder-status',{name:handle.name,lastWritten:'',error:''},session);
 directoryCache.set(session,handle);
 return handle;
}
export async function writeFileSnapshot(directory:BackupDirectory,name:string,content:string){if(await directory.queryPermission({mode:'readwrite'})!=='granted')throw new Error('文件夹授权已过期，请在设置中重新授权。');const file=await directory.getFileHandle(name,{create:true}),stream=await file.createWritable();try{await stream.write(content);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}}
let writes:Promise<unknown>=Promise.resolve();
export function writeBackupFolder(space:Workspace,_data?:Store,session=legacySession){
 const operation=writes.catch(()=>{}).then(async()=>{const directory=await getValue<BackupDirectory>('meta','backup-directory',session);if(!directory)return null;try{const latest=await openWorkspace(space,session);await writeFileSnapshot(directory,backupName(space,session),JSON.stringify(await backupBundle(space,latest.data,session)));const at=new Date().toISOString();await putValue('meta',`backup:${space}`,at,session);await putValue('meta','backup-folder-status',{name:directory.name,lastWritten:at,error:''},session);return at;}catch(e){const previous=await getValue<FolderStatus>('meta','backup-folder-status',session);await putValue('meta','backup-folder-status',{name:directory.name,lastWritten:previous?.lastWritten||'',error:backupFolderErrorMessage(e)},session);throw e;}});writes=operation;return operation;
}
export async function disconnectBackupFolder(session=legacySession){await writes.catch(()=>{});await deleteValue('meta','backup-directory',session);await deleteValue('meta','backup-folder-status',session);directoryCache.delete(session);}
export async function authorizeBackupFolder(session=legacySession,preloadedHandle?:BackupDirectory|null){
 assertSession(session);
 // Settings preloads this handle before a click. Do not await storage before
 // requesting permission: browsers can expire the click's transient activation.
 const ready=preloadedHandle||directoryCache.get(session);
 const directory=ready||await getBackupDirectory(session);
 if(!directory)throw new Error('请先选择保存文件夹。');
 if(typeof navigator!=='undefined'&&navigator.userActivation&&!navigator.userActivation.isActive)throw new Error('文件夹授权需要直接点击操作。请再次点击“重新授权并立即备份”，或重新选择保存文件夹。');
 if(typeof directory.requestPermission!=='function')throw new Error('当前浏览器无法恢复文件夹授权，请重新选择保存文件夹或下载完整备份。');
 if(await directory.requestPermission({mode:'readwrite'})!=='granted')throw new Error('文件夹未获得写入授权，仍可下载备份。');
 directoryCache.set(session,directory);
 return directory;
}
