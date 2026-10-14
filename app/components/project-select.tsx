'use client';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
type Props = { projects:string[]; value:string; onChange:(value:string)=>void; name?:string; label?:string };
export default function ProjectSelect({projects,value,onChange,name,label='所属项目'}:Props) {
 const [creating,setCreating]=useState(false);
 const options=[...new Set([...projects,...(value.trim()?[value]:[])])].filter(p=>p.trim()&&p!=='未分类');
 return <div className="project-picker">
  {name&&<input type="hidden" name={name} value={value}/>}
  <select aria-label={label} value={creating?'__new_project__':value==='未分类'?'':value} onChange={e=>{
   if(e.target.value==='__new_project__'){setCreating(true);onChange('');}
   else{setCreating(false);onChange(e.target.value);}
  }}>
   <option value="">未分类</option>
   {options.map(p=><option key={p} value={p}>{p}</option>)}
   <option value="__new_project__">＋ 新建项目…</option>
  </select>
  {creating&&<div className="new-project-input">
   <input aria-label="新项目名称" autoFocus maxLength={80} value={value} onChange={e=>onChange(e.target.value)} placeholder="输入新项目名称"/>
   <button type="button" className="icon-button" disabled={!value.trim()} aria-label="确定新项目" onClick={()=>{onChange(value.trim());setCreating(false);}}><Check size={16}/></button>
   <button type="button" className="icon-button" aria-label="取消新建项目" onClick={()=>{onChange('');setCreating(false);}}><X size={15}/></button>
  </div>}
 </div>;
}
