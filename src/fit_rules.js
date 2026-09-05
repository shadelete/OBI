let data = null;
let currentTab = 'tags';

async function load() {
  try {
    data = await window.api.getFitRulesData();
  } catch (e) {
    data = { rules: { tags: {}, tagsByName: {}, blacklist: [], blacklistByName: [], suppliers: {}, suppliersByName: {}, matBlacklist: [], matBlacklistByName: [], profBlacklist: [], profBlacklistByName: [] }, fittings: [], materials: [], profiles: [], tagOrder: [] };
  }
  render();
}

function render() {
  if (currentTab === 'tags') renderTags();
  else if (currentTab === 'blacklist') renderBlacklist('fit');
  else if (currentTab === 'matbl') renderBlacklist('mat');
  else renderBlacklist('prof');
  document.getElementById('tab-tags').classList.toggle('active', currentTab === 'tags');
  document.getElementById('tab-blacklist').classList.toggle('active', currentTab === 'blacklist');
  document.getElementById('tab-matbl').classList.toggle('active', currentTab === 'matbl');
  document.getElementById('tab-profbl').classList.toggle('active', currentTab === 'profbl');
}

function renderTags() {
  const body = document.getElementById('fr-body');
  body.innerHTML = '';
  const rules = data.rules || {};
  const tags = rules.tags || {};
  const tagsByName = rules.tagsByName || {};
  const stableNames = {};

  const tagOrder = data.tagOrder || [];
  const tagSet = [];
  Object.keys(tags).forEach(code => { const t = tags[code]; if (tagSet.indexOf(t) === -1) tagSet.push(t); });
  Object.keys(tagsByName).forEach(name => { const t = tagsByName[name]; if (tagSet.indexOf(t) === -1) tagSet.push(t); });
  const allTags = tagOrder.concat(tagSet).filter((t, i, a) => a.indexOf(t) === i);

  if (!allTags.length) {
    body.innerHTML = `<div class="fr-empty">Ще немає збережених правил тегів</div>`;
    return;
  }

  allTags.forEach(tag => {
    const section = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'fr-group-title';
    title.textContent = tag;
    section.appendChild(title);

    const items = [];
    Object.keys(tags).forEach(code => {
      if (tags[code] === tag) {
        const f = (data.fittings || []).find(x => x.code === code);
        items.push({ name: f ? f.name : code, code, via: 'code' });
      }
    });
    Object.keys(tagsByName).forEach(name => {
      if (tagsByName[name] === tag && !items.some(it => it.code === name)) {
        const f = (data.fittings || []).find(x => x.name === name);
        items.push({ name: f ? f.name : name, code: '', via: 'name' });
      }
    });

    items.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'fr-item';
      row.innerHTML = `<span class="fr-item-name">${escapeHtml(it.name)}</span>` +
        (it.code ? `<span class="fr-item-code">${escapeHtml(it.code)}</span>` : '') +
        `<span class="fr-badge">${it.via === 'code' ? 'артикул' : 'імя'}</span>`;
      section.appendChild(row);
    });
    body.appendChild(section);
  });
}

function blacklistArrays(kind) {
  const rules = data.rules || {};
  if (kind === 'mat') return { byCode: rules.matBlacklist || [], byName: rules.matBlacklistByName || [], lookup: data.materials || [] };
  if (kind === 'prof') return { byCode: rules.profBlacklist || [], byName: rules.profBlacklistByName || [], lookup: data.profiles || [] };
  return { byCode: rules.blacklist || [], byName: rules.blacklistByName || [], lookup: data.fittings || [] };
}

function renderBlacklist(kind) {
  const body = document.getElementById('fr-body');
  body.innerHTML = '';
  const { byCode, byName, lookup } = blacklistArrays(kind);

  const items = [];
  byCode.forEach(code => {
    const f = lookup.find(x => x.code === code);
    items.push({ name: f ? f.name : code, key: code, byName: false });
  });
  byName.forEach(name => {
    if (!items.some(it => it.name === name)) {
      items.push({ name, key: name, byName: true });
    }
  });

  if (!items.length) {
    body.innerHTML = `<div class="fr-empty">Чорний список порожній</div>`;
    return;
  }

  items.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = 'fr-item';
    row.innerHTML = `<span class="fr-item-name">${escapeHtml(it.name)}</span>` +
      `<span class="fr-badge bl">не експортується</span>` +
      `<button class="fr-rem" title="Прибрати з чорного списку" onclick="removeItem('${kind}', '${escapeAttr(it.key)}', ${it.byName})">✕</button>`;
    body.appendChild(row);
  });
}

async function removeItem(kind, key, byName) {
  const rules = data.rules;
  const pair = kind === 'mat' ? ['matBlacklist', 'matBlacklistByName'] : (kind === 'prof' ? ['profBlacklist', 'profBlacklistByName'] : ['blacklist', 'blacklistByName']);
  const byCodeArr = rules[pair[0]] || [];
  const byNameArr = rules[pair[1]] || [];
  if (byName) {
    const idx = byNameArr.indexOf(key);
    if (idx !== -1) byNameArr.splice(idx, 1);
  } else {
    const idx = byCodeArr.indexOf(key);
    if (idx !== -1) byCodeArr.splice(idx, 1);
  }
  const db = await window.api.getDB();
  db.fitRules = rules;
  await window.api.saveDB(db);
  load();
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

document.getElementById('tab-tags').addEventListener('click', () => { currentTab = 'tags'; render(); });
document.getElementById('tab-blacklist').addEventListener('click', () => { currentTab = 'blacklist'; render(); });
document.getElementById('tab-matbl').addEventListener('click', () => { currentTab = 'matbl'; render(); });
document.getElementById('tab-profbl').addEventListener('click', () => { currentTab = 'profbl'; render(); });

load();
