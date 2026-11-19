import os
from pathlib import Path
from playwright.sync_api import sync_playwright

base_dir = Path(__file__).resolve().parent.parent
ss_dir = base_dir / 'tests' / 'screenshots'
ss_dir.mkdir(parents=True, exist_ok=True)

index_url = (base_dir / 'index.html').as_uri()
print_url = (base_dir / 'print.html').as_uri()

viewports = [
    ('1024x768', {'width': 1024, 'height': 768}),
    ('390x844', {'width': 390, 'height': 844})
]

with sync_playwright() as p:
    browser = p.chromium.launch()

    for vp_name, vp in viewports:
        print(f'Capturing for {vp_name}...')
        page = browser.new_page(viewport=vp)
        
        # 1. 地圖頁 (Map)
        page.goto(index_url)
        page.wait_for_timeout(1000)
        page.screenshot(path=str(ss_dir / f'1_map_{vp_name}.png'))

        # 2. 數字 8 示範動畫中途 (Digit 8 demo mid-animation)
        page.evaluate("startPracticeLevel('8', 'digit')")
        page.wait_for_timeout(400)
        page.evaluate("replayDemo(0.4)")
        page.wait_for_timeout(700) # 動畫播放中途
        page.screenshot(path=str(ss_dir / f'2_digit8_demo_{vp_name}.png'))

        # 3. 國字九 描寫中 (Hanzi 九 tracing)
        page.evaluate("startPracticeLevel('九', 'hanzi')")
        page.wait_for_timeout(400)
        # 進入第 3 步驟（描）
        page.evaluate("advanceStep(3)")
        page.wait_for_timeout(400)
        canvas_box = page.locator('#stroke-canvas').bounding_box()
        if canvas_box:
            size = min(canvas_box['width'], canvas_box['height'])
            x0 = canvas_box['x'] + (48 / 100) * size
            y0 = canvas_box['y'] + (18 / 100) * size
            x1 = canvas_box['x'] + (38 / 100) * size
            y1 = canvas_box['y'] + (55 / 100) * size
            page.mouse.move(x0, y0)
            page.mouse.down()
            page.mouse.move(x1, y1, steps=10)
            page.wait_for_timeout(300)
            page.screenshot(path=str(ss_dir / f'3_hanzi9_trace_{vp_name}.png'))
            page.mouse.up()

        # 4. 接龍題 (Solitaire)
        page.evaluate("startSolitaireLevel(1)")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ss_dir / f'4_solitaire_{vp_name}.png'))

        # 5. 家長專區 (Parent Zone)
        page.evaluate("openParentModal()")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ss_dir / f'5_parent_zone_{vp_name}.png'))

        page.close()

    # 截取 print.html 各學習單
    print('Capturing print worksheets...')
    page = browser.new_page(viewport={'width': 1024, 'height': 1200})
    
    # 數字 0-10 學習單
    page.goto(print_url + '?tab=digits')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(ss_dir / 'print_digits_worksheet.png'), full_page=True)

    # 國字 一～十 學習單
    page.goto(print_url + '?tab=hanzi')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(ss_dir / 'print_hanzi_worksheet.png'), full_page=True)

    # 數字接龍學習單
    page.goto(print_url + '?tab=solitaire')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(ss_dir / 'print_solitaire_worksheet.png'), full_page=True)

    browser.close()

print('Screenshots captured successfully!')
