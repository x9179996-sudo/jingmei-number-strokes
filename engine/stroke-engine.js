/**
 * engine/stroke-engine.js
 * 描寫判斷引擎核心
 * 
 * 核心演算法純 JavaScript 實作，完全不碰 DOM，能在 Node.js 執行自動測試。
 * 包含 Catmull-Rom 曲線平滑、位置錨定、筆畫評估器與畫布互動層。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StrokeEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==========================================
  // 1. 數學與曲線處理工具
  // ==========================================
  const StrokeMath = {
    // 兩點歐式距離
    distance: function (p1, p2) {
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      return Math.sqrt(dx * dx + dy * dy);
    },

    // 折線總長度
    polylineLength: function (points) {
      if (!points || points.length < 2) return 0;
      let len = 0;
      for (let i = 1; i < points.length; i++) {
        len += this.distance(points[i - 1], points[i]);
      }
      return len;
    },

    /**
     * 純函式：用 Catmull-Rom 把中線點列補成平滑曲線
     * @param {Array<[number, number]>} points - 原始點列
     * @param {number} subSegments - 每一段插值補點數（預設 8 點）
     * @returns {Array<[number, number]>} 平滑後的點列
     */
    smoothPath: function (points, subSegments = 8) {
      if (!points || points.length < 2) {
        return points ? points.map(p => [p[0], p[1]]) : [];
      }
      if (points.length === 2) {
        // 直線段直接等距內插
        const res = [];
        const p0 = points[0];
        const p1 = points[1];
        for (let k = 0; k < subSegments; k++) {
          const t = k / subSegments;
          res.push([p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1])]);
        }
        res.push([p1[0], p1[1]]);
        return res;
      }

      const isClosed = (Math.abs(points[0][0] - points[points.length - 1][0]) < 1e-4 &&
                        Math.abs(points[0][1] - points[points.length - 1][1]) < 1e-4);
      const res = [];
      const n = points.length;

      if (isClosed) {
        // 閉合曲線（例如 0、8、小圓圈）：循環銜接控制點
        const pts = points.slice(0, -1);
        const m = pts.length;
        for (let i = 0; i < m; i++) {
          const p0 = pts[(i - 1 + m) % m];
          const p1 = pts[i];
          const p2 = pts[(i + 1) % m];
          const p3 = pts[(i + 2) % m];
          for (let k = 0; k < subSegments; k++) {
            const t = k / subSegments;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
            const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
            res.push([x, y]);
          }
        }
        res.push([res[0][0], res[0][1]]);
      } else {
        // 開放曲線：端點外推切線
        for (let i = 0; i < n - 1; i++) {
          const p0 = (i === 0) ? [2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1]] : points[i - 1];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = (i === n - 2) ? [2 * points[n - 1][0] - points[n - 2][0], 2 * points[n - 1][1] - points[n - 2][1]] : points[i + 2];
          for (let k = 0; k < subSegments; k++) {
            const t = k / subSegments;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
            const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
            res.push([x, y]);
          }
        }
        res.push([points[n - 1][0], points[n - 1][1]]);
      }
      return res;
    },

    // 等弧長重新取樣為 N 個點（預設 32 點）
    resample: function (points, n = 32) {
      if (!points || points.length === 0) {
        return Array.from({ length: n }, () => [50, 50]);
      }
      if (points.length === 1) {
        return Array.from({ length: n }, () => [points[0][0], points[0][1]]);
      }

      // 累計各段長度
      const dists = [0];
      for (let i = 1; i < points.length; i++) {
        dists.push(dists[i - 1] + this.distance(points[i - 1], points[i]));
      }
      const totalLen = dists[dists.length - 1];

      if (totalLen === 0) {
        return Array.from({ length: n }, () => [points[0][0], points[0][1]]);
      }

      const res = [];
      let segIdx = 0;
      for (let j = 0; j < n; j++) {
        const targetDist = (j / (n - 1)) * totalLen;
        while (segIdx < points.length - 2 && dists[segIdx + 1] < targetDist) {
          segIdx++;
        }
        const p0 = points[segIdx];
        const p1 = points[segIdx + 1];
        const d0 = dists[segIdx];
        const d1 = dists[segIdx + 1];
        const segLen = d1 - d0;
        const ratio = segLen > 1e-6 ? (targetDist - d0) / segLen : 0;
        res.push([
          p0[0] + ratio * (p1[0] - p0[0]),
          p0[1] + ratio * (p1[1] - p0[1])
        ]);
      }
      return res;
    },

    // 計算兩組重取樣點（各 32 點）的平均歐式距離
    averageDistance: function (ptsA, ptsB) {
      const n = Math.min(ptsA.length, ptsB.length);
      if (n === 0) return 0;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += this.distance(ptsA[i], ptsB[i]);
      }
      return sum / n;
    },

    /**
     * 計算筆順示範格的編號與起點箭頭座標（防重疊演算法）
     * 規格：
     * 1. 箭身長 12 單位、線寬 2.5 單位、箭頭三角形邊長 5 單位（100×100 格）
     * 2. 方向取平滑後第 0 點到第 4 點，顏色同筆畫
     * 3. 沿著起筆方向的垂直方向，往字的外側偏移 7 單位
     * 4. 圓圈編號半徑 5 單位，數字字級 7 單位，白底彩色框，起點反方向退 9 單位，重疊推開 8 單位並避開箭頭
     */
    computeStrokeGuides: function (glyph) {
      if (!glyph || !glyph.strokes) return [];
      const STROKE_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];

      const rawGuides = [];

      for (let i = 0; i < glyph.strokes.length; i++) {
        const stroke = glyph.strokes[i];
        const smPts = this.smoothPath(stroke.points, 8);
        const p0 = smPts[0];
        const p4 = smPts[Math.min(4, smPts.length - 1)];

        // 起筆切線方向（第 0 點到第 4 點）
        let dx = p4[0] - p0[0];
        let dy = p4[1] - p0[1];
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          dx = 0;
          dy = 1;
          dist = 1;
        }
        const ux = dx / dist;
        const uy = dy / dist;
        const angle = Math.atan2(uy, ux);

        // 垂直於起筆方向的兩組單位法向量
        const n1x = -uy;
        const n1y = ux;
        const n2x = uy;
        const n2y = -ux;

        // 判斷哪一個法向是指向「字的外側」（遠離中心 (50, 50)）
        const toCenter_x = p0[0] - 50;
        const toCenter_y = p0[1] - 50;
        const dot1 = n1x * toCenter_x + n1y * toCenter_y;
        const dot2 = n2x * toCenter_x + n2y * toCenter_y;
        const nx = dot1 >= dot2 ? n1x : n2x;
        const ny = dot1 >= dot2 ? n1y : n2y;

        // 箭頭：沿著起筆方向的垂直方向，往字的外側偏移 7 單位
        const arrowStart_x = p0[0] + 7 * nx;
        const arrowStart_y = p0[1] + 7 * ny;

        // 箭身長 12 單位（起點到箭頭頂端）
        const arrowTip_x = arrowStart_x + 12 * ux;
        const arrowTip_y = arrowStart_y + 12 * uy;

        // 箭頭三角形邊長 5 單位（等邊三角形高 h = 5 * sqrt(3) / 2 ≈ 4.33，底邊半寬 2.5）
        const triH = 4.33;
        const triW = 2.5;

        // 三角形底邊中心點
        const triBase_x = arrowTip_x - triH * ux;
        const triBase_y = arrowTip_y - triH * uy;

        // 三角形底邊兩角點（垂直於切線方向 ±2.5）
        const c1_x = triBase_x + triW * (-uy);
        const c1_y = triBase_y + triW * ux;
        const c2_x = triBase_x - triW * (-uy);
        const c2_y = triBase_y - triW * ux;

        // 圓圈編號初始位置：起點的反方向退 9 單位
        let num_x = p0[0] - 9 * ux;
        let num_y = p0[1] - 9 * uy;

        rawGuides.push({
          strokeIndex: i,
          color: STROKE_COLORS[i % STROKE_COLORS.length],
          p0: p0,
          ux: ux,
          uy: uy,
          nx: nx,
          ny: ny,
          angle: angle,
          arrow: {
            start: [arrowStart_x, arrowStart_y],
            tip: [arrowTip_x, arrowTip_y],
            base: [triBase_x, triBase_y],
            corners: [[c1_x, c1_y], [c2_x, c2_y]],
            shaftWidth: 2.5,
            triSide: 5
          },
          numPos: [num_x, num_y],
          rNum: 5,
          fontSize: 7
        });
      }

      // 編號防重疊與避開箭頭：
      // 1. 維持上一輪規則：若與前面的編號距離 < 10 (半徑 5 + 5)，垂直方向推開 8 單位
      for (let j = 1; j < rawGuides.length; j++) {
        for (let k = 0; k < j; k++) {
          const d = Math.hypot(
            rawGuides[j].numPos[0] - rawGuides[k].numPos[0],
            rawGuides[j].numPos[1] - rawGuides[k].numPos[1]
          );
          if (d < 10) {
            if (rawGuides[j].numPos[1] >= rawGuides[k].numPos[1]) {
              rawGuides[j].numPos[1] += 8;
            } else {
              rawGuides[j].numPos[1] -= 8;
            }
          }
        }
      }

      // 2. 避開箭頭：檢查編號與本筆箭頭的距離
      for (let j = 0; j < rawGuides.length; j++) {
        const item = rawGuides[j];
        const aMidX = (item.arrow.start[0] + item.arrow.tip[0]) / 2;
        const aMidY = (item.arrow.start[1] + item.arrow.tip[1]) / 2;
        const dToArrow = Math.hypot(item.numPos[0] - aMidX, item.numPos[1] - aMidY);
        if (dToArrow < 8) {
          // 避開箭頭：沿字外側法向量的反方向 (-nx, -ny) 推開
          item.numPos[0] -= 5 * item.nx;
          item.numPos[1] -= 5 * item.ny;
        }
        // 安全邊界限制 [6, 94]
        item.numPos[0] = Math.max(6, Math.min(94, item.numPos[0]));
        item.numPos[1] = Math.max(6, Math.min(94, item.numPos[1]));
      }

      return rawGuides;
    }
  };

  // ==========================================
  // 2. 判斷門檻設定
  // ==========================================
  const THRESHOLDS = {
    // 寬鬆模式（低年級初學預設）
    loose: {
      startMaxDist: 22,    // 起點誤差在格寬 22% 以內
      shapeMaxDist: 19,    // 形狀平均距離在格寬 19% 以內
      minLengthRatio: 0.50, // 筆跡長度達到標準 50% 以上
      maxDevDist: 34,      // 逐點最大偏離門檻 34
      minSegCos: 0.2       // 4 段方向向量 cosine >= 0.2
    },
    // 標準模式（進階）
    standard: {
      startMaxDist: 18,    // 起點誤差在格寬 18% 以內
      shapeMaxDist: 15,    // 形狀平均距離在格寬 15% 以內
      minLengthRatio: 0.60, // 筆跡長度達到標準 60% 以上
      maxDevDist: 28,      // 逐點最大偏離門檻 28
      minSegCos: 0.4       // 4 段方向向量 cosine >= 0.4
    }
  };

  // ==========================================
  // 3. 筆畫評估器（標準筆畫先平滑再重新取樣）
  // ==========================================
  const StrokeEvaluator = {
    /**
     * 評估使用者的一筆筆跡
     * @param {Array<[number, number]>} userPoints - 使用者筆跡座標陣列
     * @param {Object} standardStroke - 標準筆畫中線資料
     * @param {Object} options - 設定 { mode: 'loose'|'standard' }
     * @returns {Object} 評估結果
     */
    evaluate: function (userPoints, standardStroke, options = {}) {
      const mode = options.mode || 'loose';
      const config = THRESHOLDS[mode] || THRESHOLDS.loose;

      if (!userPoints || userPoints.length < 2) {
        return {
          success: false,
          errorType: 'TOO_SHORT',
          message: '筆畫太短囉，再試一次',
          details: { reason: '點數不足' }
        };
      }

      // 標準筆畫先平滑，再重新取樣為 32 點
      const stdSmoothed = StrokeMath.smoothPath(standardStroke.points, 8);
      const stdResampled = StrokeMath.resample(stdSmoothed, 32);

      // 使用者筆跡重新取樣為 32 點
      const userResampled = StrokeMath.resample(userPoints, 32);

      const userStart = userResampled[0];
      const stdStart = standardStroke.start || stdResampled[0];
      const stdEnd = stdResampled[31];

      // 1. 起點判斷
      const startDist = StrokeMath.distance(userStart, stdStart);
      if (startDist > config.startMaxDist) {
        return {
          success: false,
          errorType: 'START_OFFSET',
          message: '從綠點開始喔！',
          details: { startDist, limit: config.startMaxDist }
        };
      }

      // 2. 方向判斷（以起點對齊檢驗相對走勢）
      const stdIsClosed = StrokeMath.distance(stdResampled[0], stdEnd) < 8; // 封閉圓弧（如 0、8）
      let directionPass = false;

      // 起點對齊後的相對筆跡點列
      const uAligned = userResampled.map(([x, y]) => [
        x - userStart[0] + stdResampled[0][0],
        y - userStart[1] + stdResampled[0][1]
      ]);

      if (!stdIsClosed) {
        // 開放曲線：重新取樣後，終點要比起點更接近標準終點
        const endToStdEnd = StrokeMath.distance(uAligned[31], stdEnd);
        const startToStdEnd = StrokeMath.distance(stdResampled[0], stdEnd);
        directionPass = endToStdEnd < startToStdEnd;
      } else {
        // 封閉迴圈（0、8）：比對第 8 點（前 1/4 弧）的相對方向
        directionPass = StrokeMath.distance(uAligned[8], stdResampled[8]) < StrokeMath.distance(uAligned[8], stdResampled[24]);
      }

      if (!directionPass) {
        return {
          success: false,
          errorType: 'DIRECTION',
          message: '方向寫反囉，順著箭頭寫寫看！',
          details: { directionPass: false }
        };
      }

      // 3. 長度判斷
      const userLen = StrokeMath.polylineLength(userPoints);
      const stdLen = StrokeMath.polylineLength(stdSmoothed);
      const lengthRatio = stdLen > 0 ? (userLen / stdLen) : 1;

      if (lengthRatio < config.minLengthRatio) {
        return {
          success: false,
          errorType: 'LENGTH',
          message: '筆畫還沒寫完喔，再畫長一點！',
          details: { lengthRatio, limit: config.minLengthRatio }
        };
      }

      // 4. 形狀判斷：32 點平均歐式距離
      const shapeDist = StrokeMath.averageDistance(userResampled, stdResampled);
      if (shapeDist > config.shapeMaxDist) {
        return {
          success: false,
          errorType: 'SHAPE',
          message: '弧度差了一點點，沿著虛線慢慢描喔！',
          details: { shapeDist, limit: config.shapeMaxDist }
        };
      }

      // 5. 最大偏離判斷：32 點逐點距離最大值
      let maxDevDist = 0;
      for (let i = 0; i < 32; i++) {
        const d = StrokeMath.distance(userResampled[i], stdResampled[i]);
        if (d > maxDevDist) maxDevDist = d;
      }
      if (maxDevDist > config.maxDevDist) {
        return {
          success: false,
          errorType: 'MAX_DEV',
          message: '筆畫跑太遠囉，沿著虛線寫寫看！',
          details: { maxDevDist, limit: config.maxDevDist }
        };
      }

      // 6. 分段方向判斷：32 點分成 4 段（0–8, 8–16, 16–24, 24–31）
      // 整筆標準長度小於 25 的筆畫（例如點、7 的小豎、四的豎彎）整筆跳過這項
      const isShortStroke = stdLen < 25 || (standardStroke.name && standardStroke.name.includes('豎彎'));
      if (!isShortStroke) {
        const segRanges = [
          [0, 8],
          [8, 16],
          [16, 24],
          [24, 31]
        ];
        for (let s = 0; s < segRanges.length; s++) {
          const [startIdx, endIdx] = segRanges[s];
          const su = stdResampled[startIdx];
          const eu = stdResampled[endIdx];
          const s_dx = eu[0] - su[0];
          const s_dy = eu[1] - su[1];
          const s_len = Math.sqrt(s_dx * s_dx + s_dy * s_dy);

          // 標準筆畫該段長度小於 6.5 的段跳過不比
          if (s_len < 6.5) continue;

          const uu = userResampled[startIdx];
          const ue = userResampled[endIdx];
          const u_dx = ue[0] - uu[0];
          const u_dy = ue[1] - uu[1];
          const u_len = Math.sqrt(u_dx * u_dx + u_dy * u_dy);

          let cos = 0;
          if (u_len > 1e-4) {
            cos = (u_dx * s_dx + u_dy * s_dy) / (u_len * s_len);
          }

          if (cos < config.minSegCos) {
            return {
              success: false,
              errorType: 'SEG_DIRECTION',
              message: '方向不太對，順著箭頭寫寫看！',
              details: { segIndex: s, cos, limit: config.minSegCos }
            };
          }
        }
      }

      // 通過！
      return {
        success: true,
        errorType: null,
        message: '太棒了！寫對了！',
        details: {
          startDist,
          shapeDist,
          maxDevDist,
          lengthRatio,
          directionPass: true
        }
      };
    }
  };

  // ==========================================
  // 4. 單字書寫管理狀態機（含「寫」步驟位置錨定）
  // ==========================================
  class StrokeSession {
    constructor(glyphData, options = {}) {
      this.glyph = glyphData;
      this.mode = options.mode || 'loose';
      this.isWriteMode = options.isWriteMode || false; // 只在「寫」時啟用位置錨定
      this.anchorOffset = [0, 0]; // 第 1 筆起點差距 (dx, dy)
      this.currentStrokeIndex = 0;
      this.consecutiveErrors = 0;
      this.completedStrokes = [];
      this.strokeErrorStats = {};
    }

    setMode(mode) {
      if (THRESHOLDS[mode]) this.mode = mode;
    }

    setWriteMode(isWrite) {
      this.isWriteMode = isWrite;
      this.anchorOffset = [0, 0];
    }

    reset() {
      this.currentStrokeIndex = 0;
      this.consecutiveErrors = 0;
      this.completedStrokes = [];
      this.anchorOffset = [0, 0];
    }

    getCurrentStroke() {
      if (this.currentStrokeIndex < this.glyph.strokes.length) {
        let stroke = this.glyph.strokes[this.currentStrokeIndex];
        // 「寫」步驟第 2 筆以後套用錨定平移
        if (this.isWriteMode && this.currentStrokeIndex > 0) {
          const [ox, oy] = this.anchorOffset;
          const translatedPoints = stroke.points.map(([x, y]) => [x + ox, y + oy]);
          const translatedStart = [stroke.start[0] + ox, stroke.start[1] + oy];
          stroke = {
            ...stroke,
            points: translatedPoints,
            start: translatedStart
          };
        }
        return stroke;
      }
      return null;
    }

    isComplete() {
      return this.currentStrokeIndex >= this.glyph.strokes.length;
    }

    submitStroke(userPoints) {
      if (this.isComplete()) {
        return {
          success: false,
          errorType: 'ALREADY_COMPLETED',
          message: '已經寫完囉！',
          sessionComplete: true
        };
      }

      let expectedStroke = this.glyph.strokes[this.currentStrokeIndex];

      // 「寫」步驟第 1 筆依落筆起點偏移、第 2 筆以後依記錄之錨定偏移平移標準筆畫
      if (this.isWriteMode) {
        let ox = 0, oy = 0;
        if (this.currentStrokeIndex === 0) {
          const stdStart = expectedStroke.start;
          let dx = userPoints[0][0] - stdStart[0];
          let dy = userPoints[0][1] - stdStart[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= 22) { // 寬鬆起點門檻內
            if (dist > 20) {
              dx = (dx / dist) * 20;
              dy = (dy / dist) * 20;
            }
            ox = dx;
            oy = dy;
          }
        } else {
          [ox, oy] = this.anchorOffset;
        }

        if (ox !== 0 || oy !== 0) {
          const translatedPoints = expectedStroke.points.map(([x, y]) => [x + ox, y + oy]);
          const translatedStart = (this.currentStrokeIndex === 0)
            ? expectedStroke.start
            : [expectedStroke.start[0] + ox, expectedStroke.start[1] + oy];
          expectedStroke = {
            ...expectedStroke,
            points: translatedPoints,
            start: translatedStart
          };
        }
      }

      const result = StrokeEvaluator.evaluate(userPoints, expectedStroke, { mode: this.mode });

      if (result.success) {
        // 第 1 筆判對後，在「寫」模式下計算並記錄位置錨定偏移
        if (this.isWriteMode && this.currentStrokeIndex === 0) {
          const stdStart = this.glyph.strokes[0].start;
          let dx = userPoints[0][0] - stdStart[0];
          let dy = userPoints[0][1] - stdStart[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          // 差距最多採計格寬的 20%，超過就照 20% 算
          if (dist > 20) {
            dx = (dx / dist) * 20;
            dy = (dy / dist) * 20;
          }
          this.anchorOffset = [dx, dy];
        }

        this.completedStrokes.push({
          index: this.currentStrokeIndex,
          stroke: expectedStroke,
          userPoints: userPoints
        });
        this.currentStrokeIndex++;
        this.consecutiveErrors = 0;
        result.strokeIndex = this.currentStrokeIndex - 1;
        result.sessionComplete = this.isComplete();
        result.totalStrokes = this.glyph.strokes.length;
        result.progress = this.currentStrokeIndex / this.glyph.strokes.length;
      } else {
        this.consecutiveErrors++;
        const sKey = `筆畫${this.currentStrokeIndex + 1}`;
        this.strokeErrorStats[sKey] = (this.strokeErrorStats[sKey] || 0) + 1;
        result.strokeIndex = this.currentStrokeIndex;
        result.consecutiveErrors = this.consecutiveErrors;
        result.shouldReplayDemo = (this.consecutiveErrors >= 2);
        result.sessionComplete = false;
      }

      return result;
    }
  }

  // ==========================================
  // 5. 數字接龍題庫與產生器
  // ==========================================
  const SolitaireGenerator = {
    // 第 1 關固定 3 題（學習單原題）
    FIXED_LEVEL_1: [
      {
        sequence: [2, 3, null, 5, null],
        answers: [4, 6],
        direction: 'asc',
        step: 1
      },
      {
        sequence: [5, null, 7, null, null, 10],
        answers: [6, 8, 9],
        direction: 'asc',
        step: 1
      },
      {
        sequence: [1, null, 3, null, null, 6, 7, null],
        answers: [2, 4, 5, 8],
        direction: 'asc',
        step: 1
      }
    ],

    generateRandomQuestion: function (options = {}) {
      const direction = options.direction || 'asc';
      const len = options.length || 5;
      const blankCount = Math.min(len - 2, Math.max(1, options.blanks || 2));

      let fullSequence = [];
      if (direction === 'asc') {
        const maxStart = 10 - len + 1;
        const start = Math.floor(Math.random() * (maxStart + 1));
        for (let i = 0; i < len; i++) {
          fullSequence.push(start + i);
        }
      } else {
        const minStart = len - 1;
        const start = minStart + Math.floor(Math.random() * (11 - len));
        for (let i = 0; i < len; i++) {
          fullSequence.push(start - i);
        }
      }

      const candidates = [];
      for (let i = 0; i < len; i++) candidates.push(i);

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      const blankIndices = candidates.slice(0, blankCount).sort((a, b) => a - b);

      const sequence = [];
      const answers = [];
      for (let i = 0; i < len; i++) {
        if (blankIndices.includes(i)) {
          sequence.push(null);
          answers.push(fullSequence[i]);
        } else {
          sequence.push(fullSequence[i]);
        }
      }

      return {
        sequence,
        answers,
        fullSequence,
        blankIndices,
        direction,
        step: direction === 'asc' ? 1 : -1
      };
    },

    getLevelQuestions: function (level) {
      if (level === 1) {
        const q1 = JSON.parse(JSON.stringify(this.FIXED_LEVEL_1[0]));
        const q2 = JSON.parse(JSON.stringify(this.FIXED_LEVEL_1[1]));
        const q3 = JSON.parse(JSON.stringify(this.FIXED_LEVEL_1[2]));
        const q4 = this.generateRandomQuestion({ direction: 'asc', length: 5, blanks: 2 });
        const q5 = this.generateRandomQuestion({ direction: 'asc', length: 6, blanks: 2 });
        return [q1, q2, q3, q4, q5];
      } else if (level >= 2 && level <= 4) {
        const list = [];
        const lens = [5, 5, 6, 6, 7];
        const blanks = [1, 2, 2, 3, 2];
        for (let i = 0; i < 5; i++) {
          list.push(this.generateRandomQuestion({ direction: 'asc', length: lens[i], blanks: blanks[i] }));
        }
        return list;
      } else {
        const list = [];
        const lens = [5, 5, 5, 6, 6];
        const blanks = [1, 2, 2, 2, 3];
        for (let i = 0; i < 5; i++) {
          list.push(this.generateRandomQuestion({ direction: 'desc', length: lens[i], blanks: blanks[i] }));
        }
        return list;
      }
    }
  };

  // ==========================================
  // 6. 音效合成器（Web Audio API）
  // ==========================================
  class SoundSynthesizer {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playTone(freq, type = 'sine', duration = 0.15, startTime = 0, gainVal = 0.15) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playStrokeSuccess() {
      this.playTone(523.25, 'sine', 0.12, 0, 0.18);      // C5
      this.playTone(659.25, 'sine', 0.15, 0.08, 0.18);   // E5
      this.playTone(783.99, 'sine', 0.22, 0.16, 0.20);   // G5
    }

    playLevelComplete() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.25, idx * 0.1, 0.22);
      });
    }

    playStarEarned() {
      this.playTone(880.00, 'sine', 0.15, 0, 0.2);
      this.playTone(1174.66, 'sine', 0.3, 0.1, 0.25);
    }

    playGentleHint() {
      this.playTone(329.63, 'sine', 0.18, 0, 0.1);
    }
  }

  // ==========================================
  // 7. 語音合成輔助器（Web Speech API zh-TW）
  // ==========================================
  class SpeechAssistant {
    constructor() {
      this.supported = (typeof window !== 'undefined' && 'speechSynthesis' in window);
      this.enabled = true;
    }

    speak(text) {
      if (!this.supported || !this.enabled || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-TW';
        utter.rate = 0.9;
        utter.pitch = 1.1;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }

    stop() {
      if (this.supported) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
    }
  }

  // ==========================================
  // 8. 瀏覽器端畫布與互動層（StrokeCanvas）
  // ==========================================
  class StrokeCanvas {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
      this.gridType = options.gridType || 'tian';
      this.glyph = null;
      this.session = null;
      this.mode = options.mode || 'loose';
      this.isTracing = options.isTracing ?? true;
      this.sound = options.sound || new SoundSynthesizer();
      this.speech = options.speech || new SpeechAssistant();

      // 使用者手繪筆跡
      this.isDrawing = false;
      this.currentStrokePoints = [];
      this.pointerId = null;

      // 示範動畫
      this.animFrameId = null;
      this.isAnimating = false;
      this.animSpeed = 1.0;
      this.animStrokeIndex = 0;
      this.animProgress = 0;
      this.showDemoGuides = false;

      // 事件回呼
      this.onStrokeSuccess = options.onStrokeSuccess || null;
      this.onStrokeError = options.onStrokeError || null;
      this.onSessionComplete = options.onSessionComplete || null;

      if (this.canvas) {
        this.bindEvents();
        this.resize();
      }
    }

    // 取得當前字形線寬：數字 9%、國字 7%（以格寬計），若字形有設 strokeWidth 則優先採用
    getStrokeWidth() {
      if (this.glyph && typeof this.glyph.strokeWidth === 'number') {
        return this.glyph.strokeWidth;
      }
      return (this.glyph && this.glyph.type === 'digit') ? 9 : 7;
    }

    setGlyph(glyphData, isTracing = true, isWriteMode = false) {
      this.stopAnimation();
      this.glyph = glyphData;
      this.isTracing = isTracing;
      this.session = new StrokeSession(glyphData, {
        mode: this.mode,
        isWriteMode: isWriteMode
      });
      this.currentStrokePoints = [];
      this.draw();
    }

    setMode(mode) {
      this.mode = mode;
      if (this.session) this.session.setMode(mode);
    }

    setShowDemoGuides(show) {
      this.showDemoGuides = !!show;
      this.draw();
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const size = Math.min(rect.width, rect.height) || 300;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    clientToGrid(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const size = Math.min(rect.width, rect.height);
      const gridX = (x / size) * 100;
      const gridY = (y / size) * 100;
      return [gridX, gridY];
    }

    gridToCanvas(gridX, gridY) {
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      return [(gridX / 100) * size, (gridY / 100) * size];
    }

    bindEvents() {
      const c = this.canvas;
      c.style.touchAction = 'none';

      const onPointerDown = (e) => {
        if (this.isAnimating) this.stopAnimation();
        c.setPointerCapture(e.pointerId);
        this.pointerId = e.pointerId;
        this.isDrawing = true;
        const pt = this.clientToGrid(e.clientX, e.clientY);
        this.currentStrokePoints = [pt];
        this.draw();
      };

      const onPointerMove = (e) => {
        if (!this.isDrawing || e.pointerId !== this.pointerId) return;
        const pt = this.clientToGrid(e.clientX, e.clientY);
        const last = this.currentStrokePoints[this.currentStrokePoints.length - 1];
        if (!last || StrokeMath.distance(last, pt) > 0.6) {
          this.currentStrokePoints.push(pt);
          this.draw();
        }
      };

      const onPointerUp = (e) => {
        if (!this.isDrawing || e.pointerId !== this.pointerId) return;
        this.isDrawing = false;
        try { c.releasePointerCapture(e.pointerId); } catch (_) {}
        this.pointerId = null;

        if (this.currentStrokePoints.length >= 2) {
          this.handleStrokeEnd();
        } else {
          this.currentStrokePoints = [];
          this.draw();
        }
      };

      c.addEventListener('pointerdown', onPointerDown);
      c.addEventListener('pointermove', onPointerMove);
      c.addEventListener('pointerup', onPointerUp);
      c.addEventListener('pointercancel', onPointerUp);
    }

    handleStrokeEnd() {
      if (!this.session || this.session.isComplete()) {
        this.currentStrokePoints = [];
        this.draw();
        return;
      }

      const userPts = this.currentStrokePoints;
      const expectedStroke = this.session.getCurrentStroke();
      const evalResult = this.session.submitStroke(userPts);

      if (evalResult.success) {
        this.sound.playStrokeSuccess();
        this.currentStrokePoints = [];
        this.draw();

        if (this.onStrokeSuccess) {
          this.onStrokeSuccess(evalResult, expectedStroke);
        }

        if (evalResult.sessionComplete) {
          this.sound.playLevelComplete();
          if (this.onSessionComplete) {
            this.onSessionComplete(this.session);
          }
        }
      } else {
        this.sound.playGentleHint();
        this.animateFadeError(userPts, () => {
          this.currentStrokePoints = [];
          this.draw();
          if (this.onStrokeError) {
            this.onStrokeError(evalResult, expectedStroke);
          }
          if (evalResult.shouldReplayDemo) {
            this.playDemoSingleStroke(evalResult.strokeIndex);
          }
        });
      }
    }

    animateFadeError(points, callback) {
      let opacity = 1.0;
      const w = this.getStrokeWidth();
      const step = () => {
        opacity -= 0.15;
        if (opacity <= 0) {
          if (callback) callback();
        } else {
          this.draw();
          this.drawStrokePolyline(points, null, `rgba(239, 68, 68, ${opacity})`, w);
          requestAnimationFrame(step);
        }
      };
      step();
    }

    draw() {
      if (!this.ctx || !this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const ctx = this.ctx;
      const strokeW = this.getStrokeWidth();

      ctx.clearRect(0, 0, size, size);

      // 1. 繪製田字格背景
      this.drawGrid(size);

      if (!this.glyph) return;

      // 2. 描紅底字（若在描寫階段）
      if (this.isTracing) {
        this.drawGhostGlyph(size, strokeW);
      }

      // 2.5 示範引導編號與箭頭（「看」步驟時顯示所有筆畫編號與箭頭）
      if (this.showDemoGuides) {
        this.drawAllDemoGuides(size);
      }

      // 3. 已經正確完成的筆畫（實心粗筆）
      if (this.session) {
        for (const done of this.session.completedStrokes) {
          // 已完成筆畫使用平滑曲線繪製
          const smPts = StrokeMath.smoothPath(done.stroke.points, 8);
          this.drawStrokePolyline(smPts, size, '#0284c7', strokeW);
        }
      }

      // 4. 當前待寫筆畫的引導（起點綠點、方向箭頭）
      if (this.session && !this.session.isComplete() && !this.isAnimating) {
        const curStroke = this.session.getCurrentStroke();
        if (curStroke) {
          if (this.isTracing || this.session.currentStrokeIndex === 0) {
            this.drawStrokeGuide(curStroke, size);
          }
        }
      }

      // 5. 使用者正在手繪拉出的筆跡（採用平滑曲線渲染）
      if (this.currentStrokePoints.length > 1) {
        const smUser = StrokeMath.smoothPath(this.currentStrokePoints, 4);
        this.drawStrokePolyline(smUser, size, '#0369a1', strokeW);
      }
    }

    drawGrid(size) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);

      if (this.gridType === 'tian') {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, size / 2);
        ctx.lineTo(size, size / 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawGhostGlyph(size, strokeW) {
      if (!this.glyph || !this.glyph.strokes) return;
      for (const stroke of this.glyph.strokes) {
        // 底字一律使用平滑後的點列
        const smPts = StrokeMath.smoothPath(stroke.points, 8);
        this.drawStrokePolyline(smPts, size, '#e2e8f0', strokeW);
      }
    }

    drawStrokePolyline(pts, size, color, widthPercent = 9) {
      if (!pts || pts.length < 2) return;
      const ctx = this.ctx;
      const actualSize = size || Math.min(this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = (widthPercent / 100) * actualSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const p0 = this.gridToCanvas(pts[0][0], pts[0][1]);
      ctx.moveTo(p0[0], p0[1]);

      for (let i = 1; i < pts.length; i++) {
        const p = this.gridToCanvas(pts[i][0], pts[i][1]);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.restore();
    }

    drawStrokeGuide(stroke, size) {
      const ctx = this.ctx;
      const startPt = this.gridToCanvas(stroke.start[0], stroke.start[1]);
      const radius = (4.0 / 100) * size;

      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(startPt[0], startPt[1], radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(startPt[0], startPt[1], radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // 箭頭方向提示
      if (stroke.points && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const angle = Math.atan2(dy, dx);
        const arrowDist = (6.5 / 100) * size;
        const ax = startPt[0] + Math.cos(angle) * arrowDist;
        const ay = startPt[1] + Math.sin(angle) * arrowDist;

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        const headLen = (2.8 / 100) * size;
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - headLen * Math.cos(angle - Math.PI / 6),
          ay - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          ax - headLen * Math.cos(angle + Math.PI / 6),
          ay - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawAllDemoGuides(size) {
      if (!this.glyph || !this.glyph.strokes) return;
      const guides = StrokeMath.computeStrokeGuides(this.glyph);
      const ctx = this.ctx;
      const actualSize = size || Math.min(this.canvas.width, this.canvas.height);

      for (const g of guides) {
        const p0Canvas = this.gridToCanvas(g.p0[0], g.p0[1]);
        const numCanvas = this.gridToCanvas(g.numPos[0], g.numPos[1]);
        const aStartCanvas = this.gridToCanvas(g.arrow.start[0], g.arrow.start[1]);
        const aBaseCanvas = this.gridToCanvas(g.arrow.base[0], g.arrow.base[1]);
        const aTipCanvas = this.gridToCanvas(g.arrow.tip[0], g.arrow.tip[1]);
        const c1Canvas = this.gridToCanvas(g.arrow.corners[0][0], g.arrow.corners[0][1]);
        const c2Canvas = this.gridToCanvas(g.arrow.corners[1][0], g.arrow.corners[1][1]);

        ctx.save();

        // 1. 起點綠點
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(p0Canvas[0], p0Canvas[1], (3.8 / 100) * actualSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p0Canvas[0], p0Canvas[1], (1.6 / 100) * actualSize, 0, Math.PI * 2);
        ctx.fill();

        // 2. 實心方向箭頭：箭身長 12 單位、線寬 2.5 單位、三角形邊長 5 單位
        ctx.strokeStyle = g.color;
        ctx.lineWidth = (2.5 / 100) * actualSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(aStartCanvas[0], aStartCanvas[1]);
        ctx.lineTo(aBaseCanvas[0], aBaseCanvas[1]);
        ctx.stroke();

        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.moveTo(aTipCanvas[0], aTipCanvas[1]);
        ctx.lineTo(c1Canvas[0], c1Canvas[1]);
        ctx.lineTo(c2Canvas[0], c2Canvas[1]);
        ctx.closePath();
        ctx.fill();

        // 3. 圓圈編號（半徑 5 單位，數字字級 7 單位，白底彩色框）
        const rNum = (5.0 / 100) * actualSize;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = g.color;
        ctx.lineWidth = Math.max(1.5, (1.3 / 100) * actualSize);
        ctx.beginPath();
        ctx.arc(numCanvas[0], numCanvas[1], rNum, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = g.color;
        ctx.font = `bold ${Math.round((7.0 / 100) * actualSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${g.strokeIndex + 1}`, numCanvas[0], numCanvas[1] + (0.3 / 100) * actualSize);

        ctx.restore();
      }
    }

    stopAnimation() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.isAnimating = false;
    }

    playDemo(speed = 1.0, onFinish = null) {
      if (!this.glyph || !this.glyph.strokes.length) return;
      this.stopAnimation();
      this.isAnimating = true;
      this.animSpeed = speed;
      this.animStrokeIndex = 0;
      this.animProgress = 0;

      const strokes = this.glyph.strokes;
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const strokeW = this.getStrokeWidth();

      const animateNextStroke = () => {
        if (!this.isAnimating) return;
        if (this.animStrokeIndex >= strokes.length) {
          this.isAnimating = false;
          this.draw();
          if (onFinish) onFinish();
          return;
        }

        const curStroke = strokes[this.animStrokeIndex];
        // 示範動畫一律使用平滑後的曲線
        const curSmoothed = StrokeMath.smoothPath(curStroke.points, 8);

        if (this.glyph.type === 'hanzi') {
          this.speech.speak(curStroke.name);
        }

        let progress = 0;
        const duration = (1200 / this.animSpeed);
        const startTime = performance.now();

        const step = (now) => {
          if (!this.isAnimating) return;
          const elapsed = now - startTime;
          progress = Math.min(1.0, elapsed / duration);

          this.ctx.clearRect(0, 0, size, size);
          this.drawGrid(size);
          this.drawGhostGlyph(size, strokeW);

          // 示範引導編號與箭頭
          if (this.showDemoGuides) {
            this.drawAllDemoGuides(size);
          }

          // 先前已播完的筆畫
          for (let i = 0; i < this.animStrokeIndex; i++) {
            const sm = StrokeMath.smoothPath(strokes[i].points, 8);
            this.drawStrokePolyline(sm, size, '#0284c7', strokeW);
          }

          // 當前動態增長中的筆畫（平滑）
          const partialPts = this.getPartialPoints(curSmoothed, progress);
          if (partialPts.length >= 2) {
            this.drawStrokePolyline(partialPts, size, '#f97316', strokeW);
          }

          // 頭部光點
          const tipPt = partialPts[partialPts.length - 1];
          const tipCanvas = this.gridToCanvas(tipPt[0], tipPt[1]);
          this.ctx.save();
          this.ctx.fillStyle = '#22c55e';
          this.ctx.beginPath();
          this.ctx.arc(tipCanvas[0], tipCanvas[1], (4.5 / 100) * size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();

          if (progress < 1.0) {
            this.animFrameId = requestAnimationFrame(step);
          } else {
            this.animStrokeIndex++;
            setTimeout(() => {
              if (this.isAnimating) {
                animateNextStroke();
              }
            }, 350);
          }
        };

        this.animFrameId = requestAnimationFrame(step);
      };

      animateNextStroke();
    }

    playDemoSingleStroke(strokeIdx, onFinish = null) {
      if (!this.glyph || !this.glyph.strokes[strokeIdx]) return;
      this.stopAnimation();
      this.isAnimating = true;
      const stroke = this.glyph.strokes[strokeIdx];
      const strokeW = this.getStrokeWidth();
      const smPts = StrokeMath.smoothPath(stroke.points, 8);
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const startTime = performance.now();
      const duration = 1500;

      if (this.glyph.type === 'hanzi') {
        this.speech.speak(`請看：${stroke.name}`);
      }

      const step = (now) => {
        if (!this.isAnimating) return;
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        this.draw();
        const partialPts = this.getPartialPoints(smPts, progress);
        if (partialPts.length >= 2) {
          this.drawStrokePolyline(partialPts, size, '#f97316', strokeW);
        }

        if (progress < 1.0) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          setTimeout(() => {
            this.isAnimating = false;
            this.draw();
            if (onFinish) onFinish();
          }, 300);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    }

    getPartialPoints(points, ratio) {
      if (ratio <= 0) return [points[0], points[0]];
      if (ratio >= 1) return points;

      const totalLen = StrokeMath.polylineLength(points);
      const targetDist = ratio * totalLen;

      const res = [points[0]];
      let curDist = 0;

      for (let i = 1; i < points.length; i++) {
        const segLen = StrokeMath.distance(points[i - 1], points[i]);
        if (curDist + segLen < targetDist) {
          res.push(points[i]);
          curDist += segLen;
        } else {
          const remain = targetDist - curDist;
          const r = segLen > 0 ? (remain / segLen) : 0;
          res.push([
            points[i - 1][0] + r * (points[i][0] - points[i - 1][0]),
            points[i - 1][1] + r * (points[i][1] - points[i - 1][1])
          ]);
          break;
        }
      }
      return res;
    }
  }

  // 匯出全部模組
  return {
    StrokeMath,
    THRESHOLDS,
    StrokeEvaluator,
    StrokeSession,
    SolitaireGenerator,
    SoundSynthesizer,
    SpeechAssistant,
    StrokeCanvas
  };
});
