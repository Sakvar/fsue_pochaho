import Phaser from 'phaser';
import config from './game/phaserConfig';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root not found');
}

root.innerHTML = `
  <main class="shell">
    <section id="game-root" class="game-root" aria-label="Карта предприятия"></section>
    <aside class="hud">
      <header>
        <p class="eyebrow">ФГУП «ПОЧАХО»</p>
        <h1>Вертикальный прототип</h1>
      </header>

      <div class="controls">
        <button id="btn-pause" type="button">Пауза</button>
        <button id="btn-speed" type="button">Скорость ×1</button>
        <button id="btn-order" type="button">+ заказ</button>
        <button id="btn-break" type="button">Сломать Р-17</button>
      </div>

      <section class="panel">
        <h2>Состояние</h2>
        <div id="status"></div>
      </section>

      <section class="panel">
        <h2>Выбор</h2>
        <div id="selection" class="mono muted">Кликни по клетке на карте.</div>
      </section>

      <section class="panel">
        <h2>Очередь задач</h2>
        <div id="tasks"></div>
      </section>

      <section class="panel log-panel">
        <h2>Журнал директора</h2>
        <div id="log"></div>
      </section>
    </aside>
  </main>
`;

new Phaser.Game(config);
