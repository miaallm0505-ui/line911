# Скриншоты 3D-сцены в разных ракурсах: python3 tests/shots3d.py
import asyncio
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.click('#lab'); await pg.wait_for_timeout(500)
        await pg.click('.lcard button'); await pg.wait_for_timeout(9000)
        shots=[('a_front',0,-.1),('b_left',1.3,-.15),('c_right',-1.2,-.3),('d_down',.0,-.6),('e_seat',-1.6,-.55)]
        for n,y,pt in shots:
            await pg.evaluate(f"window.__stage.lookAt({y},{pt})"); await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f'/home/claude/shots/3d_{n}.png')
        await pg.evaluate("window.__stage.car.state.match=1; window.__stage.car.state.headlights=false; window.__stage.lookAt(0,-.25)"); await pg.wait_for_timeout(1800)
        await pg.screenshot(path='/home/claude/shots/3d_f_match.png')
        print('ошибки:', errs[:6] or 'нет')
        await b.close()
asyncio.run(main())
