// Passwords and non-extractable keys stay in memory. AAD binds each value to its location.
export type Protection={version:string;salt:string;iterations:number;autoLock:number};
export type CipherValue={encrypted:1;iv:string;cipher:string;stamp:string};
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const un64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function newProtection(autoLock=10):Protection{return {version:crypto.randomUUID(),salt:b64(crypto.getRandomValues(new Uint8Array(16))),iterations:310000,autoLock};}
export async function passwordKey(password:string,security:Protection){if(password.length<12)throw new Error('本机保护口令至少需要 12 个字符。');const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:un64(security.salt),iterations:security.iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function seal(value:unknown,key:CryptoKey,aad:string):Promise<CipherValue>{const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad)},key,enc.encode(JSON.stringify(value)));return {encrypted:1,iv:b64(iv),cipher:b64(new Uint8Array(cipher)),stamp:crypto.randomUUID()};}
export async function unseal<T>(value:CipherValue,key:CryptoKey,aad:string):Promise<T>{try{const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(value.iv),additionalData:enc.encode(aad)},key,un64(value.cipher));return JSON.parse(dec.decode(raw)) as T;}catch{throw new Error('口令不正确，或加密内容已损坏。');}}
export function isCipher(v:unknown):v is CipherValue{return !!v&&typeof v==='object'&&(v as CipherValue).encrypted===1;}
