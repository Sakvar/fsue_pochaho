import type { DepartmentId, ProjectId, ProjectStatus } from '@/game/types'

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  theory_lab: 'Отдел теоретической физики',
  special_contour: 'Особый контур',
  supply_office: 'Снабжение',
  curator_office: 'Кураторский отдел',
  anomaly_lab: 'Лаборатория аномалий',
  closed_archive: 'Архив закрытых разработок',
}

export const PROJECT_LABELS: Record<ProjectId, string> = {
  lunar_program: 'Лунная программа',
  psychotronic_chair: 'Психотроническое кресло',
  anomaly_containment: 'Контур удержания аномалий',
  parallel_supply_chain: 'Параллельная логистика',
  classified_ai: 'Классифицированный ИИ',
  deep_archive: 'Глубокий архив',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  locked: 'Заблокирован',
  available: 'Доступен',
  active: 'Активен',
  completed: 'Завершён',
  failed: 'Провален',
}
