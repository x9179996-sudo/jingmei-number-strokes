/**
 * tests/selftest.js
 * 數字筆順冒險學習網頁 — 自動化單元測試（含擬真筆跡變形與位置錨定）
 * 執行方式：node tests/selftest.js
 */

const path = require('path');
const StrokeEngine = require('../engine/stroke-engine.js');
const GLYPHS_DIGITS = require('../data/glyphs-digits.js');
const GLYPHS_HANZI = require('../data/glyphs-hanzi.js');

const { StrokeMath, StrokeEvaluator, StrokeSession, SolitaireGenerator } = StrokeEngine;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

// 確定性偽隨機數產生器（固定種子）
function createSeededRandom(seed = 42) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('====================================================');
console.log('   數字筆順冒險學習網頁 — 引擎與字形自動測試 (Self-Test)');
console.log('====================================================\n');

const allGlyphs = [
  ...Object.values(GLYPHS_DIGITS),
  ...Object.values(GLYPHS_HANZI)
];

// ----------------------------------------------------
// 測試 1：標準中線輸入驗證（數字 0-10 與 國字 一～十）
// ----------------------------------------------------
console.log('【測試 1】標準中線輸入驗證（數字 0-10 與 國字 一～十）');
let stdPassCount = 0;
let stdTotalStrokes = 0;

for (const glyph of allGlyphs) {
  for (const stroke of glyph.strokes) {
    stdTotalStrokes++;
    const resStandard = StrokeEvaluator.evaluate(stroke.points, stroke, { mode: 'standard' });
    const resLoose = StrokeEvaluator.evaluate(stroke.points, stroke, { mode: 'loose' });

    const ok = resStandard.success && resLoose.success;
    assert(ok, `${glyph.character} 第 ${stroke.index + 1} 筆（${stroke.name}）標準中線輸入應通過`);
    if (ok) stdPassCount++;
  }
}
console.log(`  -> 共驗證 ${stdTotalStrokes} 個筆畫，通過：${stdPassCount}/${stdTotalStrokes}\n`);

// ----------------------------------------------------
// 測試 2：每一筆反方向輸入 → 全部判錯
// ----------------------------------------------------
console.log('【測試 2】反方向輸入驗證（每一筆倒轉輸入均應判錯）');
let revFailCount = 0;
let revTotalStrokes = 0;

for (const glyph of allGlyphs) {
  for (const stroke of glyph.strokes) {
    revTotalStrokes++;
    const reversedPoints = stroke.points.slice().reverse();
    const res = StrokeEvaluator.evaluate(reversedPoints, stroke, { mode: 'loose' });

    const correctlyRejected = (!res.success);
    assert(correctlyRejected, `${glyph.character} 第 ${stroke.index + 1} 筆（${stroke.name}）反方向輸入未被判錯`);
    if (correctlyRejected) revFailCount++;
  }
}
console.log(`  -> 共驗證 ${revTotalStrokes} 個筆畫反轉，正確判定錯誤：${revFailCount}/${revTotalStrokes}\n`);

// ----------------------------------------------------
// 測試 3：筆順對調測試（4, 5, 7, 10 與 國字 四, 五, 六, 九）
// ----------------------------------------------------
console.log('【測試 3】筆順對調驗證（多筆畫字故意先寫第 2 筆）');
const swapTargets = [
  { glyph: GLYPHS_DIGITS['4'], name: '數字 4' },
  { glyph: GLYPHS_DIGITS['5'], name: '數字 5' },
  { glyph: GLYPHS_DIGITS['7'], name: '數字 7' },
  { glyph: GLYPHS_DIGITS['10'], name: '數字 10' },
  { glyph: GLYPHS_HANZI['四'], name: '國字 四' },
  { glyph: GLYPHS_HANZI['五'], name: '國字 五' },
  { glyph: GLYPHS_HANZI['六'], name: '國字 六' },
  { glyph: GLYPHS_HANZI['九'], name: '國字 九' }
];

let swapPassCount = 0;
for (const target of swapTargets) {
  const session = new StrokeSession(target.glyph, { mode: 'loose' });
  const wrongStrokePoints = target.glyph.strokes[1].points;
  const res = session.submitStroke(wrongStrokePoints);

  const correctlyRejected = (!res.success);
  assert(correctlyRejected, `${target.name} 筆順對調（先寫第2筆）應被判錯`);
  if (correctlyRejected) swapPassCount++;
}
console.log(`  -> 共驗證 ${swapTargets.length} 個字筆順對調，正確判定錯誤：${swapPassCount}/${swapTargets.length}\n`);

// ----------------------------------------------------
// 測試 4：起點偏移格寬 25% → 判錯
// ----------------------------------------------------
console.log('【測試 4】起點偏移格寬 25% 驗證（超過 18% / 22% 門檻均應判錯）');
let offsetFailCount = 0;
let offsetTotalCount = 0;

for (const glyph of allGlyphs) {
  for (const stroke of glyph.strokes) {
    offsetTotalCount++;
    const shiftedPoints = stroke.points.map(([x, y]) => [x + 25, y]);
    const res = StrokeEvaluator.evaluate(shiftedPoints, stroke, { mode: 'loose' });

    const correctlyRejected = (!res.success && res.errorType === 'START_OFFSET');
    assert(correctlyRejected, `${glyph.character} 第 ${stroke.index + 1} 筆起點偏移 25% 應被判錯`);
    if (correctlyRejected) offsetFailCount++;
  }
}
console.log(`  -> 共驗證 ${offsetTotalCount} 個筆畫起點偏移，正確判定錯誤：${offsetFailCount}/${offsetTotalCount}\n`);

// ----------------------------------------------------
// 測試 5：擬真筆跡測試（平滑、加密每段 10 點、變形各跑 20 次）
// ----------------------------------------------------
console.log('【測試 5】擬真筆跡測試（加密 10 點、固定亂數種子，每種變形各跑 20 次）');

const NUM_RUNS = 20;

// 5-1. 每點隨機抖動 ±3（寬鬆模式全部判對）
console.log('  5-1. 每點隨機抖動 ±3');
const rndJitter = createSeededRandom(1001);
let jitterPassCount = 0;
let jitterTotal = 0;

for (let r = 0; r < NUM_RUNS; r++) {
  for (const glyph of allGlyphs) {
    for (const stroke of glyph.strokes) {
      jitterTotal++;
      const densified = StrokeMath.smoothPath(stroke.points, 10);
      const jittered = densified.map(([x, y]) => {
        const jx = (rndJitter() * 6) - 3;
        const jy = (rndJitter() * 6) - 3;
        return [x + jx, y + jy];
      });

      const res = StrokeEvaluator.evaluate(jittered, stroke, { mode: 'loose' });
      assert(res.success, `${glyph.character} 第 ${stroke.index + 1} 筆抖動 ±3（第 ${r + 1} 次）應判對`);
      if (res.success) jitterPassCount++;
    }
  }
}
console.log(`       -> 抖動 ±3 測試 ${jitterTotal} 次，全數通過：${jitterPassCount}/${jitterTotal}`);

// 5-2. 以格子中心 [50, 50] 縮小到 85%（寬鬆模式全部判對）
console.log('  5-2. 格子中心縮小到 85%');
let scale85PassCount = 0;
let scale85Total = 0;

for (let r = 0; r < NUM_RUNS; r++) {
  for (const glyph of allGlyphs) {
    for (const stroke of glyph.strokes) {
      scale85Total++;
      const densified = StrokeMath.smoothPath(stroke.points, 10);
      const scaled = densified.map(([x, y]) => [
        50 + 0.85 * (x - 50),
        50 + 0.85 * (y - 50)
      ]);

      const res = StrokeEvaluator.evaluate(scaled, stroke, { mode: 'loose' });
      assert(res.success, `${glyph.character} 第 ${stroke.index + 1} 筆縮小 85%（第 ${r + 1} 次）應判對`);
      if (res.success) scale85PassCount++;
    }
  }
}
console.log(`       -> 縮小 85% 測試 ${scale85Total} 次，全數通過：${scale85PassCount}/${scale85Total}`);

// 5-3. 以格子中心 [50, 50] 縮小到 75%（寬鬆模式全部判對）
console.log('  5-3. 格子中心縮小到 75%');
let scale75PassCount = 0;
let scale75Total = 0;

for (let r = 0; r < NUM_RUNS; r++) {
  for (const glyph of allGlyphs) {
    for (const stroke of glyph.strokes) {
      scale75Total++;
      const densified = StrokeMath.smoothPath(stroke.points, 10);
      const scaled = densified.map(([x, y]) => [
        50 + 0.75 * (x - 50),
        50 + 0.75 * (y - 50)
      ]);

      const res = StrokeEvaluator.evaluate(scaled, stroke, { mode: 'loose' });
      assert(res.success, `${glyph.character} 第 ${stroke.index + 1} 筆縮小 75%（第 ${r + 1} 次）應判對`);
      if (res.success) scale75PassCount++;
    }
  }
}
console.log(`       -> 縮小 75% 測試 ${scale75Total} 次，全數通過：${scale75PassCount}/${scale75Total}`);

// 5-4. 整個往右平移 10（寬鬆模式全部判對）
console.log('  5-4. 整個往右平移 10');
let shift10PassCount = 0;
let shift10Total = 0;

for (let r = 0; r < NUM_RUNS; r++) {
  for (const glyph of allGlyphs) {
    for (const stroke of glyph.strokes) {
      shift10Total++;
      const densified = StrokeMath.smoothPath(stroke.points, 10);
      const shifted = densified.map(([x, y]) => [x + 10, y]);

      const res = StrokeEvaluator.evaluate(shifted, stroke, { mode: 'loose' });
      assert(res.success, `${glyph.character} 第 ${stroke.index + 1} 筆往右平移 10（第 ${r + 1} 次）應判對`);
      if (res.success) shift10PassCount++;
    }
  }
}
console.log(`       -> 往右平移 10 測試 ${shift10Total} 次，全數通過：${shift10PassCount}/${shift10Total}`);

// 5-5. 「寫」模式＋位置錨定：整個字往右下平移 15（寬鬆模式全部判對）
console.log('  5-5. 「寫」模式＋位置錨定（整個字往右下平移 15）');
let writeAnchorPassCount = 0;
let writeAnchorTotal = 0;

for (let r = 0; r < NUM_RUNS; r++) {
  for (const glyph of allGlyphs) {
    const session = new StrokeSession(glyph, { mode: 'loose', isWriteMode: true });

    for (const stroke of glyph.strokes) {
      writeAnchorTotal++;
      const densified = StrokeMath.smoothPath(stroke.points, 10);
      const shifted = densified.map(([x, y]) => [x + 15, y + 15]);

      const res = session.submitStroke(shifted);
      assert(res.success, `${glyph.character} 第 ${stroke.index + 1} 筆寫模式錨定平移 15 應判對`);
      if (res.success) writeAnchorPassCount++;
    }
    assert(session.isComplete(), `${glyph.character} 寫模式全字應順利完成`);
  }
}
console.log(`       -> 「寫」模式錨定平移 15 測試 ${writeAnchorTotal} 筆，全數通過：${writeAnchorPassCount}/${writeAnchorTotal}\n`);

// ----------------------------------------------------
// 測試 6：數字接龍隨機出 200 題驗證
// ----------------------------------------------------
console.log('【測試 6】數字接龍隨機出 200 題全面檢核');
let solitaireValidCount = 0;
let ascCount = 0;
let descCount = 0;

for (let i = 0; i < 200; i++) {
  const dir = (i % 2 === 0) ? 'asc' : 'desc';
  const q = SolitaireGenerator.generateRandomQuestion({
    direction: dir,
    length: (i % 3) + 5,
    blanks: (i % 2) + 1
  });

  if (dir === 'asc') ascCount++;
  else descCount++;

  let isValid = true;
  for (const ans of q.answers) {
    if (typeof ans !== 'number' || ans < 0 || ans > 10 || !Number.isInteger(ans)) isValid = false;
  }
  for (const num of q.fullSequence) {
    if (typeof num !== 'number' || num < 0 || num > 10 || !Number.isInteger(num)) isValid = false;
  }
  for (let j = 1; j < q.fullSequence.length; j++) {
    if (dir === 'asc') {
      if (q.fullSequence[j] <= q.fullSequence[j - 1]) isValid = false;
    } else {
      if (q.fullSequence[j] >= q.fullSequence[j - 1]) isValid = false;
    }
  }
  for (let b = 0; b < q.blankIndices.length; b++) {
    const idx = q.blankIndices[b];
    if (q.sequence[idx] !== null) isValid = false;
    if (q.answers[b] !== q.fullSequence[idx]) isValid = false;
  }

  assert(isValid, `接龍第 ${i + 1} 題（${dir}）格式與數序必須合規`);
  if (isValid) solitaireValidCount++;
}
console.log(`  -> 隨機產生 200 題（遞增 ${ascCount} 題，遞減 ${descCount} 題），全數合規：${solitaireValidCount}/200\n`);

// ----------------------------------------------------
// 測試 7：新增「錯誤筆畫要判錯」測試（寬鬆模式下必須判錯）
// ----------------------------------------------------
console.log('【測試 7】典型錯誤筆畫判錯驗證（寬鬆模式下必須判錯）');
const negativeCases = [
  { name: '7 第 1 筆（小豎寫成往右）', stroke: GLYPHS_DIGITS['7'].strokes[0], points: [[28,18],[40,18],[50,18]] },
  { name: '六 第 1 筆（點寫成橫）', stroke: GLYPHS_HANZI['六'].strokes[0], points: [[50,12],[60,14],[70,16]] },
  { name: '八 第 2 筆（捺寫成往左下）', stroke: GLYPHS_HANZI['八'].strokes[1], points: [[56,28],[50,50],[44,80]] },
  { name: '2 第 1 筆（沒有上面的彎）', stroke: GLYPHS_DIGITS['2'].strokes[0], points: [[30,32],[40,50],[50,70],[60,85],[72,85]] },
  { name: '3 第 1 筆（寫成「>」）', stroke: GLYPHS_DIGITS['3'].strokes[0], points: [[30,25],[50,40],[70,55],[50,70],[30,85]] },
  { name: '0 第 1 筆（沒有封口）', stroke: GLYPHS_DIGITS['0'].strokes[0], points: [[50,15],[30,30],[30,70],[50,85],[70,70],[70,50]] },
  { name: '9 第 1 筆（只寫直線，沒有圈）', stroke: GLYPHS_DIGITS['9'].strokes[0], points: [[68,28],[68,85]] },
  { name: '6 第 1 筆（只寫斜線，沒有圈）', stroke: GLYPHS_DIGITS['6'].strokes[0], points: [[60,20],[40,50],[35,85]] }
];

let negFailCount = 0;
for (const nc of negativeCases) {
  const res = StrokeEvaluator.evaluate(nc.points, nc.stroke, { mode: 'loose' });
  const correctlyRejected = (!res.success);
  assert(correctlyRejected, `${nc.name} 在寬鬆模式下必須判錯（實測: ${res.success ? '誤判通過' : res.errorType}）`);
  if (correctlyRejected) negFailCount++;
}
console.log(`  -> 共驗證 ${negativeCases.length} 個典型錯誤筆畫，全數正確判定錯誤：${negFailCount}/${negativeCases.length}\n`);

// ----------------------------------------------------
// 總結報表
// ----------------------------------------------------
console.log('====================================================');
console.log(`測試結果總結：全部 ${totalTests} 項斷言`);
console.log(`  通過 (PASSED): ${passedTests}`);
console.log(`  失敗 (FAILED): ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED! 全部測試通過！\n');
  process.exit(0);
}
