import os
from pathlib import Path
from playwright.sync_api import sync_playwright

base_dir = Path(__file__).resolve().parent.parent
out_png = base_dir / 'tests' / 'glyph_sheet.png'
temp_html = base_dir / 'tests' / 'temp_glyph_sheet.html'

html_content = '''<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>21 字全平滑筆順總表</title>
  <style>
    @font-face {
      font-family: 'BpmfIansui';
      src: url('../fonts/BpmfIansui.woff2') format('woff2');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'BpmfIansui', sans-serif;
      background: #f8fafc;
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 {
      font-size: 32px;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 18px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .glyph-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 16px;
      max-width: 1200px;
    }
    .glyph-card {
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 16px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .tian-box {
      width: 130px;
      height: 130px;
    }
    .svg-grid {
      width: 100%;
      height: 100%;
      display: block;
    }
    .card-footer {
      margin-top: 8px;
      text-align: center;
    }
    .char-title {
      font-size: 22px;
      font-weight: bold;
      color: #0369a1;
    }
    .char-meta {
      font-size: 14px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <h1>數字筆順冒險島 — 21 字全平滑筆順對齊總表</h1>
  <div class="subtitle">數字 0–10（格高 70%、線寬 9%）與 國字 一～十（格高 80%、線寬 7%）｜Catmull-Rom 平滑曲線</div>
  <div class="glyph-grid" id="grid"></div>

  <script src="../data/glyphs-digits.js"></script>
  <script src="../data/glyphs-hanzi.js"></script>
  <script src="../engine/stroke-engine.js"></script>
  <script>
    const colors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
    const numIcons = ['①', '②', '③', '④', '⑤'];
    const keys = [
      '0', '1', '2', '3', '4', '5', '6',
      '7', '8', '9', '10', '一', '二', '三',
      '四', '五', '六', '七', '八', '九', '十'
    ];

    const container = document.getElementById('grid');

    keys.forEach(k => {
      const isDigit = window.GLYPHS_DIGITS[k] !== undefined;
      const glyph = isDigit ? window.GLYPHS_DIGITS[k] : window.GLYPHS_HANZI[k];
      const strokeW = glyph.strokeWidth || (isDigit ? 9 : 7);

      let svgInner = `
        <rect width="100" height="100" fill="#ffffff" />
        <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="#94a3b8" stroke-width="2" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4,4" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="4,4" />
      `;

      // 繪製每一筆（平滑）
      glyph.strokes.forEach((stroke, sIdx) => {
        const sm = window.StrokeEngine.StrokeMath.smoothPath(stroke.points, 8);
        const ptsStr = sm.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const strokeColor = colors[sIdx % colors.length];
        svgInner += `<polyline points="${ptsStr}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" />`;
      });

      // 繪製起點綠點、防重疊圓圈編號與實心方向箭頭
      const guides = window.StrokeEngine.StrokeMath.computeStrokeGuides(glyph);
      guides.forEach(g => {
        // 起點綠點
        svgInner += `<circle cx="${g.p0[0].toFixed(1)}" cy="${g.p0[1].toFixed(1)}" r="3.6" fill="#22c55e" />`;
        svgInner += `<circle cx="${g.p0[0].toFixed(1)}" cy="${g.p0[1].toFixed(1)}" r="1.5" fill="#ffffff" />`;

        // 實心方向箭頭（長 12、寬 2.5、三角形邊長 5，外偏 7 單位）
        const aStart = g.arrow.start;
        const aBase = g.arrow.base;
        const aTip = g.arrow.tip;
        const c1 = g.arrow.corners[0];
        const c2 = g.arrow.corners[1];

        svgInner += `
          <line x1="${aStart[0].toFixed(1)}" y1="${aStart[1].toFixed(1)}" x2="${aBase[0].toFixed(1)}" y2="${aBase[1].toFixed(1)}" stroke="${g.color}" stroke-width="2.5" stroke-linecap="round" />
          <polygon points="
            ${aTip[0].toFixed(1)},${aTip[1].toFixed(1)}
            ${c1[0].toFixed(1)},${c1[1].toFixed(1)}
            ${c2[0].toFixed(1)},${c2[1].toFixed(1)}
          " fill="${g.color}" />
        `;

        // 圓圈編號（半徑 5、字級 7，白底彩色框，避開重疊與箭頭）
        const nx = g.numPos[0].toFixed(1);
        const ny = g.numPos[1].toFixed(1);
        svgInner += `
          <circle cx="${nx}" cy="${ny}" r="5.0" fill="#ffffff" stroke="${g.color}" stroke-width="1.3" />
          <text x="${nx}" y="${ny}" font-size="7" font-weight="bold" fill="${g.color}" text-anchor="middle" dominant-baseline="central" font-family="'Segoe UI', Roboto, sans-serif">${g.strokeIndex + 1}</text>
        `;
      });

      const card = document.createElement('div');
      card.className = 'glyph-card';
      card.innerHTML = `
        <div class="tian-box">
          <svg viewBox="0 0 100 100" class="svg-grid">${svgInner}</svg>
        </div>
        <div class="card-footer">
          <div class="char-title">${k}</div>
          <div class="char-meta">${glyph.strokesCount} 筆｜寬 ${strokeW}%</div>
        </div>
      `;
      container.appendChild(card);
    });
  </script>
</body>
</html>
'''

temp_html.write_text(html_content, encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1300, 'height': 850})
    page.goto(temp_html.as_uri())
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out_png), full_page=True)
    browser.close()

if temp_html.exists():
    temp_html.unlink()

print('glyph_sheet.png created successfully at:', out_png)
