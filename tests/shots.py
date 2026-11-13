# Скриншоты механик для визуальной проверки
import asyncio
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'; OUT='/home/claude/shots/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=False); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'00_start.png')
        await pg.click('#lab'); await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+'01_lab.png')
        async def run(i,name,act=None,wait=900):
            btns=await pg.query_selector_all('.lcard button'); await btns[i].click(); await pg.wait_for_timeout(wait)
            if act: await act()
            await pg.screenshot(path=OUT+f'{i+2:02d}_{name}.png')
            # закрыть оверлей механики (последний .mech, не лаборатория)
            for _ in range(3):
                ms=await pg.query_selector_all('.mech'); 
                if len(ms)<=1: break
                top=ms[-1]; bs=await top.query_selector_all('.mf button')
                if bs: await bs[-1].click()
                else: await pg.evaluate("document.querySelectorAll('.mech')[document.querySelectorAll('.mech').length-1].remove()")
                await pg.wait_for_timeout(400)
        async def wipe():
            for y in range(560,760,24):
                await pg.mouse.move(110,y); await pg.mouse.down()
                for x in range(110,300,20): await pg.mouse.move(x,y)
                await pg.mouse.up()
            await pg.wait_for_timeout(500)
        async def dial():
            for k in '911':
                ks=await pg.query_selector_all('.dk'); await ks[{'9':8,'1':0}[k]].dispatch_event('pointerdown')
        async def taps():
            for _ in range(15): await pg.mouse.click(195,600); await pg.wait_for_timeout(40)
        async def strike():
            await pg.mouse.move(90,400); await pg.mouse.down(); 
            for x in range(90,330,30): await pg.mouse.move(x,400+ (x-90)*0.5)
            await pg.mouse.up(); await pg.wait_for_timeout(500)
        async def beam(): 
            await pg.mouse.move(270,560); await pg.mouse.down(); await pg.mouse.move(280,540); await pg.wait_for_timeout(500)
        async def crank():
            import math
            await pg.mouse.move(195+100,380); await pg.mouse.down()
            for k in range(60): a=k/8; await pg.mouse.move(195+100*math.cos(a),380+100*math.sin(a))
            await pg.mouse.up()
        async def tune():
            await pg.mouse.move(300,300); await pg.mouse.down(); await pg.mouse.move(150,300,steps=10); await pg.mouse.up(); await pg.wait_for_timeout(400)
        async def tri():
            pts=[(120,650),(195,470),(270,650),(120,650)]
            await pg.mouse.move(*pts[0]); await pg.mouse.down()
            for a,bb in zip(pts,pts[1:]):
                for t in range(1,11): await pg.mouse.move(a[0]+(bb[0]-a[0])*t/10,a[1]+(bb[1]-a[1])*t/10)
            await pg.mouse.up(); await pg.wait_for_timeout(300)
        await run(1,'frost',wipe,1200)
        await run(2,'sigil',tri)
        await run(3,'dialer',dial)
        await run(6,'freeze',None,1500)
        await run(7,'dig',taps)
        await run(8,'match',strike)
        await run(10,'flashlight',beam,700)
        await run(11,'diary',beam,700)
        await run(12,'crank',crank)
        await run(13,'radio',tune)
        await run(14,'ladder')
        await run(15,'items')
        await run(16,'blizzard',None,1500)
        await run(0,'realtime',None,2500)
        print('errors',errs[:5])
        await b.close()
asyncio.run(main())
