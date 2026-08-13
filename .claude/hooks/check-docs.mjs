#!/usr/bin/env node
/**
 * Stop hook — 작업을 끝내기 전에 문서가 아직 *사실인지* 검증한다.
 *
 * `scripts/docs-check.mjs` 를 그대로 돌린다. 검사 엔진은 하나이고 진입점만 둘이다
 * (`npm run docs:check` = 수동, 이 hook = 자동).
 *
 * 이전에는 "코드와 문서를 같이 건드렸나" 라는 결합 검사를 했다. 그건 파일을 건드리기만 해도
 * 통과하는 약한 대리 지표였다 — 공백 한 줄이면 뚫렸다. 게다가 자동으로 도는 쪽이 약한 검사이고
 * 강한 검사는 사람이 명령을 기억해야 도는 구조였다. 그래서 뒤집었다.
 *
 * 차단 기준:
 *   FAIL 있음 → exit 2 (죽은 링크, 유령 API 필드, YAML 오류, ADR 규율 위반 — 객관적 오류다)
 *   WARN 만   → exit 0 (last-verified 경과는 "점검이 필요하다" 는 알림이지 오류가 아니다)
 *
 * 같은 실패로는 한 번만 막는다. 그러지 않으면 커밋 전까지 매 턴 걸려 소음이 된다.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.resolve(HERE, '../../scripts/docs-check.mjs');
const ACK_PATH = path.resolve(HERE, '../.docs-check-ack');

const readAck = () => {
  try {
    return readFileSync(ACK_PATH, 'utf8');
  } catch {
    return null;
  }
};
const writeAck = (v) => {
  try {
    writeFileSync(ACK_PATH, v, 'utf8');
  } catch {
    /* 못 써도 검사는 계속한다 — 다음 턴에 한 번 더 알리는 정도의 손해다 */
  }
};
const clearAck = () => {
  try {
    if (existsSync(ACK_PATH)) unlinkSync(ACK_PATH);
  } catch {
    /* 무시 */
  }
};

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

// 이 hook 때문에 이미 한 번 멈춘 상태면 다시 막지 않는다 (무한 루프 방지).
if (payload.stop_hook_active) process.exit(0);

if (!existsSync(CHECKER)) process.exit(0); // 검사기가 없으면 조용히 통과

let output = '';
let failed = false;
try {
  output = execFileSync(process.execPath, [CHECKER], {
    encoding: 'utf8',
    cwd: path.resolve(HERE, '../..'),
  });
} catch (e) {
  failed = true;
  output = `${e.stdout || ''}${e.stderr || ''}`;
}

if (!failed) {
  clearAck(); // 통과했으면 기억을 지운다 — 다음에 깨지면 다시 알려야 한다
  process.exit(0);
}

const failLines = output
  .split('\n')
  .filter((l) => l.includes('FAIL'))
  .map((l) => l.trim());

const fingerprint = failLines.join('\n');
if (readAck() === fingerprint) process.exit(0); // 같은 실패로는 다시 막지 않는다
writeAck(fingerprint);

console.error(
  '[docs-check] 문서가 코드와 어긋났습니다:\n' +
    failLines.map((l) => `- ${l.replace(/^FAIL\s+/, '')}`).join('\n') +
    '\n\n`npm run docs:check` 로 전체 출력을 볼 수 있습니다. ' +
    '고칠 내용이면 지금 고치고, 고칠 필요가 없다고 판단하면 이유를 한 줄로 답하고 종료하세요. ' +
    '같은 실패로는 다시 막지 않습니다.',
);
process.exit(2);
