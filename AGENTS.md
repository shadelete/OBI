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

## Релизный процесс (актуальный тег — v0.1.1)
- 1) поднять `version` в `package.json`, 2) `npm run build` (OBI.exe), 3) собрать `release\OBI-<ver>.zip`, 4) коммит + тег `v<ver>` + `push origin main --tags` (или `git push origin v<ver>`), 5) `gh release create v<ver> release\OBI-<ver>.zip release\OBI.js -R shadelete/OBI --title "OBI <ver>"`.
- Полезное: `git tag v0.1.1 f6839e1` создаёт тег на конкретном коммите, `gh release create` выводит URL релиза.

## Схема db.json
`{ date, totalObjects, panelsCount, profilesCount, fastenersCount, materials[], profiles[], fittings[] }`
- `fittings[i]`: `{ name, code, count, tag? }`, доп.флаги `isDraft`, `isComposition`, `isComposite`, `elements[]` — дерево `{name, code, count, nested[]}`.
- Материалы: `{ name, code, thickness, count, edges[], details[] }`. `details[i]` — `{ name, position?, width, height, cuts[] }`, где `position` — артикул/позиция объекта из модели (`obj.ArtPos`, ставится скриптом/вручную на объект). Профили: `{ name, code, material, details[] }`, `details[i]` — `{ width, thickness, length, count, positions[]? }` (массив артикулов, т.к. по позициям профили не группируются). Материалы/профили (и правки тегов/count/export) рендерятся в `src/renderer.js` (см. `renderFittings`, `saveFit*`); изменения сохраняются обратно в тот же db.json через IPC `save-db`. Колонка «Поз.» в Excel-экспорте (src/export.js) берёт `position`/`positions` из модели, при отсутствии — порядковый номер.