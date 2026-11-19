/**
 * glyphs-digits.js
 * 數字 0-10 字形中線資料（田字格 100x100，字形約占格高 70%、置中）
 * 筆順依據：翰林版一年級數學課本
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GLYPHS_DIGITS = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    "0": {
      character: "0",
      counterpart: "零",
      counterpartBpmf: "ㄌㄧㄥˊ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 0,
      description: "0 是空空的盤子，一筆畫逆時針繞一圈",
      strokes: [
        {
          index: 0,
          name: "橢圓",
          direction: "由上方中間起筆，逆時針繞一圈回到起點",
          start: [50, 15],
          points: [
            [50, 15], [38, 18], [28, 28], [24, 42], [24, 58], [28, 72], [38, 82],
            [50, 85],
            [62, 82], [72, 72], [76, 58], [76, 42], [72, 28], [62, 18], [50, 15]
          ]
        }
      ]
    },
    "1": {
      character: "1",
      counterpart: "一",
      counterpartBpmf: "ㄧ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 1,
      description: "1 像小鉛筆，由上往下一豎",
      strokes: [
        {
          index: 0,
          name: "豎",
          direction: "由上往下一豎",
          start: [50, 15],
          points: [
            [50, 15], [50, 32], [50, 50], [50, 68], [50, 85]
          ]
        }
      ]
    },
    "2": {
      character: "2",
      counterpart: "二",
      counterpartBpmf: "ㄦˋ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 2,
      description: "2 像小鴨子，從左上彎到右上，斜向左下到底，再往右一橫",
      strokes: [
        {
          index: 0,
          name: "弧斜橫",
          direction: "從左上起筆，往右上彎出順時針弧線，斜向左下到底，再往右一橫",
          start: [30, 32],
          points: [
            [30, 32], [35, 22], [48, 16], [62, 18], [70, 28], [68, 42],
            [58, 54], [44, 68], [32, 78], [28, 85],
            [42, 85], [58, 85], [72, 85]
          ]
        }
      ]
    },
    "3": {
      character: "3",
      counterpart: "三",
      counterpartBpmf: "ㄙㄢ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 3,
      description: "3 像耳朵，從左上畫上半弧到中間，再畫下半弧到左下收筆",
      strokes: [
        {
          index: 0,
          name: "雙弧",
          direction: "從左上起筆，順時針畫上半弧到中間，再順時針畫下半弧，到左下收筆",
          start: [30, 26],
          points: [
            [30, 26], [42, 18], [60, 18], [70, 28], [68, 40], [54, 48], [48, 48],
            [60, 50], [72, 60], [72, 72], [62, 82], [48, 85], [30, 76]
          ]
        }
      ]
    },
    "4": {
      character: "4",
      counterpart: "四",
      counterpartBpmf: "ㄙˋ",
      type: "digit",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 4,
      description: "4 像小旗子，斜折橫、一豎穿過，上方開口不相連",
      strokes: [
        {
          index: 0,
          name: "斜折橫",
          direction: "從上方往左下斜，到底後轉向右一橫",
          start: [56, 16],
          points: [
            [56, 16], [42, 38], [24, 62], [48, 62], [76, 62]
          ]
        },
        {
          index: 1,
          name: "豎",
          direction: "右側一豎，由上往下穿過橫線",
          start: [62, 36],
          points: [
            [62, 36], [62, 50], [62, 65], [62, 85]
          ]
        }
      ]
    },
    "5": {
      character: "5",
      counterpart: "五",
      counterpartBpmf: "ㄨˇ",
      type: "digit",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 5,
      description: "5 是短豎加大肚子弧線，最後戴頂小帽子一橫",
      strokes: [
        {
          index: 0,
          name: "豎彎弧",
          direction: "從左上往下一短豎，接著往右繞出下方大弧（順時針），到左下收筆",
          start: [32, 22],
          points: [
            [32, 22], [32, 48], [48, 46], [68, 54], [72, 68], [62, 82], [46, 85], [30, 78]
          ]
        },
        {
          index: 1,
          name: "橫",
          direction: "上方一橫，從豎的頂端由左往右",
          start: [32, 22],
          points: [
            [32, 22], [52, 22], [70, 22]
          ]
        }
      ]
    },
    "6": {
      character: "6",
      counterpart: "六",
      counterpartBpmf: "ㄌㄧㄡˋ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 6,
      description: "6 像小哨子，從右上往左下彎到底，再繞出一個小圓圈",
      strokes: [
        {
          index: 0,
          name: "弧圈",
          direction: "從右上起筆，沿左側弧線往下，到底部後往右再往上，繞成下方小圈收筆",
          start: [66, 18],
          points: [
            [66, 18], [52, 22], [36, 34], [26, 52], [26, 70], [36, 84],
            [52, 85], [68, 80], [74, 68], [68, 54], [52, 50], [32, 58]
          ]
        }
      ]
    },
    "7": {
      character: "7",
      counterpart: "七",
      counterpartBpmf: "ㄑㄧ",
      type: "digit",
      gridType: "tian",
      strokeWidth: 9,
      strokesCount: 2,
      dotsCount: 7,
      description: "7 像柺杖，翰林版左上一小豎，接著一橫折斜向左下",
      strokes: [
        {
          index: 0,
          name: "小豎",
          direction: "左上一小豎，由上往下",
          start: [28, 18],
          points: [
            [28, 18], [28, 32]
          ]
        },
        {
          index: 1,
          name: "橫斜折",
          direction: "一橫由左往右，到右端轉斜向左下",
          start: [28, 32],
          points: [
            [28, 32], [50, 30], [72, 30], [58, 56], [44, 85]
          ]
        }
      ]
    },
    "8": {
      character: "8",
      counterpart: "八",
      counterpartBpmf: "ㄅㄚ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 8,
      description: "8 像雪人，從右上逆時針彎過頂，穿越中間交叉繞過底，再回到起點",
      strokes: [
        {
          index: 0,
          name: "雙迴圈",
          direction: "從右上起筆，往左繞過頂部（逆時針），經過中心往右下，順著右側往下繞過底部（順時針），從左側往上經過中心，回到起點",
          start: [58, 22],
          points: [
            [58, 22], [48, 16], [36, 22], [36, 32], [42, 40], [50, 48],
            [58, 56], [64, 62], [66, 74], [56, 84], [44, 84], [34, 74],
            [36, 62], [42, 56], [50, 48], [58, 40], [58, 22]
          ]
        }
      ]
    },
    "9": {
      character: "9",
      counterpart: "九",
      counterpartBpmf: "ㄐㄧㄡˇ",
      type: "digit",
      gridType: "tian",
      strokesCount: 1,
      dotsCount: 9,
      description: "9 像氣球，右上起筆逆時針繞一圈，再筆直往下一豎到底",
      strokes: [
        {
          index: 0,
          name: "圈豎",
          direction: "從右上起筆，逆時針繞一圈回到右上，再往下直直的寫到底",
          start: [68, 28],
          points: [
            [68, 28], [54, 18], [38, 24], [34, 38], [42, 50], [56, 52], [68, 42], [68, 28],
            [68, 52], [68, 70], [68, 85]
          ]
        }
      ]
    },
    "10": {
      character: "10",
      counterpart: "十",
      counterpartBpmf: "ㄕˊ",
      type: "digit",
      gridType: "tian",
      strokesCount: 2,
      dotsCount: 10,
      description: "10 是 1 和 0 的好朋友，先寫 1，再寫 0",
      strokes: [
        {
          index: 0,
          name: "一豎",
          direction: "左邊 1，由上往下",
          start: [30, 16],
          points: [
            [30, 16], [30, 50], [30, 84]
          ]
        },
        {
          index: 1,
          name: "橢圓",
          direction: "右邊 0，從上方起筆逆時針繞一圈回到起點",
          start: [68, 16],
          points: [
            [68, 16], [58, 20], [50, 34], [48, 50], [50, 66], [58, 80],
            [68, 84], [78, 80], [86, 66], [88, 50], [86, 34], [78, 20], [68, 16]
          ]
        }
      ]
    }
  };
});
