export function searchTerms(query:string){return [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort((a,b)=>b.length-a.length);}
export function searchExcerpt(text:string,query:string,max=170){
 const terms=searchTerms(query),lower=text.toLocaleLowerCase(),found=terms.map(term=>({term,index:lower.indexOf(term.toLocaleLowerCase())})).filter(m=>m.index>=0).sort((a,b)=>a.index-b.index)[0],start=Math.max(0,(found?.index||0)-45);
 return {text:(start?'…':'')+text.slice(start,start+max)+(start+max<text.length?'…':''),quote:found?text.slice(found.index,found.index+found.term.length):''};
}
export function searchHighlights(text:string,query:string){const terms=searchTerms(query);if(!terms.length)return [{text,match:false}];const regex=new RegExp('('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','giu');return text.split(regex).filter(Boolean).map(part=>({text:part,match:terms.some(t=>part.toLocaleLowerCase()===t.toLocaleLowerCase())}));}
