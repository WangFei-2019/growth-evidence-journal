// Resolve presentation-only Markdown differences, then store the exact original span.
function visibleText(input:string){
 const units:{char:string;start:number;end:number}[]=[];
 for(let i=0;i<input.length;i++){const entity=input.slice(i).match(/^(?:&#x20;|&nbsp;)/i);if(entity){units.push({char:' ',start:i,end:i+entity[0].length});i+=entity[0].length-1;}else if(input[i]==='\\'&&/[\\`*{}\[\]()#+\-.!_>|]/.test(input[i+1]||'')){units.push({char:input[i+1],start:i,end:i+2});i++;}else units.push({char:input[i],start:i,end:i+1});}
 const kept:typeof units=[];
 for(let i=0;i<units.length;i++){if(units[i].char==='*'){let end=i+1;while(end<units.length&&units[end].char==='*')end++;if(end-i>=2){i=end-1;continue;}}const u=units[i];if(/\s/.test(u.char)){if(kept.at(-1)?.char===' ')kept[kept.length-1].end=u.end;else kept.push({...u,char:' '});}else kept.push(u);}
 return {text:kept.map(u=>u.char).join(''),units:kept};
}
export function resolveSourceQuote(source:string,quote:string){if(source.includes(quote))return quote;const normalized=visibleText(source),query=visibleText(quote).text.trim();if(query.length<4)return null;const index=normalized.text.indexOf(query);if(index<0||normalized.text.indexOf(query,index+1)>=0)return null;return source.slice(normalized.units[index].start,normalized.units[index+query.length-1].end);}
export function withPersonalListHeading(source:string,quote:string){
 const start=source.indexOf(quote);if(start<0||source.indexOf(quote,start+1)>=0)return quote;
 const lineStart=source.lastIndexOf('\n',start-1)+1,lineEnd=source.indexOf('\n',start),line=source.slice(lineStart,lineEnd<0?source.length:lineEnd);
 const plain=(s:string)=>visibleText(s).text.replace(/^\s*>\s*/,'').trim();
 if(!/^\d+[.、]\s*/.test(plain(line)))return quote;
 let heading=-1,offset=0;
 for(const item of source.slice(0,lineStart).split('\n')){const text=plain(item),boldHeading=/^\s*(?:\\?>\s*)?(?:\*\*|__)/.test(item)&&/(?:\*\*|__)\s*(?:&#x20;)?\s*$/.test(item);if(/^(?:#{1,6}\s*)?我(?:实际)?完成的(?:工作|事项)[：:]?$/.test(text))heading=offset;else if(/^#{1,6}\s/.test(text)||boldHeading||/^(?:后续|备注|团队(?:工作|行动)|其他人(?:的工作|行动))[：:]?$/.test(text))heading=-1;offset+=item.length+1;}
 return heading>=0&&start+quote.length-heading<=2400?source.slice(heading,start+quote.length):quote;
}
