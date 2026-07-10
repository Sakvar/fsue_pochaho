import Phaser from 'phaser';
import { MACHINE_LABELS, ROOM_LABELS } from '../../content/catalog';
import { createInitialWorld } from '../../simulation/createInitialWorld';
import { currentClock, currentDay, damageCutter, addProductionOrder, tickSimulation } from '../../simulation/simulation';
import type { Employee, Machine, Position, Task, WorldState } from '../../simulation/types';

const TILE_SIZE = 28;
const OFFSET_X = 24;
const OFFSET_Y = 24;

export class GameScene extends Phaser.Scene {
  private world: WorldState = createInitialWorld();
  private graphics!: Phaser.GameObjects.Graphics;
  private selectedTile?: Position;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.setupDomControls();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pointerToTile(pointer.x, pointer.y);
      if (tile) {
        this.selectedTile = tile;
        this.updateHud();
      }
    });
  }

  update(_time: number, delta: number): void {
    tickSimulation(this.world, delta / 1000);
    this.renderWorld();
    this.updateHud();
  }

  private setupDomControls(): void {
    document.querySelector<HTMLButtonElement>('#btn-order')?.addEventListener('click', () => {
      addProductionOrder(this.world, 3);
      this.updateHud();
    });

    document.querySelector<HTMLButtonElement>('#btn-break')?.addEventListener('click', () => {
      damageCutter(this.world);
      this.updateHud();
    });

    document.querySelector<HTMLButtonElement>('#btn-pause')?.addEventListener('click', () => {
      this.world.paused = !this.world.paused;
      this.updateHud();
    });

    document.querySelector<HTMLButtonElement>('#btn-speed')?.addEventListener('click', () => {
      const speeds = [1, 3, 8];
      const currentIndex = speeds.indexOf(this.world.speed);
      this.world.speed = speeds[(currentIndex + 1) % speeds.length];
      this.updateHud();
    });
  }

  private renderWorld(): void {
    const g = this.graphics;
    g.clear();

    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        const tile = this.world.tiles[y * this.world.width + x];
        const px = OFFSET_X + x * TILE_SIZE;
        const py = OFFSET_Y + y * TILE_SIZE;

        if (tile.kind === 'wall') {
          g.fillStyle(0x2c3440, 1);
        } else if (tile.room === 'warehouse') {
          g.fillStyle(0x243323, 1);
        } else if (tile.room === 'cutting') {
          g.fillStyle(0x2c2c3a, 1);
        } else if (tile.room === 'assembly') {
          g.fillStyle(0x332b22, 1);
        } else if (tile.room === 'admin') {
          g.fillStyle(0x282838, 1);
        } else {
          g.fillStyle(0x1b2028, 1);
        }

        g.fillRect(px, py, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }

    this.drawFacilities(g);
    this.world.machines.forEach((machine) => this.drawMachine(g, machine));
    this.world.employees.forEach((employee) => this.drawEmployee(g, employee));

    if (this.selectedTile) {
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(OFFSET_X + this.selectedTile.x * TILE_SIZE, OFFSET_Y + this.selectedTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  private drawFacilities(g: Phaser.GameObjects.Graphics): void {
    this.drawMarker(g, this.world.facilities.steelStockpile, 0x7ab56d, 'S');
    this.drawMarker(g, this.world.facilities.finishedStockpile, 0xf2d16b, 'G');
  }

  private drawMachine(g: Phaser.GameObjects.Graphics, machine: Machine): void {
    const { x, y } = toPixels(machine.position);
    const conditionRatio = machine.condition / 100;
    g.fillStyle(machine.operational ? 0x6f83a6 : 0x8d3b3b, 1);
    g.fillRoundedRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 4);
    g.fillStyle(0x121820, 0.8);
    g.fillRect(x + 5, y + TILE_SIZE - 8, (TILE_SIZE - 10) * conditionRatio, 3);
  }

  private drawEmployee(g: Phaser.GameObjects.Graphics, employee: Employee): void {
    const { x, y } = toPixels(employee.position);
    const color = employee.status === 'working' ? 0xf2c66d : employee.status === 'moving' ? 0x89d2ff : 0xd8e0ec;

    if (employee.path.length > 0) {
      g.lineStyle(1, 0x89d2ff, 0.45);
      let last = employee.position;
      for (const point of employee.path) {
        const a = toCenterPixels(last);
        const b = toCenterPixels(point);
        g.lineBetween(a.x, a.y, b.x, b.y);
        last = point;
      }
    }

    g.fillStyle(color, 1);
    g.fillCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 8);
    g.lineStyle(2, 0x111111, 0.8);
    g.strokeCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 8);
  }

  private drawMarker(g: Phaser.GameObjects.Graphics, position: Position, color: number, _label: string): void {
    const { x, y } = toPixels(position);
    g.fillStyle(color, 0.85);
    g.fillRoundedRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, 5);
  }

  private pointerToTile(pointerX: number, pointerY: number): Position | undefined {
    const x = Math.floor((pointerX - OFFSET_X) / TILE_SIZE);
    const y = Math.floor((pointerY - OFFSET_Y) / TILE_SIZE);

    if (x < 0 || y < 0 || x >= this.world.width || y >= this.world.height) {
      return undefined;
    }

    return { x, y };
  }

  private updateHud(): void {
    const status = document.querySelector<HTMLDivElement>('#status');
    const tasks = document.querySelector<HTMLDivElement>('#tasks');
    const log = document.querySelector<HTMLDivElement>('#log');
    const selection = document.querySelector<HTMLDivElement>('#selection');
    const pauseButton = document.querySelector<HTMLButtonElement>('#btn-pause');
    const speedButton = document.querySelector<HTMLButtonElement>('#btn-speed');

    if (pauseButton) pauseButton.textContent = this.world.paused ? 'Продолжить' : 'Пауза';
    if (speedButton) speedButton.textContent = `Скорость ×${this.world.speed}`;

    if (status) {
      const cutter = this.world.machines.find((machine) => machine.kind === 'cutter');
      status.innerHTML = `
        <b>День ${currentDay(this.world)}, ${currentClock(this.world)}</b><br />
        Заказ: ${this.world.order.completedProducts}/${this.world.order.targetProducts} корпусов<br />
        Листы: ${this.world.inventory.steelSheet} · заготовки: ${this.world.inventory.cutBlank + this.world.inventory.blankAtBench} · готово на складе: ${this.world.inventory.product}<br />
        Станок Р-17: ${Math.round(cutter?.condition ?? 0)}%
      `;
    }

    if (tasks) {
      const visibleTasks = this.world.tasks.filter((task) => task.state !== 'completed').slice(-8);
      tasks.innerHTML = visibleTasks.length > 0 ? visibleTasks.map((task) => this.renderTask(task)).join('') : '<span class="muted">Очередь пуста. Это подозрительно.</span>';
    }

    if (log) {
      log.innerHTML = this.world.log.map((entry) => `<div>${entry}</div>`).join('');
    }

    if (selection) {
      selection.innerHTML = this.renderSelection();
    }
  }

  private renderTask(task: Task): string {
    const employee = this.world.employees.find((item) => item.id === task.assignedEmployeeId);
    return `<div class="task"><b>${task.title}</b><br /><span>${task.state}${employee ? ` · ${employee.name}` : ''}</span></div>`;
  }

  private renderSelection(): string {
    if (!this.selectedTile) {
      return '<span class="muted">Кликни по клетке на карте.</span>';
    }

    const tile = this.world.tiles[this.selectedTile.y * this.world.width + this.selectedTile.x];
    const employee = this.world.employees.find((item) => item.position.x === this.selectedTile?.x && item.position.y === this.selectedTile?.y);
    const machine = this.world.machines.find((item) => item.position.x === this.selectedTile?.x && item.position.y === this.selectedTile?.y);

    const lines = [`Клетка ${this.selectedTile.x}:${this.selectedTile.y}`, `Помещение: ${ROOM_LABELS[tile.room]}`];

    if (machine) {
      lines.push(`Оборудование: ${machine.name}`, `Тип: ${MACHINE_LABELS[machine.kind]}`, `Состояние: ${Math.round(machine.condition)}%`);
    }

    if (employee) {
      lines.push(`Сотрудник: ${employee.name}`, `Должность: ${employee.role}`, `Энергия: ${Math.round(employee.energy)}%`, `Статус: ${employee.status}`);
    }

    return lines.join('<br />');
  }
}

function toPixels(position: Position): Position {
  return {
    x: OFFSET_X + position.x * TILE_SIZE,
    y: OFFSET_Y + position.y * TILE_SIZE,
  };
}

function toCenterPixels(position: Position): Position {
  const pixels = toPixels(position);
  return { x: pixels.x + TILE_SIZE / 2, y: pixels.y + TILE_SIZE / 2 };
}
