# Браузерный автотест: случайные прохождения + скриншоты механик. Запуск: python3 tests/play.py [N]
import asyncio, sys, collections
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'
async def main():
    n=int(sys.argv[1]) if len(sys.argv)>1 else 30
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ends=collections.Counter(); errs=[]
        for i in range(n):
            ctx=await b.new_context(viewport={'width':390,'height':844}); pg=await ctx.new_page()
            pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(300)
            try:
                end=await asyncio.wait_for(pg.evaluate('window.__autoplay()'),120)
            except Exception as e: end='TIMEOUT/'+str(e)[:80]
            e2=await pg.evaluate('window.__ERR||[]'); errs+=e2
            ends[end]+=1; await ctx.close()
        print('Концовки:',dict(ends)); print('Ошибки:',errs[:8] if errs else 'нет')
        await b.close()
asyncio.run(main())
