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
      <div class="map-chrome map-title">
        <span class="signal"></span>
        <div><small>КОРПУС 01 · СМЕНА ДЕНЬ</small><strong>Производственная площадка</strong></div>
      </div>
      <div class="map-chrome map-hint">ЛКМ · ИНСТРУМЕНТ ДИРЕКТОРА</div>
    </section>
    <aside class="hud">
      <header>
        <div class="brand-mark">П</div>
        <div><p class="eyebrow">ДИРЕКЦИЯ · АСУП 4.2</p><h1>ФГУП «ПОЧАХО»</h1></div>
      </header>

      <div class="controls">
        <button id="btn-pause" class="primary" type="button">Ⅱ &nbsp;Пауза</button>
        <button id="btn-speed" type="button">Скорость ×1</button>
        <button id="btn-order" type="button">＋ План +3</button>
        <button id="btn-break" class="danger" type="button">⚠ Авария Р-17</button>
      </div>

      <section class="panel">
        <h2><span>Инструменты</span><small>СТРОЙКА И ЗОНЫ</small></h2>
        <div id="tools" class="tools">${toolButtons}</div>
      </section>

      <section class="panel status-panel">
        <h2><span>Оперативная сводка</span><em>LIVE</em></h2>
        <div id="status"></div>
      </section>

      <section id="issues-panel" class="panel issues-panel" hidden>
        <h2><span>Причины простоя</span><small>ТРЕБУЕТ РЕШЕНИЯ</small></h2>
        <div id="issues"></div>
        <button id="btn-replan" type="button">Перепланировать наряды</button>
      </section>

      <section class="panel">
        <h2><span>Инспектор</span><small>ОБЪЕКТ НА КАРТЕ</small></h2>
        <div id="selection" class="mono muted">Кликни по клетке на карте.</div>
      </section>

      <section class="panel">
        <h2><span>Личный состав</span><small>СМЕНЫ И НАЗНАЧЕНИЯ</small></h2>
        <div id="staff"></div>
      </section>

      <section class="panel">
        <h2><span>Наряды</span><small>ТЕКУЩАЯ СМЕНА</small></h2>
        <div id="tasks"></div>
      </section>

      <section class="panel log-panel">
        <h2><span>Журнал директора</span><small>ПОСЛЕДНИЕ СОБЫТИЯ</small></h2>
        <div id="log"></div>
      </section>
    </aside>
  </main>
`;

new Phaser.Game(config);
