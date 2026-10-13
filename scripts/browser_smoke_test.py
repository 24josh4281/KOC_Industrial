from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];checks=[];errors=[]
with sync_playwright() as p:
 import os
 executable=os.environ.get('CHROMIUM_EXECUTABLE')
 browser=p.chromium.launch(executable_path=executable,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((R/'preview/dashboard.html').read_text(encoding='utf-8'))
 page.wait_for_selector('.kpi')
 vals=page.locator('.kpi strong').all_text_contents();assert vals==['9','7','2','3','5','1'],vals;checks.append('default KPI values')
 page.screenshot(path=str(R/'verification/web-dashboard.png'),full_page=True)
 page.select_option('#scope','industry_transition');assert page.locator('.kpi strong').first.inner_text()=='10';checks.append('industry + transition filter')
 page.select_option('#scope','industry')
 page.click('button[data-tab="methods"]');assert page.locator('tbody tr').count()==9;checks.append('methodology list')
 page.locator('button.detail').first.click();assert page.locator('dialog').is_visible();assert '01' in page.locator('dialog').inner_text();page.click('#close');checks.append('version detail dialog')
 page.click('button[data-tab="reviews"]');assert page.locator('tbody tr').count()==9;checks.append('application list')
 page.click('button[data-tab="quality"]');assert '최초 등록연도 미확인' in page.locator('#root').inner_text();checks.append('quality warnings')
 page.click('button[data-tab="overview"]')
 page.locator('#upload').set_input_files(str(R/'data/templates/empty.dataset.json'))
 page.wait_for_function("document.querySelector('.kpi strong').textContent === '자료 미확보'")
 assert all(x=='자료 미확보' for x in page.locator('.kpi strong').all_text_contents());checks.append('empty production dataset is missing, not zero')
 page.click('#reset');page.set_viewport_size({'width':390,'height':900});page.screenshot(path=str(R/'verification/web-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile horizontal overflow';checks.append('mobile width no overflow')
 assert not errors,errors
 browser.close()
(R/'verification/browser-tests.json').write_text(json.dumps({'status':'passed','checks':checks,'console_page_errors':errors},ensure_ascii=False,indent=2))
print(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
