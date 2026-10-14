import type {Fragment} from './types';
import {dateRangeFromHeading,headingText} from './document-dates';

export type DuplicateMatch={fragment:Fragment;kind:'exact'|'similar';score:number;origin:'saved'|'batch'};
export type DuplicateReviews=Record<string,string>;
type Prepared={fragment:Fragment;body:string;grams:Set<string>;origin:DuplicateMatch['origin']};

// Compare visible content while keeping negation, completion marks and numbers.
// Date headings belong to the record metadata and should not hide repeated text.
export function duplicateText(text:string){
 return text.normalize('NFKC').replace(/\r\n?/g,'\n').split('\n')
  .map(line=>dateRangeFromHeading(line,'2026-01-01')?headingText(line).replace(/^\s*(?:#{1,6}\s*)?(?:日期[：:]\s*)?(?:\d{4}[年./-])?\d{1,2}[月./-]\d{1,2}日?(?:\s*(?:-|~|至|—|–)\s*(?:\d{4}[年./-])?\d{1,2}[月./-]\d{1,2}日?)?/,''):line)
  .join('\n').replace(/!?\[([^\]]+)\]\(([^)]*)\)/g,'$1($2)')
  .replace(/&#x20;|&nbsp;/gi,' ').replace(/\\([*_#>`~])/g,'$1')
  .replace(/\*\*|__/g,'').replace(/^[ \t]*[#>]+\s?/gm,'').replace(/[`~]/g,'').replace(/\s+/g,'').toLowerCase();
}
function grams(body:string){const result=new Set<string>();for(const word of body.match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g)||[])result.add(`word:${word}`);for(let i=0;i<body.length-1;i++)result.add(body.slice(i,i+2));return result;}
function prepare(fragment:Fragment,origin:DuplicateMatch['origin']):Prepared{const body=duplicateText(fragment.text);return {fragment,body,grams:grams(body),origin};}
export function duplicateIndex(existing:Fragment[]){return existing.map(f=>prepare(f,'saved'));}
function compare(a:Prepared,b:Prepared):DuplicateMatch|null{
 if(a.fragment.id===b.fragment.id||!a.body||!b.body)return null;
 if(a.body===b.body){if(a.body.length<12&&(a.fragment.date!==b.fragment.date||a.fragment.project!==b.fragment.project))return null;return {fragment:b.fragment,kind:'exact',score:1,origin:b.origin};}
 // Short/generic snippets have too little context for a reliable similarity hint.
 if(Math.min(a.body.length,b.body.length)<24)return null;
 const ratio=Math.min(a.body.length,b.body.length)/Math.max(a.body.length,b.body.length);
 if(ratio<.55)return null;
 let intersection=0;for(const gram of a.grams)if(b.grams.has(gram))intersection++;
 const score=2*intersection/(a.grams.size+b.grams.size),coverage=intersection/Math.min(a.grams.size,b.grams.size);
 if(score<.84&&!(coverage>=.92&&ratio>=.65))return null;
 return {fragment:b.fragment,kind:'similar',score,origin:b.origin};
}
export function findRecordDuplicates(fragment:Fragment,index:ReturnType<typeof duplicateIndex>,limit=3){
 const candidate=prepare(fragment,'batch');return index.map(item=>compare(candidate,item)).filter((x):x is DuplicateMatch=>!!x)
  .sort((a,b)=>Number(b.kind==='exact')-Number(a.kind==='exact')||b.score-a.score||Number(a.origin==='batch')-Number(b.origin==='batch')||a.fragment.id.localeCompare(b.fragment.id)).slice(0,limit);
}
export function batchRecordDuplicates(rows:Fragment[],existing:Fragment[]){
 const index=duplicateIndex(existing),result=new Map<string,DuplicateMatch[]>();
 for(const row of rows){result.set(row.id,findRecordDuplicates(row,index));if(!existing.some(f=>f.id===row.id))index.push(prepare(row,'batch'));}
 return result;
}
export function duplicateReviewKey(fragment:Fragment,matches:DuplicateMatch[]){
 if(!matches.length)return '';
 // This is a draft review marker, not a security hash. Exact text is included so
 // editing dates, projects, either record, or the set of candidates resets review.
 return JSON.stringify([fragment.id,fragment.date,fragment.project,fragment.text,matches.map(m=>[m.fragment.id,m.fragment.date,m.fragment.project,m.fragment.text,m.kind])]);
}
export function requireDuplicateReview(rows:Fragment[],existing:Fragment[],reviews:DuplicateReviews={}){
 const matches=batchRecordDuplicates(rows,existing);
 for(const row of rows){if(existing.some(f=>f.id===row.id&&f.text===row.text&&f.date===row.date&&f.project===row.project))continue;const key=duplicateReviewKey(row,matches.get(row.id)||[]);if(key&&reviews[row.id]!==key)throw new Error('发现尚未核对的相似记录，请查看对照后选择跳过，或确认保留为不同的进展。');}
}
export function skipImportRecord(rows:Fragment[],id:string){
 const removed=rows.find(f=>f.id===id),remaining=rows.filter(f=>f.id!==id);
 if(!removed?.document||!removed.attachments?.length)return remaining;
 const target=remaining.find(f=>f.document?.hash===removed.document!.hash);
 if(!target)return remaining;
 return remaining.map(f=>f.id===target.id?{...f,attachments:[...(f.attachments||[]),...removed.attachments!.filter(a=>!remaining.some(row=>row.attachments?.some(x=>x.id===a.id)))]}:f);
}
