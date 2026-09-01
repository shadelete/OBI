// ============================================================
// OBI - BUILD SCRIPTER COMBINED
// 1. Scan model
// 2. Save to data/db.json (UTF-8)
// 3. Launch OBI.exe
// ============================================================

var materials = {};   // TFurnPanel -> keyed by matName|thickness, with per-material edges
var profiles = {};    // TExtrusionBody
var fittings = {};    // TFastener
var totalObjects = 0;
var panelsCount = 0;
var profilesCount = 0;
var fastenersCount = 0;
var draftsCount = 0;

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
            m.details.push({
                name: obj.Name || "Panel",
                width: Math.round(w),
                height: Math.round(h)
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
            if (!fittings[info.name]) {
                fittings[info.name] = { name: info.name, code: info.code, count: 0 };
            }
            fittings[info.name].count++;
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

alert("ОТСКАНИРОВАНО\nДеталей: " + panelsCount + "\nПрофилей: " + profilesCount + "\nФурнитуры: " + fastenersCount + "\nП/ф заготовок: " + draftsCount);

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
// The script auto-detects its own folder.
// Put mebel-script.js and OBI.exe in one folder (folder name without Cyrillic recommended).
var scriptDir = "";
if (typeof __dirname !== "undefined" && __dirname) {
    scriptDir = __dirname;
}
if (!scriptDir) {
    if (typeof process !== "undefined" && process.cwd && process.cwd()) {
        scriptDir = process.cwd();
    }
}
if (!scriptDir) {
    alert("Не удалось определить папку программы.\nПоместите mebel-script.js и OBI.exe в одну папку и запустите скрипт из неё.");
    Action.Finish();
}
var DATA_DIR = scriptDir + "\\data";
var DB_PATH = DATA_DIR + "\\db.json";
var EXE_PATH = scriptDir + "\\OBI.exe";

try {
    var fs = require('fs');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, jsonString, 'utf-8');
} catch (e) {
    alert("ОШИБКА СОХРАНЕНИЯ: " + e.message);
    Action.Finish();
}

try {
    var fs = require('fs');
    var exec = require('child_process').exec;
    if (!fs.existsSync(EXE_PATH)) {
        alert("EXE НЕ НАЙДЕН: " + EXE_PATH + "\nПоместите OBI.exe рядом с mebel-script.js");
        Action.Finish();
        return;
    }
    exec('start "" "' + EXE_PATH + '"', function(error) {
        if (error) {
            alert("ОШИБКА ЗАПУСКА: " + error.message);
        }
        Action.Finish();
    });
} catch (e) {
    alert("ОШИБКА ЗАПУСКА: " + e.message);
    Action.Finish();
}
