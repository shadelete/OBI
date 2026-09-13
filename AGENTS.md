# AGENTS.md — Output Bazis Info (OBI)

Электрон-приложение «проєкт-папка»: користувач відкриває **папку замовлення** в
standalone-додатку, додаток знаходить усі **JSON-файли виробів** (поруч із
моделями Базиса), показує файловий оглядач і після вибору одного/кількох/усіх
виробів — об'єднаний список матеріалів / профілів / фурнітури. Дані генерує
**скрипт Базиса** (`OBI.js`), запущений усередині САПР «Базис»: він показує
діалог «Відкрити OBI» / «Зберегти» і пише JSON **поруч із моделлю**.

## Две независимые части
- **Скрипт Базиса** (корень): `OBI.js` — единственный рабочий/эталонный скрипт. Діалог «Відкрити OBI» / «Зберегти» (`NewForm`), пишет **один** JSON-файл **рядом с моделью** (`<папка модели>\<Article.Name>.json`, fallback `scriptDir\data\projects\`), запускает `OBI.exe --project <абс. путь>`. Это НЕ часть electron-приложения.
- **Electron-приложение**: `main.js`, `preload.js`, `src/renderer.js`, `src/export.js`, `src/workbook.js`, `src/updater.js`, `src/fit_rules.html`+`js`, `src/index.html`. Основной исходник UI — `src/renderer.js`. Корневые `renderer.js`/`export.js` — gitignored-артефакты, в приложении не используются. `src/workbook.js` исполняется в main-процессе (перенос в книгу «Розрахунок»).

## Критичные факты о Bazis-скриптах (иначе всё сломается)
- **Базис читает скрипты в кодировке Windows-1251**. Правки готовятся в UTF-8, затем конвертируются PowerShell: `GetEncoding(1251)` и `WriteAllText`. Cyrillic в `alert()` внутри JSON-строк, где не жалко, пишем как `\uXXXX`-эскейпы (иначе после конвертации ломается).
- **Не пользоваться Edit-инструментом для cp1251-файлов** — он не совпадёт по русскому тексту. Правки: либо переписать файл через Write (UTF-8) + конвертация, либо замена ASCII-подстрок через PowerShell с `ReadAllText(..., GetEncoding(1251))`/`WriteAllText`. Внимание: в файлах переводы строк только `\n` (без `\r`), собирать строки через `[char]10`.
- Проверка синтаксиса: `node --check file.js` (работает и на cp1251, exit=0 = ок). Тестов и линтера в репо нет.
- Скрипт завершается `Action.Finish()`, вывод через `alert()` и запись файла через `require('fs')` (доступен).

## Api Базиса, реально проверенный (эта версия!)
- **Элементы составной фурнитуры доступны ТОЛЬКО через** `fastener.GetParams('AdvParamData')` → `FindNode('Elements')` → узлы `Nodes[i]` с полями `Name`/`Value` (формат `"Имя\rКод"`)/`Count` и вложенными `Nodes[j]`. Обходить рекурсивно все уровни. Обычный обход дерева (`List`/`AsList()`) даёт `TFastener` как лист (`Count=-1`) — внутренности не достать.
- **НЕ существуют в этой сборке Базиса:** `fastenerOperations`, `modelIOOperations`, `objectTypeChecker` (искать по имени нельзя).
- `obj.GSize.x/.y/.z` — габариты объекта (не `SizeX`). `IsFastener()` — это **метод** (`obj.IsFastener()`), true бывает и у обычных блоков — сам по себе признаком стяжки не является; блок-схема — `TFurnBlock` с детьми по индексу (`Count`/`Objects[i]`).
- Рабочее правило состава: у фурнитуры с `Elements` родитель остаётся в db с деревом `elements` (вложенность) + все внутренние элементы добавляются отдельными позициями с `isComposition:true`; узел, совпадающий с родителем (имя+код), в список не дублируют.

## Где OBI.exe берёт данные (частый источник «база есть, в интерфейсе пусто»)
- **Старт завжди «з чистого листа»**: немає жодного `data\db.json`/`current_project.txt`/`save-db`. Додаток працює з **папкою проєкту** (а не одним файлом): OBI.js передає `--project <абс. шлях до JSON>`, main.js бере `dirname` як `projectRoot` і преселект = сам JSON. Без `--project` — `config.lastProjectFolder` (остання робоча папка, автозбереження в `saveConfig`).
- **Сканер проєкту** (`walkDir`/`tryReadProduct` у `main.js`): рекурсивно знаходить JSON-файли зі схемою `materials[]` + `fittings[]`. Пропускає приховані директорії (`.git`, `.obi`, …), `node_modules`, файли > 20 МБ. Крос-кодування (UTF-8 → cp1251 fallback).
- **Overlay** проєкту: `<projectRoot>\.obi\project.json` — зберігає `deleted[]` (видалені позиції), `counts{}`/`edits{}` (правки), `added{materials,profiles,fittings}[]` (додані), `order{}` (користувацький порядок), `tagOrder[]`. Не модифікує вихідні JSON-файли виробів.
- **Fit Rules** — окремий файл `<dataDir>\data\fit_rules.json` (загальний між проєктами, не входить до overlay). Хендлер `save-fit-rules` розсилає `fit-rules-updated` всім вікнам.
- Назва проєкту (= заголовок експорту) = `path.basename(projectRoot)`. Назва окремого виробу — `data.name` із його JSON.
- Base каталог: `<папка exe>` (для portable — `PORTABLE_EXECUTABLE_DIR`, інакше папка exe). Dev-запуск `npx electron .` без `--project` відкриває UI з prompt «відкрийте папку проєкту».
- **Запуск `OBI.exe` — через `--project`**: `OBI.js` передає `spawn(EXE_PATH, ["--project", <абс. шлях>], { detached, stdio:'ignore', windowsHide:true })` — шлях до щойно записаного JSON **поруч із моделлю** (`<папка моделі>\<Article.Name>.json`). Без цього аргумента додаток відкриється з порожнім explorer.
- **b3d НЕ підтримується**: `src/b3d_parser.js` і `b3d-builder.json` видалені в поточній версії. JSON пишеться виключно Базисом через `OBI.js`.
- Поиск exe (в `OBI.js`): поряд зі скриптом → збережений шлях `data\exe_path.txt` → `dist\OBI.exe` → `dist\release\OBI.exe` → вгору до 4 батьківських + cwd.

## Команды
- **Запуск при тестировании**: пользователь запускает `OBI.js` из Базиса → тот стартует `dist\OBI.exe`. Соответственно, **любые правки в `src/*.js`, `src/*.html`, `src/*.css` требуют пересборки через `npm run dist`**, иначе OBI.exe не подхватит изменения.
- Запуск UI в dev: `npm start` (или `npx electron .`, обёртка `launch.bat`).
- Сборка: `npm run dist` = `electron-builder --win --dir` — **только `dist\win-unpacked`, без portable-файла**. Финальный `dist\OBI.exe` даёт `npm run build` = `electron-builder --win` (portable). После релиза обновить `release\OBI-<ver>.zip` (OBI.exe + OBI.js + icon.bmp) вручную из `dist\OBI.exe` и текущего `OBI.js`.
- **ВАЖНО**: OBI.js запускає саме `dist\OBI.exe` (portable), тому для тестування правок у src/ через OBI.js потрібно `npm run build` (а НЕ `npm run dist` — той створює `dist\win-unpacked\Output Bazis Info.exe`, який OBI.js не використовує).
- **Обхід EBUSY при збірці**: якщо `dist\win-unpacked\resources\app.asar` (або `dist\OBI.exe`) залочено стороннім процесом (FileBlade/пошук Windows) і `npm run build` падає, збирати в свіжу temp-директорію: `npx electron-builder --win --config.directories.output="<temp>\obibuildN"`, потім копіювати готовий `obibuildN\OBI.exe` у `dist\OBI.exe`.

## Changelog — правило фиксации изменений
- Все изменения фиксируются в `CHANGELOG.md` **только когда всё получилось** (работа завершена, проверена/пересобрана — не «во время», не по ходу, а в конце, когда результат готов).
- Писать **украинской** мовой. Формат — Keep a Changelog: раздел `[Невидане]` (для наработок к следующей версии) при релизе превращается в финальный `[0.X.Y] — дата` раздел.
- При релизе новые изменения переносятся в финальный раздел, версия в `package.json` поднимается.

## Релизный процесс (актуальный тег — v0.2.0-beta.3)
- 1) поднять `version` в `package.json`, 2) `npm run build` (`dist\OBI.exe`), 3) собрать `release\OBI-<ver>.zip` = `dist\OBI.exe` + `release\OBI.js` (cp1251) + `release\icon.bmp` (см. ниже), 4) коммит + тег `v<ver>` + `push origin main --tags`, 5) `gh release create v<ver> release\OBI-<ver>.zip -R shadelete/OBI --title "OBI <ver>" --notes "<описание>"` (единственный ассет — zip; отдельно `OBI.js` на релиз НЕ кладём, он уже внутри архива).
- **Описание релиза**: писать продающее описание для пользователя (что изменилось, топ фич), а не технический changelog. Черновик лежит в `release_description.txt` в корне (если менялся текст — отредактировать `gh release edit v<ver> --notes "$(Get-Content release_description.txt -Raw -Encoding UTF8)"`). В `gh release create` можно передать `--notes-file release_description.txt` вместо `--notes`.
- **Пре-релизы** (beta/rc): `gh release create v<ver> ... --prerelease` (SKIP tota caches). Важно: пре-релизы НЕ попадают в `releases/latest` (GitHub игнорирует их там), а наш апдейтер ходит в `releases?per_page=30` и сам выбирает новейшую семантически новую версию — тому для теста обновления достаточно выложить `v0.2.0-beta.1` соответствующий ассет `OBI-0.2.0-beta.1.zip`.
- Обновление существующего релиза без смены версии: пересобрать `dist\OBI.exe`, перегенерировать `release\OBI.js` в cp1251, пересобрать `release\OBI-<ver>.zip` (через .NET `ZipArchive`, т.к. `Compress-Archive` падает на большом exe при блокировке файла), затем `gh release delete-asset` старого zip + `gh release upload` нового (оба с `--yes`/`--clobber`).
- Важно перед сборкой zip: перегенерировать `release\OBI.js` из корневого `OBI.js` в cp1251 (см. «Критичные факты»), а в `release\OBI-<ver>.zip` класть **новый** `dist\OBI.exe` (не старый `release\OBI.exe` — он не обновляется сборкой и останется без правок). Перед сборкой zip убедиться, что `dist\OBI.exe` не заблокирован запущенным процессом OBI (закрыть при необходимости).
- Полезное: `git tag v0.1.1 f6839e1` создаёт тег на конкретном коммите, `gh release create` выводит URL релиза.

## Схема JSON виробу
Один JSON на виріб — пишеться `OBI.js` поряд із моделлю. Файл — об'єкт
`{ date, name, orderName, modelFile, totalObjects, panelsCount, profilesCount, fastenersCount, materials[], profiles[], fittings[] }`:
- `name` (найменування виробу) і `orderName` (найменування замовлення) — з
  `Article.Name`/`Article.OrderName` (fallback на `currentFileData.article.*`).
  `orderName` використовується як «Приміщення» у книзі розрахунку, fallback
  — `name`.
- `modelFile` — базове ім'я файлу моделі (без шляху й розширення), дає
  оглядачу зрозуміти, до якої моделі належить виріб.
- `fittings[i]`: `{ name, code, count, tag?, export?, book? }`, доп.флаги
  `isDraft`, `isComposition`, `isComposite`, `elements[]` — дерево
  `{name, code, count, nested[]}`.
- Матеріали: `{ name, code, thickness, count, edges[], details[] }`.
  `details[i]` — `{ name, position?, width, height, cuts[] }`, де `position` —
  артикул/позиція об'єкта з моделі (`obj.ArtPos`, ставиться скриптом або
  вручну).
- Профілі: `{ name, code, material, materialCode?, supplier?, details[] }`,
  `details[i]` — `{ width, thickness, length, count, positions[]? }` (масив
  артикулів, бо профілі за позиціями не групуються).
  `materialCode` (артикул матеріалу) і сам `code` профілю пише `OBI.js`
  пріоритетно з `splitName(obj.MaterialName).code`, fallback — артикул
  профілю з `(Артикул NNN)` у назві (тобто артикул профілю = артикул його
  матеріалу). У книгу «Розрахунок» профілі потрапляють назвою матеріалу
  `material` з артикулом `materialCode`/`code` у дужках; інтерфейс профілю
  теж показує артикул матеріалу.
- Колонка «Поз.» в Excel-експорті (src/export.js) бере `position`/`positions`
  з моделі, при відсутності — порядковий номер.

Правочний шар (теги, кастомні лічильники, редагування полів, додані позиції,
кастомний порядок) — в **overlay** проєкту (див. «Где OBI.exe берёт данные»).
Вихідні JSON виробів **не модифікуються** standalone-додатком.

## Renderer / UI — структура, стили, расширенные state-ки
Приложение — **Electron frameless** (`frame:false`, без системной рамки). Всё окно рисует сам рендерер: кастомный `header` с `-webkit-app-region: drag` + кнопки сворачивания/закрытия. UI-язык интерфейса — **украинский**. Данные читает/пишет через `window.api` (preload), рендерится целиком в `src/renderer.js` (jquery-style innerHTML-шаблоны, без фреймворков/виртуального DOM).

### Файлы рендера
- `src/index.html` — каркас: `.topbar` (бренд + назва проєкту + дії + window-controls), `.workspace` → `.explorer` (оглядач папки проєкту) + `.sidebar` (категорії) + `.list-panel` (список) + `.detail-panel` (деталі) + `.fittings-detail` (постійна робоча зона фурнітури з формою додавання). Модал розрахунку `#calc-modal` (кнопка «Розрахунок» у шапці) — вибір книги `Розрахунок фурнітури`, авто-підстановка «Приміщення», запуск переносу. Кнопка экспорта — `.export-dropdown` (дропдаун «Експорт ▾»: `#export-menu` з пунктами Excel/PDF, класи `.export-menu`/`.export-menu-item`). Також boot-splash `#boot-splash` (анімація завантаження).
- `src/styles.css` — всі стилі. Базис-дизайн на нейтральних тонах: фон `#f5f7fa`, картки білі `#ffffff` з рамкою `#e3e8ef`, акцент-синій `#2b6de0`. Кольори — CSS-змінні в `:root` (світла) і `body.theme-light` (явно увімкнена світла тема).
- `src/renderer.js` — вся логіка рендера та інтерактиву.
- `src/fit_rules.html` + `src/fit_rules.js` — **окно правил експорту** (список відомої фурнітури по тегах + чорні списки фурнітури/матеріалів/профілів). Відкривається з налаштувань кнопкою «Правила експорту» → `window.api.openFitRulesWindow()`. Дані бере через `window.api.getFitRulesData()` (повертає `{ rules, fittings, materials, profiles, tagOrder }`). Контекст (поточний агрегат) рендерер пушить через `window.api.setFitRulesContext({fittings, materials, profiles})` у `rebuildAggregate()`. Видалення з чорного списку — `window.api.saveFitRules(rules)`.
- `src/export.js` — генерация XLSX (exceljs) и PDF (HTML-отчёт → `printToPDF`), CSV/JSON. Вызывается из main процесса, данные приходят от рендерера (см. IPC). См. отдельный раздел.

### Глобальное состояние и запуск
- **`db`** — **обчислений агрегат** усіх вибраних JSON (`let db = null;`). Ніколи не зберігається як є; правки пишуться в overlay (`saveDB()` → `syncOverlayFromDb` + `persistOverlay`).
- **`projectRoot`** — обрана користувачем папка; **`projectTree`** — дерево `{type:'dir',name,path,children}` зі сканера; **`products`** — `Map<path, db>` (завантажені JSON); **`selection`** — `Set<path>` вибраних виробів; **`overlay`** — `<root>\.obi\project.json` (нормалізований); **`fitIdMap`** — `Map<rowKey, id>` (стабільні id фурнітури в агрегаті).
- `DEFAULT_TAGS` (4 стандартных тега), `LEGACY_TAGS` (маппинг старых русских тегов «Петли»→«Петлі» и т.д., применяется в `normTag()`).
- `document.addEventListener('DOMContentLoaded')`: `config = await window.api.getConfig()`, `fitRules = normalizeFitRules(await window.api.getFitRules())`, потім `bindSearch`/`bindListEvents`/`bindFittingsEvents`/`bindSettingsEvents`/`bindExplorerEvents`. Далі `st = await window.api.getProjectState()`: якщо є `root` — `openProjectFolder(st.root, st.preselect)`, інакше — пустий explorer.
- `openProjectFolder(root, preselect)`: `scanProject` → дерево, `readOverlay` → overlay, `selection = preselect || Set(all product paths)`, `ensureProductsLoaded(selection)`, `rebuildAggregate()` (→ `pushFitRulesContext()`), `renderExplorer`/`renderProjectName`/`renderAll`.

### Шари рендеринга (renderer.js)
- **Стан проєкту / explorer**: `chooseProjectFolder`/`rescanProject`/`selectAllProducts`/`onSelectionChanged` (викликається на зміну виділення), `toggleDir` (розгортання папок), `renderExplorer`/`expDirHTML`/`expProductHTML`, `bindExplorerEvents`/`explorerClick`/`explorerCheckChange`. Чекбокси з indeterminate-позначкою `data-ind="1"`.
- **Агрегація**: `mergeProducts(list)` — об'єднує всі вибрані JSON у один `db` за ключами `name|code|thickness` (матеріали), `name|material` (профілі), `name|code` (фурнітура). `applyOverlayToDb()` (видалення, edits, counts, додані, порядок). `rebuildAggregate()` (`merge` → `overlay` → `tagOrder` → `applyFitRules` → `ensureTagOrder` → `ensureFitIds` → `pushFitRulesContext`). `rebuildKeepState()` зберігає вибір/фокус за ключами при ребілді.
- **Списки/деталі**: `renderSidebar` (бейджі категорій + статистика), `renderList` (картки `matCardHTML`/`profCardHTML` з drag&drop reorder), `renderDetail` (заголовок із чекбоксами «До звіту»/«У книгу», кромки, групування деталей через `groupByPosition`).
- **Фурнітура (постійна в detail-панелі)**: `renderFittings` (tag-колонки `fwColumnHTML` + картки `fwCardHTML` з інлайн-редагуванням і drag&drop), tabs `renderFwTabs`, sidebar форми `renderFwSidebar`, footer `renderFwFooter`. Multi-select (mouse marquee + ctrl/shift) — `fittingsMouseDown`/`startMarquee`/`onMarqueeMove`/`onMarqueeEnd`/`updateMarqueeSelection`/`updateRowSelection`/`.fit-marquee`. Drag&drop рядків між тегами — `fittingsDragStart/DragOver/Drop` (MIME `application/x-obi-fits`); колонок — `reorderTag` (MIME `application/x-obi-tag`); inline — `saveFitName/Tag/Code/Count/Supplier/Export/Book`. `deleteFitting`/`deleteSelectedFittings` (з confirm). `startRenameTag`/`commitRenameTag`/`addTag`/`deleteTag` (базовий «Загальна фурнітура» захищений). `applyFitRules` (теги/постачальники/чорні списки з fitRules).
- **Пошук**: `bindSearch` → `searchQuery` спільний для матеріалів/профілів і фурнітури; `fw-search-input` окремо, чистить при перемиканні табів.
- **Збереження**: `saveDB()` → `ensureTagOrder` + `syncOverlayFromDb` (tagOrder + order.*) + `persistOverlay` + `persistFitRules` + `rebuildKeepState`. `saveFit*`/`saveMat*`/`saveProf*` — зберігають у `overlay.edits`/`counts` для існуючих, або в `overlay.added.*` для доданих користувачем; `fitRules` оновлюють напряму для тегів/постачальників/чорних списків.
- **Експорти/онови/фіт-правила**: `exportExcel`/`exportPDF` (отримують `db` агрегат), `toggleExportMenu`/`closeExportMenu`, `openSettings`/`closeSettings`/`setTheme`/`setLanguage`/`saveConfig`/`exportSettings`/`importSettings`/`openFitRulesWindow`. `openCalcModal`/`chooseCalcWorkbook`/`setCalcRoomAuto`/`writeCalcWorkbook` (модал розрахунку). `checkUpdates`/`applyUpdates`/`renderUpdateResult` (`updateInfo`/`updateState`).
- **Екранирование**: `escapeHtml()`, `escapeAttr()` — ОБЯЗАТЕЛЬНО применять к любому пользовательскому/модельному тексту при подстановке в HTML.

### Стили (стиль-гайд для доработки)
- CSS-змінні в `:root` (світла тема за замовчуванням) + `body.theme-light` (явно увімкнена світла). Ключові: фон `#f5f7fa`, картка `#ffffff`, рамка `#e3e8ef`, акцент `#2b6de0`, орандж-паз `#f1a04b`.
- Бейджі категорій: `.badge-material` (синій), `.badge-furniture` (зелений), `.badge-profile` (помаранчевий), `.badge-cut` (помаранчевий паз).
- Кнопки: `.btn-primary`/`.btn-export` (сині), `.btn-secondary`, `.btn-icon` (нейтральні). Поле вводу: `.form-input` (+ `-sm`, `-tag`, `-tag-new` розміри).
- **Explorer**: `.explorer` (ліва панель оглядача), рядки `.exp-row`/`.exp-dir`/`.exp-product`, чекбокси `.exp-check` (з `data-ind="1"` для indeterminate), іконки `.exp-icon-dir`/`.exp-icon-file`, кнопки `.exp-btn` (📂/⟳/☑). Кнопка «Відкрити» для порожнього стану — `.exp-empty-btn`.
- **Workspace grid**: 4 колонки (236/194/306/1fr) у звичайному режимі; 3 колонки (236/194/1fr) у `.fittings-mode` (з `.list-panel { display:none }`).
- Селектор стилю виділення: `.fw-card.selected` (синя рамка + glow), `fit-editing` для карток.
- **Увага (drag-зона)**: контент у `.topbar` з `-webkit-app-region: drag` НЕ отримує кліки. Будь-який клікабельний елемент у шапці (напр. `.project-name`) повинен мати `-webkit-app-region: no-drag`, інакше клік перехоплюється перетягуванням вікна.
- Анімація: `@keyframes fadeIn` для появи рядків/колонок.

### IPC (preload.js → main.js)
`window.api` = `{ getProjectState, chooseProjectFolder, scanProject, loadProducts, readOverlay, saveOverlay, getProjectTitle, exportXLSX, exportPDF, getConfig, saveConfig, getCalcWorkbookConfig, chooseCalcWorkbook, writeCalcWorkbook, getFitRules, saveFitRules, getFitRulesData, setFitRulesContext, openFitRulesWindow, onFitRulesUpdated, exportSettings, importSettings, getAppInfo, checkUpdate, applyUpdate, onUpdateAvailable, windowMinimize, windowMaximize, windowClose }`. Хендлеры в `main.js` (новая архитектура — `data\db.json` больше не существует):
- `get-project-state` → `{ root, preselect }` (преселект = путь к JSON, с которого стартовало `OBI.js` через `--project`).
- `choose-project-folder` → `{ success, root }` (из диалога).
- `scan-project` → `{ success, root, name, tree, products[] }` (рекурсивный сканер, см. «Где OBI.exe берёт данные»).
- `load-products(paths)` → массив `{ path, db }`/`{ path, error }` (парсинг JSON).
- `read-overlay` / `save-overlay(data)` — чтение/запись `<root>\.obi\project.json`.
- `get-project-title` — `path.basename(projectRoot)`.
- `get-fit-rules` / `save-fit-rules` / `get-fit-rules-data` / `set-fit-rules-context` — общие правила + контекст (см. «Правила фурнітури»).
- **Экспорты `export-xlsx`/`export-pdf` принимают актуальный `db` ОТ РЕНДЕРЕРА** (а не с диска — чтобы учитывались чёрные списки `fit_rules`).
- Расчёт: `get-calc-workbook-config` отдаёт `{ workbookPath }` (путь книги из config), `choose-calc-workbook` — диалог выбора `.xlsm`, `write-calc-workbook` (payload: `{db, roomName}`) — запускает `writeCalcWorkbook(filePath, db, roomName)` из `src/workbook.js` (main-процесс, правит OOXML напрямую).
- Настройки: `get-config`/`save-config` (файл `config\config.json`), `get-app-info` (`{version, url, author}`).
- Обновления: `check-update`/`apply-update` (через `src/updater.js`), событие `update-available` (фоновая проверка при старте, если `config.autoUpdate`).

### Настройки пользователя (config)
- Файл `config/config.json` (в `dataDir()`, рядом с exe/в корне при dev), НЕ gitignored неявно — добавлен в `.gitignore`. Схема: `{ theme: "light"|"dark", language: "uk"|"ru", autoUpdate: bool, workbookPath: string }`. `readConfig()` при отсутствии файла возвращает дефолты (`autoUpdate:false`); `saveConfig()` создаёт папку через `mkdirSync({recursive:true})`. `workbookPath` — шлях до книги «Розрахунок фурнітури» (обирається в модалі розрахунку, зберігається автоматично).
- UI: модальное окно `#settings-modal` (открывается кнопкой-шестерёнкой `#settings-btn` в `.header-actions`, маркировка `data-i18n="settings.title"` и т.д.). Радио-группы темы (`settings-theme-light/dark`) и языка (`settings-lang-uk/ru`) + блок «Про застосунок» (версия/settings-version-value, автор/settings-author-value, ссылка GitHub/settings-github-link из `getAppInfo`).
- Логика (renderer.js): `openSettings`/`closeSettings`, `setTheme`, `setLanguage`, `saveConfig` (→ `window.api.saveConfig`), `renderSettingsMeta` (заполняет версию/автора/ссылку).
- Тема: `applyTheme()` вешает класс `theme-dark` на `body`; цвета — CSS-переменные в `:root` (светлая) и `body.theme-dark` (тёмная) в `src/styles.css`.
- Язык: `applyLanguage()` — обходит элементы с `data-i18n` (textContent) и `data-i18n-ph` (placeholder), перерисовывает списки через `renderAll()`. Словарь `I18N` в renderer.js (справа `uk`, `ru`), доступ через `t(key, params)` (подстановка `{n}`/`{path}`/`{tag}`); `lang()` возвращает 'ru'|'uk'. ТЕГИ (`DEFAULT_TAGS`, значения `f.tag`, «Загальна фурнітура») — это ДАННЫЕ из db, их НЕ переводят (не трогать).

### Автооновлення (src/updater.js)
- Модуль `src/updater.js` — перевірка та застосування оновлень через **GitHub Releases**. `checkUpdate({currentVersion})` → `GET api.github.com/repos/shadelete/OBI/releases?per_page=30` (список релізів), знаходить найсвіжішу семантично новішу за поточну версію (з врахуванням пре-релізів за правилами semver); `applyUpdate({assetUrl, assetName, targetExe, targetJs, targetIcon})` → скачує `OBI-<ver>.zip`, розпаковує (`tar.exe`, fallback `Expand-Archive`), генерує `updater.bat` (wrapper: чекає завершення OBI.exe → замінює `OBI.exe`/`OBI.js`/`icon.bmp` → перезапускає → чистить temp).
- **Semver-пріоритет включно з пре-релізами**: `0.2.0-beta < 0.2.0-beta.1 < 0.2.0`. Тобто пре-релізи оновлюються між собою і на фінальну стабільну, але стабільна версія не сідає назад на пре-реліз (той семантично старіший). Порівняння `compareVersions` повне (core-числа + prerelease-ідентифікатори: числові < алфавітні, коротший prerelease < довший).
- **Dev-версії не оновлюються**: лише regex `-(dev)(?!\w)` блокує перевірку. `-alpha`/`-beta`/`-rc` ВІЛЬНО оновлюються (зокрема beta → фінальна стабільна). Тому робоча версія `package.json` для розробки пишеться з суфіксом `-dev` (напр. `0.3.0-dev`) і **не йде** в тег/реліз.
- IPC у `main.js`: `check-update` / `apply-update`; `updaterTargets()` рахує `targetExe`/`targetJs`/`targetIcon` з `dataDir()` (поруч із exe). Після `did-finish-load` — `autoCheckUpdates()` (фонова перевірка, якщо `config.autoUpdate`) → подія `update-available`.
- UI (renderer.js): секція «Оновлення» в налаштуваннях — `checkUpdates()`/`applyUpdates()`/`renderUpdateResult()`, змінні `updateInfo`/`updateState`. Чекбокс авто-перевірки зберігає `config.autoUpdate` через `saveConfig()` (поле в `config/config.json`).

### Правила фурнітури (fit_rules) — запам'ятовування тегів і блеклісту
- Окремий файл `<dataDir>\data\fit_rules.json` (поряд із exe, в корені при dev) — **загальні правила**, які можна передавати іншим. Схема: `{ tags:{код:тег}, tagsByName:{ім'я:тег}, blacklist:[коди], blacklistByName:[імена], suppliers:{}, suppliersByName:{}, matBlacklist:[коди], matBlacklistByName:[імена], profBlacklist:[коди], profBlacklistByName:[імена], bookBlacklist:[коди], bookBlacklistByName:[імена], matBookBlacklist:[коди], matBookBlacklistByName:[імена], profBookBlacklist:[коди], profBookBlacklistByName:[імена] }` — *Blacklist-масиви без префікса/суфікса `Book` стосуються «До звіту» (PDF/Excel), масиви з `Book` — «У книгу» (розрахунок).
- Мета: при завантаженні нового проекту фурнітура **автоматично розкидається по тегах** і **вимикається в експорті/у книзі**, а матеріали/профілі вимикаються з експорту/книги — на основі накопиченої історії (по артикулу `code` або, якщо коду нема, по імені `name`).
- Запис: `saveFitTag`/`applyFitMove` (drag&drop) зберігають тег і в `tags[code]`, і в `tagsByName[name]`; `saveFitExport`/`saveMatExport`/`saveProfExport` та `saveFitBook`/`saveMatBook`/`saveProfBook` — блекліст відповідно «До звіту»/«У книгу» по коду (коли є код) і в `*ByName` по імені (коли коду нема). Тогл — спільний хелпер `toggleBlacklist(byCode, byName, item, checked)`.
- Зберігання в файл **окремо** через IPC: `saveDB()` рендерера викликає `window.api.saveFitRules(fitRules)` → пишеться `fit_rules.json`. **Жодного `db.json`: правила ніколи не зберігаються в JSON виробу.**
- Читання на старті: рендерер викликає `getFitRules()` (→ `readFitRules()` з `fit_rules.json`); нові масиви (`matBlacklist` тощо) нормалізуються в `normalizeFitRules()` (`if (!fitRules.X) fitRules.X = ...`). Далі `applyFitRules()` (перебиває `f.tag`/`f.export`, `m.export`/`p.export` і `f.book`/`m.book`/`p.book`), потім `ensureTagOrder()` (додає нові теги з правил у колонки).
- Дропдаун тега в UI — `fitRules.tags[f.code]`; фурнітура без коду — `tagsByName[f.name]`.
- Перегляд/зміна правил — в **окремому вікні** `src/fit_rules.html`+`src/fit_rules.js` (вкладки: «По тегах», «Фурнітура (до звіту)», «Матеріали (до звіту)», «Профілі (до звіту)», «Фурнітура (у книгу)», «Матеріали (у книгу)», «Профілі (у книгу)»), відкривається з налаштувань через `window.api.openFitRulesWindow()`. **Контекстний агрегат** (поточні матеріали/профілі/фурнітура) рендерер пушить через `window.api.setFitRulesContext({fittings,materials,profiles})` у `rebuildAggregate()`, main тримає в `fitRulesContext` і віддає через `getFitRulesData()` (без нього вікно показувало б коди замість назв). Видалення з чорного списку — `window.api.saveFitRules(rules)`. Назви чорних списків підбираються по типу вкладки (`blacklistArrays(kind)`), рендер уніфікований `renderBlacklist(kind)`.

### Экспорт (src/export.js) — кратко
`exportToXLSXBuffer(data)` → 3 листа: «Матеріали» (сгруппирован по поз.), «Профілі», «Фурнітура». Стили-константы `FONT_TITLE/FONT_HEAD/FONT_DATA/FILL_ORANGE/FILL_PEACH/BORDER` (Montserrat + оранжевая палитра, `charset:204`). Фильтрация по `export !== false` (`exported()`). Фурнитура на листе сгруппирована по тегу, порядок тегов = `db.tagOrder` (как в интерфейсе), затем алфавит. `autofitColumns()` — автоподбор ширины колонок (пропускает `cell.isMerged`; `width = max(9, ceil(maxLine*1.3 + 3))`, потолок 90) на всех трёх листах. Имя фала по умолчанию в диалоге = название проекта. При доработке UI помнить: если меняется/добавляется поле в fittings/materials, его надо поддержать и тут (иначе расхождение UI↔Excel).

**PDF** (`buildPdfHtml(data)`, хендлер `export-pdf` в main.js): чистый HTML-отчёт (тот же фильтр `exported()`, тот же порядок тегов) → скрытое окно Chromium → `webContents.printToPDF` (A4 landscape, поля 0.4 in). Каждый материал/профиль/тег — отдельная таблица `.grp` внутри обёртки `.gwrap`; колонки выравниваются `table-layout:fixed` + одинаковыми процентными `colgroup` (`MAT_COLS/PROF_COLS/FIT_COLS`). **Умный перенос разделов**: main.js измеряет макет (`PDF_MEASURE_SCRIPT`) в пикселях печати — окно 1046px ширины (контент A4 landscape минус поля @96dpi), шаг страницы `PDF_PAGE_PX = 716.86`; если в остатке страницы влезает <25% группы — ей вешается `.split` (`break-before: page`), и группа целиком переходит на следующую страницу (≥25% — разрешён естественный разрыв; осиротевший заголовок секции уезжает вместе с группой). Паритет «пиксели окна ↔ печать» проверен тестами. `esc()` обязателен для любых пользовательских/модельных строк.

### Розрахунок фурнітури (src/workbook.js) — перенос у книгу
- Модуль main-процесу, редагує книгу «Розрахунок фурнітури 0.7.1.xlsm» (`.xlsm`, з макросами). **Редагує OOXML напряму** (xlsx = zip за zlib): exceljs для цього НЕ підходить (вбиває макроси та стилі). Шлях: розпакувати `[Content_Types].xml`; для потрібних entry `inflateRaw` → змінити XML-рядок → `deflateRawSync` → onchange entry.
- Рядки переносу **копіюються з наявного рядка-шаблону** (XML-фрагмент) і підміняються значеннями — так зберігаються посилання на стилі (s=) і структура `r`/`t`.
- **Перевикористання порожніх рядків**: спершу шукається перший вільний рядок таблиці (таблиця без `<v>` даних у колонках таблиці; формули `<v/>` з порожнім значенням даними не є). Якщо порожній рядок є — запис у нього (без додавання нового). Якщо ні — копія рядка-шаблону. Причини: у книзі формули, що посилаються на фіксовані рядки/колонки, і видалення сплутаних рядків ламає `si=` спільних формул.
- Групування по «Приміщення» = `db.orderName || db.name` (з модала); у книгу переносяться лише позиції з `book !== false` (і матеріали, і фурнітура, і профілі всіх постачальників). Назва позиції з артикулом: `displayName(name, code)` → «Назва (Артикул)».
- **Окреме ввімкнення «До звіту» і «У книгу»**: у матеріалів/профілів/фурнітури два незалежні прапорці — `export` (PDF/Excel) і `book` (перенос у книгу «Розрахунок», `book === false` вимикає позицію з книги; `book` додатково показаний в схемі вище). У книгу переносяться лише позиції з `book !== false`; у PDF/Excel — лише з `export !== false`.
- Виклик: хендлер `write-calc-workbook` у `main.js` (файл шляху бере з config `workbookPath`, встановлюється кнопкою «Обрати книгу» в модалі). UI: кнопка «Розрахунок» у шапці → `#calc-modal` (renderer.js `openCalcModal`/`runCalc`), результат переносу показується користувачу. Структура книги: лист з даними фурнітури, колонки: назва, артикул, кількість, формула тощо; мерж рядків і колонок (у т.ч. «Готово»/«Добавлено») залежить від макета — не зачіпати без тесту на реальному xlsm.