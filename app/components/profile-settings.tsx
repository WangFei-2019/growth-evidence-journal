'use client';
import {useRef,useState} from 'react';
import {Camera,RotateCcw,Save} from 'lucide-react';
import {readAttachment} from '../lib/attachments';
export type Profile={name:string;avatar:string};
export const defaultProfile:Profile={name:'我',avatar:''};
export function ProfileAvatar({profile}:{profile:Profile}){return profile.avatar?<img src={profile.avatar} alt={`${profile.name}的头像`}/>:<span>{profile.name.slice(0,1)||'我'}</span>;}
export default function ProfileSettings({profile,onSave}:{profile:Profile;onSave:(p:Profile)=>Promise<void>}){
 const [draft,setDraft]=useState(profile),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const input=useRef<HTMLInputElement>(null);
 async function save(){setBusy(true);try{await onSave({...draft,name:draft.name.trim()||'我'});setMessage('个人资料已保存。');}catch(e){setMessage(e instanceof Error?e.message:'资料保存失败，请重试。');}finally{setBusy(false);}}
 return <section className="panel profile-settings"><h2>个人资料</h2><p className="muted">用熟悉的名字与头像，让这里成为自己的成长档案。资料保存在当前浏览器。</p><div className="profile-preview"><div className="avatar large"><ProfileAvatar profile={draft}/></div><div><b>{draft.name||'我'}</b><p>支持 JPG、PNG、WebP，最大 2 MB。</p><div className="settings-buttons"><button className="button secondary" onClick={()=>input.current?.click()}><Camera size={15}/>更换头像</button><button className="text-button" disabled={!draft.avatar} onClick={()=>{setDraft({...draft,avatar:''});setMessage('已恢复默认头像，保存后生效。');}}><RotateCcw size={14}/>恢复默认头像</button></div></div></div><input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');if(f.size>2*1024*1024)throw new Error('头像图片需要小于 2 MB。');const a=await readAttachment(f);setDraft(v=>({...v,avatar:a.data}));setMessage('头像已预览，点击保存资料后生效。');}catch(e){setMessage(e instanceof Error?e.message:'头像读取失败。');}finally{e.target.value='';}}}/><label className="profile-name">显示昵称<input value={draft.name} maxLength={24} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="你希望使用的名字"/></label><button className="button primary" disabled={busy||!draft.name.trim()} onClick={save}><Save size={15}/>保存个人资料</button>{message&&<p className="connection-result" role="status">{message}</p>}</section>;
}
