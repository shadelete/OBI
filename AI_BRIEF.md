# OBI — Повний контекст для AI-розробника (BRIEF)

> Цей файл створено, щоб інша AI-модель чи новий розробник з нуля зрозумів
> весь проєкт «Output Bazis Info» (OBI) без читання всіх сирців. Доповнює
> `AGENTS.md` (правила супроводу) та `SESSION.md` (поточна точка роботи).
> Читати в зв'язці з agile-правилами з AGENTS.md.
>
> Обов'язково прочитати також: `AGENTS.md`, `SESSION.md`, `CHANGELOG.md`.

---

## 1. Що це за проєкт

Електрон-додаток «проєкт-папка»: користувач відкриває **папку замовлення** в
standalone-додатку, додаток знаходить усі **JSON-файли виробів** (поруч із
моделями Базиса), показує файловий оглядач і після вибору одного/кількох/усіх
виробів — об'єднаний список матеріалів / профілів / фурнітури. Дані генерує
**скрипт Базиса** (`OBI.js`), запущений усередині САПР «Базис»: він показує
діалог «Відкрити OBI» / «Зберегти» і пише JSON **поруч із моделлю**.

Репозиторій: GitHub `shadelete/OBI`. Автор: Alexander Bondarenko.

### Дві незалежні частини
1. **Скрипт Базиса** — `OBI.js` у корені репо (ПОВНИЙ, робочий, еталонний).
   Це НЕ частина electron-додатку. Діалог «Відкрити OBI» / «Зберегти» через
   `NewForm` Базиса. Читає фурнітуру через `GetParams('AdvParamData')` →
   `FindNode('Elements')`, пише ОДИН json поруч із моделлю та запускає
   `dist\OBI.exe` з `--project`.
2. **Electron-додаток** — `main.js`, `preload.js`, `src/`. Основне джерело UI —
   `src/renderer.js`. Кореневі `renderer.js`/`export.js` — gitignored-артефакти,
   в додатку не використовуються. `src/workbook.js` виконується в
   main-процесі (перенесення в книгу «Розрахунок»).

---

## 2. Критичні факти про Bazis-скрипти (інакше все зламається)

- **Базис читає скрипти в кодуванні Windows-1251**. Правки готуються в UTF-8,
  потім конвертуються PowerShell: `GetEncoding(1251)` і `WriteAllText`.
  Кирилиця в `alert()` всередині JSON-рядків, де не шкода, пишемо як
  `\uXXXX`-екранування (інакше після конвертації ламається).
- **НЕ користуватись Edit-інструментом для cp1251-файлів** — він не
  співпаде по російському тексту. Правки: переписати файл через Write
  (UTF-8) + конвертація, або ASCII-заміни через PowerShell із
  `ReadAllText(..., GetEncoding(1251))`/`WriteAllText`. Увага: у файлах
  переведення рядків тільки `\n` (без `\r`).
- Перевірка синтаксису: `node --check file.js` (працює і на cp1251, exit=0
  = ок). Тестів і лінтера в репо немає.
- Скрипт завершується `Action.Finish()`, вивід через `alert()` і запис
  файлу через `require('fs')` (доступний).
- Зберігається копія для релізу: `release\OBI.js` (cp1251). Після правок
  кореневого `OBI.js` її треба перегенерувати перед складанням zip.

### API Базиса, реально перевірене
- **Елементи складеної фурнітури доступні ТІЛЬКИ через**
  `fastener.GetParams('AdvParamData')` → `FindNode('Elements')` → вузли
  `Nodes[i]` з полями `Name`/`Value` (формат `"Ім'я\rКод"`)/`Count` і
  вкладеними `Nodes[j]`. Обходити рекурсивно всі рівні. Звичайний обхід
  дерева (`List`/`AsList()`) дає `TFastener` як лист (`Count=-1`) —
  внутрішності не дістати.
- **НЕ існують у цій збірці Базиса:** `fastenerOperations`,
  `modelIOOperations`, `objectTypeChecker` (шукати по імені не можна).
- `obj.GSize.x/.y/.z` — габарити об'єкта (не `SizeX`). `IsFastener()` — це
  **метод** (`obj.IsFastener()`), true буває і в звичайних блоків — сам по
  собі ознакою стяжки не є; блок-схема — `TFurnBlock` з дітьми по індексу
  (`Count`/`Objects[i]`).
- Робоче правило складу: у фурнітури з `Elements` батько лишається в db з
  деревом `elements` (вкладеність) + всі внутрішні елементи додаються
  окремими позиціями з `isComposition:true`; вузол, що збігається з
  батьком (ім'я+код), у список не дублюють.

---

## 3. Звідки OBI.exe бере дані (часте джерело «база є, в інтерфейсі пусто»)

- **Старт завжди «з чистого аркуша»**: немає жодного `data\db.json`/
  `current_project.txt`/`save-db`. Додаток працює з **папкою проєкту** (а
  не одним файлом): OBI.js передає `--project <абс. шлях до JSON>`, main.js
  бере `dirname` як `projectRoot` і преселект = сам JSON. Без `--project` —
  `config.lastProjectFolder` (остання робоча папка, автозбереження в
  `saveConfig`).
- **Сканер проєкту** (`walkDir`/`tryReadProduct` у `main.js`): рекурсивно
  знаходить JSON-файли зі схемою `materials[]` + `fittings[]`. Пропускає
  приховані директорії (`.git`, `.obi`, …), `node_modules`, файли > 20 МБ.
  Крос-кодування (UTF-8 → cp1251 fallback).
- **Overlay** проєкту: `<projectRoot>\.obi\project.json` — зберігає
  `deleted[]` (видалені позиції), `counts{}`/`edits{}` (правки),
  `added{materials,profiles,fittings}[]` (додані), `order{}`
  (користувацький порядок), `tagOrder[]`. Не модифікує вихідні JSON-файли
  виробів.
- **Fit Rules** — окремий файл `<dataDir>\data\fit_rules.json` (загальний
  між проєктами, не входить до overlay). Хендлер `save-fit-rules` розсилає
  `fit-rules-updated` всім вікнам. Контекст поточного агрегату
  (`fittings/materials/profiles`) рендерер пушить через
  `set-fit-rules-context`.
- Назва проєкту (= заголовок експорту) = `path.basename(projectRoot)`.
  Назва окремого виробу — `data.name` із його JSON.
- Base каталог: `<папка exe>` (для portable — `PORTABLE_EXECUTABLE_DIR`,
  інакше папка exe). Dev-запуск `npx electron .` без `--project` відкриває
  UI з prompt «відкрийте папку проєкту».
- **Запуск `OBI.exe` — через `--project`**: `OBI.js` передає
  `spawn(EXE_PATH, ["--project", <абс. шлях>], { detached, stdio:'ignore',
  windowsHide:true })` — шлях до щойно записаного JSON **поруч із моделлю**
  (`<папка моделі>\<Article.Name>.json`). Без цього аргументу додаток
  відкриється з порожнім explorer.
- **b3d НЕ підтримується**: `src/b3d_parser.js` і `b3d-builder.json`
  видалені в поточній версії. JSON пишеться виключно Базисом через
  `OBI.js`.
- Пошук exe (в `OBI.js`): поряд зі скриптом → збережений шлях
  `data\exe_path.txt` → `dist\OBI.exe` → `dist\release\OBI.exe` → вгору до
  4 батьківських + cwd.

---

## 4. Команди

- **Запуск при тестуванні**: користувач запускає `OBI.js` з Базиса → той
  стартує `dist\OBI.exe`. Тому **будь-які правки в `src/*.js`,
  `src/*.html`, `src/*.css` вимагають перезбірки через `npm run build`**,
  інакше OBI.exe не підхопить зміни.
- Запуск UI в dev: `npm start` (або `npx electron .`, обгортка
  `launch.bat`).
- Збірка: `npm run dist` = `electron-builder --win --dir` — **тільки
  `dist\win-unpacked`, без portable-файлу**. Фінальний `dist\OBI.exe` дає
  `npm run build` = `electron-builder --win` (portable). Після релізу
  оновити `release\OBI-<ver>.zip` (OBI.exe + OBI.js + icon.bmp) вручну з
  `dist\OBI.exe` і поточного `OBI.js`.
- **ВАЖЛИВО**: OBI.js запускає саме `dist\OBI.exe` (portable), тому для
  тестування правок у `src/` через OBI.js потрібен `npm run build` (а НЕ
  `npm run dist` — той створює `dist\win-unpacked\Output Bazis Info.exe`,
  який OBI.js не використовує).
- **Обхід EBUSY при збірці**: якщо `dist\win-unpacked\resources\app.asar`
  (або `dist\OBI.exe`) залочено стороннім процесом (FileBlade/пошук
  Windows) і `npm run build` падає, збирати в свіжу temp-директорію:
  `npx electron-builder --win --config.directories.output="<temp>\obibuildN"`,
  потім копіювати готовий `obibuildN\OBI.exe` у `dist\OBI.exe`.
- **ВАЖЛИВО (Windows)**: PowerShell ламає кирилицю в аргументах команд. Для
  шляхів із кирилицею/російськими іменами використовувати `node -e`/
  `node --check` або писати шляхи в файл/константу в JS, а не передавати
  аргументом. `head` у PowerShell немає; довгий вивід писати в файл через
  `Set-Content`.

---

## 5. Changelog — правило фіксації змін

- Усі зміни фіксуються в `CHANGELOG.md` **тільки коли все вийшло** (робота
  завершена, перевірена/перезібрана — не «під час», не «по ходу», а в
  кінці, коли результат готовий).
- Писати **українською** мовою. Формат — Keep a Changelog: розділ
  `[Невидане]` (для напрацювань до наступної версії) при релізі
  перетворюється на фінальний `[0.X.Y] — дата` розділ.
- При релізі нові зміни переносяться у фінальний розділ, версію в
  `package.json` піднімають.

## 6. Релізний процес (актуальний тег — v0.2.0-beta.3)

- 1) підняти `version` у `package.json`, 2) `npm run build` (`dist\OBI.exe`),
  3) зібрати `release\OBI-<ver>.zip` = `dist\OBI.exe` + `release\OBI.js`
  (cp1251) + `release\icon.bmp`, 4) коміт + тег `v<ver>` + `push origin
  main --tags`, 5) `gh release create v<ver> release\OBI-<ver>.zip -R
  shadelete/OBI --title "OBI <ver>" --notes "<опис>"` (єдиний асет — zip;
  окремо `OBI.js` на реліз НЕ кладемо, він уже в архіві).
- **Опис релізу**: писати продаючий опис для користувача (що змінилося, топ
  фіч), а не технічний changelog. Чернетка лежить у
  `release_description.txt` у корені.
- **Пре-релізи** (beta/rc): `gh release create v<ver> ... --prerelease`.
  Пре-релізи не потрапляють у `releases/latest`, а наш апдейтер ходить у
  `releases?per_page=30` і сам вибирає найсвіжішу семантично новішу
  версію.
- Оновлення існуючого релізу без зміни версії: перезібрати `dist\OBI.exe`,
  перегенерувати `release\OBI.js` у cp1251, перезібрати
  `release\OBI-<ver>.zip` (через .NET `ZipArchive`), потім `gh release
  delete-asset` старого zip + `gh release upload` нового.
- Важливо перед складанням zip: перегенерувати `release\OBI.js` з кореневого
  `OBI.js` у cp1251, а в `release\OBI-<ver>.zip` класти **новий**
  `dist\OBI.exe` (не старий `release\OBI.exe` — він не оновлюється
  складанням і залишиться без правок).

---

## 7. Схема JSON виробу

`{ date, name, orderName, modelFile, totalObjects, panelsCount,
profilesCount, fastenersCount, materials[], profiles[], fittings[] }`:
- `name` (найменування виробу) і `orderName` (найменування замовлення) — з
  `Article.Name`/`Article.OrderName` (fallback на `currentFileData.article.*`).
  `orderName` використовується як «Приміщення» у книзі розрахунку, fallback
  — `name`.
- `modelFile` — базове ім'я файлу моделі (без шляху й розширення).
- `fittings[i]`: `{ name, code, count, tag?, export?, book? }`, доп.флаги
  `isDraft`, `isComposition`, `isComposite`, `elements[]` — дерево
  `{name, code, count, nested[]}`.
- Матеріали: `{ name, code, thickness, count, edges[], details[] }`.
  `details[i]` — `{ name, position?, width, height, cuts[] }`, де `position`
  — артикул/позиція об'єкта з моделі (`obj.ArtPos`).
- Профілі: `{ name, code, material, materialCode?, supplier?, details[] }`,
  `details[i]` — `{ width, thickness, length, count, positions[]? }` (масив
  артикулів, бо профілі за позиціями не групуються). `materialCode` (артикул
  матеріалу) і сам `code` профілю пише `OBI.js` пріоритетно з
  `splitName(obj.MaterialName).code`, fallback — артикул профілю з
  `(Артикул NNN)` у назві (тобто артикул профілю = артикул його матеріалу).
  У книгу «Розрахунок» профілі потрапляють назвою матеріалу `material` з
  артикулом `materialCode`/`code` у дужках; інтерфейс профілю теж показує
  артикул матеріалу.
- Колонка «Поз.» в Excel-експорті (`src/export.js`) бере `position`/
  `positions` з моделі, при відсутності — порядковий номер.

---

## 8. Renderer / UI — структура, стилі, state-и

Додаток — **Electron frameless** (`frame:false`, без системної рамки). Все
вікно малює сам рендерер: кастомний `topbar` із `-webkit-app-region: drag`
+ кнопки згортання/закриття. UI-мову — **українська**. Дані читає/пише
через `window.api` (preload), рендериться цілком у `src/renderer.js`
(innerHTML-шаблони, без фреймворків).

### Файли
- `src/index.html` — каркас: `.topbar` (бренд + назва проєкту + дії +
  window-controls), `.workspace` → `.explorer` (оглядач папки проєкту) +
  `.sidebar` (категорії) + `.list-panel` (список) + `.detail-panel` (деталі)
  + `.fittings-detail` (постійна робоча зона фурнітури з формою додавання).
  Модал розрахунку `#calc-modal` (кнопка «Розрахунок»), дропдаун експорту
  `.export-dropdown`. Boot-splash `#boot-splash`.
- `src/styles.css` — всі стилі. Базис-дизайн на нейтральних тонах. Кольори
  через CSS-змінні `:root` (світла) і `body.theme-light` (явно увімкнена
  світла).
- `src/renderer.js` — вся логіка рендера та інтерактиву.
- `src/fit_rules.html` + `src/fit_rules.js` — **вікно правил експорту**
  (список відомої фурнітури по тегах + чорні списки).
- `src/export.js` — XLSX (exceljs) і PDF (HTML-звіт → `printToPDF`).
- `src/workbook.js` — перенесення в книгу «Розрахунок» (main-процес).

### Глобальний стан і запуск
- **`db`** — **обчислений агрегат** усіх вибраних JSON (`let db = null;`).
  Ніколи не зберігається як є; правки пишуться в overlay (`saveDB()` →
  `syncOverlayFromDb` + `persistOverlay`).
- **`projectRoot`** — обрана папка; **`projectTree`** — дерево
  `{type:'dir',name,path,children}` зі сканера; **`products`** —
  `Map<path, db>` (завантажені JSON); **`selection`** — `Set<path>`
  вибраних виробів; **`overlay`** — `<root>\.obi\project.json`
  (нормалізований); **`fitIdMap`** — `Map<rowKey, id>`.
- `DEFAULT_TAGS` (4 стандартних теги), `LEGACY_TAGS` (маппінг руських
  тегів «Петли»→«Петлі» тощо, застосовується в `normTag()`).
- `document.addEventListener('DOMContentLoaded')`: `config = await
  window.api.getConfig()`, `fitRules = normalizeFitRules(await
  window.api.getFitRules())`, потім `bindSearch`/`bindListEvents`/
  `bindFittingsEvents`/`bindSettingsEvents`/`bindExplorerEvents`. Далі
  `st = await window.api.getProjectState()`: якщо є `root` —
  `openProjectFolder(st.root, st.preselect)`, інакше — пустий explorer.
- `openProjectFolder(root, preselect)`: `scanProject` → дерево,
  `readOverlay` → overlay, `selection = preselect || Set(all product
  paths)`, `ensureProductsLoaded(selection)`, `rebuildAggregate()` (→
  `pushFitRulesContext()`), `renderExplorer`/`renderProjectName`/
  `renderAll`.

### Шари рендеринга (renderer.js)
- **Стан проєкту / explorer**: `chooseProjectFolder`/`rescanProject`/
  `selectAllProducts`/`onSelectionChanged` (викликається на зміну
  виділення), `toggleDir` (розгортання папок), `renderExplorer`/
  `expDirHTML`/`expProductHTML`, `bindExplorerEvents`/`explorerClick`/
  `explorerCheckChange`. Чекбокси з indeterminate-позначкою
  `data-ind="1"`.
- **Агрегація**: `mergeProducts(list)` — об'єднує всі вибрані JSON у
  один `db` за ключами `name|code|thickness` (матеріали), `name|material`
  (профілі), `name|code` (фурнітура). `applyOverlayToDb()` (видалення,
  edits, counts, додані, порядок). `rebuildAggregate()` (`merge` →
  `overlay` → `tagOrder` → `applyFitRules` → `ensureTagOrder` →
  `ensureFitIds` → `pushFitRulesContext`). `rebuildKeepState()` зберігає
  вибір/фокус за ключами при ребілді.
- **Списки/деталі**: `renderSidebar` (бейджі категорій + статистика),
  `renderList` (картки `matCardHTML`/`profCardHTML` з drag&drop reorder),
  `renderDetail` (заголовок із чекбоксами «До звіту»/«У книгу», кромки,
  групування деталей через `groupByPosition`).
- **Фурнітура (постійна в detail-панелі)**: `renderFittings` (tag-колонки
  `fwColumnHTML` + картки `fwCardHTML` з інлайн-редагуванням і
  drag&drop), tabs `renderFwTabs`, sidebar форми `renderFwSidebar`,
  footer `renderFwFooter`. Multi-select (mouse marquee + ctrl/shift) —
  `fittingsMouseDown`/`startMarquee`/`onMarqueeMove`/`onMarqueeEnd`/
  `updateMarqueeSelection`/`updateRowSelection`/`.fit-marquee`. Drag&drop
  рядків між тегами — `fittingsDragStart/DragOver/Drop` (MIME
  `application/x-obi-fits`); колонок — `reorderTag` (MIME
  `application/x-obi-tag`); inline — `saveFitName/Tag/Code/Count/Supplier/
  Export/Book`. `deleteFitting`/`deleteSelectedFittings` (з confirm).
  `startRenameTag`/`commitRenameTag`/`addTag`/`deleteTag` (базовий
  «Загальна фурнітура» захищений). `applyFitRules` (теги/постачальники/
  чорні списки з fitRules).
- **Пошук**: `bindSearch` → `searchQuery` спільний для матеріалів/профілів
  і фурнітури; `fw-search-input` окремо, чистить при перемиканні табів.
- **Збереження**: `saveDB()` → `ensureTagOrder` + `syncOverlayFromDb`
  (`tagOrder` + `order.*`) + `persistOverlay` + `persistFitRules` +
  `rebuildKeepState`. `saveFit*`/`saveMat*`/`saveProf*` — зберігають у
  `overlay.edits`/`counts` для існуючих, або в `overlay.added.*` для
  доданих користувачем; `fitRules` оновлюють напряму для тегів/
  постачальників/чорних списків.
- **Експорти/онови/фіт-правила**: `exportExcel`/`exportPDF` (отримують
  `db` агрегат), `toggleExportMenu`/`closeExportMenu`, `openSettings`/
  `closeSettings`/`setTheme`/`setLanguage`/`saveConfig`/`exportSettings`/
  `importSettings`/`openFitRulesWindow`. `openCalcModal`/
  `chooseCalcWorkbook`/`setCalcRoomAuto`/`writeCalcWorkbook` (модал
  розрахунку). `checkUpdates`/`applyUpdates`/`renderUpdateResult`
  (`updateInfo`/`updateState`).
- **Екранування**: `escapeHtml()`, `escapeAttr()` — **обов'язково
  застосовувати** до будь-якого користувацького/модельного тексту.

### IPC (preload.js → main.js)
`window.api` = `{ getProjectState, chooseProjectFolder, scanProject,
loadProducts, readOverlay, saveOverlay, getProjectTitle, exportXLSX,
exportPDF, getConfig, saveConfig, getCalcWorkbookConfig, chooseCalcWorkbook,
writeCalcWorkbook, getFitRules, saveFitRules, getFitRulesData,
setFitRulesContext, openFitRulesWindow, onFitRulesUpdated, exportSettings,
importSettings, getAppInfo, checkUpdate, applyUpdate, onUpdateAvailable,
windowMinimize, windowMaximize, windowClose }`.
- `get-project-state` → `{ root, preselect }` (преселект = шлях до JSON,
  з якого стартувало `OBI.js` через `--project`).
- `choose-project-folder` → `{ success, root }` (з діалогу).
- `scan-project` → `{ success, root, name, tree, products[] }`
  (рекурсивний сканер).
- `load-products(paths)` → масив `{ path, db }`/`{ path, error }`.
- `read-overlay` / `save-overlay(data)` — читання/запис
  `<root>\.obi\project.json`.
- `get-project-title` — `path.basename(projectRoot)`.
- `get-fit-rules` / `save-fit-rules` / `get-fit-rules-data` /
  `set-fit-rules-context` — загальні правила + контекст.
- **Експорти `export-xlsx`/`export-pdf` приймають актуальний `db` ВІД
  РЕНДЕРЕРА** (а не з диска — щоб враховувалися чорні списки
  `fit_rules`).
- Розрахунок: `get-calc-workbook-config` віддає `{ workbookPath }`,
  `choose-calc-workbook` — діалог вибору `.xlsm`, `write-calc-workbook`
  (payload: `{db, roomName}`) — запускає `writeCalcWorkbook(filePath, db,
  roomName)` з `src/workbook.js`.
- Налаштування: `get-config`/`save-config` (файл `config\config.json`),
  `get-app-info` (`{version, url, author}`).
- Оновлення: `check-update`/`apply-update` (через `src/updater.js`),
  подія `update-available`.

### Налаштування користувача (config)
- Файл `config/config.json` (у `dataDir()`, поряд із exe/у корені при dev).
  Схема: `{ theme: "light"|"dark", language: "uk"|"ru", autoUpdate: bool,
  workbookPath: string, lastProjectFolder: string, recentFolders: string[] }`.
  `readConfig()` при відсутності файлу повертає дефолти
  (`autoUpdate:false`); `saveConfig()` створює папку через
  `mkdirSync({recursive:true})`. `workbookPath` — шлях до книги «Розрахунок
  фурнітури» (обирається в модалі розрахунку, зберігається автоматично).
- UI: модальне вікно `#settings-modal` (відкривається кнопкою-шестернею
  `#settings-btn` у `.topbar-actions`).
- Тема: `applyTheme()` навішує клас `theme-light` на `body`; кольори —
  CSS-змінні в `:root` (світла) і `body.theme-light` (світла явно).
- Мова: `applyLanguage()` — обходить елементи з `data-i18n` (textContent)
  і `data-i18n-ph` (placeholder), перерисовує списки через `renderAll()`.
  Словник `I18N` у renderer.js (`uk`/`ru`), доступ через `t(key, params)`
  (підстановка `{n}`/`{path}`/`{tag}`); `lang()` повертає 'ru'|'uk'. ТЕГИ
  (`DEFAULT_TAGS`, значення `f.tag`, «Загальна фурнітура») — це ДАНІ з db,
  їх НЕ перекладають (не чіпати).

### Автооновлення (src/updater.js)
- Модуль `src/updater.js` — перевірка та застосування оновлень через
  **GitHub Releases**. `checkUpdate({currentVersion})` → `GET
  api.github.com/repos/shadelete/OBI/releases?per_page=30`, знаходить
  найсвіжішу семантично новішу за поточну версію (з врахуванням
  пре-релізів); `applyUpdate({assetUrl, assetName, targetExe, targetJs,
  targetIcon})` → скачує `OBI-<ver>.zip`, розпаковує (`tar.exe`, fallback
  `Expand-Archive`), генерує `updater.bat` (чекає завершення OBI.exe →
  замінює `OBI.exe`/`OBI.js`/`icon.bmp` → перезапускає → чистить temp).
- **Semver-пріоритет включно з пре-релізами**: `0.2.0-beta <
  0.2.0-beta.1 < 0.2.0`. Тобто пре-релізи оновлюються між собою і на
  фінальну стабільну, але стабільна не сідає на пре-реліз.
- **Dev-версії не оновлюються**: лише regex `-(dev)(?!\w)` блокує
  перевірку. `-alpha`/`-beta`/`-rc` ВІЛЬНО оновлюються. Тому робоча
  версія `package.json` для розробки пишеться з суфіксом `-dev` (напр.
  `0.3.0-dev`) і **не йде** в тег/реліз.

### Правила фурнітури (fit_rules)
- Файл `<dataDir>\data\fit_rules.json` — загальні правила: `{ tags,
  tagsByName, blacklist, blacklistByName, suppliers, suppliersByName,
  matBlacklist, matBlacklistByName, profBlacklist, profBlacklistByName,
  bookBlacklist, bookBlacklistByName, matBookBlacklist,
  matBookBlacklistByName, profBookBlacklist, profBookBlacklistByName }`
  — масиви без `Book` = «До звіту» (PDF/Excel), з `Book` = «У книгу».
- Призначення: при завантаженні нового проєкту фурнітура автоматично
  розкидається по тегах і вимикається в експорті/у книзі, а
  матеріали/профілі вимикаються з експорту/книги.
- Зберігання в файл **окремо** через IPC: `saveDB()` рендерера викликає
  `window.api.saveFitRules(fitRules)` → пишеться `fit_rules.json`.
  **Жодного `db.json`: правила ніколи не зберігаються в JSON виробу.**
- Контекст для вікна правил — `setFitRulesContext` з `rebuildAggregate`
  (інакше вікно показує коди замість назв).

---

## 9. Файлова структура проєкту

- `OBI.js` — скрипт Базиса (cp1251-конвертується для релізу в
  `release\OBI.js`).
- `main.js` — main-процес Electron: вікна, IPC, project folder,
  config/fit_rules/overlay, експорт-діалоги, PDF-вимірювання, апдейтер.
- `preload.js` — міст `window.api`.
- `src/index.html`, `src/styles.css`, `src/renderer.js` — UI.
- `src/fit_rules.html`, `src/fit_rules.js` — вікно правил експорту.
- `src/export.js` — XLSX/PDF/CSV/JSON генерація.
- `src/workbook.js` — перенесення фурнітури в книгу «Розрахунок» (xlsm).
- `src/updater.js` — автооновлення через GitHub Releases.
- `data/` — робочі дані (конфіг/db.json файлів тут більше немає; в
  `dist\` — fit_rules.json, exe_path.txt, project.json проєктів).
- `dist/` — білди: `dist\OBI.exe` (portable, запускає OBI.js),
  `dist\win-unpacked\Output Bazis Info.exe`.
- `release/` — релізні артефакти: `OBI-<ver>.zip` (OBI.exe + OBI.js +
  icon.bmp), `release_description.txt`.
- `AGENTS.md` — правила супроводу (команди, критичні факти, changelog,
  релізний процес).
- `CHANGELOG.md` — журнал змін (укр.).
- `SESSION.md` — точка роботи на поточний момент.

---

## 10. Перевірка роботи / тестування

- Тестів, лінтера в репо НЕМАЄ (крім `node --check`). Перевірка знань:
  1. `node --check` усіх змінених js.
  2. Прогон сканера на еталонній папці проєкту:
     `node -e "const s=require('./main.js')..."` — або через `walkDir`
     витягнутий у тестовий скрипт (див. SESSION.md).
  3. Збірка: `npm run build` → `dist\OBI.exe`.
  4. Smoke-тест: `npm start` — перевірка UI/експорту/calc на
     реальному проєкті.

---

## 11. Поточна точка роботи

Див. `SESSION.md` (зараз — перехід від `db.json`/b3d-парсера до
проєкт-папки). Коротко:
- реалізовано: OBI.js-діалог «Відкрити OBI» / «Зберегти», JSON поряд із
  моделлю, сканер `walkDir`, overlay `.obi\project.json`, explorer
  Sublime-стилю, мульти-вибір виробів, агрегація `mergeProducts`,
  fit_rules-контекст для вікна правил;
- ближні задачі: перевірка UI на реальному замовленні, крос-перевірка
  `overlay.edits` для fitting-полів, можливе чищення `data\models\`
  (сміття від b3d-експерименту, не git).
