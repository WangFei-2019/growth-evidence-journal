/// <reference types="vite/client" />
import type { Config, Evidence, Fragment, GroupingResult, ModelContext, ProcessingEntry } from './types';
import { callModel, parseJson, readConfig, validateCards, validateFragments } from './logic';
import {validateExtraction} from './model-result';
import {modelInput} from './model-input';
import { evidencePrompt,MODEL_OUTPUT_TOKENS } from './model-contract';
import {taskGroupingPrompt} from './task-prompt';
import {validateGrouping} from './work-tasks';
export const staticMode = import.meta.env.VITE_STATIC_MODE === 'true';
export async function modelRequest(action: string, config: Config, input: Fragment[], signal?:AbortSignal,context:ModelContext={}): Promise<{ok?: boolean; cards?: Evidence[];coverage?:ProcessingEntry[];grouping?:GroupingResult}> {
 const prepared=modelInput(input,context);
 if(!staticMode) {
  const res=await fetch('/api/model',{signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,config,fragments:prepared.fragments,context:prepared.context})});
  const result=await res.json() as {ok?:boolean;cards?:Evidence[];error?:string};
  if(!res.ok)throw new Error(result.error||'请求失败');return result;
 }
 const validated=readConfig(config);
 try {
  if(action==='test'){await callModel(validated,'你是 API 连通性检查助手。','请只回复 OK。',16,false,signal);return {ok:true};}
  const fragments=validateFragments(input);
  const payload=modelInput(fragments,context);
  if(!['extract','group'].includes(action))throw new Error('不支持的操作。');
  const content=await callModel(validated,action==='group'?taskGroupingPrompt:evidencePrompt,JSON.stringify(payload),MODEL_OUTPUT_TOKENS,true,signal);
  if(action==='group')return {grouping:validateGrouping(parseJson(content),fragments,payload.context)};
  return validateExtraction(parseJson(content),fragments,payload.context);
 } catch(e) {
  const message=e instanceof Error?e.message:'';
  if(/fetch|network/i.test(message))throw new Error('浏览器无法连接模型服务，请检查地址、网络及服务商的跨域访问支持。');
  if(/timeout|aborted/i.test(message))throw new Error('请求超过 60 秒，请减少内容或稍后重试。');
  throw e;
 }
}
