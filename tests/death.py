# Смерть посреди сцены: сцена идёт в обычном темпе, через N секунд роняем температуру тела.
# Ожидается: сцена обрывается концовкой «холод» в течение ~1 с, оверлеев не остаётся.
import asyncio, time
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for scene, delay in (('car0', 3000), ('dial', 6000), ('knock', 4000), ('pipe', 2000), ('mimic', 5000)):
            pg=await b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(300)
            await pg.evaluate(f"(()=>{{window.__SLOW=1; window.__autoplay('{scene}').then(e=>window.__E=e); return 1}})()")
            await pg.wait_for_timeout(delay)
            at=await pg.evaluate("window.__state().scene")
            await pg.evaluate("window.__state().core=86"); t0=time.time()
            while time.time()-t0<8 and not await pg.evaluate("window.__E||null"): await pg.wait_for_timeout(100)
            end=await pg.evaluate("window.__E||'не оборвалось'"); mech=await pg.evaluate("document.querySelectorAll('.mech').length")
            print(f'{at:6} → {end:14} за {time.time()-t0:.1f} с | оверлеев {mech} | ошибки: {errs or "нет"}', flush=True)
            await pg.close()
        await b.close()
asyncio.run(main())
