// Run with Node 24: node --test tests/backup-file.test.mjs
// Load the production TypeScript modules in memory. The fixtures use fresh
// synthetic records only; no IndexedDB, personal profiles, files, or keys.
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import ts from 'typescript';

const libRoot = new URL('../app/lib/', import.meta.url).href;
registerHooks({
 resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith(libRoot) && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
   const resolved = new URL(`${specifier}.ts`, context.parentURL);
   if (existsSync(resolved)) return {url: resolved.href, shortCircuit: true};
  }
  return nextResolve(specifier, context);
 },
 load(url, context, nextLoad) {
  if (url.startsWith(libRoot) && url.endsWith('.ts')) {
   const {outputText, diagnostics} = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext},
    reportDiagnostics: true,
   });
   assert.equal(diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
   return {format: 'module', source: outputText, shortCircuit: true};
  }
  return nextLoad(url, context);
 },
});

const {readBackupFile} = await import('../app/lib/backup-file.ts');
const {backupBundle, decodeBackup} = await import('../app/lib/repository.ts');
const {emptyStore, validateStore} = await import('../app/lib/data.ts');
const {newProtection, passwordKey} = await import('../app/lib/local-crypto.ts');
const fixtureStore = () => ({...emptyStore(), fragments: [{
 id: 'synthetic-record', date: '2026-10-14', project: '', category: '日常工作',
 text: '完成合成测试文档归档。', link: '', createdAt: '2026-10-14T00:00:00.000Z',
}]});

test('a valid exported attachment backup above 50 MiB can be read, decoded, and validated', async t => {
 const store = fixtureStore();
 // Four 9.5 MiB attachments remain below the per-attachment 10 MiB limit,
 // but their real Base64-encoded JSON exceeds the old 50 MiB restore limit.
 const attachmentBytes = 9.5 * 1024 * 1024;
 const encoded = `${'A'.repeat(Math.floor(attachmentBytes / 3) * 4)}AAA=`;
 store.fragments[0].attachments = Array.from({length: 4}, (_, index) => ({
  id: `synthetic-attachment-${index}`, name: `synthetic-${index}.txt`,
  type: 'text/plain', size: attachmentBytes, data: `data:text/plain;base64,${encoded}`,
 }));
 assert.equal(Buffer.from(encoded, 'base64').byteLength, attachmentBytes);
 let bundle = await backupBundle('personal', store);
 let json = JSON.stringify(bundle);
 bundle = null;
 const file = new File([json], 'synthetic-large-backup.json', {type: 'application/json'});
 json = '';
 assert.ok(file.size > 50 * 1024 * 1024);
 t.diagnostic(`Actual exported JSON: ${file.size.toLocaleString('en-US')} bytes (${(file.size / 1024 / 1024).toFixed(3)} MiB); 4 × ${(attachmentBytes / 1024 / 1024).toFixed(1)} MiB attachments.`);
 const progress = [];
 const restored = await decodeBackup(await readBackupFile(file, message => progress.push(message)));
 assert.equal(validateStore(restored).fragments[0].attachments.length, 4);
 for (const attachment of restored.fragments[0].attachments) {
  assert.equal(attachment.size, attachmentBytes);
  assert.equal(attachment.data, `data:text/plain;base64,${encoded}`);
 }
 assert.match(progress[0], /大备份.*时间/);
 assert.match(progress.at(-1), /解析/);
});

test('a small encrypted export survives file reading and real decryption', async () => {
 const store = fixtureStore();
 const password = 'synthetic-only-backup-password';
 const security = newProtection();
 const key = await passwordKey(password, security);
 const bundle = await backupBundle('personal', store, {security, key});
 const file = new File([JSON.stringify(bundle)], 'synthetic-encrypted-backup.json');
 const parsed = await readBackupFile(file);
 assert.deepEqual(await decodeBackup(parsed, password), validateStore(store));
 await assert.rejects(decodeBackup(parsed, 'different-test-password'), /口令不正确/);
});

test('progress is emitted before file I/O and parsing does not alter exported data', async () => {
 const events = [];
 const bundle = await backupBundle('personal', fixtureStore());
 const text = JSON.stringify(bundle);
 const parsed = await readBackupFile({name: 'synthetic.json', size: text.length, async text() {
  events.push('read');
  return text;
 }}, message => events.push(message));
 assert.match(events[0], /正在读取/);
 assert.equal(events[1], 'read');
 assert.deepEqual(parsed, bundle);
});

test('empty, unreadable, and malformed files give actionable errors', async () => {
 await assert.rejects(readBackupFile(new File([], 'empty.json')), /文件为空/);
 await assert.rejects(readBackupFile(new File([' \n\t'], 'blank.json')), /没有内容/);
 await assert.rejects(readBackupFile(new File(['{"data":'], 'broken.json')), /不是有效的 JSON/);
 await assert.rejects(readBackupFile({name: 'missing.json', size: 10, async text() {
  throw new DOMException('Cannot read', 'NotReadableError');
 }}), /无法读取.*读取权限/);
});

test('valid JSON with an invalid backup structure still fails production validation', async () => {
 const parsed = await readBackupFile(new File(['{"unrelated":true}'], 'wrong.json'));
 await assert.rejects(decodeBackup(parsed), /备份格式不正确/);
});
