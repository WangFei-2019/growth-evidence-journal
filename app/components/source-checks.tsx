'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle} from 'lucide-react';
import type {Fragment,SourceCheck} from '../lib/types';
import {SourceCheckEditor,SourceDisclosure,SourceInspector,SourceLocation} from './source-inspector';
export default function SourceChecks({fragment,onSave,initialCheckId}:{fragment:Fragment;initialCheckId?:string;onSave:(check:SourceCheck,original:SourceCheck)=>Promise<void>}){
 const [showAll,setShowAll]=useState(!!initialCheckId),checks=fragment.reviewChecks||[],open=checks.filter(c=>c.status==='open');useEffect(()=>{if(initialCheckId)setShowAll(true);},[initialCheckId]);if(!checks.length)return null;
 return <section className="saved-source-checks"><div className="section-heading"><h3><AlertTriangle size={16}/>原文核对提醒 · {open.length} 条待处理</h3><button className="text-button" onClick={()=>setShowAll(v=>!v)}>{showAll?'只看待核对':'查看全部提醒与结论'}</button></div>{(showAll?checks:open).slice().sort((a,b)=>Number(b.id===initialCheckId)-Number(a.id===initialCheckId)).map(check=><article className={`source-check-card ${check.id===initialCheckId?'search-matched-check':''}`} key={check.id}>{check.id===initialCheckId&&<span className="tag green">搜索匹配的核对提醒</span>}<b>{check.message}</b><SourceLocation fragment={fragment} quote={check.quote}/><blockquote>{check.quote}</blockquote><SourceDisclosure summary="定位原文 · 查看高亮与上下文"><SourceInspector fragment={fragment} quote={check.quote} label="待核对提醒对应原文" autoLocate/></SourceDisclosure><SourceCheckEditor check={check} onSave={(status,response)=>onSave({...check,status,response,updatedAt:new Date().toISOString()},check)}/></article>)}{!showAll&&!open.length&&<p className="muted">本条记录的提醒已核对，可以查看保留的结论。</p>}</section>;
}
