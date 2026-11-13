# Играет как человек: тапает «далее», выбирает первый вариант, открывает вещи. Скриншоты ключевых моментов.
import asyncio
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'
OUT='/home/claude/shots/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(400)
        await pg.click('#go'); await pg.wait_for_timeout(600)
        n=0; shots=0; seen=set()
        for step in range(400):
            more=await pg.evaluate("!!document.querySelector('.more.on')")
            ch=await pg.evaluate("[...document.querySelectorAll('#choices button')].map(b=>b.innerText)")
            mech=await pg.evaluate("document.querySelector('.mech .mh b')?.textContent||''")
            scrollInfo=await pg.evaluate("(()=>{const l=document.querySelector('#log');return [l.scrollTop,l.scrollHeight,l.clientHeight]})()")
            key=None
            if step in (3,8): key=f'read{step}'
            if ch and 'Тормоз!' in ch[0]: key='timed'
            if ch and any('Вещи' in c for c in ch) and 'roam' not in seen: key='roam'
            if key and key not in seen:
                seen.add(key); await pg.screenshot(path=OUT+f'st_{len(seen):02d}_{key}.png')
            if mech:
                await pg.screenshot(path=OUT+f'st_m_{mech[:6]}.png') if mech not in seen else None; seen.add(mech)
                await pg.evaluate("document.querySelector('.mech .mf button:last-child')?.click()"); await pg.wait_for_timeout(500); continue
            if more: await pg.click('#log'); await pg.wait_for_timeout(250); continue
            if ch:
                if 'roam' in seen and 'inv' not in seen and any('Вещи' in c for c in ch):
                    await pg.click('#choices button:has-text("Вещи")'); await pg.wait_for_timeout(500)
                    await pg.screenshot(path=OUT+'st_inv.png'); seen.add('inv')
                    await pg.evaluate("document.querySelector('.mech .mf button:last-child')?.click()"); await pg.wait_for_timeout(400); continue
                await pg.click('#choices button >> nth=0'); await pg.wait_for_timeout(300); continue
            end=await pg.evaluate("!!document.querySelector('.endcard')")
            if end: await pg.screenshot(path=OUT+'st_end.png'); break
            await pg.wait_for_timeout(300)
        print('шагов', step, 'ошибки:', errs or 'нет', 'кадры:', sorted(seen))
        await b.close()
asyncio.run(main())
