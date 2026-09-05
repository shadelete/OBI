const ExcelJS = require('exceljs');

// Style constants (matching reference spec file)
const FONT_TITLE = { name: 'Montserrat', size: 12, color: { argb: 'FFFFFFFF' }, charset: 204 };
const FONT_HEAD = { name: 'Montserrat Medium', size: 11, color: { theme: 1 }, charset: 204 };
const FONT_DATA = { name: 'Montserrat Light', size: 11, color: { theme: 1 }, charset: 204 };
const FILL_ORANGE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC64E24' } };
const FILL_PEACH = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6D2' } };
const BORDER = { style: 'thin', color: { argb: 'FF783C1E' } };

function exported(item) {
  return item.export !== false;
}

const LEGACY_TAGS = { 'Петли': 'Петлі', 'Направляющие': 'Напрямні', 'Метизная фурнитура': 'Метизна фурнітура', 'Общая фурнитура': 'Загальна фурнітура' };

function normTag(t) {
  return LEGACY_TAGS[t] || t;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cellValue(item, h) {
  let v = item[h];
  if (Array.isArray(v)) {
    return v.map(d => d.name ? `${d.name} (${d.width}x${d.height})` : JSON.stringify(d)).join('; ');
  }
  return (v ?? '').toString();
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

function cutsText(d) {
  const c = uniqueCuts(d && d.cuts);
  if (!c.length) return '';
  const parts = c.map(cu => cu.sign || cu.name).filter(Boolean);
  return parts.length ? parts.join('; ') : `${c.length} паз`;
}

// ---- CSV/JSON export (unchanged logic) ----
function exportSection(rows, title, items) {
  if (!items || items.length === 0) return;
  rows.push('');
  rows.push(`### ${title}`);
  if (title === 'Материалы (с кромкой)') {
    rows.push('Название;Артикул;Толщина,мм;Кол-во деталей;Кромка (название (Шмм) арт.);Детали (название (ШxВ))');
    for (const item of items) {
      const edges = (item.edges || []).map(e =>
        `${e.name} (${e.width || 0}мм)${e.code ? ' арт.' + e.code : ''}`
      ).join(', ');
      const details = (item.details || []).map(d => {
        const c = cutsText(d);
        return `${d.name} (${d.width}x${d.height})${c ? ` [${c}]` : ''}`;
      }).join('; ');
      rows.push(`${item.name};${item.code || ''};${item.thickness};${item.count};${edges};${details}`);
    }
  } else if (title === 'Профили') {
    rows.push('Название;Артикул;Материал;Ширина,мм;Толщина,мм;Длина,мм;Кол-во');
    for (const item of items) {
      const details = (item.details && item.details.length) ? item.details : [{ width: item.width, thickness: item.thickness, length: item.length, count: item.count }];
      for (const d of details) {
        rows.push(`${item.name};${item.code || ''};${item.material || ''};${d.width || ''};${d.thickness || ''};${d.length || ''};${d.count || ''}`);
      }
    }
  } else if (title === 'Фурнитура') {
    rows.push('Название;Артикул;Поставщик;Кол-во');
    for (const item of items) {
      rows.push(`${item.name};${item.code || ''};${item.supplier || ''};${item.count}`);
    }
  } else {
    const headers = Object.keys(items[0]);
    rows.push(headers.join(';'));
    for (const item of items) {
      rows.push(headers.map(h => cellValue(item, h)).join(';'));
    }
  }
}

function exportToJSON(data, format = 'json') {
  if (format === 'json') return JSON.stringify(data, null, 2);
  if (format === 'csv') {
    const rows = [];
    exportSection(rows, 'Материалы (с кромкой)', (data.materials || []).filter(exported));
    exportSection(rows, 'Профили', (data.profiles || []).filter(exported));
    exportSection(rows, 'Фурнитура', (data.fittings || []).filter(exported));
    return rows.join('\n');
  }
  return '';
}

// ---- Shared XLSX helpers ----
function solid(cell, fill) { cell.fill = fill; }
function hdr(cell) { cell.font = FONT_HEAD; cell.alignment = { horizontal: 'center', vertical: 'middle' }; }
function dataCell(cell, align) { cell.font = FONT_DATA; cell.border = { left: BORDER, right: BORDER, top: BORDER, bottom: BORDER }; cell.alignment = { horizontal: align || 'center' }; }

function cellText(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val.richText) return val.richText.map(r => r.text || '').join('');
    if (val.text != null) return String(val.text);
    if (val.result != null) return String(val.result);
    return '';
  }
  return String(val);
}

// Auto-fit column widths from non-merged cell contents, keeping the preset
// width as a minimum so narrow columns don't collapse.
function autofitColumns(ws) {
  const need = {};
  ws.eachRow(row => {
    row.eachCell({ includeEmpty: false }, cell => {
      if (cell.isMerged) return;
      const col = cell.col;
      const text = cellText(cell.value).split('\n');
      let maxLine = 0;
      text.forEach(l => { maxLine = Math.max(maxLine, l.length); });
      if (!need[col]) need[col] = 0;
      need[col] = Math.max(need[col], maxLine);
    });
  });
  ws.columns.forEach((colDef, i) => {
    if (!need[i + 1]) return;
    const w = Math.min(90, Math.max(9, Math.ceil(need[i + 1] * 1.3 + 3)));
    colDef.width = Math.max(colDef.width || 9, w);
  });
}

// Title row: orange fill, merged across columns 1..nCols
function titleRow(ws, row, text, nCols, height) {
  ws.mergeCells(row, 1, row, nCols);
  const c = ws.getCell(row, 1);
  c.value = text;
  for (let cc = 1; cc <= nCols; cc++) {
    const cell = ws.getCell(row, cc);
    cell.font = FONT_TITLE;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = FILL_ORANGE;
    cell.border = { left: BORDER, right: BORDER, top: BORDER, bottom: BORDER };
  }
  ws.getRow(row).height = height || 26;
}

// Materials 2-row header:
//  Row r: "Поз." | "Найменування" | "К-сть" | "Готова деталь"(merged D:E) | "Паз"
//  Row r+1: (A,B,C merged vertical) | "Довжина" | "Ширина" | (F merged vertical "Паз")
function materialsHeader(ws, r) {
  ws.getCell(r, 1).value = 'Поз.';
  ws.getCell(r, 2).value = 'Найменування';
  ws.getCell(r, 3).value = 'К-сть';
  ws.getCell(r, 4).value = 'Готова деталь';
  ws.mergeCells(r, 1, r + 1, 1);
  ws.mergeCells(r, 2, r + 1, 2);
  ws.mergeCells(r, 3, r + 1, 3);
  ws.mergeCells(r, 4, r, 5);
  ws.mergeCells(r, 6, r + 1, 6);
  ws.getCell(r + 1, 4).value = 'Довжина';
  ws.getCell(r + 1, 5).value = 'Ширина';
  ws.getCell(r, 6).value = 'Паз';
  for (let row = r; row <= r + 1; row++) {
    for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(row, c);
      hdr(cell);
      solid(cell, FILL_PEACH);
      cell.border = {
        left: BORDER, right: BORDER,
        top: BORDER,
        bottom: (row === r) ? undefined : ((c === 4 || c === 5 || c === 6) ? BORDER : undefined)
      };
    }
    ws.getRow(row).height = 15.75;
  }
}

// Row of material detail data
function materialDataRow(ws, r, poz, name, qty, width, height, cuts) {
  ws.getCell(r, 1).value = poz;
  ws.getCell(r, 2).value = name;
  ws.getCell(r, 3).value = qty;
  ws.getCell(r, 4).value = width;
  ws.getCell(r, 5).value = height;
  ws.getCell(r, 6).value = cuts;
  for (let c = 1; c <= 6; c++) {
    const cell = ws.getCell(r, c);
    dataCell(cell, c === 2 ? 'left' : 'center');
  }
  ws.getRow(r).height = 15.75;
}

// Group material details by position, keeping a count. Details without a
// position are kept separate (count 1 each).
function groupByPosition(details) {
  const result = [];
  const map = {};
  details.forEach(d => {
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

function profilesHeader(ws, r) {
  ['Поз.', 'Найменування', 'К-сть', 'Довжина, мм'].forEach((lab, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = lab;
    hdr(cell);
    solid(cell, FILL_PEACH);
    cell.border = { left: BORDER, right: BORDER, top: BORDER, bottom: BORDER };
  });
  ws.getRow(r).height = 18;
}

function profileDataRow(ws, r, poz, name, qty, length) {
  ws.getCell(r, 1).value = poz;
  ws.getCell(r, 2).value = name;
  ws.getCell(r, 3).value = qty;
  ws.getCell(r, 4).value = length;
  for (let c = 1; c <= 4; c++) {
    const cell = ws.getCell(r, c);
    dataCell(cell, c === 2 ? 'left' : 'center');
  }
  ws.getRow(r).height = 15.75;
}

function materialsSheet(wb, materials) {
  const ws = wb.addWorksheet('Матеріали');
  ws.columns = [
    { width: 7.7 }, { width: 28.7 }, { width: 8.7 }, { width: 10.7 }, { width: 10.7 }, { width: 20.7 }
  ];
  let row = 1;
  const list = (materials || []).filter(exported);
  list.forEach((m, i) => {
    titleRow(ws, row, m.name || 'Матеріал', 6);
    materialsHeader(ws, row + 1);
    const details = groupByPosition(m.details || []);
    let poz = 1;
    details.forEach(d => {
      materialDataRow(ws, row + 3 + (poz - 1), d.position || poz, d.name, d.count || 1, d.width, d.height, cutsText(d));
      poz++;
    });
    row = row + 3 + details.length + (i < list.length - 1 ? 1 : 0);
  });
  return ws;
}

function profilesSheet(wb, profiles) {
  const ws = wb.addWorksheet('Профілі');
  ws.columns = [
    { width: 7.7 }, { width: 28.7 }, { width: 8.7 }, { width: 10.7 }
  ];
  let row = 1;
  const list = (profiles || []).filter(exported);
  list.forEach((p, i) => {
    titleRow(ws, row, p.material || p.name || 'Профіль', 4);
    profilesHeader(ws, row + 1);
    const details = (p.details && p.details.length) ? p.details : [{ width: p.width, thickness: p.thickness, length: p.length, count: p.count }];
    let poz = 1;
    details.forEach(d => {
      const posArr = (d.positions || []).filter((v, i) => d.positions.indexOf(v) === i);
      const profilPos = posArr.length ? posArr.join(', ') : (poz || '');
      profileDataRow(ws, row + 2 + (poz - 1), profilPos, p.name, d.count || 0, d.length || '');
      poz++;
    });
    row = row + 2 + details.length + (i < list.length - 1 ? 1 : 0);
  });
  return ws;
}

function fittingsSheet(wb, fittings, tagOrder) {
  const ws = wb.addWorksheet('Фурнітура');
  ws.columns = [
    { width: 7.7 }, { width: 28.7 }, { width: 16.7 }, { width: 14.7 }, { width: 10.7 }
  ];
  const groups = {};
  const list = (fittings || []).filter(exported);
  list.forEach(f => {
    const tag = normTag(f.tag || 'Загальна фурнітура');
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(f);
  });
  // Order: as in the interface (tagOrder), then any remaining tags alphabetically
  const order = (tagOrder && Array.isArray(tagOrder) ? tagOrder.map(normTag) : []);
  const orderedTags = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 && ib === -1) ? 0 : (ia === -1 ? 1 : (ib === -1 ? -1 : ia - ib));
  });

  let row = 1;
  orderedTags.forEach(tag => {
    // Tag section title (as in interface, no caps), bordered like other sheets
    titleRow(ws, row, tag, 5);
    row++;
    // Header, same style as materials/profiles
    ['Поз.', 'Найменування', 'Артикул', 'Постачальник', 'К-сть'].forEach((lab, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = lab;
      hdr(cell);
      solid(cell, FILL_PEACH);
      cell.border = { left: BORDER, right: BORDER, top: BORDER, bottom: BORDER };
    });
    ws.getRow(row).height = 18;
    row++;
    // Rows
    groups[tag].forEach((f, i) => {
      ws.getCell(row, 1).value = i + 1;
      ws.getCell(row, 2).value = f.name;
      ws.getCell(row, 3).value = f.code || '';
      ws.getCell(row, 4).value = f.supplier || '';
      ws.getCell(row, 5).value = f.count;
      for (let c = 1; c <= 5; c++) {
        const cell = ws.getCell(row, c);
        dataCell(cell, c === 2 ? 'left' : 'center');
      }
      ws.getRow(row).height = 15.75;
      row++;
    });
    row++; // blank row between tag groups
  });
  return ws;
}

// ---- PDF (HTML report rendered via Chromium printToPDF) ----
// One table per group (material / profile / tag). A group that does not fit
// (<25% of it fits) is moved entirely to the next page: main.js measures the
// print layout and adds the .split class (break-before: page) to such groups.
// Columns align across groups via table-layout: fixed plus identical
// percentage colgroups per section.
const PDF_CSS = `
  body { font-family: Arial, 'Segoe UI', sans-serif; color: #2b3440; margin: 0; font-size: 12px; }
  h1 { margin: 0 0 2px; font-size: 20px; }
  .meta { color: #8a94a6; font-size: 11px; margin-bottom: 10px; }
  .part { margin-top: 22px; }
  .part-title { background: #c64e24; color: #fff; font-weight: 700; font-size: 15px; padding: 5px 10px; border-radius: 3px; margin-bottom: 4px; }
  .gwrap { }
  .split { break-before: page; page-break-before: always; }
  table.grp { border-collapse: collapse; width: 100%; table-layout: fixed; }
  table.grp th, table.grp td { border: 1px solid #783c1e; padding: 3px 6px; overflow-wrap: anywhere; }
  table.grp .st-title th { background: #c64e24; color: #fff; font-weight: 700; font-size: 12.5px; text-align: left; }
  table.grp .st-head th { background: #ffe6d2; font-weight: 600; }
  th, td.l { text-align: left; } td.c, th.c { text-align: center; }
  tr { break-inside: avoid; page-break-inside: avoid; }
`;

const MAT_COLS = '<col style="width:7%"><col style="width:36%"><col style="width:8%"><col style="width:11%"><col style="width:11%"><col style="width:27%">';
const PROF_COLS = '<col style="width:12%"><col style="width:45%"><col style="width:10%"><col style="width:33%">';
const FIT_COLS = '<col style="width:8%"><col style="width:42%"><col style="width:22%"><col style="width:20%"><col style="width:8%">';

function materialPdfTable(m) {
  const details = groupByPosition(m.details || []);
  const rows = details.map((d, i) => `
    <tr>
      <td class="c">${esc(d.position || i + 1)}</td>
      <td class="l">${esc(d.name)}</td>
      <td class="c">${d.count || 1}</td>
      <td class="c">${d.width != null ? d.width : ''}</td>
      <td class="c">${d.height != null ? d.height : ''}</td>
      <td class="c">${esc(cutsText(d))}</td>
    </tr>`).join('');
  return `<div class="gwrap"><table class="grp"><colgroup>${MAT_COLS}</colgroup>
  <thead>
    <tr class="st-title"><th colspan="6">${esc(m.name)}</th></tr>
    <tr class="st-head"><th>Поз.</th><th>Найменування</th><th>К-сть</th><th>Довжина</th><th>Ширина</th><th>Паз</th></tr>
  </thead>
  <tbody>${rows}</tbody>
  </table></div>`;
}

function profilePdfTable(p) {
  const details = (p.details && p.details.length) ? p.details : [{ width: p.width, thickness: p.thickness, length: p.length, count: p.count, positions: [] }];
  const rows = details.map((d, i) => {
    const posArr = (d.positions || []).filter((v, j) => d.positions.indexOf(v) === j);
    const pos = posArr.length ? posArr.join(', ') : (i + 1);
    return `<tr><td class="c">${esc(pos)}</td><td class="l">${esc(p.name)}</td><td class="c">${d.count || 0}</td><td class="c">${d.length != null ? d.length : ''}</td></tr>`;
  }).join('');
  return `<div class="gwrap"><table class="grp"><colgroup>${PROF_COLS}</colgroup>
  <thead>
    <tr class="st-title"><th colspan="4">${esc(p.material || p.name || 'Профіль')}</th></tr>
    <tr class="st-head"><th>Поз.</th><th>Найменування</th><th>К-сть</th><th>Довжина, мм</th></tr>
  </thead>
  <tbody>${rows}</tbody>
  </table></div>`;
}

function fittingPdfTable(tag, items) {
  const rows = items.map((f, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="l">${esc(f.name)}</td>
      <td class="c">${esc(f.code || '')}</td>
      <td class="c">${esc(f.supplier || '')}</td>
      <td class="c">${f.count}</td>
    </tr>`).join('');
  return `<div class="gwrap"><table class="grp"><colgroup>${FIT_COLS}</colgroup>
  <thead>
    <tr class="st-title"><th colspan="5">${esc(tag)}</th></tr>
    <tr class="st-head"><th>Поз.</th><th>Найменування</th><th>Артикул</th><th>Постачальник</th><th>К-сть</th></tr>
  </thead>
  <tbody>${rows}</tbody>
  </table></div>`;
}

function buildPdfHtml(data) {
  const materials = (data.materials || []).filter(exported);
  const profiles = (data.profiles || []).filter(exported);
  const fittings = (data.fittings || []).filter(exported);

  const order = (data.tagOrder && Array.isArray(data.tagOrder) ? data.tagOrder.map(normTag) : []);
  const groups = {};
  fittings.forEach(f => {
    const tag = normTag(f.tag || 'Загальна фурнітура');
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(f);
  });
  const orderedTags = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 && ib === -1) ? 0 : (ia === -1 ? 1 : (ib === -1 ? -1 : ia - ib));
  });

  const parts = [];
  if (materials.length) {
    parts.push(`<div class="part"><div class="part-title">Матеріали</div>${materials.map(materialPdfTable).join('')}</div>`);
  }
  if (profiles.length) {
    parts.push(`<div class="part"><div class="part-title">Профілі</div>${profiles.map(profilePdfTable).join('')}</div>`);
  }
  if (orderedTags.length) {
    parts.push(`<div class="part"><div class="part-title">Фурнітура</div>${orderedTags.map(tag => fittingPdfTable(tag, groups[tag])).join('')}</div>`);
  }

  const d = new Date().toLocaleDateString('uk-UA');
  const docTitle = data.orderName || data.name || 'Output Bazis Info';
  return `<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8"><title>${esc(docTitle)}</title><style>${PDF_CSS}</style></head>
<body>
  <h1>${esc(docTitle)}</h1>
  <div class="meta">${esc(data.name || '')}${data.name && data.name !== docTitle ? ' · ' : ''}${d}</div>
  ${parts.join('')}
</body></html>`;
}

async function exportToXLSXBuffer(data) {
  const wb = new ExcelJS.Workbook();
  wb.title = 'Output Bazis Info';
  [materialsSheet(wb, data.materials), profilesSheet(wb, data.profiles), fittingsSheet(wb, data.fittings, data.tagOrder)].forEach(autofitColumns);
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = { exportToJSON, exportToXLSXBuffer, buildPdfHtml };
