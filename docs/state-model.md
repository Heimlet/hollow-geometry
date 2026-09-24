# Состояние сцены

Настройки принадлежат `js/state.js`, а не DOM или экземплярам Three.js.
Поток данных: команда → reducer → неизменяемый снимок → подписчики сцены и UI.

## Правила

- `preset/select` — атомарно выбирает пресет, включает необходимые фигуры и рёбра,
  для Метатрона включает линии и ненулевую прозрачность, останавливает автовращение.
  Оформление остальных фигур сохраняется; активный пресет лишь приглушает их.
- Повторное нажатие активного пресета завершает режим, как и кнопка ×. Включённые фигуры остаются видимыми.
- `objects/change` — ручная настройка одного объекта, группы или всех объектов одной
  командой. Завершает режим пресета, чтобы старые эффекты не спорили с новым выбором. Выключение фигуры каскадно выключает все её вложенные тумблеры. Включение ранее скрытой фигуры включает стандартные части; явные поля команды имеют приоритет. Включение дочернего тумблера показывает родительскую фигуру.
- Выход из пресета убирает акцент и направляющую его оси, но не откатывает видимость:
  включённые пресетом объекты остаются включёнными, как и показывают тумблеры.
- `recursion/change` меняет исключительно количество/масштаб копий. Пресет и настройки
  объектов сохраняются. UI не вызывает пересоздание геометрии самостоятельно.
- Настройки отображения (звёзды, автовращение, скорость, направляющая) также идут через
  команды. Камера и OrbitControls остаются отдельным механизмом в `scene.js`;
  у режима камеры один владелец, UI читает его через `projection-change`.

## Ответственность модулей

- `preset-data.js`: описания пресетов без DOM, камеры и побочных эффектов.
- `state.js`: проверка команд, переходы состояния, селектор группового тумблера.
  Снимки рекурсивно заморожены. Прямое изменение и вложенная отправка команд из
  подписчика запрещены.
- `levels.js`: создаёт/освобождает геометрию, применяет текущий снимок ко всем уровням.
  Собственных настроек, фокуса пресета или публичного метода пересборки здесь нет.
- `presets.js`: реагирует на выбранный пресет — камера и дополнительные линии звезды.
  При выходе через любое действие очищает эффекты и останавливает перелёт.
- `ui.js`: отправляет команды и отображает состояние. Групповой тумблер вычисляется
  из состояния дочерних объектов; выделение пресета и кнопки рекурсии — тоже.
- `guide.js`: читает тот же активный пресет и настройки направляющей.
- `exploration-data.js`: коллекции для сборки и владельцы ракурсов. Пять Платоновых
  тел используют общий механизм сборки, но не добавляются в математический каталог соединений.
- `camera-views.js`: запоминает target, up, направление, видимую высоту и Depth
  по `viewContext` в рамках текущего сеанса. Это состояние камеры, а не копия настроек фигур.

`view/focus` выбирает раздел исследования. Открытие заголовка коллекции, быстрый
переход и редактирование её объектов восстанавливают её последний вид; первый
вход использует исходный ортографический ракурс. Переключение отменяет незавершённый
перелёт. При выборе нового пресета вид предыдущего раздела сохраняется, но камера
начинает перелёт из текущего положения, без предварительного сброса Depth.
Кадровые обновления анимаций, рекурсия и общие «Вкл./Выкл. всё» фокус не меняют.
Ссылки из текста и кнопка «Фигура» у пресета только открывают настройки: они не
выбирают другой раздел и не снимают текущую проекцию. Ручная правка тумблеров
затем выполняет обычную команду редактирования.

Верхняя панель управления находится вне прокручиваемого и скрываемого меню.
Она доступна на широком и узком экранах. Крупные разделы открываются прокруткой
к началу, отдельные настройки — к середине доступной области.

Не добавлять параллельные `masterVis`, `activePreset`, копии настроек в DOM или
`window._...`. Новое взаимодействие должно проходить через команду и проверяться
как часть последовательности действий.

## Проверки без npm/сборки

Скачать модуль той же закреплённой версии, что в importmap, во временный каталог:

```sh
curl -fsS https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js -o /tmp/geometry-three-0.167.0.mjs
node tests/recursion.mjs /tmp/geometry-three-0.167.0.mjs
node tests/projection.mjs /tmp/geometry-three-0.167.0.mjs
```

Первый тест использует реальные классы геометрии Three.js и тестовую сцену без
WebGL/DOM. Проверяет все 22 пресета после полного отключения объектов и их деталей,
перестройку рекурсии, ручные переопределения, атомарность, групповой селектор,
неизменяемость снимков и 300 детерминированных смешанных переходов. После каждого
перехода сравнивает состояние с фактическими экземплярами геометрии.
Второй проверяет математику проекций и сохранение масштаба камеры.

В браузере дополнительно проверять: выключить Платоновы тела → выбрать «Квадрат» →
изменить число уровней и масштаб → вручную выключить куб → повторно выбрать
«Квадрат». Геометрия, тумблеры, подпись пресета и контур должны согласовываться.

## Временные эффекты и выбор объекта

`preset-hints.js` создаёт отдельные подсказки: грани/рёбра куба для Метатрона и звезду
для пентаграммы. Их срок — 5000 мс с момента выбора пресета. Новый вход в пресет
перезапускает срок; повторное нажатие активного пресета завершает его и удаляет эффект. Время проверяется в кадре, без отложенных
таймеров, которые могли бы удалить эффект следующего пресета. Эти подсказки не
изменяют настройки объектов. Направляющая читает тот же список живых подсказок.

`picking.js` отвечает за временное выделение, список попаданий и подпись в сцене.
Выделение рисуется отдельным контуром без изменения материалов моделей. Список
сохраняет все типы фигур и уровни рекурсии, убирая дубликаты попаданий в грани.
Ручной выбор, наведение и кнопки информации в панели используют один механизм.
При изменении состава/настроек сцены ссылки на выбранные экземпляры сбрасываются.

Проверка времени эффектов и выбора вложенных объектов:
`node tests/inspection.mjs /tmp/geometry-three-0.167.0.mjs`.

## Ссылки из текста на настройки

`settings-links.js` связывает семантические ключи (`object.cube`, `detail.cube.edges`,
`display.stars`) с зарегистрированными элементами панели. Переход раскрывает группы,
прокручивает и фокусирует целевой раздел, подсвечивает его и сохраняет точку возврата.
Навигация не отправляет команды в store и не меняет тумблеры. Новые описания
обрабатываются через `linkText`; ссылки создаются только для существующих настроек.
Кнопки выбора пресета/фигуры остаются действиями; рядом с выбором фигуры есть
отдельная ссылка «Настройки». В подписи сцены название ведёт к настройкам, `i` —
к описанию. Проверка русских форм и точности назначения: `node tests/settings-links.mjs`.

## Золотое сечение

`display.golden` — независимый флаг store, по умолчанию выключен. Его включение
не меняет видимость объектов. Быстрые кнопки показа фигур отправляют обычные
`objects/change`; «Ракурс φ» завершает пресет, выключает автовращение и выставляет
ортографическую камеру относительно выбранного построения.

`golden-math.js` находит отношения на фактических координатах BufferGeometry:
уникальные вершины, прямоугольники (общая середина диагоналей, прямой угол и φ),
пятиугольные плоскости из треугольников граней, пересечения диагоналей и деление
рёбер октаэдра вершинами икосаэдра. Допуск для отношения — 2e-5, для геометрии —
относительный к размеру тела. Для додекаэдра золотые прямоугольники строятся по
центрам граней; прямоугольники на его собственных вершинах не выдаются за золотые.

`golden.js` строит список для всех видимых икосаэдров/додекаэдров и уровней рекурсии.
Показан один выбранный пример: меньшая длина голубая, большая золотая. Подписи
показывают измеренные длины. Щелчок по отрезку/вершине, метке φ или подписи открывает
объяснение. Подложка прямоугольника клики не перехватывает. Рекурсия пересоздаёт
построения из новой геометрии; отключение режима освобождает ресурсы подсказок.

Проверки: `node tests/golden.mjs /tmp/geometry-three-0.167.0.mjs` — количества,
измеренные отношения, прямые углы/плоскости, поворот, три масштаба, отрицательный
контроль на кубе. Все прежние регрессионные тесты также должны проходить.

Математические справки:
- https://mathworld.wolfram.com/RegularIcosahedron.html
- https://mathworld.wolfram.com/RegularDodecahedron.html
- https://cs.smu.ca/~dawson/images3.html

Начальная рекурсия — один уровень. Панель начинается со свёрнутых «Рекурсия» и
«Отображение», за ними идут развёрнутые «2D Проекции». Начальные тумблеры фигур
и их частей выключены; автовращение выключено, звёзды включены.


## Переход к 2D-пресету

`camera-transition.js` задаёт две последовательные фазы: 1200 мс на ракурс и размер,
затем 900 мс на плавное уменьшение Depth до нуля. При исходном Depth=0 вторая фаза
не нужна. Автоматический `setDepth` не посылает событие ручного управления и не
перезаписывает последнюю выбранную пользователем глубину перспективы. OrbitControls,
ручной Depth, Reset и смена пресета отменяют предыдущую анимацию.

## Построения φ

`study` хранит выбранное построение, прогресс, воспроизведение, скорость, шаги,
число витков, размер и привязку к найденному элементу. `studies-math.js` содержит
спираль, точное разбиение прямоугольника и вложенные звёзды по пересечениям диагоналей.
`studies.js` строит сцену, управляет плоскостью и подписывает измерения. Детализация
спирали зависит от экранного масштаба; дополнительный canvas сохраняет читаемую
толщину контуров на экранах с высоким DPR. Raycasting использует ту же 3D-геометрию.
Режим не включает другие фигуры неявно, кроме явно выбранных быстрых кнопок.

## Соединения и исследовательские слои

- `compound-data.js` задаёт стабильные ID четырёх коллекций и их компонентов.
- `polyhedra-math.js` строит канонические соединения в координатах додекаэдра,
  выпуклую оболочку, пересечение полупространств, 2D-контур и обратимые смещения.
- `lab-state.js` описывает и проверяет параметры вращения, слоёв и разнесения.
- `lab-ui.js` связывает контролы с командами store. `assembly/change` одной
  командой запускает/перематывает разборку включённых тел. Только полностью пустая
  коллекция включается целиком; частичный выбор сохраняется.
- `lab.js` рассчитывает преобразования компонентов и производную геометрию.
  Исходные координаты не накапливают изменения; все смещения при 0 равны нулю.
- `lab-projection.js` рисует текущую ортографическую проекцию в отдельной панели.

Порядок кадра: камера → анимация/преобразования лаборатории → выбор объектов →
измерения φ → построения → WebGL → направляющие и плоская проекция. Производные
слои используют те же преобразования, что тела и raycasting. При общем повороте
готовые оболочка/пересечение поворачиваются без пересчёта локальной формы.

`source` отключает только отображение вычислительных источников. Это позволяет
показывать только пересечение без потери данных двух тетраэдров. Полное отключение
Меркабы выключает анимацию, оболочку, пересечение, проекцию и дочерние тумблеры.
Включение исследовательского слоя из пустой сцены атомарно включает источники.
Обычное повторное включение тел восстанавливает их отображение после режима
«Только пересечение». Эти правила применяются также к solo/restore.

У Explode две явно выбранные области: вся сцена/уровни и тела внутри коллекций
(Платоновы тела и каждое соединение имеют собственный прогресс сборки).
При переходе в другую область предыдущие смещения сбрасываются. Начальная раскладка
лежит в плоскости обзора и фиксируется на время разнесения; отключение фигуры не
меняет позиции остальных. Кнопка «Вместить» учитывает боковую панель; на узком
экране сворачивает её. Разнесение влияет на реальное пересечение: тела могут
перестать иметь общий объём. Контакт обозначается отдельно от объёмного тела.

## Полный набор проверок

Все проверки обходятся без npm и сборки. Аргумент — тот же локальный модуль Three.js
0.167.0, что описан выше. Запускать `node tests/<имя>.mjs /tmp/geometry-three-0.167.0.mjs`:

- `camera-transition`, `preset-transition`, `projection`: фазы камеры и точность проекции;
- `recursion`: общий store, все пресеты, группы и реконструкция сцены;
- `inspection`, `settings-links`: выбор перекрывающихся объектов, временные эффекты и ссылки;
- `golden`, `studies`: измерения φ и три исследовательских построения;
- `polyhedra`: оболочка, пересечение, регулярность соединений и симметрии;
- `lab-runtime`: совместная работа слоёв, рекурсия, reset, explode, solo/restore,
  атомарность и освобождение ресурсов.

Регрессии навигации в `preset-transition` проверяют возврат из соединений к
Платоновым телам с сохранением pan, zoom, up, Depth, отменой старой анимации и
отсутствием перехвата фокуса кадровыми обновлениями. `lab-runtime` проверяет
полную разборку и точную сборку пяти тел на трёх уровнях, сохранение ориентации,
частичного выбора и каскадное выключение.

## Быстрые действия в сцене

`scene-selectors.js` задаёт видимость обычных и производных объектов, их адреса
настроек и доступность команд сборки. «Разобрать» недоступно на 100% и во время
движения наружу; «Собрать» — на 0% и во время обратного движения; пауза — только
во время движения; сброс — при ненулевом прогрессе или запущенной анимации.
Пустую коллекцию по-прежнему можно включить командой «Разобрать».

`object/visibility` — атомарный чекбокс из списка попаданий: использует обычные
правила каскада, завершает пресет, сохраняет контекст/камеру. Список не закрывается
и сохраняет выключенные строки до следующего выбора, поэтому их можно включить
обратно. Чекбоксы разных уровней одного типа синхронизируются с общей настройкой.

`object/only` оставляет выбранный тип фигуры на существующих уровнях рекурсии,
скрывает остальные тела и исследовательские наложения, останавливает движения
лаборатории. Положение камеры и текущие смещения выбранного объекта сохраняются.
Для оболочки/пересечения вычислительные источники остаются в прежнем состоянии,
но `source=false` скрывает их отрисовку. Форма производного тела не меняется.
Карточка остаётся открытой; если объект уже единственный, её кнопка отключена.

При смене или завершении пресета панель Меркабы выключается, если следующий
пресет не задаёт `labProjection`. Новый пресет Меркабы задаёт свою ось. Ручная
панель без пресета сохраняется при изменении рекурсии и обычной анимации.

Дополнительная проверка: `node tests/interaction-state.mjs` (без Three.js) —
доступность команд, переходы панели между всеми пресетами, атомарные переключатели
и изоляция каждого обычного/производного объекта. Всего 11 наборов тестов.

## История и клавиатура

`createStore()` хранит до 100 предыдущих неизменяемых снимков и отдельную ветку
повтора. Новая правка после отмены очищает повтор. `beginHistoryGroup()` /
`endHistoryGroup()` объединяют составной клик и все события input одного жеста
ползунка в одно действие. `shortcuts.js` обслуживает Ctrl/⌘ Z, Ctrl/⌘ Shift Z,
Ctrl Y, кнопки верхней панели и S/G/H/R. В текстовых полях остаётся нативная отмена.

Кадры отправляются через `tickLab`, `tickStudy`, `tickGoldenScene` с
`history:false`: они обновляют единое состояние, но не добавляются в историю и не
удаляют ветку повтора. Undo/redo восстанавливает настройки и прогресс; движения
сборки/вращения Меркабы/построений ставятся на паузу. Свободный OrbitControls, Depth и
ручной сброс камеры в историю настроек не входят; ракурсы разделов по-прежнему
обслуживает `camera-views.js`.

## Связи φ в самих фигурах

`golden-scene/start` атомарно включает нужные тела, сбрасывает разнесение и другие
построения, выбирает первый уровень сцены и раздел φ. Камера сначала прилетает,
затем плавно становится ортографической. `golden-scene/change` управляет паузой и
прогрессом. Ручная смена фигур, пресета, рекурсии, сборки или построения завершает
сценарий и убирает его аннотации. Завершение сценария оставляет его тела включёнными.

`golden-scene-data.js` — тексты и длительности; `golden-scenes.js` — UI, камера и
построение из реальной геометрии первого уровня:

- три попарно перпендикулярных золотых прямоугольника с общими 12 вершинами икосаэдра;
- 12 точек золотого деления рёбер октаэдра точно совпадают с вершинами икосаэдра;
- шесть пентаграмм на реальной грани додекаэдра, вычисленных пересечением диагоналей.
  Масштаб каждого следующего уровня равен φ⁻². Это локальная рекурсия на грани,
  независимая от ползунка количества копий целых тел.

Контуры используют текущую камеру, подписи измеряют модельные отрезки. При
приближении рекурсии выбирается читаемый уровень подписей. Кнопка «В центр звезды»
использует перелёт с ненулевым 3D target, не перемещая геометрию.

`starfield.js` — объёмное сферическое поле с двумя яркостными слоями.
Отдельная перспективная камера неба копирует ориентацию камеры фигур. Расстояния
до звёзд различны; их размер зависит от глубины. Компенсация FOV камеры фигур не
выбрасывает наблюдателя из звёздной сферы. По умолчанию 2400 звёзд, диапазон 200–8000; количество
хранится в `display.starCount`, переключатель — в `display.stars`.
В финальном туре с начала расширения (глава 7) до конца главы 10 небо плавно
набирает до 12000 звёзд и сохраняет эту плотность до финала. Время берётся из тура:
пауза, переходы и перемотка воспроизводимы. Новые звёзды проявляются прозрачностью
в уже выделенных буферах; сохранённое количество и выключатель не меняются.
После выхода из тура используется выбранная пользователем плотность.
`star-budget.js` отслеживает устойчивую частоту кадров: ниже 35 FPS постепенно
убирает только дополнительные звёзды, выше 52 FPS медленно возвращает их.
Пауза, скрытая вкладка и длинные разрывы между кадрами не считаются просадкой.
При перезапуске дополнительные звёзды плавно уходят вместе с конструкцией.

Дополнительная проверка: `node tests/history.mjs`. Расширенный `golden.mjs` проверяет
ортогональность, покрытие 12 вершин и шесть точных уровней на каждой грани при трёх
масштабах; `preset-transition.mjs` — перелёт к ненулевому target.


## Простые туры

По умолчанию `ui.mode = simple`: девять крупных карточек запускают фильмы с
94 главами. Лаборатория доступна вторым режимом. `tour-state.js` строит каждую
главу из полной декларативной сцены, а `frameTour` вычисляет кадр из времени:
возврат к главе и повторное воспроизведение не накапливают трансформации.

Камера сначала перелетает; только после этого начинается отсчёт главы. `auto=true`
переключает главы без действий пользователя; опция остановки ждёт «Продолжить».
В свободной фазе ручное вращение не останавливает фильм; кнопка ракурса возвращает камеру к текущему моменту сценария.
Ручная правка сцены завершает тур. В меню туров видны только звёзды, сохранённая
сцена возвращается при переходе в лабораторию. В турах названия открывают справку с паузой; в лаборатории — настройки.

`tickTour` не попадает в историю. Восстановление истории ставит фильм на паузу.
Управление камерой из подписчика не должно выдавать себя за ручной жест:
`camera-context-change` отделён от `camera-manual-change`.

## Зеркальные пары и Метатрон

`mirror-data.js` задаёт отражение относительно общего центра: p → −p.
У тетраэдра отдельная пара `tetrahedron_mirror`. Остальные четыре тела совпадают
со своими отражениями; повторная геометрия для них не создаётся.

Кнопка пары включает исходный и отражённый тетраэдры; повторное нажатие скрывает
отражённый. Скрытие исходного выключает пару и её части. Грани, рёбра и прозрачность
исходного управляют видимой парой. У пары также есть обычные picking/info/settings.
Команда `metatron/type` оставляет только выбранную пару и сеть на всех уровнях.
Чекбоксы Метатрона, Платоновы тела и подбор объектов читают один store.

`merkaba-motion.js` отделяет относительное вращение двух тетраэдров от приписанной
Друнвало схемы трёх целых звёзд. Дополнительные две звезды вращаются в отношении
34:21 и не используются при расчёте оболочки/пересечения исходных двух тел.
В режиме разнесения дополнительные звёзды скрыты. Скорости условные, источник
указан в интерфейсе; физических свойств этому рисунку не приписывается.

Базовые 14 наборов проверок: `for f in tests/*.mjs; do node "$f" /path/to/three.module.mjs; done`.
Новые проверки — `tours.mjs`, `starfield.mjs`; расширены `golden.mjs`,
`lab-runtime.mjs` и `preset-transition.mjs`.

## Режиссура, чтение и переходы в турах

Сценарий главы содержит `camera.path` (направления и доли времени), `depth`
(плавные ключи 0…1), `symbol` (интервал точной проекции), `mode`/`releaseAt`.
`tour-camera-math.js` вычисляет непрерывный ракурс, `tour-camera.js` применяет
его после `updateLab`, когда доступны реальные мировые координаты фигур.
Ключевые проходы через симметрию удерживают точную ось и Depth=0 несколько секунд,
затем возвращаются к объёму. Финалы Метатрона и Платоновых тел заканчиваются на
[1,1,1] в ортографии. В «Тенях и симметриях» главы точных силуэтов проходят от
Depth=.65 к нулю. Пауза освобождает вращение; в свободных фазах можно вращать и без паузы. Панорамирование в туре отключено.

Кадрирование рассчитывается по действительным вершинам и глубине перспективы.
Разборка постепенно расширяет границы, а не включает заранее максимальную
дистанцию. OrbitControls.target остаётся в центре 3D-объекта; место под текст
освобождается через `Camera.setViewOffset`. Камера звёзд копирует этот сдвиг.
На широком экране текст стоит справа, на узком — под фигурой. Смена размера
экрана на паузе подгоняет кадр без изменения выбранного угла.

`tour-effects.js` меняет только отрисовываемую прозрачность: оболочки становятся
видимее в объёмной фазе, перед точным плоским видом растворяются. Плоскости
золотых построений используют ту же кривую. Главы вне φ ускорены в 1,15 раза,
золотые построения сохранили длительность. Пульсация узлов тоже следует времени
тура и замирает вместе с ним.

`tour-transitions.js` сопоставляет видимые части по устойчивому ID и мировой
матрице. Общие неподвижные части не мигают. Исчезающие части на 650 мс остаются
как копии в прежних мировых координатах; новые проявляются. Геометрия и материалы
копий освобождаются после перехода. Временное затухание материалов сбрасывается
сразу после render, чтобы не загрязнять состояние лаборатории. Смена главы не
добавляет переходу лишнего времени поверх перелёта камеры. Индивидуальные полоски
прогресса показывают каждую главу и позволяют к ней перейти.

`ui.topic` и `knowledge/open`, `knowledge/close` открывают модальную справку.
Открытие останавливает тур, сохраняя id, главу, время, фигуры и настройки. Escape, крестик и
«Продолжить тур» закрывают справку и автоматически возвращают просмотр с того же момента. Выход в
лабораторию — отдельное явное действие. Ссылки на фигуры внутри тура и подбор
объектов под курсором ведут в справку. В лаборатории подбор сохраняет чекбоксы
видимости. Горячие клавиши сцены не перехватывают ввод в модальной справке.

`tour-knowledge.js` содержит содержательные карточки о фигурах, φ и проекциях.
Реальные примеры (подсолнухи, квазикристаллы, симметрия белковых оболочек)
снабжены первичными источниками. Золотая спираль внутри икосаэдра обозначена как
дополнительное построение, а не собственное ребро тела. В справке φ есть
сравнение размещения точек с золотым углом и 120°.

Всего 18 наборов проверок. Новые: `tour-cinematography.mjs` (включая 14 400 проверок
попадания реальных проекций в доступный кадр), `tour-reading.mjs` и
`tour-transitions.mjs`, `tour-camera-runtime.mjs`. Запуск с локальным Three.js:

```sh
for f in tests/*.mjs; do node "$f" "$PWD/vendor/three/three.module.js"; done
```

Возврат ракурса внутри тура сохраняет время, главу и playing. Его перелёт не
останавливает таймлайн (`holdTimeline:false`), в отличие от входного перелёта
новой главы. Общий сброс камеры лаборатории по-прежнему возвращает [1,1,1].

`knowledge-preview.js` добавляет в карточки фигур самостоятельную объёмную
миниатюру с OrbitControls. Она использует снимок реальной геометрии проекта,
но собственные материалы, draw ranges и камеру: её вращение не меняет основной
ракурс. Можно перетаскивать мышью/пальцем или использовать стрелки клавиатуры.
Один renderer переиспользуется между карточками; геометрия и материалы снимка
освобождаются при закрытии или смене темы. На время справки основная сцена стоит,
а после любого закрытия просмотр продолжается автоматически.
# Metatron teaching layers and public delivery

The `fruit` tour replaces the former node tour and follows Metatron on the menu
(nine tours, 94 chapters total). `fruit-life.js` derives the planar 1+6+6 circle
layout, 18 tangencies and 78 centre pairs. `fruit-scene.js` owns the temporary
circles and teaching strokes; camera fitting uses the full circle bounds.
It never substitutes 3D cuboctahedron nodes for the planar Fruit of Life.
All node picks open the shared `fruit` reading card, which explains that distinction.
The older geometric relations renderer remains independent of scene state.

Recursion contractions and fades are functions of chapter progress. Level scales
are temporary, reset on exit; zoom remains centred on the true common centre.
Pixel-width line proxies preserve the original geometry for picking and projection,
copy draw ranges and crossfade opacity, and restore source material visibility
after every render. Tests cover geometry, grouped node picking, deterministic replay,
stroke width, range, transforms and cleanup.

## Links from reading to specific chapters

`reading-demos.js` resolves curated links by stable chapter IDs, never by a saved
numeric index. The reading dialog previews the destination and warns about replacing
scene settings / leaving the current tour. Only the confirmation calls
`startTour(id,index)`: a single atomic state transition, clearing reading history.
Cancel stays in the reading card with the current timeline frozen. Tests verify
all section titles and destination IDs, plus scene reset and no premature mutation.

The new `division` golden scene removes six squares successively in each of the
three actual golden rectangles of the icosahedron. Every remainder preserves φ;
one logarithmic spiral per plane shares the fixed point of the subdivision.
Its quarter-turn is the same similarity as a square removal. The scale comes
from analytic arc extrema, keeping every later arc inside its remainder. The subdivision
is derived in the source rectangle basis and works after rigid transforms.

OrbitControls uses a high response factor during drag (.65 in gentle mode, .8
otherwise), with a short .3 damping tail on release. The reduced rotate/zoom speed
remains available independently of long input lag.

A continuation chapter follows the same spiral from quarter-turn 6 through 14,
zooming about the shared fixed point by φ⁸. The eight new subdivisions remain
readable instead of collapsing to a dot; chapter IDs keep reading links stable.

Camera pose and `matrixWorld` are synchronized immediately after OrbitControls /
tour-camera updates, before raycasting and canvas overlays. Waiting for the later
WebGL render leaves those overlays one frame behind during manual dragging.
`render-sync.mjs` executes the actual main loop with real orthographic/perspective
matrices: 120 orbit/zoom frames agree, while removing the synchronization reproduces
the previous mismatch as a negative control.


## Continuous finale and the cube witness

The finale has 14 chapters. The cube witness holds the canonical pair for about six
seconds: the current pair stays inside its small cube, while a gold cube at
φ² times its size reveals the next scale. Eight two-quarter-turn spiral paths
start at actual corners, reach their endpoints, then reveal the future cube edges
and its octahedral core. The preceding chapter previews the enlarged live intersection.
`cubeWitnessPhase` eases the angular velocity to zero and back; entry/exit speed
still matches the neighbouring chapters.

All chapters from `torus-expansion` through the finale share `expansionFrom` / `expansionDuration`.
`expansionAt` is the shared angle/log-scale frame for source bodies, hull/intersection,
guides and camera. Torus dimensions are measured from those actual world-space
source vertices by `merkabaAnchors` / `torusFrameFromAnchors`. The clock does not
restart on automatic chapter changes, reading or pause; explicit seeking restores
the deterministic script. The visible figure grows by φ over most of a scale cycle; the camera then
retreats to make room for the next expansion. Its retreat remains monotonic in
unnormalised world coordinates. Torus shells and their scale echoes remain hidden
during cube growth and vertex tracing: the meridian sweep first draws them in
`torus-birth`, after which they follow the same ongoing expansion.

Expansion is stored logarithmically, including negative travel. At every factor
of φ⁴, objects and camera change units together; render scale stays in [1,φ⁴)
without clamping motion or changing any screen-space
relationships. Eight pooled cube/torus reference contours flow through the visible
scales; their endpoints fade before recycling. No geometry or materials are
allocated by a growth frame. The continuous part uses one transition identity,
so rotating originals never crossfade into frozen copies at chapter boundaries.
All temporary scales and teaching layers are restored on leaving the sequence.

`tests/torus.mjs` checks the held canonical pose, exact contacts, shared growth
clock, pool continuity, long-run resource identity, seeking and cleanup.
The camera runtime suite also checks the final orthographic clipping planes.

### Reversible spiral coupling

The growth law is explicit: mirrored guides link signed counterrotation to uniform
scale. Every expanding chapter uses a factor of φ per quarter-turn. The held
cube witness previews two quarters (φ²), preserving a clear scale difference.
The dodecahedron chapter measures the same φ without changing the motion law. A regular source dodecahedron and its actual pentagonal edge/diagonal
show where φ occurs; this is a chosen kinematic constraint, not growth caused by
rigid tetrahedron rotation or an electromagnetic simulation.

`tour/reverse` changes only `tour.motion.direction`; transient ticks accumulate
angle/log-scale offsets. Automatic next chapters carry them, while explicit seek,
chapter selection and replay reset them. History can undo the user's reversal;
animation ticks never pollute history. `expansionZoom` follows actual log-scale
in either direction, and camera rebasing handles forward and reverse crossings.

`torus-witness.js` reads source mesh world matrices, including current scaling and
rotation. The measured height of the current source cube is 2a. For rotation
about its vertical face axis, the canonical octahedron and the changing live
intersection share the same polar points at ±a. The circular meridian is an
explicit additional choice: R = √2a, r = a, full torus height 2a. Its upper and
lower circles pass through all eight moving vertex anchors. No future-scale
multiplier is used for height. The second shell remains a radial 6% visual echo
with the same height. Both are measured from source world coordinates.

The cube witness hands its paths, destination cube, source previews, spiral arrows
and pooled contours to the first growth chapter with matching opacity and transforms.
The camera eases changing UI offsets, keeping its target at the geometric centre.
From `torus-golden` the live intersection fades out while source tetrahedron
faces reach a stronger transient opacity of .26. Saved laboratory opacity stays unchanged. Subsequent chapters disable the derived
intersection and hull; the reference cube, golden witness and spirals remain.
The witness is a child of the actual dodecahedron transform, with five marked
vertices, an explicit face label and measured edge/diagonal lengths.

`tests/torus-coupling.mjs` checks real source vertices against the analytic AND
rendered torus, the measured dodecahedral ratio, signed φ growth, inverse travel,
chapter continuity, pause/reading/seek and bounded render coordinates. Together
with forward/reverse camera-boundary checks, there are 27 regression suites.


## Flower of Life: construction before depth

The first four chapters stay on the exact [111] orthographic view: static
nineteen-circle Flower, progressive cube edges, two triangular silhouettes, then
return to the whole circle pattern. `FRUIT_PLANAR` is shared by rendering and
camera bounds. Spheres and meridians remain invisible throughout these chapters.
The triangular outlines use the actual later tetrahedron vertices; no separate
screen overlay is introduced. The return fades these lines and restores the same
circle radii/opacity and framing as the opening. Only `circles-depth` then tilts
the camera and reveals spheres. Stable chapter IDs preserve reading destinations.

The golden growth phase also owns counterrotation: each factor of φ adds a
quarter turn, and the preview spans two quarters (φ²). The eight original vertices occupy the next cube corners and
the live intersection becomes its next octahedron at the same instant. Colour
matched preview curves lead each source vertex to that exact target. Their
preallocated exponential half-turn curves only change matrices and draw count
(start remains zero), so screen-line buffers can be reused. The dense green live
intersection carries the visual emphasis; dim source tetrahedra and cube outlines
explain it. Eight pooled octahedron contours show upcoming and previous scales,
including the exact overlap at arrival, without accumulating scene objects.

The first finale chapter briefly reveals a line, square and cube in a fixed
point lattice (`dimension-scene.js`), then blends into the existing Metatron
network. Its camera and opacity follow chapter time; seeking restores the same
geometry. Detailed narration links and reading shortcuts wait until the final chapter.
The existing construction keeps its timing, followed by an outward expansion:
the same network grows by φ² while a cyan reference retains the original
world scale. Thirteen correspondence rays join matching centres. Camera framing
retreats only partway, leaving a visible 35% increase on screen. This small fixed
pool resets on exit and does not change laboratory recursion or source vertices.

`tour-history.js` stores completed tour IDs separately in localStorage. Completion
adds an SVG eye and slightly dims the home card; scene undo/redo cannot erase it.
Blocked storage falls back to the current session. `tests/tour-history.mjs` covers
reload, invalid data and unavailable storage.

Only the opening chapter approaches from a 64-times wider view in 1.15 seconds,
retaining its exact projection axis. Later chapters retain their previous camera
transitions; resume and Camera Return keep the existing scale. Continuous rotation
chapters retain their timeline during transitions. The final chapter offers Restart:
`tour/restart` retains the current scene for a 2.4-second retreat to 1/512 size,
then atomically enters chapter zero. Restart time is transient, supports pause,
and never accumulates geometry. Tests cover replay, framing and adaptive stars.

The finale alternates intersection emphasis, the rotating pair, two golden steps
from its actual vertices to the next contour, and a dedicated spiral explanation.
The successor scale is always φ². The stable `torus-inscription` chapter ID now
opens the golden-step proof; the former centroid-based construction is removed.

`torus-cosmos.endless` completes narration but retains playback. Ticks continue
unwrapped angle/log-scale offsets at the incoming angular speed, with a fixed
chapter time and fixed resource pool. Pause and reading freeze it; closing reading
resumes the same final pose. Reverse works after completion; Restart still collapses
the construction to the opening. All other tours retain their normal completion.


### Finale construction and camera continuity

The opening network survives into chapter two at its completed φ² size. The
source cube appears on the same corners, then returns to normal scale only after
the network fades. The intersection chapter holds the canonical tetrahedra while six crossing
edge pairs reveal the six computed intersection vertices and twelve octahedral
edges. Rotation then resumes continuously. The seventh chapter follows the
actual vertices along two quarter-turns of the golden spiral. Markers at φ and φ²
reveal in order, then the convex hull joins the eight future supports. It is a cube
only at canonical alignments. Its geometry, highlighted contacts and camera bounds
share the source pose and the observer transform. The buffers are reused.

Late camera shots carry exact endpoints across chapters and include near-polar
spiral views, side views of the torus meridian and oblique source-body views.
The early growth shot retains visible enlargement. The last chapter is titled
“Расширение или сжатие”; its existing `torus-cosmos` ID remains stable for links.
The homepage and torus/coupling reading explain the explicit golden constraint,
current cube/intersection height, mirrored handedness and reversible log-scale.


The torus finale omits the unrelated icosahedron/rectangle interlude: the revealed
Merkaba proceeds directly to its six edge crossings. Golden subdivision remains
in the golden tour; φ enters the finale as the explicitly chosen spiral law.
Its two opposite-chirality guides use fixed 2,048-segment buffers over turns
[-20,12], from subpixel inward coils to an outward continuation far beyond the
frame. The window follows the supports by the same similarity, so its visible
points remain on the same mathematical trajectories through growth, reversal and
unit rebasing. Both branches have equal emphasis; no new geometry accumulates.

The intersection preview carries both long guides and the enlarged pair into the
cube witness. Its live core fades over the first 12% while the current cube/hull
appears; the enlarged frame stays fitted throughout. Source edge intensity and
all overlay poses/opacity match at the boundary. Regression checks cover this
handoff as well as witness-to-growth on desktop and phone.

The spiral-to-traces boundary also carries both guide opacities and the two
tracked vertices exactly. Extra markers, scale references and destination paths
fade with `traceEntrance`; framing uses that same envelope instead of abruptly
fitting a different set of bounds.

`torus-pair` and `torus-orbits` provide two macro shots before surface birth.
Their shared `torusMacroFocus` eases framing toward the actual source-body
bounds, reveals source faces, and returns to the overview before either chapter
ends. The live outer contour appears with the same interval.
Both the source contour and the golden successor contain their actual support points.

The full spiral window needs more depth than the framed bodies. Only during the
orthographic render, `withOrthographicDepth` moves the eye back along its own
axis and extends near/far coverage, preserving all screen XY coordinates.
A finally block restores the interactive camera, including on render errors.
The sky pass, camera transitions and free orbit use the original pose. Projection
regressions cover both branches, top/side/bottom views and near-rebase scales.


### Following the blue tetrahedron

From `torus-pair`, a four-second smooth velocity capture changes only the
rendering reference frame. `torusReferenceYaw` uses the original unwrapped angle
and the incoming chapter speed. After capture, blue has constant orientation
while pink advances at twice the original angular speed. Both continue to scale.
The state still stores the original counterrotation; the relative golden law is
therefore 180° between bodies per ×φ, rather than changing the growth rate.

`applyTourReference` applies one common vertical rotation to level groups and
live hull/intersection roots after `updateLab`. Torus teaching geometry receives
the same rotation; world-space source anchors are converted back into its local
frame before construction. Camera bounds, picking and the dodecahedron marks
follow the transformed geometry. The guide shapes keep their original golden
pitch, but move in this observer frame; blue's vertex trajectory is radial.
Pause, reverse, chapter handoffs, endless motion and numerical rebasing retain
this frame. Leaving the tour clears the transient parent rotation.

`tests/tour-reference.mjs` checks actual rendered sources, derived meshes,
teaching-layer matrices and torus contacts at 36 poses, as well as smooth capture,
fixed blue orientation and the unchanged relative growth law.

Merkaba chapters 8–9 reuse this observer frame with anchor zero and the same
vertical rotation axis. Blue stays fixed while pink turns at 18°/s relative to it;
source scale remains unchanged. Both computed layers share the observer transform.
Each 20-second chapter completes a full relative turn. The second carries the
preceding camera pose into an overhead view and returns to the diagonal; rotation
continues through this move. The following canonical chapter starts at the same
body pose. Narration, pause and seek follow this motion.

### Immediate playback control

`tour-playback.js` stops a running film on primary pointer contact, before a
chapter can advance during the gesture. Its paired click is consumed, preventing
an accidental immediate resume. Resume, keyboard and assistive clicks keep native
button behaviour. Text nodes in playback controls only change with their labels,
not on every animation snapshot. `tests/tour-playback.mjs` checks interruption at
every chapter boundary, duplicate-event suppression, cancellation and keyboard
activation.

The pause button keeps its changing label in a separate span, preserving the
desktop-only `Пробел` hint through animation updates. The hint follows the same
width/hover/pointer media query as keyboard shortcuts; touch layouts omit it.

Torus close views use the live convex hull as their outer contour. A separate
canonical cube would cut through the relatively rotated pair. The hull remains
visible while the intersection fades, touches the actual source vertices, and
becomes a cube at canonical alignments. Its height retains the same value used
by the torus construction. The reference-frame suite checks containment, contacts,
and canonical cube topology after the observer transform and scale changes.

### Torus height and the featured finale

`torus-measure.js` projects drafting dimensions from the two actual illuminated
Merkaba vertices, using the current camera and world transforms. Extension lines
are horizontal in world space; their shared vertical dimension equals the current
cube and torus height. The column slides horizontally if a macro shot would crop
it. The label avoids the dodecahedron annotations and camera control; at a polar
view the ruler fades and the number remains with a viewing-direction hint.

Height is shown as `H₀ × φⁿ`, with an ordinary growth multiplier underneath.
`H₀ = 2A` is the height before continuous expansion. The exponent is computed
from the measured height and the same logarithmic unit offset used by expansion,
so chapter transitions and numerical rebasing do not reset it. Reverse decreases
it; pause freezes it. `display.torusHeight` toggles the complete annotation without
changing playback or the scene, and survives chapter changes.

The golden axis uses one fixed two-vertex buffer extending as far as the paired
spiral window. It stays outside framing bounds, continuing beyond both edges of
the view without adding geometry over time. The finale has a separate wide card
after the regular tour grid, with a native SVG of its actual geometric motifs.

Top shots now reach the exact world-Y axis. They enter and leave along one
meridian to preserve screen roll. `exactPolarView` removes the OrbitControls
epsilon and the `lookAt` collinear-up ambiguity without changing the manual orbit
axis. The gentle polar guard applies only outside tours, so pause cannot push the
camera off its scripted axis. The pole stays fixed in world space; if its projected
endpoints coincide within one stroke width, `updateAxisView` renders one golden
point instead of passing a zero-length projection to the thick-line shader.
The torus and camera runtime suites cover top/bottom views, pause, actual
OrbitControls behaviour, and restoration of the line after tilting away.

`tests/torus-measure.mjs` verifies source contacts, true dimensions, camera
projection, on-screen placement, golden notation and rebasing continuity, plus
the independent display toggle. There are 31 regression suites.

The opening Metatron growth, its chapter-two handoff, Fruit/Merkaba nested cubes,
and continuous render-unit rebasing use golden powers. `GOLDEN_CYCLE_SCALE = φ²`
is shared; one rebase spans φ⁴. Camera compensation and the height counter use
the same unit conversion, including reverse and indefinite playback.
