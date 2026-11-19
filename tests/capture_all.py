import os
from pathlib import Path
import fitz # PyMuPDF
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

    # ========================================================
    # 1. 介面截圖：1024x768 與 390x844 各一組
    # ========================================================
    for vp_name, vp in viewports:
        print(f'Capturing app screenshots for {vp_name}...')
        page = browser.new_page(viewport=vp)

        # 載入主頁面並略過第一次歡迎窗
        page.goto(index_url)
        page.wait_for_timeout(600)
        page.evaluate("if (typeof completeWelcome === 'function') completeWelcome(true);")
        page.wait_for_timeout(500)

        # 1. 地圖頁 (海圖、島嶼、航道、小船)
        page.screenshot(path=str(ss_dir / f'1_map_{vp_name}.png'))
        print(f'  Saved 1_map_{vp_name}.png')

        # 2. 點開一座島的關卡面板 (例如點開數字島 A)
        page.evaluate("openIslandModal('digits-a')")
        page.wait_for_timeout(400)
        page.screenshot(path=str(ss_dir / f'2_island_modal_{vp_name}.png'))
        print(f'  Saved 2_island_modal_{vp_name}.png')

        # 關閉面板
        page.evaluate("closeIslandModal()")
        page.wait_for_timeout(300)

        # 3. 數字 8 示範動畫中途
        page.evaluate("startPracticeLevel('8', 'digit'); replayDemo(0.4);")
        page.wait_for_timeout(700) # 動畫播放中途
        page.screenshot(path=str(ss_dir / f'3_digit8_demo_{vp_name}.png'))
        print(f'  Saved 3_digit8_demo_{vp_name}.png')

        # 4. 數字 7 描寫中
        page.evaluate("startPracticeLevel('7', 'digit'); advanceStep(3);")
        page.wait_for_timeout(400)
        canvas_box = page.locator('#stroke-canvas').bounding_box()
        if canvas_box:
            # 7 的第 0 筆在 100x100 網格為 [28, 18] -> [28, 32]
            size = min(canvas_box['width'], canvas_box['height'])
            x0 = canvas_box['x'] + (28 / 100) * size
            y0 = canvas_box['y'] + (18 / 100) * size
            x1 = canvas_box['x'] + (28 / 100) * size
            y1 = canvas_box['y'] + (26 / 100) * size
            page.mouse.move(x0, y0)
            page.mouse.down()
            page.mouse.move(x1, y1, steps=5)
            page.wait_for_timeout(300)
            page.screenshot(path=str(ss_dir / f'4_digit7_trace_{vp_name}.png'))
            page.mouse.up()
            print(f'  Saved 4_digit7_trace_{vp_name}.png')

        # 5. 國字四描寫中
        page.evaluate("startPracticeLevel('四', 'hanzi'); advanceStep(3);")
        page.wait_for_timeout(400)
        canvas_box = page.locator('#stroke-canvas').bounding_box()
        if canvas_box:
            # 四的第 0 筆為豎：[26, 22] -> [25, 48] -> [25, 78]
            size = min(canvas_box['width'], canvas_box['height'])
            x0 = canvas_box['x'] + (26 / 100) * size
            y0 = canvas_box['y'] + (22 / 100) * size
            x1 = canvas_box['x'] + (25.5 / 100) * size
            y1 = canvas_box['y'] + (50 / 100) * size
            page.mouse.move(x0, y0)
            page.mouse.down()
            page.mouse.move(x1, y1, steps=8)
            page.wait_for_timeout(300)
            page.screenshot(path=str(ss_dir / f'5_hanzi4_trace_{vp_name}.png'))
            page.mouse.up()
            print(f'  Saved 5_hanzi4_trace_{vp_name}.png')

        # 6. 「寫」步驟（田字格、無底字、只留起點綠點與位置錨定提示）
        page.evaluate("startPracticeLevel('四', 'hanzi'); advanceStep(4);")
        page.wait_for_timeout(400)
        page.screenshot(path=str(ss_dir / f'6_write_step_{vp_name}.png'))
        print(f'  Saved 6_write_step_{vp_name}.png')

        page.close()

    # ========================================================
    # 2. 列印版 PDF 匯出與驗證
    # ========================================================
    print('\nGenerating PDFs and checking page counts...')
    page = browser.new_page()

    # 2.1 數字 0-10 學習單
    page.goto(print_url + '?tab=digits')
    page.wait_for_timeout(800)
    pdf_digits = base_dir / 'tests' / 'print_digits.pdf'
    page.pdf(path=str(pdf_digits), format='A4', print_background=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    doc_digits = fitz.open(str(pdf_digits))
    print(f'  [PDF 1] 數字 0–10 學習單頁數: {len(doc_digits)} 頁')
    # 匯出截圖
    pix = doc_digits[0].get_pixmap(dpi=150)
    pix.save(str(ss_dir / 'print_digits_page1.png'))
    print(f'  Saved print_digits_page1.png')

    # 2.2 國字 一～十 學習單
    page.goto(print_url + '?tab=hanzi')
    page.wait_for_timeout(800)
    pdf_hanzi = base_dir / 'tests' / 'print_hanzi.pdf'
    page.pdf(path=str(pdf_hanzi), format='A4', print_background=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    doc_hanzi = fitz.open(str(pdf_hanzi))
    print(f'  [PDF 2] 國字 一～十 學習單頁數: {len(doc_hanzi)} 頁')
    pix = doc_hanzi[0].get_pixmap(dpi=150)
    pix.save(str(ss_dir / 'print_hanzi_page1.png'))
    print(f'  Saved print_hanzi_page1.png')

    # 2.3 數字接龍學習單（題目 1 頁、答案 1 頁）
    page.goto(print_url + '?tab=solitaire')
    page.wait_for_timeout(800)
    pdf_sol = base_dir / 'tests' / 'print_solitaire.pdf'
    page.pdf(path=str(pdf_sol), format='A4', print_background=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    doc_sol = fitz.open(str(pdf_sol))
    print(f'  [PDF 3] 數字接龍學習單頁數: {len(doc_sol)} 頁 (題目 1 頁 + 答案 1 頁)')
    pix_q = doc_sol[0].get_pixmap(dpi=150)
    pix_q.save(str(ss_dir / 'print_solitaire_q_page1.png'))
    print(f'  Saved print_solitaire_q_page1.png')
    pix_a = doc_sol[1].get_pixmap(dpi=150)
    pix_a.save(str(ss_dir / 'print_solitaire_a_page2.png'))
    print(f'  Saved print_solitaire_a_page2.png')

    browser.close()

print('\nAll captures and PDFs generated successfully!')
