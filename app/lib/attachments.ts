import type { Attachment } from './types';
export const attachmentFormats=['png','jpg','jpeg','webp','pdf','docx','txt','md','markdown','log','csv','tsv'];
export async function readAttachment(file:File):Promise<Attachment>{if(file.size>10*1024*1024)throw new Error('单个附件不超过 10 MB。');if(!attachmentFormats.includes(file.name.split('.').at(-1)?.toLowerCase()||''))throw new Error('附件支持图片、PDF、DOCX 与文字记录。');const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('附件读取失败。'));r.readAsDataURL(file);});return {id:crypto.randomUUID(),name:file.name,type:file.type||'application/octet-stream',size:file.size,data};}
export function attachmentFile(a:Attachment){const payload=a.data.split(',')[1],bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));return new File([bytes],a.name,{type:a.type});}
export function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function downloadAttachment(a:Attachment){downloadBlob(a.name,attachmentFile(a));}
