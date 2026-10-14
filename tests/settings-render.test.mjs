// Node 24: node --test tests/settings-render.test.mjs
// Real React SSR checks the published settings UI without browser storage,
// file-system permissions, network requests, or any personal configuration.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {beforeEach,test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const sourceRoot=new URL('../app/',import.meta.url).href;
registerHooks({
 resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&context.parentURL?.startsWith(sourceRoot)){
   const candidate=new URL(specifier,context.parentURL);
   if(!/\.[^/]+$/.test(candidate.pathname))for(const extension of ['.ts','.tsx']){
    const typed=new URL(candidate.href+extension);
    if(existsSync(typed))return {url:typed.href,shortCircuit:true};
   }
  }
  return nextResolve(specifier,context);
 },
 load(url,context,nextLoad){
  if(url.startsWith(sourceRoot)&&/\.tsx?$/.test(url)){
   // Match the public Vite build's compile-time environment substitution.
   const source=readFileSync(new URL(url),'utf8').replaceAll('import.meta.env',"({VITE_STATIC_MODE:'true',BASE_URL:'/growth-evidence-journal/'})");
   const compiled=ts.transpileModule(source,{fileName:fileURLToPath(url),compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
   assert.equal(compiled.diagnostics?.filter(item=>item.category===ts.DiagnosticCategory.Error).length,0);
   return {format:'module',source:compiled.outputText,shortCircuit:true};
  }
  return nextLoad(url,context);
 },
});

const {default:FolderBackupPanel}=await import('../app/components/folder-backup-panel.tsx');
const {default:SettingsPanel}=await import('../app/components/settings-panel.tsx');
const {RepositoryContext}=await import('../app/lib/repository-context.tsx');
const data={version:1,mode:'personal',projects:[],fragments:[],evidence:[],reviews:[]};
const session={identity:{id:'fictional-ssr-user',name:'虚构档案',avatar:'',database:'not-opened-in-ssr',createdAt:'2026-10-14T00:00:00Z'},active:true,security:null,key:null,requests:new AbortController()};
const noOp=()=>{},asyncNoOp=async()=>{};
function render(component,props){return renderToStaticMarkup(React.createElement(RepositoryContext.Provider,{value:session},React.createElement(component,props)));}
function folder(){return render(FolderBackupPanel,{data,workspace:'personal',onFlush:asyncNoOp,onDownload:async()=> '虚构备份生成成功',downloading:false});}
function actions(html){return [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(match=>match[1].replace(/<[^>]+>/g,'').trim());}
function supportedBrowser(){const browser={isSecureContext:true,location:{origin:'https://example.test'},showDirectoryPicker(){throw new Error('SSR must not open a file picker');}};browser.top=browser;return browser;}
beforeEach(()=>{
 globalThis.window=supportedBrowser();
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw new Error('SSR must not read personal browser storage');}});
});

test('unsupported browsers show an explanation and a working download alternative',()=>{
 delete window.showDirectoryPicker;
 const html=folder(),buttons=actions(html);
 assert.match(html,/当前浏览器不支持选择本机文件夹/);
 assert.match(html,/Chrome 或 Edge/);
 assert.match(html,/下载前询问保存位置/);
 assert.ok(buttons.includes('下载完整备份'));
 assert.ok(!buttons.includes('选择保存文件夹'));
 assert.match(html,/下载备份模式/);
});

test('supported browsers render both folder authorization and the download fallback',()=>{
 const html=folder(),buttons=actions(html);
 assert.ok(buttons.includes('选择保存文件夹'));
 assert.ok(buttons.includes('下载完整备份'));
 assert.match(html,/可授权自动备份/);
 assert.match(html,/aria-live="polite"/);
 assert.doesNotMatch(html,/当前浏览器不支持选择本机文件夹/);
});

test('HTTP contexts explain the secure-connection requirement and retain download',()=>{
 window.isSecureContext=false;
 const html=folder(),buttons=actions(html);
 assert.match(html,/HTTPS 安全连接/);
 assert.ok(buttons.includes('下载完整备份'));
 assert.ok(!buttons.includes('选择保存文件夹'));
});

test('cross-origin embedded pages explain how to open a supported standalone tab',()=>{
 window.top={location:{get origin(){throw new DOMException('cross-origin test fixture','SecurityError');}}};
 const html=folder(),buttons=actions(html);
 assert.match(html,/页面嵌在其他网站中/);
 assert.match(html,/独立标签页打开本站/);
 assert.ok(buttons.includes('下载完整备份'));
 assert.ok(!buttons.includes('选择保存文件夹'));
});

test('the real data-and-recovery settings tab integrates the new panel in either browser mode',()=>{
 const props={onLeave:noOp,profile:{name:'虚构档案',avatar:''},onProfile:asyncNoOp,data,workspace:'personal',config:{baseUrl:'',model:'',apiKey:''},onConfig:noOp,appearance:'warm',onAppearance:noOp,density:'comfortable',onDensity:noOp,tab:'data',onTab:noOp,onResume:noOp,onApply:asyncNoOp,onRead:async()=>data,onFlush:asyncNoOp,onUpdate:noOp,onSpace:asyncNoOp};
 const supported=render(SettingsPanel,props);
 assert.match(supported,/本机保存位置/);
 assert.ok(actions(supported).includes('选择保存文件夹'));
 assert.ok(actions(supported).includes('下载完整备份'));
 assert.match(supported,/备份与迁移/);
 assert.match(supported,/预览备份并恢复/);
 assert.match(supported,/自动恢复点/);
 delete window.showDirectoryPicker;
 const unsupported=render(SettingsPanel,props);
 assert.match(unsupported,/当前浏览器使用下载备份/);
 assert.ok(actions(unsupported).includes('下载完整备份'));
 assert.ok(!actions(unsupported).includes('选择保存文件夹'));
});
