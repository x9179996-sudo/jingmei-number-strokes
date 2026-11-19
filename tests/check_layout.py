import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

def run_layout_check():
    base_dir = Path(__file__).resolve().parent.parent
    html_path = (base_dir / "index.html").as_uri()

    viewports = [
        {"name": "桌面大螢幕 / 平板 (1024×768)", "width": 1024, "height": 768},
        {"name": "手機版 (390×844)", "width": 390, "height": 844}
    ]

    badge_ids = [
        "badge-digits-a",
        "badge-digits-b",
        "badge-hanzi-a",
        "badge-hanzi-b",
        "badge-solitaire"
    ]

    mobile_island_ids = [
        "svg-island-digits-a-mob",
        "svg-island-digits-b-mob",
        "svg-island-hanzi-a-mob",
        "svg-island-hanzi-b-mob",
        "svg-island-solitaire-mob"
    ]

    all_passed = True

    print("=" * 70)
    print("   海圖佈局與島名防裁切自動化檢查 (Layout & Island Label Check)")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for vp in viewports:
            print(f"\n【解析度測試】{vp['name']} — 視窗尺寸: {vp['width']} x {vp['height']}")
            print("-" * 70)

            page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
            page.goto(html_path)
            # 等候字型與版面完全就緒
            page.wait_for_timeout(600)
            page.evaluate("() => { if (typeof positionIslandBadges === 'function') positionIslandBadges(); }")
            page.wait_for_timeout(200)

            container = page.query_selector(".chart-container")
            if not container:
                print("  [FAIL] 找不到 .chart-container 海圖容器")
                all_passed = False
                page.close()
                continue

            c_info = container.evaluate("""el => {
                const r = el.getBoundingClientRect();
                return { left: r.left, right: r.right, width: r.width };
            }""")
            c_left = round(c_info["left"], 1)
            c_right = round(c_info["right"], 1)
            print(f"  海圖容器 (.chart-container) 座標邊界: left={c_left}, right={c_right}, width={round(c_info['width'], 1)}")

            print("  --- 各島名標籤元素檢測 ---")
            for b_id in badge_ids:
                badge = page.query_selector(f"#{b_id}")
                if not badge:
                    print(f"  [FAIL] 找不到元素 #{b_id}")
                    all_passed = False
                    continue

                data = badge.evaluate("""el => {
                    const r = el.getBoundingClientRect();
                    return {
                        text: el.innerText.trim(),
                        scrollWidth: el.scrollWidth,
                        clientWidth: el.clientWidth,
                        left: r.left,
                        right: r.right
                    };
                }""")

                text = data["text"]
                sw = data["scrollWidth"]
                cw = data["clientWidth"]
                b_left = round(data["left"], 1)
                b_right = round(data["right"], 1)

                pass_scroll = (sw <= cw)
                pass_left = (b_left >= c_left - 0.5)
                pass_right = (b_right <= c_right + 0.5)

                if pass_scroll and pass_left and pass_right:
                    status = "PASS"
                else:
                    status = "FAIL"
                    all_passed = False

                print(f"  [{status}] {text:18s} | scrollWidth={sw:3d}, clientWidth={cw:3d} | "
                      f"島名 left={b_left:6.1f}, right={b_right:6.1f} | 容器 [left={c_left:6.1f}, right={c_right:6.1f}]")

            # 390×844 時，再印出每座島主要路徑的 fill 屬性值（不能是 none 或透明）
            if vp["width"] == 390:
                print("\n  --- 手機版 (390×844) 島嶼主要路徑填色 (fill) 檢測 ---")
                for mob_id in mobile_island_ids:
                    island_el = page.query_selector(f"#{mob_id}")
                    if not island_el:
                        print(f"  [FAIL] 找不到手機島嶼元素 #{mob_id}")
                        all_passed = False
                        continue

                    path_info = island_el.evaluate("""el => {
                        const path = el.querySelector('path');
                        if (!path) return null;
                        const comp = window.getComputedStyle(path).fill;
                        return {
                            fillAttr: path.getAttribute('fill'),
                            computedFill: comp
                        };
                    }""")

                    if not path_info:
                        print(f"  [FAIL] 手機島嶼 #{mob_id} 找不到主要路徑 (path)")
                        all_passed = False
                        continue

                    fill_attr = path_info["fillAttr"]
                    computed = path_info["computedFill"]

                    is_valid = (
                        fill_attr not in [None, "", "none", "transparent"] and
                        "none" not in computed and
                        "rgba(0, 0, 0, 0)" not in computed
                    )

                    if is_valid:
                        p_status = "PASS"
                    else:
                        p_status = "FAIL"
                        all_passed = False

                    print(f"  [{p_status}] 島嶼 #{mob_id:24s} | fill 屬性值='{fill_attr}' | computed='{computed}'")

            page.close()

        browser.close()

    print("\n" + "=" * 70)
    if all_passed:
        print("檢測結果：全部通過 (ALL CHECKS PASSED)！島名完全在容器邊界內，無文字裁切，手機島嶼填色完整！")
    else:
        print("檢測結果：存在未通過項目 (SOME CHECKS FAILED)！")
    print("=" * 70)

    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    run_layout_check()
