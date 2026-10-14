type BackupFile = Pick<File, 'size' | 'name' | 'text'>;

/** Read the exported JSON once; decodeBackup remains responsible for validation. */
export async function readBackupFile(file: BackupFile, onProgress?: (message: string) => void): Promise<unknown> {
 if (file.size === 0) throw new Error('备份文件为空，请重新选择已导出的完整备份。');
 const large = file.size > 50 * 1024 * 1024;
 const size = (file.size / 1024 / 1024).toFixed(file.size >= 1024 * 1024 ? 1 : 2);
 onProgress?.(`正在读取备份（${size} MB）${large ? '，包含附件的大备份可能需要一些时间，请保持页面打开。' : '…'}`);
 let text: string;
 try {
  text = await file.text();
 } catch {
  throw new Error('无法读取备份文件，请确认文件仍在原位置且有读取权限后重试。');
 }
 if (!text.trim()) throw new Error('备份文件没有内容，请重新选择已导出的完整备份。');
 onProgress?.('正在解析备份，随后将校验数据与附件…');
 // Let the progress update paint before parsing a large JSON document. Avoid
 // copying or re-serializing attachment data just to inspect the file size.
 if (large) await new Promise<void>(resolve => setTimeout(resolve, 0));
 try {
  return JSON.parse(text) as unknown;
 } catch {
  throw new Error('备份文件不是有效的 JSON，请选择通过“下载完整备份”导出的文件。');
 }
}
