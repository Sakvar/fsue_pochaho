import Phaser from 'phaser';
import { MACHINE_LABELS, ROOM_LABELS } from '../../content/catalog';
import { createInitialWorld } from '../../simulation/createInitialWorld';
import { currentClock, currentDay, damageCutter, addProductionOrder, getProductionIssues, tickSimulation } from '../../simulation/simulation';
import type { Employee, Machine, Position, Task, WorldState } from '../../simulation/types';

const TILE_SIZE = 28;
export class GameScene extends Phaser.Scene {
  private world: WorldState = createInitialWorld();
  private graphics!: Phaser.GameObjects.Graphics;
  private selectedTile?: Position;
  private roomLabels: Phaser.GameObjects.Text[] = [];
  private animationTime = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.createRoomLabels();
    this.setupDomControls();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pointerToTile(pointer.x, pointer.y);
      if (tile) {
        this.selectedTile = tile;
        this.updateHud();
      }
    });
  }

  update(time: number, delta: number): void {
    this.animationTime = time;
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
        const px = this.originX + x * TILE_SIZE;
        const py = this.originY + y * TILE_SIZE;

        if (tile.kind === 'wall') this.drawWallTile(g, px, py, x, y);
        else this.drawFloorTile(g, px, py, tile.room, x, y);
      }
    }

    this.drawFacilities(g);
    this.world.machines.forEach((machine) => this.drawMachine(g, machine));
    this.world.employees.forEach((employee) => this.drawEmployee(g, employee));

    if (this.selectedTile) {
      g.lineStyle(2, 0xe5d169, 1);
      g.strokeRect(this.originX + this.selectedTile.x * TILE_SIZE, this.originY + this.selectedTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    this.positionRoomLabels();
  }

  private drawFacilities(g: Phaser.GameObjects.Graphics): void {
    this.drawSteelStockpile(g, this.world.facilities.steelStockpile);
    this.drawQualityDesk(g, this.world.facilities.qualityDesk);
    this.drawFinishedStockpile(g, this.world.facilities.finishedStockpile);
  }

  private drawMachine(g: Phaser.GameObjects.Graphics, machine: Machine): void {
    const { x, y } = this.toPixels(machine.position);
    const conditionRatio = machine.condition / 100;
    const body = machine.operational ? 0x637267 : 0x77473d;

    g.fillStyle(0x12130f, 0.7);
    g.fillRect(x + 4, y + 23, 21, 3);

    if (machine.kind === 'cutter') {
      g.fillStyle(0x27302d, 1); g.fillRect(x + 3, y + 7, 22, 15);
      g.fillStyle(body, 1); g.fillRect(x + 5, y + 5, 18, 15);
      g.fillStyle(0x303b38, 1); g.fillRect(x + 7, y + 7, 10, 7);
      g.fillStyle(0x17211f, 1); g.fillRect(x + 9, y + 8, 7, 4);
      g.fillStyle(0xd2b452, 1); g.fillRect(x + 20, y + 7, 2, 2);
      g.fillStyle(0x252923, 1); g.fillRect(x + 7, y + 20, 3, 4); g.fillRect(x + 19, y + 20, 3, 4);
    } else if (machine.kind === 'bench') {
      g.fillStyle(0x563f2a, 1); g.fillRect(x + 3, y + 9, 22, 5);
      g.fillStyle(0x8e6941, 1); g.fillRect(x + 4, y + 7, 20, 3);
      g.fillStyle(0x3a2c21, 1); g.fillRect(x + 5, y + 14, 3, 10); g.fillRect(x + 21, y + 14, 3, 10);
      g.fillStyle(0x9ba19a, 1); g.fillRect(x + 8, y + 5, 7, 2); g.fillRect(x + 13, y + 3, 2, 5);
    } else {
      g.fillStyle(0x292c28, 1); g.fillRect(x + 4, y + 3, 20, 21);
      g.fillStyle(body, 1); g.fillRect(x + 6, y + 4, 16, 17);
      g.fillStyle(0x282a26, 1); g.fillRect(x + 9, y + 7, 10, 8);
      g.fillStyle(0x7c837b, 1); g.fillRect(x + 10, y + 9, 8, 2);
      g.fillStyle(0x9c3f31, 1); g.fillRect(x + 19, y + 5, 2, 2);
    }

    g.fillStyle(0x161713, 1); g.fillRect(x + 5, y + 25, 18, 2);
    g.fillStyle(machine.operational ? 0xb5a34c : 0xb55a46, 1);
    g.fillRect(x + 5, y + 25, Math.max(1, Math.floor(18 * conditionRatio)), 2);
  }

  private drawEmployee(g: Phaser.GameObjects.Graphics, employee: Employee): void {
    const { x, y } = this.toPixels(employee.position);

    if (employee.path.length > 0) {
      g.lineStyle(1, 0x83aaa5, 0.5);
      let last = employee.position;
      for (const point of employee.path) {
        const a = this.toCenterPixels(last);
        const b = this.toCenterPixels(point);
        g.lineBetween(a.x, a.y, b.x, b.y);
        last = point;
      }
    }

    const palette = this.employeePalette(employee.id);
    const walking = employee.status === 'moving';
    const working = employee.status === 'working';
    const frame = Math.floor(this.animationTime / 180) % 2;
    const bob = walking && frame === 1 ? -1 : 0;
    const cx = x + 14;
    const top = y + 4 + bob;

    g.fillStyle(0x11120f, 0.6); g.fillRect(cx - 7, y + 23, 14, 3);
    g.fillStyle(palette.hair, 1); g.fillRect(cx - 4, top, 8, 3);
    g.fillStyle(palette.skin, 1); g.fillRect(cx - 5, top + 3, 10, 7);
    g.fillStyle(palette.hair, 1); g.fillRect(cx - 5, top + 3, 2, 4);
    g.fillStyle(0x332d26, 1); g.fillRect(cx - 3, top + 6, 1, 1); g.fillRect(cx + 2, top + 6, 1, 1);
    g.fillStyle(palette.shirt, 1); g.fillRect(cx - 6, top + 10, 12, 8);
    g.fillStyle(palette.trim, 1); g.fillRect(cx - 6, top + 12, 12, 2);
    g.fillStyle(palette.skin, 1);
    if (working && frame === 1) { g.fillRect(cx - 9, top + 10, 3, 3); g.fillRect(cx + 6, top + 8, 3, 3); }
    else { g.fillRect(cx - 8, top + 11, 2, 6); g.fillRect(cx + 6, top + 11, 2, 6); }
    g.fillStyle(palette.pants, 1);
    g.fillRect(cx - 5, top + 18, 4, walking && frame ? 6 : 5);
    g.fillRect(cx + 1, top + 18, 4, walking && !frame ? 6 : 5);
    g.fillStyle(0x171915, 1); g.fillRect(cx - 6, top + 23, 5, 2); g.fillRect(cx + 1, top + 23, 5, 2);

    const statusColor = working ? 0xe0be55 : walking ? 0x74a5a0 : 0x9d9c90;
    g.fillStyle(0x161713, 1); g.fillRect(x + 21, y + 2, 5, 5);
    g.fillStyle(statusColor, 1); g.fillRect(x + 22, y + 3, 3, 3);
  }

  private drawSteelStockpile(g: Phaser.GameObjects.Graphics, position: Position): void {
    const { x, y } = this.toPixels(position);
    g.fillStyle(0x171914, .6); g.fillRect(x + 3, y + 22, 23, 3);
    g.fillStyle(0x566360, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(x + 4 + i, y + 7 + i * 4, 19 - i * 2, 3);
    g.fillStyle(0x8b9792, 1); g.fillRect(x + 5, y + 7, 18, 1);
  }

  private drawQualityDesk(g: Phaser.GameObjects.Graphics, position: Position): void {
    const { x, y } = this.toPixels(position);
    g.fillStyle(0x4b3528, 1); g.fillRect(x + 3, y + 11, 22, 5);
    g.fillStyle(0x76553a, 1); g.fillRect(x + 4, y + 9, 20, 3);
    g.fillStyle(0x3c2d23, 1); g.fillRect(x + 5, y + 16, 3, 9); g.fillRect(x + 21, y + 16, 3, 9);
    g.fillStyle(0xd7d1b7, 1); g.fillRect(x + 9, y + 5, 10, 6);
    g.fillStyle(0x685d78, 1); g.fillRect(x + 11, y + 7, 7, 1); g.fillRect(x + 11, y + 9, 5, 1);
  }

  private drawFinishedStockpile(g: Phaser.GameObjects.Graphics, position: Position): void {
    const { x, y } = this.toPixels(position);
    g.fillStyle(0x171914, .6); g.fillRect(x + 3, y + 23, 23, 3);
    g.fillStyle(0x7a5b30, 1); g.fillRect(x + 4, y + 7, 20, 16);
    g.fillStyle(0xa57a3e, 1); g.fillRect(x + 5, y + 6, 18, 3);
    g.fillStyle(0x4b3924, 1); g.fillRect(x + 13, y + 8, 2, 15);
    g.fillStyle(0xc3b255, 1); g.fillRect(x + 8, y + 12, 5, 4);
  }

  private drawWallTile(g: Phaser.GameObjects.Graphics, px: number, py: number, tileX: number, tileY: number): void {
    g.fillStyle(0x1b1d19, 1); g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x44463e, 1); g.fillRect(px + 1, py + 1, 26, 24);
    g.fillStyle(0x55564c, 1); g.fillRect(px + 2, py + 2, 24, 3);
    g.fillStyle(0x30322d, 1); g.fillRect(px + 2, py + 19, 24, 6);
    g.fillStyle(0x393a34, 1); g.fillRect(px + 13, py + 5, 2, 14);
    if ((tileX + tileY) % 3 === 0) {
      g.fillStyle(0x676353, 1); g.fillRect(px + 4, py + 8, 5, 2);
      g.fillStyle(0x292b27, 1); g.fillRect(px + 20, py + 14, 3, 3);
    }
  }

  private drawFloorTile(
    g: Phaser.GameObjects.Graphics,
    px: number,
    py: number,
    room: 'warehouse' | 'cutting' | 'assembly' | 'admin' | 'corridor',
    tileX: number,
    tileY: number,
  ): void {
    const colors = {
      warehouse: [0x30372f, 0x363d34],
      cutting: [0x303638, 0x353c3e],
      assembly: [0x3b3329, 0x40382d],
      admin: [0x35332f, 0x3a3833],
      corridor: [0x292b26, 0x2e302a],
    } as const;
    const [base, alternate] = colors[room];
    g.fillStyle((tileX + tileY) % 2 === 0 ? base : alternate, 1);
    g.fillRect(px, py, 27, 27);
    g.fillStyle(0x1d201c, .48); g.fillRect(px + 27, py, 1, 28); g.fillRect(px, py + 27, 28, 1);
    g.fillStyle(0x515147, .18); g.fillRect(px + 2, py + 2, 24, 1);

    const detail = (tileX * 17 + tileY * 31) % 19;
    if (detail === 2 || detail === 11) {
      g.fillStyle(0x20231e, .45); g.fillRect(px + 7, py + 16, 5, 2); g.fillRect(px + 11, py + 18, 3, 2);
    }
    if (room === 'cutting' && detail === 6) {
      g.fillStyle(0x756948, .65); g.fillRect(px + 5, py + 7, 2, 1); g.fillRect(px + 18, py + 20, 3, 1);
    }
    if (room === 'warehouse' && tileX === 1 && tileY > 3 && tileY % 4 === 0) {
      g.fillStyle(0x57432e, 1); g.fillRect(px + 3, py + 7, 21, 4); g.fillRect(px + 3, py + 18, 21, 4);
      g.fillStyle(0x2b241c, 1); g.fillRect(px + 5, py + 5, 3, 19); g.fillRect(px + 20, py + 5, 3, 19);
    }
    if (room === 'corridor' && tileX === 10) {
      g.fillStyle(0xa98e3d, .35); g.fillRect(px + 12, py + 1, 3, 25);
    }
  }

  private employeePalette(id: string): { skin: number; hair: number; shirt: number; trim: number; pants: number } {
    const palettes: Record<string, { skin: number; hair: number; shirt: number; trim: number; pants: number }> = {
      'emp-boris': { skin: 0xc7946f, hair: 0x4a3428, shirt: 0x596a55, trim: 0x9d8e42, pants: 0x343c36 },
      'emp-nina': { skin: 0xd2a07c, hair: 0x6b3d2d, shirt: 0x527076, trim: 0xb69b4a, pants: 0x303d42 },
      'emp-vera': { skin: 0xc99270, hair: 0x332921, shirt: 0x75634d, trim: 0xc0a54e, pants: 0x3d3930 },
      'emp-ivan': { skin: 0xc99a77, hair: 0x9a9485, shirt: 0x4e5c65, trim: 0x89999c, pants: 0x30363b },
      'emp-galina': { skin: 0xd4a380, hair: 0x5a4638, shirt: 0x68556c, trim: 0xb8a85b, pants: 0x39323d },
    };
    return palettes[id] ?? { skin: 0xc99a77, hair: 0x3d3028, shirt: 0x59645a, trim: 0xa8974e, pants: 0x343934 };
  }

  private pointerToTile(pointerX: number, pointerY: number): Position | undefined {
    const x = Math.floor((pointerX - this.originX) / TILE_SIZE);
    const y = Math.floor((pointerY - this.originY) / TILE_SIZE);

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
    const orderButton = document.querySelector<HTMLButtonElement>('#btn-order');
    const issuesPanel = document.querySelector<HTMLElement>('#issues-panel');
    const issues = document.querySelector<HTMLDivElement>('#issues');

    if (pauseButton) pauseButton.textContent = this.world.paused ? 'Продолжить' : 'Пауза';
    if (speedButton) speedButton.textContent = `Скорость ×${this.world.speed}`;
    if (orderButton) orderButton.disabled = this.world.order.status !== 'active';

    if (status) {
      const cutter = this.world.machines.find((machine) => machine.kind === 'cutter');
      const progress = Math.min(100, (this.world.order.completedProducts / this.world.order.targetProducts) * 100);
      const orderState = {
        active: 'В ПРОИЗВОДСТВЕ',
        completed: 'ВЫПОЛНЕН',
        failed: 'СРОК СОРВАН',
      }[this.world.order.status];
      status.innerHTML = `<div class="status-top"><div><div class="clock">${currentClock(this.world)}</div><div class="day">День ${currentDay(this.world)} · срок ${this.world.order.dueDay}</div></div></div>
        <div class="order-state ${this.world.order.status}">${orderState}</div>
        <div class="progress-meta"><span>ГОСЗАКАЗ · КОРПУСА</span><b>${this.world.order.completedProducts} / ${this.world.order.targetProducts}</b></div>
        <div class="progress"><i style="width:${progress}%"></i></div>
        <div class="inventory"><span><b>${this.world.inventory.steelSheet}</b>листы</span><span><b>${this.world.inventory.cutBlank + this.world.inventory.blankAtBench}</b>заготовки</span><span><b>${this.world.inventory.inspectedProduct}</b>ОТК</span><span><b>${this.world.inventory.product}</b>склад</span></div>
        <div class="machine-state"><span>Р-17 «Ветеран»</span><b>${Math.round(cutter?.condition ?? 0)}% · ${cutter?.operational ? 'В РАБОТЕ' : 'АВАРИЯ'}</b></div>`;
    }

    const productionIssues = getProductionIssues(this.world);
    if (issuesPanel && issues) {
      issuesPanel.hidden = productionIssues.length === 0;
      issues.innerHTML = productionIssues.map((issue) => `<div class="issue issue-${issue.code}">${issue.message}</div>`).join('');
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

  private get originX(): number { return Math.max(24, Math.floor((this.scale.width - this.world.width * TILE_SIZE) / 2)); }
  private get originY(): number { return Math.max(76, Math.floor((this.scale.height - this.world.height * TILE_SIZE) / 2)); }

  private createRoomLabels(): void {
    const labels: Array<[string, Position]> = [['СКЛАД СЫРЬЯ', { x: 1, y: 1 }], ['АДМИНИСТРАЦИЯ', { x: 12, y: 1 }], ['МЕХАНИЧЕСКИЙ ЦЕХ', { x: 12, y: 7 }], ['СБОРОЧНЫЙ УЧАСТОК', { x: 21, y: 7 }]];
    this.roomLabels = labels.map(([label, position]) => this.add.text(0, 0, label, { fontFamily: 'monospace', fontSize: '9px', color: '#77786c', letterSpacing: 1 }).setData('position', position).setDepth(2));
  }

  private positionRoomLabels(): void {
    this.roomLabels.forEach((label) => {
      const position = label.getData('position') as Position;
      label.setPosition(this.originX + position.x * TILE_SIZE + 4, this.originY + position.y * TILE_SIZE + 5);
    });
  }

  private toPixels(position: Position): Position {
    return { x: this.originX + position.x * TILE_SIZE, y: this.originY + position.y * TILE_SIZE };
  }

  private toCenterPixels(position: Position): Position {
    const pixels = this.toPixels(position);
    return { x: pixels.x + TILE_SIZE / 2, y: pixels.y + TILE_SIZE / 2 };
  }

  private renderTask(task: Task): string {
    const employee = this.world.employees.find((item) => item.id === task.assignedEmployeeId);
    const stateLabel: Record<Task['state'], string> = {
      queued: 'в очереди',
      blocked: 'заблокировано',
      assigned: 'назначено',
      moving: 'в пути',
      working: 'в работе',
      completed: 'выполнено',
      failed: 'не выполнено',
    };
    const details = task.blockedReason ?? (employee ? employee.name : undefined);
    return `<div class="task task-${task.state}"><b>${task.title}</b><br /><span>${stateLabel[task.state]}${details ? ` · ${details}` : ''}</span></div>`;
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
