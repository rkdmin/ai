#!/usr/bin/env node
/**
 * 변경된 파일에 저장 시점 검사(`.claude/hooks/check-file.mjs`)를 일괄 적용한다.
 *
 * 그 hook 은 Claude Code 의 PostToolUse 이벤트에 붙어 있어 **Claude Code 안에서만** 동작한다.
 * Codex 등 다른 에이전트나 손으로 편집할 때는 아무것도 검사하지 않으므로, 같은 규칙을
 * 명령 한 줄로 돌릴 수 있게 한다. 검사 로직은 hook 을 그대로 호출해 단일 소스를 유지한다.
 *
 * 무엇을 보나 (hook 과 동일):
 *   - 인코딩 사고: BOM / CRLF / 깨진 글자(mojibake)
 *   - 퍼블리시티권 금지어: 연예인 비교 관련 식별자
 *
 * 사용법:
 *   node scripts/check-files.mjs              # 변경된 파일 (staged + unstaged + untracked)
 *   node scripts/check-files.mjs a.js b.md    # 지정한 파일만
 *   node scripts/check-files.mjs --all        # 저장소의 모든 텍스트 파일
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HOOK = path.join(ROOT, '.claude', 'hooks', 'check-file.mjs');

if (!existsSync(HOOK)) {
  console.error(`검사 hook 이 없습니다: ${HOOK}`);
  process.exit(1);
}

const git = (args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

function targets(argv) {
  const files = argv.filter((a) => !a.startsWith('--'));
  if (files.length) return files;
  if (argv.includes('--all')) return git(['ls-files']);
  // 변경분만: staged + unstaged + untracked. 삭제된 파일은 아래에서 걸러진다.
  return [
    ...new Set([
      ...git(['diff', '--name-only', 'HEAD']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]),
  ];
}

// git 은 상대 경로를 주지만, 손으로 넘길 때는 절대 경로가 편하다. 둘 다 받는다.
const abs = (f) => (path.isAbsolute(f) ? f : path.join(ROOT, f));
const list = targets(process.argv.slice(2)).filter((f) => existsSync(abs(f)));

if (!list.length) {
  console.log('검사할 변경 파일이 없습니다.');
  process.exit(0);
}

let failed = 0;
for (const rel of list) {
  const payload = JSON.stringify({ tool_input: { file_path: abs(rel) } });
  const r = spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' });
  // hook 규약: exit 2 = 차단, stderr 에 사유. 그 외는 통과.
  if (r.status === 2) {
    failed++;
    console.log(`  FAIL  ${rel}`);
    const detail = (r.stderr || '').trim();
    if (detail) console.log(detail.split('\n').map((l) => `        ${l}`).join('\n'));
  }
}

console.log(
  failed
    ? `\n=== ${list.length}개 중 ${failed}개 실패 ===`
    : `=== ${list.length}개 파일 통과 ===`
);
process.exit(failed ? 1 : 0);
