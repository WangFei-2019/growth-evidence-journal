'use client';
import { ArrowUpRight, CheckCheck, CircleHelp, Link, Star, Target } from 'lucide-react';
import {evidenceDateLabel} from '../lib/model-result';
import type { Evidence } from '../lib/types';
export function FactText({text}:{text:string}) {
 return <>{text.split(/(\d+(?:[.,]\d+)?\s*(?:%|％|毫秒|秒|小时|分钟|次|条|个|位|人|天|周|月|MB|ms)?)/g).map((part,i)=>i%2?<strong className="fact-number" key={i}>{part}</strong>:part)}</>;
}
export default function EvidenceCard({card:c,onOpen,onHighlight,color='neutral',onTask}:{card:Evidence;onOpen:(card:Evidence)=>void;onHighlight:(card:Evidence)=>void;color?:string;onTask?:(id:string)=>void}) {
 const resultPending=c.outcome.includes('待补充')||!c.sourceRefs.some(r=>r.field==='outcome');
 return <article data-color={color} className={`contribution-card ${c.highlight?'is-highlight':''} ${c.status==='confirmed'?'is-confirmed':''}`}>
  <div className="contribution-top"><span className={`tag ${c.status==='confirmed'?'green':c.missing.length?'warm':''}`}>{c.status==='confirmed'?<CheckCheck size={13}/>:<CircleHelp size={13}/>} {c.status==='confirmed'?'已确认':c.missing.length?'待补充':'待审核'}</span><button className={`highlight-button ${c.highlight?'active':''}`} aria-pressed={!!c.highlight} aria-label={`${c.highlight?'取消重点':'设为重点'}：${c.title}`} onClick={()=>onHighlight(c)}><Star size={16} fill={c.highlight?'currentColor':'none'}/><span>{c.highlight?'重点贡献':'设为重点'}</span></button></div>
  <button className="contribution-main" onClick={()=>onOpen(c)} aria-label={`查看证据：${c.title}`}>
   <div className="contribution-meta"><span className="card-project-label"><span className="project-dot"/>{c.project}</span><time dateTime={c.date}>{evidenceDateLabel(c)}</time></div>
   <span className="contribution-kicker"><Target size={12}/>贡献重点</span><h3><FactText text={c.title}/></h3>
   <div className="contribution-action"><span>我做了什么</span><p><FactText text={c.action}/></p></div>
   <div className={`contribution-result ${resultPending?'pending':''}`}><span>{resultPending?'还需要验证':c.status==='confirmed'?'带来的变化 · 已确认':'带来的变化 · 待审核'}</span><p><FactText text={c.outcome}/></p></div>
  </button>
  {c.workTaskId&&<div className="evidence-work-task"><button className="text-button" onClick={()=>onTask?.(c.workTaskId!)}>工作：{c.workTaskName||"查看关联工作"}</button><div className="task-topic-tags">{c.workTaskLabels?.map(l=><span key={l}>{l}</span>)}</div></div>}
  <div className="contribution-skills">{c.conflicts?.some(x=>!x.resolution)&&<span className="missing-count">有矛盾待核对</span>}{c.attribution==='unclear'&&<span className="missing-count">本人分工待确认</span>}{c.outcomeDate&&<span>结果观察 {c.outcomeDate}</span>}{c.skills.slice(0,3).map(s=><span key={s}>{s}</span>)}{c.missing.length>0&&<span className="missing-count">{c.missing.length} 项待补充</span>}</div>
  <button className="contribution-footer" onClick={()=>onOpen(c)}><span><Link size={14}/>{new Set(c.sourceRefs.map(r=>r.fragmentId)).size} 条原文依据</span><span>查看完整证据 <ArrowUpRight size={15}/></span></button>
 </article>;
}
