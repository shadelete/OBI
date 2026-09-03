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
    rows.push('Название;Артикул;Кол-во');
    for (const item of items) {
      rows.push(`${item.name};${item.code || ''};${item.count}`);
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
    dataCell(cell, (c === 2 || c === 6) ? 'left' : 'center');
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
    { width: 7.7 }, { width: 28.7 }, { width: 16.7 }, { width: 10.7 }
  ];
  const LEGACY_TAGS = { 'Петли': 'Петлі', 'Направляющие': 'Напрямні', 'Метизная фурнитура': 'Метизна фурнітура', 'Общая фурнитура': 'Загальна фурнітура' };
  const norm = t => (LEGACY_TAGS[t] || t);
  const groups = {};
  const list = (fittings || []).filter(exported);
  list.forEach(f => {
    const tag = norm(f.tag || 'Загальна фурнітура');
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(f);
  });
  // Order: as in the interface (tagOrder), then any remaining tags alphabetically
  const order = (tagOrder && Array.isArray(tagOrder) ? tagOrder.map(norm) : []);
  const orderedTags = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 && ib === -1) ? 0 : (ia === -1 ? 1 : (ib === -1 ? -1 : ia - ib));
  });

  let row = 1;
  orderedTags.forEach(tag => {
    // Tag section title (as in interface, no caps), bordered like other sheets
    titleRow(ws, row, tag, 4);
    row++;
    // Header, same style as materials/profiles
    ['Поз.', 'Найменування', 'Артикул', 'К-сть'].forEach((lab, i) => {
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
      ws.getCell(row, 4).value = f.count;
      for (let c = 1; c <= 4; c++) {
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

async function exportToXLSXBuffer(data) {
  const wb = new ExcelJS.Workbook();
  wb.title = 'Output Bazis Info';
  materialsSheet(wb, data.materials);
  profilesSheet(wb, data.profiles);
  fittingsSheet(wb, data.fittings, data.tagOrder);
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = { exportToJSON, exportToXLSXBuffer };
