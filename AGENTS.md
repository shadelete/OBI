# AGENTS.md — Output Bazis Info (OBI)

Электрон-приложение, которое читает `data/db.json` и показывает/экспортирует данные мебельного проекта (материалы, профили, фурнитуру). Данные генерирует **скрипт Базиса** (`OBI.js`), запускаемый внутри САПР «Базис». Пользователь запускает скрипт в Базис, тот пишет db.json и запускает OBI.exe.

## Две независимые части
- **Скрипт Базиса** (корень): `OBI.js` — единственный рабочий/эталонный скрипт: вынимает состав фурнитуры через `GetParams('AdvParamData')`, пишет db.json в 2 места (корень + рядом с exe), запускает OBI.exe. Это НЕ часть electron-приложения.
- **Electron-приложение**: `main.js`, `preload.js`, `src/renderer.js`, `src/export.js`, `src/index.html`. Основной исходник UI — `src/renderer.js`. Корневые `renderer.js`/`export.js` — gitignored-артефакты, в приложении не используются.

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
- `main.js`: `dbPath() = <папка exe>\data\db.json` (для portable — `PORTABLE_EXECUTABLE_DIR`, иначе папка exe). Dev-запуск `npx electron .` читает `data/db.json` корня проекта.
- Поэтому **скрипт-генератор обязан писать db.json и в `папка_скрипта\data\`, и в `data\` рядом с найденным OBI.exe** (сейчас: `dist\data\db.json`). Проверка: `dist\data\db.json` должен обновляться по времени вместе с корневым.
- Поиск exe (в `OBI.js`): рядом со скриптом → сохранённый путь `data\exe_path.txt` → `dist\OBI.exe` → `dist\release\OBI.exe` → вверх до 4 родительских + cwd.

## Команды
- Запуск UI в dev: `npm start` (или `npx electron .`, обёртка `launch.bat`).
- Сборка: `npm run dist` = `electron-builder --win --dir` — **только `dist\win-unpacked`, без portable-файла**. Финальный `dist\OBI.exe` даёт `npm run build` = `electron-builder --win` (portable). После релиза обновить `release\OBI-<ver>.zip` (OBI.exe + OBI.js + icon.bmp) вручную из `dist\OBI.exe` и текущего `OBI.js`.

## Релизный процесс (актуальный тег — v0.1.3)
- 1) поднять `version` в `package.json`, 2) `npm run build` (`dist\OBI.exe`), 3) собрать `release\OBI-<ver>.zip` = `dist\OBI.exe` + `release\OBI.js` (cp1251) + `release\icon.bmp` (см. ниже), 4) коммит + тег `v<ver>` + `push origin main --tags`, 5) `gh release create v<ver> release\OBI-<ver>.zip -R shadelete/OBI --title "OBI <ver>"` (единственный ассет — zip; отдельно `OBI.js` на релиз НЕ кладём, он уже внутри архива).
- Обновление существующего релиза без смены версии: пересобрать `dist\OBI.exe`, перегенерировать `release\OBI.js` в cp1251, пересобрать `release\OBI-<ver>.zip` (через .NET `ZipArchive`, т.к. `Compress-Archive` падает на большом exe при блокировке файла), затем `gh release delete-asset` старого zip + `gh release upload` нового (оба с `--yes`/`--clobber`).
- Важно перед сборкой zip: перегенерировать `release\OBI.js` из корневого `OBI.js` в cp1251 (см. «Критичные факты»), а в `release\OBI-<ver>.zip` класть **новый** `dist\OBI.exe` (не старый `release\OBI.exe` — он не обновляется сборкой и останется без правок). Перед сборкой zip убедиться, что `dist\OBI.exe` не заблокирован запущенным процессом OBI (закрыть при необходимости).
- Полезное: `git tag v0.1.1 f6839e1` создаёт тег на конкретном коммите, `gh release create` выводит URL релиза.

## Схема db.json
`{ date, totalObjects, panelsCount, profilesCount, fastenersCount, materials[], profiles[], fittings[] }`
- `fittings[i]`: `{ name, code, count, tag? }`, доп.флаги `isDraft`, `isComposition`, `isComposite`, `elements[]` — дерево `{name, code, count, nested[]}`.
- Материалы: `{ name, code, thickness, count, edges[], details[] }`. `details[i]` — `{ name, position?, width, height, cuts[] }`, где `position` — артикул/позиция объекта из модели (`obj.ArtPos`, ставится скриптом/вручную на объект). Профили: `{ name, code, material, details[] }`, `details[i]` — `{ width, thickness, length, count, positions[]? }` (массив артикулов, т.к. по позициям профили не группируются). Материалы/профили (и правки тегов/count/export) рендерятся в `src/renderer.js` (см. `renderFittings`, `saveFit*`); изменения сохраняются обратно в тот же db.json через IPC `save-db`. Колонка «Поз.» в Excel-экспорте (src/export.js) берёт `position`/`positions` из модели, при отсутствии — порядковый номер.

## Renderer / UI — структура, стили, расширенные state-ки
Приложение — **Electron frameless** (`frame:false`, без системной рамки). Всё окно рисует сам рендерер: кастомный `header` с `-webkit-app-region: drag` + кнопки сворачивания/закрытия. UI-язык интерфейса — **украинский**. Данные читает/пишет через `window.api` (preload), рендерится целиком в `src/renderer.js` (строки jquery-style innerHTML-шаблономи, без фреймворков/виртуального DOM).

### Файлы рендера
- `src/index.html` — каркас: `.header` (бренд + действия + window-controls), `.tabs` (Матеріали та кромка / Профілі / Фурнітура), `.content` → `.stats` + три `.panel` (`panel-materials`, `panel-profiles`, `panel-fittings`). Панель фурнитуры содержит форму добавления (`#add-fitting-form`), менеджер тегов (`#tag-manager`), контейнер колонок `#fittings-columns` и скрытый список `#fittings-list`.
- `src/styles.css` — все стили. Базис-дизайн на нейтральных тонах: фон `#f5f7fa`, карточки белые `#ffffff` с рамкой `#e3e8ef`, акцент-синий `#2b6de0`. Классы перечислены по назначению ниже.
- `src/renderer.js` — вся логика рендера и интерактива (см. ниже).
- `src/export.js` — генерация XLSX (exceljs) и CSV/JSON, вызывается из main процесса. См. отдельный раздел.

### Глобальное состояние и запуск
- Один глобал `db` — весь объект db.json в памяти рендера (`let db = null;`).
- `DEFAULT_TAGS` (4 стандартных тега), `LEGACY_TAGS` (маппинг старых русских тегов «Петли»→«Петлі» и т.д., применяется в `normTag()`).
- `document.addEventListener('DOMContentLoaded')`: `db = await window.api.getDB()`, затем `ensureTagOrder()`, `ensureFitIds()`, `bindFittingsEvents()`, `renderAll()`.
- `renderAll()` последовательно: `renderMaterials()`, `renderProfiles()`, `renderFittings()`, `renderStats()`, `updateCounts()`.

### Слои и их функции (renderer.js)
- **Основа рендеринга**: `renderMaterials()` (стр.128), `renderProfiles()` (182), `renderFittings()` (262), `renderStats()` (65, stat-карточки), `updateCounts()` (80, счётчики в табах), `switchTab()` (86).
- **Материалы/профили** — карточки `.card`, каждая: `.card-header` (заголовок + `.card-badges`: бейджи толщины/пазов + чекбокс «Експорт»), `.card-details` (артикул, кол-во), блок кромок `.edges-block`, список деталей `.parts-list`. Строка детали `.detail-row` — сетка 3 колонки: название (с позицией `.detail-pos` и счётчиком «×N») / пазы `.detail-cuts` / размеры `.detail-dim`.
- **Группировка деталей**: `groupByPosition(details)` (110) — сворачивает детали по `position` (артикулу), считает `count`; детали без позиции остаются по одной. Дублируется в export.js.
- **Фурнитура (главный интерактив)** — колонки-теги `.fit-column` (по тегу), внутри строки `.fit-row`:
  - `fitRowHTML(f)` (238): драг-хендл `.fit-drag-handle`, чекбокс экспорта `.exp-check`, инлайн-редактируемые name (`fit-edit-name`), тег (`select.fit-tag`), code/count, кнопка удаления.
  - Мульти-выбор (мышью-marquee + Ctrl/Shift-клик): `selectedFitIds` (Set id), `fitById()`, `fittingsMouseDown` (312), `startMarquee`/`onMarqueeMove`/`onMarqueeEnd` (329-381), `updateMarqueeSelection`, `updateRowSelection` (383), `.fit-marquee` (наложение-рамка).
  - Drag&drop строк между тегами: `fittingsDragStart` (401), `fittingsDragOver` (439), `fittingsDrop` (452), данные через `application/x-obi-fits` (JSON массива id); перетаскивание колонок = реордер тегов `reorderTag` (485), тип `application/x-obi-tag`.
  - Теги: `addTag()` (614), `deleteTag()` (626, стандартные нельзя), `startRenameTag`/`commitRenameTag` (503/531), `tagOptions()` для select'ов.
  - Сохранение правок: `saveFitExport/Name/Tag/Code/Count` (539-575), каждая вызывает `saveDB()`.
  - `saveDB()` (577): `ensureTagOrder()` → `window.api.saveDB(db)` → по успеху `renderAll()`.
  - Форма добавления: `addFitting()` (585). `deleteFitting()` (606, с confirm).
- **Файл-операции/экспорт/окно**: `openProject()` (646), `saveProject()` (659), `exportExcel()` (666), `windowMinimize/Close` (672/676).
- **Экранирование**: `escapeHtml()` (638), `escapeAttr()` (642) — ОБЯЗАТЕЛЬНО применять к любому пользовательскому/модельному тексту при подстановке в HTML.

### Стили (стиль-гайд для доработки)
- Переменных CSS нет — цвета захардкожены. Ключевые: фон `#f5f7fa`, карточка `#ffffff`, рамка `#e3e8ef`, акцент `#2b6de0`, текст `#2b3440`, вторичный серый `#8a94a6`.
- Бейджи категорий: `.badge-material` (синий), `.badge-furniture` (зелёный), `.badge-profile` (оранжевый), `.badge-cut` (оранжевый паз).
- Кнопки: `.btn-primary`/`.btn-export` (синие), `.btn-secondary`, `.btn-icon` (нейтральные). Поле ввода: `.form-input` (+ `-sm`, `-tag`, `-tag-new` размеры).
- Селектор стиля обводки при редактировании: `.fit-row.selected` (синяя рамка + glow), `fit-editing` для карточек.
- Анимация: `@keyframes fadeIn` (141) для появления строк/колонок.

### IPC (preload.js → main.js)
`window.api` = `{ getDB, saveDB, saveProject, loadProject, exportXLSX, getConfig, saveConfig, getAppInfo, windowMinimize, windowClose }`. Хендлеры в `main.js`: `get-db`/`save-db` работают с `dbPath()` (данные по умолчанию из той же папки), `save-project`/`load-project` — диалоги с пользователем, `export-xlsx` строит буфер через `exportToXLSXBuffer` из актуального `readDB()` и сохраняет через диалог. Настройки: `get-config`/`save-config` работают с `configPath()` = `<dataDir>\config\config.json`, `get-app-info` отдаёт `{ version, url, author }` (version = `app.getVersion()` из package.json; url/author — константы в main.js).

### Настройки пользователя (config)
- Файл `config/config.json` (в `dataDir()`, рядом с exe/в корне при dev), НЕ gitignored неявно — добавлен в `.gitignore`. Схема: `{ theme: "light"|"dark", language: "uk"|"ru" }`. `readConfig()` при отсутствии файла возвращает дефолты; `saveConfig()` создаёт папку через `mkdirSync({recursive:true})`.
- UI: модальное окно `#settings-modal` (открывается кнопкой-шестерёнкой `#settings-btn` в `.header-actions`, маркировка `data-i18n="settings.title"` и т.д.). Радио-группы темы (`settings-theme-light/dark`) и языка (`settings-lang-uk/ru`) + блок «Про застосунок» (версия/settings-version-value, автор/settings-author-value, ссылка GitHub/settings-github-link из `getAppInfo`).
- Логика (renderer.js): `openSettings`/`closeSettings`, `setTheme`, `setLanguage`, `saveConfig` (→ `window.api.saveConfig`), `renderSettingsMeta` (заполняет версию/автора/ссылку).
- Тема: `applyTheme()` вешает класс `theme-dark` на `body`; цвета — CSS-переменные в `:root` (светлая) и `body.theme-dark` (тёмная) в `src/styles.css`.
- Язык: `applyLanguage()` — обходит элементы с `data-i18n` (textContent) и `data-i18n-ph` (placeholder), перерисовывает списки через `renderAll()`. Словарь `I18N` в renderer.js (справа `uk`, `ru`), доступ через `t(key, params)` (подстановка `{n}`/`{path}`/`{tag}`); `lang()` возвращает 'ru'|'uk'. ТЕГИ (`DEFAULT_TAGS`, значения `f.tag`, «Загальна фурнітура») — это ДАННЫЕ из db, их НЕ переводят (не трогать).

### Экспорт (src/export.js) — кратко
`exportToXLSXBuffer(data)` → 3 листа: «Матеріали» (сгруппирован по поз.), «Профілі», «Фурнітура». Стили-константы `FONT_TITLE/FONT_HEAD/FONT_DATA/FILL_ORANGE/FILL_PEACH/BORDER` (Montserrat + оранжевая палитра, `charset:204`). Фильтрация по `export !== false` (`exported()`). Фурнитура на листе сгруппирована по тегу, порядок тегов = `db.tagOrder` (как в интерфейсе), затем алфавит. При доработке UI помнить: если меняется/добавляется поле в fittings/materials, его надо поддержать и тут (иначе расхождение UI↔Excel).