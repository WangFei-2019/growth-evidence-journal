'use client';
import {useMemo,useState} from 'react';
import type {Store} from '../lib/types';
import {batchRecordDuplicates} from '../lib/record-duplicates';
import DuplicateRecordNotice from './duplicate-record-notice';
import {Modal} from './modal';
export default function DuplicateRecordAudit({store,onRecycle,onClose}:{store:Store;onRecycle:(id:string)=>Promise<void>;onClose:()=>void}){
 const [allDates,setAllDates]=useState(false),[page,setPage]=useState(0),[busy,setBusy]=useState(''),[error,setError]=useState(''),[reviews,setReviews]=useState<Record<string,string>>({});
 const findings=useMemo(()=>{const records=[...store.fragments].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));return [...batchRecordDuplicates(records,[])].map(([id,matches])=>({fragment:store.fragments.find(f=>f.id===id)!,matches:matches.filter(m=>allDates||m.fragment.date===store.fragments.find(f=>f.id===id)!.date&&m.fragment.project===store.fragments.find(f=>f.id===id)!.project)})).filter(x=>x.matches.length);},[store.fragments,allDates]);
 const currentPage=Math.min(page,Math.max(0,Math.ceil(findings.length/6)-1));
 async function remove(id:string){setBusy(id);setError('');try{await onRecycle(id);}catch(e){setError(e instanceof Error?e.message:'条目仍保留，请稍后重试。');}finally{setBusy('');}}
 return <Modal wide title="检查已有相似记录" subtitle="先比较日期、项目和实际结果；持续记录同一任务的不同进展是正常的。" onClose={onClose}>
  <label className="checkbox-label"><input type="checkbox" checked={allDates} onChange={e=>{setAllDates(e.target.checked);setPage(0);}}/>也检查日期或项目不同的记录</label><p className="footnote">默认检查同一项目、同一天的内容。已被证据或跟进引用的原文需要保留。</p>
  <p className="list-count">{findings.length} 条记录有相似内容</p>{error&&<p className="import-error" role="alert">{error}</p>}
  {findings.slice(currentPage*6,(currentPage+1)*6).map(({fragment,matches})=><section className="duplicate-audit-entry" key={fragment.id}><h3>{fragment.date} · {fragment.project}</h3><DuplicateRecordNotice fragment={fragment} matches={matches.map(m=>({...m,origin:'saved'}))} reviewed={reviews[fragment.id]||''} onReview={key=>setReviews(v=>({...v,[fragment.id]:key}))} busy={!!busy} workTasks={store.workTasks||[]} taskLinks={store.taskLinks||[]}/><button className="button secondary" disabled={!!busy} onClick={()=>remove(fragment.id)}>{busy===fragment.id?'正在移除':'将本次对照中的当前条目移入回收站'}</button></section>)}
  {!findings.length&&<div className="empty"><h3>未发现高度相似的记录</h3><p>{allDates?'可继续正常记录。内容语义相同但用词不同的任务，可通过 AI 工作分组检查。':'如需检查重复粘贴到其他日期或项目的内容，开启上方选项。'}</p></div>}
  {findings.length>6&&<div className="pagination"><button disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>上一组</button><span>{currentPage+1}/{Math.ceil(findings.length/6)}</span><button disabled={(currentPage+1)*6>=findings.length} onClick={()=>setPage(currentPage+1)}>下一组</button></div>}
  <div className="modal-footer"><button className="button secondary" onClick={onClose}>返回工作记录</button></div>
 </Modal>;
}
