import type { Project, Store } from './types';
export const projectStates = { active: '进行中', paused: '暂缓', completed: '已完成', archived: '已归档' };
export const projectColors = { jade: '墨绿', orange: '橙色', blue: '蓝色', violet: '紫色' };
export function newProject(name=''): Project {
 return {id:crypto.randomUUID(),name,description:'',goal:'',role:'',status:'active',color:'jade',startDate:'',endDate:'',createdAt:new Date().toISOString()};
}
export function reconcileProjects(store: Store): Store {
 const projects=[...(store.projects||[])];
 for(const name of new Set([...store.fragments.map(f=>f.project),...store.evidence.map(c=>c.project),...(store.followUps||[]).map(f=>f.project),...(store.workTasks||[]).map(t=>t.project)])) {
  if(name.trim()&&name!=='未分类'&&!projects.some(p=>p.name===name))projects.push({...newProject(name),color:(Object.keys(projectColors) as Project['color'][])[projects.length%4]});
 }
 return {...store,projects};
}
export function validProjectDate(value:string) {
 return !value || (/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
}
export function saveProject(store:Store, value:Project):Store {
 const name=value.name.trim();
 if(!name||name.length>80||name==='未分类'||name==='__new_project__')throw new Error('请输入 1—80 字的项目名称，不可使用“未分类”。');
 if(store.projects.some(p=>p.name===name&&p.id!==value.id))throw new Error('这个项目名称已存在，请选择另一个名称。');
 if(!validProjectDate(value.startDate)||!validProjectDate(value.endDate)||(value.startDate&&value.endDate&&value.startDate>value.endDate))throw new Error('请检查计划日期，结束日期不能早于开始日期。');
 const old=store.projects.find(p=>p.id===value.id), project={...value,name};
 return {...store,workTasks:store.workTasks?.map(t=>old&&t.project===old.name?{...t,project:name}:t),followUps:store.followUps?.map(f=>old&&f.project===old.name?{...f,project:name}:f),projects:old?store.projects.map(p=>p.id===project.id?project:p):[project,...store.projects],fragments:store.fragments.map(f=>old&&f.project===old.name?{...f,project:name}:f),evidence:store.evidence.map(c=>old&&c.project===old.name?{...c,project:name}:c)};
}
export function deleteProject(store:Store,id:string):Store {
 const p=store.projects.find(p=>p.id===id);
 if(p&&(store.fragments.some(f=>f.project===p.name)||store.evidence.some(c=>c.project===p.name)))throw new Error('项目仍有关联记录，请使用归档保留完整档案。');
 return {...store,projects:store.projects.filter(p=>p.id!==id)};
}
export function projectStats(store:Store, name:string) {
 const fragments=store.fragments.filter(f=>f.project===name),cards=store.evidence.filter(c=>c.project===name);
 const dates=[...fragments.map(f=>f.date),...cards.map(c=>c.date)].sort();
 return {fragments,cards,confirmed:cards.filter(c=>c.status==='confirmed'),highlights:cards.filter(c=>c.highlight),firstDate:dates[0]||'',lastDate:dates.at(-1)||''};
}
