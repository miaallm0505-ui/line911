# Линия 911

Текстовый хоррор с выживанием для Android по сюжету Мии. Пятеро друзей из колледжа едут на длинные
выходные в большой дом в Адирондаках, в десяти милях от ближайшего посёлка. В посёлке по ночам
не выходят из дома. Им об этом никто не сказал.

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
