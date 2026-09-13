// ============================================================
// OBI - ADV: ��� OBI.js, �� ������ ��������� ���������� �����
// GetParams('AdvParamData') -> FindNode('Elements')
// 1. Scan model
// 2. Save to data/db.json (UTF-8)
// 3. Launch OBI.exe
//
// ������� ��� ��������� � ��������:
//   - �������� ������� � db ��� ������� � ����� elements (�����������),
//     ����� � ���� ���� �����, �� ���� �������;
//   - �������� ������� (��� ������ �����������) ����������� � fittings
//     ���������� ��������� (isComposition: true);
//   - �������, ����������� � ����� ��������� (���+���), � ������ �� ��������.
// ��� ������� - ����� ����������� ������ ��� �������.
// ============================================================

var materials = {};   // TFurnPanel -> keyed by matName|thickness, with per-material edges
var profiles = {};    // TExtrusionBody
var fittings = {};    // TFastener
var totalObjects = 0;

function r4(n) { return Math.round(n * 10000) / 10000; }
var panelsCount = 0;
var profilesCount = 0;
var fastenersCount = 0;
var draftsCount = 0;
var compositeCount = 0; // ��������, � ������� ������ ������ (AdvParamData/Elements)
var compositionItems = {}; // �������� ������� �� ����� name|code

// Extract article from a name like "...��\r26534"
// Splits on carriage-return, returns { name, code }
function splitName(str) {
    if (!str) return { name: str || "", code: "" };
    var idx = str.indexOf("\r");
    if (idx > -1) {
        var name = str.substring(0, idx);
        var code = str.substring(idx + 1).trim();
        return { name: name, code: code };
    }
    return { name: str, code: "" };
}

// Get current product name (naymenuvannya vyrobu) from global Article.Name.
function getOrderName() {
    try {
        if (typeof Article !== "undefined" && Article && Article.Name) {
            return String(Article.Name);
        }
    } catch (e) {}
    try {
        if (typeof currentFileData !== "undefined" && currentFileData
            && currentFileData.article && currentFileData.article.Name) {
            return String(currentFileData.article.Name);
        }
    } catch (e) {}
    return "";
}

// Sanitize a string into a safe filename.
function sanitizeFilename(str) {
    if (!str) return "";
    return String(str)
        .replace(/[\\\/\:\*\?\"\<\>\|]/g, "_")
        .replace(/^[\s\.]+|[\s\.]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Sanitize a string into a safe filename.

// --- ��������� ������ ��������� (��� � ���������� �������) ---
// ���/��� ����: �� node.Name, ���� �� node.Value ("���\r���").
function nodeNameCode(node) {
    var name = "", value = "";
    try { name = node.Name || ""; } catch (e) { name = ""; }
    try { value = node.Value || ""; } catch (e) { value = ""; }
    var sn = splitName(name);
    var sv = splitName(value);
    if (!sn.name && sv.name) sn.name = sv.name;
    if (!sn.code && sv.code) sn.code = sv.code;
    return sn;
}

function buildElementsTree(node) {
    var result = [];
    try {
        var c = node.Count;
        if (!c || c === 0) return result;
        for (var i = 0; i < c; i++) {
            var child = null;
            try { child = node.Nodes[i]; } catch (e) {}
            if (!child) continue;
            var nc = nodeNameCode(child);
            var childCount = 0;
            try { if (child.Count) childCount = child.Count; } catch (e) {}
            var nested = [];
            if (childCount > 0) nested = buildElementsTree(child);
            result.push({ name: nc.name, code: nc.code, count: childCount, nested: nested });
        }
    } catch (e) {}
    return result;
}

function getFastenerElements(fastener) {
    try {
        var adv = fastener.GetParams('AdvParamData');
        if (!adv) return null;
        var elements = adv.FindNode('Elements');
        if (!elements || !elements.Count || elements.Count === 0) return null;
        return buildElementsTree(elements);
    } catch (e) {
        return null;
    }
}

// ���������� ������ ������� � ������� ������ ���� ����� ���� �������.
function flattenElements(elements, out) {
    if (!out) out = [];
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        if (!e.name) continue;
        out.push(e);
        if (e.nested && e.nested.length > 0) flattenElements(e.nested, out);
    }
    return out;
}

// ����������� �� ���� ������� � ����� ��������� (���+���)?
function isSameAsParent(e, parentName, parentCode) {
    if (!e || !e.name) return false;
    if (e.name !== parentName) return false;
    if (parentCode) return e.code === parentCode;
    return true;
}

function scanObject(obj) {
    if (!obj) return;

    // Model flag "UseInDocs" ("Учитывать в документации", TObject3D.UseInDocs):
    // if off, the object must not appear in the documentation (skip export).
    try {
        if (obj.UseInDocs === false) return;
    } catch (e) {}

    totalObjects++;

    try {
        if (obj instanceof TFurnPanel) {
            panelsCount++;

            var matName = obj.MaterialName || "No material";
            var thickness = obj.Thickness || 0;
            var matInfo = splitName(matName);

            var key = matName + "|" + thickness;
            if (!materials[key]) {
                materials[key] = {
                    name: matInfo.name,
                    code: matInfo.code,
                    thickness: thickness,
                    count: 0,
                    edges: {},
                    details: []
                };
            }

            var m = materials[key];
            m.count++;

            // Extract material texture/properties (Path, ColorUse, DiffuseColor, Tex* etc.).
            // Set only once per material key (so the first panel of each material defines it).
            try {
                if (!m._propsRead) {
                    var matObj = null;
                    try { matObj = obj.Material; } catch (eMatObj) {}
                    if (matObj) {
                        try { if (matObj.Path) m.texturePath = String(matObj.Path); } catch (e) {}
                        try { if (matObj.ColorUse !== undefined && matObj.ColorUse !== null) m.textureUseColor = matObj.ColorUse ? true : false; } catch (e) {}
                        try { if (matObj.DiffuseColor !== undefined && matObj.DiffuseColor !== null) m.color = matObj.DiffuseColor; } catch (e) {}
                        try { if (matObj.TexSX != null && !isNaN(Number(matObj.TexSX))) m.texStepX = Number(matObj.TexSX); } catch (e) {}
                        try { if (matObj.TexSY != null && !isNaN(Number(matObj.TexSY))) m.texStepY = Number(matObj.TexSY); } catch (e) {}
                        try { if (matObj.TexDX != null && !isNaN(Number(matObj.TexDX))) m.texOffsetX = Number(matObj.TexDX); } catch (e) {}
                        try { if (matObj.TexDY != null && !isNaN(Number(matObj.TexDY))) m.texOffsetY = Number(matObj.TexDY); } catch (e) {}
                        try { if (matObj.Angle != null && !isNaN(Number(matObj.Angle))) m.texAngle = Number(matObj.Angle); } catch (e) {}
                        try { if (matObj.MirrorValue !== undefined && matObj.MirrorValue !== null) m.texMirror = matObj.MirrorValue ? true : false; } catch (e) {}
                        try { if (matObj.Stretch !== undefined && matObj.Stretch !== null) m.texStretch = matObj.Stretch ? true : false; } catch (e) {}
                        m._propsRead = true;
                    }
                }
            } catch (eMatBlock) {}

            var w = obj.ContourWidth || 0;
            var h = obj.ContourHeight || 0;

            var cuts = [];
            if (obj.Cuts) {
                try {
                    for (var ci = 0; ci < obj.Cuts.Count; ci++) {
                        var cut = obj.Cuts.Cuts[ci];
                        if (!cut) continue;
                        var cName = cut.Name || "";
                        var cSign = cut.Sign || "";
                        if (!cSign && cut.Params && cut.Params.Sign) cSign = cut.Params.Sign;
                        var cutType = "";
                        try {
                            cutType = (cut.CutType === panelOperations.cutType.extrusion) ? "extrusion" : "freeForm";
                        } catch (e2) {}
                        cuts.push({
                            name: cName,
                            sign: cSign,
                            type: cutType,
                            thickness: cut.Thickness || 0,
                            frontSide: !!cut.FrontSide
                        });
                    }
                } catch (eCut) {}
            }

            var designation = "";
            try { designation = obj.ArtPos || ""; } catch (eDes) {}

            m.details.push({
                name: obj.Name || "Panel",
                position: designation,
                width: r4(w),
                height: r4(h),
                cuts: cuts
            });

            if (obj.Butts) {
                for (var i = 0; i < obj.Butts.Count; i++) {
                    var butt = obj.Butts.Butts[i];
                    if (butt && butt.Material) {
                        var buttInfo = splitName(butt.Material);
                        var buttKey = buttInfo.name;
                        if (buttKey) {
                            if (!m.edges[buttKey]) {
                                m.edges[buttKey] = {
                                    name: buttInfo.name,
                                    code: buttInfo.code,
                                    width: butt.Width || 0,
                                    thickness: butt.Thickness || 0,
                                    count: 0
                                };
                            }
                            m.edges[buttKey].count++;
                        }
                    }
                }
            }
        } else if (obj instanceof TExtrusionBody) {
            profilesCount++;

            var pName = obj.Name || "Profile";
            var pInfo = splitName(pName);

            // Material of the profile: name and its articul (after "\r"). The articul for
            // a profile is the material's articul - everything else works with it.
            var pMatInfo = splitName(obj.MaterialName);
            var pMat = (pMatInfo && pMatInfo.name) || "";
            var pMatCode = (pMatInfo && pMatInfo.code) || "";

            // Extract articul embedded as "(articul NNN)" in the profile name and strip it from the name.
            var pCode = pInfo.code;
            var ART_PAT = /\(\s*[\u0410\u0430]\u0440\u0442\u0438\u043A\u0443\u043B\s+(\d+)\s*\)/;
            var mArticul = pInfo.name.match(ART_PAT);
            if (mArticul) {
                if (!pCode) pCode = mArticul[1];
                pInfo.name = pInfo.name.replace(ART_PAT, "").replace(/\s{2,}/g, " ").trim();
            }
            var profileCode = pMatCode || pCode;

            var pKey = pInfo.name + "|" + pMat;
            if (!profiles[pKey]) {
                profiles[pKey] = {
                    name: pInfo.name,
                    code: profileCode,
                    material: pMat,
                    materialCode: pMatCode,
                    details: {}
                };
            }
            var pr = profiles[pKey];

            var pw = 0, pt = 0, pl = 0;
            try {
                if (obj.GSize) {
                    pw = r4(obj.GSize.x) || 0;
                    pt = r4(obj.GSize.y) || 0;
                    pl = r4(obj.GSize.z) || 0;
                }
            } catch (e) {}

            var sizeKey = pw + "|" + pt + "|" + pl;
            if (!pr.details[sizeKey]) {
                pr.details[sizeKey] = {
                    width: pw,
                    thickness: pt,
                    length: pl,
                    count: 0,
                    positions: []
                };
            }
            pr.details[sizeKey].count++;
            var pDesignation = "";
            try { pDesignation = obj.ArtPos || ""; } catch (eDes) {}
            if (pDesignation) {
                var det0 = pr.details[sizeKey];
                if (det0.positions.indexOf(pDesignation) === -1) det0.positions.push(pDesignation);
            }
        }

        if (obj instanceof TDraftBlock) {
            draftsCount++;
            var dName = obj.Name || "Semi-finished";
            var dInfo = splitName(dName);
            var dKey = "PF:" + dInfo.name;
            if (!fittings[dKey]) {
                fittings[dKey] = { name: dInfo.name, code: dInfo.code, count: 0, isDraft: true };
            }
            fittings[dKey].count++;
        }

        if (obj instanceof TFastener) {
            fastenersCount++;
            var name = obj.Name || "Unknown fitting";
            var info = splitName(name);

            // ������ ��������� (��� ������ �����������)
            var elements = getFastenerElements(obj);
            if (elements && elements.length > 0) {
                compositeCount++;

                // ��������: ������� � ��������� �������� (elements)
                if (!fittings[info.name]) {
                    fittings[info.name] = {
                        name: info.name,
                        code: info.code,
                        count: 0,
                        isComposite: true,
                        elements: elements
                    };
                } else {
                    fittings[info.name].count = fittings[info.name].count || 0;
                    fittings[info.name].isComposite = true;
                    fittings[info.name].elements = elements;
                }
                fittings[info.name].count++;

                // �������� ������� - ��������� ������� � fittings
                // (��� ����, ������������ � ����� ���������)
                var flat = flattenElements(elements);
                for (var ei = 0; ei < flat.length; ei++) {
                    var ev = flat[ei];
                    if (isSameAsParent(ev, info.name, info.code)) continue;
                    var eKey = "EL:" + ev.name + "|" + (ev.code || "");
                    if (!compositionItems[eKey]) {
                        compositionItems[eKey] = { name: ev.name, code: ev.code || "", count: 0, isComposition: true };
                    }
                    compositionItems[eKey].count++;
                }
            } else {
                // ��������� ����� ��� ������� - ��������� ��� ������
                if (!fittings[info.name]) {
                    fittings[info.name] = { name: info.name, code: info.code, count: 0 };
                }
                fittings[info.name].count++;
            }
        }

        if (obj instanceof TFurnAsm) {
            fastenersCount++;
            var name = obj.Name || "Unknown assembly";
            var info = splitName(name);

            if (!fittings[info.name]) {
                fittings[info.name] = { name: info.name, code: info.code, count: 0 };
            }
            fittings[info.name].count++;
        }
    } catch (e) {}

    try {
        if (obj instanceof TDraftBlock) return; // полуфабрикат: только сам, без вмісту
        if (obj.List) {
            var childList = obj.AsList();
            if (childList) {
                for (var i = 0; i < childList.Count; i++) {
                    var child = childList.Objects[i];
                    if (child) scanObject(child);
                }
            }
        }
    } catch (e) {}
}

try {
    var model = Model;
    if (model) {
        for (var i = 0; i < model.Count; i++) {
            var obj = model.Objects[i];
            if (obj) scanObject(obj);
        }
    }
} catch (e) {
    alert("SCAN ERROR: " + e.message);
    Action.Finish();
}

// ���������� �������� ������� � ����� ������ ���������
var compKeys = Object.keys(compositionItems);
for (var ci = 0; ci < compKeys.length; ci++) {
    var compObj = compositionItems[compKeys[ci]];
    if (!fittings[compObj.name]) {
        fittings[compObj.name] = compObj;
    } else {
        fittings[compObj.name].count = (fittings[compObj.name].count || 0) + compObj.count;
        if (compObj.code && !fittings[compObj.name].code) fittings[compObj.name].code = compObj.code;
    }
}

// Dialog on start: "Open OBI" (save + launch app) or "Save" (save JSON only).
// JSON is written NEXT TO THE MODEL (<model dir>\<Article.Name>.json).
// Fallback (model never saved to disk): scriptDir\data\projects\<name>.json.

function getOrderShortName() {
    if (typeof Article !== "undefined" && Article && Article.OrderName) {
        return String(Article.OrderName);
    }
    return getOrderName();
}

function toEdgeArray(edgesObj) {
    return Object.values(edgesObj);
}

// --- Model file path (Bazis API: Action.ModelFilename / Action.Control.Owner.FileName) ---
function getModelFullPath() {
    try {
        if (typeof system !== "undefined" && system && system.apiVersion < 1000) {
            var fn = Action.Control.Owner.FileName;
            if (fn) return String(fn);
        }
    } catch (e) {}
    try {
        if (typeof Action !== "undefined" && Action.ModelFilename) return String(Action.ModelFilename);
    } catch (e2) {}
    return "";
}

function getModelDir() {
    var p = getModelFullPath();
    var i = p.lastIndexOf("\\");
    return (i > -1) ? p.substring(0, i) : "";
}

function getModelBaseName() {
    var p = getModelFullPath();
    var i = p.lastIndexOf("\\");
    var f = (i > -1) ? p.substring(i + 1) : p;
    var j = f.lastIndexOf(".");
    return (j > 0) ? f.substring(0, j) : f;
}

var MODEL_DIR = getModelDir();
var MODEL_BASE = getModelBaseName();

// ============ TEXTURE EXTRACTION FROM BAZIS SETTINGS ============
// Bazis stores texture directory in %APPDATA%\Bazis\Settings.xml (cp1251) under
// <PathTEXTUR>C:\path\to\textures\</PathTEXTUR>. Material objects expose a relative
// texture path via .Path (e.g. "Kashtan\ЛДСП\Дуб канюн крофт.jpg" or "#EGGER\F1861.jpg").
// We read the file (PNG/JPG/BMP, cap 2 MB) and embed it as a base64 data URI in JSON.

function getBazisTextureDir() {
    try {
        var appdata = process.env.APPDATA || "";
        if (!appdata) return "";
        var settingsPath = appdata + "\\Bazis\\Settings.xml";
        var fs = require("fs");
        var raw = fs.readFileSync(settingsPath, { encoding: "cp1251" });
        // Try PathTEXTUR and PathTEXTURE (older Bazis variants)
        var m = raw.match(/<Path(?:TEXTUR|TEXTURE)[^>]*>([^<]*)<\/Path(?:TEXTUR|TEXTURE)>/i);
        if (m && m[1]) {
            return m[1].replace(/&amp;/g, "&").replace(/[\\/]+$/, "").trim();
        }
    } catch (e) {}
    return "";
}

function resolveTexturePath(relativePath, baseDir) {
    if (!relativePath || !baseDir) return "";
    var p = String(relativePath).replace(/\//g, "\\");
    // Normalize backslashes; collapse leading ones (UNC paths) but keep absolute
    while (p.indexOf("\\\\") !== -1) p = p.replace(/\\\\/g, "\\");
    var full;
    if (/^[A-Za-z]:\\/.test(p)) full = p;
    else full = baseDir + "\\" + p;
    try {
        var fs = require("fs");
        if (fs.existsSync(full)) return full;
    } catch (e) {}
    return "";
}

function encodeTextureAsDataUri(absPath) {
    try {
        var fs = require("fs");
        var stat = fs.statSync(absPath);
        var MAX_TEX_SIZE = 2 * 1024 * 1024;
        if (stat.size > MAX_TEX_SIZE) return null;
        var buf = fs.readFileSync(absPath);
        var dotIdx = absPath.lastIndexOf(".");
        var ext = (dotIdx >= 0) ? absPath.substring(dotIdx + 1).toLowerCase() : "";
        var mime;
        if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
        else if (ext === "png") mime = "image/png";
        else if (ext === "bmp") mime = "image/bmp";
        else mime = "application/octet-stream";
        return "data:" + mime + ";base64," + buf.toString("base64");
    } catch (e) {
        return null;
    }
}

function applyTexturesToMaterials(mats, baseDir) {
    var stats = { embedded: 0, missing: 0, oversized: 0, skipped: 0 };
    if (!baseDir) return stats;
    var fs = require("fs");
    var matsArr = Object.values(mats);
    for (var i = 0; i < matsArr.length; i++) {
        var m = matsArr[i];
        if (!m.texturePath) continue;
        if (m.textureUseColor === true) continue; // solid color, no texture
        var abs = resolveTexturePath(m.texturePath, baseDir);
        if (!abs) { stats.missing++; continue; }
        var data = encodeTextureAsDataUri(abs);
        if (data === null) { stats.oversized++; continue; }
        m.textureData = data;
        stats.embedded++;
    }
    return stats;
}

var TEX_BASE_DIR = getBazisTextureDir();
var TEX_STATS = applyTexturesToMaterials(materials, TEX_BASE_DIR);

var jsonData = {
    date: new Date().toString(),
    name: getOrderName(),
    orderName: getOrderShortName(),
    modelFile: MODEL_BASE,
    totalObjects: totalObjects,
    panelsCount: panelsCount,
    profilesCount: profilesCount,
    fastenersCount: fastenersCount,
    materials: Object.values(materials).map(function (m) {
        var out = {
            name: m.name,
            code: m.code,
            thickness: m.thickness,
            count: m.count,
            edges: toEdgeArray(m.edges),
            details: m.details
        };
        if (m.texturePath) out.texturePath = m.texturePath;
        if (m.textureData) out.textureData = m.textureData;
        if (m.textureUseColor !== undefined) out.textureUseColor = m.textureUseColor;
        if (m.color !== undefined) out.color = m.color;
        if (m.texStepX !== undefined) out.texStepX = m.texStepX;
        if (m.texStepY !== undefined) out.texStepY = m.texStepY;
        if (m.texOffsetX !== undefined) out.texOffsetX = m.texOffsetX;
        if (m.texOffsetY !== undefined) out.texOffsetY = m.texOffsetY;
        if (m.texAngle !== undefined) out.texAngle = m.texAngle;
        if (m.texMirror !== undefined) out.texMirror = m.texMirror;
        if (m.texStretch !== undefined) out.texStretch = m.texStretch;
        return out;
    }),
    profiles: Object.values(profiles).map(function (p) {
        return {
            name: p.name,
            code: p.code,
            material: p.material,
            details: Object.values(p.details)
        };
    }),
    fittings: Object.values(fittings)
};

var jsonString = JSON.stringify(jsonData, null, 2);

// Texture extraction summary (logged to console; surfaces in Bazis journal).
try {
    console.log("OBI: textures embedded=" + TEX_STATS.embedded
        + " missing=" + TEX_STATS.missing
        + " oversized=" + TEX_STATS.oversized
        + " baseDir=" + (TEX_BASE_DIR || "(none)"));
} catch (eLog) {}

// --- Paths / exe search ---
var scriptDir = "";
if (typeof __dirname !== "undefined" && __dirname) {
    scriptDir = __dirname;
} else if (typeof __filename !== "undefined" && __filename) {
    scriptDir = __filename.substring(0, __filename.lastIndexOf("\\"));
} else if (typeof process !== "undefined" && process.cwd && process.cwd()) {
    scriptDir = process.cwd();
}

function hasFile(p) {
    try {
        var fs = require('fs');
        return fs.existsSync(p);
    } catch (e) { return false; }
}

function parentDir(dir) {
    var i = dir.lastIndexOf("\\");
    return (i > -1) ? dir.substring(0, i) : "";
}

function findExePath(startDir) {
    if (startDir) {
        var near = startDir + "\\OBI.exe";
        if (hasFile(near)) return near;
    }
    try {
        var fs = require('fs');
        if (startDir) {
            var cfg = startDir + "\\data\\exe_path.txt";
            if (fs.existsSync(cfg)) {
                var saved = fs.readFileSync(cfg, 'utf-8').trim();
                if (saved && hasFile(saved)) return saved;
            }
        }
    } catch (e) {}
    if (startDir) {
        var devPaths = [
            startDir + "\\dist\\OBI.exe",
            startDir + "\\dist\\release\\OBI.exe"
        ];
        for (var di = 0; di < devPaths.length; di++) {
            if (hasFile(devPaths[di])) return devPaths[di];
        }
    }
    var walk = [];
    var cur = startDir;
    for (var i = 0; i < 4 && cur; i++) {
        cur = parentDir(cur);
        if (cur) walk.push(cur);
    }
    if (typeof process !== "undefined" && process.cwd && process.cwd()) {
        walk.push(process.cwd());
    }
    for (var j = 0; j < walk.length; j++) {
        var p1 = walk[j] + "\\OBI.exe";
        if (hasFile(p1)) return p1;
        var p2 = walk[j] + "\\dist\\OBI.exe";
        if (hasFile(p2)) return p2;
    }
    return "";
}

function askExePath(startDir) {
    try {
        if (!(typeof UI !== "undefined" && UI && UI.dialogs && UI.dialogs.RunOpenFileDialog)) return "";
        var dp = { extensions: ['exe'], initialDir: startDir || "", title: "\u0423\u043A\u0430\u0436\u0456\u0442\u044C OBI.exe" };
        var chosen = UI.dialogs.RunOpenFileDialog(dp);
        if (!chosen || !hasFile(chosen)) return "";
        try {
            var fs = require('fs');
            if (startDir) {
                if (!fs.existsSync(startDir + "\\data")) fs.mkdirSync(startDir + "\\data");
                fs.writeFileSync(startDir + "\\data\\exe_path.txt", chosen, 'utf-8');
            }
        } catch (e) {}
        return chosen;
    } catch (e) { return ""; }
}

function ensureDir(dir) {
    try {
        var fs = require('fs');
        if (!dir || fs.existsSync(dir)) return true;
        var p = parentDir(dir);
        if (p && p !== dir) ensureDir(p);
        fs.mkdirSync(dir);
        return true;
    } catch (e) { return false; }
}

// --- JSON target: next to the model (fallback: script data\projects) ---
function targetJsonPath() {
    var name = sanitizeFilename(getOrderName());
    if (MODEL_DIR) {
        var base = name ? name : (MODEL_BASE ? MODEL_BASE : "db");
        return MODEL_DIR + "\\" + base + ".json";
    }
    var fbDir = (scriptDir || ".") + "\\data\\projects";
    return fbDir + "\\" + (name ? name : "db") + ".json";
}

function saveJsonNextToModel() {
    var fs = require('fs');
    var p = targetJsonPath();
    ensureDir(parentDir(p));
    fs.writeFileSync(p, jsonString, 'utf-8');
    return p;
}

function launchExe(projectJsonPath) {
    var EXE_PATH = findExePath(scriptDir);
    if (!EXE_PATH) EXE_PATH = askExePath(scriptDir);
    if (!EXE_PATH) {
        alert("OBI.exe \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E.\n\u0414\u0430\u043D\u0456 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E: " + projectJsonPath);
        return;
    }
    try {
        var cps = require('child_process');
        var spawnArgs = ["--project", require('path').resolve(projectJsonPath)];
        var child = cps.spawn(EXE_PATH, spawnArgs, { detached: true, stdio: 'ignore', windowsHide: true });
        child.on('error', function (err) {
            alert("\u041F\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u043f\u0443\u0441\u043a\u0443: " + (err.message || err));
        });
        if (child.unref) child.unref();
    } catch (e) {
        alert("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u043f\u0443\u0441\u043a\u0443: " + e.message);
    }
}

// "Save" button: write JSON only.
function saveOnly() {
    try {
        var p = saveJsonNextToModel();
        alert("\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E: " + p);
    } catch (e) {
        alert("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F: " + e.message);
    }
}

// "Open OBI" button: write JSON + launch OBI.exe with --project.
function saveAndOpen() {
    try {
        var p = saveJsonNextToModel();
        launchExe(p);
    } catch (e) {
        alert("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044f: " + e.message);
    }
}

// --- Choice dialog (Bazis Forms API); fallback: save + launch silently ---
try {
    if (typeof NewForm !== "function") throw new Error("no-forms");
    var W = { Form: NewForm() };
    var P = W.Form.Properties;
    W.Form.Width = 330;
    W.Form.Height = 150;
    W.Form.Caption = "OBI";
    W.Info = P.NewLabel("\u0414\u0430\u043D\u0456 \u0432\u0438\u0440\u043E\u0431\u0443 \u0437\u0456\u0431\u0440\u0430\u043D\u043E. \u0429\u043E \u0434\u0430\u043B\u0456?");
    W.Info.SetLayout(14, 12, 300, 20);
    W.BtnOpen = P.NewButton("\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 OBI");
    W.BtnOpen.SetLayout(22, 52, 135, 36);
    W.BtnSave = P.NewButton("\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438");
    W.BtnSave.SetLayout(171, 52, 135, 36);
    W.BtnOpen.OnClick = function () { saveAndOpen(); W.Form.Close(); };
    W.BtnSave.OnClick = function () { saveOnly(); W.Form.Close(); };
    W.Form.OnClose = function () { Action.Finish(); };
    W.Form.ShowModal();
} catch (eForm) {
    saveAndOpen();
    Action.Finish();
}
