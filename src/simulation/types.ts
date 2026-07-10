export type TileKind = 'floor' | 'wall';
export type Skill = 'logistics' | 'machining' | 'assembly' | 'mechanics' | 'quality';

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

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  kind: TileKind;
  room: 'warehouse' | 'cutting' | 'assembly' | 'admin' | 'corridor';
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
  energy: number;
  morale: number;
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
  state: TaskState;
  assignedEmployeeId?: string;
  blockedReason?: string;
}

export interface ProductionIssue {
  code: 'materials' | 'specialist' | 'route' | 'machine' | 'deadline';
  message: string;
}

export interface WorldState {
  width: number;
  height: number;
  tiles: Tile[];
  facilities: FacilityPositions;
  employees: Employee[];
  machines: Machine[];
  tasks: Task[];
  inventory: Inventory;
  order: ProductionOrder;
  qualityChecks: number;
  timeMinutes: number;
  speed: number;
  paused: boolean;
  nextTaskId: number;
  log: string[];
}
