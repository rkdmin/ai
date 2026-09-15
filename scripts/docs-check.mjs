#!/usr/bin/env node
/**
 * 문서 검증 — `npm run docs:check`
 *
 * 원칙: **결합이 아니라 주장을 검증한다.**
 * "코드와 문서를 같이 고쳤나" 는 약한 대리 지표다 (파일을 건드리기만 해도 통과한다).
 * 이 스크립트는 문서가 *주장하는 사실* 이 실제와 맞는지만 본다.
 *
 * 검사 목록
 *   1. .claude/rules/ frontmatter 유효성 + paths 글롭이 실제 파일을 잡는가
 *   2. ADR frontmatter 규율 (번호·상태·날짜·중복·모순)
 *   3. 마크다운 상대 링크가 실존 파일을 가리키는가
 *   4. 백틱 경로 참조가 실존하는가
 *   5. 문서가 계약이라 주장하는 API 필드가 백엔드에 실제로 있는가
 *   6. "지금 유효한 상태" 문서의 last-verified 경과일
 *
 * 실패하면 exit 1. CI 와 로컬 품질 게이트에서 같이 쓴다.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
// js-yaml 5.x 는 named export 만 준다 (4.x 의 default export 아님).
import { load as yamlLoad } from 'js-yaml';
import picomatch from 'picomatch';
import { execSync } from 'node:child_process';
import { collect as collectPlans, verify as verifyPlans } from './plans.mjs';

const ROOT = process.cwd();

/** last-verified 가 이 일수를 넘으면 경고. 너무 짧으면 잔소리가 되고, 길면 drift 를 놓친다. */
const STALE_DAYS = 45;

/**
 * 코드와 어긋나면 "문서가 틀린 것" 인 문서들. last-verified 를 요구한다.
 * 결정 기록(`docs/decisions/`)은 여기 넣지 않는다 — append-only 라 낡는 것이 정상이다.
 */
const LIVE_DOCS = [
  // 다른 에이전트(Codex 등)의 유일한 진입점이다. 여기가 낡으면 그 세션 전체가 잘못된 전제로 간다.
  'AGENTS.md',
  // 실행 추적의 단일 출처. 인덱스가 실제 plan 목록과 어긋나면 진행 상황을 못 믿는다.
  'docs/plans/README.md',
  'docs/ui-flow.md',
  'docs/test.md',
  'docs/connection-status.md',
  'docs/ROADMAP.md',
  'docs/auth-setup.md',
  'docs/PHOTO_GUIDE.md',
  // RAG 병합 규칙·우선순위의 단일 진실 소스. 이게 틀리면 카드 추천 전체가 잘못된 전제로 간다.
  'backend/data/rag_usage_guide.md',
];

let fails = 0;
let warns = 0;
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  fails++;
};
const warn = (m) => {
  console.log(`  WARN  ${m}`);
  warns++;
};
const ok = (m) => console.log(`  ok    ${m}`);

const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/** `---\n...\n---` 를 파싱한다. 없으면 fm=null, 닫히지 않았으면 fm=undefined. */
function frontmatter(rel) {
  const text = read(rel);
  if (!text.startsWith('---\n')) return { fm: null, text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { fm: undefined, text };
  return { fm: yamlLoad(text.slice(4, end)), text };
}

const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

// ─── 1. rules frontmatter + paths 글롭 ────────────────────────────
console.log('\n[1] .claude/rules/ — frontmatter 와 paths 글롭');
{
  const dir = path.join(ROOT, '.claude/rules');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  if (files.length === 0) fail('.claude/rules/ 에 규칙 파일이 없다');

  for (const f of files) {
    const rel = `.claude/rules/${f}`;
    let fm;
    try {
      ({ fm } = frontmatter(rel));
    } catch (e) {
      // YAML 이 깨지면 규칙 전체가 조용히 로드되지 않는다 — 가장 위험한 실패다.
      fail(`${f}: YAML 파싱 실패 — ${e.message}`);
      continue;
    }
    if (fm === null) {
      warn(`${f}: frontmatter 없음 → 항상 로드된다 (조건부 로딩 이득 없음)`);
      continue;
    }
    if (fm === undefined) {
      fail(`${f}: frontmatter 를 닫는 --- 가 없다`);
      continue;
    }
    if (!Array.isArray(fm.paths)) {
      fail(`${f}: paths 가 배열이 아니다 — ${JSON.stringify(fm.paths)}`);
      continue;
    }

    const dead = [];
    let total = 0;
    for (const g of fm.paths) {
      if (typeof g !== 'string') {
        fail(`${f}: paths 항목이 문자열이 아니다`);
        continue;
      }
      // 인자를 하나만 넘겨야 한다. `filter(picomatch(g))` 로 쓰면 filter 의 index 가
      // picomatch 의 2번째 인자(returnObject)로 들어가 boolean 대신 객체를 반환하고,
      // 객체는 항상 truthy 라 모든 파일이 매칭된 것처럼 보인다 (죽은 글롭을 못 잡는다).
      const isMatch = picomatch(g);
      const hits = tracked.filter((f) => isMatch(f) === true);
      total += hits.length;
      if (hits.length === 0) dead.push(g);
    }
    if (dead.length) fail(`${f}: 아무 파일도 못 잡는 글롭 → ${dead.join(', ')}`);
    else ok(`${f} — paths ${fm.paths.length}개 / 대상 ${total}개`);
  }
}

// ─── 2. ADR 규율 ──────────────────────────────────────────────────
console.log('\n[2] docs/decisions/ — ADR frontmatter 규율');
{
  const VALID = ['Proposed', 'Accepted', 'Superseded'];
  const dir = path.join(ROOT, 'docs/decisions');
  const adrs = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{4}-/.test(f)) : [];
  const seen = new Set();

  for (const a of adrs) {
    let fm;
    try {
      ({ fm } = frontmatter(`docs/decisions/${a}`));
    } catch (e) {
      fail(`${a}: YAML 파싱 실패 — ${e.message}`);
      continue;
    }
    if (!fm) {
      fail(`${a}: frontmatter 없음`);
      continue;
    }
    const errs = [];
    if (!/^\d{4}$/.test(String(fm.adr))) errs.push(`adr 형식(${fm.adr})`);
    if (!a.startsWith(String(fm.adr))) errs.push('파일명과 adr 불일치');
    if (seen.has(String(fm.adr))) errs.push('adr 번호 중복');
    seen.add(String(fm.adr));
    if (!fm.title) errs.push('title 없음');
    if (!VALID.includes(fm.status)) errs.push(`status 값(${fm.status})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fm.date))) errs.push(`date 형식(${fm.date})`);
    if (!Array.isArray(fm.supersedes)) errs.push('supersedes 배열 아님');
    if (!Array.isArray(fm.superseded_by)) errs.push('superseded_by 배열 아님');
    if (fm.status !== 'Superseded' && fm.superseded_by?.length) {
      errs.push('status 는 Superseded 가 아닌데 superseded_by 가 채워져 있다');
    }
    if (errs.length) fail(`${a}: ${errs.join(', ')}`);
  }
  if (adrs.length) ok(`ADR ${adrs.length}개 검사 완료`);
}

// ─── 2.5 docs/plans/ — plan 규율 ──────────────────────────────────
console.log('\n[2.5] docs/plans/ — plan 규율과 진행률');
{
  const plans = collectPlans();
  if (!plans.length) {
    ok('plan 없음 — 건너뜀');
  } else {
    for (const m of verifyPlans(plans)) fail(m);
    const t = plans.reduce(
      (a, p) => ({ done: a.done + p.done, total: a.total + p.total, cancelled: a.cancelled + p.cancelled }),
      { done: 0, total: 0, cancelled: 0 }
    );
    const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
    ok(`plan ${plans.length}개 · 항목 ${t.done}/${t.total} (${pct}%)` +
       (t.cancelled ? ` · 취소 ${t.cancelled}` : ''));
  }
}

// ─── 3. 상대 링크 실존 ─────────────────────────────────────────────
console.log('\n[3] 마크다운 상대 링크');
{
  const targets = [
    'CLAUDE.md',
    'AGENTS.md',
    'docs/README.md',
    'docs/decisions/README.md',
    'docs/plans/README.md',
    'docs/ROADMAP.md',
    'docs/connection-status.md',
    'docs/test.md',
    '.claude/rules/frontend.md',
    '.claude/rules/backend.md',
    '.claude/rules/api-contract.md',
  ].filter((f) => existsSync(path.join(ROOT, f)));

  let n = 0;
  for (const f of targets) {
    const dir = path.dirname(path.join(ROOT, f));
    for (const m of read(f).matchAll(/\]\((\.[^)#\s]+)\)/g)) {
      n++;
      if (!existsSync(path.resolve(dir, m[1]))) fail(`${f} → ${m[1]} (없음)`);
    }
  }
  ok(`상대 링크 ${n}개 검사 완료`);
}

// ─── 4. 백틱 경로 참조 실존 ────────────────────────────────────────
console.log('\n[4] 백틱 안 경로 참조');
{
  const targets = [
    'CLAUDE.md',
    'AGENTS.md',
    '.claude/rules/frontend.md',
    '.claude/rules/backend.md',
    '.claude/rules/api-contract.md',
    'docs/connection-status.md',
  ].filter((f) => existsSync(path.join(ROOT, f)));

  const RE = /`([a-zA-Z0-9_./-]+\.(?:md|mjs|json|py|jsx?|css|sql))`/g;
  let n = 0;
  for (const f of targets) {
    const base = path.dirname(path.join(ROOT, f));
    for (const m of read(f).matchAll(RE)) {
      const p = m[1];
      if (!p.includes('/')) continue; // 단순 파일명 언급은 건너뛴다
      if (p.startsWith('.env')) continue;
      n++;
      const cands = [path.join(ROOT, p), path.resolve(base, p)];
      if (!cands.some(existsSync)) fail(`${f} 안의 \`${p}\` 가 실존하지 않는다`);
    }
  }
  ok(`경로 참조 ${n}개 검사 완료`);
}

// ─── 5. 문서가 주장하는 API 필드가 백엔드에 있는가 ──────────────────
console.log('\n[5] api-contract.md 가 주장하는 필드 vs 백엔드 실제');
{
  const doc = '.claude/rules/api-contract.md';
  if (!existsSync(path.join(ROOT, doc))) {
    warn(`${doc} 가 없어 건너뛴다`);
  } else {
    // 백엔드 소스 전체 (스키마·프롬프트·카드 포맷이 모두 여기 있다)
    const corpus = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '.venv' || e.name === '__pycache__') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(py|sql)$/.test(e.name)) corpus.push(readFileSync(p, 'utf8'));
      }
    };
    walk(path.join(ROOT, 'backend'));
    const backend = corpus.join('\n');

    const text = read(doc);
    const lines = text.split('\n');

    // 각 ```json 블록이 속한 최근 ## 제목을 기억한다.
    // 제목에 "미구현" 이 있으면 아직 계획 단계이므로 검사에서 뺀다.
    let heading = '';
    let inBlock = false;
    let blockSkipped = false;
    const claimed = new Set();

    for (const line of lines) {
      if (line.startsWith('#')) heading = line;
      if (line.trim().startsWith('```json')) {
        inBlock = true;
        blockSkipped = /미구현|계획|예정/.test(heading);
        continue;
      }
      if (inBlock && line.trim().startsWith('```')) {
        inBlock = false;
        continue;
      }
      if (inBlock && !blockSkipped) {
        for (const m of line.matchAll(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g)) claimed.add(m[1]);
      }
    }

    const missing = [...claimed].filter(
      (f) => !backend.includes(`"${f}"`) && !backend.includes(`'${f}'`) && !backend.includes(`${f}:`),
    );

    if (missing.length) {
      fail(
        `백엔드에 없는 필드를 계약으로 서술 중: ${missing.join(', ')}\n` +
          '        → 구현하거나, 해당 절 제목에 "미구현" 을 넣어 계획임을 명시하라.',
      );
    } else {
      ok(`주장 필드 ${claimed.size}개 전부 백엔드에 존재`);
    }
  }
}

// ─── 6. 낡음 (last-verified) ──────────────────────────────────────
console.log('\n[6] "지금 유효한 상태" 문서의 last-verified');
{
  const now = new Date();

  for (const rel of LIVE_DOCS) {
    if (!existsSync(path.join(ROOT, rel))) {
      fail(`${rel} 가 없다 (LIVE_DOCS 목록과 실제가 어긋남)`);
      continue;
    }
    let fm;
    try {
      ({ fm } = frontmatter(rel));
    } catch {
      fm = null;
    }
    const stamp = fm?.['last-verified'];
    if (!stamp) {
      fail(`${rel}: last-verified frontmatter 가 없다`);
      continue;
    }
    const d = new Date(String(stamp));
    if (Number.isNaN(d.getTime())) {
      fail(`${rel}: last-verified 날짜 형식이 잘못됐다 — ${stamp}`);
      continue;
    }
    const days = Math.floor((now - d) / 86400000);
    if (days > STALE_DAYS) {
      warn(`${rel}: ${days}일 경과 (기준 ${STALE_DAYS}일) — 코드와 대조 후 날짜를 갱신하라`);
    } else {
      ok(`${rel} — ${days}일 경과`);
    }
  }
}

// ─── 결과 ─────────────────────────────────────────────────────────
console.log('');
if (fails === 0 && warns === 0) console.log('=== 전부 통과 ===');
else console.log(`=== 실패 ${fails}건 / 경고 ${warns}건 ===`);

process.exit(fails === 0 ? 0 : 1);
