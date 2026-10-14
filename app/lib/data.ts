import {citationFields} from './model-result';
import {validateEvidenceDetails,validateProcessing} from './evidence-details';
import {confirmationIssues} from './lifecycle';
import type { Evidence, Fragment, Store } from './types';
import { newProject, projectColors, projectStates, reconcileProjects, validProjectDate } from './projects';
import {reviewText} from './exports';
import {validRecordDateRange} from './document-dates';
import {newWorkTask,validateTaskStore} from './work-tasks';
import {validateSourceChecks} from './source-review';
export const KEY = 'growth-evidence-v1';
export const CONFIG_KEY = 'growth-evidence-api';
export const categories = ['项目推进', '问题解决', '协作沟通', '学习实践', '用户反馈', '日常工作'];
export function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date()); }
export function daysAgo(days: number) { const d = new Date(`${today()}T12:00:00+08:00`); d.setDate(d.getDate() - days); return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(d); }
export function emptyStore(): Store { return { version: 1, mode: 'personal', projects: [], fragments: [], evidence: [], reviews: [] }; }
export function demoStore(): Store {
 const entries = [
  ['f1', 12, '客户工作台', '问题解决', '客户反馈筛选列表加载慢。我通过浏览器性能分析定位到重复查询，将筛选请求合并。相同测试环境下，列表加载时间从 2.4 秒降至 0.8 秒。'],
  ['f2', 10, '客户工作台', '协作沟通', '筛选功能的退款场景没有明确规则。我整理了 6 个边界案例，与产品和测试逐项确认，形成验收清单，三方已经确认采用。'],
  ['f3', 8, '团队知识库', '学习实践', '新人对项目部署流程不熟悉。我把部署步骤整理成一份可操作的检查清单，并让 2 位新同事试用。两人均独立完成测试环境部署。'],
  ['f4', 6, '客户工作台', '用户反馈', '参加了客户访谈，用户提出批量导出不够方便。我记录了具体使用场景，还需要和产品确认后续方案。'],
  ['f5', 4, '团队知识库', '协作沟通', '今天组织了部署清单分享会，收集到 3 条改进建议。准备下周更新文档，更新效果还没有验证。'],
  ['f6', 2, '客户工作台', '项目推进', '完成新版工作台原型，邀请两位同事体验。他们认为信息层级更清晰。还没有正式开展用户测试，不能判断业务效果。'],
  ['f7', 1, '个人学习', '学习实践', '学习了结构化输出的基本方法，做了一个把文本转换为 JSON 的练习。还需要验证复杂文本和异常返回。'],
  ['f8', 0, '客户工作台', '日常工作', '整理了今天的上线检查项，发现一个权限提示文案遗漏，提交给产品确认。']
 ] as const;
 const fragments: Fragment[] = entries.map(([id, ago, project, category, text]) => ({ id, date: daysAgo(ago), project, category, text, link: '', createdAt: new Date().toISOString() }));
 function card(i: number, title: string, problem: string, action: string, outcome: string, skills: string[], status: Evidence['status'], missing: string[] = []): Evidence {
   const f = fragments[i];
   return { id: `e${i+1}`, title, date: f.date, project: f.project, problem, action, outcome, skills, missing, status, highlight:i===0, createdAt: f.createdAt, sourceRefs: (['problem','action','outcome'] as const).filter(field => field !== 'outcome' || status === 'confirmed').map(field => ({ fragmentId: f.id, quote: f.text, field })) };
 }
 const projects:import('./types').Project[]=[{...newProject('客户工作台'),description:'围绕筛选、导出和信息呈现持续优化工作台体验。',goal:'让用户更快找到信息，顺利完成筛选与导出。',role:'负责性能定位、原型验证与验收规则对齐',color:'jade' as const,startDate:daysAgo(20)}, {...newProject('团队知识库'),description:'将部署经验沉淀为团队可以复用的操作资料。',goal:'让新同事能够独立完成测试环境部署。',role:'整理检查清单，组织试用与分享',color:'blue' as const,startDate:daysAgo(15)}, {...newProject('个人学习'),description:'通过小练习把学习内容变成可验证的实践。',goal:'掌握结构化输出，并验证复杂输入与异常情况。',role:'独立学习与实践',color:'violet' as const,startDate:daysAgo(10)}];
 const evidence:Evidence[]=[
  card(0, '把列表加载时间从 2.4 秒降至 0.8 秒', '客户反馈筛选列表加载慢', '分析性能瓶颈，并合并重复的筛选请求', '相同测试环境下，加载时间从 2.4 秒降至 0.8 秒', ['问题解决', '工程实践'], 'confirmed'),
  card(1, '用 6 个边界案例对齐功能验收规则', '退款场景规则未明确', '整理边界案例，与产品和测试逐项确认', '形成验收清单，三方已确认采用', ['协作沟通', '需求分析'], 'confirmed'),
  card(2, '把部署经验变成新人能使用的清单', '新人不熟悉部署流程', '编写部署检查清单，邀请 2 位新同事试用', '2 位同事均独立完成测试环境部署', ['知识沉淀', '工程实践'], 'confirmed'),
  card(5, '完成工作台原型并收集初步反馈', '原型信息层级需要验证', '制作原型，邀请两位同事体验', '正式用户测试结果待补充', ['产品设计', '用户洞察'], 'draft', ['是否开展正式用户测试？具体发现是什么？', '你的个人职责和原型交付范围是什么？'])
 ];
 const seed=fragments[0];evidence[0]={...evidence[0],modelVersion:'2',actorName:'我',attribution:'personal',role:'性能定位与筛选请求合并',conditions:'相同测试环境',startDate:seed.date,endDate:seed.date,periodBasis:'records',outcomeDate:seed.date,outcomeDateBasis:'record',dateRefs:[{field:'outcomeDate',fragmentId:seed.id,quote:'相同测试环境下，列表加载时间从 2.4 秒降至 0.8 秒。',date:seed.date,basis:'record'}],conflicts:[],suggestions:{reflection:'可以思考：你如何区分重复查询与其他性能瓶颈？',reuse:'可尝试把性能定位过程写成检查清单，前提是说明测试环境与适用范围。',nextStep:'下一次可观察不同筛选条件下是否仍能保持相同的响应表现。'},sourceRefs:[...evidence[0].sourceRefs,{field:'role',fragmentId:seed.id,quote:'我通过浏览器性能分析定位到重复查询，将筛选请求合并。'},{field:'conditions',fragmentId:seed.id,quote:'相同测试环境下'}]};
 projects[0].milestones=[{id:'demo-m1',title:'完成列表性能验证',targetDate:fragments[0].date,completedAt:fragments[0].date+'T04:00:00Z',evidenceIds:['e1']},{id:'demo-m2',title:'完成原型正式用户测试',targetDate:daysAgo(-5),completedAt:'',evidenceIds:[]}];
 projects[1].milestones=[{id:'demo-m3',title:'验证新人可独立部署',targetDate:fragments[2].date,completedAt:fragments[2].date+'T04:00:00Z',evidenceIds:['e3']}];
 const workTasks=[['筛选性能优化','客户工作台',['性能优化']],['验收规则对齐','客户工作台',['需求边界']],['部署知识沉淀','团队知识库',['部署清单']],['工作台原型验证','客户工作台',['原型验证']]].map(([name,project,labels],i)=>({...newWorkTask(name as string,project as string,labels as string[]),id:'demo-task-'+(i+1)}));const taskLinks=evidence.map((c,i)=>({id:'demo-task-link-'+i,taskId:workTasks[i].id,fragmentId:c.sourceRefs[0].fragmentId,quote:fragments.find(f=>f.id===c.sourceRefs[0].fragmentId)!.text,kind:'action' as const,reason:'示例中同一工作沿用统一任务名称。'}));for(let i=0;i<evidence.length;i++){evidence[i]={...evidence[i],workTaskId:workTasks[i].id,workTaskName:workTasks[i].name,workTaskLabels:workTasks[i].labels};}
 const selected=evidence.filter(c=>c.status==='confirmed'),start=daysAgo(30),end=today();
 const review={id:'demo-review',title:'成长回顾 · 示例',start,end,content:reviewText(selected,start,end,'成长回顾'),createdAt:new Date().toISOString(),evidenceIds:selected.map(c=>c.id),generatedBy:'template' as const,format:'成长回顾',evidenceSnapshot:structuredClone(selected),sourceSnapshot:structuredClone(fragments.filter(f=>selected.some(c=>c.sourceRefs.some(r=>r.fragmentId===f.id))))};
 return {version:1,mode:'demo',projects,fragments,evidence,reviews:[review],workTasks,taskLinks,followUps:[{id:"demo-follow",title:"开展工作台原型正式用户测试",project:"客户工作台",evidenceId:"e6",dueDate:daysAgo(-5),status:"open",createdAt:new Date().toISOString(),observation:"",observedDate:"",fragmentId:"",completedAt:""}]};
}
export function validateStore(input: unknown): Store {
 const v = input as Store;
 if (!v || v.version !== 1 || !['demo','personal'].includes(v.mode) || !Array.isArray(v.fragments) || !Array.isArray(v.evidence) || !Array.isArray(v.reviews) || v.fragments.length > 5000 || v.evidence.length > 5000 || v.reviews.length > 1000) throw new Error('备份格式不正确，当前数据未改变。');
 const strings = (o: object, fields: string[]) => fields.every(k => typeof (o as Record<string, unknown>)[k] === 'string');
 const validDate = (s: string) => !!s && validProjectDate(s);
 const ids = new Set<string>();
 for (const f of v.fragments) {
  if (!f || !strings(f,['id','date','project','category','text','link','createdAt']) || !validDate(f.date) || f.text.length > 6000 || ids.has(f.id)) throw new Error('碎片数据格式不正确。');
  if(f.document && (typeof f.document.name!=='string' || typeof f.document.format!=='string' || typeof f.document.hash!=='string' || !Number.isInteger(f.document.index) || !Number.isInteger(f.document.total) || f.document.index<1 || f.document.total<f.document.index))throw new Error('文件来源信息格式不正确。');
  if(f.dateRange&&!validRecordDateRange(f))throw new Error('记录日期范围不能对应原始标题，请重新校对。');
  if(f.attachments&&(!Array.isArray(f.attachments)||f.attachments.length>8||f.attachments.some(a=>!a||!strings(a,['id','name','type','data'])||!Number.isFinite(a.size)||a.size<0||a.size>10485760||!/^data:[a-z0-9.+/-]+;base64,[A-Za-z0-9+/]*={0,2}$/.test(a.data)||a.data.length>15000000)))throw new Error('附件格式或大小不正确。');
  ids.add(f.id);
  validateSourceChecks(f);
 }
 const evidenceIds = new Set<string>();
 for (const c of v.evidence) {
  if (!c || !strings(c,['id','title','date','project','problem','action','outcome','createdAt']) || !validDate(c.date) || !['draft','confirmed'].includes(c.status) || !Array.isArray(c.skills) || !c.skills.every(x=>typeof x==='string') || !Array.isArray(c.missing) || !c.missing.every(x=>typeof x==='string') || !Array.isArray(c.sourceRefs) || evidenceIds.has(c.id)) throw new Error('证据卡片格式不正确。');
  evidenceIds.add(c.id);
  if(c.highlight!==undefined&&typeof c.highlight!=='boolean')throw new Error('重点证据标记格式不正确。');
  if(c.template&&!['problem','collaboration','learning','maintenance'].includes(c.template))throw new Error('证据模板格式不正确。');
  if(['role','conditions','reflection','reuse','nextStep','importBatch'].some(k=>k in c&&typeof(c as unknown as Record<string,unknown>)[k]!=='string'))throw new Error('成长反思字段格式不正确。');
  for(const r of c.sourceRefs) { const f = v.fragments.find(x=>x.id===r.fragmentId); if(!f || typeof r.quote !== 'string' || !f.text.includes(r.quote) || !citationFields.includes(r.field)) throw new Error('证据引用失效，未导入。'); }
 }
 for(const c of v.evidence)validateEvidenceDetails(c,v.fragments);
 validateProcessing(v);
 validateTaskStore(v);
 for(const r of v.reviews) if(!r || !strings(r,['id','title','start','end','content','createdAt']) || !Array.isArray(r.evidenceIds) || !r.evidenceIds.every(x=>typeof x==='string') || !['template','ai'].includes(r.generatedBy)) throw new Error('回顾数据格式不正确。');
 for(const r of v.reviews){if(r.evidenceSnapshot!==undefined){if(!Array.isArray(r.evidenceSnapshot)||!Array.isArray(r.sourceSnapshot))throw new Error('回顾来源快照格式不正确。');validateStore({version:1,mode:v.mode,projects:[],fragments:r.sourceSnapshot,evidence:r.evidenceSnapshot,reviews:[]});}}
 if(v.projects!==undefined) {
  if(!Array.isArray(v.projects)||v.projects.length>1000)throw new Error('项目数据格式不正确。');
  const names=new Set<string>(),projectIds=new Set<string>();
  for(const p of v.projects) {
   if(!p||!strings(p,['id','name','description','goal','role','status','color','startDate','endDate','createdAt'])||!p.name.trim()||p.name==='未分类'||p.name.length>80||p.description.length>1000||p.goal.length>600||p.role.length>300||!Object.hasOwn(projectStates,p.status)||!Object.hasOwn(projectColors,p.color)||!validProjectDate(p.startDate)||!validProjectDate(p.endDate)||(p.startDate&&p.endDate&&p.startDate>p.endDate)||names.has(p.name)||projectIds.has(p.id))throw new Error('项目数据格式不正确。');
   names.add(p.name);projectIds.add(p.id);
   if(p.milestones&&(!Array.isArray(p.milestones)||p.milestones.some(m=>!m||!m.title.trim()||m.title.length>160||(m.completedAt&&(!Number.isFinite(Date.parse(m.completedAt))||!m.evidenceIds?.length))||!strings(m,['id','title','targetDate','completedAt'])||!validProjectDate(m.targetDate)||!Array.isArray(m.evidenceIds)||!m.evidenceIds.every(x=>typeof x==='string'))))throw new Error('里程碑格式不正确。');
  }
 }
 if(v.followUps!==undefined){if(!Array.isArray(v.followUps)||v.followUps.length>5000)throw new Error('跟进任务格式不正确。');const seen=new Set<string>();for(const f of v.followUps){if(!f||!strings(f,['id','title','project','evidenceId','dueDate','status','createdAt','observation','observedDate','fragmentId','completedAt'])||!f.title.trim()||f.title.length>200||f.observation.length>5000||!validDate(f.dueDate)||!['open','completed','cancelled'].includes(f.status)||seen.has(f.id)||(f.status==='completed'&&(!f.observation.trim()||!validDate(f.observedDate)||f.observedDate>today()||!v.fragments.some(r=>r.id===f.fragmentId))))throw new Error('跟进任务缺少有效日期或观察依据。');seen.add(f.id);}}
 if(v.trash!==undefined){if(!Array.isArray(v.trash)||v.trash.length>1000)throw new Error('回收站格式不正确。');for(const t of v.trash){if(!t||!strings(t,['id','title','deletedAt'])||!Array.isArray(t.fragments)||!Array.isArray(t.evidence)||!Array.isArray(t.projects)||!Array.isArray(t.reviews))throw new Error('回收站条目不正确。');validateStore({version:1,mode:v.mode,projects:t.projects,fragments:[...new Map([...v.fragments,...t.fragments].map(f=>[f.id,f])).values()],evidence:t.evidence,reviews:t.reviews,processing:t.processing,workTasks:t.workTasks,taskLinks:t.taskLinks});}}
 return reconcileProjects(v);
}
export function readyToConfirm(c: Evidence) {return confirmationIssues(c).length===0;}
export function reviewContent(cards: Evidence[], start: string, end: string, format: string) {
 const headline = format === '述职素材' ? '阶段工作成果与个人贡献' : format === '面试故事' ? '可追溯的面试故事' : '我的成长回顾';
 let result = `# ${headline}\n\n周期：${start} — ${end}\n\n本次整理 ${cards.length} 张已确认的证据卡。\n`;
 const highlights=cards.filter(c=>c.highlight);if(highlights.length)result+=`\n## 本阶段重点贡献\n\n${highlights.map(c=>`- ${c.title}（${c.project} · ${c.date}）`).join('\n')}\n`;
 cards.forEach((c,i)=>{ result += `\n## ${i+1}. ${c.title}\n\n项目：${c.project} · 日期：${c.date}\n\n${format==='面试故事'?'情境 / 任务':'问题'}：${c.problem}\n\n行动：${c.action}\n\n结果：${c.outcome}\n\n能力标签：${c.skills.join('、') || '未标注'}\n\n原文依据：\n${[...new Map(c.sourceRefs.map(r=>[r.fragmentId+r.quote,r])).values()].map(r=>`> ${r.quote}\n> 来源记录：${r.fragmentId}`).join('\n\n')}\n`; });
 result += '\n## 下一阶段的思考\n\n- 哪种做法值得重复？\n- 哪个结果还需要持续验证？\n- 下一次想积累哪类证据？\n\n（此处由本人补充。以上内容按已确认事实编排，未增加新成果。）\n';
 return result;
}
