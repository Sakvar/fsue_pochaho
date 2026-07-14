import { CONTRACT_TEMPLATES, type ContractOfferTemplate } from '../content/contracts';
import { adjustReputation, reputationLabel } from './quality';
import type { Contract, ProductionOrder, WorldState } from './types';

const DAY_MINUTES = 24 * 60;

export function offeredContracts(world: WorldState): Contract[] {
  return world.contracts.filter((item) => item.status === 'offered');
}

export function acceptContract(world: WorldState, contractId: string): boolean {
  if (world.order.status === 'active') {
    addEconomyLog(world, 'Уже есть активный контракт. Сначала сдайте или сорвите текущий.');
    return false;
  }

  const contract = world.contracts.find((item) => item.id === contractId && item.status === 'offered');
  if (!contract) {
    addEconomyLog(world, 'Контракт не найден или уже недоступен.');
    return false;
  }

  const day = currentDay(world);
  contract.status = 'active';
  for (const other of world.contracts) {
    if (other.id !== contract.id && other.status === 'offered') {
      // keep other offers; player can pick another after this one closes
    }
  }

  world.order = {
    contractId: contract.id,
    title: contract.title,
    targetProducts: contract.targetProducts,
    completedProducts: 0,
    dueDay: day + contract.dueDays,
    status: 'active',
    advance: contract.advance,
    completionPay: contract.completionPay,
    grant: contract.grant,
    failPenalty: contract.failPenalty,
  };
  world.shippedHiddenDefects = 0;
  world.funds += contract.advance;
  addEconomyLog(
    world,
    `Принят контракт «${contract.title}»: аванс +${contract.advance}. Срок — день ${world.order.dueDay}. Бюджет: ${Math.round(world.funds)}.`,
  );
  return true;
}

export function refreshContractOffers(world: WorldState, count = 2): void {
  const offered = offeredContracts(world);
  const needed = Math.max(0, count - offered.length);
  if (needed === 0) return;

  const usedTitles = new Set(world.contracts.map((item) => item.title));
  const available = CONTRACT_TEMPLATES.filter((template) => !usedTitles.has(template.title));
  const pool = available.length > 0 ? available : CONTRACT_TEMPLATES;

  for (let i = 0; i < needed; i += 1) {
    const template = pool[(world.nextContractOffer + i) % pool.length];
    world.contracts.push(makeOffer(template, world.nextContractOffer + i));
  }
  world.nextContractOffer += needed;
}

export function makeOffer(template: ContractOfferTemplate, index: number): Contract {
  return {
    id: `contract-${template.id}-${index}`,
    title: template.title,
    targetProducts: template.targetProducts,
    dueDays: template.dueDays,
    advance: template.advance,
    completionPay: template.completionPay,
    grant: template.grant,
    failPenalty: template.failPenalty,
    status: 'offered',
  };
}

export function idleOrder(): ProductionOrder {
  return {
    title: 'Нет активного контракта',
    targetProducts: 0,
    completedProducts: 0,
    dueDay: 0,
    status: 'idle',
    advance: 0,
    completionPay: 0,
    grant: 0,
    failPenalty: 0,
  };
}

export function settleActiveContract(world: WorldState, outcome: 'completed' | 'failed'): void {
  const order = world.order;
  if (order.status !== 'active') return;

  const contract = world.contracts.find((item) => item.id === order.contractId);

  if (outcome === 'completed') {
    order.status = 'completed';
    if (contract) contract.status = 'completed';

    const payout = order.completionPay + order.grant;
    world.funds += payout;

    if (world.shippedHiddenDefects > 0) {
      adjustReputation(world, -5 * world.shippedHiddenDefects);
      addEconomyLog(
        world,
        `Контракт выполнен, но ${world.shippedHiddenDefects} корпус(ов) ушли со скрытым браком. Выплата +${payout}. Репутация: ${Math.round(world.reputation)} (${reputationLabel(world.reputation)}).`,
      );
    } else {
      adjustReputation(world, 4);
      addEconomyLog(
        world,
        `Контракт «${order.title}» закрыт: +${order.completionPay} и грант +${order.grant}. Репутация: ${Math.round(world.reputation)} (${reputationLabel(world.reputation)}).`,
      );
    }
  } else {
    order.status = 'failed';
    if (contract) contract.status = 'failed';
    world.funds = Math.max(0, world.funds - order.failPenalty);
    adjustReputation(world, -12);
    addEconomyLog(
      world,
      `Срок контракта сорван: сдано ${order.completedProducts} из ${order.targetProducts}. Штраф −${order.failPenalty}. Репутация падает.`,
    );
    for (const task of world.tasks.filter((item) => !['completed', 'failed'].includes(item.state))) {
      task.state = 'failed';
      task.blockedReason = 'Контракт закрыт после срыва срока';
      const employee = world.employees.find((item) => item.id === task.assignedEmployeeId);
      if (employee) {
        employee.currentTaskId = undefined;
        employee.taskPhase = undefined;
        employee.path = [];
        employee.status = 'idle';
        employee.workRemaining = 0;
      }
    }
    applyContractFailureMorale(world);
  }

  world.contracts = world.contracts.filter((item) => item.status === 'offered');
  refreshContractOffers(world, 3);
}

function applyContractFailureMorale(world: WorldState): void {
  for (const employee of world.employees) {
    const young = employee.traits.includes('young-specialist');
    employee.morale = Math.max(0, employee.morale - (young ? 18 : 8));
    employee.stress = Math.min(100, employee.stress + (young ? 12 : 5));
  }
}

function currentDay(world: WorldState): number {
  return Math.floor(world.timeMinutes / DAY_MINUTES) + 1;
}

function addEconomyLog(world: WorldState, message: string): void {
  const day = currentDay(world);
  const minutes = Math.floor(world.timeMinutes % DAY_MINUTES);
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const rest = (minutes % 60).toString().padStart(2, '0');
  world.log.unshift(`[День ${day}, ${hours}:${rest}] ${message}`);
  world.log = world.log.slice(0, 12);
}
