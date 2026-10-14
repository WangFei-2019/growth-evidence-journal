import type {Store,FollowUp,Fragment} from './types';
import {today} from './data';
import {validProjectDate} from './projects';
import {fragmentHeadline} from './timeline';
import {searchExcerpt} from './search-excerpt';
export function periodRange(period:string,now=today()){const d=new Date(`${now}T12:00:00+08:00`);if(period==='all')return {start:'',end:now};if(period==='month')return {start:now.slice(0,7)+'-01',end:now};const offset=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-offset);return {start:d.toISOString().slice(0,10),end:now};}
export function within(date:string,start:string,end:string){return (!start||date>=start)&&(!end||date<=end);}
export function completedDate(value:string){return value?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(value)):'';}
export function overview(store:Store,start:string,end:string,now=today()){
 const records=store.fragments.filter(f=>within(f.date,start,end)),cards=store.evidence.filter(c=>within(c.date,start,end)&&c.status==='confirmed'),milestones=store.projects.flatMap(p=>(p.milestones||[]).filter(m=>m.completedAt&&within(completedDate(m.completedAt),start,end)).map(m=>({project:p,milestone:m}))),followUps=(store.followUps||[]).filter(f=>f.status==='open').sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 return {records,cards,milestones,followUps,due:followUps.filter(f=>f.dueDate<=now),highlights:cards.filter(c=>c.highlight),needsOutcome:store.evidence.filter(c=>c.status==='draft'&&(c.missing.some(x=>/结果|验证|效果/.test(x))||/待补充|未验证/.test(c.outcome)))};
}
export function newFollowUp(seed:Partial<FollowUp>={}):FollowUp{return {id:crypto.randomUUID(),title:'',project:'',evidenceId:'',dueDate:today(),status:'open',createdAt:new Date().toISOString(),observation:'',observedDate:'',fragmentId:'',completedAt:'',...seed};}
export function saveFollowUp(store:Store,task:FollowUp,complete=false):Store{
 if(!task.title.trim()||task.title.length>200||!task.dueDate||!validProjectDate(task.dueDate))throw new Error('请填写跟进事项和有效的计划日期。');
 let fragments=store.fragments,next={...task,title:task.title.trim(),project:task.project||'未分类'};
 if(complete){if(!task.observation.trim()||!task.observedDate||!validProjectDate(task.observedDate)||task.observedDate>today())throw new Error('请填写已经观察到的事实与实际日期，不能用未来日期完成。');const f:Fragment={id:crypto.randomUUID(),date:task.observedDate,project:next.project,category:'用户反馈',text:`结果跟进：${task.title}\n实际观察：${task.observation.trim()}`,link:'',createdAt:new Date().toISOString()};fragments=[f,...fragments];next={...next,status:'completed',fragmentId:f.id,completedAt:new Date().toISOString()};}
 return {...store,fragments,followUps:store.followUps?.some(f=>f.id===task.id)?store.followUps.map(f=>f.id===task.id?next:f):[next,...(store.followUps||[])]};
}
export type SearchHit={id:string;kind:'工作任务'|'项目'|'记录'|'证据'|'回顾'|'跟进';title:string;detail:string;project:string;date:string;quote?:string;checkId?:string};
export function searchArchive(store:Store,query:string):SearchHit[]{const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);if(!words.length)return [];const match=(text:string)=>words.every(w=>text.toLocaleLowerCase().includes(w));return [
 ...(store.workTasks||[]).filter(t=>match(`${t.name} ${t.labels.join(' ')} ${t.aliases.join(' ')}`)).map(t=>({id:t.id,kind:'工作任务' as const,title:t.name,detail:searchExcerpt(`${t.name} ${t.labels.join('、')} ${t.aliases.length?'曾用名：'+t.aliases.join('、'):''}`,query).text,project:t.project,date:t.updatedAt.slice(0,10)})),
 ...store.projects.filter(p=>match(`${p.name} ${p.goal} ${p.role} ${p.description}`)).map(p=>({id:p.id,kind:'项目' as const,title:p.name,detail:searchExcerpt(`${p.goal} ${p.description} ${p.role}`,query).text,project:p.name,date:p.startDate})),
 ...store.fragments.filter(f=>match(`${f.text} ${f.project} ${f.category} ${f.document?.name||''} ${f.date} ${f.date.slice(5).replace('-','.')} ${(f.reviewChecks||[]).map(c=>`${c.message} ${c.response}`).join(' ')}`)).map(f=>{const excerpt=searchExcerpt(f.text,query),check=(f.reviewChecks||[]).find(c=>words.some(w=>`${c.message} ${c.response}`.toLocaleLowerCase().includes(w))),detail=excerpt.quote?excerpt.text:check?searchExcerpt(`${check.message}\n${check.response}`,query).text:`${f.document?.name?`来源：${f.document.name} · `:''}${excerpt.text}`;return {id:f.id,kind:'记录' as const,title:fragmentHeadline(f.text),detail,quote:excerpt.quote,...(!excerpt.quote&&check?{checkId:check.id}:{}),project:f.project,date:f.date};}),
 ...store.evidence.filter(c=>match(`${c.title} ${c.project} ${c.problem} ${c.action} ${c.outcome} ${c.skills.join(' ')} ${c.workTaskName||''} ${(c.workTaskLabels||[]).join(' ')} ${c.reflection||''} ${c.reuse||''} ${c.nextStep||''}`)).map(c=>({id:c.id,kind:'证据' as const,title:c.title,detail:searchExcerpt(`${c.problem} ${c.action} ${c.outcome} ${c.skills.join('、')} ${c.reflection||''} ${c.reuse||''} ${c.nextStep||''}`,query).text,project:c.project,date:c.date})),
 ...store.reviews.filter(r=>match(`${r.title} ${r.content}`)).map(r=>({id:r.id,kind:'回顾' as const,title:r.title,detail:searchExcerpt(r.content.replace(/[#*>]/g,''),query).text,project:'阶段回顾',date:r.end})),
 ...(store.followUps||[]).filter(t=>match(`${t.title} ${t.project} ${t.observation}`)).map(t=>({id:t.id,kind:'跟进' as const,title:t.title,detail:searchExcerpt(`${t.title} ${t.observation||'计划验证，尚未形成结果'}`,query).text,project:t.project,date:t.dueDate}))
 ].sort((a,b)=>b.date.localeCompare(a.date));}
