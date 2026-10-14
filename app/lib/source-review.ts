import type {Fragment,GroupNotice,SourceCheck,Store,TaskPlan} from './types';
import {resolveSourceQuote} from './source-quotes';

export type SourceMatch={start:number;end:number;startLine:number;endLine:number};
export function sourceMatches(text:string,quote:string):SourceMatch[]{
 if(!quote.trim())return [];
 const exact=resolveSourceQuote(text,quote);if(!exact)return [];
 const matches:SourceMatch[]=[];let offset=0,index=text.indexOf(exact);
 while(index>=0){const end=index+exact.length;matches.push({start:index,end,startLine:text.slice(0,index).split('\n').length,endLine:text.slice(0,end-1).split('\n').length});offset=end;index=text.indexOf(exact,offset);}
 return matches;
}
export function sourceLocation(fragment:Fragment,quote:string,record?:number){
 const matches=sourceMatches(fragment.text,quote),lines=matches.map(m=>m.startLine===m.endLine?`${m.startLine}`:`${m.startLine}—${m.endLine}`).join('、');
 return {matches,date:fragment.dateRange&&fragment.dateRange.endDate!==fragment.date?`${fragment.date} — ${fragment.dateRange.endDate}`:fragment.date,record:record?`记录 ${String(record).padStart(2,'0')}`:'工作原文',document:fragment.document?`${fragment.document.name} · 第 ${fragment.document.index}/${fragment.document.total} 段${fragment.document.edited?' · 已校对修改':''}`:'手动工作记录',lines:lines?`本条原文第 ${lines} 行`:quote.trim()?'引用未能对应当前原文':`本条原文共 ${fragment.text.split('\n').length} 行`};
}
export function selectSourceText(editor:HTMLTextAreaElement,match:SourceMatch){
 editor.focus({preventScroll:true});editor.setSelectionRange(match.start,match.end);
 // Native selection does not scroll a textarea to the selected range.
 const style=getComputedStyle(editor),mirror=document.createElement('div');
 for(const property of ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','textIndent','tabSize'] as const)mirror.style[property]=style[property];
 Object.assign(mirror.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',left:'0',top:'0',width:`${editor.clientWidth}px`,boxSizing:'border-box',whiteSpace:'pre-wrap',overflowWrap:'anywhere'});
 mirror.textContent=editor.value.slice(0,match.start);const marker=document.createElement('span');marker.textContent=editor.value.slice(match.start,match.end)||'\u200b';mirror.appendChild(marker);document.body.appendChild(mirror);editor.scrollTop=Math.max(0,marker.offsetTop-editor.clientHeight/2);mirror.remove();
}
export function quoteFromSourceRange(text:string,container:HTMLElement,range:Range){
 const lines=text.split('\n'),starts:number[]=[];let offset=0;for(const line of lines){starts.push(offset);offset+=line.length+1;}
 const position=(node:Node,index:number)=>{if(node===container)return index>=lines.length?text.length:starts[index];const element=node instanceof Element?node:node.parentElement,line=element?.closest<HTMLElement>('[data-source-line]');if(!line||!container.contains(line))return null;const number=Number(line.dataset.sourceLine),content=line.querySelector('.source-line-text');if(!content||!Number.isInteger(number)||number<0||number>=lines.length||content.textContent!==lines[number])return null;const prefix=document.createRange();prefix.selectNodeContents(content);prefix.setEnd(node,index);return starts[number]+Math.min(prefix.toString().length,lines[number].length);};
 const start=position(range.startContainer,range.startOffset),end=position(range.endContainer,range.endOffset);return start===null||end===null||end<=start?null:text.slice(start,end);
}
const key=(n:Pick<SourceCheck,'quote'|'message'>)=>n.quote+'\u0000'+n.message;
export function preserveSourceChecks(fragment:Fragment,notices:GroupNotice[]):Fragment{
 const checks=[...(fragment.reviewChecks||[])];
 for(const notice of notices.filter(n=>n.fragmentId===fragment.id)){
  const index=checks.findIndex(c=>key(c)===key(notice)),previous=checks[index];
  const next:SourceCheck={id:previous?.id||notice.id||crypto.randomUUID(),quote:notice.quote,message:notice.message,status:notice.status||previous?.status||'open',response:notice.response??previous?.response??'',updatedAt:notice.updatedAt||previous?.updatedAt||new Date().toISOString()};
  if(index<0)checks.push(next);else checks[index]=next;
 }
 return checks.length?{...fragment,reviewChecks:checks}:fragment;
}
export function preservePlanChecks(fragments:Fragment[],plan:TaskPlan){const notices=plan.notices.map((n,i)=>({...n,id:n.id||`${plan.id}:${i}`}));return fragments.map(f=>preserveSourceChecks(f,notices));}
export function validateSourceChecks(fragment:Fragment){
 if(fragment.reviewChecks===undefined)return;
 const ids=new Set<string>();if(!Array.isArray(fragment.reviewChecks)||fragment.reviewChecks.length>150)throw new Error('原文核对提醒格式不正确。');
 for(const check of fragment.reviewChecks){if(!check||['id','quote','message','response','updatedAt'].some(k=>typeof(check as unknown as Record<string,unknown>)[k]!=='string')||!check.id||ids.has(check.id)||!check.quote.trim()||check.quote.length>6000||!check.message.trim()||check.message.length>1000||check.response.length>2000||!['open','resolved','dismissed'].includes(check.status)||!Number.isFinite(Date.parse(check.updatedAt))||(check.status!=='open'&&!check.response.trim()))throw new Error('核对提醒缺少有效的原文、状态或核对结论。');ids.add(check.id);}
}
export function pendingSourceChecks(store:Store){return store.fragments.flatMap(fragment=>(fragment.reviewChecks||[]).filter(c=>c.status==='open').map(check=>({fragment,check})));}
export function changeSourceCheck(store:Store,fragmentId:string,check:SourceCheck,original:SourceCheck):Store{
 const fragment=store.fragments.find(f=>f.id===fragmentId),current=fragment?.reviewChecks?.find(c=>c.id===check.id);
 if(!fragment||!current)throw new Error('对应原文或核对提醒已移出档案，请重新查看。');
 if(JSON.stringify(current)!==JSON.stringify(original))throw new Error('这条核对提醒已在其他页面修改，请重新查看后再保存。');
 const next={...fragment,reviewChecks:fragment.reviewChecks!.map(c=>c.id===check.id?check:c)};validateSourceChecks(next);
 return {...store,fragments:store.fragments.map(f=>f.id===fragmentId?next:f)};
}
