export type TileKind = 'floor' | 'wall' | 'door';
export type ZoneKind = 'none' | 'storage' | 'work' | 'forbidden';
export type RoomId = 'warehouse' | 'cutting' | 'assembly' | 'admin' | 'corridor';
export type Skill = 'logistics' | 'machining' | 'assembly' | 'mechanics' | 'quality';
export type ShiftId = 'day' | 'night' | 'off';
export type EmployeeAvailability = 'available' | 'resting' | 'sick' | 'absent';
export type TraitId = 'old-hand' | 'strict' | 'tireless' | 'nervous';
export type WorkPost = 'none' | 'cutter' | 'bench' | 'quality' | 'logistics';

export type TaskType =
  | 'haul-steel'
  | 'cut-steel'
  | 'haul-blank'
  | 'assemble-product'
  | 'inspect-product'
  | 'rework-product'
  | 'deliver-product'
  | 'repair-machine';

export type TaskState = 'queued' | 'blocked' | 'assigned' | 'moving' | 'working' | 'completed' | 'failed';
export type EmployeeStatus = 'idle' | 'moving' | 'working';

export interface ShiftSchedule {
  dayStartMinute: number;
  dayEndMinute: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  kind: TileKind;
  room: RoomId;
  zone: ZoneKind;
  doorOpen?: boolean;
}

export interface FacilityPositions {
  steelStockpile: Position;
  cutter: Position;
  bench: Position;
  qualityDesk: Position;
  finishedStockpile: Position;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  position: Position;
  skills: Partial<Record<Skill, number>>;
  skillXp: Partial<Record<Skill, number>>;
  energy: number;
  morale: number;
  stress: number;
  health: number;
  shiftId: ShiftId;
  availability: EmployeeAvailability;
  traits: TraitId[];
  assignedPost: WorkPost;
  sickUntilMinute?: number;
  status: EmployeeStatus;
  currentTaskId?: string;
  taskPhase?: 'to-source' | 'to-destination' | 'work';
  path: Position[];
  moveProgress: number;
  workRemaining: number;
}

export interface Machine {
  id: string;
  name: string;
  kind: 'cutter' | 'bench' | 'old-press';
  position: Position;
  condition: number;
  operational: boolean;
}

export interface Inventory {
  steelSheet: number;
  steelAtCutter: number;
  cutBlank: number;
  blankAtBench: number;
  assembledAtBench: number;
  inspectedProduct: number;
  defectiveProduct: number;
  product: number;
}

export interface ProductionOrder {
  targetProducts: number;
  completedProducts: number;
  dueDay: number;
  status: 'active' | 'completed' | 'failed';
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  source: Position;
  destination?: Position;
  requiredSkill?: Skill;
  duration: number;
  priority: number;
  priorityBoost: number;
  state: TaskState;
  assignedEmployeeId?: string;
  blockedReason?: string;
}

export interface ProductionIssue {
  code: 'materials' | 'specialist' | 'route' | 'machine' | 'deadline' | 'fatigue' | 'absence' | 'shift';
  message: string;
}

export interface WorldState {
  width: number;
  height: number;
  tiles: Tile[];
  mapVersion: number;
  facilities: FacilityPositions;
  employees: Employee[];
  machines: Machine[];
  tasks: Task[];
  inventory: Inventory;
  order: ProductionOrder;
  qualityChecks: number;
  schedule: ShiftSchedule;
  lastPeopleDay: number;
  timeMinutes: number;
  speed: number;
  paused: boolean;
  nextTaskId: number;
  log: string[];
}
