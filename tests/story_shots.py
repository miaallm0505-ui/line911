import asyncio
from playwright.async_api import async_playwright
OUT='/home/claude/shots/s'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        pg=await (await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/line911/dist/line911.html'); await pg.wait_for_timeout(400)
        await pg.click('#gf'); await pg.click('#go')
        shot=0; seen=set()
        for it in range(140):
            await pg.wait_for_timeout(250)
            m=await pg.query_selector('.mech')
            if m:
                cls=await m.get_attribute('class'); key=cls
                if key not in seen: seen.add(key); await pg.screenshot(path=f'{OUT}{shot:02d}_{cls.split()[-1]}.png'); shot+=1
                if 'dial' in cls:
                    for k in [8,0,0]:
                        ks=await pg.query_selector_all('.dk'); await ks[k].dispatch_event('pointerdown')
                    await pg.click('.dcall')
                elif 'dig' in cls:
                    for _ in range(40): await pg.mouse.click(195,600); await pg.wait_for_timeout(30)
                    await pg.wait_for_timeout(1500)
                elif 'freeze' in cls: await pg.wait_for_timeout(13000)
                elif 'ask' in cls: await pg.fill('.ask textarea','Кому ты записывала сообщение?'); await pg.click('.mf button')
                else:
                    bs=await m.query_selector_all('.mf button')
                    if bs: await bs[-1].click()
                await pg.wait_for_timeout(500); continue
            await pg.mouse.click(195,300)
            bs=[x for x in await pg.query_selector_all('#choices button') if await x.is_visible()]
            if bs:
                title=await bs[0].inner_text()
                if shot<14 and (it%3==0 or 'Тормоз' in title): await pg.screenshot(path=f'{OUT}{shot:02d}_story.png'); shot+=1
                # избегаем «Открыть дверь»
                pick=bs[1] if len(bs)>1 and 'Открыть' in title else bs[0]
                await pick.click()
            end=await pg.query_selector('.endcard')
            if end: await pg.screenshot(path=f'{OUT}{shot:02d}_end.png'); print('END', await end.inner_text()); break
        print('errors',errs[:5])
        await b.close()
asyncio.run(main())
