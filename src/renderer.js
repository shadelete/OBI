// db = the COMPUTED aggregate of all selected product JSONs (never saved as-is).
let db = null;
let config = { theme: 'dark', language: 'uk' };
let fitRules = { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [], bookBlacklist: [], bookBlacklistByName: [], matBookBlacklist: [], matBookBlacklistByName: [], profBookBlacklist: [], profBookBlacklistByName: [] };
let appInfo = { version: '', url: '', author: '' };

let selCat = 'materials';
let selId = null;
let selTab = 'details';
let searchQuery = '';

// ---- Project folder state ----
let projectRoot = '';            // chosen folder
let projectTree = null;          // scanned tree {type:'dir',name,path,children}
let products = new Map();        // json path -> parsed product db
let selection = new Set();       // selected product json paths
let overlay = null;              // <project>\.obi\project.json content
let expandedDirs = new Set();    // expanded folder paths in explorer
let fitIdMap = new Map();        // rowKey -> stable fitting id
let fitIdSeq = 1;

const DEFAULT_TAGS = ['Загальна фурнітура', 'Петлі', 'Напрямні', 'Метизна фурнітура'];
const LEGACY_TAGS = { 'Петли': 'Петлі', 'Направляющие': 'Напрямні', 'Метизная фурнитура': 'Метизна фурнітура', 'Общая фурнитура': 'Загальна фурнітура' };

const I18N = {
  uk: {
    'brand':'OBI','explorer.open':'Відкрити папку проєкту','explorer.title':'Проєкт','explorer.refresh':'Оновити','explorer.select.all':'Виділити все',
    'explorer.empty':'Папку проєкту не обрано. Натисніть «Відкрити папку проєкту».','explorer.no.products':'У папці не знайдено JSON-файлів OBI','explorer.selected':'Вибрано {n} із {m}',
    'export.excel':'Експорт Excel','export.pdf':'Експорт у PDF','tab.materials':'Матеріали та кромка','tab.profiles':'Профілі','tab.fittings':'Фурнітура',
    'fit.placeholder.name':'Найменування фурнітури','fit.placeholder.code':'Артикул','fit.placeholder.count':'К-сть','btn.add':'Додати',
    'tags.manage':'Управління тегами:','tags.new.placeholder':'Новий тег','tags.add':'Додати тег',
    'stat.materials':'Матеріалів','stat.profiles':'Профілів','stat.fittings':'Позицій фурнітури',
    'stat.total':'Всього позицій','stat.details':'Деталей','stat.edges':'Кромки','stat.thickness':'Товщина','stat.inreport':'Включено в звіт',
    'stat.article':'Артикул','stat.sizes':'Розмірів','stat.material':'Матеріал','stat.cut':'Пазів',
    'edge.title':'Кромка','edge.none':'Без кромки','export':'Експорт','to.report':'До звіту','to.book':'У книгу',
    'cut':'{n} паз','cut.plural':'{n} пазів',
    'detail.article':'Артикул','detail.count':'Деталей','detail.parts':'Деталі', 'pcs':'шт','profiles.sizes':'Розміри',
    'search.placeholder':'Пошук...','empty.list':'Список порожній','empty.noresults':'Нічого не знайдено',
    'mat.add':'+ Додати матеріал','prof.add':'+ Додати профіль','fit.add':'+ Додати фурнітуру',
    'tab.materials':'Матеріали та кромка','tab.profiles':'Профілі','tab.fittings':'Фурнітура','tab.sizes':'Розміри ({n})','tab.info':'Додаткова інформація',
    'fit.name.placeholder':'Найменування','fit.article.placeholder':'Артикул','fit.drag.title':'Перетягнути',
    'fit.export.title':'Включити в експорт','fit.category':'Категорія','fit.delete.title':'Видалити',
    'fit.tag.rename':'Перейменувати тег','fit.tag.delete':'Видалити тег','fit.empty':'Порожньо',
    'confirm.delete.pos':'Видалити позицію?','confirm.delete.selected':'Видалити вибрані позиції ({n})?','alert.cannot.delete.std':'Базовий тег «Загальна фурнітура» не можна видалити',
    'confirm.delete.tag':'Видалити тег "{tag}"? Фурнітура буде перенесена до "Загальна фурнітура".',
    'alert.tag.exists':'Такий тег уже існує','alert.enter.name':'Введіть найменування','alert.enter.count':'Введіть кількість','alert.enter.tagname':'Введіть назву тега',
    'settings':'Налаштування','settings.title':'Налаштування','settings.theme':'Тема','settings.theme.light':'Світла','settings.theme.dark':'Темна',
    'settings.language':'Мова','settings.language.uk':'Українська','settings.language.ru':'Русский',
    'settings.rules':'Правила експорту','settings.rules.open':'Відкрити',
    'settings.about':'Про застосунок','settings.version':'Версія','settings.author':'Автор','settings.github':'GitHub','settings.close':'Закрити',
    'alert.save.fail':'Не вдалося зберегти зміни',
    'export.saved':'Експорт збережено:\n{path}','alert.export.error':'Помилка експорту:\n{error}',
    'settings.updates':'Оновлення','settings.updates.auto':'Автоматично перевіряти оновлення при запуску',
    'settings.updates.check':'Перевірити оновлення','settings.updates.apply':'Оновити',
    'update.checking':'Перевірка оновлень...','update.none':'Оновлень немає. Версія {v} — актуальна.',
    'update.available':'Доступна нова версія: {v} (поточна {cur})','update.available.dev':'Увімкнено dev-версію — оновлення не перевіряються',
    'update.error':'Помилка перевірки: {error}','update.applying':'Оновлення завантажено. Додаток перезапуститься...',
    'update.apply.error':'Не вдалося оновити: {error}',
    'appbar.total.positions':'Всього позицій','appbar.total.materials':'Матеріалів','appbar.total.profiles':'Профілів','appbar.total.area':'Площа (загальна)','appbar.import':'Імпорт','appbar.export':'Експорт','appbar.total.count':'Загальна кількість:','appbar.add':'+ Додати позицію','appbar.area.unit':' м²',
    'cat.search.placeholder':'Пошук...','tab.details':'Деталі','tab.edges':'Кромка','tab.cuts':'Стикування','col.article':'Артикул','col.supplier':'Постачальник','col.note':'Примітка','col.qty':'К-сть','col.name':'Назва','col.type':'Тип','col.no':'№',
    'project.add':'Додати проєкт','project.open':'Відкрити папку проєкту','project.none':'Інших проєктів немає',
    'detail.empty':'Оберіть позицію зліва','add.mat.title':'Додати матеріал','add.prof.title':'Додати профіль',
    'fw.title':'Фурнітура','fw.subtitle':'Керування номенклатурою фурнітури в проєкті',
    'fw.tags.manage':'Управління тегами',
    'fw.search.placeholder':'Пошук по назві, артикулу або постачальнику...',
    'fw.sidebar.title':'Додавання позиції','fw.field.category':'Категорія','fw.field.name':'Назва',
    'fw.field.code':'Артикул','fw.field.supplier':'Постачальник','fw.field.count':'К-сть',
    'fw.field.name.placeholder':'Введіть назву','fw.field.code.placeholder':'Введіть артикул',
    'fw.add.btn':'Додати позицію','fw.clear.btn':'Очистити форму',
    'fw.add.column':'+ Додати позицію','fw.show.more':'Показати всі ({n}) ↓','fw.empty':'Немає позицій',
    'fw.resize':'Розтягнути колонку',
    'fw.selected.count':'Вибрано позицій: {n}','fw.delete.selected':'Видалити вибрані ({n})',
    'fw.total.count':'Загальна кількість: {n}','fw.quantity':'К-сть','fw.tab.count':'{tag} ({n})',
    'fw.sidebar.edit':'Редагування позиції','fw.edit.btn':'Зберегти зміни',
    'fw.tabs.all':'Всі',
    'fw.export.toggle':'Включити/вимкнути позицію в експорті',
    'fw.book.toggle':'Включити/вимкнути перенос у книгу розрахунку',
    'settings.tags.per.row':'Кількість тегів у ряду',
    'settings.transfer':'Експорт та імпорт налаштувань','settings.transfer.export':'Експортувати','settings.transfer.import':'Імпортувати',
    'settings.export.done':'Налаштування експортовано:\n{path}','settings.export.error':'Помилка експорту:\n{error}',
    'settings.import.done':'Налаштування імпортовано','settings.import.error':'Помилка імпорту:\n{error}',
    'settings.import.empty':'Файл не містить налаштувань для імпорту',
    'calc.button':'Розрахунок','calc.title':'Розрахунок фурнітури',
    'calc.file.label':'Файл-книга','calc.file.choose':'Обрати файл','calc.file.none':'Файл не обрано',
    'calc.room.label':'Приміщення','calc.room.placeholder':'Назва приміщення (із проекту)',
    'calc.room.default':'Авто (з проекту)','calc.write':'Записати в книгу',
    'calc.written':'Записано: {sheets}','calc.room.used':'Приміщення: {name}',
    'calc.err.no.file':'Спочатку оберіть файл-книгу','calc.err.no.room':'Вкажіть назву приміщення',
    'calc.err':'Помилка запису: {error}','calc.no.rows':'Немає даних для запису'
  },
  ru: {
    'brand':'OBI','explorer.open':'Открыть папку проекта','explorer.title':'Проект','explorer.refresh':'Обновить','explorer.select.all':'Выделить все',
    'explorer.empty':'Папка проекта не выбрана. Нажмите «Открыть папку проекта».','explorer.no.products':'В папке не найдено JSON-файлов OBI','explorer.selected':'Выбрано {n} из {m}',
    'export.excel':'Экспорт Excel','export.pdf':'Экспорт в PDF','tab.materials':'Материалы и кромка','tab.profiles':'Профили','tab.fittings':'Фурнитура',
    'fit.placeholder.name':'Наименование фурнитуры','fit.placeholder.code':'Артикул','fit.placeholder.count':'Кол-во','btn.add':'Добавить',
    'tags.manage':'Управление тегами:','tags.new.placeholder':'Новый тег','tags.add':'Добавить тег',
    'stat.materials':'Материалов','stat.profiles':'Профилей','stat.fittings':'Позиций фурнитуры',
    'stat.total':'Всего позиций','stat.details':'Деталей','stat.edges':'Кромки','stat.thickness':'Толщина','stat.inreport':'Включено в отчет',
    'stat.article':'Артикул','stat.sizes':'Размеров','stat.material':'Материал','stat.cut':'Пазов',
    'edge.title':'Кромка','edge.none':'Без кромки','export':'Экспорт','to.report':'В отчет','to.book':'В книгу',
    'cut':'{n} паз','cut.plural':'{n} пазов',
    'detail.article':'Артикул','detail.count':'Деталей','detail.parts':'Детали', 'pcs':'шт','profiles.sizes':'Размеры',
    'search.placeholder':'Поиск...','empty.list':'Список пуст','empty.noresults':'Ничего не найдено',
    'mat.add':'+ Добавить материал','prof.add':'+ Добавить профиль','fit.add':'+ Добавить фурнитуру',
    'tab.materials':'Материалы и кромка','tab.profiles':'Профили','tab.fittings':'Фурнитура','tab.sizes':'Размеры ({n})','tab.info':'Дополнительная информация',
    'fit.name.placeholder':'Наименование','fit.article.placeholder':'Артикул','fit.drag.title':'Перетащить',
    'fit.export.title':'Включить в экспорт','fit.category':'Категория','fit.delete.title':'Удалить',
    'fit.tag.rename':'Переименовать тег','fit.tag.delete':'Удалить тег','fit.empty':'Пусто',
    'confirm.delete.pos':'Удалить позицию?','confirm.delete.selected':'Удалить выбранные позиции ({n})?','alert.cannot.delete.std':'Базовый тег «Загальная фурнитура» нельзя удалить',
    'confirm.delete.tag':'Удалить тег "{tag}"? Фурнитура будет перенесена в "Загальная фурнитура".',
    'alert.tag.exists':'Такой тег уже существует','alert.enter.name':'Введите наименование','alert.enter.count':'Введите количество','alert.enter.tagname':'Введите название тега',
    'settings':'Настройки','settings.title':'Настройки','settings.theme':'Тема','settings.theme.light':'Светлая','settings.theme.dark':'Тёмная',
    'settings.language':'Язык','settings.language.uk':'Українська','settings.language.ru':'Русский',
    'settings.rules':'Правила экспорта','settings.rules.open':'Открыть',
    'settings.about':'О приложении','settings.version':'Версия','settings.author':'Автор','settings.github':'GitHub','settings.close':'Закрыть',
    'alert.save.fail':'Не удалось сохранить изменения',
    'export.saved':'Экспорт сохранён:\n{path}','alert.export.error':'Ошибка экспорта:\n{error}',
    'settings.updates':'Обновления','settings.updates.auto':'Автоматически проверять обновления при запуске',
    'settings.updates.check':'Проверить обновления','settings.updates.apply':'Обновить',
    'update.checking':'Проверка обновлений...','update.none':'Обновлений нет. Версия {v} — актуальна.',
    'update.available':'Доступна новая версия: {v} (текущая {cur})','update.available.dev':'Включена dev-версия — обновления не проверяются',
    'update.error':'Ошибка проверки: {error}','update.applying':'Обновление загружено. Приложение перезапустится...',
    'update.apply.error':'Не удалось обновить: {error}',
    'appbar.total.positions':'Всего позиций','appbar.total.materials':'Материалов','appbar.total.profiles':'Профилей','appbar.total.area':'Площадь (общая)','appbar.import':'Импорт','appbar.export':'Экспорт','appbar.total.count':'Общее количество:','appbar.add':'+ Добавить позицию','appbar.area.unit':' м²',
    'cat.search.placeholder':'Поиск...','tab.details':'Детали','tab.edges':'Кромка','tab.cuts':'Стыковка','col.article':'Артикул','col.supplier':'Поставщик','col.note':'Примечание','col.qty':'Кол-во','col.name':'Наименование','col.type':'Тип','col.no':'№',
    'project.add':'Добавить проект','project.open':'Открыть папку проекта','project.none':'Других проектов нет',
    'detail.empty':'Выберите позицию слева','add.mat.title':'Добавить материал','add.prof.title':'Добавить профиль',
    'fw.title':'Фурнитура','fw.subtitle':'Управление номенклатурой фурнитуры в проекте',
    'fw.tags.manage':'Управление тегами',
    'fw.search.placeholder':'Поиск по названию, артикулу или поставщику...',
    'fw.sidebar.title':'Добавление позиции','fw.field.category':'Категория','fw.field.name':'Название',
    'fw.field.code':'Артикул','fw.field.supplier':'Поставщик','fw.field.count':'К-сть',
    'fw.field.name.placeholder':'Введите название','fw.field.code.placeholder':'Введите артикул',
    'fw.add.btn':'Добавить позицию','fw.clear.btn':'Очистить форму',
    'fw.add.column':'+ Добавить позицию','fw.show.more':'Показать все ({n}) ↓','fw.empty':'Нет позиций',
    'fw.resize':'Растянуть колонку',
    'fw.selected.count':'Выбрано позиций: {n}','fw.delete.selected':'Удалить выбранные ({n})',
    'fw.total.count':'Общее количество: {n}','fw.quantity':'К-сть','fw.tab.count':'{tag} ({n})',
    'fw.sidebar.edit':'Редактирование позиции','fw.edit.btn':'Сохранить изменения',
    'fw.tabs.all':'Все',
    'fw.export.toggle':'Включить/выключить позицию в экспорте',
    'fw.book.toggle':'Включить/выключить перенос в расчетную книгу',
    'settings.tags.per.row':'Количество тегов в ряду',
    'settings.transfer':'Экспорт и импорт настроек','settings.transfer.export':'Экспортировать','settings.transfer.import':'Импортировать',
    'settings.export.done':'Настройки экспортированы:\n{path}','settings.export.error':'Ошибка экспорта:\n{error}',
    'settings.import.done':'Настройки импортированы','settings.import.error':'Ошибка импорта:\n{error}',
    'settings.import.empty':'Файл не содержит настроек для импорта',
    'calc.button':'Расчёт','calc.title':'Расчёт фурнитуры',
    'calc.file.label':'Файл-книга','calc.file.choose':'Выбрать файл','calc.file.none':'Файл не выбран',
    'calc.room.label':'Помещение','calc.room.placeholder':'Название помещения (из проекта)',
    'calc.room.default':'Авто (из проекта)','calc.write':'Записать в книгу',
    'calc.written':'Записано: {sheets}','calc.room.used':'Помещение: {name}',
    'calc.err.no.file':'Сначала выберите файл-книгу','calc.err.no.room':'Укажите название помещения',
    'calc.err':'Ошибка записи: {error}','calc.no.rows':'Нет данных для записи'
  }
};

function lang() {
  return config && config.language === 'ru' ? 'ru' : 'uk';
}

function t(key, params) {
  let s = (I18N[lang()] && I18N[lang()][key]) || key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
  }
  return s;
}

function isExported(item) {
  return item.export !== false;
}

function isBooked(item) {
  return item.book !== false;
}

function normTag(tag) {
  const t = tag || 'Загальна фурнітура';
  return LEGACY_TAGS[t] || t;
}

function getTagOrder() {
  if (db.tagOrder && Array.isArray(db.tagOrder)) {
    return db.tagOrder.slice().map(normTag).filter(t => t);
  }
  return DEFAULT_TAGS.slice();
}

function ensureTagOrder() {
  const needsTag = {};
  (db.fittings || []).forEach(f => { needsTag[normTag(f.tag)] = true; });
  const order = getTagOrder();
  if (!Array.isArray(db.tagOrder)) {
    DEFAULT_TAGS.forEach(t => { if (order.indexOf(t) === -1) order.push(t); });
  }
  Object.keys(needsTag).forEach(t => { if (order.indexOf(t) === -1) order.push(t); });
  db.tagOrder = order;
}

function ensureFitIds() {
  if (!db.fittings) db.fittings = [];
  db.fittings.forEach(f => {
    const k = rowKey(f);
    let id = fitIdMap.get(k);
    if (id == null) { id = fitIdSeq++; fitIdMap.set(k, id); }
    f.id = id;
  });
}

function emptyFitRules() {
  return { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [], bookBlacklist: [], bookBlacklistByName: [], matBookBlacklist: [], matBookBlacklistByName: [], profBookBlacklist: [], profBookBlacklistByName: [] };
}

function normalizeFitRules(r) {
  const out = emptyFitRules();
  if (!r || typeof r !== 'object') return out;
  Object.keys(out).forEach(k => {
    if (Array.isArray(out[k])) out[k] = Array.isArray(r[k]) ? r[k] : [];
    else out[k] = (r[k] && typeof r[k] === 'object') ? r[k] : {};
  });
  return out;
}

// ---- Row identity keys (stable across aggregate rebuilds) ----
function matKey(m) { return (m.name || '') + '|' + (m.code || '') + '|' + (m.thickness || 0); }
function profKey(p) { return (p.name || '') + '|' + (p.material || ''); }
function fitKey(f) { return (f.name || '') + '|' + (f.code || ''); }

function rowKey(it) {
  if (!it) return '';
  if (it._added) return 'A' + it._addId;
  if (it._key) return it._key;
  if (it._kind === 'material') return matKey(it);
  if (it._kind === 'profile') return profKey(it);
  return fitKey(it);
}

function tagOptions(selected, order) {
  const cur = normTag(selected);
  const tags = order || getTagOrder();
  return tags.map(t =>
    `<option value="${escapeAttr(t)}" ${t === cur ? 'selected' : ''}>${escapeHtml(t)}</option>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  try { config = (await window.api.getConfig()) || config; } catch (e) {}
  if (config.colWidths && typeof config.colWidths === 'object') fwColWidths = Object.assign({}, config.colWidths);
  if (Array.isArray(config.recentFolders)) recentFolders = config.recentFolders.slice(0, 10);
  try { fitRules = normalizeFitRules(await window.api.getFitRules()); } catch (e) { fitRules = emptyFitRules(); }
  try { appInfo = (await window.api.getAppInfo()) || appInfo; } catch (e) {}
  db = emptyDb();
  overlay = normalizeOverlay(null);
  applyTheme();
  applyLanguage();
  bindSearch();
  bindListEvents();
  bindFittingsEvents();
  bindSettingsEvents();
  bindExplorerEvents();
  bindTopbarDropdown();
  if (window.api.onFitRulesUpdated) {
    window.api.onFitRulesUpdated(async () => {
      try { fitRules = normalizeFitRules(await window.api.getFitRules()); } catch (e) {}
      if (db) rebuildKeepState();
    });
  }
  try {
    const st = await window.api.getProjectState();
    if (st && st.root) {
      await openProjectFolder(st.root, st.preselect || '');
    } else {
      renderExplorer();
      renderProjectName();
      renderAll();
    }
  } catch (e) {
    renderExplorer();
    renderProjectName();
    renderAll();
  }
  hideBootSplash();
});

function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }, 40);
}

function renderProjectName() {
  const el = document.getElementById('project-name');
  if (!el) return;
  el.textContent = projectTree ? projectTree.name : '';
  el.title = projectRoot || '';
}

// ============ PROJECT FOLDER / EXPLORER ============

function emptyDb() {
  return { date: new Date().toString(), name: '', orderName: '', materials: [], profiles: [], fittings: [] };
}

function normalizeOverlay(o) {
  o = (o && typeof o === 'object') ? o : {};
  const added = (o.added && typeof o.added === 'object') ? o.added : {};
  const order = (o.order && typeof o.order === 'object') ? o.order : {};
  return {
    version: 1,
    deleted: Array.isArray(o.deleted) ? o.deleted.filter(x => typeof x === 'string') : [],
    counts: (o.counts && typeof o.counts === 'object') ? o.counts : {},
    edits: (o.edits && typeof o.edits === 'object') ? o.edits : {},
    added: {
      materials: Array.isArray(added.materials) ? added.materials : [],
      profiles: Array.isArray(added.profiles) ? added.profiles : [],
      fittings: Array.isArray(added.fittings) ? added.fittings : []
    },
    order: {
      materials: Array.isArray(order.materials) ? order.materials : [],
      profiles: Array.isArray(order.profiles) ? order.profiles : [],
      fittings: Array.isArray(order.fittings) ? order.fittings : []
    },
    tagOrder: Array.isArray(o.tagOrder) ? o.tagOrder : [],
    addIdCounter: (typeof o.addIdCounter === 'number' && o.addIdCounter > 0) ? o.addIdCounter : 1
  };
}

function collectTreeProducts(node, out) {
  if (!node) return out || [];
  if (!out) out = [];
  if (node.type === 'product') { out.push(node); return out; }
  (node.children || []).forEach(c => collectTreeProducts(c, out));
  return out;
}

function allDirPaths(node, out) {
  if (!node) return out || [];
  if (!out) out = [];
  if (node.type === 'dir') {
    out.push(node.path);
    (node.children || []).forEach(c => allDirPaths(c, out));
  }
  return out;
}

function visibleProductPaths(node, out) {
  node = node || projectTree;
  if (!node) return out || [];
  if (!out) out = [];
  if (node.type === 'product') { out.push(node.path); return out; }
  const expanded = (node === projectTree) || expandedDirs.has(node.path);
  if (expanded) (node.children || []).forEach(c => visibleProductPaths(c, out));
  return out;
}

function findTreeNode(node, p) {
  if (!node) return null;
  if (node.path === p) return node;
  const kids = node.children || [];
  for (let i = 0; i < kids.length; i++) {
    const r = findTreeNode(kids[i], p);
    if (r) return r;
  }
  return null;
}

async function ensureProductsLoaded(paths) {
  const missing = (paths || []).filter(p => !products.has(p));
  if (!missing.length) return;
  const res = await window.api.loadProducts(missing);
  (res || []).forEach(r => {
    if (r && r.db) products.set(r.path, r.db);
  });
}

async function openProjectFolder(root, preselect) {
  projectRoot = root;
  let scan = null;
  try { scan = await window.api.scanProject(); } catch (e) {}
  products = new Map();
  fitIdMap = new Map();
  fitIdSeq = 1;
  if (!scan || !scan.success || !scan.tree) {
    projectTree = null;
    selection = new Set();
    db = emptyDb();
    ensureTagOrder();
    renderExplorer();
    renderProjectName();
    renderAll();
    return;
  }
  projectTree = scan.tree;
  const allPaths = Array.isArray(scan.products) ? scan.products : collectTreeProducts(projectTree).map(n => n.path);
  try { overlay = normalizeOverlay(await window.api.readOverlay()); } catch (e) { overlay = normalizeOverlay(null); }
  if (preselect && allPaths.indexOf(preselect) !== -1) selection = new Set([preselect]);
  else selection = new Set(allPaths);
  expandedDirs = new Set(allDirPaths(projectTree));
  await ensureProductsLoaded([...selection]);
  selId = null;
  selTab = 'details';
  selectedFitIds.clear();
  selectedListItems.clear();
  listAnchorItem = null;
  rebuildAggregate();
  if (db.materials && db.materials.length) selId = 0;
  renderExplorer();
  renderProjectName();
  renderAll();
}

async function chooseProjectFolder() {
  let res;
  try { res = await window.api.chooseProjectFolder(); } catch (e) { return; }
  if (!res || !res.success) return;
  await openProjectFolder(res.root, '');
}

async function rescanProject() {
  if (!projectRoot) { chooseProjectFolder(); return; }
  products = new Map();
  let scan = null;
  try { scan = await window.api.scanProject(); } catch (e) {}
  if (!scan || !scan.success || !scan.tree) return;
  projectTree = scan.tree;
  const allPaths = Array.isArray(scan.products) ? scan.products : collectTreeProducts(projectTree).map(n => n.path);
  const kept = [...selection].filter(p => allPaths.indexOf(p) !== -1);
  selection = new Set(kept.length ? kept : allPaths);
  try { overlay = normalizeOverlay(await window.api.readOverlay()); } catch (e) {}
  await ensureProductsLoaded([...selection]);
  rebuildKeepState();
  renderExplorer();
}

function selectAllProducts() {
  if (!projectTree) return;
  selection = new Set(collectTreeProducts(projectTree).map(n => n.path));
  onSelectionChanged();
}

async function onSelectionChanged() {
  try {
    await ensureProductsLoaded([...selection]);
    rebuildKeepState();
  } catch (e) {}
  renderExplorer();
}

function toggleDir(p) {
  if (expandedDirs.has(p)) expandedDirs.delete(p);
  else expandedDirs.add(p);
  renderExplorer();
}

// ---- Explorer rendering ----

function renderExplorer() {
  const el = document.getElementById('explorer-tree');
  if (!el) return;
  if (!projectTree) {
    el.innerHTML = `<div class="exp-empty">${escapeHtml(t('explorer.empty'))}
      <button class="btn btn-primary exp-empty-btn" onclick="chooseProjectFolder()">${escapeHtml(t('explorer.open'))}</button>
    </div>`;
    renderExplorerFooter();
    return;
  }
  const prods = collectTreeProducts(projectTree);
  if (!prods.length) {
    el.innerHTML = `<div class="exp-empty">${escapeHtml(t('explorer.no.products'))}
      <button class="btn btn-primary exp-empty-btn" onclick="rescanProject()">${escapeHtml(t('explorer.refresh'))}</button>
    </div>`;
    renderExplorerFooter();
    return;
  }
  el.innerHTML = expDirHTML(projectTree, 0, true);
  el.querySelectorAll('.exp-check[data-ind="1"]').forEach(c => { c.indeterminate = true; });
  renderExplorerFooter();
}

function renderExplorerFooter() {
  const el = document.getElementById('explorer-footer');
  if (!el) return;
  const total = projectTree ? collectTreeProducts(projectTree).length : 0;
  el.textContent = total ? t('explorer.selected', { n: selection.size, m: total }) : '';
}

function expDirHTML(node, depth, isRoot) {
  const prods = collectTreeProducts(node);
  const selCount = prods.filter(p => selection.has(p.path)).length;
  const allSel = prods.length > 0 && selCount === prods.length;
  const someSel = selCount > 0 && !allSel;
  const expanded = isRoot || expandedDirs.has(node.path);
  const row = `
    <div class="exp-row exp-dir${isRoot ? ' exp-root' : ''}" data-path="${escapeAttr(node.path)}" style="--depth:${depth}">
      <span class="exp-chev${expanded ? ' open' : ''}">▶</span>
      <input type="checkbox" class="exp-check" data-act="dir-check" ${allSel ? 'checked' : ''}${someSel ? ' data-ind="1"' : ''}>
      <span class="exp-icon exp-icon-dir">🗀</span>
      <span class="exp-name" title="${escapeAttr(node.path)}">${escapeHtml(node.name)}</span>
      ${prods.length ? `<span class="exp-count">${selCount}/${prods.length}</span>` : ''}
    </div>`;
  if (!expanded) return row;
  return row + (node.children || []).map(c =>
    c.type === 'dir' ? expDirHTML(c, depth + 1, false) : expProductHTML(c, depth + 1)
  ).join('');
}

function expProductHTML(node, depth) {
  const sel = selection.has(node.path);
  return `
    <div class="exp-row exp-product${sel ? ' selected' : ''}" data-path="${escapeAttr(node.path)}" style="--depth:${depth}" title="${escapeAttr(node.path)}">
      <span class="exp-chev-placeholder"></span>
      <input type="checkbox" class="exp-check" data-act="prod-check" ${sel ? 'checked' : ''}>
      <span class="exp-icon exp-icon-file">🗎</span>
      <span class="exp-name">${escapeHtml(node.displayName || node.name)}</span>
    </div>`;
}

let explorerAnchorPath = null;

function bindExplorerEvents() {
  const tree = document.getElementById('explorer-tree');
  if (tree) {
    tree.addEventListener('click', explorerClick);
    tree.addEventListener('change', explorerCheckChange);
  }
  const openBtn = document.getElementById('explorer-open-btn');
  if (openBtn) openBtn.addEventListener('click', chooseProjectFolder);
  const refreshBtn = document.getElementById('explorer-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', rescanProject);
  const allBtn = document.getElementById('explorer-select-all-btn');
  if (allBtn) allBtn.addEventListener('click', selectAllProducts);
}

function explorerClick(e) {
  if (e.target.closest('input')) return;
  const row = e.target.closest('.exp-row');
  if (!row) return;
  const p = row.dataset.path;
  if (row.classList.contains('exp-dir')) {
    toggleDir(p);
    return;
  }
  const visible = visibleProductPaths();
  if (e.shiftKey && explorerAnchorPath) {
    const a = visible.indexOf(explorerAnchorPath);
    const b = visible.indexOf(p);
    if (a !== -1 && b !== -1) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const range = visible.slice(lo, hi + 1);
      if (e.ctrlKey || e.metaKey) range.forEach(x => selection.add(x));
      else selection = new Set(range);
    } else {
      selection = new Set([p]);
    }
    onSelectionChanged();
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    if (selection.has(p)) selection.delete(p); else selection.add(p);
    explorerAnchorPath = p;
    onSelectionChanged();
    return;
  }
  selection = new Set([p]);
  explorerAnchorPath = p;
  onSelectionChanged();
}

function explorerCheckChange(e) {
  const cb = e.target;
  if (!cb.classList || !cb.classList.contains('exp-check')) return;
  const row = cb.closest('.exp-row');
  if (!row) return;
  const p = row.dataset.path;
  if (cb.dataset.act === 'dir-check') {
    const node = findTreeNode(projectTree, p);
    const prods = node ? collectTreeProducts(node).map(n => n.path) : [];
    if (cb.checked) prods.forEach(x => selection.add(x));
    else prods.forEach(x => selection.delete(x));
  } else {
    if (cb.checked) selection.add(p); else selection.delete(p);
    explorerAnchorPath = p;
  }
  onSelectionChanged();
}

// ============ AGGREGATION ============

function mergeEdgeInto(edges, e) {
  if (!e || !e.name) return;
  const k = (e.name || '') + '|' + (e.code || '');
  let t = null;
  for (let i = 0; i < edges.length; i++) {
    if (((edges[i].name || '') + '|' + (edges[i].code || '')) === k) { t = edges[i]; break; }
  }
  if (!t) {
    t = { name: e.name || '', code: e.code || '', width: e.width || 0, thickness: e.thickness || 0, count: 0 };
    edges.push(t);
  }
  t.count += (e.count || 0);
  if (!t.width && e.width) t.width = e.width;
  if (!t.thickness && e.thickness) t.thickness = e.thickness;
}

function mergeProfileDetailInto(details, d) {
  if (!d) return;
  const k = (d.width || 0) + '|' + (d.thickness || 0) + '|' + (d.length || 0);
  let t = null;
  for (let i = 0; i < details.length; i++) {
    const x = details[i];
    if (((x.width || 0) + '|' + (x.thickness || 0) + '|' + (x.length || 0)) === k) { t = x; break; }
  }
  if (!t) {
    t = { width: d.width || 0, thickness: d.thickness || 0, length: d.length || 0, count: 0, positions: [] };
    details.push(t);
  }
  t.count += (d.count || 0);
  (d.positions || []).forEach(pos => {
    if (pos && t.positions.indexOf(pos) === -1) t.positions.push(pos);
  });
}

function mergeProducts(list) {
  const mats = new Map();
  const profs = new Map();
  const fits = new Map();
  (list || []).forEach(pdb => {
    (pdb.materials || []).forEach(m => {
      const key = matKey(m);
      let t = mats.get(key);
      if (!t) {
        t = { name: m.name || '', code: m.code || '', thickness: m.thickness || 0, count: 0, edges: [], details: [], _kind: 'material', _key: key };
        mats.set(key, t);
      }
      t.count += (m.count || 0);
      if (m.details && m.details.length) t.details = t.details.concat(m.details);
      (m.edges || []).forEach(e => mergeEdgeInto(t.edges, e));
      if (m.export === false) t.export = false;
      if (m.book === false) t.book = false;
    });
    (pdb.profiles || []).forEach(p => {
      const key = profKey(p);
      let t = profs.get(key);
      if (!t) {
        t = { name: p.name || '', code: p.code || '', material: p.material || '', materialCode: p.materialCode || '', details: [], _kind: 'profile', _key: key };
        profs.set(key, t);
      }
      if (!t.code && p.code) t.code = p.code;
      if (!t.materialCode && p.materialCode) t.materialCode = p.materialCode;
      (p.details || []).forEach(d => mergeProfileDetailInto(t.details, d));
      if (!t.supplier && p.supplier) t.supplier = p.supplier;
      if (p.export === false) t.export = false;
      if (p.book === false) t.book = false;
    });
    (pdb.fittings || []).forEach(f => {
      const key = fitKey(f);
      let t = fits.get(key);
      if (!t) {
        t = Object.assign({}, f, { count: 0, _kind: 'fitting', _key: key });
        delete t.id;
        fits.set(key, t);
      }
      t.count += (f.count || 0);
      if (!t.elements && f.elements) t.elements = f.elements;
      if (f.isComposite) t.isComposite = true;
      if (f.isDraft) t.isDraft = true;
      if (!t.tag && f.tag) t.tag = f.tag;
      if (!t.supplier && f.supplier) t.supplier = f.supplier;
      if (f.export === false) t.export = false;
      if (f.book === false) t.book = false;
    });
  });
  return {
    date: new Date().toString(),
    materials: [...mats.values()],
    profiles: [...profs.values()],
    fittings: [...fits.values()]
  };
}

function applyOrder(arr, keys) {
  if (!arr || !keys || !keys.length) return;
  const idx = new Map();
  keys.forEach((k, i) => { if (!idx.has(k)) idx.set(k, i); });
  arr.sort((a, b) => {
    const ia = idx.has(rowKey(a)) ? idx.get(rowKey(a)) : Number.MAX_SAFE_INTEGER;
    const ib = idx.has(rowKey(b)) ? idx.get(rowKey(b)) : Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });
}

function applyOverlayToDb() {
  if (!overlay) return;
  const del = new Set(overlay.deleted);
  ['materials', 'profiles', 'fittings'].forEach(k => {
    db[k] = (db[k] || []).filter(it => !del.has(rowKey(it)));
  });
  [...(db.materials || []), ...(db.profiles || []), ...(db.fittings || [])].forEach(it => {
    const rk = rowKey(it);
    if (overlay.counts[rk] != null) it.count = overlay.counts[rk];
    const ed = overlay.edits[rk];
    if (ed) {
      if (ed.name != null) it.name = ed.name;
      if (ed.code != null) it.code = ed.code;
    }
  });
  (overlay.added.materials || []).forEach(m => db.materials.push(Object.assign({}, m, { _added: true, _kind: 'material' })));
  (overlay.added.profiles || []).forEach(p => db.profiles.push(Object.assign({}, p, { _added: true, _kind: 'profile' })));
  (overlay.added.fittings || []).forEach(f => db.fittings.push(Object.assign({}, f, { _added: true, _kind: 'fitting' })));
  applyOrder(db.materials, overlay.order.materials);
  applyOrder(db.profiles, overlay.order.profiles);
  applyOrder(db.fittings, overlay.order.fittings);
}

function rebuildAggregate() {
  const selDbs = [];
  selection.forEach(p => { const d = products.get(p); if (d) selDbs.push(d); });
  db = mergeProducts(selDbs);
  applyOverlayToDb();
  if (overlay && overlay.tagOrder && overlay.tagOrder.length) db.tagOrder = overlay.tagOrder.slice();
  applyFitRules();
  ensureTagOrder();
  ensureFitIds();
  const folderName = projectTree ? projectTree.name : '';
  const orderNames = selDbs.map(d => d.orderName).filter(x => x && String(x).trim());
  db.orderName = orderNames.length ? String(orderNames[0]).trim() : folderName;
  db.name = (selDbs.length === 1 && selDbs[0].name) ? selDbs[0].name : folderName;
  db.productCount = selDbs.length;
  pushFitRulesContext();
}

function pushFitRulesContext() {
  if (!window.api || !window.api.setFitRulesContext) return;
  try {
    window.api.setFitRulesContext({
      fittings: db.fittings || [],
      materials: db.materials || [],
      profiles: db.profiles || []
    });
  } catch (e) {}
}

function rebuildKeepState() {
  const catArr = () => (selCat === 'materials' ? (db.materials || []) : (db.profiles || []));
  const prevKey = (selId != null && catArr()[selId]) ? rowKey(catArr()[selId]) : null;
  const prevListKeys = new Set([...selectedListItems].map(rowKey));
  const prevFitIds = new Set(selectedFitIds);
  rebuildAggregate();
  if (prevKey != null) {
    const ni = catArr().findIndex(it => rowKey(it) === prevKey);
    selId = (ni !== -1) ? ni : null;
  } else {
    selId = null;
  }
  selectedListItems = new Set(catArr().filter(it => prevListKeys.has(rowKey(it))));
  selectedFitIds = new Set([...prevFitIds].filter(id => (db.fittings || []).some(f => f.id === id)));
  renderAll();
}

function syncOverlayFromDb() {
  if (!overlay) return;
  overlay.tagOrder = Array.isArray(db.tagOrder) ? db.tagOrder.slice() : [];
  overlay.order.materials = (db.materials || []).map(rowKey);
  overlay.order.profiles = (db.profiles || []).map(rowKey);
  overlay.order.fittings = (db.fittings || []).map(rowKey);
}

function persistOverlay() {
  if (!projectRoot || !overlay) return;
  try {
    window.api.saveOverlay(overlay).then(res => {
      if (!(res && res.success) && !(res && res.error === 'no-project')) alert(t('alert.save.fail'));
    }).catch(() => {});
  } catch (e) {}
}

function persistFitRules() {
  try {
    window.api.saveFitRules(fitRules).then(res => {
      if (!(res && res.success)) alert(t('alert.save.fail'));
    }).catch(() => {});
  } catch (e) {}
}

function findAdded(kind, addId) {
  if (!overlay || !overlay.added) return null;
  const arr = overlay.added[kind] || [];
  return arr.find(x => x && x._addId === addId) || null;
}

function addedKindArr(kind) {
  if (kind === 'material') return 'materials';
  if (kind === 'profile') return 'profiles';
  return 'fittings';
}

function removeItemsFromOverlay(items) {
  (items || []).forEach(it => {
    if (it._added) {
      const arr = overlay.added[addedKindArr(it._kind)] || [];
      const i = arr.findIndex(x => x && x._addId === it._addId);
      if (i !== -1) arr.splice(i, 1);
    } else {
      const rk = rowKey(it);
      if (overlay.deleted.indexOf(rk) === -1) overlay.deleted.push(rk);
    }
  });
}

// ============ HELPERS: SVG previews / type from name ============

// Derive material type from name (ДСП / МДФ / ДВП / etc.) — returns type label or ''.
function materialTypeFromName(name) {
  const s = String(name || '');
  const m = s.match(/(ДСП|МДФ|ДВП|ХДФ|ЛДСП|ПВХ|фанер[аы]|шпон|масив)/i);
  return m ? m[1].toUpperCase() : '';
}

// Hash string → stable hue 0-360 for a derived accent color.
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

// Decorative SVG plank preview (3D-style isometric panel).
function plankSVG(code, size) {
  const hue = hueFromString(String(code || ''));
  const top = `hsl(${hue}, 18%, 32%)`;
  const front = `hsl(${hue}, 22%, 22%)`;
  const side = `hsl(${hue}, 14%, 14%)`;
  const edge = `hsl(${hue}, 28%, 42%)`;
  const s = size || 96;
  return `<svg viewBox="0 0 96 96" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g-top-${hue}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${top}"/>
        <stop offset="100%" stop-color="${front}"/>
      </linearGradient>
    </defs>
    <polygon points="20,28 76,16 86,24 30,36" fill="url(#g-top-${hue})"/>
    <polygon points="30,36 86,24 86,68 30,80" fill="${front}"/>
    <polygon points="20,28 30,36 30,80 20,72" fill="${side}"/>
    <line x1="20" y1="28" x2="30" y2="36" stroke="${edge}" stroke-width="1"/>
    <line x1="30" y1="36" x2="86" y2="24" stroke="${edge}" stroke-width="1"/>
    <line x1="86" y1="24" x2="86" y2="68" stroke="${edge}" stroke-width="1"/>
    <line x1="30" y1="36" x2="30" y2="80" stroke="${edge}" stroke-width="1"/>
  </svg>`;
}

// Profile SVG (thin extrusion rod).
function profileSVG(code, size) {
  const hue = hueFromString(String(code || ''));
  const top = `hsl(${hue}, 30%, 50%)`;
  const side = `hsl(${hue}, 22%, 30%)`;
  const s = size || 96;
  return `<svg viewBox="0 0 96 96" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,44 82,32 82,52 14,64" fill="${top}"/>
    <polygon points="14,64 82,52 82,58 14,70" fill="${side}"/>
  </svg>`;
}

function itemPreviewSVG(it, size) {
  if (!it) return '';
  if (it.textureData) {
    var s = size || 96;
    return '<img src="' + it.textureData + '" style="width:' + s + 'px;height:' + s + 'px;object-fit:cover;border-radius:8px;display:block;">';
  }
  if (selCat === 'profiles') return profileSVG(it.code, size);
  return plankSVG(it.code, size);
}

function renderAll() {
  ensureTagOrder();
  ensureFitIds();
  renderSidebar();
  renderAppbar();
  renderCategoryListTitle();
  if (selCat === 'fittings') {
    showFittingWorkspace();
    renderFittings();
  } else {
    showRegularDetail();
    renderCategoryList();
    renderDetailTable();
  }
}

function showFittingWorkspace() {
  const ws = document.querySelector('.workspace');
  if (ws) ws.classList.add('fittings-mode');
  const fd = document.getElementById('fittings-detail');
  if (fd) fd.style.display = 'flex';
  ['detail-header', 'detail-tabs', 'detail-content', 'detail-stats'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showRegularDetail() {
  const ws = document.querySelector('.workspace');
  if (ws) ws.classList.remove('fittings-mode');
  const fd = document.getElementById('fittings-detail');
  if (fd) fd.style.display = 'none';
  ['detail-header', 'detail-tabs', 'detail-content', 'detail-stats'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}

// ============ THEME / LANGUAGE ============
function applyTheme() {
  document.body.classList.toggle('theme-light', config.theme === 'light');
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.title = t('settings');
  [['explorer-open-btn', 'explorer.open'], ['explorer-refresh-btn', 'explorer.refresh'], ['explorer-select-all-btn', 'explorer.select.all']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.title = t(key);
  });
  renderAll();
  renderExplorer();
}

// ============ APPBAR (global footer stats) ============
function totalArea() {
  let total = 0;
  (db.materials || []).forEach(m => {
    (m.details || []).forEach(d => {
      const w = Number(d.width || 0), h = Number(d.height || 0);
      if (w > 0 && h > 0) total += (w * h) / 1e6;
    });
  });
  return total;
}

function renderAppbar() {
  const mats = db.materials || [];
  const prf = db.profiles || [];
  const fit = db.fittings || [];
  const posEl = document.getElementById('appbar-positions');
  const matEl = document.getElementById('appbar-materials');
  const prfEl = document.getElementById('appbar-profiles');
  const areaEl = document.getElementById('appbar-area');
  const totalEl = document.getElementById('appbar-total');
  if (posEl) posEl.textContent = String(mats.length + prf.length + fit.length);
  if (matEl) matEl.textContent = String(mats.length);
  if (prfEl) prfEl.textContent = String(prf.length);
  if (areaEl) areaEl.textContent = totalArea().toFixed(2) + ' ' + t('appbar.area.unit').trim();
  if (totalEl) {
    let total = 0;
    if (selCat === 'materials') total = mats.reduce((s, m) => s + (m.count || 0), 0);
    else if (selCat === 'profiles') total = prf.reduce((s, p) => {
      let n = 0; (p.details || []).forEach(d => { n += (d.count || 0); }); return s + n;
    }, 0);
    else if (selCat === 'fittings') total = fit.reduce((s, f) => s + (f.count || 0), 0);
    totalEl.textContent = String(total);
  }
}

// ============ SIDEBAR (Матеріали / Профілі / Фурнітура) ============
function renderSidebar() {
  const mats = db.materials || [];
  const prf = db.profiles || [];
  const fit = db.fittings || [];
  const badgeMats = document.getElementById('badge-materials');
  const badgePrf = document.getElementById('badge-profiles');
  const badgeFit = document.getElementById('badge-fittings');
  if (badgeMats) badgeMats.textContent = mats.length;
  if (badgePrf) badgePrf.textContent = prf.length;
  if (badgeFit) badgeFit.textContent = fit.length;
}

function switchCat(cat) {
  selCat = cat;
  selId = null;
  selTab = 'details';
  selectedListItems.clear();
  listAnchorItem = null;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === cat));
  searchQuery = '';
  const search = document.getElementById('cat-search-input');
  if (search) search.value = '';
  renderAll();
}

// ============ CATEGORY LIST (middle column for materials/profiles) ============
function renderCategoryListTitle() {
  const title = document.getElementById('cat-title');
  if (!title) return;
  if (selCat === 'materials') title.textContent = t('tab.materials');
  else if (selCat === 'profiles') title.textContent = t('tab.profiles');
  else title.textContent = t('tab.fittings');
}

function catCardHTML(it, i, kind) {
  const isSel = (selId === i) || selectedListItems.has(it);
  const noEx = it.export === false ? ' no-export' : '';
  const dragHandle = `<span class="cat-card-drag" title="${t('fit.drag.title')}">⠿</span>`;
  const checks = `<span class="cat-card-checks">
    <input type="checkbox" class="cat-check-export" title="${t('fw.export.toggle')}" ${isExported(it) ? 'checked' : ''} onclick="event.stopPropagation(); appbarToggleCatExport(${i}, this.checked)">
    <input type="checkbox" class="cat-check-book book-check" title="${t('fw.book.toggle')}" ${isBooked(it) ? 'checked' : ''} onclick="event.stopPropagation(); appbarToggleCatBook(${i}, this.checked)">
  </span>`;
  let titleHtml, subHtml, metaHtml;
  if (kind === 'material') {
    const thick = Math.round(it.thickness) === it.thickness ? it.thickness : (it.thickness || 0).toFixed(1);
    titleHtml = escapeHtml(it.name || '');
    subHtml = escapeHtml((thick ? (thick + ' мм') + ' · ' : '') + (it.code || '—'));
    metaHtml = `<span>${t('detail.parts')}: <b>${(it.details || []).length}</b></span><span>${t('stat.thickness')}: <b>${thick} мм</b></span>`;
  } else if (kind === 'profile') {
    titleHtml = escapeHtml(it.material || it.name || '');
    subHtml = escapeHtml((it.materialCode || it.code || '—'));
    const sizeCount = (it.details || []).length;
    metaHtml = `<span>${t('stat.sizes')}: <b>${sizeCount}</b></span><span>${t('detail.article')}: <b>${escapeHtml(it.materialCode || it.code || '—')}</b></span>`;
  } else {
    titleHtml = escapeHtml(it.name || '');
    subHtml = escapeHtml(it.code || '—');
    metaHtml = `<span>${t('fw.quantity')}: <b>${it.count || 0}</b></span>`;
  }
  return `
    <div class="cat-card${isSel ? ' selected' : ''}${noEx}" draggable="true" data-idx="${i}" onclick="catCardClick(${i}, event)">
      <div class="cat-card-image">${itemPreviewSVG(it, 48)}</div>
      <div class="cat-card-main">
        <div class="cat-card-title">${titleHtml}</div>
        <div class="cat-card-sub">${subHtml}</div>
        <div class="cat-card-meta">${metaHtml}</div>
      </div>
      <div class="cat-card-actions">
        ${checks}
        ${dragHandle}
      </div>
    </div>
  `;
}

function renderCategoryList() {
  const body = document.getElementById('cat-body');
  if (!body) return;
  let arr = [];
  let kind = '';
  if (selCat === 'materials') { arr = db.materials || []; kind = 'material'; }
  else if (selCat === 'profiles') { arr = db.profiles || []; kind = 'profile'; }
  else { return; }
  const q = (searchQuery || '').toLowerCase();
  const list = arr.map((it, i) => ({ it, i })).filter(({ it }) => {
    if (!q) return true;
    const hay = ((it.name || '') + ' ' + (it.code || '') + ' ' + (it.material || '') + ' ' + (it.materialCode || '')).toLowerCase();
    return hay.indexOf(q) !== -1;
  });
  if (!list.length) {
    body.innerHTML = `<div class="cat-noresults">${arr.length ? t('empty.noresults') : t('empty.list')}</div>`;
    return;
  }
  body.innerHTML = list.map(({ it, i }) => catCardHTML(it, i, kind)).join('');
}

function catCardClick(i, e) {
  if (suppressListClick) { suppressListClick = false; return; }
  if (selCat === 'materials') selectMat(i, e);
  else if (selCat === 'profiles') selectProf(i, e);
}

function appbarToggleCatExport(i, checked) {
  if (selCat === 'materials') saveMatExport(i, checked);
  else if (selCat === 'profiles') saveProfExport(i, checked);
}

function appbarToggleCatBook(i, checked) {
  if (selCat === 'materials') saveMatBook(i, checked);
  else if (selCat === 'profiles') saveProfBook(i, checked);
}

function appbarAddPosition() {
  if (selCat === 'materials') {
    addMaterialInline();
  } else if (selCat === 'profiles') {
    addProfileInline();
  } else if (selCat === 'fittings') {
    if (typeof fwAddToColumn === 'function') fwAddToColumn('Загальна фурнітура');
  }
}

// Inline add (simple prompt-based — keeps the flow without a new modal)
function addMaterialInline() {
  const name = prompt(t('add.mat.title') + ' — name:');
  if (!name) return;
  const code = prompt(t('add.mat.title') + ' — code:', '') || '';
  const thickStr = prompt(t('add.mat.title') + ' — thickness (мм):', '18');
  const thickness = Number(thickStr) || 0;
  if (!overlay) return;
  if (!overlay.added) overlay.added = { materials: [], profiles: [], fittings: [] };
  overlay.added.materials.push({ _addId: overlay.addIdCounter++, name, code, thickness, count: 1, edges: [], details: [], _kind: 'material' });
  rebuildKeepState();
  saveDB();
}

function addProfileInline() {
  const material = prompt(t('add.prof.title') + ' — material name:');
  if (!material) return;
  const code = prompt(t('add.prof.title') + ' — article:', '') || '';
  if (!overlay) return;
  if (!overlay.added) overlay.added = { materials: [], profiles: [], fittings: [] };
  overlay.added.profiles.push({ _addId: overlay.addIdCounter++, name: material, code, material, materialCode: code, details: [], _kind: 'profile' });
  rebuildKeepState();
  saveDB();
}

function bindSearch() {
  const search = document.getElementById('cat-search-input');
  if (search) search.addEventListener('input', () => {
    searchQuery = search.value.trim().toLowerCase();
    if (selCat === 'fittings') renderFittings();
    else renderCategoryList();
  });

  const fwSearch = document.getElementById('fw-search-input');
  if (fwSearch) fwSearch.addEventListener('input', () => {
    searchQuery = fwSearch.value.trim().toLowerCase();
    renderFittings();
  });
}

function matCardHTML(m, i) {
  const thickness = Math.round(m.thickness) === m.thickness ? m.thickness : m.thickness.toFixed(1);
  const q = searchQuery;
  const nameHtml = q ? highlight(m.name || '', q) : escapeHtml(m.name || '');
  const code = (m.code || '').toLowerCase();
  const matchCode = q && code.indexOf(q) !== -1;
  const noEx = m.export === false ? ' no-export' : '';
  const isSel = selectedListItems.has(m);
  return `
    <div class="list-card ${isSel || i === selId ? 'selected' : ''}${noEx}" draggable="true" data-idx="${i}" onclick="selectMat(${i}, event)">
      <div class="lc-top">
        <div class="lc-thickness">${thickness} мм</div>
        <div class="lc-acts">
          <span class="lc-drag-handle" title="${t('fit.drag.title')}">⠿</span>
          <label class="lc-check" title="${t('fw.export.toggle')}" onclick="event.stopPropagation()">
            <input type="checkbox" ${isExported(m) ? 'checked' : ''} onchange="saveMatExport(${i}, this.checked)">
          </label>
          <label class="lc-check lc-check-book" title="${t('fw.book.toggle')}" onclick="event.stopPropagation()">
            <input type="checkbox" ${isBooked(m) ? 'checked' : ''} onchange="saveMatBook(${i}, this.checked)">
          </label>
        </div>
      </div>
      <div class="lc-name">${nameHtml}</div>
      <div class="lc-meta">
        <span>${t('detail.article')}: <b>${matchCode ? highlight(m.code || '', q) : escapeHtml(m.code || '—')}</b></span>
        <span>${t('detail.count')}: <b>${m.count || 0}</b></span>
      </div>
    </div>
  `;
}

function profCardHTML(p, i) {
  const details = (p.details && p.details.length) ? p.details : [{ length: p.length, count: p.count }];
  const total = details.reduce((s, d) => s + (d.count || 0), 0);
  const q = searchQuery;
  const nameHtml = q ? highlight(p.material || p.name || '', q) : escapeHtml(p.material || p.name || '');
  const pCode = p.materialCode || p.code || '';
  const code = pCode.toLowerCase();
  const matchCode = q && code.indexOf(q) !== -1;
  const noEx = p.export === false ? ' no-export' : '';
  const isSel = selectedListItems.has(p);
  return `
    <div class="list-card ${isSel || i === selId ? 'selected' : ''}${noEx}" draggable="true" data-idx="${i}" onclick="selectProf(${i}, event)">
      <div class="lc-top">
        <div class="lc-name">${nameHtml}</div>
        <div class="lc-acts">
          <span class="lc-drag-handle" title="${t('fit.drag.title')}">⠿</span>
          <label class="lc-check" title="${t('fw.export.toggle')}" onclick="event.stopPropagation()">
            <input type="checkbox" ${isExported(p) ? 'checked' : ''} onchange="saveProfExport(${i}, this.checked)">
          </label>
          <label class="lc-check lc-check-book" title="${t('fw.book.toggle')}" onclick="event.stopPropagation()">
            <input type="checkbox" ${isBooked(p) ? 'checked' : ''} onchange="saveProfBook(${i}, this.checked)">
          </label>
        </div>
      </div>
      <div class="lc-sub">${details.length} ${t('profiles.sizes').toLowerCase()}</div>
      <div class="lc-meta">
        <span>${t('detail.article')}: <b>${matchCode ? highlight(pCode, q) : escapeHtml(pCode || '—')}</b></span>
        <span>${t('detail.count')}: <b>${total}</b></span>
      </div>
      <div class="lc-supplier" onclick="event.stopPropagation()">
        <label>${t('fw.field.supplier')}:</label>
        <select onchange="saveProfileSupplier(${i}, this.value)">
          ${supplierOptions(p.supplier)}
        </select>
      </div>
    </div>
  `;
}

function renderList() {
  // Legacy alias — kept for any straggler callers.
  renderCategoryList();
}

// ============ LIST (materials / profiles): drag&drop reorder ============
let suppressListClick = false;

function bindListEvents() {
  const body = document.getElementById('cat-body');
  if (!body) return;
  body.addEventListener('dragstart', listDragStart);
  body.addEventListener('dragend', listDragEnd);
  body.addEventListener('dragover', listDragOver);
  body.addEventListener('drop', listDrop);
}

function listDragStart(e) {
  if (e.target.closest('input, select, button, .cat-card-checks')) { e.preventDefault(); return; }
  const card = e.target.closest('.cat-card');
  if (!card) return;
  const idx = parseInt(card.dataset.idx, 10);
  if (!Number.isFinite(idx)) return;
  e.dataTransfer.setData('application/x-obi-list', String(idx));
  e.dataTransfer.setData('text/plain', String(idx));
  e.dataTransfer.effectAllowed = 'move';
  requestAnimationFrame(() => card.classList.add('dragging'));
}

function listDragEnd(e) {
  const card = e.target.closest('.cat-card');
  if (card) card.classList.remove('dragging');
  clearListDropStyles();
}

function listDragOver(e) {
  e.preventDefault();
  clearListDropStyles();
  const card = e.target.closest('.cat-card');
  if (card) card.classList.add('drag-over');
}

function listDrop(e) {
  e.preventDefault();
  clearListDropStyles();
  if (selCat !== 'materials' && selCat !== 'profiles') return;
  const list = selCat === 'materials' ? (db.materials || []) : (db.profiles || []);
  const raw = e.dataTransfer.getData('application/x-obi-list') || e.dataTransfer.getData('text/plain');
  const fromIdx = parseInt(raw, 10);
  if (!Number.isFinite(fromIdx) || fromIdx < 0 || fromIdx >= list.length) return;

  const card = e.target.closest('.cat-card');
  let insertAt = list.length;
  if (card) {
    const toIdx = parseInt(card.dataset.idx, 10);
    if (Number.isFinite(toIdx)) {
      const rc = card.getBoundingClientRect();
      insertAt = (e.clientY > rc.top + rc.height / 2) ? toIdx + 1 : toIdx;
    }
  }
  if (fromIdx === insertAt || fromIdx === insertAt - 1) return;

  const prevSel = (selId != null && selId < list.length) ? list[selId] : null;
  reorderListItem(list, fromIdx, insertAt);
  if (prevSel) {
    const newIdx = list.indexOf(prevSel);
    selId = (newIdx !== -1) ? newIdx : null;
  }
  suppressListClick = true;
  setTimeout(() => { suppressListClick = false; }, 300);
  saveDB();
}

function reorderListItem(arr, from, insertAt) {
  const item = arr.splice(from, 1)[0];
  let dest = insertAt;
  if (from < insertAt) dest--;
  if (dest < 0) dest = 0;
  if (dest > arr.length) dest = arr.length;
  arr.splice(dest, 0, item);
}

function clearListDropStyles() {
  document.querySelectorAll('#cat-body .cat-card').forEach(c => c.classList.remove('drag-over'));
}

function highlight(text, q) {
  const esc = escapeHtml(text);
  if (!q) return esc;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return esc;
  const safe = escapeHtml(text.slice(idx, idx + q.length));
  return escapeHtml(text.slice(0, idx)) + '<b style="color:var(--accent)">' + safe + '</b>' + escapeHtml(text.slice(idx + q.length));
}

function visibleListItems() {
  if (selCat === 'materials') {
    const mats = db.materials || [];
    if (!searchQuery) return mats;
    return mats.filter(m => {
      const c = ((m.code || '') + ' ' + (m.name || '')).toLowerCase();
      return c.indexOf(searchQuery) !== -1;
    });
  }
  const prf = db.profiles || [];
  if (!searchQuery) return prf;
  return prf.filter(p => {
    const c = ((p.materialCode || p.code || '') + ' ' + (p.material || p.name || '')).toLowerCase();
    return c.indexOf(searchQuery) !== -1;
  });
}

function selectListItemRange(item, i, ctrl, shift) {
  const list = visibleListItems();
  const cur = list.indexOf(item);
  if (shift) {
    const anchor = listAnchorItem != null && list.indexOf(listAnchorItem) !== -1 ? listAnchorItem : item;
    const a = list.indexOf(anchor);
    const lo = Math.min(a, cur);
    const hi = Math.max(a, cur);
    const range = list.slice(lo, hi + 1);
    if (ctrl) range.forEach(x => selectedListItems.add(x));
    else selectedListItems = new Set(range);
  } else if (ctrl) {
    if (selectedListItems.has(item)) selectedListItems.delete(item);
    else selectedListItems.add(item);
  } else {
    selectedListItems = new Set([item]);
  }
  listAnchorItem = item;
}

function selectMat(i, e) {
  if (suppressListClick) { suppressListClick = false; return; }
  const m = (db.materials || [])[i];
  if (!m) return;
  selectListItemRange(m, i, e && (e.ctrlKey || e.metaKey), e && e.shiftKey);
  selId = i;
  selTab = 'details';
  renderCategoryList();
  renderDetailTable();
}

function selectProf(i, e) {
  if (suppressListClick) { suppressListClick = false; return; }
  const p = (db.profiles || [])[i];
  if (!p) return;
  selectListItemRange(p, i, e && (e.ctrlKey || e.metaKey), e && e.shiftKey);
  selId = i;
  selTab = 'details';
  renderCategoryList();
  renderDetailTable();
}

// ============ DETAIL (materials / profiles) ============
function detailHeader(sel, badgeClass, badgeHtml) {
  const sub = sel.sub.map(s => `<div class="dh-sub-item"><span class="sub-label">${s.label}</span><b>${s.value}</b></div>`).join('');
  return `
    <div class="dh-top">
      <div class="dh-title-wrap">
        <div class="dh-title">${escapeHtml(sel.title)}</div>
        <span class="dh-badge ${badgeClass}">${badgeHtml}</span>
      </div>
      <div class="dh-actions">
        <label class="exp-label" title="${t('to.report')}">
          <input type="checkbox" ${sel.exported ? 'checked' : ''} onchange="${sel.onExport}">
          <span>${t('to.report')}</span>
        </label>
        <label class="exp-label exp-label-book" title="${t('to.book')}">
          <input type="checkbox" ${sel.booked ? 'checked' : ''} onchange="${sel.onBook}">
          <span>${t('to.book')}</span>
        </label>
        <button class="btn btn-secondary" onclick="${sel.onExcel}">${t('export')}</button>
      </div>
    </div>
    <div class="dh-sub">${sub}</div>
  `;
}

function renderDetail() {
  // Legacy entrypoint retained as no-op for any old caller.
  renderDetailTable();
}

// ============ DETAIL TABLE (v2) ============
let detailSort = { col: null, dir: 1 }; // dir: 1 asc, -1 desc

function renderDetailTable() {
  const header = document.getElementById('detail-header');
  const tabs = document.getElementById('detail-tabs');
  const content = document.getElementById('detail-content');
  const stats = document.getElementById('detail-stats');

  let arr = [];
  if (selCat === 'materials') arr = db.materials || [];
  else if (selCat === 'profiles') arr = db.profiles || [];
  else return;
  const item = selId != null ? arr[selId] : arr[0];

  // Hide old detail-stats (footer now lives in appbar)
  if (stats) stats.style.display = 'none';

  if (!item) {
    header.innerHTML = '';
    tabs.innerHTML = '';
    tabs.style.display = 'none';
    content.innerHTML = `<div class="detail-table-empty">${t('detail.empty')}</div>`;
    return;
  }

  // --- Header v2 ---
  const isMat = selCat === 'materials';
  const thickness = isMat ? (item.thickness || 0) : null;
  const thickStr = thickness != null && Math.round(thickness) === thickness ? thickness : (thickness || 0).toFixed(1);
  const code = isMat ? item.code : (item.materialCode || item.code);
  const details = item.details || [];
  const edges = isMat ? (item.edges || []) : [];
  const matType = isMat ? materialTypeFromName(item.name) : '';
  const dimText = isMat && details.some(d => d.width && d.height)
    ? details.find(d => d.width && d.height).width + '×' + details.find(d => d.width && d.height).height + ' мм'
    : '';

  const headerHtml = `
    <div class="detail-header-v2">
      <div class="dh-image">${itemPreviewSVG(item, 96)}</div>
      <div class="dh-main">
        <div class="dh-title-row">
          <div class="dh-title">${escapeHtml(item.name || item.material || '')}</div>
        </div>
        <div class="dh-chips">
          ${isMat && thickStr ? `<span class="dh-chip"><span class="dh-chip-label">${t('stat.thickness')}</span><span class="dh-chip-value">${thickStr} мм</span></span>` : ''}
          <span class="dh-chip"><span class="dh-chip-label">${t('col.article')}</span><span class="dh-chip-value">${escapeHtml(fmtCode(code))}</span></span>
          <span class="dh-chip"><span class="dh-chip-label">${t('detail.parts')}</span><span class="dh-chip-value">${isMat ? details.length : (isMat ? 0 : details.length)}</span></span>
          ${matType ? `<span class="dh-chip"><span class="dh-chip-label">${t('col.type')}</span><span class="dh-chip-value">${escapeHtml(matType)}</span></span>` : ''}
        </div>
      </div>
      <div class="dh-edges">
        ${edges.slice(0, 4).map(e => `
          <div class="dh-edge-row">${e.thickness || 0} мм · <span class="dh-edge-art">арт. ${escapeHtml(fmtCode(e.code))}</span></div>
        `).join('')}
      </div>
    </div>
  `;
  header.innerHTML = headerHtml;
  header.style.display = '';

  // --- Tabs ---
  const tabsHtml = isMat ? `
    <div class="dtab ${selTab === 'details' ? 'active' : ''}" onclick="setDetailTab('details')">${t('tab.details')} (${details.length})</div>
    <div class="dtab ${selTab === 'edges' ? 'active' : ''}" onclick="setDetailTab('edges')">${t('tab.edges')} (${edges.length})</div>
    <div class="dtab ${selTab === 'cuts' ? 'active' : ''}" onclick="setDetailTab('cuts')">${t('tab.cuts')} (${details.reduce((n, d) => n + (d.cuts ? d.cuts.length : 0), 0)})</div>
  ` : `
    <div class="dtab ${selTab === 'details' ? 'active' : ''}" onclick="setDetailTab('details')">${t('profiles.sizes')} (${details.length})</div>
    <div class="dtab ${selTab === 'info' ? 'active' : ''}" onclick="setDetailTab('info')">${t('tab.info')}</div>
  `;
  tabs.innerHTML = tabsHtml;
  tabs.style.display = '';

  // --- Content ---
  if (selTab === 'info' && !isMat) {
    const total = details.reduce((s, d) => s + (d.count || 0), 0);
    content.innerHTML = `
      <div class="info-grid">
        ${infoItem(t('col.article'), fmtCode(item.materialCode || item.code))}
        ${infoItem(t('stat.material'), escapeHtml(item.material || item.name || ''))}
        ${infoItem(t('detail.count'), total)}
        ${infoItem(t('stat.sizes'), details.length)}
      </div>
    `;
    return;
  }
  if (selTab === 'edges' && isMat) {
    if (!edges.length) {
      content.innerHTML = `<div class="detail-table-empty">${t('edge.none')}</div>`;
      return;
    }
    content.innerHTML = `
      <div class="detail-table-wrap">
        <table class="detail-table">
          <thead><tr>
            <th class="check-col"></th>
            <th class="num-col">${t('col.no')}</th>
            <th>${t('col.name')}</th>
            <th class="qty-col">${t('stat.thickness')}</th>
            <th>${t('col.article')}</th>
            <th class="qty-col">${t('col.qty')}</th>
          </tr></thead>
          <tbody>
            ${edges.map((e, i) => `
              <tr>
                <td class="check-col"></td>
                <td class="num-col">${i + 1}</td>
                <td>${escapeHtml(e.name || '')}</td>
                <td class="qty-col">${e.thickness || 0} мм</td>
                <td class="code-col">${escapeHtml(fmtCode(e.code))}</td>
                <td class="qty-col">${e.count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }
  if (selTab === 'cuts' && isMat) {
    const allCuts = [];
    details.forEach((d, di) => {
      (d.cuts || []).forEach(cu => allCuts.push({ ...cu, _detail: d, _idx: di }));
    });
    if (!allCuts.length) {
      content.innerHTML = `<div class="detail-table-empty">—</div>`;
      return;
    }
    content.innerHTML = `
      <div class="detail-table-wrap">
        <table class="detail-table">
          <thead><tr>
            <th class="check-col"></th>
            <th class="num-col">${t('col.no')}</th>
            <th>${t('col.name')}</th>
            <th>${t('detail.parts')}</th>
            <th class="qty-col">${t('col.qty')}</th>
          </tr></thead>
          <tbody>
            ${allCuts.map((c, i) => `
              <tr>
                <td class="check-col"></td>
                <td class="num-col">${i + 1}</td>
                <td>${escapeHtml(c.sign || c.name || '')}</td>
                <td>${escapeHtml(c._detail.name || '')}</td>
                <td class="qty-col">${c._detail.count || 1}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  // Default: details table
  renderDetailItemsTable(item, isMat);
}

function renderDetailItemsTable(item, isMat) {
  const content = document.getElementById('detail-content');
  const rows = (item.details || []).slice();
  // Sorting
  if (detailSort.col && rows.length) {
    const dir = detailSort.dir;
    const key = detailSort.col;
    rows.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'pos') { av = a.position; bv = b.position; }
      if (key === 'note') { av = (a.width && a.height) ? a.width * a.height : -1; bv = (b.width && b.height) ? b.width * b.height : -1; }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'uk') * dir;
    });
  }
  if (!rows.length) {
    content.innerHTML = `<div class="detail-table-empty">—</div>`;
    return;
  }
  const type = isMat ? materialTypeFromName(item.name) : (item.material || '');
  const sortArrow = (col) => detailSort.col === col ? `<span class="sort-arrow">${detailSort.dir === 1 ? '▲' : '▼'}</span>` : '';
  const th = (cls, key, label) => `<th class="${cls} sortable" onclick="setDetailSort('${key}')">${label}${sortArrow(key)}</th>`;

  content.innerHTML = `
    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead>
          <tr>
            <th class="check-col"></th>
            ${th('num-col', 'pos', t('col.no'))}
            ${th('', 'name', t('col.name'))}
            ${th('', 'type', t('col.type'))}
            ${th('code-col', 'code', t('col.article'))}
            ${th('qty-col', 'count', t('col.qty'))}
            ${th('', 'note', t('col.note'))}
          </tr>
        </thead>
        <tbody>
          ${rows.map((d, i) => {
            const pos = d.position ? String(d.position) : String(i + 1);
            const note = (d.width != null && d.height != null) ? `${d.width}×${d.height} мм` : '';
            return `
              <tr>
                <td class="check-col"><input type="checkbox" class="row-check"></td>
                <td class="num-col">${escapeHtml(pos)}</td>
                <td>${escapeHtml(d.name || '')}</td>
                <td>${escapeHtml(type)}</td>
                <td class="code-col">${escapeHtml(fmtCode(d.code || item.code || ''))}</td>
                <td class="qty-col">${d.count || 1}</td>
                <td class="note-col">${escapeHtml(note)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setDetailTab(tab) {
  selTab = tab;
  detailSort = { col: null, dir: 1 };
  renderDetailTable();
}

function setDetailSort(col) {
  if (detailSort.col === col) detailSort.dir *= -1;
  else { detailSort.col = col; detailSort.dir = 1; }
  renderDetailTable();
}

// ============ FITTINGS LIST (navigation) ============
function renderFitList() {
  const body = document.getElementById('list-body');
  if (!body) return;
  const fit = (db.fittings || []).filter(f => {
    if (!searchQuery) return true;
    return ((f.code || '') + ' ' + (f.name || '')).toLowerCase().indexOf(searchQuery) !== -1;
  });
  body.innerHTML = fit.length
    ? fit.map(f => `
        <div class="list-card" onclick="jumpToFit(${f.id})">
          <div class="lc-name">${escapeHtml(f.name || '')}</div>
          <div class="lc-sub">${fmtCode(f.code)} · ${normTag(f.tag)}</div>
          <div class="lc-meta"><span>${t('detail.count')}: <b>${f.count}</b></span></div>
        </div>
      `).join('')
    : `<div class="list-empty">${t('empty.list')}</div>`;
}

function jumpToFit(id) {
  const row = document.querySelector(`.fw-column .fw-card[data-id="${id}"]`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    row.style.outline = '2px solid var(--accent)';
    setTimeout(() => { row.style.outline = ''; }, 800);
  }
}

// ============ HELPERS ============
function fmtCode(code) {
  return code ? code : '—';
}

function uniqPositions(d) {
  const arr = (d && d.positions) || [];
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

function cutKey(cu) {
  return cu && (cu.sign || cu.name);
}

function uniqueCuts(cuts) {
  const seen = {};
  const out = [];
  (cuts || []).forEach(cu => {
    const k = cutKey(cu);
    if (k == null || seen[k]) return;
    seen[k] = true;
    out.push(cu);
  });
  return out;
}

function detailCuts(d) {
  const c = uniqueCuts(d.cuts);
  if (!c.length) return null;
  const labels = c.map(cu => cu.sign || cu.name).filter(Boolean);
  return {
    count: c.length,
    text: labels.length ? labels.join('; ') : (lang() === 'ru' ? 'Паз' : 'Паз')
  };
}

function posNum(p) {
  if (p == null || p === '') return null;
  const n = Number(p);
  return isNaN(n) ? null : n;
}

function compareByPos(a, b) {
  const na = posNum(a), nb = posNum(b);
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  if (a === b) return 0;
  if (a == null || a === '') return 1;
  if (b == null || b === '') return -1;
  return String(a).localeCompare(String(b));
}

function groupByPosition(details) {
  const result = [];
  const map = {};
  (details || []).forEach(d => {
    if (!d.position) {
      result.push({ ...d, count: 1 });
      return;
    }
    if (!map[d.position]) {
      map[d.position] = { ...d, count: 1 };
      result.push(map[d.position]);
    } else {
      const target = map[d.position];
      target.count++;
      if (d.cuts && d.cuts.length) target.cuts = uniqueCuts((target.cuts || []).concat(d.cuts));
    }
  });
  result.sort((x, y) => compareByPos(x.position, y.position));
  return result;
}

// ============ FITTINGS: multi-select, drag&drop, tags ============
let selectedFitIds = new Set();
let fitAnchorId = null;
let marqueeEl = null;
let marqueeActive = false;
let mx0 = 0, my0 = 0;
let suppressNextClick = false;
let fwAddTagDefault = 'Загальна фурнітура';
let fwEditingId = null;
let selectedListItems = new Set();
let listAnchorItem = null;
let fwColWidths = {};

function fitById(id) {
  return (db.fittings || []).find(f => f.id === id);
}

let fwActiveTab = null;     // active category tab
let fwShownCount = {};      // tag -> number of items currently shown in column
const FW_PAGE = 8;          // how many extra items to reveal per "Показати ще"

function fwFilteredFittings() {
  const q = searchQuery;
  return (db.fittings || []).filter(f => {
    if (!q) return true;
    const hay = ((f.name || '') + ' ' + (f.code || '') + ' ' + (f.supplier || '')).toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}

function supplierOptions(selected) {
  const known = ['Owwa', 'Viyar', 'Blum'];
  const extra = [];
  (db.fittings || []).forEach(f => {
    if (f.supplier && known.indexOf(f.supplier) === -1 && extra.indexOf(f.supplier) === -1) extra.push(f.supplier);
  });
  (db.profiles || []).forEach(p => {
    if (p.supplier && known.indexOf(p.supplier) === -1 && extra.indexOf(p.supplier) === -1) extra.push(p.supplier);
  });
  const all = known.concat(extra);
  return `<option value="">—</option>` + all.map(s =>
    `<option value="${escapeAttr(s)}" ${s === (selected || '') ? 'selected' : ''}>${escapeHtml(s)}</option>`
  ).join('');
}

function fwCardHTML(f) {
  const sel = selectedFitIds.has(f.id) ? ' selected' : '';
  const noEx = f.export === false ? ' no-export' : '';
  return `
    <div class="fw-card${sel}${noEx}" draggable="true" data-id="${f.id}">
      <span class="fw-drag-handle" title="${t('fit.drag.title')}">⠿</span>
      <label class="fw-check" title="${t('fw.export.toggle')}" onclick="event.stopPropagation()">
        <input type="checkbox" class="fw-check-input" ${f.export === false ? '' : 'checked'}
          onchange="saveFitExport(${f.id}, this.checked)">
      </label>
      <label class="fw-check fw-check-book" title="${t('fw.book.toggle')}" onclick="event.stopPropagation()">
        <input type="checkbox" class="fw-check-input" ${f.book === false ? '' : 'checked'}
          onchange="saveFitBook(${f.id}, this.checked)">
      </label>
      <div class="fw-card-main">
        <div class="fw-card-editor">
          <input class="fw-card-name" value="${escapeAttr(f.name || '')}" placeholder="${t('fit.name.placeholder')}"
            onchange="saveFitName(${f.id}, this.value)">
          <span class="fw-card-qty-label">${t('fw.quantity')}</span>
          <input class="fw-card-count" type="number" min="1" value="${f.count}"
            onchange="saveFitCount(${f.id}, this.value)">
        </div>
        <div class="fw-card-editor">
          <input class="fw-card-code" value="${escapeAttr(f.code || '')}" placeholder="${t('fit.article.placeholder')}"
            onchange="saveFitCode(${f.id}, this.value)">
          <select class="fw-card-supplier" onchange="saveFitSupplier(${f.id}, this.value)" title="${t('fw.field.supplier')}">
            ${supplierOptions(f.supplier)}
          </select>
        </div>
      </div>
      <button class="btn btn-icon fw-card-del" title="${t('fit.delete.title')}" onclick="event.stopPropagation(); deleteFitting(${f.id})">✕</button>
    </div>
  `;
}

function fwColumnHTML(tag) {
  const items = fwFilteredFittings().filter(f => normTag(f.tag) === tag);
  const total = items.length;
  const shown = fwShownCount[tag] != null ? fwShownCount[tag] : Math.min(total, FW_PAGE);
  const visible = items.slice(0, shown);
  const remaining = total - visible.length;
  const w = fwColWidths[tag];
  const widthStyle = w ? ` style="width:${w}px"` : '';
  return `
    <div class="fw-column" data-tag="${escapeAttr(tag)}"${widthStyle}>
      <div class="fw-col-header" draggable="true">
        <span class="fw-fit-tag-handle" title="${t('fit.drag.title')}">≡</span>
        <span class="fw-col-title">${escapeHtml(tag)}</span>
        <span class="fw-col-count">${total}</span>
        <div class="fw-col-header-actions">
          <button class="btn btn-icon btn-tag-rename" data-tag="${escapeAttr(tag)}" title="${t('fit.tag.rename')}">✎</button>
          <button class="btn btn-icon btn-tag-del" data-tag="${escapeAttr(tag)}" title="${t('fit.tag.delete')}">✕</button>
        </div>
      </div>
      <button class="fw-col-add" onclick="fwAddToColumn('${escapeAttr(tag)}')">${t('fw.add.column')}</button>
      <div class="fw-col-body">
        ${visible.map(fwCardHTML).join('') || `<div class="fw-empty">${t('fw.empty')}</div>`}
      </div>
      <div class="fw-col-footer">
        ${remaining > 0 ? `<button class="fw-show-more" onclick="fwShowMore('${escapeAttr(tag)}', ${total})">${t('fw.show.more', { n: remaining })}</button>` : ''}
      </div>
      <div class="fw-col-resize" title="${t('fw.resize')}"></div>
    </div>
  `;
}

function fwAddToColumn(tag) {
  fwAddTagDefault = tag;
  if (fwEditingId != null) {
    fwEditingId = null;
    clearFwForm();
  }
  renderFwSidebar();
  const nameEl = document.getElementById('fw-add-name');
  if (nameEl) nameEl.focus();
}

function fwTagsPerRow() {
  const n = parseInt(config.tagsPerRow, 10);
  return (n >= 1 && n <= 6) ? n : 4;
}

function renderFwTabs() {
  const tabs = document.getElementById('fw-tabs');
  if (!tabs) return;
  const order = getTagOrder();
  const counts = {};
  (db.fittings || []).forEach(f => {
    const tag = normTag(f.tag);
    counts[tag] = (counts[tag] || 0) + 1;
  });
  const allCls = fwActiveTab === null ? ' active' : '';
  const allBtn = `<div class="fw-tab fw-tab-all${allCls}" onclick="fwShowAll()">${t('fw.tabs.all')}</div>`;
  const tagTabs = order.map(tag => {
    const n = counts[tag] || 0;
    const active = fwActiveTab === tag;
    return `<div class="fw-tab${active ? ' active' : ''}" data-tag="${escapeAttr(tag)}" onclick="fwSwitchTab('${escapeAttr(tag)}')">
      ${escapeHtml(tag)} <span class="fw-tab-count">(${n})</span>
    </div>`;
  }).join('');
  tabs.innerHTML = allBtn + tagTabs;
}

function fwShowAll() {
  fwActiveTab = null;
  renderFittings();
}

function renderFwSidebar() {
  const sel = document.getElementById('fw-add-tag');
  if (sel) sel.innerHTML = tagOptions(fwAddTagDefault || 'Загальна фурнітура', getTagOrder());
  updateFwFormTitle();
}

function renderFwFooter() {
  const total = (db.fittings || []).length;
  const selTr = document.getElementById('fw-selected-label');
  if (selTr) selTr.textContent = t('fw.selected.count', { n: selectedFitIds.size });
  const delBtn = document.getElementById('fw-delete-btn');
  if (delBtn) {
    delBtn.textContent = t('fw.delete.selected', { n: selectedFitIds.size });
    delBtn.disabled = selectedFitIds.size === 0;
  }
  const totEl = document.getElementById('fw-total-label');
  if (totEl) totEl.textContent = t('fw.total.count', { n: total });
}

function renderFittings() {
  const container = document.getElementById('fittings-columns');
  if (!container) return;
  container.style.setProperty('--fw-cols', String(fwTagsPerRow()));
  const order = getTagOrder();
  const q = searchQuery;
  // Figure out which tags get columns: when searching, only show tags that have matches;
  // otherwise show all tags (active tab filter if set).
  let visible;
  if (q) {
    const matchTags = new Set(fwFilteredFittings().map(f => normTag(f.tag)));
    visible = order.filter(tag => matchTags.has(tag));
  } else if (fwActiveTab !== null) {
    visible = [fwActiveTab];
  } else {
    visible = order;
  }
  container.innerHTML = visible.map(fwColumnHTML).join('')
    || `<div class="fw-empty-global">${t('empty.noresults')}</div>`;
  renderFwTabs();
  renderFwSidebar();
  renderFwFooter();
  updateRowSelection();
}

function fwSwitchTab(tag) {
  fwActiveTab = (fwActiveTab === tag) ? null : tag;
  searchQuery = '';
  const search = document.getElementById('fw-search-input');
  if (search) search.value = '';
  renderFittings();
}

function fwShowMore(tag, total) {
  fwShownCount[tag] = total;
  renderFittings();
}

function editFittingFromCard(id) {
  const f = fitById(id);
  if (!f) return;
  fwEditingId = id;
  const nameEl = document.getElementById('fw-add-name');
  const codeEl = document.getElementById('fw-add-code');
  const countEl = document.getElementById('fw-add-count');
  const tagEl = document.getElementById('fw-add-tag');
  const supEl = document.getElementById('fw-add-supplier');
  if (nameEl) nameEl.value = f.name || '';
  if (codeEl) codeEl.value = f.code || '';
  if (countEl) countEl.value = f.count || 1;
  if (tagEl) tagEl.value = f.tag || 'Загальна фурнітура';
  if (supEl) supEl.value = f.supplier || '';
  fwAddTagDefault = f.tag || 'Загальна фурнітура';
  updateFwFormTitle();
  if (nameEl) nameEl.focus();
}

function updateFwFormTitle() {
  const title = document.querySelector('.fw-sidebar-title');
  if (title) title.textContent = fwEditingId != null ? t('fw.sidebar.edit') : t('fw.sidebar.title');
  const addBtn = document.querySelector('.fw-add-btn');
  if (addBtn) addBtn.textContent = fwEditingId != null ? t('fw.edit.btn') : t('fw.add.btn');
}

function addFittingFromSidebar() {
  const nameEl = document.getElementById('fw-add-name');
  const codeEl = document.getElementById('fw-add-code');
  const countEl = document.getElementById('fw-add-count');
  const tagEl = document.getElementById('fw-add-tag');
  const supEl = document.getElementById('fw-add-supplier');
  const name = nameEl ? nameEl.value.trim() : '';
  const code = codeEl ? codeEl.value.trim() : '';
  const count = parseInt((countEl && countEl.value) || '1', 10);
  const tag = tagEl ? tagEl.value : 'Загальна фурнітура';
  const supplier = supEl ? supEl.value : '';
  if (!name) { alert(t('alert.enter.name')); return; }
  if (!count || count < 1) { alert(t('alert.enter.count')); return; }
  if (fwEditingId != null) {
    const f = fitById(fwEditingId);
    if (f) {
      if (f._added) {
        const ent = findAdded('fittings', f._addId);
        if (ent) { ent.name = name; ent.code = code; ent.count = count; ent.tag = tag; ent.supplier = supplier; }
      } else {
        const rk = rowKey(f);
        const ed = overlay.edits[rk] || (overlay.edits[rk] = {});
        ed.name = name;
        ed.code = code;
        overlay.counts[rk] = count;
      }
      if (code) fitRules.tags[code] = tag;
      if (name) fitRules.tagsByName[name] = tag;
      if (supplier) {
        if (code) fitRules.suppliers[code] = supplier;
        if (name) fitRules.suppliersByName[name] = supplier;
      }
    }
    fwEditingId = null;
  } else {
    overlay.added.fittings.push({ _addId: overlay.addIdCounter++, name, code, count, tag, supplier });
    fwAddTagDefault = tag;
  }
  if (nameEl) nameEl.value = '';
  if (codeEl) codeEl.value = '';
  if (countEl) countEl.value = '1';
  if (supEl) supEl.value = '';
  updateFwFormTitle();
  saveDB();
}

function clearFwForm() {
  const nameEl = document.getElementById('fw-add-name');
  const codeEl = document.getElementById('fw-add-code');
  const countEl = document.getElementById('fw-add-count');
  const supEl = document.getElementById('fw-add-supplier');
  if (nameEl) nameEl.value = '';
  if (codeEl) codeEl.value = '';
  if (countEl) countEl.value = '1';
  if (supEl) supEl.value = '';
  fwEditingId = null;
  updateFwFormTitle();
}

function bindFittingsEvents() {
  const container = document.getElementById('fittings-columns');
  container.addEventListener('mousedown', fittingsMouseDown);
  container.addEventListener('mousemove', onMarqueeMove);
  container.addEventListener('mouseup', onMarqueeEnd);
  container.addEventListener('click', fittingsClick);
  container.addEventListener('dragstart', fittingsDragStart);
  container.addEventListener('dragend', fittingsDragEnd);
  container.addEventListener('dragover', fittingsDragOver);
  container.addEventListener('drop', fittingsDrop);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !e.target.closest('input, select')) {
      selectedFitIds.clear();
      updateRowSelection();
      renderFwFooter();
      if (selCat !== 'fittings') {
        selectedListItems.clear();
        listAnchorItem = null;
        renderCategoryList();
        renderDetailTable();
      }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFitIds.size && !e.target.closest('input, select, textarea')) {
      e.preventDefault();
      deleteSelectedFittings();
    }
  });
  const newTagInput = document.getElementById('new-tag-input');
  if (newTagInput) {
    newTagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });
  }
  const addTagSel = document.getElementById('fw-add-tag');
  if (addTagSel) {
    addTagSel.addEventListener('change', () => { fwAddTagDefault = addTagSel.value; });
  }
}

function startColResize(e, handle) {
  e.preventDefault();
  const col = handle.closest('.fw-column');
  if (!col) return;
  const tag = col.getAttribute('data-tag');
  const startX = e.clientX;
  const startW = col.getBoundingClientRect().width;
  const minW = 160;
  const maxW = Math.min(1200, (document.getElementById('fittings-columns') || document.body).getBoundingClientRect().width);

  const onMove = (ev) => {
    const w = Math.max(minW, Math.min(maxW, startW + (ev.clientX - startX)));
    col.style.width = w + 'px';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('col-resizing');
    const w = Math.round(col.getBoundingClientRect().width);
    fwColWidths[tag] = w;
    config.colWidths = Object.assign({}, fwColWidths);
    saveConfig();
  };

  document.body.classList.add('col-resizing');
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function fittingsMouseDown(e) {
  if (e.button !== 0) return;
  const resizeHandle = e.target.closest('.fw-col-resize');
  if (resizeHandle) {
    startColResize(e, resizeHandle);
    return;
  }
  if (e.target.closest('input, select, button, .fw-check')) return;
  const row = e.target.closest('.fw-card');
  if (row) {
    const id = parseInt(row.dataset.id, 10);
    if (e.shiftKey) {
      const visible = Array.from(document.querySelectorAll('.fw-column .fw-card')).map(r => parseInt(r.dataset.id, 10));
      const anchor = fitAnchorId != null && visible.indexOf(fitAnchorId) !== -1 ? fitAnchorId : id;
      const a = visible.indexOf(anchor);
      const b = visible.indexOf(id);
      if (a !== -1 && b !== -1) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const range = visible.slice(lo, hi + 1);
        if (e.ctrlKey || e.metaKey) range.forEach(x => selectedFitIds.add(x));
        else selectedFitIds = new Set(range);
      } else {
        selectedFitIds = new Set([id]);
      }
      fitAnchorId = id;
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedFitIds.has(id)) selectedFitIds.delete(id); else selectedFitIds.add(id);
      fitAnchorId = id;
    } else if (!selectedFitIds.has(id)) {
      selectedFitIds = new Set([id]);
      fitAnchorId = id;
    }
    updateRowSelection();
    renderFwFooter();
    return;
  }
  startMarquee(e);
}

function startMarquee(e) {
  marqueeActive = true;
  mx0 = e.clientX; my0 = e.clientY;
  marqueeEl = null;
}

function cancelMarquee() {
  marqueeActive = false;
  if (marqueeEl) { marqueeEl.remove(); marqueeEl = null; }
}

function onMarqueeMove(e) {
  if (!marqueeActive) return;
  const dx = e.clientX - mx0;
  const dy = e.clientY - my0;
  if (!marqueeEl && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
  if (!marqueeEl) {
    marqueeEl = document.createElement('div');
    marqueeEl.className = 'fit-marquee';
    document.body.appendChild(marqueeEl);
  }
  const x = Math.min(mx0, e.clientX);
  const y = Math.min(my0, e.clientY);
  const w = Math.abs(dx);
  const h = Math.abs(dy);
  marqueeEl.style.left = x + 'px';
  marqueeEl.style.top = y + 'px';
  marqueeEl.style.width = w + 'px';
  marqueeEl.style.height = h + 'px';
  updateMarqueeSelection(x, y, x + w, y + h);
}

function updateMarqueeSelection(x0, y0, x1, y1) {
  const ids = [];
  document.querySelectorAll('.fw-column .fw-card').forEach(r => {
    const rc = r.getBoundingClientRect();
    if (rc.right >= x0 && rc.left <= x1 && rc.bottom >= y0 && rc.top <= y1) {
      ids.push(parseInt(r.dataset.id, 10));
    }
  });
  selectedFitIds = new Set(ids);
  updateRowSelection();
  renderFwFooter();
}

function onMarqueeEnd() {
  if (!marqueeActive) return;
  marqueeActive = false;
  if (marqueeEl) {
    marqueeEl.remove();
    marqueeEl = null;
    suppressNextClick = true;
  }
}

function updateRowSelection() {
  document.querySelectorAll('.fw-column .fw-card').forEach(r => {
    const checked = selectedFitIds.has(parseInt(r.dataset.id, 10));
    r.classList.toggle('selected', checked);
  });
}

function fittingsClick(e) {
  if (suppressNextClick) { suppressNextClick = false; return; }
  const delBtn = e.target.closest('.btn-tag-del');
  if (delBtn) { deleteTag(delBtn.getAttribute('data-tag')); return; }
  const renBtn = e.target.closest('.btn-tag-rename');
  if (renBtn) { startRenameTag(renBtn.getAttribute('data-tag')); return; }
  if (!e.target.closest('.fw-card')) {
    selectedFitIds.clear();
    updateRowSelection();
    renderFwFooter();
  }
}

function fittingsDragStart(e) {
  if (e.target.closest('input, select, button')) { e.preventDefault(); return; }
  cancelMarquee();
  const row = e.target.closest('.fw-card');
  if (row) {
    let ids = new Set(selectedFitIds);
    const rowId = parseInt(row.dataset.id, 10);
    if (!ids.has(rowId)) {
      selectOnlyFit(rowId);
      ids = new Set([rowId]);
    }
    e.dataTransfer.setData('application/x-obi-fits', JSON.stringify([...ids]));
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => row.classList.add('dragging'));
    return;
  }
  const col = e.target.closest('.fw-column');
  if (col) {
    const tag = col.getAttribute('data-tag');
    if (!tag) return;
    e.dataTransfer.setData('application/x-obi-tag', tag);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => col.classList.add('drag-src'));
  }
}

function selectOnlyFit(id) {
  selectedFitIds = new Set([id]);
}

function fittingsDragEnd(e) {
  const row = e.target.closest('.fw-card');
  if (row) row.classList.remove('dragging');
  const col = e.target.closest('.fw-column');
  if (col) col.classList.remove('drag-src');
  clearDropStyles();
}

function fittingsDragOver(e) {
  e.preventDefault();
  const col = e.target.closest('.fw-column');
  if (col) col.classList.add('drag-over');
}

function dropTypes(e) {
  const t = e.dataTransfer && e.dataTransfer.types ? e.dataTransfer.types : [];
  const out = [];
  for (let i = 0; i < t.length; i++) out.push(t[i]);
  return out;
}

function fittingsDrop(e) {
  e.preventDefault();
  clearDropStyles();
  const col = e.target.closest('.fw-column');
  if (!col) return;
  const tag = col.getAttribute('data-tag');
  if (!tag) return;
  const types = dropTypes(e);
  if (types.indexOf('application/x-obi-tag') !== -1) {
    const dragTag = e.dataTransfer.getData('application/x-obi-tag');
    if (dragTag && dragTag !== tag) reorderTag(dragTag, tag);
    return;
  }
  let raw = '';
  if (types.indexOf('application/x-obi-fits') !== -1) {
    raw = e.dataTransfer.getData('application/x-obi-fits');
  } else {
    raw = e.dataTransfer.getData('text/plain');
  }
  let ids = [];
  try { ids = JSON.parse(raw); }
  catch (err) { ids = [parseInt(raw, 10)]; }
  if (!Array.isArray(ids)) ids = [ids];
  ids = ids.map(Number).filter(id => Number.isFinite(id));
  if (!ids.length) return;

  const body = col.querySelector('.fw-col-body');
  const beforeId = body ? findBeforeRowId(body, e.clientY) : null;
  applyFitMove(ids, tag, beforeId);

  selectedFitIds.clear();
  updateRowSelection();
  renderFwFooter();
  saveDB();
}

function findBeforeRowId(body, y) {
  const rows = Array.from(body.querySelectorAll('.fw-card'));
  for (const r of rows) {
    const rc = r.getBoundingClientRect();
    if (y < rc.top + rc.height / 2) return parseInt(r.dataset.id, 10);
  }
  return null;
}

function applyFitMove(ids, tag, beforeId) {
  if (!db.fittings) db.fittings = [];
  const idSet = new Set(ids);
  db.fittings.forEach(f => {
    if (idSet.has(f.id)) {
      f.tag = tag;
      if (f._added) {
        const ent = findAdded('fittings', f._addId);
        if (ent) ent.tag = tag;
      }
      if (f.code) fitRules.tags[f.code] = tag;
      if (f.name) fitRules.tagsByName[f.name] = tag;
    }
  });

  const tagKey = normTag(tag);
  const nonTarget = db.fittings.filter(f => !idSet.has(f.id) && normTag(f.tag) !== tagKey).map(f => f.id);
  const remaining = db.fittings.filter(f => normTag(f.tag) === tagKey && !idSet.has(f.id)).map(f => f.id);

  let pos = beforeId != null ? remaining.indexOf(beforeId) : -1;
  if (pos === -1) pos = remaining.length;

  const order = nonTarget.concat(remaining.slice(0, pos)).concat(ids).concat(remaining.slice(pos));
  const byId = {};
  db.fittings.forEach(f => { byId[f.id] = f; });
  db.fittings = order.map(id => byId[id]).filter(Boolean);
}

function reorderTag(dragTag, targetTag) {
  if (!dragTag || dragTag === targetTag) return;
  ensureTagOrder();
  const arr = getTagOrder();
  const from = arr.indexOf(dragTag);
  if (from === -1) return;
  const to = arr.indexOf(targetTag);
  arr.splice(from, 1);
  if (to === -1) arr.push(dragTag);
  else arr.splice(to, 0, dragTag);
  db.tagOrder = arr;
  saveDB();
}

function clearDropStyles() {
  document.querySelectorAll('.fw-column').forEach(c => c.classList.remove('drag-over'));
}

function startRenameTag(tag) {
  const container = document.getElementById('fittings-columns');
  const col = Array.from(container.querySelectorAll('.fw-column'))
    .find(c => c.getAttribute('data-tag') === tag);
  if (!col) return;
  const title = col.querySelector('.fw-col-title');
  if (!title) return;
  const input = document.createElement('input');
  input.className = 'fit-tag-rename-input';
  input.value = tag;
  title.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (v && v !== tag) commitRenameTag(tag, v);
    else renderFittings();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(); }
    else if (e.key === 'Escape') { done = true; renderFittings(); }
  });
  input.addEventListener('blur', finish);
}

function commitRenameTag(oldTag, newTag) {
  const order = getTagOrder();
  if (order.indexOf(newTag) !== -1) { alert(t('alert.tag.exists')); return; }
  db.tagOrder = order.map(t => (t === oldTag ? newTag : t));
  (db.fittings || []).forEach(f => { if (normTag(f.tag) === oldTag) f.tag = newTag; });
  const ft = fitRules.tags;
  Object.keys(ft).forEach(code => { if (ft[code] === oldTag) ft[code] = newTag; });
  const fbn = fitRules.tagsByName || {};
  Object.keys(fbn).forEach(name => { if (fbn[name] === oldTag) fbn[name] = newTag; });
  saveDB();
}

function saveFitExport(id, checked) {
  const f = fitById(id);
  if (!f) return;
  const targets = (selectedFitIds.size > 1 && selectedFitIds.has(id))
    ? (db.fittings || []).filter(x => selectedFitIds.has(x.id))
    : [f];
  targets.forEach(t => {
    toggleBlacklist(fitRules.blacklist, fitRules.blacklistByName || [], t, checked);
  });
  saveDB();
}

function saveFitBook(id, checked) {
  const f = fitById(id);
  if (!f) return;
  const targets = (selectedFitIds.size > 1 && selectedFitIds.has(id))
    ? (db.fittings || []).filter(x => selectedFitIds.has(x.id))
    : [f];
  targets.forEach(t => {
    toggleBlacklist(fitRules.bookBlacklist, fitRules.bookBlacklistByName || [], t, checked);
  });
  saveDB();
}

function toggleBlacklist(byCode, byName, item, checked) {
  if (item.code) {
    if (!checked) { if (byCode.indexOf(item.code) === -1) byCode.push(item.code); }
    else { const idx = byCode.indexOf(item.code); if (idx !== -1) byCode.splice(idx, 1); }
  } else if (item.name) {
    if (!checked) { if (byName.indexOf(item.name) === -1) byName.push(item.name); }
    else { const idx = byName.indexOf(item.name); if (idx !== -1) byName.splice(idx, 1); }
  }
}

function applyFitRules() {
  const tags = fitRules.tags;
  const tagsByName = fitRules.tagsByName || {};
  const bl = fitRules.blacklist;
  const blByName = fitRules.blacklistByName || [];
  const bookBl = fitRules.bookBlacklist || [];
  const bookBlByName = fitRules.bookBlacklistByName || [];
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  const matBl = fitRules.matBlacklist || [];
  const matBlByName = fitRules.matBlacklistByName || [];
  const matBookBl = fitRules.matBookBlacklist || [];
  const matBookBlByName = fitRules.matBookBlacklistByName || [];
  const profBl = fitRules.profBlacklist || [];
  const profBlByName = fitRules.profBlacklistByName || [];
  const profBookBl = fitRules.profBookBlacklist || [];
  const profBookBlByName = fitRules.profBookBlacklistByName || [];
  (db.fittings || []).forEach(f => {
    if (f.code && tags[f.code]) f.tag = tags[f.code];
    else if (f.name && tagsByName[f.name]) f.tag = tagsByName[f.name];
    if (f.code && suppliers[f.code]) f.supplier = suppliers[f.code];
    else if (f.name && suppliersByName[f.name]) f.supplier = suppliersByName[f.name];
    const inBl = (f.code && bl.indexOf(f.code) !== -1) || (f.name && blByName.indexOf(f.name) !== -1) || (f.name && bl.indexOf(f.name) !== -1);
    if (inBl) f.export = false;
    const inBookBl = (f.code && bookBl.indexOf(f.code) !== -1) || (f.name && bookBlByName.indexOf(f.name) !== -1) || (f.name && bookBl.indexOf(f.name) !== -1);
    if (inBookBl) f.book = false;
  });
  (db.materials || []).forEach(m => {
    const inBl = (m.code && matBl.indexOf(m.code) !== -1) || (m.name && matBlByName.indexOf(m.name) !== -1) || (m.name && matBl.indexOf(m.name) !== -1);
    if (inBl) m.export = false;
    const inBookBl = (m.code && matBookBl.indexOf(m.code) !== -1) || (m.name && matBookBlByName.indexOf(m.name) !== -1) || (m.name && matBookBl.indexOf(m.name) !== -1);
    if (inBookBl) m.book = false;
  });
  (db.profiles || []).forEach(p => {
    if (p.code && suppliers[p.code]) p.supplier = suppliers[p.code];
    else if (p.name && suppliersByName[p.name]) p.supplier = suppliersByName[p.name];
    const inBl = (p.code && profBl.indexOf(p.code) !== -1) || (p.name && profBlByName.indexOf(p.name) !== -1) || (p.name && profBl.indexOf(p.name) !== -1);
    if (inBl) p.export = false;
    const inBookBl = (p.code && profBookBl.indexOf(p.code) !== -1) || (p.name && profBookBlByName.indexOf(p.name) !== -1) || (p.name && profBookBl.indexOf(p.name) !== -1);
    if (inBookBl) p.book = false;
  });
}

function saveFitName(id, value) {
  const f = fitById(id);
  if (!f) return;
  const v = value.trim();
  if (f._added) {
    const ent = findAdded('fittings', f._addId);
    if (ent) ent.name = v;
  } else {
    const rk = rowKey(f);
    const ed = overlay.edits[rk] || (overlay.edits[rk] = {});
    ed.name = v;
  }
  saveDB();
}

function saveFitTag(id, value) {
  const f = fitById(id);
  if (!f) return;
  if (f._added) {
    const ent = findAdded('fittings', f._addId);
    if (ent) ent.tag = value;
  }
  if (f.code) fitRules.tags[f.code] = value;
  if (f.name) fitRules.tagsByName[f.name] = value;
  saveDB();
}

function saveFitCode(id, value) {
  const f = fitById(id);
  if (!f) return;
  const v = value.trim();
  if (f._added) {
    const ent = findAdded('fittings', f._addId);
    if (ent) ent.code = v;
  } else {
    const rk = rowKey(f);
    const ed = overlay.edits[rk] || (overlay.edits[rk] = {});
    ed.code = v;
  }
  saveDB();
}

function saveFitCount(id, value) {
  const f = fitById(id);
  if (!f) return;
  const n = parseInt(value, 10);
  if (!n || n < 1) { renderFittings(); return; }
  if (f._added) {
    const ent = findAdded('fittings', f._addId);
    if (ent) ent.count = n;
  } else {
    overlay.counts[rowKey(f)] = n;
  }
  saveDB();
}

function saveFitSupplier(id, value) {
  const f = fitById(id);
  if (!f) return;
  const supplier = value || '';
  if (f._added) {
    const ent = findAdded('fittings', f._addId);
    if (ent) ent.supplier = supplier;
  }
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  if (supplier) {
    if (f.code) suppliers[f.code] = supplier;
    if (f.name) suppliersByName[f.name] = supplier;
  } else {
    if (f.code) delete suppliers[f.code];
    if (f.name) delete suppliersByName[f.name];
  }
  saveDB();
}

function saveProfileSupplier(i, value) {
  const p = db.profiles[i];
  if (!p) return;
  const supplier = value || '';
  if (p._added) {
    const ent = findAdded('profiles', p._addId);
    if (ent) ent.supplier = supplier;
  }
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  if (supplier) {
    if (p.code) suppliers[p.code] = supplier;
    if (p.name) suppliersByName[p.name] = supplier;
  } else {
    if (p.code) delete suppliers[p.code];
    if (p.name) delete suppliersByName[p.name];
  }
  saveDB();
}

function saveDB() {
  ensureTagOrder();
  syncOverlayFromDb();
  persistOverlay();
  persistFitRules();
  rebuildKeepState();
}

function deleteFitting(id) {
  const f = fitById(id);
  if (!f) return;
  if (!confirm(t('confirm.delete.pos'))) return;
  removeItemsFromOverlay([f]);
  saveDB();
}

function deleteSelectedFittings() {
  if (!selectedFitIds.size) return;
  const items = (db.fittings || []).filter(f => selectedFitIds.has(f.id));
  if (!items.length) return;
  if (!confirm(t('confirm.delete.selected', { n: items.length }))) return;
  removeItemsFromOverlay(items);
  selectedFitIds.clear();
  saveDB();
}

function addTag() {
  const input = document.getElementById('new-tag-input');
  const name = (input.value || '').trim();
  if (!name) { alert(t('alert.enter.tagname')); return; }
  const order = getTagOrder();
  if (order.indexOf(name) !== -1) { alert(t('alert.tag.exists')); return; }
  order.push(name);
  db.tagOrder = order;
  input.value = '';
  saveDB();
}

function deleteTag(tag) {
  const order = getTagOrder();
  if (tag === 'Загальна фурнітура') {
    alert(t('alert.cannot.delete.std'));
    return;
  }
  if (!confirm(t('confirm.delete.tag', { tag }))) return;
  (db.fittings || []).forEach(f => { if (normTag(f.tag) === tag) f.tag = 'Загальна фурнітура'; });
  db.tagOrder = order.filter(t => t !== tag);
  const ft = fitRules.tags;
  Object.keys(ft).forEach(code => { if (ft[code] === tag) ft[code] = 'Загальна фурнітура'; });
  const fbn = fitRules.tagsByName || {};
  Object.keys(fbn).forEach(name => { if (fbn[name] === tag) fbn[name] = 'Загальна фурнітура'; });
  (overlay.added.fittings || []).forEach(f => { if (normTag(f.tag) === tag) f.tag = 'Загальна фурнітура'; });
  saveDB();
}

// ============ ESCAPING ============
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============ FILE ACTIONS ============
// Project folder open/rescan/selection: see "PROJECT FOLDER / EXPLORER" section
// (chooseProjectFolder, rescanProject, selectAllProducts, openProjectFolder).

async function exportExcel() {
  const result = await window.api.exportXLSX(db);
  if (result.success) alert(t('export.saved', { path: result.path }));
  else if (result.error) alert(t('alert.export.error', { error: result.error }));
}

async function exportPDF() {
  closeExportMenu();
  const result = await window.api.exportPDF(db);
  if (result.success) alert(t('export.saved', { path: result.path }));
  else if (result.error) alert(t('alert.export.error', { error: result.error }));
}

function toggleExportMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('export-menu');
  if (menu) menu.classList.toggle('open');
}

function closeExportMenu() {
  const menu = document.getElementById('export-menu');
  if (menu) menu.classList.remove('open');
}

document.addEventListener('click', (ev) => {
  const dd = document.getElementById('export-dropdown');
  if (dd && !dd.contains(ev.target)) closeExportMenu();
});

function windowMinimize() {
  window.api.windowMinimize();
}

function windowMaximize() {
  window.api.windowMaximize();
}

function windowClose() {
  window.api.windowClose();
}

// ============ TOPBAR PROJECT SELECTOR ============
let recentFolders = [];

function bindTopbarDropdown() {
  const btn = document.getElementById('project-selector-btn');
  const dd = document.getElementById('project-dropdown');
  if (!btn || !dd) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dd.classList.toggle('open');
    btn.classList.toggle('open', dd.classList.contains('open'));
    if (dd.classList.contains('open')) renderProjectDropdown();
  });
  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target) && !btn.contains(e.target)) {
      dd.classList.remove('open');
      btn.classList.remove('open');
    }
  });
}

function renderProjectDropdown() {
  const dd = document.getElementById('project-dropdown');
  if (!dd) return;
  const items = [];
  const cur = projectRoot || '';
  items.push({
    name: projectTree ? projectTree.name : (cur ? cur.split(/[\\/]/).pop() || cur : '—'),
    path: cur,
    active: true
  });
  recentFolders.forEach(rf => {
    if (rf && rf !== cur) {
      items.push({ name: rf.split(/[\\/]/).pop() || rf, path: rf, active: false });
    }
  });
  items.push({ divider: true });
  items.push({ action: 'open', label: t('project.open') });

  dd.innerHTML = items.map(it => {
    if (it.divider) return `<div class="project-dropdown-divider"></div>`;
    if (it.action === 'open') return `<div class="project-dropdown-item project-dropdown-action" onclick="chooseProjectFolder(); closeProjectDropdown();"><span class="pd-name">+ ${escapeHtml(it.label)}</span></div>`;
    return `<div class="project-dropdown-item${it.active ? ' active' : ''}" title="${escapeAttr(it.path || '')}" onclick="${it.active ? 'closeProjectDropdown()' : 'switchToProject(\\\'' + (it.path || '').replace(/\\\\/g, '\\\\\\\\') + '\\\')'}"><span class="pd-name">${escapeHtml(it.name)}</span></div>`;
  }).join('');
}

function closeProjectDropdown() {
  const dd = document.getElementById('project-dropdown');
  const btn = document.getElementById('project-selector-btn');
  if (dd) dd.classList.remove('open');
  if (btn) btn.classList.remove('open');
}

async function switchToProject(path) {
  if (!path) return;
  closeProjectDropdown();
  try {
    const cfg = await window.api.saveConfig({ lastProjectFolder: path });
    projectRoot = path;
    await openProjectFolder(path, '');
  } catch (e) {}
}

// ============ SAVE EXPORT TOGGLES ============
function saveMatExport(i, checked) {
  const m = db.materials[i];
  if (!m) return;
  const targets = (selectedListItems.size > 1 && selectedListItems.has(m))
    ? db.materials.filter(x => selectedListItems.has(x))
    : [m];
  targets.forEach(t => {
    toggleBlacklist(fitRules.matBlacklist, fitRules.matBlacklistByName || [], t, checked);
  });
  saveDB();
}

function saveMatBook(i, checked) {
  const m = db.materials[i];
  if (!m) return;
  const targets = (selectedListItems.size > 1 && selectedListItems.has(m))
    ? db.materials.filter(x => selectedListItems.has(x))
    : [m];
  targets.forEach(t => {
    toggleBlacklist(fitRules.matBookBlacklist, fitRules.matBookBlacklistByName || [], t, checked);
  });
  saveDB();
}

function saveProfExport(i, checked) {
  const p = db.profiles[i];
  if (!p) return;
  const targets = (selectedListItems.size > 1 && selectedListItems.has(p))
    ? db.profiles.filter(x => selectedListItems.has(x))
    : [p];
  targets.forEach(t => {
    toggleBlacklist(fitRules.profBlacklist, fitRules.profBlacklistByName || [], t, checked);
  });
  saveDB();
}

function saveProfBook(i, checked) {
  const p = db.profiles[i];
  if (!p) return;
  const targets = (selectedListItems.size > 1 && selectedListItems.has(p))
    ? db.profiles.filter(x => selectedListItems.has(x))
    : [p];
  targets.forEach(t => {
    toggleBlacklist(fitRules.profBookBlacklist, fitRules.profBookBlacklistByName || [], t, checked);
  });
  saveDB();
}

// ============ SETTINGS ============
function bindSettingsEvents() {
  bindCalcEvents();
  const openBtn = document.getElementById('settings-btn');
  if (openBtn) openBtn.addEventListener('click', openSettings);
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeSettings();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeSettings();
    });
  }
  const closeBtn = document.getElementById('settings-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  const themeLight = document.getElementById('settings-theme-light');
  const themeDark = document.getElementById('settings-theme-dark');
  if (themeLight) themeLight.addEventListener('change', () => setTheme('light'));
  if (themeDark) themeDark.addEventListener('change', () => setTheme('dark'));
  const langUk = document.getElementById('settings-lang-uk');
  const langRu = document.getElementById('settings-lang-ru');
  if (langUk) langUk.addEventListener('change', () => setLanguage('uk'));
  if (langRu) langRu.addEventListener('change', () => setLanguage('ru'));

  const autoUpd = document.getElementById('settings-updates-auto');
  if (autoUpd) autoUpd.addEventListener('change', () => {
    config.autoUpdate = autoUpd.checked;
    saveConfig();
  });

  const tpr = document.getElementById('settings-tags-per-row');
  if (tpr) tpr.addEventListener('change', () => {
    let n = parseInt(tpr.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 6) n = 6;
    tpr.value = n;
    config.tagsPerRow = n;
    saveConfig();
  });

  if (window.api.onUpdateAvailable) {
    window.api.onUpdateAvailable((info) => {
      if (info && info.available) updateInfo = info;
    });
  }
}

function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  const themeDark = document.getElementById('settings-theme-dark');
  const langRu = document.getElementById('settings-lang-ru');
  const autoUpd = document.getElementById('settings-updates-auto');
  const tpr = document.getElementById('settings-tags-per-row');
  if (themeDark) themeDark.checked = config.theme === 'dark';
  if (langRu) langRu.checked = config.language === 'ru';
  if (autoUpd) autoUpd.checked = !!config.autoUpdate;
  if (tpr) tpr.value = fwTagsPerRow();
  renderSettingsMeta();
  modal.classList.add('open');
}

function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('open');
  const hiddenInput = document.activeElement;
  if (hiddenInput && hiddenInput.blur) hiddenInput.blur();
}

function openFitRulesWindow() {
  window.api.openFitRulesWindow();
}

async function exportSettings() {
  const payload = {
    config: Object.assign({}, config, { colWidths: fwColWidths }),
    fitRules: fitRules
  };
  const result = await window.api.exportSettings(payload);
  if (!result) return;
  if (result.success) alert(t('settings.export.done', { path: result.path }));
  else if (!result.canceled) alert(t('settings.export.error', { error: result.error || '' }));
}

async function importSettings() {
  const result = await window.api.importSettings();
  if (!result || result.canceled) return;
  let applied = 0;
  if (result.success) {
    if (result.config && typeof result.config === 'object') {
      config = Object.assign({}, config, result.config);
      if (config.colWidths && typeof config.colWidths === 'object') fwColWidths = Object.assign({}, config.colWidths);
      applyTheme();
      applyLanguage();
      saveConfig();
      applied++;
    }
    if (result.fitRules && typeof result.fitRules === 'object') {
      fitRules = normalizeFitRules(result.fitRules);
      saveDB();
      applied++;
    }
  } else {
    alert(t('settings.import.error', { error: result.error || '' }));
    return;
  }
  if (!applied) {
    alert(t('settings.import.empty'));
    return;
  }
  alert(t('settings.import.done'));
}

let calcWorkbookPath = '';
let calcRoomAuto = true;

function defaultCalcRoomName() {
  if (db && db.orderName && String(db.orderName).trim()) return String(db.orderName).trim();
  if (db && db.name && String(db.name).trim()) return String(db.name).trim();
  return '';
}

async function openCalcModal() {
  const modal = document.getElementById('calc-modal');
  if (!modal) return;
  const cfg = await window.api.getCalcWorkbookConfig();
  calcWorkbookPath = cfg.workbookPath || '';
  const nameEl = document.getElementById('calc-file-name');
  if (nameEl) nameEl.textContent = calcWorkbookPath ? calcWorkbookPath : t('calc.file.none');
  const hint = document.getElementById('calc-room-hint');
  const roomInput = document.getElementById('calc-room-input');
  calcRoomAuto = true;
  if (roomInput) roomInput.value = '';
  if (hint) {
    const def = defaultCalcRoomName();
    hint.textContent = def ? t('calc.room.used', { name: def }) : '';
  }
  modal.classList.add('open');
}

function closeCalcModal() {
  const modal = document.getElementById('calc-modal');
  if (modal) modal.classList.remove('open');
  const hiddenInput = document.activeElement;
  if (hiddenInput && hiddenInput.blur) hiddenInput.blur();
}

async function chooseCalcWorkbook() {
  const res = await window.api.chooseCalcWorkbook();
  if (res.success) {
    calcWorkbookPath = res.workbookPath;
    const el = document.getElementById('calc-file-name');
    if (el) el.textContent = res.workbookPath;
  }
}

function setCalcRoomAuto() {
  calcRoomAuto = true;
  const roomInput = document.getElementById('calc-room-input');
  if (roomInput) roomInput.value = '';
  const hint = document.getElementById('calc-room-hint');
  if (hint) {
    const def = defaultCalcRoomName();
    hint.textContent = def ? t('calc.room.used', { name: def }) : '';
  }
}

function onCalcRoomInput() {
  calcRoomAuto = false;
  const hint = document.getElementById('calc-room-hint');
  if (hint) hint.textContent = '';
}

async function writeCalcWorkbook() {
  if (!calcWorkbookPath) { alert(t('calc.err.no.file')); return; }
  let room = '';
  const roomInput = document.getElementById('calc-room-input');
  if (!calcRoomAuto && roomInput && String(roomInput.value).trim()) {
    room = String(roomInput.value).trim();
  } else {
    room = defaultCalcRoomName();
  }
  if (!room) { alert(t('calc.err.no.room')); return; }
  const result = await window.api.writeCalcWorkbook(db, room);
  if (!result.success) {
    alert(t('calc.err', { error: result.error || 'unknown' }));
    return;
  }
  if (!result.result || result.result.rows === 0) {
    alert(t('calc.no.rows'));
    return;
  }
  const sheetsInfo = result.result.sheets.map(s => s.sheet + ': ' + s.rows).join(', ');
  alert(t('calc.written', { sheets: sheetsInfo }));
}

function bindCalcEvents() {
  const modal = document.getElementById('calc-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeCalcModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeCalcModal();
    });
    const closeBtn = document.getElementById('calc-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCalcModal);
  }
  const roomInput = document.getElementById('calc-room-input');
  if (roomInput) roomInput.addEventListener('input', onCalcRoomInput);
}

function renderSettingsMeta() {
  const versionEl = document.getElementById('settings-version-value');
  const authorEl = document.getElementById('settings-author-value');
  const linkEl = document.getElementById('settings-github-link');
  if (versionEl) versionEl.textContent = appInfo.version || '—';
  if (authorEl) authorEl.textContent = appInfo.author || '—';
  if (linkEl) {
    linkEl.textContent = appInfo.url || '—';
    if (appInfo.url) linkEl.setAttribute('href', appInfo.url);
  }
}

let updateInfo = null;
let updateState = null; // 'checking' | 'idle' | 'applying'

function updateStatusEl() {
  return document.getElementById('updates-status');
}

function showUpdateStatus(text, cls) {
  const el = updateStatusEl();
  if (!el) return;
  el.textContent = text;
  el.className = 'updates-status' + (cls ? ' ' + cls : '');
}

async function checkUpdates() {
  updateState = 'checking';
  showUpdateStatus(t('update.checking'), '');
  const applyBtn = document.getElementById('updates-apply-btn');
  if (applyBtn) applyBtn.style.display = 'none';
  try {
    const res = await window.api.checkUpdate();
    updateInfo = res;
    renderUpdateResult(res);
  } catch (e) {
    showUpdateStatus(t('update.error', { error: e.message }), 'err');
  } finally {
    updateState = 'idle';
  }
}

function renderUpdateResult(res) {
  if (!res) return;
  if (res.dev) {
    showUpdateStatus(t('update.available.dev'), 'ok');
    return;
  }
  if (res.error) {
    showUpdateStatus(t('update.error', { error: res.error }), 'err');
    return;
  }
  const applyBtn = document.getElementById('updates-apply-btn');
  if (res.available) {
    showUpdateStatus(t('update.available', { v: res.latestVersion, cur: res.currentVersion }), 'warn');
    if (applyBtn) applyBtn.style.display = '';
  } else {
    showUpdateStatus(t('update.none', { v: res.currentVersion || appInfo.version }), 'ok');
    if (applyBtn) applyBtn.style.display = 'none';
  }
}

async function applyUpdates() {
  if (!updateInfo || !updateInfo.available) return;
  updateState = 'applying';
  showUpdateStatus(t('update.applying'), '');
  try {
    const res = await window.api.applyUpdate(updateInfo);
    if (!res.success) {
      updateState = 'idle';
      showUpdateStatus(t('update.apply.error', { error: res.error }), 'err');
    }
  } catch (e) {
    updateState = 'idle';
    showUpdateStatus(t('update.apply.error', { error: e.message }), 'err');
  }
}

function setTheme(theme) {
  config.theme = theme;
  applyTheme();
  saveConfig();
}

function setLanguage(language) {
  config.language = language;
  applyLanguage();
  const modal = document.getElementById('settings-modal');
  if (modal) modal.classList.remove('open');
  saveConfig();
}

function saveConfig() {
  try { window.api.saveConfig(config); } catch (e) {}
}
