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

alert("\u041E\u0422\u0421\u041A\u0410\u041D\u0418\u0420\u041E\u0412\u0410\u041D\u041E\n\u0414\u0435\u0442\u0430\u043B\u0435\u0439: " + panelsCount + "\n\u041F\u0440\u043E\u0444\u0438\u043B\u0435\u0439: " + profilesCount + "\n\u0424\u0443\u0440\u043D\u0438\u0442\u0443\u0440\u044B: " + fastenersCount + "\n\u041F/\u0444 \u0437\u0430\u0433\u043E\u0442\u043E\u0432\u043E\u043A: " + draftsCount);

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
// OBI.exe is searched for: next to the script, up to 4 levels above it,
// in the current working directory, or selected by the user via file dialog.
// Put mebel-script.js and OBI.exe in one folder for best results.
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
    try {
        var fs = require('fs');
        var cfg = startDir + "\\data\\exe_path.txt";
        if (fs.existsSync(cfg)) {
            var saved = fs.readFileSync(cfg, 'utf-8').trim();
            if (saved && hasFile(saved)) return saved;
        }
    } catch (e) {}

    var candidates = [];
    if (startDir) candidates.push(startDir);
    var cur = startDir;
    for (var i = 0; i < 4 && cur; i++) {
        cur = parentDir(cur);
        if (cur) candidates.push(cur);
    }
    if (typeof process !== "undefined" && process.cwd && process.cwd()) {
        candidates.push(process.cwd());
    }
    for (var j = 0; j < candidates.length; j++) {
        var p = candidates[j] + "\\OBI.exe";
        if (hasFile(p)) return p;
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
if (!scriptDir && EXE_PATH) {
    scriptDir = parentDir(EXE_PATH);
}

if (!EXE_PATH) {
    alert("EXE \u041D\u0415 \u041D\u0410\u0419\u0414\u0415\u041D: " + EXE_PATH + "\n\u041F\u043E\u043C\u0435\u0441\u0442\u0438\u0442\u0435 OBI.exe \u0440\u044F\u0434\u043E\u043C \u0441 mebel-script.js \u0438\u043B\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u043E\u043A\u043D\u0435 \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u0430.");
    Action.Finish();
} else {
    if (!scriptDir) {
        alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B.\n\u041F\u043E\u043C\u0435\u0441\u0442\u0438\u0442\u0435 mebel-script.js \u0438 OBI.exe \u0432 \u043E\u0434\u043D\u0443 \u043F\u0430\u043F\u043A\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
        Action.Finish();
    }
    var DATA_DIR = scriptDir + "\\data";
    var DB_PATH = DATA_DIR + "\\db.json";

    try {
        var fs = require('fs');
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        fs.writeFileSync(DB_PATH, jsonString, 'utf-8');
    } catch (e) {
        alert("\u041E\u0428\u0418\u0411\u041A\u0410 \u0421\u041E\u0425\u0420\u0410\u041D\u0415\u041D\u0418\u042F: " + e.message);
        Action.Finish();
    }

    try {
        var fs = require('fs');
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
