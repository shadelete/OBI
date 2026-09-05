let db = null;
let config = { theme: 'dark', language: 'uk' };
let fitRules = { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [] };
let appInfo = { version: '', url: '', author: '' };

let selCat = 'materials';
let selId = null;
let selTab = 'edges';
let searchQuery = '';

const DEFAULT_TAGS = ['Загальна фурнітура', 'Петлі', 'Напрямні', 'Метизна фурнітура'];
const LEGACY_TAGS = { 'Петли': 'Петлі', 'Направляющие': 'Напрямні', 'Метизная фурнитура': 'Метизна фурнітура', 'Общая фурнитура': 'Загальна фурнітура' };

const I18N = {
  uk: {
    'brand':'OBI','open.project':'Відкрити замовлення','save.project':'Зберегти замовлення',
    'export.excel':'Експорт Excel','tab.materials':'Матеріали та кромка','tab.profiles':'Профілі','tab.fittings':'Фурнітура',
    'fit.placeholder.name':'Найменування фурнітури','fit.placeholder.code':'Артикул','fit.placeholder.count':'К-сть','btn.add':'Додати',
    'tags.manage':'Управління тегами:','tags.new.placeholder':'Новий тег','tags.add':'Додати тег',
    'stat.materials':'Матеріалів','stat.profiles':'Профілів','stat.fittings':'Позицій фурнітури',
    'stat.total':'Всього позицій','stat.details':'Деталей','stat.edges':'Кромки','stat.thickness':'Товщина','stat.inreport':'Включено в звіт',
    'stat.article':'Артикул','stat.sizes':'Розмірів','stat.material':'Матеріал','stat.cut':'Пазів',
    'edge.title':'Кромка','edge.none':'Без кромки','export':'Експорт','to.report':'До звіту',
    'cut':'{n} паз','cut.plural':'{n} пазів',
    'detail.article':'Артикул','detail.count':'Деталей','detail.parts':'Деталі', 'pcs':'шт','profiles.sizes':'Розміри',
    'search.placeholder':'Пошук...','empty.list':'Список порожній','empty.noresults':'Нічого не знайдено',
    'mat.add':'+ Додати матеріал','prof.add':'+ Додати профіль','fit.add':'+ Додати фурнітуру',
    'tab.edges':'Кромка','tab.details':'Деталі ({n})','tab.sizes':'Розміри ({n})','tab.info':'Додаткова інформація',
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
    'alert.save.fail':'Не вдалося зберегти зміни','alert.open.fail':'Не вдалося відкрити замовлення',
    'order.saved':'Замовлення збережено:\n{path}','alert.saveProject.fail':'Не вдалося зберегти замовлення',
    'export.saved':'Експорт збережено:\n{path}','alert.export.error':'Помилка експорту:\n{error}',
    'project.open':'Відкрити проект','project.rename.placeholder':'Нова назва проекту','project.empty':'Немає збережених проектів',
    'project.rename.error.exists':'Проект із такою назвою вже існує','project.rename.error.invalid':'Некоректна назва проекту',
    'project.saved':'Збережено: {name}','project.renamed':'Проект перейменовано: {name}','project.hint':'Клікніть для перейменування',
    'settings.updates':'Оновлення','settings.updates.auto':'Автоматично перевіряти оновлення при запуску',
    'settings.updates.check':'Перевірити оновлення','settings.updates.apply':'Оновити',
    'update.checking':'Перевірка оновлень...','update.none':'Оновлень немає. Версія {v} — актуальна.',
    'update.available':'Доступна нова версія: {v} (поточна {cur})','update.available.dev':'Увімкнено dev-версію — оновлення не перевіряються',
    'update.error':'Помилка перевірки: {error}','update.applying':'Оновлення завантажено. Додаток перезапуститься...',
    'update.apply.error':'Не вдалося оновити: {error}',
    'fw.title':'Фурнітура','fw.subtitle':'Керування номенклатурою фурнітури в проєкті',
    'fw.tags.manage':'Управління тегами','fw.sort.article':'Артикул','fw.sort.count':'К-сть','fw.save':'Зберегти',
    'fw.search.placeholder':'Пошук по назві, артикулу або постачальнику...',
    'fw.sidebar.title':'Додавання позиції','fw.field.category':'Категорія','fw.field.name':'Назва',
    'fw.field.code':'Артикул','fw.field.supplier':'Постачальник','fw.field.count':'К-сть',
    'fw.field.name.placeholder':'Введіть назву','fw.field.code.placeholder':'Введіть артикул',
    'fw.add.btn':'Додати позицію','fw.clear.btn':'Очистити форму',
    'fw.add.column':'+ Додати позицію','fw.show.more':'Показати ще {n} ↓','fw.empty':'Немає позицій',
    'fw.selected.count':'Вибрано позицій: {n}','fw.delete.selected':'Видалити вибрані ({n})',
    'fw.total.count':'Загальна кількість: {n}','fw.quantity':'К-сть','fw.tab.count':'{tag} ({n})',
    'fw.sidebar.edit':'Редагування позиції','fw.edit.btn':'Зберегти зміни',
    'fw.tabs.all':'Всі',
    'fw.export.toggle':'Включити/вимкнути позицію в експорті',
    'settings.tags.per.row':'Кількість тегів у ряду',
    'calc.button':'Розрахунок','calc.title':'Розрахунок фурнітури',
    'calc.file.label':'Файл-книга','calc.file.choose':'Обрати файл','calc.file.none':'Файл не обрано',
    'calc.room.label':'Приміщення','calc.room.placeholder':'Назва приміщення (із проекту)',
    'calc.room.default':'Авто (з проекту)','calc.write':'Записати в книгу',
    'calc.written':'Записано: {sheets}','calc.room.used':'Приміщення: {name}',
    'calc.err.no.file':'Спочатку оберіть файл-книгу','calc.err.no.room':'Вкажіть назву приміщення',
    'calc.err':'Помилка запису: {error}','calc.no.rows':'Немає даних для запису'
  },
  ru: {
    'brand':'OBI','open.project':'Открыть заказ','save.project':'Сохранить заказ',
    'export.excel':'Экспорт Excel','tab.materials':'Материалы и кромка','tab.profiles':'Профили','tab.fittings':'Фурнитура',
    'fit.placeholder.name':'Наименование фурнитуры','fit.placeholder.code':'Артикул','fit.placeholder.count':'Кол-во','btn.add':'Добавить',
    'tags.manage':'Управление тегами:','tags.new.placeholder':'Новый тег','tags.add':'Добавить тег',
    'stat.materials':'Материалов','stat.profiles':'Профилей','stat.fittings':'Позиций фурнитуры',
    'stat.total':'Всего позиций','stat.details':'Деталей','stat.edges':'Кромки','stat.thickness':'Толщина','stat.inreport':'Включено в отчет',
    'stat.article':'Артикул','stat.sizes':'Размеров','stat.material':'Материал','stat.cut':'Пазов',
    'edge.title':'Кромка','edge.none':'Без кромки','export':'Экспорт','to.report':'В отчет',
    'cut':'{n} паз','cut.plural':'{n} пазов',
    'detail.article':'Артикул','detail.count':'Деталей','detail.parts':'Детали', 'pcs':'шт','profiles.sizes':'Размеры',
    'search.placeholder':'Поиск...','empty.list':'Список пуст','empty.noresults':'Ничего не найдено',
    'mat.add':'+ Добавить материал','prof.add':'+ Добавить профиль','fit.add':'+ Добавить фурнитуру',
    'tab.edges':'Кромка','tab.details':'Детали ({n})','tab.sizes':'Размеры ({n})','tab.info':'Дополнительная информация',
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
    'alert.save.fail':'Не удалось сохранить изменения','alert.open.fail':'Не удалось открыть заказ',
    'order.saved':'Заказ сохранён:\n{path}','alert.saveProject.fail':'Не удалось сохранить заказ',
    'export.saved':'Экспорт сохранён:\n{path}','alert.export.error':'Ошибка экспорта:\n{error}',
    'project.open':'Открыть проект','project.rename.placeholder':'Новое название проекта','project.empty':'Нет сохранённых проектов',
    'project.rename.error.exists':'Проект с таким названием уже существует','project.rename.error.invalid':'Некорректное название проекта',
    'project.saved':'Сохранено: {name}','project.renamed':'Проект переименован: {name}','project.hint':'Нажмите для переименования',
    'settings.updates':'Обновления','settings.updates.auto':'Автоматически проверять обновления при запуске',
    'settings.updates.check':'Проверить обновления','settings.updates.apply':'Обновить',
    'update.checking':'Проверка обновлений...','update.none':'Обновлений нет. Версия {v} — актуальна.',
    'update.available':'Доступна новая версия: {v} (текущая {cur})','update.available.dev':'Включена dev-версия — обновления не проверяются',
    'update.error':'Ошибка проверки: {error}','update.applying':'Обновление загружено. Приложение перезапустится...',
    'update.apply.error':'Не удалось обновить: {error}',
    'fw.title':'Фурнитура','fw.subtitle':'Управление номенклатурой фурнитуры в проекте',
    'fw.tags.manage':'Управление тегами','fw.sort.article':'Артикул','fw.sort.count':'К-сть','fw.save':'Сохранить',
    'fw.search.placeholder':'Поиск по названию, артикулу или поставщику...',
    'fw.sidebar.title':'Добавление позиции','fw.field.category':'Категория','fw.field.name':'Название',
    'fw.field.code':'Артикул','fw.field.supplier':'Поставщик','fw.field.count':'К-сть',
    'fw.field.name.placeholder':'Введите название','fw.field.code.placeholder':'Введите артикул',
    'fw.add.btn':'Добавить позицию','fw.clear.btn':'Очистить форму',
    'fw.add.column':'+ Добавить позицию','fw.show.more':'Показать ещё {n} ↓','fw.empty':'Нет позиций',
    'fw.selected.count':'Выбрано позиций: {n}','fw.delete.selected':'Удалить выбранные ({n})',
    'fw.total.count':'Общее количество: {n}','fw.quantity':'К-сть','fw.tab.count':'{tag} ({n})',
    'fw.sidebar.edit':'Редактирование позиции','fw.edit.btn':'Сохранить изменения',
    'fw.tabs.all':'Все',
    'fw.export.toggle':'Включить/выключить позицию в экспорте',
    'settings.tags.per.row':'Количество тегов в ряду',
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
  if (typeof db.fitIdCounter !== 'number') db.fitIdCounter = 0;
  db.fittings.forEach(f => {
    if (typeof f.id !== 'number') { f.id = db.fitIdCounter++; }
  });
}

function tagOptions(selected, order) {
  const cur = normTag(selected);
  const tags = order || getTagOrder();
  return tags.map(t =>
    `<option value="${escapeAttr(t)}" ${t === cur ? 'selected' : ''}>${escapeHtml(t)}</option>`
  ).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  db = await window.api.getDB();
  renderProjectName();
  try { config = (await window.api.getConfig()) || config; } catch (e) {}
  fitRules = null;
  try { fitRules = await window.api.getFitRules(); } catch (e) {}
  if (!fitRules || !fitRules.tags) {
    fitRules = (db && db.fitRules) ? db.fitRules : { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [] };
  }
  if (!fitRules.tags) fitRules.tags = {};
  if (!fitRules.tagsByName) fitRules.tagsByName = {};
  if (!fitRules.blacklist) fitRules.blacklist = [];
  if (!fitRules.blacklistByName) fitRules.blacklistByName = [];
  if (!fitRules.suppliers) fitRules.suppliers = {};
  if (!fitRules.suppliersByName) fitRules.suppliersByName = {};
  if (!fitRules.matBlacklist) fitRules.matBlacklist = [];
  if (!fitRules.matBlacklistByName) fitRules.matBlacklistByName = [];
  if (!fitRules.profBlacklist) fitRules.profBlacklist = [];
  if (!fitRules.profBlacklistByName) fitRules.profBlacklistByName = [];
  if (db) delete db.fitRules;
  try { appInfo = (await window.api.getAppInfo()) || appInfo; } catch (e) {}
  applyTheme();
  applyLanguage();
  ensureFitIds();
  applyFitRules();
  ensureTagOrder();
  bindSearch();
  bindFittingsEvents();
  bindSettingsEvents();
  if (db.materials && db.materials.length) selId = 0;
  renderAll();
});

async function renderProjectName() {
  const el = document.getElementById('project-name');
  if (!el) return;
  try {
    const name = await window.api.getProjectName();
    el.textContent = name || '';
  } catch (e) {
    el.textContent = '';
  }
}

async function startRenameProject() {
  const el = document.getElementById('project-name');
  if (!el) return;
  const current = el.textContent.trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'project-name-input';
  input.placeholder = t('project.rename.placeholder');
  input.value = current;
  el.replaceChildren(input);
  input.focus();
  input.select();
  el.classList.add('editing');
  input.style.width = Math.max(120, (current.length * 8) + 24) + 'px';

  const done = async () => {
    el.classList.remove('editing');
    const val = input.value.trim();
    if (val && val !== current) {
      const res = await window.api.renameProject(val);
      if (res && res.success) {
        renderProjectName();
      } else if (res && res.error === 'exists') {
        alert(t('project.rename.error.exists'));
        renderProjectName();
      } else {
        alert(t('project.rename.error.invalid'));
        renderProjectName();
      }
    } else {
      renderProjectName();
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
  input.addEventListener('blur', () => done());
}

function openProjectPicker() {
  const overlay = document.getElementById('project-picker-modal');
  const listEl = document.getElementById('project-list');
  overlay.classList.add('open');
  renderProjectPicker();
}

function closeProjectPicker() {
  const overlay = document.getElementById('project-picker-modal');
  overlay.classList.remove('open');
}

async function renderProjectPicker() {
  const listEl = document.getElementById('project-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  let items = [];
  try { items = await window.api.getProjects(); } catch (e) {}
  if (!items.length) {
    listEl.innerHTML = `<div class="project-empty">${escapeHtml(t('project.empty'))}</div>`;
    return;
  }
  items.forEach(p => {
    const row = document.createElement('div');
    row.className = 'project-item';
    row.innerHTML = `
      <span class="project-item-name">${escapeHtml(p.name)}</span>
      <span class="project-item-meta">${p.path ? escapeHtml(pathBasename(p.path)) : ''}</span>
    `;
    row.title = p.path || '';
    row.addEventListener('click', async () => {
      const res = await window.api.loadProject(p.path);
      if (!res.success) return;
      db = res.data;
      if (!db.fittings) db.fittings = [];
      if (!db.materials) db.materials = [];
      if (!db.profiles) db.profiles = [];
      ensureTagOrder();
      ensureFitIds();
      renderAll();
      renderProjectName();
      closeProjectPicker();
    });
    listEl.appendChild(row);
  });
}

function pathBasename(p) {
  const i = p.lastIndexOf('\\');
  return i > -1 ? p.substring(i + 1) : p;
}

function renderAll() {
  ensureTagOrder();
  ensureFitIds();
  renderSidebar();
  renderListTitle();
  if (selCat === 'fittings') {
    showFittingWorkspace();
    renderFittings();
  } else {
    showRegularDetail();
    renderList();
    renderDetail();
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
  const search = document.getElementById('search-input');
  if (search) search.placeholder = t('search.placeholder');
  renderAll();
}

// ============ SIDEBAR ============
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

  const statsEl = document.getElementById('sidebar-stats');
  const totalFitUnits = fit.reduce((s, f) => s + (f.count || 0), 0);
  const total = mats.length + prf.length + fit.length;
  statsEl.innerHTML = `
    <div class="stats-title">${t('stat.total')}</div>
    <div class="stats-total">${total}</div>
    <div class="stats-rows">
      <div class="stats-row"><span>${t('stat.materials')}</span><span class="stat-val">${mats.length}</span></div>
      <div class="stats-row"><span>${t('stat.profiles')}</span><span class="stat-val">${prf.length}</span></div>
      <div class="stats-row"><span>${t('stat.fittings')}</span><span class="stat-val">${totalFitUnits}</span></div>
    </div>
  `;
}

function switchCat(cat) {
  selCat = cat;
  selId = null;
  selTab = 'edges';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === cat));
  const search = document.getElementById('search-input');
  if (search) search.value = '';
  searchQuery = '';
  renderAll();
}

// ============ LIST (materials / profiles) ============
function renderListTitle() {
  const title = document.getElementById('list-title');
  if (!title) return;
  if (selCat === 'materials') title.textContent = t('tab.materials');
  else if (selCat === 'profiles') title.textContent = t('tab.profiles');
  else title.textContent = t('tab.fittings');
  const btnAdd = document.getElementById('btn-add');
  if (btnAdd) {
    if (selCat === 'materials') btnAdd.textContent = t('mat.add');
    else if (selCat === 'profiles') btnAdd.textContent = t('prof.add');
    else btnAdd.textContent = t('fit.add');
  }
}

function bindSearch() {
  const search = document.getElementById('search-input');
  if (search) search.addEventListener('input', () => {
    searchQuery = search.value.trim().toLowerCase();
    if (selCat === 'fittings') renderFittings(); else renderList();
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
  const nameLower = (m.name || '').toLowerCase();
  const matchCode = q && code.indexOf(q) !== -1;
  return `
    <div class="list-card ${i === selId ? 'selected' : ''}" onclick="selectMat(${i})">
      <div class="lc-thickness">${thickness} мм</div>
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
  const code = (p.code || '').toLowerCase();
  const nameLower = (p.material || p.name || '').toLowerCase();
  const matchCode = q && code.indexOf(q) !== -1;
  return `
    <div class="list-card ${i === selId ? 'selected' : ''}" onclick="selectProf(${i})">
      <div class="lc-name">${nameHtml}</div>
      <div class="lc-sub">${details.length} ${t('profiles.sizes').toLowerCase()}</div>
      <div class="lc-meta">
        <span>${t('detail.article')}: <b>${matchCode ? highlight(p.code || '', q) : escapeHtml(p.code || '—')}</b></span>
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
  const body = document.getElementById('list-body');
  if (!body) return;
  if (selCat === 'materials') {
    const mats = db.materials || [];
    const list = mats
      .map((m, i) => ({ m, i }))
      .filter(({ m, i }) => {
        if (!searchQuery) return true;
        const c = ((m.code || '') + ' ' + (m.name || '')).toLowerCase();
        return c.indexOf(searchQuery) !== -1;
      });
    body.innerHTML = list.length
      ? list.map(({ m, i }) => matCardHTML(m, i)).join('')
      : (mats.length ? `<div class="list-noresults">${t('empty.noresults')}</div>` : `<div class="list-empty">${t('empty.list')}</div>`);
  } else {
    const prf = db.profiles || [];
    const list = prf
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        if (!searchQuery) return true;
        const c = ((p.code || '') + ' ' + (p.material || p.name || '')).toLowerCase();
        return c.indexOf(searchQuery) !== -1;
      });
    body.innerHTML = list.length
      ? list.map(({ p, i }) => profCardHTML(p, i)).join('')
      : (prf.length ? `<div class="list-noresults">${t('empty.noresults')}</div>` : `<div class="list-empty">${t('empty.list')}</div>`);
  }
}

function highlight(text, q) {
  const esc = escapeHtml(text);
  if (!q) return esc;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return esc;
  const safe = escapeHtml(text.slice(idx, idx + q.length));
  return escapeHtml(text.slice(0, idx)) + '<b style="color:var(--accent)">' + safe + '</b>' + escapeHtml(text.slice(idx + q.length));
}

function selectMat(i) {
  selId = i;
  selTab = 'edges';
  renderList();
  renderDetail();
}

function selectProf(i) {
  selId = i;
  selTab = 'sizes';
  renderList();
  renderDetail();
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
        <button class="btn btn-secondary" onclick="${sel.onExcel}">${t('export')}</button>
      </div>
    </div>
    <div class="dh-sub">${sub}</div>
  `;
}

function renderDetail() {
  const header = document.getElementById('detail-header');
  const tabs = document.getElementById('detail-tabs');
  const content = document.getElementById('detail-content');
  const stats = document.getElementById('detail-stats');
  const fitDetail = document.getElementById('fittings-detail');
  if (fitDetail) fitDetail.style.display = 'none';

  if (selCat === 'materials') renderMatDetail(header, tabs, content, stats);
  else if (selCat === 'profiles') renderProfDetail(header, tabs, content, stats);
}

function renderMatDetail(header, tabs, content, stats) {
  const mats = db.materials || [];
  const m = selId != null ? mats[selId] : mats[0];
  if (!m) {
    header.innerHTML = '';
    tabs.innerHTML = '';
    content.innerHTML = `<div class="list-empty">${t('empty.list')}</div>`;
    if (stats) stats.innerHTML = '';
    return;
  }
  const thickness = Math.round(m.thickness) === m.thickness ? m.thickness : m.thickness.toFixed(1);
  const edgeCount = (m.edges || []).length;
  const detCount = (m.details || []).length;

  header.innerHTML = detailHeader({
    title: m.name || '',
    exported: isExported(m),
    onExport: `saveMatExport(${selId != null ? selId : '0'}, this.checked)`,
    onExcel: 'exportExcel()',
    sub: [
      { label: t('detail.article') + ':', value: fmtCode(m.code) },
      { label: t('detail.count') + ':', value: m.count || 0 }
    ]
  }, 'badge-material', `${thickness} мм`);

  tabs.innerHTML = `
    <div class="dtab ${selTab === 'edges' ? 'active' : ''}" onclick="setMatTab('edges')">${t('tab.edges')}</div>
    <div class="dtab ${selTab === 'details' ? 'active' : ''}" onclick="setMatTab('details')">${t('tab.details', { n: detCount })}</div>
    <div class="dtab ${selTab === 'info' ? 'active' : ''}" onclick="setMatTab('info')">${t('tab.info')}</div>
  `;

  if (selTab === 'info') {
    const cutTotal = (m.details || []).reduce((s, d) => s + (d.cuts || []).length, 0);
    content.innerHTML = `
      <div class="info-grid">
        ${infoItem(t('detail.article'), fmtCode(m.code))}
        ${infoItem(t('stat.thickness'), thickness + ' мм')}
        ${infoItem(t('detail.count'), m.count || 0)}
        ${infoItem(t('stat.edges'), edgeCount)}
        ${infoItem(t('stat.cut'), cutTotal)}
      </div>
    `;
  } else {
    const edgesBlock = (m.edges && m.edges.length) ? `
      <div class="edge-block">
        <div class="block-title">${t('edge.title')}</div>
        ${m.edges.map(e => `
          <div class="edge-row"><span class="edge-name">${escapeHtml(e.name)}</span><span class="edge-dim">${e.thickness} мм · арт. ${fmtCode(e.code)}</span></div>
        `).join('')}
      </div>` : `<div class="edge-none">${t('edge.none')}</div>`;

    const grouped = groupByPosition(m.details);
    const detailsBlock = `
      <div class="block-title">${t('detail.parts')} (${detCount})</div>
      <div class="dparts">
        ${grouped.map(d => {
          const cuts = detailCuts(d);
          const posHtml = d.position ? `<span class="dpart-pos">${escapeHtml(d.position)}</span>` : '';
          const countHtml = (d.count || 1) > 1 ? `<span class="dpart-count">×${d.count}</span>` : '';
          const cutHtml = cuts ? ` · <span style="color:var(--orange)">${escapeHtml(cuts.text)}</span>` : '';
          return `<div class="dpart-row"><span class="dpart-name">${posHtml}${countHtml}${escapeHtml(d.name)}${cutHtml}</span><span class="dpart-dim">${d.width}×${d.height} мм</span></div>`;
        }).join('')}
      </div>`;

    if (selTab === 'edges') {
      content.innerHTML = edgesBlock + `<div class="separator"></div>` + detailsBlock;
    } else {
      content.innerHTML = detailsBlock;
    }
  }

  stats.innerHTML = `
    <div class="dstat"><span class="ds-label">${t('stat.details')}</span><span class="ds-value">${m.count || 0}</span></div>
    <div class="dstat"><span class="ds-label">${t('stat.edges')}</span><span class="ds-value">${edgeCount}</span></div>
    <div class="dstat"><span class="ds-label">${t('stat.thickness')}</span><span class="ds-value">${thickness} ММ</span></div>
    <div class="dstat"><span class="ds-label">${t('stat.inreport')}</span><span class="ds-value ${isExported(m) ? 'green' : ''}">${isExported(m) ? '☑' : '☐'}</span></div>
  `;
}

function setMatTab(tab) {
  selTab = tab;
  renderDetail();
}

function infoItem(label, value) {
  return `<div class="info-item"><div class="info-label">${escapeHtml(label)}</div><div class="info-value">${value}</div></div>`;
}

function renderProfDetail(header, tabs, content, stats) {
  const prf = db.profiles || [];
  const p = selId != null ? prf[selId] : prf[0];
  if (!p) {
    header.innerHTML = '';
    tabs.innerHTML = '';
    content.innerHTML = `<div class="list-empty">${t('empty.list')}</div>`;
    if (stats) stats.innerHTML = '';
    return;
  }
  const details = (p.details && p.details.length) ? p.details : [{ length: p.length, count: p.count }];
  const total = details.reduce((s, d) => s + (d.count || 0), 0);

  header.innerHTML = detailHeader({
    title: p.material || p.name || '',
    exported: isExported(p),
    onExport: `saveProfExport(${selId != null ? selId : '0'}, this.checked)`,
    onExcel: 'exportExcel()',
    sub: [
      { label: t('detail.article') + ':', value: fmtCode(p.code) }
    ]
  }, 'badge-profile', `${total} ${t('pcs')}`);

  tabs.innerHTML = `
    <div class="dtab ${selTab === 'sizes' ? 'active' : ''}" onclick="setProfTab('sizes')">${t('tab.sizes', { n: details.length })}</div>
    <div class="dtab ${selTab === 'info' ? 'active' : ''}" onclick="setProfTab('info')">${t('tab.info')}</div>
  `;

  if (selTab === 'info') {
    content.innerHTML = `
      <div class="info-grid">
        ${infoItem(t('detail.article'), fmtCode(p.code))}
        ${infoItem(t('stat.material'), escapeHtml(p.material || p.name || ''))}
        ${infoItem(t('detail.count'), total)}
        ${infoItem(t('stat.sizes'), details.length)}
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="block-title">${t('profiles.sizes')} (${details.length})</div>
      ${details.map(d => {
        const pos = uniqPositions(d);
        return `<div class="p-size-row">
          <span>${pos.length ? `<span class="p-size-pos">${escapeHtml(pos.join(', '))}</span>` : ''}<span class="p-size-len">${d.length || '—'} мм</span></span>
          <span class="p-size-count">${d.count} ${t('pcs')}</span>
        </div>`;
      }).join('') || `<div class="list-empty">${t('empty.list')}</div>`}
    `;
  }

  stats.innerHTML = `
    <div class="dstat"><span class="ds-label">${t('detail.count')}</span><span class="ds-value">${total}</span></div>
    <div class="dstat"><span class="ds-label">${t('stat.sizes')}</span><span class="ds-value accent">${details.length}</span></div>
  `;
}

function setProfTab(tab) {
  selTab = tab;
  renderDetail();
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
  return result;
}

// ============ FITTINGS: multi-select, drag&drop, tags ============
let selectedFitIds = new Set();
let marqueeEl = null;
let marqueeActive = false;
let mx0 = 0, my0 = 0;
let suppressNextClick = false;
let fwAddTagDefault = 'Загальна фурнітура';
let fwEditingId = null;

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
  return `
    <div class="fw-column" data-tag="${escapeAttr(tag)}">
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
  const current = fwShownCount[tag] != null ? fwShownCount[tag] : Math.min(total, FW_PAGE);
  fwShownCount[tag] = Math.min(total, current + FW_PAGE);
  renderFittings();
}

function sortFittings(field) {
  const sortDir = sortFittingsDir && sortFittingsDir[field] === 'asc' ? 'desc' : 'asc';
  if (!sortFittingsDir) sortFittingsDir = {};
  sortFittingsDir[field] = sortDir;
  const list = db.fittings || [];
  list.sort((a, b) => {
    let va = a[field], vb = b[field];
    if (field === 'count') { va = a.count || 0; vb = b.count || 0; return sortDir === 'asc' ? va - vb : vb - va; }
    va = String(va || '').toLowerCase();
    vb = String(vb || '').toLowerCase();
    const cmp = va < vb ? -1 : (va > vb ? 1 : 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  saveDB();
}
let sortFittingsDir = null;

function saveFwChanges() {
  saveDB();
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
      f.name = name;
      f.code = code;
      f.count = count;
      f.tag = tag;
      f.supplier = supplier;
      if (f.code) fitRules.tags[f.code] = tag;
      if (f.name) fitRules.tagsByName[f.name] = tag;
      saveFitRules();
    }
    fwEditingId = null;
  } else {
    if (!db.fittings) db.fittings = [];
    db.fittings.push({ id: db.fitIdCounter++, name, code, count, tag, supplier });
    fwAddTagDefault = tag;
  }
  if (nameEl) nameEl.value = '';
  if (codeEl) codeEl.value = '';
  if (countEl) countEl.value = '1';
  if (supEl) supEl.value = '';
  updateFwFormTitle();
  ensureTagOrder();
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

function fittingsMouseDown(e) {
  if (e.button !== 0) return;
  if (e.target.closest('input, select, button, .fw-check')) return;
  const row = e.target.closest('.fw-card');
  if (row) {
    const id = parseInt(row.dataset.id, 10);
    if (e.ctrlKey || e.metaKey) {
      if (selectedFitIds.has(id)) selectedFitIds.delete(id); else selectedFitIds.add(id);
    } else if (!selectedFitIds.has(id)) {
      selectedFitIds = new Set([id]);
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
      if (f.code) fitRules.tags[f.code] = tag;
      if (f.name) fitRules.tagsByName[f.name] = tag;
    }
  });
  saveFitRules();

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
  saveFitRules();
  saveDB();
}

function saveFitExport(id, checked) {
  const f = fitById(id);
  if (!f) return;
  f.export = checked;
  toggleBlacklist(fitRules.blacklist, fitRules.blacklistByName || [], f, checked);
  saveFitRules();
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
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  const matBl = fitRules.matBlacklist || [];
  const matBlByName = fitRules.matBlacklistByName || [];
  const profBl = fitRules.profBlacklist || [];
  const profBlByName = fitRules.profBlacklistByName || [];
  (db.fittings || []).forEach(f => {
    if (f.code && tags[f.code]) f.tag = tags[f.code];
    else if (f.name && tagsByName[f.name]) f.tag = tagsByName[f.name];
    if (f.code && suppliers[f.code]) f.supplier = suppliers[f.code];
    else if (f.name && suppliersByName[f.name]) f.supplier = suppliersByName[f.name];
    const inBl = (f.code && bl.indexOf(f.code) !== -1) || (f.name && blByName.indexOf(f.name) !== -1) || (f.name && bl.indexOf(f.name) !== -1);
    if (inBl) f.export = false;
  });
  (db.materials || []).forEach(m => {
    const inBl = (m.code && matBl.indexOf(m.code) !== -1) || (m.name && matBlByName.indexOf(m.name) !== -1) || (m.name && matBl.indexOf(m.name) !== -1);
    if (inBl) m.export = false;
  });
  (db.profiles || []).forEach(p => {
    if (p.code && suppliers[p.code]) p.supplier = suppliers[p.code];
    else if (p.name && suppliersByName[p.name]) p.supplier = suppliersByName[p.name];
    const inBl = (p.code && profBl.indexOf(p.code) !== -1) || (p.name && profBlByName.indexOf(p.name) !== -1) || (p.name && profBl.indexOf(p.name) !== -1);
    if (inBl) p.export = false;
  });
}

function saveFitRules() {
  db.fitRules = fitRules;
}

function saveFitName(id, value) {
  const f = fitById(id);
  if (!f) return;
  f.name = value.trim();
  saveDB();
}

function saveFitTag(id, value) {
  const f = fitById(id);
  if (!f) return;
  f.tag = value;
  if (f.code) fitRules.tags[f.code] = value;
  if (f.name) fitRules.tagsByName[f.name] = value;
  ensureTagOrder();
  saveFitRules();
  saveDB();
}

function saveFitCode(id, value) {
  const f = fitById(id);
  if (!f) return;
  f.code = value.trim();
  saveDB();
}

function saveFitCount(id, value) {
  const f = fitById(id);
  if (!f) return;
  const n = parseInt(value, 10);
  if (!n || n < 1) { renderFittings(); return; }
  f.count = n;
  saveDB();
}

function saveFitSupplier(id, value) {
  const f = fitById(id);
  if (!f) return;
  f.supplier = value || '';
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  if (f.supplier) {
    if (f.code) suppliers[f.code] = f.supplier;
    if (f.name) suppliersByName[f.name] = f.supplier;
  } else {
    if (f.code) delete suppliers[f.code];
    if (f.name) delete suppliersByName[f.name];
  }
  saveFitRules();
  saveDB();
}

function saveProfileSupplier(i, value) {
  const p = db.profiles[i];
  if (!p) return;
  p.supplier = value || '';
  const suppliers = fitRules.suppliers || {};
  const suppliersByName = fitRules.suppliersByName || {};
  if (p.supplier) {
    if (p.code) suppliers[p.code] = p.supplier;
    if (p.name) suppliersByName[p.name] = p.supplier;
  } else {
    if (p.code) delete suppliers[p.code];
    if (p.name) delete suppliersByName[p.name];
  }
  saveFitRules();
  saveDB();
}

function saveDB() {
  ensureTagOrder();
  const toSave = Object.assign({}, db, { fitRules: fitRules });
  window.api.saveDB(toSave).then(res => {
    if (!(res && res.success)) alert(t('alert.save.fail'));
    else renderAll();
  });
}

function deleteFitting(id) {
  const f = fitById(id);
  if (!f) return;
  if (!confirm(t('confirm.delete.pos'))) return;
  db.fittings.splice(db.fittings.indexOf(f), 1);
  saveDB();
}

function deleteSelectedFittings() {
  if (!selectedFitIds.size) return;
  const ids = [...selectedFitIds];
  if (!confirm(t('confirm.delete.selected', { n: ids.length }))) return;
  (db.fittings || []).forEach(f => selectedFitIds.delete(f.id));
  db.fittings = (db.fittings || []).filter(f => !ids.includes(f.id));
  selectedFitIds.clear();
  updateRowSelection();
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
  saveFitRules();
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
async function openProject() {
  openProjectPicker();
}

async function saveProject() {
  const res = await window.api.saveProject(db);
  if (res.success) {
    const name = await window.api.getProjectName();
    alert(t('project.saved', { name: name || 'order' }));
    renderProjectName();
  } else {
    alert(t('alert.saveProject.fail'));
  }
}

async function exportExcel() {
  const result = await window.api.exportXLSX();
  if (result.success) alert(t('export.saved', { path: result.path }));
  else if (result.error) alert(t('alert.export.error', { error: result.error }));
}

function windowMinimize() {
  window.api.windowMinimize();
}

function windowMaximize() {
  window.api.windowMaximize();
}

function windowClose() {
  window.api.windowClose();
}

// ============ SAVE EXPORT TOGGLES ============
function saveMatExport(i, checked) {
  const m = db.materials[i];
  if (!m) return;
  m.export = checked;
  toggleBlacklist(fitRules.matBlacklist, fitRules.matBlacklistByName || [], m, checked);
  saveFitRules();
  saveDB();
}

function saveProfExport(i, checked) {
  const p = db.profiles[i];
  if (!p) return;
  p.export = checked;
  toggleBlacklist(fitRules.profBlacklist, fitRules.profBlacklistByName || [], p, checked);
  saveFitRules();
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

  const projName = document.getElementById('project-name');
  if (projName) {
    projName.title = t('project.hint');
    projName.addEventListener('click', startRenameProject);
  }
  const picker = document.getElementById('project-picker-modal');
  if (picker) {
    picker.addEventListener('click', e => {
      if (e.target === picker) closeProjectPicker();
    });
    const pickerClose = document.getElementById('project-picker-close');
    if (pickerClose) pickerClose.addEventListener('click', closeProjectPicker);
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
