let db = null;

const DEFAULT_TAGS = ['Загальна фурнітура', 'Петлі', 'Напрямні', 'Метизна фурнітура'];
const LEGACY_TAGS = { 'Петли': 'Петлі', 'Направляющие': 'Напрямні', 'Метизная фурнитура': 'Метизна фурнітура', 'Общая фурнитура': 'Загальна фурнітура' };

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
  DEFAULT_TAGS.forEach(t => { if (order.indexOf(t) === -1) order.push(t); });
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
  ensureTagOrder();
  ensureFitIds();
  bindFittingsEvents();
  renderAll();
});

function renderAll() {
  ensureTagOrder();
  ensureFitIds();
  renderMaterials();
  renderProfiles();
  renderFittings();
  renderStats();
  updateCounts();
}

function renderStats() {
  const statsEl = document.getElementById('stats');
  const mats = db.materials || [];
  const prf = db.profiles || [];
  const fit = db.fittings || [];
  const totalParts = mats.reduce((s, m) => s + (m.count || 0), 0);
  const totalFit = fit.reduce((s, f) => s + (f.count || 0), 0);
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-value">${mats.length}</div><div class="stat-label">Матеріалів</div></div>
    <div class="stat-card"><div class="stat-value">${prf.length}</div><div class="stat-label">Профілів</div></div>
    <div class="stat-card"><div class="stat-value">${fit.length}</div><div class="stat-label">Позицій фурнітури</div></div>
    <div class="stat-card"><div class="stat-value">${totalFit}</div><div class="stat-label">Од. фурнітури</div></div>
  `;
}

function updateCounts() {
  document.getElementById('count-materials').textContent = (db.materials || []).length;
  document.getElementById('count-profiles').textContent = (db.profiles || []).length;
  document.getElementById('count-fittings').textContent = (db.fittings || []).length;
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
  if (tab === 'fittings') renderFittings();
}

function fmtCode(code) {
  return code ? code : '—';
}

function detailCuts(d) {
  const c = d.cuts || [];
  if (!c.length) return null;
  const labels = c.map(cu => cu.sign || cu.name).filter(Boolean);
  return {
    count: c.length,
    text: labels.length ? labels.join('; ') : 'Паз'
  };
}

function renderMaterials() {
  const list = document.getElementById('materials-list');
  const mats = db.materials || [];
  list.innerHTML = mats.map((m, idx) => {
    const thickness = Math.round(m.thickness) === m.thickness ? m.thickness : m.thickness.toFixed(1);
    const edges = (m.edges || []).map(e =>
      `<div class="edge-item">
        <span class="edge-name">${escapeHtml(e.name)}</span>
        <span class="edge-dim">${e.thickness} мм · арт. ${fmtCode(e.code)}</span>
      </div>`
    ).join('');
    const edgeBlock = (m.edges && m.edges.length)
      ? `<div class="edges-block"><div class="edges-title">Кромка:</div>${edges}</div>`
      : `<div class="edges-block"><div class="edges-title">Кромка:</div><div class="edge-item edge-none">Без кромки</div></div>`;
    const details = (m.details || []).map(d => {
      const cuts = detailCuts(d);
      const cutsHtml = cuts
        ? `<span class="detail-cuts" title="${escapeAttr(cuts.text)}">${escapeHtml(cuts.text)} <span class="detail-cuts-count">${cuts.count}</span></span>`
        : '';
      return `<div class="detail-row"><span class="detail-name">${escapeHtml(d.name)}</span>${cutsHtml}<span class="detail-dim">${d.width}×${d.height} мм</span></div>`;
    }).join('');
    const cutTotal = (m.details || []).reduce((s, d) => s + ((d.cuts || []).length), 0);
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-title material-title">${escapeHtml(m.name)}</span>
          <div class="card-badges">
            <span class="card-badge badge-material">${thickness} мм</span>
            ${cutTotal ? `<span class="card-badge badge-cut">${cutTotal} паз${cutTotal > 1 ? 'ів' : ''}</span>` : ''}
            <label class="exp-label" title="Включити в експорт">
              <input type="checkbox" class="exp-check" ${isExported(m) ? 'checked' : ''} onchange="saveMatExport(${idx}, this.checked)">
              <span>Експорт</span>
            </label>
          </div>
        </div>
        <div class="card-details">
          <div class="detail-item"><span class="detail-label">Артикул: </span><span class="detail-value">${fmtCode(m.code)}</span></div>
          <div class="detail-item"><span class="detail-label">Деталей: </span><span class="detail-value">${m.count}</span></div>
        </div>
        ${edgeBlock}
        ${details ? `<div class="parts-list"><div class="edges-title">Деталі (${m.count}):</div>${details}</div>` : ''}
      </div>
    `;
  }).join('');
}

function saveMatExport(idx, checked) {
  const m = db.materials[idx];
  if (!m) return;
  m.export = checked;
  saveDB();
}

function renderProfiles() {
  const list = document.getElementById('profiles-list');
  const prf = db.profiles || [];
  list.innerHTML = prf.map((p, idx) => {
    const details = (p.details && p.details.length)
      ? p.details
      : [{ width: p.width, thickness: p.thickness, length: p.length, count: p.count }];
    const total = details.reduce((s, d) => s + (d.count || 0), 0);
    const sizeRows = details.map(d =>
      `<div class="detail-row">
        <span>${d.width || '—'}×${d.thickness || '—'}×${d.length || '—'} мм</span>
        <span class="detail-count">${d.count} шт</span>
      </div>`
    ).join('');
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${escapeHtml(p.material || p.name)}</span>
          <div class="card-badges">
            <span class="card-badge badge-profile">${total} шт</span>
            <label class="exp-label" title="Включити в експорт">
              <input type="checkbox" class="exp-check" ${isExported(p) ? 'checked' : ''} onchange="saveProfExport(${idx}, this.checked)">
              <span>Експорт</span>
            </label>
          </div>
        </div>
        <div class="card-details">
          <div class="detail-item"><span class="detail-label">Артикул: </span><span class="detail-value">${fmtCode(p.code)}</span></div>
        </div>
        <div class="parts-list">
          <div class="edges-title">Розміри (${details.length}):</div>
          ${sizeRows}
        </div>
      </div>
    `;
  }).join('');
}

function saveProfExport(idx, checked) {
  const p = db.profiles[idx];
  if (!p) return;
  p.export = checked;
  saveDB();
}

// ---- Fittings: multi-select, drag&drop, tags ----
let selectedFitIds = new Set();
let marqueeEl = null;
let marqueeActive = false;
let mx0 = 0, my0 = 0;
let suppressNextClick = false;

function fitById(id) {
  return (db.fittings || []).find(f => f.id === id);
}

function fitRowHTML(f) {
  const sel = selectedFitIds.has(f.id) ? ' selected' : '';
  return `
    <div class="fit-row${sel}" draggable="true" data-id="${f.id}">
      <div class="fit-drag-handle" title="Перетягнути">⠿</div>
      <label class="exp-check-wrap" title="Включити в експорт">
        <input type="checkbox" class="exp-check" ${isExported(f) ? 'checked' : ''} onchange="saveFitExport(${f.id}, this.checked)">
      </label>
      <input class="fit-edit-name" value="${escapeAttr(f.name || '')}" placeholder="Найменування"
        onchange="saveFitName(${f.id}, this.value)">
      <select class="fit-tag" onchange="saveFitTag(${f.id}, this.value)" title="Категорія">
        ${tagOptions(f.tag)}
      </select>
      <div class="fit-editables">
        <input class="fit-edit-code" value="${escapeAttr(f.code || '')}" placeholder="Артикул"
          onchange="saveFitCode(${f.id}, this.value)">
        <input class="fit-edit-count" type="number" min="1" value="${f.count}"
          onchange="saveFitCount(${f.id}, this.value)">
      </div>
      <button class="btn btn-icon" onclick="deleteFitting(${f.id})" title="Видалити">✕</button>
    </div>
  `;
}

function renderFittings() {
  const container = document.getElementById('fittings-columns');
  const order = getTagOrder();
  const fit = db.fittings || [];
  const addTagSelect = document.getElementById('fit-tag');
  if (addTagSelect) addTagSelect.innerHTML = tagOptions('Загальна фурнітура', order);
  container.innerHTML = order.map(tag => {
    const items = fit.filter(f => normTag(f.tag) === tag);
    return `
      <div class="fit-column" data-tag="${escapeAttr(tag)}">
        <div class="fit-column-header" draggable="true">
          <span class="fit-tag-handle" title="Перетягнути, щоб змінити порядок тегу">≡</span>
          <span class="fit-column-title">${escapeHtml(tag)}</span>
          <span class="fit-column-count">${items.length}</span>
          <button class="btn btn-icon btn-tag-rename" data-tag="${escapeAttr(tag)}" title="Перейменувати тег">✎</button>
          <button class="btn btn-icon btn-tag-del" data-tag="${escapeAttr(tag)}" title="Видалити тег">✕</button>
        </div>
        <div class="fit-column-body">
          ${items.map(fitRowHTML).join('') || '<div class="fit-column-empty">Порожньо</div>'}
        </div>
      </div>
    `;
  }).join('');
  updateRowSelection();
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
    }
  });
  const newTagInput = document.getElementById('new-tag-input');
  if (newTagInput) {
    newTagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });
  }
}

function fittingsMouseDown(e) {
  if (e.button !== 0) return;
  if (e.target.closest('input, select, button')) return;
  const row = e.target.closest('.fit-row');
  if (row) {
    const id = parseInt(row.dataset.id, 10);
    if (e.ctrlKey || e.metaKey) {
      if (selectedFitIds.has(id)) selectedFitIds.delete(id); else selectedFitIds.add(id);
    } else if (!selectedFitIds.has(id)) {
      selectedFitIds = new Set([id]);
    }
    updateRowSelection();
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
  document.querySelectorAll('.fit-column .fit-row').forEach(r => {
    const rc = r.getBoundingClientRect();
    if (rc.right >= x0 && rc.left <= x1 && rc.bottom >= y0 && rc.top <= y1) {
      ids.push(parseInt(r.dataset.id, 10));
    }
  });
  selectedFitIds = new Set(ids);
  updateRowSelection();
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
  document.querySelectorAll('.fit-column .fit-row').forEach(r => {
    r.classList.toggle('selected', selectedFitIds.has(parseInt(r.dataset.id, 10)));
  });
}

function fittingsClick(e) {
  if (suppressNextClick) { suppressNextClick = false; return; }
  const delBtn = e.target.closest('.btn-tag-del');
  if (delBtn) { deleteTag(delBtn.getAttribute('data-tag')); return; }
  const renBtn = e.target.closest('.btn-tag-rename');
  if (renBtn) { startRenameTag(renBtn.getAttribute('data-tag')); return; }
  if (!e.target.closest('.fit-row')) {
    selectedFitIds.clear();
    updateRowSelection();
  }
}

function fittingsDragStart(e) {
  if (e.target.closest('input, select, button')) { e.preventDefault(); return; }
  cancelMarquee();
  const row = e.target.closest('.fit-row');
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
  const col = e.target.closest('.fit-column');
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
  const row = e.target.closest('.fit-row');
  if (row) row.classList.remove('dragging');
  const col = e.target.closest('.fit-column');
  if (col) col.classList.remove('drag-src');
  clearDropStyles();
}

function fittingsDragOver(e) {
  e.preventDefault();
  const col = e.target.closest('.fit-column');
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
  const col = e.target.closest('.fit-column');
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
  ids.forEach(id => {
    id = Number(id);
    const f = fitById(id);
    if (f) f.tag = tag;
  });
  selectedFitIds.clear();
  updateRowSelection();
  saveDB();
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
  document.querySelectorAll('.fit-column').forEach(c => c.classList.remove('drag-over'));
}

function startRenameTag(tag) {
  const container = document.getElementById('fittings-columns');
  const col = Array.from(container.querySelectorAll('.fit-column'))
    .find(c => c.getAttribute('data-tag') === tag);
  if (!col) return;
  const title = col.querySelector('.fit-column-title');
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
  if (order.indexOf(newTag) !== -1) { alert('Такий тег уже існує'); return; }
  db.tagOrder = order.map(t => (t === oldTag ? newTag : t));
  (db.fittings || []).forEach(f => { if (normTag(f.tag) === oldTag) f.tag = newTag; });
  saveDB();
}

function saveFitExport(id, checked) {
  const f = fitById(id);
  if (!f) return;
  f.export = checked;
  saveDB();
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
  ensureTagOrder();
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

function saveDB() {
  ensureTagOrder();
  window.api.saveDB(db).then(res => {
    if (!(res && res.success)) alert('Не вдалося зберегти зміни');
    else renderAll();
  });
}

function addFitting() {
  const nameEl = document.getElementById('fit-name');
  const codeEl = document.getElementById('fit-code');
  const countEl = document.getElementById('fit-count');
  const tagEl = document.getElementById('fit-tag');
  const name = nameEl.value.trim();
  const code = codeEl.value.trim();
  const count = parseInt(countEl.value, 10);
  if (!name) { alert('Введіть найменування'); return; }
  if (!count || count < 1) { alert('Введіть кількість'); return; }
  const tag = tagEl ? tagEl.value : 'Загальна фурнітура';
  if (!db.fittings) db.fittings = [];
  db.fittings.push({ id: db.fitIdCounter++, name: name, code: code, count: count, tag: tag });
  nameEl.value = '';
  codeEl.value = '';
  countEl.value = '';
  if (tagEl) tagEl.value = 'Загальна фурнітура';
  ensureTagOrder();
  saveDB();
}

function deleteFitting(id) {
  const f = fitById(id);
  if (!f) return;
  if (!confirm('Видалити позицію?')) return;
  db.fittings.splice(db.fittings.indexOf(f), 1);
  saveDB();
}

function addTag() {
  const input = document.getElementById('new-tag-input');
  const name = (input.value || '').trim();
  if (!name) { alert('Введіть назву тега'); return; }
  const order = getTagOrder();
  if (order.indexOf(name) !== -1) { alert('Такий тег уже існує'); return; }
  order.push(name);
  db.tagOrder = order;
  input.value = '';
  saveDB();
}

function deleteTag(tag) {
  const order = getTagOrder();
  if (DEFAULT_TAGS.indexOf(tag) !== -1) {
    alert('Стандартний тег не можна видалити');
    return;
  }
  if (!confirm(`Видалити тег "${tag}"? Фурнітура буде перенесена до "Загальна фурнітура".`)) return;
  (db.fittings || []).forEach(f => { if (normTag(f.tag) === tag) f.tag = 'Загальна фурнітура'; });
  db.tagOrder = order.filter(t => t !== tag);
  saveDB();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function openProject() {
  const res = await window.api.loadProject();
  if (res.canceled) return;
  if (!res.success) { alert('Не вдалося відкрити замовлення'); return; }
  db = res.data;
  if (!db.fittings) db.fittings = [];
  if (!db.materials) db.materials = [];
  if (!db.profiles) db.profiles = [];
  ensureTagOrder();
  ensureFitIds();
  saveDB();
}

async function saveProject() {
  const res = await window.api.saveProject(db);
  if (res.canceled) return;
  if (res.success) alert(`Замовлення збережено:\n${res.path}`);
  else alert('Не вдалося зберегти замовлення');
}

async function exportExcel() {
  const result = await window.api.exportXLSX();
  if (result.success) alert(`Експорт збережено:\n${result.path}`);
  else if (result.error) alert(`Помилка експорту:\n${result.error}`);
}

function windowMinimize() {
  window.api.windowMinimize();
}

function windowClose() {
  window.api.windowClose();
}
