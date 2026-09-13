# SESSION.md — точка роботи (поточна сесія)

## Задача
Перехід від архітектури «один `db.json` + парсер `.b3d`» до архітектури
«проєкт-папка»: JSON-файли виробів лежать поруч із моделями Базиса, окремий
оглядач у standalone-додатку показує все замовлення одразу.

## Що зроблено в цій сесії

### OBI.js (cp1251)
- При запуску скрипта в Базисі з'являється вікно-діалог (`NewForm`):
  - **«Відкрити OBI»** — зберегти JSON поряд із моделлю та запустити `OBI.exe --project <шлях>`;
  - **«Зберегти»** — лише зберегти JSON, без запуску exe.
- Шлях до JSON: `Action.Control.Owner.FileName` → `MODEL_DIR`, далі
  `<MODEL_DIR>\<Article.Name>.json` (санітизоване). Fallback (модель не збережена
  на диск): `<scriptDir>\data\projects\<Article.Name>.json`.
- У JSON додано поле `modelFile` — базове ім'я файлу моделі.
- Видалено запис у 2 місця (було `папка_скрипта\data\` + `data\` біля exe);
  пишемо лише в одне — поруч із моделлю. Жодного `data\db.json`/`current_project.txt`.
- Кнопка «Скасувати» (відсутня в Bazis-формах) — `OnClose` викликає `Action.Finish()`.
- Fallback (немає `NewForm`): тихий save+launch (`saveAndOpen()`).
- Кирилиця в user-facing рядках — `\uXXXX`-екранування (cp1251-safe).

### main.js / preload.js
- Старт завжди «з чистого листа»: `data\db.json`/`save-db`/`get-projects`/
  `rename-project` — **видалені**. Активний проєкт = **папка**, обрана користувачем.
- `--project <json>` (від OBI.js) → `setProjectRoot(path.dirname(sp), sp)`:
  папка проєкту = директорія моделі, преселект = сам JSON.
- Якщо `--project` немає, відновлює `config.lastProjectFolder` (остання робоча
  папка, автозбереження в `saveConfig`).
- **Сканер проєкту** (`walkDir`/`tryReadProduct`): рекурсивно знаходить усі
  JSON-файли зі схемою `materials[]` + `fittings[]`. Пропускає приховані папки,
  `node_modules`, файли > 20 МБ. Крос-кодування (UTF-8 → cp1251 fallback).
- **Overlay** проєкту: `<projectRoot>\.obi\project.json` — зберігає видалені
  позиції, редагування, кастомні підрахунки, додані позиції, порядок і
  `tagOrder` (окремо для матеріалів/профілів/фурнітури). Не чіпає вихідні JSON
  виробів.
- **Fit Rules** — окремий файл `<dataDir>\data\fit_rules.json`. Розсилає
  `fit-rules-updated` іншим вікнам при зміні.
- IPC: `get-project-state`, `choose-project-folder`, `scan-project`,
  `load-products`, `read-overlay`, `save-overlay`, `get-project-title`,
  `set-fit-rules-context` (новий).
- PDF/XLSX — як раніше, `data` приходить з рендерера (а не з диска — щоб
  враховувалися чорні списки fit_rules).

### src/renderer.js + index.html + styles.css
- Новий layout: `explorer` (оглядач) + `sidebar` (категорії) + `list-panel`
  (список) + `detail-panel` (деталі) + `fittings-detail` (фурнітура).
- `boot-splash` (анімація завантаження) при старті.
- **Explorer** (Sublime/VS Code стиль): дерево папок, чекбокси на виробах і
  папках, кнопки `📂` (відкрити), `⟳` (оновити), `☑` (виділити все),
  shift/ctrl-multi-select.
- **Стан проєкту**: `projectRoot`, `projectTree`, `products: Map<path, db>`,
  `selection: Set<path>`, `overlay`, `expandedDirs`, `fitIdMap`.
- **Агрегація** `mergeProducts(list)`: об'єднує всі вибрані JSON у один `db`:
  матеріали/профіли групуються за ключем `name|code|thickness`/`material`,
  фурнітура — за `name|code`; `count` сумується; `export`/`book` — `false`
  якщо хоч в одному виробі `false` (консервативно).
- **Overlay накладається** (`applyOverlayToDb`): видалені позиції викинуто,
  edits/counts перебивають, додані — в кінець, кастомний порядок застосовано.
- `applyFitRules()` застосовує теги/постачальників і чорні списки з `fit_rules`.
- `saveDB()` синхронізує overlay (`tagOrder` + orders) і фіт-правила на диск.
- `pushFitRulesContext()` надсилає поточний агрегат у main (для вікна правил).
- Фурнітура: tag-колонки, drag&drop рядків і тегів, marquee multi-select,
  resize колонок, мульти-видалення, форма додавання/редагування в боці.
- Матеріали/профілі: картки в списку, групування деталей за позицією, чорні
  списки «до звіту» / «у книгу» (окремо), мульти-вибір.
- Розрахунок: `db.orderName || db.name` як «Приміщення» (модал автоматично).
- Settings/updates/Calc/фіт-правила — як раніше, але без `db.json` IPC.

### Видалено
- `src/b3d_parser.js` (759 рядків) — офлайн-парсер моделей `.b3d`.
- `b3d-builder.json` + `package.json` скрипт `build:b3d`.
- Старі IPC `get-db`/`save-db`/`get-projects`/`rename-project`/
  `save-project`/`load-project`/`get-project-name`/`parse-b3d`/`save-b3d-db`.

## Що залишилось / пріоритети

1. **Перевірити візуально explorer/explorer-select-all** на реальному
   замовленні з декількома виробами.
2. **Крос-перевірка overlay.edits для fitting-полів** (поки редагування тільки
   `name`/`code`/`count`; `tag`/`supplier` пишуться в `fitRules` напряму).
3. **`data\models\` і `b3d-dist\`** — сміття від минулого експерименту з b3d,
   можна видалити вручну (не git).
4. **`fit_rules` у fit_rules window**: фільтрувати до поточного проєкту
   (зараз — глобальний, може бути шум із минулих проєктів).
5. **Прогон на СВ.b3d**, якщо буде потреба (парсер теж мертвий — тепер тільки
   Базис).

## Команди

- Старт у dev: `npm start` (або `npx electron .`, обгортка `launch.bat`).
- Збірка portable: `npm run build` (створює `dist\OBI.exe`, його запускає OBI.js).
  - EBUSY-обхід: `npx electron-builder --win --config.directories.output="<temp>\obibuildN"`.
- Перевірка синтаксису: `node --check file.js` (працює і на cp1251).
- Тести/лінтер: немає.

## Версія
- `package.json`: `0.3.0-dev` (dev-суфікс блокує авто-оновлення).
- Гілка: `main`. Тег наступного релізу: `v0.3.0` (без dev).
