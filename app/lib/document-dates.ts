import type {Fragment,RecordDateRange} from './types';
function dateValue(year:string,month:string,day:string){const date=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,parsed=new Date(`${date}T00:00:00Z`);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;}
export function headingText(line:string){return line.replace(/&#x20;|&nbsp;/gi,' ').replace(/\\([#*_.>])/g,'$1').trim().replace(/^(?:\*\*|__)(?=#|\d|日期)/,'').replace(/(?:\*\*|__)$/,'').trim();}
export function dateRangeFromHeading(line:string,referenceDate=new Date().toISOString().slice(0,10)):RecordDateRange|null{
 const clean=headingText(line),match=clean.match(/^\s*(?:#{1,6}\s*)?(?:日期[：:]\s*)?(?:(\d{4})[年./-])?(\d{1,2})[月./-](\d{1,2})(?:日)?(?:\s*(?:-|~|至|—|–)\s*(?:(\d{4})[年./-])?(\d{1,2})[月./-](\d{1,2})(?:日)?)?(?=\s|$|[：:（(])/);
 if(!match)return null;
 const startDate=dateValue(match[1]||referenceDate.slice(0,4),match[2],match[3]),endDate=match[5]?dateValue(match[4]||match[1]||referenceDate.slice(0,4),match[5],match[6]):startDate;
 if(!startDate||!endDate||startDate>endDate)return null;
 return {startDate,endDate,heading:line,yearInferred:!match[1]};
}
export function validRecordDateRange(f:Pick<Fragment,'date'|'text'|'dateRange'>){const r=f.dateRange;if(!r||typeof r.heading!=='string'||typeof r.yearInferred!=='boolean'||!f.text.split('\n').includes(r.heading))return undefined;const parsed=dateRangeFromHeading(r.heading,f.date);return parsed&&r.startDate===f.date&&parsed.startDate===r.startDate&&parsed.endDate===r.endDate&&parsed.yearInferred===r.yearInferred?r:undefined;}
export function dateFromHeading(line:string,referenceDate=new Date().toISOString().slice(0,10)){return dateRangeFromHeading(line,referenceDate)?.startDate||null;}
