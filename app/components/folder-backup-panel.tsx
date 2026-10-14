'use client';
import {useEffect,useState} from 'react';
import {Download,FolderOpen,LoaderCircle} from 'lucide-react';
import {useRepository} from '../lib/repository-context';
import type {Store} from '../lib/types';
import type {Workspace} from '../lib/repository';
import {
 authorizeBackupFolder,backupFolderCapability,backupFolderErrorMessage,
 chooseBackupFolder,disconnectBackupFolder,getBackupDirectory,
 isFolderSelectionCancelled,writeBackupFolder,type BackupDirectory,type FolderStatus,
} from '../lib/local-folder';

type Props={data:Store;workspace:Workspace;onFlush:()=>Promise<void>;onDownload:()=>Promise<string>;downloading:boolean};
export default function FolderBackupPanel({data,workspace,onFlush,onDownload,downloading}:Props){
 const {getValue,session}=useRepository();
 const [folder,setFolder]=useState<FolderStatus|null>(null);
 const [directory,setDirectory]=useState<BackupDirectory|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<'choose'|'write'|'download'|'disconnect'|null>(null);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const capability=backupFolderCapability();

 useEffect(()=>{
  let active=true;
  Promise.all([getValue<FolderStatus>('meta','backup-folder-status'),getBackupDirectory(session)])
   .then(([status,handle])=>{if(active){setFolder(status||null);setDirectory(handle);}})
   .catch(e=>{if(active)setError(backupFolderErrorMessage(e));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[session,workspace,data]);

 async function refresh(){
  if(!session.active)return;
  const [status,handle]=await Promise.all([getValue<FolderStatus>('meta','backup-folder-status'),getBackupDirectory(session)]);
  setFolder(status||null);setDirectory(handle);
 }
 async function saveFolder(choose:boolean){
  setBusy(choose?'choose':'write');setError('');
  setMessage(choose?'正在打开文件夹选择器…':'正在申请授权并更新备份…');
  try{
   // Invoke the native picker/permission request before awaiting other work.
   if(choose)await chooseBackupFolder(session);
   else await authorizeBackupFolder(session,directory);
   await onFlush();
   await writeBackupFolder(workspace,data,session);
   await refresh();
   setMessage(choose?'文件夹已选择，完整备份已写入；之后保存记录会自动更新。':'完整备份已更新。');
  }catch(e){
   if(isFolderSelectionCancelled(e))setMessage(backupFolderErrorMessage(e));
   else{setMessage('');setError(backupFolderErrorMessage(e));}
   await refresh().catch(()=>{});
  }finally{setBusy(null);}
 }
 async function download(){
  setBusy('download');setError('');setMessage('正在生成完整备份…');
  try{setMessage(await onDownload());}
  catch(e){setMessage('');setError(e instanceof Error?e.message:'备份生成失败，请重试。');}
  finally{setBusy(null);}
 }
 async function disconnect(){
  setBusy('disconnect');setError('');
  try{await disconnectBackupFolder(session);setFolder(null);setDirectory(null);setMessage('已停止自动备份，已保存的文件继续保留。');}
  catch(e){setError(backupFolderErrorMessage(e));}
  finally{setBusy(null);}
 }
 const blocked=!!busy||downloading;
 return <section className="panel local-folder-panel" aria-busy={!!busy}>
  <div className="panel-heading"><div><h2>本机保存位置</h2><p>工作档案保存在当前浏览器。支持文件夹授权时，可另外自动保存完整备份。</p></div><span className="tag">{capability.supported?'可授权自动备份':'下载备份模式'}</span></div>
  <p className="backup-status">保存文件夹：{loading?'正在读取…':folder?.name||'尚未选择'}</p>
  {folder?.lastWritten&&<p className="footnote">最近写入：{new Date(folder.lastWritten).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p>}
  {!capability.supported&&<div className="quiet-box folder-capability-note"><b>当前浏览器使用下载备份</b><p>{capability.reason}</p><p>下载位置由浏览器决定；启用“下载前询问保存位置”后，可在每次下载时选择文件夹。</p></div>}
  <div className="settings-buttons">
   {capability.supported&&<button className="button primary" disabled={blocked} onClick={()=>saveFolder(true)}><FolderOpen size={15}/>{busy==='choose'?'正在选择…':folder?'更换保存文件夹':'选择保存文件夹'}</button>}
   {capability.supported&&folder&&<button className="button secondary" disabled={blocked||loading||!directory} onClick={()=>saveFolder(false)}>重新授权并立即备份</button>}
   <button className={`button ${capability.supported?'secondary':'primary'}`} disabled={blocked} onClick={download}>{busy==='download'?<LoaderCircle className="spin" size={15}/>:<Download size={15}/>}下载完整备份</button>
   {folder&&<button className="text-button" disabled={blocked} onClick={disconnect}>停止自动备份</button>}
  </div>
  <div className="folder-operation-feedback" aria-live="polite">
   {message&&<p role="status" className="connection-result">{message}</p>}
   {(error||folder?.error)&&<p role="alert" className="import-error">{error||folder?.error}</p>}
  </div>
  <p className="footnote">文件夹名称仅在此本机档案下保存。更换浏览器、域名或设备后需重新授权。关闭网页后自动备份暂停；下载备份始终可用。</p>
 </section>;
}
