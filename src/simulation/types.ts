export type TileKind = 'floor' | 'wall' | 'door';
export type ZoneKind = 'none' | 'storage' | 'work' | 'forbidden';
export type RoomId = 'warehouse' | 'cutting' | 'assembly' | 'admin' | 'corridor';
export type Skill = 'logistics' | 'machining' | 'assembly' | 'mechanics' | 'quality';
export type ShiftId = 'day' | 'night' | 'off';
export type EmployeeAvailability = 'available' | 'resting' | 'sick' | 'absent';
export type TraitId = 'old-hand' | 'strict' | 'tireless' | 'nervous' | 'young-specialist' | 'old-timer';
export type WorkPost = 'none' | 'cutter' | 'bench' | 'quality' | 'logistics';
export type ContractStatus = 'offered' | 'active' | 'completed' | 'failed' | 'expired';

export type TaskType =
  | 'haul-steel'
  | 'cut-steel'
  | 'haul-blank'
  | 'assemble-product'
  | 'inspect-product'
  | 'rework-product'
  | 'scrap-product'
  | 'deliver-product'
  | 'repair-machine'
  | 'service-machine';

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

/** Axis-aligned footprint in tiles; `position` is the top-left cell. */
export interface Size {
  width: number;
  height: number;
}

export interface Tile {
  kind: TileKind;
  room: RoomId;
  zone: ZoneKind;
  doorOpen?: boolean;
}

/** Placed prop / work station on the map. */
export interface Facility {
  position: Position;
  size: Size;
}

export interface FacilityPositions {
  steelStockpile: Facility;
  cutter: Facility;
  bench: Facility;
  qualityDesk: Facility;
  finishedStockpile: Facility;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  position: Position;
  skills: Partial<Record<Skill, number>>;
  salary: number;
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

export interface Candidate {
  id: string;
  name: string;
  role: string;
  skills: Partial<Record<Skill, number>>;
  traits: TraitId[];
  salary: number;
  hireCost: number;
  preferredPost: WorkPost;
}

export interface ServiceRecord {
  day: number;
  kind: 'repair' | 'service';
  note: string;
  partsUsed: number;
}

export interface Machine {
  id: string;
  name: string;
  kind: 'cutter' | 'bench' | 'old-press';
  position: Position;
  size: Size;
  condition: number;
  operational: boolean;
  hoursSinceService: number;
  /** Wear multiplier; lower after reliability upgrade. */
  wearMod: number;
  upgraded?: boolean;
  serviceLog: ServiceRecord[];
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
  spareParts: number;
  scrap: number;
}

/** Parallel queues tracking unit quality alongside inventory counts. */
export interface QualityQueues {
  cutBlank: number[];
  blankAtBench: number[];
  assembledAtBench: number[];
  inspectedProduct: Array<'good' | 'hidden'>;
}

/** Active production target driven by an accepted contract (or idle). */
export interface ProductionOrder {
  contractId?: string;
  title: string;
  targetProducts: number;
  completedProducts: number;
  dueDay: number;
  status: 'idle' | 'active' | 'completed' | 'failed';
  advance: number;
  completionPay: number;
  grant: number;
  failPenalty: number;
  flawlessBonus?: number;
  earlyBonus?: number;
  earlyDaysRemaining?: number;
}

export interface Contract {
  id: string;
  title: string;
  targetProducts: number;
  dueDays: number;
  advance: number;
  completionPay: number;
  grant: number;
  failPenalty: number;
  reputationRequired?: number;
  flawlessBonus?: number;
  earlyBonus?: number;
  earlyDaysRemaining?: number;
  status: ContractStatus;
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
  code: 'materials' | 'specialist' | 'route' | 'machine' | 'deadline' | 'fatigue' | 'absence' | 'shift' | 'parts' | 'quality' | 'funds';
  message: string;
}

export interface WorldState {
  width: number;
  height: number;
  tiles: Tile[];
  mapVersion: number;
  facilities: FacilityPositions;
  employees: Employee[];
  hirePool: Candidate[];
  machines: Machine[];
  tasks: Task[];
  inventory: Inventory;
  qualityQueues: QualityQueues;
  funds: number;
  contracts: Contract[];
  order: ProductionOrder;
  qualityChecks: number;
  reputation: number;
  shippedHiddenDefects: number;
  preferScrap: boolean;
  rngState: number;
  schedule: ShiftSchedule;
  lastPeopleDay: number;
  nextEmployeeId: number;
  nextContractOffer: number;
  timeMinutes: number;
  speed: number;
  paused: boolean;
  nextTaskId: number;
  log: string[];
}
