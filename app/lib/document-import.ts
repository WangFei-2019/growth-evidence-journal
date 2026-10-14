/// <reference types="vite/client" />
import type { Fragment } from './types';
import { readAttachment } from './attachments';
import { recognizeImage } from './ocr';
import {dateRangeFromHeading,headingText} from './document-dates';
export {dateFromHeading} from './document-dates';
export const SUPPORTED_FORMATS = ['txt', 'md', 'markdown', 'log', 'csv', 'tsv', 'docx', 'pdf','png','jpg','jpeg','webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMPORT_TEXT = 60000;
export type ImportedDocument = { id: string; name: string; format: string; text: string; hash: string; warning: string; pages?: number; attachment?:import('./types').Attachment };
export function normalizeText(text: string) { return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g,'').trim(); }
export async function pastedDocument(content:string,name='粘贴日志'):Promise<ImportedDocument> {
 const text=normalizeText(content);
 if(!text)throw new Error('请先粘贴工作日志内容。');
 if(text.length>MAX_IMPORT_TEXT)throw new Error('粘贴内容超过 60,000 字，请分次整理；原文未被截断。');
 const title=name.trim().replace(/[\r\n/\\]/g,' ').slice(0,100)||'粘贴日志';
 const document=await readDocument(new File([text],`${title.replace(/\.md$/i,'')}.md`,{type:'text/markdown'}));
 return {...document,warning:'粘贴原文已保留；日期和项目需要逐条校对。'};
}
function decodeText(buffer: ArrayBuffer) {
 const b = new Uint8Array(buffer);
 if(b[0]===0xff&&b[1]===0xfe)return new TextDecoder('utf-16le').decode(buffer);
 if(b[0]===0xfe&&b[1]===0xff)return new TextDecoder('utf-16be').decode(buffer);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{return new TextDecoder('gb18030').decode(buffer);}
}
export async function readDocument(file: File,options:{ocr?:boolean;onProgress?:(message:string)=>void}={}): Promise<ImportedDocument> {
 const format=file.name.split('.').at(-1)?.toLowerCase()||'';
 if(!SUPPORTED_FORMATS.includes(format))throw new Error('支持 TXT、MD、LOG、CSV、TSV、DOCX 和文字型 PDF；旧版 DOC 请先另存为 DOCX。');
 if(file.size>MAX_FILE_SIZE)throw new Error('文件超过 10 MB，请拆分或压缩后重试。');
 if(!file.size)throw new Error('这个文件没有内容。');
 const buffer=await file.arrayBuffer();
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
 let text='',warning='',pages: number|undefined;
 if(['png','jpg','jpeg','webp'].includes(format)){if(!options.ocr)throw new Error('图片需要启用本机 OCR。');text=await recognizeImage(file,options.onProgress);warning='图片文字由 OCR 识别，请逐条核对日期、数字和文字。';}
 else if(format==='docx') {
  const imported=await import('mammoth/mammoth.browser');
  const mammoth=imported.default || imported;
  const result=await mammoth.extractRawText({arrayBuffer:buffer});text=result.value;
  if(result.messages.some(m=>m.type==='warning'))warning='文档中的部分格式未保留，请检查文字预览。';
 }else if(format==='pdf') {
  const pdfjs=await import('pdfjs-dist');
  const assetBase=import.meta.env.BASE_URL||'/';
  pdfjs.GlobalWorkerOptions.workerSrc=assetBase+'pdf.worker.min.mjs';
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:false,disableFontFace:true,standardFontDataUrl:assetBase+'pdf-standard-fonts/'});
  let document: Awaited<typeof task.promise>|undefined;
  try {
   document=await task.promise;pages=document.numPages;
   if(pages>80)throw new Error('PDF 超过 80 页，请拆分后导入。');
   const parts:string[]=[];let emptyPages=0;
   for(let pageNumber=1;pageNumber<=pages;pageNumber++){
    const page=await document.getPage(pageNumber);const content=await page.getTextContent();
    let body='';for(const item of content.items){if('str' in item)body+=item.str+(item.hasEOL?'\n':' ');}
    body=body.trim();if(!body&&options.ocr){if(pages>20)throw new Error('扫描件请拆分为每份不超过 20 页。');options.onProgress?.(`正在识别扫描页 ${pageNumber}/${pages}`);const viewport=page.getViewport({scale:1.7}),canvas=globalThis.document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,viewport}).promise;body=await recognizeImage(canvas,options.onProgress);canvas.width=0;canvas.height=0;}
    if(!body)emptyPages++;else parts.push(`[第 ${pageNumber} 页]\n${body}`);
    page.cleanup();
    if(parts.join('\n\n').length>MAX_IMPORT_TEXT)throw new Error('文字超过 60,000 字，请拆分文档后导入。');
   }
   text=parts.join('\n\n');
   if(!text)throw new Error('没有提取到文字，请启用本机 OCR 或上传更清晰的文件。');
   warning=emptyPages?`${emptyPages} 页未提取到文字，可能包含图片；请确认文字预览。`:'PDF 的排版可能影响文字顺序，请检查预览。';
  }finally{await task.destroy();}
 }else text=decodeText(buffer);
 text=normalizeText(text);
 if(!text)throw new Error('没有提取到可用文字。');
 if(text.length>MAX_IMPORT_TEXT)throw new Error('文字超过 60,000 字，请拆分文档后导入。');
 return {id:crypto.randomUUID(),name:file.name,format,text,hash,warning,pages,...(typeof FileReader!=='undefined'?{attachment:await readAttachment(file)}:{})};
}
export function splitDocument(text: string, fallbackDate: string, autoDate: boolean, maxLength=2800) {
 const blocks:{text:string;date:string;dateRange?:import('./types').RecordDateRange}[]=[];
 let current='',date=fallbackDate,dateRange:import('./types').RecordDateRange|undefined;
 const append=(body:string)=>blocks.push({text:body,date,...(dateRange&&body.split('\n').includes(dateRange.heading)?{dateRange}:{})});
 for(const line of text.split('\n')){
  const found=autoDate?dateRangeFromHeading(line,fallbackDate):null;
  if(found){const headerOnly=current.trim()&&current.trim().split('\n').every(l=>!l.trim()||/^\s*#/.test(headingText(l))||/^\[第 \d+ 页\]$/.test(l.trim()));if(current.trim()&&!headerOnly){append(current.trim());current='';}date=found.startDate;dateRange=found;}
  if(current.length+line.length+1>maxLength && current.trim()){append(current.trim());current='';}
  if(line.length>maxLength){if(current.trim()){append(current.trim());current='';}for(let i=0;i<line.length;i+=maxLength)append(line.slice(i,i+maxLength));}
  else current+=(current?'\n':'')+line;
 }
 if(current.trim())append(current.trim());
 return blocks;
}
export function documentFragments(documents: ImportedDocument[], project: string, category: string, date: string, autoDate: boolean): Fragment[] {
 const createdAt=new Date().toISOString();
 return documents.flatMap(doc=>{const blocks=splitDocument(doc.text,date,autoDate);return blocks.map((b,i)=>({id:crypto.randomUUID(),date:b.date,...(b.dateRange?{dateRange:b.dateRange}:{}),project:project.trim()||'未分类',category,text:b.text,link:'',createdAt,...(i===0&&doc.attachment?{attachments:[doc.attachment]}:{}),document:{name:doc.name,format:doc.format,hash:doc.hash,index:i+1,total:blocks.length}}));});
}
export function organizeBatches(fragments: Fragment[]) {
 const batches:Fragment[][]=[];let batch:Fragment[]=[],length=0;
 for(const f of fragments){if(batch.length && (batch.length>=6 || length+f.text.length>12000)){batches.push(batch);batch=[];length=0;}batch.push(f);length+=f.text.length;}
 if(batch.length)batches.push(batch);return batches;
}
