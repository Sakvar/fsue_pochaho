# ФГУП «ПОЧАХО»

Браузерная нарративная игра про закрытый советский институт: бинарные решения, ресурсы, флаги последствий, локальное сохранение и PWA.

## Требования

- Node.js 20+ (рекомендуется 22)

## Установка и запуск локально

```bash
npm install
npm run dev
```

Сборка и предпросмотр продакшн-бандла:

```bash
npm run build
npm run preview
```

Тесты:

```bash
npm test
```

## PWA

После `npm run build` сервис-воркер и манифест генерируются в `dist/`. В режиме разработки PWA может вести себя иначе; проверяйте установку через `npm run preview` или продакшн-деплой.

В Telegram-режиме (см. ниже) регистрация сервис-воркера автоматически отключается, чтобы не конфликтовать с in-app браузером Telegram.

## Telegram Mini App

Игра запускается и в обычном браузере, и как Telegram Mini App из одной и той же сборки. При загрузке `src/telegram/init.ts` определяет, открыта ли страница внутри Telegram (`window.Telegram.WebApp.initData`), и подключает интеграцию:

- вызывает `WebApp.ready()` и `WebApp.expand()`,
- переносит `themeParams` в CSS-переменные (`--tg-bg`, `--tg-text`, …) и переключает палитру в тёмной теме Telegram,
- синхронизирует цвет шапки и фон Telegram с темой игры,
- отслеживает `themeChanged` и `viewportChanged` и обновляет `--tg-viewport-height`,
- использует `MainButton` как «Новое назначение» на экране финала,
- показывает `BackButton` на мобильной вкладке «Досье» (возврат к карточке),
- даёт лёгкий haptic при выборе и `notificationOccurred('warning')` при завершении забега.

В обычном браузере все эти ветки — no-op, так что поведение остаётся идентичным предыдущей версии.

### Локальная отладка

1. Запустите `npm run dev` и опубликуйте URL по HTTPS (например, через `cloudflared tunnel run` или `ngrok http 5173`).
2. Создайте бот через [@BotFather](https://t.me/BotFather), затем `/newapp` → укажите HTTPS-URL вашего туннеля.
3. Откройте мини-приложение через `t.me/<bot_username>/<short_name>` или нажмите кнопку у бота — Telegram подгрузит ту же страницу, что и браузер, но обнаружит SDK и активирует интеграцию.

### Прод

Боевой URL — это GitHub Pages-сборка (см. ниже). В BotFather укажите его в качестве Web App URL для бота. Скрипт `https://telegram.org/js/telegram-web-app.js` подключается из `index.html`; он безвреден в обычном браузере и обязателен внутри Telegram.

## Деплой на GitHub Pages

1. Создайте репозиторий (например `owner/fsue_pochaho`). Имя репозитория влияет на `base` Vite: в CI выставляется `GITHUB_REPOSITORY`, и приложение собирается под путь `/<имя-репозитория>/`.
2. Включите GitHub Pages: **Settings → Pages → Build and deployment → GitHub Actions**.
3. Пуш в ветку `main` запускает [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): тесты, `npm run build` с `GITHUB_REPOSITORY`, загрузка `dist` в Pages.
4. Если основная ветка не `main`, измените триггер в workflow.

Локально без префикса приложение доступно с корня (`base: '/'`). На Pages откройте URL вида `https://<user>.github.io/<repo>/`.

## Структура репозитория

- [`src/App.tsx`](src/App.tsx) — компоновка экрана
- [`src/components/`](src/components/) — UI: ресурсы, карточка, досье, штамп, финал
- [`src/game/`](src/game/) — логика: стор, движок карт, концовки, эффекты, досье-тексты
- [`src/data/cardContent.ts`](src/data/cardContent.ts) — каталог карточек (45 сцен)
- [`src/data/characters.ts`](src/data/characters.ts) — персонажи
- [`src/data/endings.ts`](src/data/endings.ts) — условия и тексты исходов
- [`src/telegram/`](src/telegram/) — интеграция с Telegram WebApp SDK
- [`src/styles/`](src/styles/) — глобальные стили и тема
- [`public/`](public/) — иконки PWA и favicon

## Идеи на будущее

- Аудио-атмосфера (телеграф, вентиляция, печатная машинка)
- Больше ветвлений и скрытых исходов
- Отдельный редактор контента (JSON/YAML) и валидация каталога
- Достижения и коллекция штампов
- Локализация интерфейса (EN) без потери русскоязычного тона карточек

## Лицензия

Проект создан как демонстрационный MVP; уточните лицензию при публичной публикации.
