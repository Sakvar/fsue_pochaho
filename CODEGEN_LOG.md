# Code Generation Log

## Rule

After every code generation or code edit, record what changed in this file.

Each entry should be short and include:

- date;
- code change;
- gameplay change;
- verification run, if any.

## Entries

### 2026-07-09

- Код: добавлены статусы заказа и задач, причины простоя, контроль сырья и срока, остановка резака от износа, HUD-диагностика и закреплённая версия Node.js.
- Игра: производство объясняет блокировки, не принимает невыполнимое расширение плана и завершает заказ успехом либо срывом срока.
- Проверка: 10 тестов `npm test`, `npm run build`, `git diff --check`, визуальная и интерактивная проверка в браузере.

### 2026-07-09

- Документация: актуализирован roadmap в `docs/game-concept.md`, добавлены текущее состояние, восемь спринтов и критерии готовности.
- Игра: без изменений; план ближайшего релиза сфокусирован на завершении MVP 0.1 и плейтестах.
- Проверка: `git diff --check`; изменение только документационное.

### 2026-07-09

- Files changed: `CODEGEN_LOG.md`
- Change: added the standing rule to log code generation and edits here.
- Verification: not run; documentation-only change.

### 2026-07-09

- Код: вынес производственные задачи в отдельный каталог правил и добавил операции ОТК/переделки.
- Игра: корпус теперь не сразу становится готовой продукцией после сборки; его проверяет ОТК, а часть изделий возвращается на переделку.
- Проверка: `npm test`, `npm run build`.
