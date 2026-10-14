'use client';
import {useState} from 'react';
import {Search,Trash2,RotateCcw,Eye} from 'lucide-react';
import type {TrashEntry} from '../lib/types';
import {Modal} from './modal';
import {SourceInspector} from './source-inspector';
import {downloadAttachment} from '../lib/attachments';
function kind(t:TrashEntry){return t.projects.length?'项目':t.reviews.length?'回顾':t.evidence.length?'证据':'记录';}
export default function TrashPanel({entries,onRestore,onRecords,embedded=false}:{entries:TrashEntry[];onRestore:(id:string)=>Promise<void>;onRecords?:()=>void;embedded?:boolean}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('全部'),[preview,setPreview]=useState<TrashEntry|null>(null),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[limit,setLimit]=useState(30);
 const visible=entries.filter(t=>(filter==='全部'||kind(t)===filter)&&`${t.title} ${t.fragments.map(f=>f.project+' '+f.text).join(' ')} ${t.evidence.map(c=>c.project+' '+c.title).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 async function restore(t:TrashEntry){setBusy(t.id);setError('');setMessage('');try{await onRestore(t.id);setPreview(null);setMessage(`已恢复“${t.title}”，可回到${kind(t)==='记录'?'工作记录':kind(t)==='证据'?'成长证据':kind(t)==='项目'?'项目':'阶段回顾'}查看。`);}catch(e){setError(e instanceof Error?e.message:'恢复失败，条目仍保留在回收站。');}finally{setBusy('');}}
 return <section className={embedded?'panel recycle-bin':'trash-page'}>
  <div className="page-heading"><div>{embedded?<h2>回收站 · {entries.length} 项</h2>:<h1>回收站 <span className="muted">· {entries.length} 项</span></h1>}<p>移除的内容保留在当前档案空间，附件与原文核对结论一并保留。</p></div>{onRecords&&<button className="button secondary" onClick={onRecords}>回到工作记录</button>}</div>
  {entries.length>0&&<div className="toolbar"><label className="search-field"><Search size={17}/><input aria-label="搜索回收站" placeholder="搜索标题、原文或项目" value={query} onChange={e=>{setQuery(e.target.value);setLimit(30);}}/></label><select aria-label="回收站条目类型" value={filter} onChange={e=>{setFilter(e.target.value);setLimit(30);}}>{['全部','记录','证据','项目','回顾'].map(k=><option key={k}>{k}</option>)}</select></div>}
  {message&&<p className="draft-status" role="status">{message}</p>}{error&&<p className="import-error" role="alert">{error}</p>}
  <div className="trash-list">{visible.slice(0,limit).map(t=><article className="trash-entry panel" key={t.id}><div><span className="tag">{kind(t)}</span><h3>{t.title||'未命名条目'}</h3><p>移除于 {new Date(t.deletedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p><small>{kind(t)==='证据'?`${t.evidence.length} 张证据 · 附带 ${t.fragments.length} 条原文快照`:kind(t)==='记录'?`${t.fragments.length} 条原文 · ${t.fragments.reduce((n,f)=>n+(f.attachments?.length||0),0)} 个附件`:kind(t)==='项目'?`${t.projects.length} 个项目档案`:`${t.reviews.length} 份阶段回顾`}</small></div><div className="trash-entry-actions"><button className="button secondary" onClick={()=>setPreview(t)}><Eye size={15}/>查看内容</button><button className="button primary" disabled={!!busy} onClick={()=>restore(t)}><RotateCcw size={15}/>{busy===t.id?'正在恢复':'恢复条目'}</button></div></article>)}</div>
  {!visible.length&&<div className="empty"><Trash2 size={29}/><h3>{entries.length?'没有符合筛选的条目':'回收站是空的'}</h3><p>{entries.length?'调整关键词或条目类型。':'在工作记录、证据或回顾中移除的条目会出现在这里。'}</p>{entries.length>0&&<button className="button secondary" onClick={()=>{setQuery('');setFilter('全部');}}>清除筛选</button>}</div>}
  {visible.length>limit&&<button className="button secondary" onClick={()=>setLimit(v=>v+30)}>再显示 30 项</button>}
  {preview&&<Modal wide title={`回收站 · ${kind(preview)}`} subtitle="以下为移除时保留的内容。恢复后可在原界面继续编辑。" onClose={()=>setPreview(null)}>
   {preview.projects.map(p=><section key={p.id}><h3>{p.name}</h3><p>{p.description}</p><p>项目目标：{p.goal||'尚未填写'}</p><p>本人职责：{p.role||'尚未填写'}</p></section>)}
   {preview.evidence.map(c=><section className="trash-preview-card" key={c.id}><h3>{c.title}</h3><p>{c.project} · {c.date}</p><dl><dt>问题／背景</dt><dd>{c.problem}</dd><dt>本人行动</dt><dd>{c.action}</dd><dt>结果</dt><dd>{c.outcome}</dd></dl></section>)}
   {preview.fragments.map(f=><section className="trash-preview-card" key={f.id}><SourceInspector fragment={f} label={`${f.date} · ${f.project} · 原始记录`}/>{f.attachments?.map(a=><button className="button secondary" key={a.id} onClick={()=>downloadAttachment(a)}>下载附件：{a.name}</button>)}</section>)}
   {preview.reviews.map(r=><section key={r.id}><h3>{r.title}</h3><pre className="import-original">{r.content}</pre></section>)}
   <div className="modal-footer"><button className="button secondary" onClick={()=>setPreview(null)}>返回回收站</button><button className="button primary" disabled={!!busy} onClick={()=>restore(preview)}>恢复此条目</button></div>
  </Modal>}
 </section>;
}
