import {ArrowRight,FileText,CheckCheck} from 'lucide-react';
import {FactText} from './evidence-card';
import type {Store,Evidence,Fragment} from '../lib/types';
export default function DemoPreview({store,onEvidence,onFragment}:{store:Store;onEvidence:(card:Evidence)=>void;onFragment:(fragment:Fragment)=>void}){
 const card=store.evidence.find(c=>c.status==='confirmed'),source=card&&store.fragments.find(f=>card.sourceRefs.some(r=>r.fragmentId===f.id));
 if(!card||!source)return null;
 return <section className="demo-first-look" aria-label="从原始记录到成长证据的示例"><article className="demo-original"><div className="demo-preview-heading"><FileText size={16}/><b>一段原始工作记录</b><span>{source.date}</span></div><p>{source.text}</p><button className="text-button" onClick={()=>onFragment(source)}>查看这段原文 <ArrowRight size={14}/></button></article><span className="demo-conversion-arrow"><ArrowRight size={19}/></span><article className="demo-contribution" data-color={store.projects.find(p=>p.name===card.project)?.color}><div className="demo-preview-heading"><CheckCheck size={16}/><b>整理后的成长证据</b><span>{card.project}</span></div><h2><FactText text={card.title}/></h2><div className="demo-preview-result"><span>实际变化 · 已核对</span><p><FactText text={card.outcome}/></p></div><button className="text-button" onClick={()=>onEvidence(card)}>查看行动与原文依据 <ArrowRight size={14}/></button></article></section>;
}
