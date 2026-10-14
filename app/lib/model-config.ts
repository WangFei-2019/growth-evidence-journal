import {CONFIG_KEY} from './data';
import {readConfig} from './logic';
import type {Config} from './types';

type LocalConfigStore={getValue:<T>(bucket:string,key:string)=>Promise<T|undefined>;putValue:(bucket:string,key:string,value:unknown)=>Promise<unknown>};

export async function loadModelConfig(storage:LocalConfigStore):Promise<Config>{
 const saved=await storage.getValue<Partial<Config>>('meta',CONFIG_KEY);
 return {baseUrl:typeof saved?.baseUrl==='string'?saved.baseUrl:'',model:typeof saved?.model==='string'?saved.model:'',apiKey:typeof saved?.apiKey==='string'?saved.apiKey:''};
}

export async function saveModelConfig(storage:LocalConfigStore,input:Config):Promise<Config>{
 const config=readConfig(input);
 await storage.putValue('meta',CONFIG_KEY,config);
 return config;
}

export async function clearModelKey(storage:LocalConfigStore):Promise<Config>{
 const config={...await loadModelConfig(storage),apiKey:''};
 await storage.putValue('meta',CONFIG_KEY,config);
 return config;
}

export const modelConfigChannel=(identityId:string)=>`growth-model-config:${identityId}`;
export function announceModelConfig(identityId:string){
 if(typeof BroadcastChannel==='undefined')return;
 const channel=new BroadcastChannel(modelConfigChannel(identityId));
 channel.postMessage('changed');
 channel.close();
}
