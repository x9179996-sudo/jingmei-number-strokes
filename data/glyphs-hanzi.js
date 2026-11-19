/**
 * glyphs-hanzi.js
 * 國字 一～十 字形中線資料（田字格 100x100，字形約占格高 80%、置中）
 * 筆順依據：教育部《常用國字標準字體筆順學習網》
 * 網址：https://stroke-order.learningweb.moe.edu.tw/
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GLYPHS_HANZI = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    "一": {
      character: "一",
      counterpart: "1",
      bpmf: "ㄧ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 1,
      description: "一，只有一筆：由左往右平平的一橫",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "由左往右",
          start: [16, 50],
          points: [
            [16, 50], [34, 50], [50, 50], [66, 50], [84, 50]
          ]
        }
      ]
    },
    "二": {
      character: "二",
      counterpart: "2",
      bpmf: "ㄦˋ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 2,
      description: "二，共兩筆：先寫上面短橫，再寫下面長橫",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "上方短橫，由左往右",
          start: [26, 38],
          points: [
            [26, 38], [42, 38], [58, 38], [74, 38]
          ]
        },
        {
          index: 1,
          name: "橫",
          direction: "下方長橫，由左往右",
          start: [16, 68],
          points: [
            [16, 68], [38, 68], [62, 68], [84, 68]
          ]
        }
      ]
    },
    "三": {
      character: "三",
      counterpart: "3",
      bpmf: "ㄙㄢ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 3,
      dotsCount: 3,
      description: "三，共三筆：上橫中長、中橫最短、下橫最長",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "第 1 筆：上橫，由左往右",
          start: [22, 32],
          points: [
            [22, 32], [40, 32], [60, 32], [78, 32]
          ]
        },
        {
          index: 1,
          name: "橫",
          direction: "第 2 筆：中橫（最短），由左往右",
          start: [30, 50],
          points: [
            [30, 50], [44, 50], [56, 50], [70, 50]
          ]
        },
        {
          index: 2,
          name: "橫",
          direction: "第 3 筆：下橫（最長），由左往右",
          start: [16, 72],
          points: [
            [16, 72], [38, 72], [62, 72], [84, 72]
          ]
        }
      ]
    },
    "四": {
      character: "四",
      counterpart: "4",
      bpmf: "ㄙˋ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 5,
      dotsCount: 4,
      description: "四，共五筆：豎、橫折、撇、豎彎、橫（先關門外再封底）",
      strokes: [
        {
          index: 0,
          name: "豎",
          direction: "第 1 筆：左側一豎，由上往下",
          start: [22, 22],
          points: [
            [22, 22], [22, 42], [22, 60], [22, 78]
          ]
        },
        {
          index: 1,
          name: "橫折",
          direction: "第 2 筆：上方橫折往下",
          start: [22, 22],
          points: [
            [22, 22], [50, 22], [78, 22], [78, 50], [78, 78]
          ]
        },
        {
          index: 2,
          name: "撇",
          direction: "第 3 筆：框內左撇，由右上往左下",
          start: [38, 34],
          points: [
            [38, 34], [36, 46], [30, 60]
          ]
        },
        {
          index: 3,
          name: "豎彎",
          direction: "第 4 筆：框內豎彎，往下再往右",
          start: [56, 34],
          points: [
            [56, 34], [56, 54], [62, 58], [68, 58]
          ]
        },
        {
          index: 4,
          name: "橫",
          direction: "第 5 筆：底部一橫封口，由左往右",
          start: [22, 78],
          points: [
            [22, 78], [50, 78], [78, 78]
          ]
        }
      ]
    },
    "五": {
      character: "五",
      counterpart: "5",
      bpmf: "ㄨˇ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 4,
      dotsCount: 5,
      description: "五，共四筆：橫、豎、橫折、橫",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "第 1 筆：頂部短橫，由左往右",
          start: [20, 22],
          points: [
            [20, 22], [42, 22], [62, 22], [80, 22]
          ]
        },
        {
          index: 1,
          name: "豎",
          direction: "第 2 筆：斜向下一豎",
          start: [48, 22],
          points: [
            [48, 22], [45, 40], [42, 58], [38, 76]
          ]
        },
        {
          index: 2,
          name: "橫折",
          direction: "第 3 筆：中間橫折，由左往右折向下",
          start: [42, 46],
          points: [
            [42, 46], [58, 46], [72, 46], [72, 62], [72, 76]
          ]
        },
        {
          index: 3,
          name: "橫",
          direction: "第 4 筆：底部長橫封底，由左往右",
          start: [16, 76],
          points: [
            [16, 76], [38, 76], [62, 76], [84, 76]
          ]
        }
      ]
    },
    "六": {
      character: "六",
      counterpart: "6",
      bpmf: "ㄌㄧㄡˋ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 4,
      dotsCount: 6,
      description: "六，共四筆：點、橫、撇、點",
      strokes: [
        {
          index: 0,
          name: "點",
          direction: "第 1 筆：上方一點，由上往下",
          start: [50, 16],
          points: [
            [50, 16], [50, 24], [50, 30]
          ]
        },
        {
          index: 1,
          name: "橫",
          direction: "第 2 筆：長橫，由左往右",
          start: [16, 42],
          points: [
            [16, 42], [38, 42], [62, 42], [84, 42]
          ]
        },
        {
          index: 2,
          name: "撇",
          direction: "第 3 筆：左下撇，由右上往左下",
          start: [42, 54],
          points: [
            [42, 54], [36, 66], [24, 82]
          ]
        },
        {
          index: 3,
          name: "點",
          direction: "第 4 筆：右下點，由左上往右下",
          start: [62, 54],
          points: [
            [62, 54], [70, 66], [78, 80]
          ]
        }
      ]
    },
    "七": {
      character: "七",
      counterpart: "7",
      bpmf: "ㄑㄧ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 7,
      description: "七，共兩筆：橫（微右上斜）、豎彎鉤",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "第 1 筆：一橫微右上斜，由左往右",
          start: [18, 48],
          points: [
            [18, 48], [40, 46], [62, 44], [82, 42]
          ]
        },
        {
          index: 1,
          name: "豎彎鉤",
          direction: "第 2 筆：豎彎鉤，由上往下彎向右再往上鉤",
          start: [48, 20],
          points: [
            [48, 20], [48, 45], [48, 68], [56, 74], [68, 74], [72, 64]
          ]
        }
      ]
    },
    "八": {
      character: "八",
      counterpart: "8",
      bpmf: "ㄅㄚ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 8,
      description: "八，共兩筆：撇、捺（先左撇後右捺，中間不相碰）",
      strokes: [
        {
          index: 0,
          name: "撇",
          direction: "第 1 筆：撇，由右上往左下",
          start: [42, 28],
          points: [
            [42, 28], [36, 45], [28, 64], [18, 80]
          ]
        },
        {
          index: 1,
          name: "捺",
          direction: "第 2 筆：捺，由左上往右下",
          start: [56, 22],
          points: [
            [56, 22], [64, 42], [74, 62], [84, 80]
          ]
        }
      ]
    },
    "九": {
      character: "九",
      counterpart: "9",
      bpmf: "ㄐㄧㄡˇ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 9,
      description: "九，共兩筆：撇、橫折彎鉤（先撇後折）",
      strokes: [
        {
          index: 0,
          name: "撇",
          direction: "第 1 筆：撇，由右上往左下",
          start: [48, 18],
          points: [
            [48, 18], [44, 38], [38, 60], [28, 82]
          ]
        },
        {
          index: 1,
          name: "橫折彎鉤",
          direction: "第 2 筆：橫折彎鉤，由左往右折下再彎向右上方鉤",
          start: [28, 38],
          points: [
            [28, 38], [46, 38], [66, 38], [66, 52], [54, 74], [66, 78], [74, 76], [76, 64]
          ]
        }
      ]
    },
    "十": {
      character: "十",
      counterpart: "10",
      bpmf: "ㄕˊ",
      type: "hanzi",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 10,
      description: "十，共兩筆：橫、豎（先橫後豎）",
      strokes: [
        {
          index: 0,
          name: "橫",
          direction: "第 1 筆：一橫，由左往右",
          start: [16, 50],
          points: [
            [16, 50], [38, 50], [62, 50], [84, 50]
          ]
        },
        {
          index: 1,
          name: "豎",
          direction: "第 2 筆：一豎，由上往下",
          start: [50, 16],
          points: [
            [50, 16], [50, 38], [50, 62], [50, 84]
          ]
        }
      ]
    }
  };
});
