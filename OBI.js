// ============================================================
// OBI - ADV: как OBI.js, но состав фурнитуры вынимается через
// GetParams('AdvParamData') -> FindNode('Elements')
// 1. Scan model
// 2. Save to data/db.json (UTF-8)
// 3. Launch OBI.exe
//
// Правило для фурнитуры С составом:
//   - родитель остаётся в db как позиция с полем elements (вложенность),
//     чтобы в базе было видно, из чего состоит;
//   - элементы состава (все уровни вложенности) добавляются в fittings
//     отдельными позициями (isComposition: true);
//   - элемент, совпадающий с самим родителем (имя+код), в список НЕ попадает.
// Без состава - крепёж добавляется просто как позиция.
// ============================================================

var materials = {};   // TFurnPanel -> keyed by matName|thickness, with per-material edges
var profiles = {};    // TExtrusionBody
var fittings = {};    // TFastener
var totalObjects = 0;
var panelsCount = 0;
var profilesCount = 0;
var fastenersCount = 0;
var draftsCount = 0;
var compositeCount = 0; // фурнитур, у которых найден состав (AdvParamData/Elements)
var compositionItems = {}; // элементы состава по ключу name|code

// Extract article from a name like "...мм\r26534"
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

// --- извлекаем состав фурнитуры (как в присланном скрипте) ---
// Имя/код узла: из node.Name, либо из node.Value ("Имя\rКод").
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

// Выпрямляет дерево состава в плоский список ВСЕХ узлов всех уровней.
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

// Согласуется ли узел состава с самим родителем (имя+код)?
function isSameAsParent(e, parentName, parentCode) {
    if (!e || !e.name) return false;
    if (e.name !== parentName) return false;
    if (parentCode) return e.code === parentCode;
    return true;
}

function scanObject(obj) {
    if (!obj) return;
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

            m.details.push({
                name: obj.Name || "Panel",
                width: Math.round(w),
                height: Math.round(h),
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
            var pMat = (obj.MaterialName && splitName(obj.MaterialName).name) || "";

            var pKey = pInfo.name;
            if (!profiles[pKey]) {
                profiles[pKey] = {
                    name: pInfo.name,
                    code: pInfo.code,
                    material: pMat,
                    details: {}
                };
            }
            var pr = profiles[pKey];

            var pw = 0, pt = 0, pl = 0;
            try {
                if (obj.GSize) {
                    pw = Math.round(obj.GSize.x) || 0;
                    pt = Math.round(obj.GSize.y) || 0;
                    pl = Math.round(obj.GSize.z) || 0;
                }
            } catch (e) {}

            var sizeKey = pw + "|" + pt + "|" + pl;
            if (!pr.details[sizeKey]) {
                pr.details[sizeKey] = {
                    width: pw,
                    thickness: pt,
                    length: pl,
                    count: 0
                };
            }
            pr.details[sizeKey].count++;
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

            // состав фурнитуры (все уровни вложенности)
            var elements = getFastenerElements(obj);
            if (elements && elements.length > 0) {
                compositeCount++;

                // родитель: позиция с вложенным составом (elements)
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

                // элементы состава - отдельные позиции в fittings
                // (без узла, совпадающего с самим родителем)
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
                // одиночный крепёж без состава - добавляем сам объект
                if (!fittings[info.name]) {
                    fittings[info.name] = { name: info.name, code: info.code, count: 0 };
                }
                fittings[info.name].count++;
            }
        }
    } catch (e) {}

    try {
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

// объединяем элементы состава в общий список фурнитуры
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

alert("\u041E\u0422\u0421\u041A\u0410\u041D\u0418\u0420\u041E\u0412\u0410\u041D\u041E\n\u0414\u0435\u0442\u0430\u043B\u0435\u0439: " + panelsCount + "\n\u041F\u0440\u043E\u0444\u0438\u043B\u0435\u0439: " + profilesCount + "\n\u0424\u0443\u0440\u043D\u0438\u0442\u0443\u0440\u044B: " + fastenersCount + "\u00A0(\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432 \u0441\u043E\u0441\u0442\u0430\u0432\u0430: " + compKeys.length + ")\n\u0421 \u0441\u043E\u0441\u0442\u0430\u0432\u043E\u043C: " + compositeCount + "\n\u041F/\u0444 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043E\u043A: " + draftsCount);

function toEdgeArray(edgesObj) {
    return Object.values(edgesObj);
}

var jsonData = {
    date: new Date().toString(),
    totalObjects: totalObjects,
    panelsCount: panelsCount,
    profilesCount: profilesCount,
    fastenersCount: fastenersCount,
    materials: Object.values(materials).map(function (m) {
        return {
            name: m.name,
            code: m.code,
            thickness: m.thickness,
            count: m.count,
            edges: toEdgeArray(m.edges),
            details: m.details
        };
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

// --- Paths ---
// DB всегда пишется в data\db.json РЯДОМ СО СКРИПТОМ (корень проекта).
// OBI.exe ищется по-прежнему (рядом/ранее выбранный/пользователем), но используется только для запуска.
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
        var dp = { extensions: ['exe'], initialDir: startDir || "", title: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 OBI.exe" };
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

var EXE_PATH = findExePath(scriptDir);
if (!EXE_PATH) {
    EXE_PATH = askExePath(scriptDir);
}

if (!EXE_PATH) {
    alert("OBI.exe \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.\n\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B: \u043F\u0430\u043F\u043A\u0430 \u0441\u043A\u0440\u0438\u043F\u0442\u0430, dist\\, \u0432\u0435\u0440\u0445\u043D\u0438\u0435 \u043F\u0430\u043F\u043A\u0438, \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433.\n\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 OBI.exe \u0440\u044F\u0434\u043E\u043C \u0441 OBI.js \u0438\u043B\u0438 \u0432 \u043F\u0430\u043F\u043A\u0443 dist.");
    Action.Finish();
} else {
    var DATA_DIR = (scriptDir || ".") + "\\data";
    var EXE_DATA_DIR = (parentDir(EXE_PATH) || ".") + "\\data";

    try {
        var fs = require('fs');
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        fs.writeFileSync(DATA_DIR + "\\db.json", jsonString, 'utf-8');
        if (EXE_DATA_DIR && EXE_DATA_DIR !== DATA_DIR) {
            if (!fs.existsSync(EXE_DATA_DIR)) fs.mkdirSync(EXE_DATA_DIR);
            fs.writeFileSync(EXE_DATA_DIR + "\\db.json", jsonString, 'utf-8');
        }
    } catch (e) {
        alert("\u041E\u0428\u0418\u0411\u041A\u0410 \u0421\u041E\u0425\u0420\u0410\u041D\u0415\u041D\u0418\u042f: " + e.message);
        Action.Finish();
    }

    try {
        var exec = require('child_process').exec;
        exec('start "" "' + EXE_PATH + '"', function(error) {
            if (error) {
                alert("\u041E\u0428\u0418\u0411\u041A\u0410 \u0417\u0410\u041F\u0423\u0421\u041A\u0410: " + error.message);
            }
            Action.Finish();
        });
    } catch (e) {
        alert("\u041E\u0428\u0418\u0411\u041A\u0410 \u0417\u0410\u041F\u0423\u0421\u041A\u0410: " + e.message);
        Action.Finish();
    }
}