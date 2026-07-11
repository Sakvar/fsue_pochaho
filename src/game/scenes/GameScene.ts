import Phaser from 'phaser';
import {
  AVAILABILITY_LABELS,
  BUILD_TOOL_LABELS,
  MACHINE_LABELS,
  POST_LABELS,
  ROOM_LABELS,
  SHIFT_LABELS,
  SKILL_LABELS,
  TILE_KIND_LABELS,
  TRAIT_LABELS,
  ZONE_LABELS,
  type BuildTool,
} from '../../content/catalog';
import { createInitialWorld } from '../../simulation/createInitialWorld';
import { placeDoor, placeWall, removeStructure, setTileZone, toggleDoor } from '../../simulation/mapEditing';
import {
  addProductionOrder,
  assignEmployeeToPost,
  boostTaskPriority,
  cancelTask,
  currentClock,
  currentDay,
  currentShiftPeriod,
  damageCutter,
  effectivePriority,
  getProductionIssues,
  replanBlockedWork,
  sendEmployeeToRest,
  setEmployeeShift,
  tickSimulation,
} from '../../simulation/simulation';
import type { Employee, Machine, Position, RoomId, ShiftId, Task, WorkPost, WorldState, ZoneKind } from '../../simulation/types';

const TILE_SIZE = 28;

export class GameScene extends Phaser.Scene {
  private world: WorldState = createInitialWorld();
  private graphics!: Phaser.GameObjects.Graphics;
  private selectedTile?: Position;
  private selectedEmployeeId?: string;
  private activeTool: BuildTool = 'inspect';
  private roomLabels: Phaser.GameObjects.Text[] = [];
  private animationTime = 0;
  private hudBound = false;
  private hudCache: Record<string, string> = {};

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.createRoomLabels();
    this.setupDomControls();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pointerToTile(pointer.x, pointer.y);
      if (!tile) return;

      this.selectedTile = tile;
      const employee = this.world.employees.find((item) => item.position.x === tile.x && item.position.y === tile.y);
      this.selectedEmployeeId = employee?.id;
      this.applyTool(tile);
      this.updateHud(true);
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
      this.updateHud(true);
    });

    document.querySelector<HTMLButtonElement>('#btn-break')?.addEventListener('click', () => {
      damageCutter(this.world);
      this.updateHud(true);
    });

    document.querySelector<HTMLButtonElement>('#btn-pause')?.addEventListener('click', () => {
      this.world.paused = !this.world.paused;
      this.updateHud(true);
    });

    document.querySelector<HTMLButtonElement>('#btn-speed')?.addEventListener('click', () => {
      const speeds = [1, 3, 8];
      const currentIndex = speeds.indexOf(this.world.speed);
      this.world.speed = speeds[(currentIndex + 1) % speeds.length];
      this.updateHud(true);
    });

    document.querySelector<HTMLButtonElement>('#btn-replan')?.addEventListener('click', () => {
      replanBlockedWork(this.world);
      this.updateHud(true);
    });

    document.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool as BuildTool | undefined;
        if (!tool) return;
        this.activeTool = tool;
        this.updateToolButtons();
        this.updateMapHint();
      });
    });

    if (!this.hudBound) {
      document.querySelector<HTMLDivElement>('#tasks')?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest<HTMLButtonElement>('button[data-task-action]');
        if (!button) return;

        const taskId = button.dataset.taskId;
        const action = button.dataset.taskAction;
        if (!taskId || !action) return;

        if (action === 'boost') boostTaskPriority(this.world, taskId, 20);
        if (action === 'lower') boostTaskPriority(this.world, taskId, -20);
        if (action === 'cancel') cancelTask(this.world, taskId);
        this.updateHud(true);
      });

      document.querySelector<HTMLDivElement>('#staff')?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest<HTMLButtonElement>('button[data-staff-action]');
        const row = target?.closest<HTMLElement>('[data-employee-id]');
        if (row?.dataset.employeeId && !button) {
          const employee = this.world.employees.find((item) => item.id === row.dataset.employeeId);
          if (employee) {
            this.selectedEmployeeId = employee.id;
            this.selectedTile = { ...employee.position };
          }
          this.updateHud(true);
          return;
        }
        if (!button) return;

        const employeeId = button.dataset.employeeId;
        const action = button.dataset.staffAction;
        if (!employeeId || !action) return;

        if (action === 'rest') sendEmployeeToRest(this.world, employeeId);
        if (action === 'shift') {
          const shift = button.dataset.shift as ShiftId | undefined;
          if (shift) setEmployeeShift(this.world, employeeId, shift);
        }
        if (action === 'post') {
          const post = button.dataset.post as WorkPost | undefined;
          if (post) assignEmployeeToPost(this.world, employeeId, post);
        }
        this.updateHud(true);
      });
      this.hudBound = true;
    }

    this.updateToolButtons();
    this.updateMapHint();
  }

  private applyTool(tile: Position): void {
    if (this.activeTool === 'inspect') return;

    if (this.activeTool === 'wall') {
      placeWall(this.world, tile);
      return;
    }

    if (this.activeTool === 'door') {
      const current = this.world.tiles[tile.y * this.world.width + tile.x];
      if (current.kind === 'door') toggleDoor(this.world, tile);
      else placeDoor(this.world, tile, true);
      return;
    }

    if (this.activeTool === 'destroy') {
      removeStructure(this.world, tile);
      return;
    }

    const zoneMap: Partial<Record<BuildTool, ZoneKind>> = {
      'zone-storage': 'storage',
      'zone-work': 'work',
      'zone-forbidden': 'forbidden',
      'zone-clear': 'none',
    };
    const zone = zoneMap[this.activeTool];
    if (zone) setTileZone(this.world, tile, zone);
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
        else if (tile.kind === 'door') this.drawDoorTile(g, px, py, tile.doorOpen !== false, tile.room);
        else this.drawFloorTile(g, px, py, tile.room, x, y);

        if (tile.zone !== 'none' && tile.kind !== 'wall') {
          this.drawZoneOverlay(g, px, py, tile.zone);
        }
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

  private drawDoorTile(g: Phaser.GameObjects.Graphics, px: number, py: number, open: boolean, room: RoomId): void {
    this.drawFloorTile(g, px, py, room, 0, 0);
    g.fillStyle(open ? 0x6d5a2f : 0x4a3d24, 1);
    g.fillRect(px + 3, py + 2, 4, 24);
    g.fillStyle(open ? 0xb79a4a : 0x7a6434, 1);
    g.fillRect(px + 4, py + 3, 2, 22);
    if (!open) {
      g.fillStyle(0x2a2418, 0.55);
      g.fillRect(px + 8, py + 2, 17, 24);
      g.fillStyle(0x8d7540, 1);
      g.fillRect(px + 21, py + 12, 2, 2);
    }
  }

  private drawZoneOverlay(g: Phaser.GameObjects.Graphics, px: number, py: number, zone: Exclude<ZoneKind, 'none'>): void {
    const colors: Record<Exclude<ZoneKind, 'none'>, number> = {
      storage: 0x4f7d8a,
      work: 0x8a7a3d,
      forbidden: 0xa0523d,
    };
    g.fillStyle(colors[zone], 0.28);
    g.fillRect(px + 1, py + 1, 26, 26);
    g.lineStyle(1, colors[zone], 0.7);
    g.strokeRect(px + 2, py + 2, 24, 24);
  }

  private drawFloorTile(
    g: Phaser.GameObjects.Graphics,
    px: number,
    py: number,
    room: RoomId,
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

  private updateHud(force = false): void {
    if (force) this.hudCache = {};

    const status = document.querySelector<HTMLDivElement>('#status');
    const tasks = document.querySelector<HTMLDivElement>('#tasks');
    const staff = document.querySelector<HTMLDivElement>('#staff');
    const log = document.querySelector<HTMLDivElement>('#log');
    const selection = document.querySelector<HTMLDivElement>('#selection');
    const pauseButton = document.querySelector<HTMLButtonElement>('#btn-pause');
    const speedButton = document.querySelector<HTMLButtonElement>('#btn-speed');
    const orderButton = document.querySelector<HTMLButtonElement>('#btn-order');
    const issuesPanel = document.querySelector<HTMLElement>('#issues-panel');
    const issues = document.querySelector<HTMLDivElement>('#issues');
    const mapTitle = document.querySelector<HTMLElement>('.map-title small');

    if (pauseButton) pauseButton.textContent = this.world.paused ? 'Продолжить' : 'Пауза';
    if (speedButton) speedButton.textContent = `Скорость ×${this.world.speed}`;
    if (orderButton) orderButton.disabled = this.world.order.status !== 'active';
    if (mapTitle) {
      const period = currentShiftPeriod(this.world) === 'day' ? 'СМЕНА ДЕНЬ' : 'СМЕНА НОЧЬ';
      mapTitle.textContent = `КОРПУС 01 · ${period}`;
    }

    if (status) {
      const cutter = this.world.machines.find((machine) => machine.kind === 'cutter');
      const progress = Math.min(100, (this.world.order.completedProducts / this.world.order.targetProducts) * 100);
      const orderState = {
        active: 'В ПРОИЗВОДСТВЕ',
        completed: 'ВЫПОЛНЕН',
        failed: 'СРОК СОРВАН',
      }[this.world.order.status];
      const onDuty = this.world.employees.filter((item) => item.availability === 'available').length;
      this.setHudHtml(status, 'status', `<div class="status-top"><div><div class="clock">${currentClock(this.world)}</div><div class="day">День ${currentDay(this.world)} · срок ${this.world.order.dueDay}</div></div></div>
        <div class="order-state ${this.world.order.status}">${orderState}</div>
        <div class="progress-meta"><span>ГОСЗАКАЗ · КОРПУСА</span><b>${this.world.order.completedProducts} / ${this.world.order.targetProducts}</b></div>
        <div class="progress"><i style="width:${progress}%"></i></div>
        <div class="inventory"><span><b>${this.world.inventory.steelSheet}</b>листы</span><span><b>${this.world.inventory.cutBlank + this.world.inventory.blankAtBench}</b>заготовки</span><span><b>${this.world.inventory.inspectedProduct}</b>ОТК</span><span><b>${this.world.inventory.product}</b>склад</span></div>
        <div class="machine-state"><span>Р-17 «Ветеран»</span><b>${Math.round(cutter?.condition ?? 0)}% · ${cutter?.operational ? 'В РАБОТЕ' : 'АВАРИЯ'}</b></div>
        <div class="machine-state"><span>Личный состав</span><b>${onDuty}/${this.world.employees.length} на месте</b></div>`);
    }

    const productionIssues = getProductionIssues(this.world);
    if (issuesPanel && issues) {
      issuesPanel.hidden = productionIssues.length === 0;
      this.setHudHtml(issues, 'issues', productionIssues.map((issue) => `<div class="issue issue-${issue.code}">${issue.message}</div>`).join(''));
    }

    if (staff) {
      this.renderStaffPanel(staff);
    }

    if (tasks) {
      const visibleTasks = this.world.tasks.filter((task) => task.state !== 'completed').slice(-8);
      const tasksHtml = visibleTasks.length > 0
        ? visibleTasks.map((task) => this.renderTask(task)).join('')
        : '<span class="muted">Очередь пуста. Это подозрительно.</span>';
      this.setHudHtml(tasks, 'tasks', tasksHtml);
    }

    if (log) {
      this.setHudHtml(log, 'log', this.world.log.map((entry) => `<div>${entry}</div>`).join(''));
    }

    if (selection) {
      this.setHudHtml(selection, 'selection', this.renderSelection());
    }
  }

  private setHudHtml(element: HTMLElement, key: string, html: string): void {
    if (this.hudCache[key] === html) return;
    this.hudCache[key] = html;
    element.innerHTML = html;
  }

  private renderStaffPanel(staff: HTMLDivElement): void {
    const signature = this.world.employees.map((employee) => {
      const selected = this.isEmployeeSelected(employee) ? '1' : '0';
      const skills = Object.entries(employee.skills).map(([skill, value]) => `${skill}:${value}`).join(',');
      return [employee.id, employee.availability, employee.shiftId, employee.assignedPost, employee.status, skills, employee.traits.join(','), selected].join('/');
    }).join('|');

    if (this.hudCache.staffSig !== signature) {
      this.hudCache.staffSig = signature;
      staff.innerHTML = this.world.employees.map((item) => this.renderStaffRow(item)).join('');
      return;
    }

    for (const employee of this.world.employees) {
      const vitals = staff.querySelector(`[data-employee-vitals="${employee.id}"]`);
      if (vitals) {
        vitals.textContent = `Э ${Math.round(employee.energy)} · М ${Math.round(employee.morale)} · С ${Math.round(employee.stress)}`;
      }
    }
  }

  private isEmployeeSelected(employee: Employee): boolean {
    return this.selectedEmployeeId === employee.id;
  }

  private updateToolButtons(): void {
    document.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.tool === this.activeTool);
    });
  }

  private updateMapHint(): void {
    const hint = document.querySelector<HTMLDivElement>('.map-hint');
    if (hint) hint.textContent = `ЛКМ · ${BUILD_TOOL_LABELS[this.activeTool].toUpperCase()}`;
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
    const canManage = !['completed', 'failed'].includes(task.state);
    const controls = canManage
      ? `<div class="task-actions">
          <button type="button" data-task-action="boost" data-task-id="${task.id}">↑</button>
          <button type="button" data-task-action="lower" data-task-id="${task.id}">↓</button>
          <button type="button" data-task-action="cancel" data-task-id="${task.id}">×</button>
        </div>`
      : '';
    return `<div class="task task-${task.state}"><div class="task-head"><b>${task.title}</b><span class="prio">P${effectivePriority(task)}</span></div><span>${stateLabel[task.state]}${details ? ` · ${details}` : ''}</span>${controls}</div>`;
  }

  private renderStaffRow(employee: Employee): string {
    const selected = this.isEmployeeSelected(employee);
    const skills = Object.entries(employee.skills)
      .map(([skill, value]) => `${SKILL_LABELS[skill as keyof typeof SKILL_LABELS]} ${value}`)
      .join(', ');
    const traits = employee.traits.map((trait) => TRAIT_LABELS[trait]).join(', ') || 'без особенностей';
    const controls = selected
      ? `<div class="staff-actions">
          <button type="button" data-staff-action="rest" data-employee-id="${employee.id}">Отдых</button>
          <button type="button" data-staff-action="shift" data-shift="day" data-employee-id="${employee.id}">День</button>
          <button type="button" data-staff-action="shift" data-shift="night" data-employee-id="${employee.id}">Ночь</button>
          <button type="button" data-staff-action="shift" data-shift="off" data-employee-id="${employee.id}">Выходной</button>
          <button type="button" data-staff-action="post" data-post="cutter" data-employee-id="${employee.id}">Резак</button>
          <button type="button" data-staff-action="post" data-post="bench" data-employee-id="${employee.id}">Сборка</button>
          <button type="button" data-staff-action="post" data-post="quality" data-employee-id="${employee.id}">ОТК</button>
          <button type="button" data-staff-action="post" data-post="logistics" data-employee-id="${employee.id}">Логистика</button>
          <button type="button" data-staff-action="post" data-post="none" data-employee-id="${employee.id}">Снять пост</button>
        </div>`
      : '';

    return `<div class="staff-row${selected ? ' selected' : ''}" data-employee-id="${employee.id}">
      <div class="task-head"><b>${employee.name}</b><span>${AVAILABILITY_LABELS[employee.availability]}</span></div>
      <span>${employee.role} · ${SHIFT_LABELS[employee.shiftId]} · ${POST_LABELS[employee.assignedPost]}</span>
      <span data-employee-vitals="${employee.id}">Э ${Math.round(employee.energy)} · М ${Math.round(employee.morale)} · С ${Math.round(employee.stress)}</span>
      <span>${skills}</span>
      <span>${traits}</span>
      ${controls}
    </div>`;
  }

  private renderSelection(): string {
    if (!this.selectedTile && !this.selectedEmployeeId) {
      return '<span class="muted">Кликни по клетке на карте.</span>';
    }

    const employee = this.selectedEmployeeId
      ? this.world.employees.find((item) => item.id === this.selectedEmployeeId)
      : this.world.employees.find((item) => item.position.x === this.selectedTile?.x && item.position.y === this.selectedTile?.y);
    const tilePosition = this.selectedTile ?? employee?.position;
    if (!tilePosition) {
      return '<span class="muted">Кликни по клетке на карте.</span>';
    }

    const tile = this.world.tiles[tilePosition.y * this.world.width + tilePosition.x];
    const machine = this.world.machines.find((item) => item.position.x === tilePosition.x && item.position.y === tilePosition.y);

    const lines = [
      `Клетка ${tilePosition.x}:${tilePosition.y}`,
      `Покрытие: ${TILE_KIND_LABELS[tile.kind]}${tile.kind === 'door' ? (tile.doorOpen ? ' · открыта' : ' · закрыта') : ''}`,
      `Помещение: ${ROOM_LABELS[tile.room]}`,
      `Зона: ${ZONE_LABELS[tile.zone]}`,
      `Инструмент: ${BUILD_TOOL_LABELS[this.activeTool]}`,
    ];

    if (machine) {
      lines.push(`Оборудование: ${machine.name}`, `Тип: ${MACHINE_LABELS[machine.kind]}`, `Состояние: ${Math.round(machine.condition)}%`);
    }

    if (employee) {
      const skills = Object.entries(employee.skills)
        .map(([skill, value]) => `${SKILL_LABELS[skill as keyof typeof SKILL_LABELS]} ${value}`)
        .join(', ');
      const traits = employee.traits.map((trait) => TRAIT_LABELS[trait]).join(', ') || 'нет';
      lines.push(
        `Сотрудник: ${employee.name}`,
        `Должность: ${employee.role}`,
        `Смена: ${SHIFT_LABELS[employee.shiftId]} · ${AVAILABILITY_LABELS[employee.availability]}`,
        `Пост: ${POST_LABELS[employee.assignedPost]}`,
        `Энергия: ${Math.round(employee.energy)}% · Мораль: ${Math.round(employee.morale)} · Стресс: ${Math.round(employee.stress)}`,
        `Навыки: ${skills}`,
        `Особенности: ${traits}`,
        `Статус: ${employee.status}`,
      );
    }

    return lines.join('<br />');
  }
}
