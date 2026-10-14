'use client';
import {Copy,Check} from 'lucide-react';
import type {Fragment,TaskLink,WorkTask} from '../lib/types';
import {duplicateReviewKey,type DuplicateMatch} from '../lib/record-duplicates';
export default function DuplicateRecordNotice({fragment,matches,reviewed,onReview,onSkip,busy=false,workTasks=[],taskLinks=[]}:{fragment:Fragment;matches:DuplicateMatch[];reviewed:string;onReview:(key:string)=>void;onSkip?:()=>void;busy?:boolean;workTasks?:WorkTask[];taskLinks?:TaskLink[]}){
 if(!matches.length)return null;const key=duplicateReviewKey(fragment,matches),accepted=reviewed===key;
 return <aside className={`duplicate-notice ${accepted?'is-reviewed':''}`} aria-label="相似记录提醒">
  <div className="duplicate-notice-heading"><Copy size={18}/><div><b>{matches.some(m=>m.kind==='exact')?'发现内容相同的记录':'发现内容相似的记录'}</b><p>可能是重复录入，也可能是同一任务的后续进展。请核对日期、项目与结果。</p></div></div>
  {matches.map(m=>{const tasks=workTasks.filter(t=>taskLinks.some(l=>l.fragmentId===m.fragment.id&&l.taskId===t.id));return <details className="duplicate-match" key={m.fragment.id}>
   <summary><span><b>{m.kind==='exact'?'内容相同':'内容相似'}</b> · {m.origin==='batch'?'本次较早的记录':'已有记录'} · {m.fragment.date} · {m.fragment.project}{m.fragment.project!==fragment.project?' · 项目不同，请核对归属':m.fragment.date!==fragment.date?' · 日期不同，请核对进展':''}</span><small>展开对照</small></summary>
   {tasks.length>0&&<div className="task-topic-tags">{tasks.map(t=><span key={t.id}>已有工作：{t.name}{t.labels.length?' · '+t.labels.join(' / '):''}</span>)}</div>}
   <div className="duplicate-comparison"><div><b>本次录入 · {fragment.date}</b><pre>{fragment.text}</pre></div><div><b>{m.origin==='batch'?'本次较早记录':'已有原文'} · {m.fragment.date}</b><pre>{m.fragment.text}</pre>{m.fragment.document&&<small>来源：{m.fragment.document.name} · 第 {m.fragment.document.index} 段</small>}</div></div>
  </details>;})}
  <label className="duplicate-review-choice"><input aria-label="确认保留相似记录" type="checkbox" disabled={busy} checked={accepted} onChange={e=>onReview(e.target.checked?key:'')}/><span>{accepted?<><Check size={14}/>已核对，确认需要保留这条记录</>:'我已核对，作为不同的进展或独立记录保留'}</span></label>
  {onSkip&&<button type="button" className="text-button" disabled={busy} onClick={onSkip}>跳过本条，不重复保存</button>}
  <small>提醒在本机完成，不调用模型。相似内容不会被自动合并或删除。</small>
 </aside>;
}
