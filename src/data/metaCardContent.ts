import type { Card } from '@/data/types'

export const META_CARD_LIST: Card[] = [
  {
    id: 'meta_anomaly_readings',
    title: 'Аномальные показания контура',
    speaker: 'Отдел теоретической физики',
    body: 'Осциллограф рисует аккуратные пики в те часы, когда установка выключена. Дежурный считает это оптимизмом прибора.',
    conditions: { requiresDepartment: ['theory_lab'], missingFlag: ['meta_anomaly_opened'] },
    left: {
      label: 'Списать на калибровку',
      previewHint: 'Тишина в отчётах, но прогресс замедлится.',
      effects: {
        resources: { secrecy: 4, scientificProgress: -3 },
        flags: { meta_anomaly_opened: true },
      },
    },
    right: {
      label: 'Открыть лабораторию аномалий',
      previewHint: 'Новый отдел и риск с первого дня.',
      effects: {
        resources: { funding: -5, kgbAttention: 4, scientificProgress: 3 },
        flags: { meta_anomaly_opened: true },
        institute: { unlockDepartments: ['anomaly_lab'] },
      },
    },
    weight: 2,
  },
  {
    id: 'meta_anomaly_containment_proposal',
    title: 'Проект изоляции явления',
    speaker: 'Лаборатория аномалий',
    body: 'На стол ложится предложение: «сначала удержать, потом понять». На обороте приписка: «желательно в этой последовательности».',
    conditions: {
      requiresDepartment: ['anomaly_lab'],
      hasFlag: ['meta_anomaly_opened'],
      requiresProjectStatus: { anomaly_containment: 'locked' },
    },
    left: {
      label: 'Запустить проект удержания',
      previewHint: 'Проект станет доступен и пойдёт в работу.',
      effects: {
        resources: { funding: -4, scientificProgress: 4 },
        projects: { anomaly_containment: { status: 'active', progress: 40, risk: 8 } },
      },
    },
    right: {
      label: 'Оставить в статусе наблюдения',
      previewHint: 'Риск ниже, темп ниже.',
      effects: {
        resources: { facilityStability: 3, scientificProgress: -4 },
        projects: { anomaly_containment: { status: 'available', risk: 2 } },
      },
    },
  },
  {
    id: 'meta_anomaly_unauthorized_experiment',
    title: 'Внеплановый эксперимент',
    speaker: 'Инженер ночной смены',
    body: 'Смена просит «маленький запуск без бумажной волны». Бумажная волна всё равно догонит, вопрос — когда.',
    conditions: { requiresProjectStatus: { anomaly_containment: 'active' }, missingFlag: ['meta_anomaly_breach'] },
    left: {
      label: 'Разрешить ускоренный цикл',
      previewHint: 'Прогресс резко выше, риск тоже.',
      effects: {
        resources: { scientificProgress: 7, facilityStability: -6, secrecy: -3 },
        flags: { meta_anomaly_unauthorized: true },
        projects: { anomaly_containment: { progress: 35, risk: 20 } },
      },
    },
    right: {
      label: 'Только по регламенту',
      previewHint: 'Риск под контролем, проект буксует.',
      effects: {
        resources: { facilityStability: 5, scientificProgress: -3 },
        projects: { anomaly_containment: { progress: 10, risk: -7 } },
      },
    },
  },
  {
    id: 'meta_anomaly_breach',
    title: 'Пробой удержания',
    speaker: 'Оперативный журнал',
    body: 'На минуту все часы в корпусе показали одно и то же время, после чего перестали соглашаться друг с другом.',
    conditions: { hasFlag: ['meta_anomaly_unauthorized'], missingFlag: ['meta_anomaly_breach'] },
    left: {
      label: 'Локализовать и засекретить',
      previewHint: 'Секретность спасена, но цена высокая.',
      effects: {
        resources: { secrecy: 8, facilityStability: -8, kgbAttention: 6 },
        flags: { meta_anomaly_breach: true },
        projects: { anomaly_containment: { progress: 30, risk: 24 } },
      },
    },
    right: {
      label: 'Официальная аварийная схема',
      previewHint: 'Объект выстоит, кураторы придут с вопросами.',
      effects: {
        resources: { facilityStability: 9, funding: -6, kgbAttention: 9 },
        flags: { meta_anomaly_breach: true },
        projects: { anomaly_containment: { progress: 28, risk: -12 } },
      },
    },
  },
  {
    id: 'meta_anomaly_classification',
    title: 'Классификация аномального архива',
    speaker: 'Лаборатория аномалий',
    body: 'Проект закрыт по форме, но не по смыслу. Нужно решить, куда сложить выводы: в общую папку или в комнату без окон.',
    conditions: {
      requiresProjectStatus: { anomaly_containment: 'completed' },
      missingArchiveEntry: ['archive:anomaly_classified'],
    },
    left: {
      label: 'В закрытый архив',
      previewHint: 'Откроется архивный контур и новая запись.',
      effects: {
        resources: { secrecy: 6, funding: -2 },
        institute: {
          unlockDepartments: ['closed_archive'],
          archiveEntries: ['archive:anomaly_classified'],
        },
        projects: { deep_archive: { status: 'available' } },
      },
    },
    right: {
      label: 'В общий научный том',
      previewHint: 'Репутация выше, секретность тоньше.',
      effects: {
        resources: { scientificProgress: 5, secrecy: -6, kgbAttention: 4 },
        institute: {
          reputation: 1,
          archiveEntries: ['archive:anomaly_public_digest'],
        },
      },
    },
  },
  {
    id: 'meta_anomaly_after_report',
    title: 'Сводка по аномалии',
    speaker: 'Кураторский отдел',
    body: 'Куратор просит объяснить, почему графики теперь подписываются словом «почти».',
    conditions: {
      hasArchiveEntry: ['archive:anomaly_classified'],
      requiresDepartment: ['closed_archive'],
    },
    left: {
      label: 'Ответить формулой без расшифровки',
      previewHint: 'Секретность выше, кураторство раздражено.',
      effects: { resources: { secrecy: 5, kgbAttention: 4 }, institute: { reputation: 1 } },
    },
    right: {
      label: 'Показать выдержку с пометками',
      previewHint: 'Кураторы спокойнее, архив шевелится.',
      effects: {
        resources: { kgbAttention: -4, funding: 2 },
        institute: { archiveEntries: ['archive:curator_anomaly_memo'] },
      },
    },
  },
  {
    id: 'meta_supply_missing_components',
    title: 'Недостача критических узлов',
    speaker: 'Снабжение',
    body: 'По ведомости всё на месте. На складе всё в философском смысле отсутствует.',
    conditions: { requiresDepartment: ['supply_office'], missingFlag: ['meta_supply_chain_started'] },
    left: {
      label: 'Ждать централизованную поставку',
      previewHint: 'Чище по документам, медленнее по работам.',
      effects: {
        resources: { facilityStability: -5, scientificProgress: -3, secrecy: 3 },
        flags: { meta_supply_chain_started: true },
        projects: { parallel_supply_chain: { status: 'available', progress: 8 } },
      },
    },
    right: {
      label: 'Подключить теневого поставщика',
      previewHint: 'Скорость выше, вопросы неприятнее.',
      effects: {
        resources: { facilityStability: 5, secrecy: -5, kgbAttention: 5, funding: -4 },
        flags: { meta_supply_chain_started: true, meta_shadow_supplier: true },
        projects: { parallel_supply_chain: { status: 'active', progress: 20, risk: 12 } },
      },
    },
    weight: 2,
  },
  {
    id: 'meta_supply_shadow_supplier',
    title: 'Поставщик «по знакомству»',
    speaker: 'Зинаида Павловна',
    body: 'Новый поставщик просит не писать его название полностью. Говорит, что длинные слова плохо проходят через отчётность.',
    conditions: { hasFlag: ['meta_shadow_supplier'], requiresProjectStatus: { parallel_supply_chain: 'active' } },
    left: {
      label: 'Работать через курьера',
      previewHint: 'Проект движется, риск накапливается.',
      effects: {
        resources: { facilityStability: 4, funding: -3, secrecy: -3 },
        projects: { parallel_supply_chain: { progress: 24, risk: 16 } },
      },
    },
    right: {
      label: 'Требовать официальный контракт',
      previewHint: 'Риск ниже, темп ниже.',
      effects: {
        resources: { funding: -2, kgbAttention: 2, secrecy: 3 },
        projects: { parallel_supply_chain: { progress: 12, risk: -8 } },
      },
    },
  },
  {
    id: 'meta_supply_parallel_logistics',
    title: 'Параллельная логистика',
    speaker: 'Снабжение',
    body: 'Предлагают вести двойную ведомость: одну для реальности, другую для спокойствия вышестоящих органов.',
    conditions: { requiresProjectStatus: { parallel_supply_chain: 'active' }, missingFlag: ['meta_supply_audit'] },
    left: {
      label: 'Вести двойной контур',
      previewHint: 'Стабильность и темп выше, секретность хуже.',
      effects: {
        resources: { facilityStability: 6, scientificProgress: 3, secrecy: -6 },
        flags: { meta_supply_audit: true },
        projects: { parallel_supply_chain: { progress: 26, risk: 20 } },
      },
    },
    right: {
      label: 'Свести всё к одной ведомости',
      previewHint: 'Риск проверки меньше, но контур медленнее.',
      effects: {
        resources: { funding: -4, secrecy: 4, scientificProgress: -2 },
        flags: { meta_supply_audit: true },
        projects: { parallel_supply_chain: { progress: 16, risk: -10 } },
      },
    },
  },
  {
    id: 'meta_supply_ministry_audit',
    title: 'Министерский аудит поставок',
    speaker: 'Проверяющая группа',
    body: 'Проверяющие ищут в накладных слово «почему». Оно встречается чаще, чем «утверждаю».',
    conditions: { hasFlag: ['meta_supply_audit'], requiresProjectStatus: { parallel_supply_chain: 'active' } },
    left: {
      label: 'Показать только верхний контур',
      previewHint: 'Риск сдвинется в будущее, проект ускорится.',
      effects: {
        resources: { funding: 3, secrecy: -4, kgbAttention: 7 },
        projects: { parallel_supply_chain: { progress: 20, risk: 18 } },
      },
    },
    right: {
      label: 'Раскрыть параллельный канал',
      previewHint: 'Риск падает, но проект может сорваться.',
      effects: {
        resources: { kgbAttention: 10, funding: -6, secrecy: 2 },
        projects: { parallel_supply_chain: { risk: -16, status: 'failed' } },
      },
    },
  },
  {
    id: 'meta_supply_chain_result',
    title: 'Итог логистического контура',
    speaker: 'Снабжение',
    body: 'Снабжение просит закрепить статус контура как «методически допустимый». Методика пока в разработке.',
    conditions: { requiresProjectStatus: { parallel_supply_chain: 'completed' }, missingArchiveEntry: ['archive:supply_chain_stabilized'] },
    left: {
      label: 'Утвердить как постоянный резерв',
      previewHint: 'Технологии и архив института расширятся.',
      effects: {
        institute: {
          unlockTechnologies: ['parallel_route_protocol'],
          archiveEntries: ['archive:supply_chain_stabilized'],
          reputation: 1,
        },
      },
    },
    right: {
      label: 'Свернуть контур после отчёта',
      previewHint: 'Секретность выше, опыт останется в архиве.',
      effects: {
        resources: { secrecy: 5, facilityStability: -2 },
        institute: {
          archiveEntries: ['archive:supply_chain_shelved'],
        },
      },
    },
  },
  {
    id: 'meta_lunar_deadline',
    title: 'Лунный график без Луны',
    speaker: 'Особый контур',
    body: 'В графике запуска уже стоят аплодисменты. Единственное, чего не хватает, — рабочего прототипа.',
    conditions: { requiresDepartment: ['special_contour'], requiresProjectStatus: { lunar_program: 'available' } },
    left: {
      label: 'Принять невозможный срок',
      previewHint: 'Проект стартует быстро и нервно.',
      effects: {
        resources: { scientificProgress: 6, facilityStability: -5, funding: 3 },
        projects: { lunar_program: { status: 'active', progress: 18, risk: 10 } },
      },
    },
    right: {
      label: 'Сдвинуть план на квартал',
      previewHint: 'Риск ниже, кураторы недовольны.',
      effects: {
        resources: { facilityStability: 4, kgbAttention: 5, funding: -4 },
        projects: { lunar_program: { status: 'active', progress: 10, risk: 3 } },
      },
    },
  },
  {
    id: 'meta_lunar_prototype_test',
    title: 'Испытание прототипа',
    speaker: 'Главный инженер Копылов',
    body: 'Прототип просит ток, внимание и молитву. В инструкции указан только ток.',
    conditions: { requiresProjectStatus: { lunar_program: 'active' }, missingFlag: ['meta_lunar_report'] },
    left: {
      label: 'Тестировать на полном режиме',
      previewHint: 'Прогресс выше, риск тоже.',
      effects: {
        resources: { scientificProgress: 7, facilityStability: -6, secrecy: -2 },
        projects: { lunar_program: { progress: 28, risk: 16 } },
      },
    },
    right: {
      label: 'Тестировать по ступеням',
      previewHint: 'Стабильнее, но медленнее.',
      effects: {
        resources: { facilityStability: 6, scientificProgress: 2 },
        projects: { lunar_program: { progress: 16, risk: -6 } },
      },
    },
  },
  {
    id: 'meta_lunar_propaganda_report',
    title: 'Доклад о лунных перспективах',
    speaker: 'Аппарат министерства',
    body: 'Министерство просит фразу «опережаем график». График не согласен, но его не спрашивают.',
    conditions: { requiresProjectStatus: { lunar_program: 'active' }, missingFlag: ['meta_lunar_final'] },
    left: {
      label: 'Написать “опережаем”',
      previewHint: 'Финансы легче, правда тяжелее.',
      effects: {
        resources: { funding: 8, secrecy: -5, kgbAttention: 4 },
        flags: { meta_lunar_report: true },
        projects: { lunar_program: { progress: 20, risk: 14 } },
      },
    },
    right: {
      label: 'Написать “движемся в пределах реальности”',
      previewHint: 'Риск ниже, финансирование скромнее.',
      effects: {
        resources: { secrecy: 4, funding: -5 },
        flags: { meta_lunar_report: true },
        projects: { lunar_program: { progress: 14, risk: -8 } },
      },
    },
  },
  {
    id: 'meta_lunar_launch_decision',
    title: 'Решение о запуске',
    speaker: 'Особый контур',
    body: 'Стартовое окно открыто. Все понимают, что “окно” здесь скорее политическое, чем атмосферное.',
    conditions: { requiresProjectStatus: { lunar_program: 'active' }, hasFlag: ['meta_lunar_report'], missingFlag: ['meta_lunar_final'] },
    left: {
      label: 'Запускать немедленно',
      previewHint: 'Либо прорыв, либо очень подробный отчёт.',
      effects: {
        resources: { scientificProgress: 10, facilityStability: -10, kgbAttention: 7 },
        flags: { meta_lunar_final: true, meta_lunar_success_candidate: true },
        projects: { lunar_program: { progress: 30, risk: 20 } },
      },
    },
    right: {
      label: 'Отложить и доработать',
      previewHint: 'Надёжнее, но проект может “охладеть”.',
      effects: {
        resources: { facilityStability: 6, funding: -6, scientificProgress: 3 },
        flags: { meta_lunar_final: true, meta_lunar_success_candidate: false },
        projects: { lunar_program: { progress: 18, risk: -10 } },
      },
    },
  },
  {
    id: 'meta_lunar_outcome',
    title: 'Лунный исход',
    speaker: 'Комиссия по результатам',
    body: 'Комиссия готова назвать исход “историческим” в любом направлении. Вопрос лишь в приложении к слову.',
    conditions: { hasFlag: ['meta_lunar_final'], requiresProjectStatus: { lunar_program: 'active' } },
    left: {
      label: 'Зафиксировать успех как школу',
      previewHint: 'Репутация растёт, проект завершён.',
      effects: {
        resources: { scientificProgress: 6, funding: 4 },
        institute: {
          reputation: 2,
          archiveEntries: ['archive:lunar_success_protocol'],
          unlockTechnologies: ['orbital_guidance_stub'],
        },
        projects: { lunar_program: { status: 'completed', risk: -12 } },
      },
    },
    right: {
      label: 'Зафиксировать отказ как опыт',
      previewHint: 'Потери ограничены, архив пополнится.',
      effects: {
        resources: { facilityStability: -4, funding: -4, secrecy: 3 },
        institute: { archiveEntries: ['archive:lunar_failure_report'] },
        projects: { lunar_program: { status: 'failed', risk: 10 } },
      },
    },
  },
  {
    id: 'meta_lunar_postscript',
    title: 'Послезапусковой том',
    speaker: 'Архив закрытых разработок',
    body: 'Архив просит приложить к делу либо триумф, либо объяснение, почему триумф был перенесён.',
    conditions: { requiresDepartment: ['closed_archive'], hasArchiveEntry: ['archive:lunar_success_protocol'] },
    left: {
      label: 'Сделать том учебным',
      previewHint: 'Технологии закрепятся, репутация подрастёт.',
      effects: {
        institute: {
          unlockTechnologies: ['lunar_documentation_suite'],
          reputation: 1,
          archiveEntries: ['archive:lunar_training_volume'],
        },
      },
    },
    right: {
      label: 'Оставить под грифом “только для контура”',
      previewHint: 'Секретность крепче, обмен опытом слабее.',
      effects: {
        resources: { secrecy: 5, scientificProgress: -2 },
        institute: { archiveEntries: ['archive:lunar_restricted_volume'] },
      },
    },
  },
  {
    id: 'meta_psycho_volunteer_protocol',
    title: 'Протокол добровольцев',
    speaker: 'Кураторский отдел',
    body: 'Для проекта нужен оператор. Комиссия напоминает, что слово “добровольный” должно быть на первой странице.',
    conditions: { requiresDepartment: ['curator_office'], requiresProjectStatus: { psychotronic_chair: 'available' } },
    left: {
      label: 'Только письменное согласие',
      previewHint: 'Медленнее, но устойчивее.',
      effects: {
        resources: { personnelLoyalty: 5, scientificProgress: -2 },
        projects: { psychotronic_chair: { status: 'active', progress: 14, risk: 4 } },
      },
    },
    right: {
      label: 'Ускоренный отбор через приказ',
      previewHint: 'Проект стартует быстрее и жёстче.',
      effects: {
        resources: { scientificProgress: 5, personnelLoyalty: -7, kgbAttention: 3 },
        projects: { psychotronic_chair: { status: 'active', progress: 24, risk: 12 } },
      },
    },
  },
  {
    id: 'meta_psycho_ethics_committee',
    title: 'Этическая комиссия',
    speaker: 'Председатель комиссии',
    body: 'Комиссия просит раздел “побочные эффекты” не писать шрифтом, которым обычно пишут сноски.',
    conditions: { requiresProjectStatus: { psychotronic_chair: 'active' }, missingFlag: ['meta_psycho_operator'] },
    left: {
      label: 'Описать всё подробно',
      previewHint: 'Риск ниже, темп ниже.',
      effects: {
        resources: { secrecy: 3, scientificProgress: -2, personnelLoyalty: 2 },
        projects: { psychotronic_chair: { progress: 14, risk: -8 } },
      },
    },
    right: {
      label: 'Описать “в пределах допустимого”',
      previewHint: 'Темп выше, комиссия запомнит.',
      effects: {
        resources: { scientificProgress: 6, secrecy: -4, kgbAttention: 5 },
        projects: { psychotronic_chair: { progress: 22, risk: 14 } },
      },
    },
  },
  {
    id: 'meta_psycho_operator_side_effects',
    title: 'Побочные эффекты оператора',
    speaker: 'Медчасть объекта',
    body: 'Оператор жалуется, что слышит инструкции за минуту до того, как их произнесут.',
    conditions: { requiresProjectStatus: { psychotronic_chair: 'active' } },
    left: {
      label: 'Снизить мощность и наблюдать',
      previewHint: 'Риск падает, прогресс медленнее.',
      effects: {
        resources: { facilityStability: 4, scientificProgress: -1 },
        flags: { meta_psycho_operator: true },
        projects: { psychotronic_chair: { progress: 16, risk: -10 } },
      },
    },
    right: {
      label: 'Сохранить мощность, усилить контроль',
      previewHint: 'Прогресс ускорится, риск вырастет.',
      effects: {
        resources: { scientificProgress: 7, personnelLoyalty: -4, kgbAttention: 4 },
        flags: { meta_psycho_operator: true },
        projects: { psychotronic_chair: { progress: 24, risk: 16 } },
      },
    },
  },
  {
    id: 'meta_psycho_classified_success',
    title: 'Закрытый успех протокола',
    speaker: 'Кураторский отдел',
    body: 'Куратор докладывает: «эффект подтверждён, свидетелей минимально». Требуется решить, кого считать лишним.',
    conditions: { hasFlag: ['meta_psycho_operator'], requiresProjectStatus: { psychotronic_chair: 'active' } },
    left: {
      label: 'Закрыть результаты под грифом',
      previewHint: 'Проект завершится, архив пополнится.',
      effects: {
        resources: { secrecy: 7, funding: 3, kgbAttention: 4 },
        institute: {
          reputation: 2,
          archiveEntries: ['archive:psychotronic_success'],
          unlockTechnologies: ['operator_damping_protocol'],
        },
        projects: { psychotronic_chair: { status: 'completed', risk: -10 } },
      },
    },
    right: {
      label: 'Остановить проект до разбора',
      previewHint: 'Стабильность выше, проект сорвётся.',
      effects: {
        resources: { facilityStability: 5, scientificProgress: -4 },
        institute: { archiveEntries: ['archive:psychotronic_freeze'] },
        projects: { psychotronic_chair: { status: 'failed', risk: 8 } },
      },
    },
  },
  {
    id: 'meta_psycho_operator_debrief',
    title: 'Разбор с оператором',
    speaker: 'Кураторский отдел',
    body: 'Оператор просит перевести его в архив: «там хотя бы тишина официальная».',
    conditions: { hasArchiveEntry: ['archive:psychotronic_success'], requiresDepartment: ['closed_archive'] },
    left: {
      label: 'Перевести в архив',
      previewHint: 'Архив и технологии укрепятся.',
      effects: {
        resources: { personnelLoyalty: 3, secrecy: 2 },
        institute: {
          archiveEntries: ['archive:operator_reassigned'],
          unlockTechnologies: ['cognitive_safety_memo'],
        },
      },
    },
    right: {
      label: 'Оставить в контуре',
      previewHint: 'Наука выиграет, риск повторится.',
      effects: {
        resources: { scientificProgress: 4, personnelLoyalty: -3, kgbAttention: 2 },
        projects: { classified_ai: { status: 'available', progress: 8, risk: 4 } },
      },
    },
  },
]
