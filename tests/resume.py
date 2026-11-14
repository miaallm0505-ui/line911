# «Продолжить» посреди сцены: играем N шагов, перезагружаем страницу (= вышли из игры), жмём «Продолжить».
# Ожидается: тот же текст на экране, та же сцена, вещи не задвоились, игра идёт дальше до конца без ошибок.
import asyncio, sys
from playwright.async_api import async_playwright
URL='file:///home/claude/line911/dist/line911.html'
async def step(pg, choice=0):
    if await pg.evaluate("!!document.querySelector('.endcard')"): return 'end'
    if await pg.evaluate("!!document.querySelector('.more.on')"): await pg.click('#log'); await pg.wait_for_timeout(120); return 'tap'
    ch=await pg.evaluate("document.querySelectorAll('#choices button').length")
    if ch: await pg.click(f'#choices button >> nth={min(choice,ch-1)}'); await pg.wait_for_timeout(150); return 'choice'
    if await pg.evaluate("!!document.querySelector('.endcard')"): return 'end'
    await pg.wait_for_timeout(150); return 'wait'
async def run(cut, choice):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx=await b.new_context(viewport={'width':390,'height':844}); pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('#go'); await pg.wait_for_timeout(300)
        n=0
        while n<cut:
            r=await step(pg, choice)
            if r in ('tap','choice'): n+=1
            if r=='end': break
        await pg.wait_for_timeout(1300)
        before=await pg.evaluate("[document.querySelector('#log').innerText.trim().slice(-160), window.__state ? window.__state().scene : '', JSON.stringify(window.__state().inv)]")
        await pg.reload(); await pg.wait_for_timeout(400)
        hasCont=await pg.evaluate("!document.querySelector('#cont').hidden")
        await pg.click('#cont'); await pg.wait_for_timeout(1500)
        after=await pg.evaluate("[document.querySelector('#log').innerText.trim().slice(-160), window.__state().scene, JSON.stringify(window.__state().inv)]")
        same = before[0]==after[0] and before[1]==after[1] and before[2]==after[2]
        k=0
        while k<600:
            r=await step(pg, choice); k+=1
            if r=='end': break
        print(f'вышли после {cut:3} действий | «Продолжить» есть: {hasCont} | то же место: {same} | сцена {after[1]} | дошли до конца: {r=="end"} | ошибки: {errs or "нет"}')
        if not same: print('   ДО:', before, '\n   ПОСЛЕ:', after)
        await b.close()
async def main():
    for cut,ch in ((4,0),(13,1),(22,2),(31,0),(40,1)): await run(cut,ch)
asyncio.run(main())
