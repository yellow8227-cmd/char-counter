/* index.html 하나를 Artifact 로 올릴 수 있는 형태로 바꿔 준다.
   Artifact 는 <!doctype> · <html> · <head> · <body> 를 자기가 씌우므로
   그 껍데기를 벗기고 <title> · <style> · 본문 · <script> 만 남긴다.

   쓰는 법:  node tools/make-artifact.mjs [나올 파일 경로]
   내용은 index.html 에서만 고친다. 이 파일은 그걸 옮겨 담기만 한다. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..', 'index.html');
const out = resolve(process.argv[2] || resolve(here, '..', 'artifact.html'));

const html = readFileSync(src, 'utf8');

const pick = (re, what) => {
  const m = html.match(re);
  if (!m) throw new Error(what + ' 를 찾지 못했습니다 — index.html 구조가 바뀐 것 같습니다');
  return m[1];
};

const title = pick(/<title>([\s\S]*?)<\/title>/i, '<title>');
const style = pick(/<style>([\s\S]*?)<\/style>/i, '<style>');
const body  = pick(/<body>([\s\S]*?)<\/body>/i, '<body>');

const parts = [
  '<title>' + title + '</title>',
  '<style>' + style + '</style>',
  body.trim()
];

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, parts.join('\n') + '\n', 'utf8');

const kb = (Buffer.byteLength(parts.join('\n'), 'utf8') / 1024).toFixed(1);
console.log('만들었습니다 → ' + out + '  (' + kb + 'KB)');
console.log('제목: ' + title);
