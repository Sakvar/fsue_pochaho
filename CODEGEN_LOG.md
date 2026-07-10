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

- Files changed: `CODEGEN_LOG.md`
- Change: added the standing rule to log code generation and edits here.
- Verification: not run; documentation-only change.

### 2026-07-09

- Код: вынес производственные задачи в отдельный каталог правил и добавил операции ОТК/переделки.
- Игра: корпус теперь не сразу становится готовой продукцией после сборки; его проверяет ОТК, а часть изделий возвращается на переделку.
- Проверка: `npm test`, `npm run build`.
