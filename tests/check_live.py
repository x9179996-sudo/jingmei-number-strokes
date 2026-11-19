import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "https://x9179996-sudo.github.io/jingmei-number-strokes"

RESOURCES = [
    ("index.html", f"{BASE_URL}/index.html"),
    ("print.html", f"{BASE_URL}/print.html"),
    ("engine/stroke-engine.js", f"{BASE_URL}/engine/stroke-engine.js"),
    ("data/glyphs-digits.js", f"{BASE_URL}/data/glyphs-digits.js"),
    ("data/glyphs-hanzi.js", f"{BASE_URL}/data/glyphs-hanzi.js"),
    ("fonts/BpmfIansui.woff2", f"{BASE_URL}/fonts/BpmfIansui.woff2"),
]

def check_live():
    print("=" * 70)
    print("   GitHub Pages 上線檢驗 (Live Verification)")
    print(f"   網址: {BASE_URL}/")
    print("=" * 70)

    print("\n【1. 資源 HTTP 狀態碼檢測】")
    print("-" * 70)
    all_200 = True
    for name, url in RESOURCES:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req) as resp:
                code = resp.getcode()
                status = "PASS" if code == 200 else "FAIL"
                print(f"  [{status}] HTTP {code} - {name:24s} ({url})")
                if code != 200:
                    all_200 = False
        except Exception as e:
            print(f"  [FAIL] 連線錯誤 - {name:24s}: {e}")
            all_200 = False

    print("\n【2. Playwright 瀏覽器開啟與 Console 錯誤檢測】")
    print("-" * 70)

    console_errors = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1024, "height": 768})

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        live_index_url = f"{BASE_URL}/index.html"
        page.goto(live_index_url)
        page.wait_for_timeout(1000)

        total_errors = len(console_errors) + len(page_errors)
        print(f"  Console 錯誤訊息筆數: {total_errors} 筆")
        if total_errors == 0:
            print("  [PASS] 開啟 index.html 後無任何 console 錯誤！")
        else:
            for err in console_errors + page_errors:
                print(f"  [FAIL] Error: {err}")

        print("\n【3. 注音字型 (BpmfIansui) 載入狀態檢測】")
        print("-" * 70)
        page.evaluate("() => document.fonts.ready")
        font_status = page.evaluate("() => document.fonts.status")
        font_check = page.evaluate("() => document.fonts.check('20px BpmfIansui')")
        print(f"  document.fonts.status: {font_status}")
        print(f"  document.fonts.check('20px BpmfIansui'): {font_check}")
        if font_check:
            print("  [PASS] 注音字型 BpmfIansui 成功載入並可正常渲染！")
        else:
            print("  [FAIL] 注音字型未就緒")

        print("\n【4. 截取上線版地圖頁截圖 (1024×768，略過歡迎視窗)】")
        print("-" * 70)
        # 若有歡迎彈窗，點擊「略過」
        skip_btn = page.query_selector("#first-time-modal button:has-text('略過'), #first-time-modal button.btn-secondary")
        if skip_btn:
            skip_btn.click()
            print("  已點擊「略過」關閉歡迎視窗")
            page.wait_for_timeout(600)
        else:
            page.evaluate("() => { const m = document.getElementById('first-time-modal'); if (m) m.classList.remove('active'); }")

        # 確保島名定位更新
        page.evaluate("() => { if (typeof positionIslandBadges === 'function') positionIslandBadges(); }")
        page.wait_for_timeout(400)

        base_dir = Path(__file__).resolve().parent.parent
        ss_dir = base_dir / "tests" / "screenshots"
        ss_dir.mkdir(parents=True, exist_ok=True)
        live_ss_path = ss_dir / "live_map_1024x768.png"
        page.screenshot(path=str(live_ss_path))
        print(f"  [PASS] 上線版地圖截圖儲存至: {live_ss_path}")

        browser.close()

    print("\n" + "=" * 70)
    if all_200 and total_errors == 0:
        print("上線檢驗結果：全部合格 (ALL CHECKS PASSED)！網站已順利於 GitHub Pages 發布！")
    else:
        print("上線檢驗結果：部分項目待確認！")
    print("=" * 70)

    if not (all_200 and total_errors == 0):
        sys.exit(1)

if __name__ == "__main__":
    check_live()
