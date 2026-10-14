import type {Fragment,GroupingResult,TaskPlan,WorkTask} from './types';
import {organizeBatches} from './document-import';
import {appendGrouping,emptyTaskPlan,planContextTasks} from './work-tasks';
export async function analyzeTaskPlan(fragments:Fragment[],tasks:WorkTask[],request:(batch:Fragment[],tasks:WorkTask[])=>Promise<GroupingResult>,seed?:TaskPlan,checkpoint:(p:TaskPlan,message:string)=>Promise<void>=async()=>{},keepGoing:()=>boolean=()=>true){
 let plan=seed||emptyTaskPlan(fragments);if(plan.sourceIds.length!==fragments.length||plan.sourceIds.some(id=>!fragments.some(f=>f.id===id)))throw new Error('分组依据的原文已改变，请重新分析。');
 await checkpoint(plan,`已分析 ${plan.processedIds.length}/${fragments.length} 段原文`);
 const remaining=fragments.filter(f=>!plan.processedIds.includes(f.id)),batches=[...new Set(remaining.map(f=>f.project))].flatMap(project=>organizeBatches(remaining.filter(f=>f.project===project)));
 for(const batch of batches){if(!keepGoing())break;const result=await request(batch,planContextTasks(tasks,plan));plan=appendGrouping(plan,result,batch);await checkpoint(plan,`已分析 ${plan.processedIds.length}/${fragments.length} 段原文 · ${plan.groups.length} 个工作分组`);}
 return plan;
}
