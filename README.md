# Линия 911: Forest Road 2254

Хоррор с выживанием в реальном времени для Android. Ночь в зимнем лесу, одна полоска связи и голос
в трубке 911, которому нельзя верить.

- План работы: [docs/PLAN.md](docs/PLAN.md)
- Концепция: [docs/CONCEPT.md](docs/CONCEPT.md)

## Сборка

```
node tools/build.mjs        # собрать www/ и одностраничную версию dist/line911.html
node tests/scenes.test.mjs  # проверить сцены
python3 tests/play.py 20     # 20 автопрохождений в headless Chrome
```

APK собирается автоматически GitHub Actions при каждом пуше в `main`
— готовый файл лежит в **Releases** (`Прототип 0.1.N`) и в Actions → Artifacts → `line911-apk`.

## Звуки

SoundJay.com; OpenGameArt — bart (CC-BY 3.0), qubodup (CC-BY-SA 3.0), остальные CC0. Подробно — в `assets/audio/CREDITS.md`.
