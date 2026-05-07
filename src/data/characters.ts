export type CharacterProfile = {
  id: string
  displayName: string
  role: string
  dossierNote: string
  accent: string
}

export const CHARACTERS: CharacterProfile[] = [
  {
    id: 'kopylov',
    displayName: 'Главный инженер Копылов',
    role: 'Главный инженер',
    dossierNote: 'Склонен к ночным испытаниям и «ускорению цикла».',
    accent: '#6b4e3d',
  },
  {
    id: 'serov',
    displayName: 'Майор Серов',
    role: 'Куратор безопасности',
    dossierNote: 'Фиксирует отклонения. Любит печати и тишину в коридорах.',
    accent: '#3a4a5c',
  },
  {
    id: 'zinaida',
    displayName: 'Зинаида Павловна',
    role: 'Снабжение и учёт',
    dossierNote: 'Знает цены, сроки и «альтернативные маршруты» закупки.',
    accent: '#5c4a3a',
  },
  {
    id: 'bragin',
    displayName: 'Академик Брагин',
    role: 'Научный советник',
    dossierNote: 'Репутация тяжелее оборудования. Требует аккуратности в формулировках.',
    accent: '#3a4a42',
  },
  {
    id: 'lesha',
    displayName: 'Лёша',
    role: 'Молодой физик',
    dossierNote: 'Верит в чистую науку. Плохо переносит инструктажи.',
    accent: '#4a3a5c',
  },
  {
    id: 'partkom',
    displayName: 'Представитель парткома',
    role: 'Идеологический контроль',
    dossierNote: 'Переводит любой инцидент в язык «линии партии».',
    accent: '#5c2f2f',
  },
]

export const CHARACTER_BY_ID: Record<string, CharacterProfile> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
)
