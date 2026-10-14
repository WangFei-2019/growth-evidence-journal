import type { Evidence, Fragment, Milestone, Store } from './types';
export type TimelineEntry = { id:string; date:string; project:string; fragment?:Fragment; card?:Evidence; milestone?:Milestone; linked:Evidence[] };
export function fragmentHeadline(text:string) {
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const meaningful=lines.find(s=>!/^#+\s|^\[第\s*\d+\s*页\]$/.test(s)&&!/^\d{4}[年./-]\d{1,2}[月./-]\d{1,2}(?:日)?(?:\s*(?:周.|星期.))?$/.test(s));
 return (meaningful||lines[0]||'工作记录').replace(/^#+\s*/,'').split(/[。！？]/)[0].slice(0,100);
}
export function timelineEntries(store:Store, project='全部项目', start='', end='', query='',taskId=''):TimelineEntry[] {
 const linked=new Map<string,Evidence[]>();
 for(const c of store.evidence)for(const id of new Set(c.sourceRefs.map(r=>r.fragmentId)))linked.set(id,[...(linked.get(id)||[]),c]);
 const entries:TimelineEntry[]=store.fragments.map(f=>({id:f.id,date:f.date,project:f.project,fragment:f,linked:linked.get(f.id)||[]}));
 for(const c of store.evidence)if(!c.sourceRefs.some(r=>store.fragments.some(f=>f.id===r.fragmentId)))entries.push({id:`card-${c.id}`,date:c.date,project:c.project,card:c,linked:[]});
 for(const p of store.projects)for(const m of p.milestones||[])if(m.completedAt)entries.push({id:`milestone-${m.id}`,date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(m.completedAt)),project:p.name,milestone:m,linked:store.evidence.filter(c=>m.evidenceIds.includes(c.id))});
 const q=query.trim().toLowerCase();
 return entries.filter(e=>{const tasks=timelineTaskIds(e,store),names=(store.workTasks||[]).filter(t=>tasks.includes(t.id)).map(t=>`${t.name} ${t.labels.join(' ')} ${t.aliases.join(' ')}`).join(' ');return (project==='全部项目'||e.project===project)&&(!taskId||tasks.includes(taskId))&&(!start||e.date>=start)&&(!end||e.date<=end)&&`${e.fragment?.text||''} ${e.card?.title||''} ${e.milestone?.title||''} ${e.project} ${e.linked.map(c=>c.title).join(' ')} ${names}`.toLowerCase().includes(q);}).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function timelineTaskIds(entry:TimelineEntry,store:Store){return [...new Set([...(entry.fragment?(store.taskLinks||[]).filter(l=>l.fragmentId===entry.fragment!.id&&l.taskId).map(l=>l.taskId):[]),...[...entry.linked,...(entry.card?[entry.card]:[])].filter(c=>!entry.fragment||c.sourceRefs.some(r=>r.fragmentId===entry.fragment!.id&&['action','outcome'].includes(r.field))).map(c=>c.workTaskId||'').filter(Boolean)])];}
export function timelineTaskGroups(entries:TimelineEntry[],store:Store){
 const groups=new Map<string,{id:string;name:string;project:string;taskId:string;entries:TimelineEntry[]}>();
 for(const entry of entries){const tasks=timelineTaskIds(entry,store),keys=tasks.length?tasks:[`source:${entry.id}`];for(const id of keys){const task=store.workTasks?.find(t=>t.id===id),group=groups.get(id)||{id,name:task?.name||entry.milestone?.title||entry.card?.title||fragmentHeadline(entry.fragment?.text||''),project:entry.project,taskId:task?.id||'',entries:[]};group.entries.push(entry);groups.set(id,group);}}
 return [...groups.values()];
}
export function timelineDays(entries:TimelineEntry[], ascending=false) {
 const groups=new Map<string,TimelineEntry[]>();
 for(const entry of entries)groups.set(entry.date,[...(groups.get(entry.date)||[]),entry]);
 return [...groups].sort(([a],[b])=>ascending?a.localeCompare(b):b.localeCompare(a));
}
export function timelineMonths(entries:TimelineEntry[]) {
 const months=new Map<string,{month:string;records:number;confirmed:Set<string>}>();
 for(const e of entries){const month=e.date.slice(0,7),v=months.get(month)||{month,records:0,confirmed:new Set<string>()};if(e.fragment)v.records++;for(const c of [...e.linked,...(e.card?[e.card]:[])])if(c.status==='confirmed')v.confirmed.add(c.id);months.set(month,v);}
 return [...months.values()].sort((a,b)=>b.month.localeCompare(a.month));
}
export function monthBounds(month:string) {
 const [y,m]=month.split('-').map(Number);return {start:`${month}-01`,end:`${month}-${new Date(Date.UTC(y,m,0)).getUTCDate()}`};
}
