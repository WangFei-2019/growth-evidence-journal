import {validateExtraction} from './model-result';
import type { Config, Evidence, Fragment, Citation } from './types';
export function endpoint(baseUrl: string) {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new Error('请填写完整的 HTTPS API 地址。'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443') || !host.includes('.') || host.includes(':') || host.endsWith('.local') || host.endsWith('.localhost') || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) throw new Error('API 地址需要使用公网 HTTPS 域名，不支持 IP 或本机地址。');
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (!url.pathname.endsWith('/chat/completions')) url.pathname += '/chat/completions';
  return url.toString();
}
export function readConfig(input: unknown): Config {
  if (!input || typeof input !== 'object') throw new Error('请先在设置中填写 API。');
  const o = input as Record<string, unknown>;
  const c = { baseUrl: String(o.baseUrl || '').trim(), model: String(o.model || '').trim(), apiKey: String(o.apiKey || '').trim() };
  endpoint(c.baseUrl);
  if (!c.model || c.model.length > 150) throw new Error('请填写有效的模型名称。');
  if (!c.apiKey || c.apiKey.length > 2048 || /[\r\n]/.test(c.apiKey)) throw new Error('请填写有效的 API Key。');
  return c;
}
export function validateFragments(value: unknown): Fragment[] {
  if (!Array.isArray(value) || !value.length || value.length > 12) throw new Error('每次请选择 1—12 条碎片。');
  let length = 0; const ids = new Set<string>();
  const result = value.map((v) => {
    if (!v || typeof v !== 'object' || typeof v.id !== 'string' || typeof v.text !== 'string' || !v.text.trim() || v.text.length > 6000 || ids.has(v.id)) throw new Error('碎片格式不正确或内容过长。');
    ids.add(v.id); length += v.text.length;
    return { ...v, date: String(v.date || ''), project: String(v.project || '未分类'), category: String(v.category || '工作记录'), text: v.text, link: String(v.link || '') } as Fragment;
  });
  if (length > 24000) throw new Error('本次内容超过 24,000 字，请减少选择后重试。');
  return result;
}
const str = (v: unknown, max = 1800) => typeof v === 'string' ? v.trim().slice(0, max) : '';
export function parseJson(content: string) {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(text); } catch { throw new Error('模型没有返回有效的结构化结果，请重试或更换模型。'); }
}
export function validateCards(input: unknown, fragments: Fragment[]): Evidence[] {return validateExtraction(input,fragments).cards;}
export async function callModel(config: Config, system: string, user: string, maxTokens = 4500, json = false, signal?:AbortSignal) {
  const target = endpoint(config.baseUrl);
  const deepseek = new URL(target).hostname === 'api.deepseek.com';
  const response = await fetch(target, { method: 'POST', redirect: 'manual', signal: signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000), headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: maxTokens, stream: false, ...(deepseek ? { thinking: { type: 'disabled' }, ...(json ? { response_format: { type: 'json_object' } } : {}) } : {}) }) });
  if (response.status >= 300 && response.status < 400) throw new Error('API 地址发生重定向，请填写服务商提供的最终接口地址。');
  if (!response.ok) {
    const messages: Record<number, string> = { 401: '密钥未通过认证，请检查 API Key。', 403: '当前密钥没有访问该模型的权限。', 404: 'API 路径或模型不存在，请检查地址和模型名称。', 429: '服务限流或额度不足，请稍后重试或检查账户额度。' };
    throw new Error(messages[response.status] || `模型服务返回 ${response.status}，请检查服务状态后重试。`);
  }
  const body = await response.text(); if (body.length > 200000) throw new Error('模型响应过大，请减少输入内容。');
  let data; try { data = JSON.parse(body); } catch { throw new Error('服务返回的内容不是 JSON，请检查 API 地址。'); }
  if (data.choices?.[0]?.finish_reason === 'length') throw new Error('模型输出达到长度上限，请减少所选碎片后重试。');
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('模型没有返回文本，请使用支持 Chat Completions 的模型。');
  return content;
}
export function safeLink(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.toString() : ''; } catch { return ''; } }
