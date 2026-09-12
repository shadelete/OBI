// OBIb3d: offline parser for Bazis .b3d model files.
// Extracts UTF-16 string table from zlib streams, classifies items into
// materials / edges / fittings / profiles / parts, fills articles from a
// material base index (bm22.xml / any *.xml in the material base folder).
// Runs in the Electron main process (fs + zlib). Never touches the active
// project file or fit_rules.
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Classification keywords. NOTE: JS regex /i does NOT fold Cyrillic case, so we
// match against a lowercased copy of the string and keep patterns lowercase.
// ---------------------------------------------------------------------------
const RE_EDGE = /(кром|крайк|кромк|\bпвх\b|\babs\b|пvc|крomka|\bouleague\b)/;
const RE_PANEL = /(дсп|лдсп|мдф|хдф|лхдф|двп|фанер|массив|масів|шпон|шпон|плит|\bmdf\b|\bhdf\b|стекл|скло|зеркал|акрил|петрог|ксіо|kronos|kronospan|едиг|egger|шовк|шёлк|мигдал|миндал|\bдуб\b|горіх|орех|ясен|ясінь|графіт|графит|бетон|соном|темн|світл|светл|бежев|кремов|жемчуж|перл|біл\b|бел\b|шліф\b|полир|лазерн|рифлен)/;
// A string is a panel material only when a material keyword leads the name
// ("ДСП бук", "Білий шовк") or the name ends in a size ("…2800x2070x18 мм").
// Keyword hits inside descriptive texts ("…сложная к ДСП…") are not panels.
const RE_PANEL_START = /^(дсп|лдсп|мдф|хдф|лхдф|двф|фанер|массив|масів|шпон|плит|стекл|скло|зеркал|акрил|петрог|ксіо|kronos|kronospan|едиг|egger|шовк|шёлк|мигдал|миндал|дуб|горіx|горіх|ореx|орех|ясен|ясінь|графіт|графит|бетон|соном|темн|світл|светл|бежев|кремов|жемчуж|перл|біл|бел|шліф|полир|лазерн|рифлен)/;
const RE_SIZE_MM = /\d\s*мм/i;
const RE_FITTING = /(петл|завіс|завис|петля|шкант|конфирмат|конфірмат|стяжк|стяг\b|ексцентрик|эксцентрик|ручк|направляющ|направляюч|газлифт|газліфт|довод|аморт|толкат|виштовхувач|пуш\b|пущ|сушилк|сушк|корзин|кошик|ролик|шарик|телескоп|висувн|выдвиж|підйом|подъем|ніжк|ножк|опор|приклей|утримувач|тримач|держатель|крюч|гачок|вішак|вешалк|стопор|фиксатор|фіксатор|замок|замк|магнит|магніт|близнюк|двойник|клипс|защёлк|защіп|blum|hettich|boyard|viyar|owwa|muller|фурнітур|фурнитур|стяжк|саморіз|саморез|шуруп|гвинт|винт\b|болт\b|гайк|шайб|заклепк|гвозд|заглушк|підвіс|подвес\b|навіс|навес\b|навісна|полкодержател|полкотримач|комплект креплен|комплект кріплен)/;
const RE_PROFILE = /(^труб|труб\b|профил|профіль|профилі|уголок|кутик|штапик|штанга|карниз|шест\b|рейк|погон|плінтус|плинтус|алюмин|алюміні|направляюч.*алюм|направляющ.*алюм|профільн|профильн)/;
const RE_DETAIL = /^(боковин|бічн|\bдно\d?$|^\d?\s*дно\b|полк|кришк|верх\b|низ\b|фасад|ящик|стін|стен\b|стеллаж|цоколь|цокол|панель|перегородк|перегородк|перемычк|перемичк|поріг|царг|фальш|декор)/;

// Model "junk": fragment mesh geometry, material colours, undocumented
// per-instance labels and Bazis action log entries. These repeat across
// models and are not part of the cut composition.
const RE_JUNK_MESH = /^bau\d.*mesh$/;
const RE_JUNK_COLOR = /^(zincplated|nickelplated|chromeplated|stainlesssteel\w*|deepgrey|blacknickel|barezinc|color|\d[\d.,]*[хx*]\d[\d.,]*|^[\d.,]+)$/;
const RE_JUNK_LABEL = /^(noname|blum\d{1,2}|паз|пп|n\/a)$/;
const RE_JUNK_ACTION = /^(?:редактирование|создание|удаление|перемещение|выполнение|расстановка|отмена|новая модель|параллельная линия|облицовывание|растяжение и сдвиг|горизонтальная|вертикальная|установка панели|установка фурнитуры|линия стыка|габаритная рамка)(?:$|\s)/;
const RE_JUNK_UNDERSCORE = /^__\d?-/;
// Bazis bookkeeping strings: unnamed blocks, walls, layers, markup.
const RE_JUNK_EXTRA = /^(стіна|стіни|стена|стены|елемент стіни|елементи стін|сло[йі]|примитив|замір|замер|размер|фаска|об[ь'єя])|^tline3d\s*\d+|^material_\d+$/i;

const NOISE = /[<>{}\[\];:\\]|\.fr3d|\.obj|\.mtl|\.3ds|\.png|\.dxf|:\/\//;
const RE_THICKNESS = /(\d+(?:[.,]\d+)?)\s*мм/i;
const RE_EDGE_DIM = /([\d]+(?:[.,]\d+)?)\s*[\/хx×*]\s*([\d]+(?:[.,]\d+)?)/;
const RE_NUM_TOKEN = /^(\d{1,6})\s+(?=[А-Яа-яЁёІіЇїЄєA-Za-z])/;
const RE_ARTICLE_PAREN = /\(Артикул\s+(\d+)\)/i;

// ---------------------------------------------------------------------------
// zlib stream scan + UTF-16LE length-prefixed string extraction
// ---------------------------------------------------------------------------
function inflateStreams(buf) {
  const out = [];
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x78 && [0x9c, 0xda, 0x01, 0x5e].indexOf(buf[i + 1]) !== -1) {
      try {
        const d = zlib.inflateSync(buf.slice(i), { maxOutputLength: 512 * 1024 * 1024 });
        if (d.length < 2000) continue;
        out.push(d);
      } catch (e) {
        // not a complete deflate stream at this offset — keep scanning
      }
      i += 2;
    }
  }
  return out;
}

function isCharOk(lo, hi) {
  if (hi === 4) return lo >= 0x10 && lo <= 0xff;                       // Cyrillic plane
  if (hi === 0) return lo >= 0x20 && lo <= 0xbf;                       // ASCII + cp1251 range
  return false;
}

function extractStrings(buf) {
  // name -> { count, code } — a model string is "Имя\rКод"; the article after
  // the CR is the very same AdvParamData code the OBI script reads live.
  const map = new Map();
  for (const d of inflateStreams(buf)) {
    for (let j = 0; j + 4 < d.length; j += 2) {
      const n = d.readUInt32LE(j);
      if (n < 2 || n > 1500) continue;
      if (j + 4 + n * 2 > d.length) continue;
      let ok = true;
      const chars = [];
      let cr = -1;
      let letters = 0;
      for (let k = 0; k < n; k++) {
        const lo = d[j + 4 + k * 2];
        const hi = d[j + 4 + k * 2 + 1];
        let ch;
        if (hi === 4) {
          if (lo < 0x10 || lo > 0xff) { ok = false; break; }
          ch = String.fromCharCode(0x400 + lo);
        } else if (hi === 0) {
          if (lo === 0x0d) { if (cr === -1) cr = k; continue; }   // \r separator
          if (lo < 0x20 || lo > 0xbf) { ok = false; break; }
          ch = String.fromCharCode(lo);
        } else { ok = false; break; }
        chars.push(ch);
        if (/[\w\u0400-\u04FF]/.test(ch)) letters++;
      }
      if (!ok || letters < 2) continue;
      let name = chars.join('');
      let code = '';
      if (cr !== -1) {
        const head = chars.slice(0, cr).join('');
        // The \r itself is never pushed to chars, so after the first \r the
        // chars index runs one behind the k position; the tail starts at cr.
        const tail = chars.slice(cr).join('').trim();
        if (/^[\dA-Za-z][\dA-Za-z. -]{0,19}$/.test(tail) && /[0-9]/.test(tail)) {
          name = head;
          code = tail;
        } else {
          name = head;   // stray CR inside a name — cut it, no article
        }
      }
      name = name.trim();
      if (name.length < 2) continue;
      if (NOISE.test(name)) continue;
      if (/^\d+$/.test(name) && !code) continue;
      const e = map.get(name) || { count: 0, code: '' };
      e.count++;
      // The same model string appears in several arg stores; the AdvParamData
      // copy carries the real article ("\r57722"), length-prefixed copies keep
      // a shortened variant. Longest code wins.
      if (code && code.length >= e.code.length) e.code = code;
      map.set(name, e);
      j += 4 + n * 2 - 2;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Material base index (name -> article). Source: *.xml exports next to the
// .FDB bases. Parsed lazily, cached in-process.
// ---------------------------------------------------------------------------
let baseIndex = null;

function materialBaseDir() {
  if (process.env.OBI_MAT_BASE && fs.existsSync(process.env.OBI_MAT_BASE)) {
    return process.env.OBI_MAT_BASE;
  }
  const cand = 'D:\\BazisMain\\База материалов';
  return fs.existsSync(cand) ? cand : '';
}

function buildBaseIndex() {
  const dir = materialBaseDir();
  const index = { exact: new Map(), norm: new Map() };
  if (!dir) return index;
  let files = [];
  try { files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xml')); } catch (e) { return index; }
  for (const f of files) {
    let xml = '';
    try { xml = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (e) { continue; }
    const re = /<Article>([^<]*)<\/Article>\s*<Name>([^<]*)<\/Name>/g;
    let m;
    while ((m = re.exec(xml))) {
      const art = m[1].trim();
      const name = m[2].trim();
      if (!art || !name) continue;
      if (!index.exact.has(name)) index.exact.set(name, art);
      const norm = normName(name);
      if (!index.norm.has(norm)) index.norm.set(norm, art);
    }
  }
  return index;
}

function normName(s) {
  return s.toLowerCase()
    .replace(/[()"“”«».,:;_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchArticle(rawName) {
  if (!baseIndex) baseIndex = buildBaseIndex();
  const exact = baseIndex.exact.get(rawName);
  if (exact) return exact;
  const n = normName(rawName);
  const direct = baseIndex.norm.get(n);
  if (direct) return direct;
  const noToken = n.replace(/^\d{1,6}\s+/, '');
  if (noToken !== n) {
    const t = baseIndex.norm.get(noToken);
    if (t) return t;
  }
  // contains fallback: keep cheap by only walking smaller side
  if (baseIndex.norm.size <= 20000) {
    for (const [key, art] of baseIndex.norm) {
      if (key.length >= 6 && n.includes(key)) return art;
      if (n.length >= 6 && key.includes(n)) return art;
    }
  }
  return '';
}

function toNum(s) {
  if (!s) return 0;
  const v = parseFloat(String(s).replace(',', '.'));
  return isNaN(v) ? 0 : v;
}

// ---------------------------------------------------------------------------
// Classify a single string -> category tag
// ---------------------------------------------------------------------------
function classify(s) {
  const lc = s.toLowerCase();
  if (RE_JUNK_MESH.test(lc)) return 'ignore';
  if (RE_JUNK_COLOR.test(lc)) return 'ignore';
  if (RE_JUNK_LABEL.test(lc)) return 'ignore';
  if (RE_JUNK_UNDERSCORE.test(lc)) return 'ignore';
  if (RE_JUNK_EXTRA.test(lc)) return 'ignore';
  if (RE_JUNK_ACTION.test(lc) && s.indexOf('.') === -1) return 'ignore';
  if (/^\S+\s\+\s\S+/.test(s)) return 'ignore';
  if (RE_EDGE.test(lc)) return 'edge';
  if (RE_FITTING.test(lc)) return 'fitting';
  if (RE_PROFILE.test(lc)) return 'profile';
  if (RE_PANEL.test(lc) && (RE_PANEL_START.test(lc) || RE_SIZE_MM.test(lc))) return 'panel';
  if (RE_DETAIL.test(lc)) return 'detail';
  if (/^[А-Яа-яЁёІіЇїЄєA-Za-z\d .\-()]{2,}$/.test(s)) return 'detail';
  return 'ignore';
}

// ---------------------------------------------------------------------------
// Panel records from the main document stream
// A panel record = [material string][thickness double][contour doubles][edge
// strings ...][fitting scheme strings ...]. Each real edge appears twice in the
// stream (an Obj-copy with the AdvParamData code and a Size-copy without);
// the width/geometry lives around the material string. So per material we can
// count real panels, their thickness and the real edge lines attached to them.
// ---------------------------------------------------------------------------
function decodeStrValue(doc, p) {
  const L = doc.readUInt32LE(p + 1);
  if (!L || L > 300) return null;
  if (p + 5 + L * 2 > doc.length) return null;
  let s = '';
  for (let k = 0; k < L; k++) {
    const lo = doc[p + 5 + k * 2], hi = doc[p + 5 + k * 2 + 1];
    if (hi === 0 && lo === 13) s += '\r';
    else if ((hi === 0 && lo >= 0x20 && lo <= 0xbf) || (hi === 4 && lo >= 0x10 && lo <= 0xff)) s += String.fromCharCode(hi * 256 + lo);
    else return null;
  }
  return s;
}

function findMainDoc(buf) {
  let best = null, bestScore = 0;
  for (const d of inflateStreams(buf)) {
    let score = 0;
    for (let p = 0; p < d.length - 8; p++) {
      if (d[p] !== 0x06) continue;
      const s = decodeStrValue(d, p);
      if (!s) continue;
      const i = s.indexOf('\r');
      if (i !== -1 && /[0-9]/.test(s.slice(i + 1))) score += 1;
      const base = i === -1 ? s : s.slice(0, i);
      const c = classify(base.trim());
      if (c === 'panel' || c === 'edge') score += 8;
    }
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function docItems(doc) {
  const items = [];
  for (let p = 0; p < doc.length - 8; p++) {
    if (doc[p] !== 0x06) continue;
    const s = decodeStrValue(doc, p);
    if (!s) continue;
    let letters = 0;
    for (const ch of s) if (/[\w\u0400-\u04FF]/.test(ch)) letters++;
    if (letters < 3) continue;
    const cr = s.indexOf('\r');
    let name = (cr === -1 ? s : s.slice(0, cr)).trim();
    if (name.length < 2) continue;
    if (NOISE.test(name)) continue;
    const tail = cr === -1 ? '' : s.slice(cr + 1).trim();
    if (/^\d+$/.test(name) && !tail) continue;
    let code = '';
    if (cr !== -1 && /^[\dA-Za-z][\dA-Za-z. -]{0,19}$/.test(tail) && /[0-9]/.test(tail)) code = tail;
    items.push({ off: p, name, code, cat: classify(name) });
  }
  items.sort((a, b) => a.off - b.off);
  return items;
}

// History/journal gate: opening a model whose undo log ("журнал операцій")
// survived into the save duplicates the whole scene and breaks every count.
// A clean model keeps exactly one journal entry ("Новая модель"), so >1 means
// the file still carries the operation history — refuse and tell the user to
// re-save the model in Bazis (a plain save clears the journal).
// The verb list is the set of operation names emitted by the journal; each is
// a journal row so the count equals the number of operations.
const RE_HISTORY_VERB = /^(?:новая модель|удаление|отмена \d|перемещение объектов|редактирование|создание вспомогательной|установка панели|установка крепежа|установка фурнитуры|вставка фрагмента|вставка из буфера|изменение структуры|замена материала|разгруппирование|копирование объектов|поворот объектов|вращение объектов|масштабирование объектов|вырезание объектов|расстановка фурнитуры|снятие фурнитуры)/i;

function countHistory(doc) {
  let n = 0;
  for (let p = 0; p < doc.length - 8; p++) {
    if (doc[p] !== 0x06) continue;
    const s = decodeStrValue(doc, p);
    if (!s) continue;
    let letters = 0;
    for (const ch of s) if (/[\w\u0400-\u04FF]/.test(ch)) letters++;
    if (letters < 3) continue;
    const cr = s.indexOf('\r');
    const name = (cr === -1 ? s : s.slice(0, cr)).trim();
    if (RE_HISTORY_VERB.test(name)) n++;
  }
  return n;
}

function thicknessAfter(doc, off, name) {
  const L = doc.readUInt32LE(off + 1);
  const end = L ? off + 5 + L * 2 : off + 20;
  const lim = Math.min(end + 1600, doc.length);
  for (let q = end; q + 8 < lim; q++) {
    if (doc[q] !== 5) continue;
    const v = doc.readDoubleLE(q + 1);
    if (v >= 1 && v <= 80 && Math.abs(v - Math.round(v)) < 1e-6) return v;
  }
  const m = RE_THICKNESS.exec(name);
  return m ? toNum(m[1]) : 0;
}

// The last two len-prefixed UTF-16 strings inside a panel record are
// [part name][position]: "К1-Боковина ящика", "К1-бік л." … followed by the
// ArtPos token ("10", "32", "2022.12.21.36090"). Edge/material/Junk strings
// and numeric date-like labels are treated accordingly.
function findPartName(doc, a, b, matName) {
  let name = null;
  let position = '';
  for (let p = a; p + 5 < b; p++) {
    const L = doc.readUInt32LE(p);
    if (L < 2 || L > 200 || p + 4 + L * 2 > b) continue;
    let ok = true, cyr = 0, letters = 0;
    for (let k = 0; k < L; k++) {
      const lo = doc[p + 4 + k * 2], hi = doc[p + 4 + k * 2 + 1];
      if (hi === 4) { if (lo < 0x10 || lo > 0xff) { ok = false; break; } cyr++; }
      else if (hi === 0) {
        if (lo === 0x0d || lo < 0x20 || lo > 0xbf) { ok = false; break; }
        if (lo < 0x30 || lo > 0x39) letters++;
      } else { ok = false; break; }
    }
    if (!ok) continue;
    const s = doc.toString('utf16le', p + 4, p + 4 + L * 2).trim();
    if (s.length < 2) continue;
    if (NOISE.test(s) || s === matName) continue;
    if (/^\d[\d .,\/\-]{0,18}$/.test(s) || /^\d{2,4}\.\d{2}\.\d{2}\.\d+$/.test(s)) {
      position = s;                      // ArtPos — number or date-like label
      continue;
    }
    if (s.length < 3) continue;
    if (letters < 3 && cyr === 0) continue;
    const c = classify(s);
    if (c === 'edge' || c === 'ignore') continue;
    name = s;                            // later strings win (closer to record end)
    p += 4 + L * 2 - 2;
  }
  if (!name) return null;
  return { name, position };
}

// Real profiles (TExtrusionBody objects, e.g. "Ш труба" / "Л подушка … мм")
// are NOT plain length-prefixed strings in the model — they live in the main
// doc stream as an AdvParamData record shaped like
//   [object name][ArtPos number][material with \r article]
// (the ArtPos number may be absent). Pure scheme strings ("Загальна рамка",
// "Штанга (компл.)", scheme module names) never carry a material after them
// and must not become profiles.
function buildProfilesFromDoc(doc, items) {
  const RE_PROFILEISH = /труб|профил|профіль|штанга|карниз|шест|рейк|кутик|плінтус|плинтус|алюмин|алюміні|штапик/i;
  // Words that mark a string as part of a scheme/module rather than a real
  // profile object or its material.
  const SVC = /рамк|стіна|стена|Лінія ст|стик|перегородк|ящ|фасад|фальш|цокол|лишт|\bопровж|\bСП\b|компл|рефікс|рафікс|\bВ\b$/i;
  // The real GSize of a profile object (width/thickness/length, e.g. "Ш труба"
  // x15 y30 z984) is written near its material string as integer doubles. Best
  // effort: the first integer double right after the material string is the
  // length ("Труба скалка …" → 984, "Marino 02" → 60).
  const profileLengthAfter = (off) => {
    const L = doc.readUInt32LE(off + 1);
    const end = L ? off + 5 + L * 2 : off + 20;
    const lim = Math.min(end + 48, doc.length);
    for (let q = end; q + 8 < lim; q++) {
      if (doc[q] !== 5) continue;
      const v = doc.readDoubleLE(q + 1);
      if (v >= 3 && v <= 100000 && Math.abs(v - Math.round(v)) < 0.05) return Math.round(v);
    }
    return null;
  };
  // ArtPos of the profile object: a standalone numeric 0x06 record between the
  // object name and its material (docItems drops bare digits).
  const posBetween = (a, b) => {
    const start = a + 5 + doc.readUInt32LE(a + 1) * 2;
    const lim = Math.min(b, start + 900);
    for (let p = start; p + 8 < lim; p++) {
      if (doc[p] !== 0x06) continue;
      const L = doc.readUInt32LE(p + 1);
      if (L < 1 || L > 8 || p + 5 + L * 2 > lim) continue;
      const s = doc.toString('utf16le', p + 5, p + 5 + L * 2);
      if (/^\d{1,6}$/.test(s)) return s;
      break;
    }
    return '';
  };
  const rows = new Map();
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a.code) continue;   // об'єкт профілю носить код лише через матеріал, не сам
    if (a.cat !== 'detail' && a.cat !== 'profile' && !(a.cat === 'fitting' && /ручк/i.test(a.name) && a.name.length <= 30 && !/\d+\s*мм/i.test(a.name))) continue;
    const aName = a.name.trim();
    if (SVC.test(aName)) continue;
    const nameOK = RE_PROFILEISH.test(aName) || /мм|^\d+\s*[хx*]\s*\d/.test(aName) || (/ручк/i.test(aName) && aName.length <= 30);
    if (!nameOK) continue;
    let b = null;
    for (let j = i + 1; j < items.length; j++) {
      const cand = items[j];
      if (cand.off - a.off > 900) break;
      if (cand.cat === 'panel' || cand.cat === 'edge') continue;
      // another profile-ish object without an article ("Кутик монтажний з
      // кембриком", "Профиль ручка") is not a material either
      if (cand.cat === 'profile' && !cand.code) continue;
      const bName = cand.name.trim();
      if (bName === aName) continue;
      if (SVC.test(bName)) continue;
      if (!cand.code && RE_PROFILEISH.test(bName)) continue;
      // material heuristics: has an article, a profile keyword, or a short
      // coded name ("Marino 02"); scheme/module words are rejected above
      if (!(cand.code || RE_PROFILEISH.test(bName) || (/\d/.test(bName) && bName.length <= 22))) continue;
      b = cand;
      break;
    }
    if (!b) continue;
    const posNum = posBetween(a.off, b.off);
    const key = aName + '\u0000' + b.name;
    let rec = rows.get(key);
    if (!rec) {
      rec = {
        name: aName,
        code: b.code || '',
        material: b.name,
        materialCode: b.code || '',
        export: true,
        details: [{
          width: null,
          thickness: null,
          length: profileLengthAfter(b.off),
          count: 0,
          positions: posNum ? [posNum] : []
        }]
      };
      rows.set(key, rec);
    }
    const d = rec.details[0];
    d.count++;
    if (b.code && b.code.length > rec.code.length) { rec.code = b.code; rec.materialCode = b.code; }
    if (posNum && d.positions.indexOf(posNum) === -1) d.positions.push(posNum);
  }
  return [...rows.values()];
}

function buildMaterialsFromDoc(doc) {
  const items = docItems(doc);
  const rows = new Map();   // name -> {row, edgeCounts, detailCounts}
  const restEdges = [];     // edges outside any panel record
  let cur = null;           // { mat: item, edges: [item] }
  const commit = (nextOff) => {
    if (!cur) return;
    const key = cur.mat.name;
    let rec = rows.get(key);
    if (!rec) {
      const thickness = thicknessAfter(doc, cur.mat.off, key);
      rec = {
        row: { name: key, code: cur.mat.code || '', thickness, count: 0, export: true, edges: [], details: [] },
        edgeCounts: new Map(),
        detailCounts: new Map()
      };
      rows.set(key, rec);
    }
    rec.row.count++;
    if (cur.mat.code && !rec.row.code) rec.row.code = cur.mat.code;
    for (const e of cur.edges) {
      const prev = rec.edgeCounts.get(e.name) || { n: 0, code: '' };
      prev.n++;
      if (e.code && !prev.code) prev.code = e.code;
      rec.edgeCounts.set(e.name, prev);
    }
    const part = findPartName(doc, cur.mat.off + 1, nextOff, key);
    if (part) {
      const pkey = part.name + '\u0000' + (part.position || '');
      const dc = rec.detailCounts.get(pkey) || { name: part.name, position: part.position || '', n: 0 };
      dc.n++;
      rec.detailCounts.set(pkey, dc);
    }
  };
  for (const it of items) {
    if (it.cat === 'panel') {
      commit(it.off);
      cur = { mat: it, edges: [] };
    } else if (it.cat === 'edge') {
      if (cur) cur.edges.push(it);
      else restEdges.push(it);
    }
    // fitting/scheme/module strings inside the record are skipped — they do not
    // belong to the material card (handled by the global fitting/profile pass)
  }
  commit(doc.length);

  const materials = [];
  for (const [, rec] of rows) {
    const edges = [];
    for (const [name, ec] of rec.edgeCounts) {
      const real = Math.max(1, Math.round(ec.n / 2));   // Obj+Size double copy
      const dim = RE_EDGE_DIM.exec(name) ? RE_EDGE_DIM.exec(name) : null;
      let width = dim ? toNum(dim[1]) : 0;
      let thickness = dim ? toNum(dim[2]) : 0;
      if (thickness > width && thickness >= 2) { const sw = width; width = thickness; thickness = sw; }
      edges.push({ name, code: ec.code, width, thickness, count: real });
    }
    edges.sort((a, b) => b.count - a.count);
    rec.row.edges = edges;
    const details = [];
    for (const [, dc] of rec.detailCounts) {
      details.push({ name: dc.name, count: dc.n, position: dc.position, width: null, height: null, cuts: [] });
    }
    details.sort((a, b) => b.count - a.count);
    rec.row.details = details;
    materials.push(rec.row);
  }
  materials.sort((a, b) => b.count - a.count);
  return { items, materials, restEdges };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------
function parseB3D(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 800) {
    return { ok: false, error: 'Файл замалий або не є моделлю Базиса' };
  }

  const doc = findMainDoc(buf);

  // A model that was autosaved mid-work keeps the full operation journal in the
  // main document stream; opening it duplicates the scene and inflates every
  // count. Only accept files with an empty (or single bootstrap) journal.
  const history = doc ? countHistory(doc) : 0;
  if (history > 1) {
    return {
      ok: false,
      code: 'model-has-history',
      history,
      error: 'Модель збережена з історією операцій (' + history + ' дій).' +
        ' Відкрийте модель у Базисі та збережіть її заново (очистить журнал), потім спробуйте ще раз.'
    };
  }

  const counts = extractStrings(buf);

  // Panel materials and their edges are rebuilt from the main document stream
  // records: each panel = [material][thickness][contour][edges …]. This gives
  // the real panel count, real thickness and real edge lines (Obj+Size double
  // copies are halved). Falls back to the raw string counts otherwise.
  const docRes = (() => {
    if (!doc) return null;
    const r = buildMaterialsFromDoc(doc);
    return r.items && r.items.length ? { doc, items: r.items, materials: r.materials, restEdges: r.restEdges } : null;
  })();
  const useDoc = !!docRes;

  // A profile lives in the model not as a plain length-prefixed string but as a
  // 0x06-prefixed AdvParamData record inside the main document stream, so the
  // extractStrings map misses it ("Труба скалка L = 3000мм … (Артикул 79789)").
  // When the doc is in use, rebuild the profile list from the doc records:
  // [object name][ArtPos number?][material with \r article]. Pure scheme/module
  // strings ("Загальна рамка", "Штанга (компл.)", …) never have a material
  // after them and are rejected by buildProfilesFromDoc.
  const docProfiles = useDoc ? buildProfilesFromDoc(docRes.doc, docRes.items) : [];

  const meta = {
    fileName: path.basename(filePath),
    fileSize: buf.length,
    stringsTotal: counts.size,
    strings: {},
    codes: {}
  };
  for (const [s, e] of counts) {
    meta.strings[s] = e.count;
    if (e.code) meta.codes[s] = e.code;
  }

  // Bazis build signature, if present in the header
  const head = buf.slice(0, 4096).toString('latin1');
  const vm = head.match(/\d{4}\.\d{2}\.\d{2}\.\d+/);
  if (vm) meta.bazisVersion = vm[0];

  const mats = useDoc ? docRes.materials : [];   // panel materials
  const edges = [];  // { name, code, width, thickness, count } — only for !useDoc
  const fittings = []; // { name, code, count, tag }
  const profiles = useDoc ? docProfiles : [];   // only real TExtrusionBody records when the doc is in use
  const details = [];  // part names + counts

  for (const [s, e] of counts) {
    const cat = classify(s);
    if (useDoc && (cat === 'panel' || cat === 'edge' || cat === 'profile')) continue; // precise passes below
    const c = e.count;
    // favourite source for an article is the \r-code embedded in the model
    // string itself; fallback for panels/edges is the material base lookup,
    // then "(Артикул NNNN)" in the name, then a leading numeric token
    const paren = RE_ARTICLE_PAREN.exec(s) ? RE_ARTICLE_PAREN.exec(s)[1] : '';
    const tok = RE_NUM_TOKEN.exec(s) ? RE_NUM_TOKEN.exec(s)[1] : '';
    const code = (cat === 'panel' || cat === 'edge')
      ? (e.code || matchArticle(s) || paren || tok)
      : (e.code || paren || tok);
    if (cat === 'panel') {
      const thick = RE_THICKNESS.exec(s) ? toNum(RE_THICKNESS.exec(s)[1]) : 0;
      const row = mats.find(m => m.name === s);
      if (row) row.count += c;
      else mats.push({ name: s, code, thickness: thick, count: c, export: true, edges: [], details: [] });
    } else if (cat === 'edge') {
      const dim = RE_EDGE_DIM.exec(s) ? RE_EDGE_DIM.exec(s) : null;
      const width = dim ? toNum(dim[1]) : 0;
      const thickness = dim ? toNum(dim[2]) : 0;
      const row = edges.find(e => e.name === s);
      if (row) row.count += c;
      else edges.push({ name: s, code, width, thickness, count: c });
    } else if (cat === 'fitting') {
      if (useDoc && profiles.some(p => p.name === s)) continue;   // вже є профіль-ручка з doc
      const row = fittings.find(f => f.name === s);
      if (row) row.count += c;
      else fittings.push({ name: s, code, count: c, tag: 'Загальна фурнітура' });
    } else if (cat === 'profile') {
      const row = profiles.find(p => p.name === s);
      if (row) row.count += c;
      else profiles.push({
        name: s,
        code: '',
        material: s,
        materialCode: code,
        export: true,
        details: [{ length: null, count: c }]
      });
    } else if (cat === 'detail') {
      const row = details.find(d => d.name === s);
      if (row) row.count += c;
      else details.push({ name: s, count: c });
    }
  }

  // Synthetic row so parts are visible in the materials tab
  const detailsTotal = details.reduce((s0, d) => s0 + d.count, 0);

  let restEdges = [];
  if (!useDoc) {
    // Attach extracted edge names to the panel material they visually belong to.
    // The strings carry no explicit link, so we match shared colour/wood tokens
    // ("Крайка ABS Темно-сірий базальт …" ↔ "ДСП … Базальт"). Unmatched edges
    // land in a small fallback group instead of a separate section.
    const EDGE_STOP = new Set(['крайка', 'кромка', 'abs', 'пвх', 'pvc', 'rehau']);
    const MAT_STOP = new Set(['дсп', 'лдсп', 'мдф', 'хдф', 'лхдф', 'двф', 'двп', 'фанер', 'плит', 'kronospan', 'krono', 'swiss', 'egger', 'еггер', 'лдф']);
    const wordsOf = (s, stop) => (s.toLowerCase().match(/[\u0430-\u0456\u0457\u0454\u0451a-z]{3,}/g) || []).filter(w => !stop.has(w));
    if (edges.length) {
      for (const e of edges) {
        const et = wordsOf(e.name, EDGE_STOP);
        let best = -1, bestScore = 0;
        for (let i = 0; i < mats.length; i++) {
          const mt = wordsOf(mats[i].name, MAT_STOP);
          const sc = et.reduce((s0, w) => s0 + (mt.includes(w) ? 1 : 0), 0);
          if (sc > bestScore) { bestScore = sc; best = i; }
        }
        const row = { name: e.name, code: e.code, width: e.width, thickness: e.thickness, count: e.count };
        if (bestScore > 0 && best !== -1) mats[best].edges.push(row);
        else restEdges.push(e);
      }
    }
  } else if (docRes.restEdges && docRes.restEdges.length) {
    restEdges = docRes.restEdges;
  }
  if (restEdges.length) {
    let fallback;
    if (useDoc) {
      const edgeRows = new Map();
      for (const e of restEdges) {
        const prev = edgeRows.get(e.name) || { n: 0, code: e.code || '' };
        prev.n++;
        if (e.code && !prev.code) prev.code = e.code;
        edgeRows.set(e.name, prev);
      }
      fallback = [...edgeRows.entries()].map(([nm, ec]) => {
        const dim = RE_EDGE_DIM.exec(nm) ? RE_EDGE_DIM.exec(nm) : null;
        let width = dim ? toNum(dim[1]) : 0;
        let thickness = dim ? toNum(dim[2]) : 0;
        if (thickness > width && thickness >= 2) { const sw = width; width = thickness; thickness = sw; }
        return { name: nm, code: ec.code, width, thickness, count: Math.max(1, Math.round(ec.n / 2)) };
      });
      fallback.sort((a, b) => b.count - a.count);
    } else {
      fallback = restEdges.map(e => ({ name: e.name, code: e.code, width: e.width, thickness: e.thickness, count: e.count }));
    }
    mats.push({
      name: 'Кромки (не прив\u0027язані)',
      code: '',
      thickness: 0,
      count: fallback.reduce((s0, e) => s0 + e.count, 0),
      export: true,
      edges: fallback,
      details: []
    });
  }
  if (details.length && !useDoc) {
    mats.push({
      name: 'Деталі (з моделі)',
      code: '',
      thickness: 0,
      count: detailsTotal,
      export: true,
      edges: [],
      details: details.map(d => ({ name: d.name, count: d.count, width: null, height: null }))
    });
  }

  const baseName = path.basename(filePath).replace(/\.b3d$/i, '') || 'Модель';
  const db = {
    date: new Date().toString(),
    name: baseName,
    orderName: '',
    totalObjects: counts.size,
    materials: mats,
    profiles,
    fittings,
    tagOrder: ['Загальна фурнітура', 'Петлі', 'Напрямні', 'Метизна фурнітура'],
    fitIdCounter: (fittings || []).length,
    _source: 'b3d-model',
    _model: true,
    _meta: meta
  };

  return { ok: true, db, meta };
}

module.exports = { parseB3D, extractStrings, classify };

// CLI smoke test: node src/b3d_parser.js path\to\model.b3d
if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node src/b3d_parser.js <file.b3d>');
    process.exit(1);
  }
  const res = parseB3D(file);
  if (!res.ok) { console.error('error:', res.error); process.exit(1); }
  console.log(JSON.stringify({
    meta: res.meta,
    materials: res.db.materials.map(m => ({ name: m.name, code: m.code || '', thickness: m.thickness, count: m.count, edges: (m.edges || []).length, details: (m.details || []).length })),
    fittings: res.db.fittings.map(f => ({ name: f.name, code: f.code || '', count: f.count })),
    profiles: res.db.profiles.map(p => ({ name: p.name, code: p.code || '', count: p.count }))
  }, null, 1));
}