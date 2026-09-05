const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function listZip(buf) {
  const out = [];
  let p = buf.length - 22;
  while (p > 0 && buf.readUInt32LE(p) !== 0x06054b50) p--;
  if (p < 0) throw new Error('bad zip: no EOCD');
  const dirOff = buf.readUInt32LE(p + 16);
  const dirCount = buf.readUInt16LE(p + 10);
  let o = dirOff;
  for (let i = 0; i < dirCount; i++) {
    if (buf.readUInt32LE(o) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(o + 28);
    const extraLen = buf.readUInt16LE(o + 30);
    const commentLen = buf.readUInt16LE(o + 32);
    const method = buf.readUInt16LE(o + 10);
    const compSize = buf.readUInt32LE(o + 20);
    const uncSize = buf.readUInt32LE(o + 24);
    const lho = buf.readUInt32LE(o + 42);
    const name = buf.toString('utf8', o + 46, o + 46 + nameLen);
    let data;
    if (compSize === 0 && uncSize === 0 && method === 0) {
      data = Buffer.alloc(0);
    } else {
      const flags = buf.readUInt16LE(lho + 6);
      const localComp = buf.readUInt32LE(lho + 18);
      const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
      const src = buf.slice(start, start + (compSize || localComp));
      data = (method === 0) ? src : zlib.inflateRawSync(src);
    }
    out.push({ name, method, data });
    o += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function buildZip(entries) {
  const chunks = [];
  const central = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const isDeflated = e.data.length > 0;
    const dataBuf = isDeflated ? zlib.deflateRawSync(e.data) : e.data;
    const crc = crc32(e.data);
    const method = isDeflated ? 8 : 0;
    const flags = 0x0800;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(flags, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(dataBuf.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    chunks.push(lh, nameBuf, dataBuf);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(flags, 8);
    c.writeUInt16LE(method, 10);
    c.writeUInt16LE(dosTime, 12);
    c.writeUInt16LE(dosDate, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(dataBuf.length, 20);
    c.writeUInt32LE(e.data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += lh.length + nameBuf.length + dataBuf.length;
  }

  const cdOffset = chunks.reduce((s, b) => s + b.length, 0);
  const cdDirs = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdDirs.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([Buffer.concat(chunks), cdDirs, eocd]);
}

function xmlEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function attrEsc(s) {
  return xmlEsc(s).replace(/"/g, '&quot;');
}
function colLetter(i) {
  let s = '';
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
function colNum(ref) {
  let n = 0;
  for (const ch of ref) { if (ch >= 'A' && ch <= 'Z') n = n * 26 + (ch.charCodeAt(0) - 64); else break; }
  return n - 1;
}
function cellRefRange(ref) {
  const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return { col1: 0, row1: 1, col2: 0, row2: 1 };
  return { col1: colNum(m[1]), row1: parseInt(m[2], 10), col2: colNum(m[3]), row2: parseInt(m[4], 10) };
}

const SHEET_KEYS = [
  { key: 'materials', sheet: 'Перелік файлів ВіЯр (project)', cols: ['A', 'B', 'C'] },
  { key: 'viyar', sheet: 'Специфікація ВіЯр', cols: ['A', 'B', 'C', 'D', 'E', 'F'] },
  { key: 'owwa', sheet: 'Специфікація БМ_OWWA', cols: ['A', 'B', 'C'] },
  { key: 'blum', sheet: 'Специфікація Blum', cols: ['A', 'B', 'C'] }
];

function supplierMatch(s, supplier) {
  return (s || '').toLowerCase() === supplier.toLowerCase();
}

function displayName(name, code) {
  const c = code == null ? '' : String(code).trim();
  if (c) return ((name == null ? '' : name) + ' (Артикул ' + c + ')').trim();
  return name == null ? '' : String(name);
}

function resolveRel(baseDir, target) {
  let parts = (baseDir ? baseDir + '/' : '') + (target || '');
  const segs = [];
  for (const s of parts.split('/')) {
    if (s === '..') segs.pop();
    else if (s !== '.' && s !== '') segs.push(s);
  }
  return segs.join('/');
}

function writeCalcWorkbook(file, db, roomName) {
  const raw = fs.readFileSync(file);
  const entries = listZip(raw);
  const byName = {};
  for (const e of entries) byName[e.name] = e.data;
  const getTxt = (name) => (byName[name] != null ? byName[name].toString('utf8') : null);

  const wbXml = getTxt('xl/workbook.xml');
  if (!wbXml) throw new Error('bad workbook');
  const wbRelsXml = getTxt('xl/_rels/workbook.xml.rels');
  const sheetFiles = {};
  const relRe = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  const relMap = {};
  let m;
  while ((m = relRe.exec(wbRelsXml)) !== null) relMap[m[1]] = m[2];
  const sheetRe = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g;
  while ((m = sheetRe.exec(wbXml)) !== null) {
    let t = relMap[m[2]];
    if (t) { while (t.charAt(0) === '/') t = t.substr(1); sheetFiles[m[1]] = 'xl/' + t; }
  }

  const sharedOld = getTxt('xl/sharedStrings.xml') || null;
  const sharedStrings = [];
  let existingCount = 0;
  if (sharedOld) {
    const sst = /<sst[^>]*>([\s\S]*)<\/sst>/.exec(sharedOld);
    if (sst) {
      const siRe = /<si>([\s\S]*?)<\/si>/g;
      let mm;
      while ((mm = siRe.exec(sst[1])) !== null) {
        const inner = mm[1];
        const t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        sharedStrings.push(t ? t[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '');
        existingCount++;
      }
    }
  }
  const siIndex = new Map();
  function intern(s) {
    s = String(s == null ? '' : s);
    const found = sharedStrings.indexOf(s);
    if (found !== -1) return found;
    if (siIndex.has(s)) return siIndex.get(s);
    sharedStrings.push(s);
    siIndex.set(s, sharedStrings.length - 1);
    return sharedStrings.length - 1;
  }
  function siXml(s) {
    return '<si><t>' + xmlEsc(s) + '</t></si>';
  }

  let appendedRows = 0;
  const result = [];
  for (const plan of SHEET_KEYS) {
    const sheetFile = sheetFiles[plan.sheet];
    if (!sheetFile) continue;
    const sheetXml = getTxt(sheetFile);
    if (!sheetXml) continue;

    const relsFile = sheetFile.replace(/^xl\/worksheets\/(.+?)\.xml$/, 'xl/worksheets/_rels/$1.xml.rels');
    let tableFile = null;
    const relsXml0 = getTxt(relsFile);
    if (relsXml0) {
      const tmap = {};
      const tre = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
      let mm;
      while ((mm = tre.exec(relsXml0)) !== null) tmap[mm[1]] = mm[2];
      const tpRe = /<tablePart[^>]*r:id="([^"]+)"/;
      const tp = tpRe.exec(sheetXml);
      if (tp) {
        tableFile = resolveRel(sheetFile.replace(/\/[^/]+$/, ''), tmap[tp[1]]);
      }
    }
    let tableXml = null;
    let tableRef = null;
    let formulaCol = null;
    let formulaCellXml = null;
    if (tableFile) {
      tableXml = getTxt(tableFile);
      if (tableXml) {
        const fr = /<table[^>]*\bref="([^"]+)"/.exec(tableXml);
        if (fr) tableRef = fr[1];
        const fmRe = /<calculatedColumnFormula>([\s\S]*?)<\/calculatedColumnFormula>/g;
        let fm;
        while ((fm = fmRe.exec(tableXml)) !== null) {
          const n = (tableXml.slice(0, fm.index).match(/<tableColumn /g) || []).length - 1;
          if (formulaCol == null || n > colNum(formulaCol)) { formulaCol = colLetter(n); formulaCellXml = fm[1]; }
        }
        if (plan.key !== 'viyar') { formulaCol = null; formulaCellXml = null; }
      }
    }

    const styles = {};
    const row2 = /<row r="2"[^>]*>([\s\S]*?)<\/row>/.exec(sheetXml);
    if (row2) {
      const cre = /<c r="([A-Z]+)2"([^>\/]*)(?:\/>|>[\s\S]*?<\/c>)/g;
      let mm;
      while ((mm = cre.exec(row2[1])) !== null) {
        const sAttr = /s="(\d+)"/.exec(mm[2]);
        styles[mm[1]] = sAttr ? parseInt(sAttr[1], 10) : 0;
      }
    }

    const range = tableRef ? cellRefRange(tableRef) : { col1: 0, row1: 1, col2: plan.cols.length - 1, row2: 2 };
    const startRow = range.row1 + 1;
    const lastRow = Math.max(range.row2, startRow - 1);

    let inputRows = [];
    if (plan.key === 'materials') {
      inputRows = (db.materials || []).filter(m => m.export !== false).map(mt => ({
        name: displayName(mt.name || '', mt.code), article: mt.code || '', qty: (mt.details || []).length, length: null
      }));
    } else if (plan.key === 'viyar') {
      const fits = (db.fittings || []).filter(f => f.export !== false && supplierMatch(f.supplier, 'Viyar')).map(f => ({ name: displayName(f.name, f.code), article: f.code || '', qty: f.count || 0, length: null }));
      const profs = (db.profiles || []).filter(p => p.export !== false && (!p.supplier || supplierMatch(p.supplier, 'Viyar')));
      profs.forEach(p => {
        const details = (p.details && p.details.length) ? p.details : [{ length: p.length, count: p.count }];
        details.forEach(d => inputRows.push({ name: displayName(p.name || p.material, p.code), article: p.code || '', qty: d.count || 0, length: d.length }));
      });
      inputRows = fits.concat(inputRows);
    } else {
      const supplier = (plan.key === 'owwa') ? 'Owwa' : 'Blum';
      const fits = (db.fittings || []).filter(f => f.export !== false && supplierMatch(f.supplier, supplier)).map(f => ({ name: displayName(f.name, f.code), article: f.code || '', qty: f.count || 0, length: null }));
      const profs = (db.profiles || []).filter(p => p.export !== false && p.supplier && supplierMatch(p.supplier, supplier));
      const profRows = [];
      profs.forEach(p => {
        const details = (p.details && p.details.length) ? p.details : [{ length: p.length, count: p.count }];
        details.forEach(d => profRows.push({ name: displayName(p.name || p.material, p.code), article: p.code || '', qty: d.count || 0, length: d.length }));
      });
      inputRows = fits.concat(profRows);
    }

    if (!inputRows.length) continue;

    let roomExists = false;
    if (roomName) {
      const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
      let mm;
      while ((mm = rowRe.exec(sheetXml)) !== null) {
        const rn = parseInt(mm[1], 10);
        if (rn < startRow || rn > lastRow) continue;
        const ac = new RegExp('<c r="A' + rn + '"[^>]*t="s"[^>]*><v>(\\d+)<\\/v>').exec(mm[2]);
        if (ac) {
          const idx = parseInt(ac[1], 10);
          if (sharedStrings[idx] != null && sharedStrings[idx].trim() === String(roomName).trim()) { roomExists = true; break; }
        }
      }
    }

    const tableCol2 = range.col2;

    function splitRowCells(rowXml) {
      const cells = [];
      const cre = /<c r="([A-Z]+)(\d+)"([^>\/]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let m;
      while ((m = cre.exec(rowXml)) !== null) {
        cells.push({ col: m[1], attrs: m[3], inner: m[4] || null, xml: m[0] });
      }
      return cells;
    }
    function rowHasData(rowXml) {
      for (const c of splitRowCells(rowXml)) {
        if (colNum(c.col) > tableCol2 || !c.inner) continue;
        const vm = /<v>([\s\S]*?)<\/v>/.exec(c.inner);
        if (vm && String(vm[1]).trim()) return true;
      }
      return false;
    }
    function outTableCells(rowXml) {
      const out = [];
      for (const c of splitRowCells(rowXml)) {
        if (colNum(c.col) > tableCol2) out.push(c.xml);
      }
      return out;
    }

    const sdu = /<sheetData>([\s\S]*?)<\/sheetData>/.exec(sheetXml);
    const kept = [];
    if (sdu) {
      const rowRe = /<row[^>]*>[\s\S]*?<\/row>/g;
      let mm;
      while ((mm = rowRe.exec(sdu[1])) !== null) {
        const rnM = /<row r="(\d+)"/.exec(mm[0]);
        const num = rnM ? parseInt(rnM[1], 10) : 0;
        if (num <= lastRow) kept.push({ num, xml: mm[0] });
      }
    }
    kept.sort((a, b) => a.num - b.num);

    function makeRow(rowNum, item, isFirst, extraCells) {
      const cells = [];
      if (isFirst && roomName) cells.push(cellFor('A', rowNum, intern(roomName), true, styles.A));
      cells.push(cellFor('B', rowNum, intern(item.name || ''), true, styles.B));
      if (plan.key === 'viyar') {
        cells.push(cellFor('C', rowNum, intern(item.article || ''), true, styles.C));
        cells.push(numCell('D', rowNum, item.qty, styles.D));
        if (item.length != null) cells.push(numCell('E', rowNum, item.length, styles.E));
      } else {
        cells.push(numCell('C', rowNum, item.qty, styles.C));
      }
      if (formulaCellXml && formulaCol) {
        const fs2 = styles[formulaCol] != null ? styles[formulaCol] : 0;
        cells.push('<c r="' + formulaCol + rowNum + '" s="' + fs2 + '"><f>' + formulaCellXml + '</f></c>');
      }
      if (extraCells && extraCells.length) cells.push(extraCells.join(''));
      return '<row r="' + rowNum + '">' + cells.join('') + '</row>';
    }

    const finalRows = [];
    let ri = 0;
    for (const er of kept) {
      if (er.num < startRow) { finalRows.push(er.xml); continue; }
      if (ri < inputRows.length && !roomExists && !rowHasData(er.xml)) {
        finalRows.push(makeRow(er.num, inputRows[ri], ri === 0, outTableCells(er.xml)));
        ri++;
      } else {
        finalRows.push(er.xml);
      }
    }
    let seq = lastRow + 1;
    while (ri < inputRows.length) {
      finalRows.push(makeRow(seq, inputRows[ri], ri === 0 && !roomExists, null));
      ri++;
      seq++;
    }
    const newEnd = Math.max(lastRow, seq - 1);

    let newSheet = sheetXml;
    if (sdu) {
      newSheet = newSheet.replace(sdu[0], '<sheetData>' + finalRows.join('') + '</sheetData>');
    } else {
      const fallback = [];
      for (let i = 0; i < inputRows.length; i++) fallback.push(makeRow(startRow + i, inputRows[i], i === 0, null));
      newSheet = newSheet.replace('</sheetData>', fallback.join('') + '</sheetData>');
    }
    const dimRe = /<dimension ref="([^"]+)"/.exec(newSheet);
    if (dimRe) {
      const nr = dimRe[1].replace(/:\w+\d+$/, ':' + colLetter(range.col2 ? range.col2 : (plan.cols.length - 1)) + newEnd);
      newSheet = newSheet.replace(dimRe[0], '<dimension ref="' + nr + '"');
    }
    byName[sheetFile] = Buffer.from(newSheet, 'utf8');

    if (tableXml) {
      const tblCol = range.col2 >= 0 ? range.col2 : plan.cols.length - 1;
      const newRef = 'A1:' + colLetter(tblCol) + newEnd;
      let nt = tableXml.replace(/\bref="A1:[A-Z]+\d+"/, 'ref="' + newRef + '"');
      nt = nt.replace(/(<autoFilter ref=")A1:[A-Z]+\d+(")/, '$1' + newRef + '$2');
      byName[tableFile] = Buffer.from(nt, 'utf8');
    }
    appendedRows += inputRows.length;
    result.push({ sheet: plan.sheet, rows: inputRows.length, room: roomName });
  }

  if (appendedRows === 0) {
    return { rows: 0, sheets: [] };
  }

  let newSiXml = '';
  for (let i = existingCount; i < sharedStrings.length; i++) newSiXml += siXml(sharedStrings[i]);
  let newShared;
  if (sharedOld) {
    newShared = sharedOld.replace(/<\/sst>\s*$/, '');
    newShared = newShared.replace(/(count=")\d+(")/, '$1' + sharedStrings.length + '$2');
    newShared = newShared.replace(/(uniqueCount=")\d+(")/, '$1' + sharedStrings.length + '$2');
    newShared = newShared + newSiXml + '</sst>';
  } else {
    const hdr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + sharedStrings.length + '" uniqueCount="' + sharedStrings.length + '">';
    newShared = hdr + newSiXml + '</sst>';
  }
  byName['xl/sharedStrings.xml'] = Buffer.from(newShared, 'utf8');
  delete byName['xl/calcChain.xml'];

  const out = buildZip(Object.keys(byName).map(name => ({ name, data: byName[name] })));
  const bak = file + '.bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, raw);
  fs.writeFileSync(file, out);
  return { rows: appendedRows, sheets: result };
}

function cellFor(col, row, si, isStr, style) {
  const s = style != null ? ' s="' + style + '"' : '';
  return '<c r="' + col + row + '"' + s + ' t="s"><v>' + si + '</v></c>';
}
function numCell(col, row, val, style) {
  const n = (Math.round(val * 10) / 10);
  const s = style != null ? ' s="' + style + '"' : '';
  return '<c r="' + col + row + '"' + s + '><v>' + n + '</v></c>';
}

module.exports = { writeCalcWorkbook, listZip };