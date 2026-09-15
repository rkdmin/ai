#!/usr/bin/env node
/**
 * docs/plans/ 집계 + 규율 검사.
 *
 * 두 가지를 한다:
 *   1) plan 별 체크 현황을 센다 (취소 항목은 분모에서 뺀다)
 *   2) 규율을 검사한다 — frontmatter 유효성, 번호/파일명 일치, 인덱스 등록,
 *      status 와 체크 상태의 정합성
 *
 * `scripts/docs-check.mjs` 가 이 모듈의 collect()/verify() 를 가져다 쓴다.
 * 단독 실행하면 사람이 읽는 표를 출력한다: `npm run plans:progress`
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { load as yamlLoad } from 'js-yaml';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'docs', 'plans');
const STATUSES = ['Proposed', 'In Progress', 'Done', 'Cancelled'];

/** `- [x] 내용` / `- [ ] ~~내용~~ — 취소: 이유` 를 구분한다. */
const ITEM = /^\s*- \[([ x])\]\s*(.*)$/;

function parse(file) {
  const raw = readFileSync(path.join(DIR, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  let fm = null;
  try {
    fm = m ? yamlLoad(m[1]) : null;
  } catch {
    fm = null;
  }

  let done = 0;
  let open = 0;
  let cancelled = 0;
  for (const line of raw.split('\n')) {
    const im = line.match(ITEM);
    if (!im) continue;
    // 취소는 체크 여부와 무관하게 취소선으로 판정한다 — 분모에서 뺀다.
    if (/~~.+~~/.test(im[2])) cancelled++;
    else if (im[1] === 'x') done++;
    else open++;
  }
  return { file, fm, raw, done, open, cancelled, total: done + open };
}

export function collect() {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort()
    .map(parse);
}

/** 규율 위반 목록을 돌려준다. 빈 배열이면 통과. */
export function verify(plans) {
  const problems = [];
  const indexPath = path.join(DIR, 'README.md');
  const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  const seen = new Map();

  for (const p of plans) {
    const num = p.file.slice(0, 4);
    if (!p.fm) {
      problems.push(`${p.file} — frontmatter 가 없거나 YAML 이 깨졌습니다`);
      continue;
    }
    if (p.fm.plan !== num) {
      problems.push(`${p.file} — frontmatter plan("${p.fm.plan}") 이 파일명 번호(${num})와 다릅니다`);
    }
    if (!STATUSES.includes(p.fm.status)) {
      problems.push(`${p.file} — status "${p.fm.status}" 는 허용되지 않습니다 (${STATUSES.join(' | ')})`);
    }
    if (seen.has(num)) problems.push(`${p.file} — 번호 ${num} 가 ${seen.get(num)} 와 중복입니다`);
    seen.set(num, p.file);

    if (index && !index.includes(`](./${p.file})`)) {
      problems.push(`${p.file} — plans/README.md 인덱스 표에 없습니다`);
    }

    // 근거 ADR 실존 확인
    for (const a of p.fm.adr || []) {
      const hit = readdirSync(path.join(ROOT, 'docs', 'decisions')).some((f) => f.startsWith(`${a}-`));
      if (!hit) problems.push(`${p.file} — 근거 ADR ${a} 가 docs/decisions/ 에 없습니다`);
    }

    // status 와 체크 상태의 정합성 — 문서가 스스로를 배신하지 않게 한다
    const allDone = p.total > 0 && p.open === 0;
    if (allDone && p.fm.status === 'In Progress') {
      problems.push(`${p.file} — 남은 항목이 없는데 status 가 In Progress 입니다 (Done?)`);
    }
    if (p.open > 0 && p.fm.status === 'Done') {
      problems.push(`${p.file} — status 가 Done 인데 남은 항목이 ${p.open}개입니다`);
    }
  }
  return problems;
}

export function bar(done, total, width = 20) {
  if (!total) return '─'.repeat(width);
  const n = Math.round((done / total) * width);
  return '█'.repeat(n) + '░'.repeat(width - n);
}

// ── 단독 실행: 사람이 읽는 표 ──────────────────────────────────────
// Windows 경로(C:\...)는 수동 조립으로 file:// URL 이 맞지 않는다. pathToFileURL 로 비교한다.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plans = collect();
  if (!plans.length) {
    console.log('docs/plans/ 에 plan 이 없습니다.');
    process.exit(0);
  }

  console.log('\nPlan 진행 현황\n');
  for (const p of plans) {
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    const title = (p.fm?.title || p.file).slice(0, 34).padEnd(34);
    const phase = p.fm?.phase == null ? ' — ' : ` ${p.fm.phase} `;
    console.log(
      `  ${p.file.slice(0, 4)}  ${title} P${phase} ${bar(p.done, p.total)} ` +
        `${String(pct).padStart(3)}%  ${p.done}/${p.total}` +
        (p.cancelled ? `  (취소 ${p.cancelled})` : '') +
        `  ${p.fm?.status ?? '?'}`
    );
  }

  const t = plans.reduce(
    (a, p) => ({ done: a.done + p.done, total: a.total + p.total, cancelled: a.cancelled + p.cancelled }),
    { done: 0, total: 0, cancelled: 0 }
  );
  const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
  console.log(`\n  전체  ${bar(t.done, t.total)} ${pct}%  ${t.done}/${t.total} (취소 ${t.cancelled})\n`);

  const problems = verify(plans);
  if (problems.length) {
    console.log('규율 위반:');
    for (const m of problems) console.log(`  FAIL  ${m}`);
    process.exit(1);
  }
  console.log('=== plan 규율 통과 ===\n');
}
