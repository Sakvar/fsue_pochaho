import Phaser from 'phaser';
import config from './game/phaserConfig';
import { BUILD_TOOL_LABELS, type BuildTool } from './content/catalog';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root not found');
}

const toolButtons = (Object.keys(BUILD_TOOL_LABELS) as BuildTool[])
  .map((tool) => `<button type="button" class="tool-btn" data-tool="${tool}">${BUILD_TOOL_LABELS[tool]}</button>`)
  .join('');

root.innerHTML = `
  <main class="shell">
    <section id="game-root" class="game-root" aria-label="Карта предприятия">
      <header class="game-topbar">
        <div class="game-brand"><span class="brand-mark">П</span><div><small>ФГУП</small><strong>«ПОЧАХО»</strong></div></div>
        <div class="top-resource"><small>ДЕНЬ / ВРЕМЯ</small><b id="top-time">1 · 08:00</b></div>
        <div class="top-resource"><small>БЮДЖЕТ</small><b id="top-funds">650</b></div>
        <div class="top-resource"><small>РЕПУТАЦИЯ</small><b id="top-reputation">58</b></div>
        <div class="top-resource top-order"><small>ТЕКУЩАЯ ЦЕЛЬ</small><b id="top-order">Выберите контракт</b></div>
        <div class="time-controls">
          <button id="btn-pause" class="icon-button primary" type="button" title="Пауза (Space)">Ⅱ</button>
          <button id="btn-speed" class="speed-button" type="button">×1</button>
          <button class="system-menu-button" type="button" data-panel="system" title="Меню игры" aria-label="Меню игры">☰</button>
        </div>
      </header>

      <div class="map-chrome map-title">
        <span class="signal"></span><div><small>КОРПУС 01 · СМЕНА ДЕНЬ</small><strong>Производственная площадка</strong></div>
      </div>
      <div class="map-chrome map-hint">ЛКМ · ИНСТРУМЕНТ ДИРЕКТОРА</div>

      <div id="game-panels" class="game-panels">
        <aside class="game-panel" data-panel-content="overview" aria-label="Сводка">
          <header><div><small>ДИРЕКЦИЯ</small><h1>Сводка предприятия</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <div id="onboarding" class="onboarding"></div>
          <section class="panel status-panel"><h2><span>Оперативная сводка</span><em>LIVE</em></h2><div id="status"></div></section>
          <section id="issues-panel" class="panel issues-panel" hidden><h2><span>Причины простоя</span><small>ТРЕБУЕТ РЕШЕНИЯ</small></h2><div id="issues"></div><button id="btn-replan" type="button">Перепланировать наряды</button></section>
          <section class="panel log-panel"><h2><span>Журнал</span><small>ПОСЛЕДНИЕ</small></h2><div id="log"></div></section>
        </aside>

        <aside class="game-panel" data-panel-content="contracts" aria-label="Контракты">
          <header><div><small>ПЛАНОВЫЙ ОТДЕЛ</small><h1>Контракты</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <section class="panel"><h2><span>Доступные заказы</span><small>ПРИНЯТЬ → АВАНС</small></h2><div id="contracts"></div></section>
        </aside>

        <aside class="game-panel wide-panel" data-panel-content="staff" aria-label="Персонал">
          <header><div><small>ОТДЕЛ КАДРОВ</small><h1>Персонал</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <section class="panel"><h2><span>Личный состав</span><small>КЛИК → ВЫБРАТЬ НА КАРТЕ</small></h2><div id="staff"></div></section>
          <section class="panel"><h2><span>Кандидаты</span><small>НАЙМ</small></h2><div id="hire"></div></section>
        </aside>

        <aside class="game-panel" data-panel-content="production" aria-label="Производство">
          <header><div><small>ДИСПЕТЧЕРСКАЯ</small><h1>Производство</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <div class="controls">
            <button id="btn-parts" type="button">＋ Запчасти</button><button id="btn-upgrade" type="button">⬆ Модерн. Р-17</button>
            <button id="btn-scrap" type="button">Списать брак</button><button id="btn-break" class="danger" type="button">⚠ Авария Р-17</button>
          </div>
          <section class="panel"><h2><span>Наряды</span><small>ТЕКУЩАЯ СМЕНА</small></h2><div id="tasks"></div></section>
        </aside>

        <aside class="game-panel" data-panel-content="build" aria-label="Строительство">
          <header><div><small>УПРАВЛЕНИЕ КАПСТРОЯ</small><h1>Строительство</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <section class="panel tools-panel"><h2><span>Инструменты</span><small>ВЫБЕРИТЕ И КЛИКНИТЕ НА КАРТУ</small></h2><div id="tools" class="tools">${toolButtons}</div></section>
        </aside>

        <aside class="game-panel" data-panel-content="system" aria-label="Меню игры">
          <header><div><small>СИСТЕМА</small><h1>Меню игры</h1></div><button class="panel-close" data-close-panel type="button" aria-label="Закрыть">×</button></header>
          <nav id="session-controls" class="session-controls" aria-label="Управление игрой">
            <button id="btn-save" type="button">Сохранить игру</button><button id="btn-load" type="button">Загрузить игру</button><button id="btn-new" class="danger" type="button">Начать заново</button>
          </nav>
        </aside>
      </div>

      <div class="command-console">
        <aside id="selection-drawer" class="selection-drawer" aria-label="Информационная панель">
          <div class="info-caption"><span>ИНФОРМАЦИЯ</span><button class="selection-close" data-close-selection type="button" aria-label="Снять выделение">×</button></div>
          <div id="selection" class="muted">Загрузка состояния предприятия…</div>
        </aside>

        <nav class="game-menu" aria-label="Основные разделы">
          <button type="button" data-panel="overview" aria-label="Сводка"><span>⌂</span><b>Сводка</b></button>
          <button type="button" data-panel="contracts" aria-label="Контракты"><span>▤</span><b>Контракты</b></button>
          <button type="button" data-panel="production" aria-label="Работа"><span>⚙</span><b>Работа</b></button>
          <button type="button" data-panel="staff" aria-label="Кадры"><span>♟</span><b>Кадры</b></button>
          <button type="button" data-panel="build" aria-label="Стройка"><span>▦</span><b>Стройка</b></button>
        </nav>
      </div>
    </section>
  </main>
`;

new Phaser.Game(config);
