// ============================================================================
// vp_engine.js - ViyarPro export engine, callable from Bazis scripts.
//
// Originally adapted from viyarpro3 (ExportViyar.js v5.10). This is the
// engine-only version with the UI form removed - meant to be called
// programmatically (e.g. from OBI.js via inline copy, or from
// ExportViyar.js standalone via inline copy too).
//
// Public API (set on globalThis.ViyarExport):
//   exportProjects(dir, base, opts) -> { files, totals, furnsCount,
//                                       skipped, elapsedMs, log }
//
// See end of file for the full signature of exportProjects.
// ============================================================================

var DEBUG = true;
var SCRIPT_VERSION = "5.10";

(function () {

const PROGRAM_NAME = 'БазисСкрипт';
const SCRIPT_VERSION = '5.10';
const OBJ_TREE_FILE_NAME = 'ObjTree.js';
const NOTEPAD_DEFAULT_PATH = 'C:/Windows/notepad.exe';
const PROPERTIES_FILE = 'Экспорт проекта ViyarPro.xml';
const PATH_FILE = 'Экспорт проекта ViyarPro.path';
const VIYAR_PRO_PROJECT_FILE = 'Файл проекта ViyarPro: ';
const PASSWORD = 'c928f7180e21ff8eae69f0b039d5279e90fa68607851d1a3835b8de2b739dba7';

const POSITION_NAME_FORMAT = 'Позиция.Наименование';
const DESIGNATION_NAME_FORMAT = 'Обозначение.Наименование';
const ORDER_POSITION_NAME_FORMAT = 'Заказ.Позиция.Наименование';
const ORDER_DESIGNATION_NAME_FORMAT = 'Заказ.Обозначение.Наименование';
const NAME_FORMAT = 'Наименование';

const DRAFT_BLOCK_METHOD = 'Блок';
const DRAFT_ASM_METHOD = 'Сборка';
const DRAFT_METHOD_LIST = DRAFT_BLOCK_METHOD + '\n' + DRAFT_ASM_METHOD;

const ELEM_LINE_TYPE = 1;
const ELEM_ARC_TYPE = 2;
const ELEM_CIRCLE_TYPE = 3;
const ELEM_LIST_TYPE = 4;
const ELEM_ELLIPSE_TYPE = 5;

const BUTT_WIDTH_MANUFACT_RULE = 3;

const PANEL_TEXTURE_UNDEFINED = 0;
const PANEL_TEXTURE_HORIZONTAL = 1;
const PANEL_TEXTURE_VERTICAL = 2;

const PANEL_FACE_SIDE_1 = 0;
const PANEL_FACE_SIDE_2 = 1;
const PANEL_FACE_UNDEFINED = 2;

const PANEL_UNDEFINED_TYPE = 0;
const PANEL_DOOR_TYPE = 1;
const PANEL_COUNTERTOP_TYPE = 2;
const PANEL_PEDESTAL_TYPE = 3;

const HOLE_AUTO_TYPE = 0;
const HOLE_THRU_TYPE = 1;
const HOLE_BLIND_TYPE = 2;
const MIN_HOLE_DEPTH = 0.3;
const MIN_HOLE_WALL = 0.1;

const ALERT_TIMEOUT = 100 * 1000;
const HINT_TIMEOUT = 140;

const PRECISION = 0.1;
const FLOAT = 0.01;
const DELTA = 4.0;

const VIYAR_UNDEFINED = -1;

const VIYAR_FRONT_SIDE = 1;
const VIYAR_LEFT_SIDE = 2;
const VIYAR_TOP_SIDE = 3;
const VIYAR_RIGHT_SIDE = 4;
const VIYAR_BOTTOM_SIDE = 5;
const VIYAR_BACK_SIDE = 6;

const VIYAR_RABBETING = 1;
const VIYAR_GROOVING = 2;
const VIYAR_BEVEL = 3;

const VIYAR_HORIZONTAL_CUT = 0;
const VIYAR_VERTICAL_CUT = 1;

const VIYAR_BOTH_COVERING = 0;
const VIYAR_HORIZONTAL_COVERING = 1;
const VIYAR_VERTICAL_COVERING = 2;

const VIYAR_WITHOUT_CORNER = 0;
const VIYAR_RADIUS_CORNER = 1;
const VIYAR_ANGLE_CUT_CORNER = 2;
const VIYAR_CUTOUT_CORNER = 3;

const VIYAR_CORNER_OPERATION = 'cornerOperation';
const VIYAR_SHAPE_BY_PATTERN = 'shapeByPattern';
const VIYAR_PATTERN_U_SHAPE = 'uShaped';
const VIYAR_PATTERN_RECTANGULAR = 'rectangular';
const VIYAR_PATTERN_CIRCLE = 'circle';
const VIYAR_PATTERN_ARC = 'arc';
const VIYAR_PATTERN_SMILE = 'smile';

const VIYAR_COUNTERSINK_HOLE = '48';

const VIYAR_WITHOUT_CLIPPING = 0;
const VIYAR_HORIZONTAL_CLIPPING = 1;
const VIYAR_VERTICAL_CLIPPING = 2;
const VIYAR_CLIPPING_THRESHOLD = 70.0;
const VIYAR_CLIPPING_EXTRA = 70.0;

const VIYAR_WITHOUT_EXT = 0;
const VIYAR_WITH_EXT = 1;
const VIYAR_NOT_STANDART_SMILE = 0;
const VIYAR_STANDART_SMILE = 1;
const VIYAR_OUTER_ARC = 0;
const VIYAR_INNER_ARC = 1;

const VIYAR_ANGLE_CUT_THRESHOLD = 1.0;
const VIYAR_RECT_SHAPE_THRESHOLD = 10.0;
const VIYAR_RADIUS_CORNER_THRESHOLD = 10.0;
const VIYAR_CUTOUT_THRESHOLD = 3.0;
const VIYAR_ARC_THRESHOLD = 50.0;
const VIYAR_SMILE_THRESHOLD = 5.0;

const VIYAR_MINIMUM_RADIUS = 3.0;
const KONFIRMAT_HOLE_DIAMETER = 7;
const COUNTERSINK_HOLE_DIAMETER = 7.1;

const VIYAR_MAX_MULTIPLICITY = 3;

var contourLog = '';
var grooveLog = '';
var coordsLog = '';
var cutoutLog = '';
var blindDrillThruLog = '';
var thruDrillBlindLog = '';
var drillStartAtDepthLog = '';
var drillExportLog = '';
var clippingLog = '';
var debugLog = '';

var panels = [];
panels.add = function(panel) {
  for (var i = 0; i < this.length; i++) {
	if(this[i].isEqualArtPos(panel)) {
	  if(this[i].isEqual(panel)) {
		this[i].quantity++;
		return;
	  }
	  flipY(panel);
	  if(this[i].isEqual(panel)) {
		this[i].quantity++;
		return;
	  }
	  rotate180(panel);
	  if(this[i].isEqual(panel)) {
		this[i].quantity++;
		return;
	  }
	  flipY(panel);
	  if(this[i].isEqual(panel)) {
		this[i].quantity++;
		return;
	  }
	  rotate180(panel);
	}
  }
  this.push(panel);
};

function Panel(modelPanel) {
  this.quantity = 1;
  this.name = modelPanel.Name;
  this.thickness = modelPanel.ZThickness;
  this.artPos = modelPanel.ArtPos;
  this.designation = '';
  if (system.apiVersion >= 1100) {
	this.designation = modelPanel.Designation;
  }
  this.texture = modelPanel.TextureOrientation;
  this.kind = modelPanel.Kind;
  this.material = new Material(modelPanel.MaterialName, modelPanel.Thickness);
  var plasticsQuantity = calcPlasticsQuantity(modelPanel);
  if (plasticsQuantity > 0) {
	this.material.multiplicity = plasticsQuantity + 1;
  }
  this.face = PANEL_FACE_UNDEFINED;
  if ((system.apiVersion >= 1000) && (modelPanel.FrontFace != undefined) && (modelPanel.FrontFace != null)) {
	this.face = modelPanel.FrontFace;
  }
  this.leftButt = new Butt();
  this.topButt = new Butt();
  this.rightButt = new Butt();
  this.bottomButt = new Butt();

  var contour = NewContour();
  contour.AddList(modelPanel.Contour.MakeCopy());
  var orderedContour = NewContour();
  modelPanel.FindOrderedContour(orderedContour);

  var minX = findMinX(orderedContour);
  var minY = findMinY(orderedContour);
  var maxX = findMaxX(orderedContour);
  var maxY = findMaxY(orderedContour);
  this.length = maxX - minX;
  this.width = maxY - minY;

  orderedContour.Move(minX * -1.0, minY * -1.0);
  this.orderedContour = orderedContour;
  contour.Move(minX * -1.0, minY * -1.0);
  this.contour = contour;

  var contourMinX = findMinX(modelPanel.Contour);
  var contourMinY = findMinY(modelPanel.Contour);
  var contourMaxX = findMaxX(modelPanel.Contour);
  var contourMaxY = findMaxY(modelPanel.Contour);
  var contourSizeX = contourMaxX - contourMinX;
  var contourSizeY = contourMaxY - contourMinY;
  for (var i = 0; i < modelPanel.Contour.Count; i++) {
	var elem = modelPanel.Contour[i];
	var butt = new Butt(elem);
	if ((elem.ElType == ELEM_LINE_TYPE) && butt.isExist) {
	  if(cmpr(elem.Pos1.x, contourMinX) && cmpr(elem.Pos2.x, contourMinX)) {
		if (cmpr(elem.ObjLength(), contourSizeY)) {
		  this.leftButt = butt;
		}
	  }
	  else if(cmpr(elem.Pos1.y, contourMaxY) && cmpr(elem.Pos2.y, contourMaxY)) {
		if (cmpr(elem.ObjLength(), contourSizeX)) {
		  this.topButt = butt;
		}
	  }
	  else if(cmpr(elem.Pos1.x, contourMaxX) && cmpr(elem.Pos2.x, contourMaxX)) {
		if (cmpr(elem.ObjLength(), contourSizeY)) {
		  this.rightButt = butt;
		}
	  }
	  else if(cmpr(elem.Pos1.y, contourMinY) && cmpr(elem.Pos2.y, contourMinY)) {
		if (cmpr(elem.ObjLength(), contourSizeX)) {
		  this.bottomButt = butt;
		}
	  }
	}
  }
  if (modelPanel.Contour.IsContourRectangle()) {
	this.rectangle = true;
  }
  else {
	this.rectangle = false;
  }
  for (var i = 0; i < modelPanel.Contour.Count; i++) {
	var butt = new Butt(modelPanel.Contour[i]);
	if (butt.isExist) {
	  butts.add(butt);
	}
  }
  var lowZ = modelPanel.LowZ;
  var highZ = modelPanel.HighZ;
  var thicknessZ = modelPanel.ZThickness;
  var lengthX = maxX - minX;
  var widthY = maxY - minY;

  var cuts = [];
  var planeCuts = [];
  if (modelPanel.Cuts != undefined) {
	for (var i = 0; i < modelPanel.Cuts.Count; i++) {
	  if ((system.apiVersion >= 1000) && (modelPanel.Cuts[i].Thickness != 0) &&
	  (modelPanel.Cuts[i].Contour.Count > 0) && (modelPanel.Cuts[i].Trajectory.Count == 0)) {
		planeCuts.push(new PlaneCut(minX, minY, modelPanel.Cuts[i].Contour, modelPanel.Cuts[i].Thickness));
	  }
	  else {
		cuts.push(new Cut(minX, minY, lowZ, modelPanel.Cuts[i]));
	  }
	}
  }
  this.cuts = cuts;

  var holes = [];
  globalHoles.forEach(function(globalHole) {
	if (globalHole.passed == false) {
	  var holePos = modelPanel.GlobalToObject(globalHole.pos);
	  var holeEndPos = modelPanel.GlobalToObject(globalHole.endPos);
	  var holeDir = modelPanel.NToObject(globalHole.dir);

	  if (cmpr(holeDir.x, 0) && cmpr(holeDir.y, 0) && modelPanel.Contour.IsPointInside(holePos)) {
		if (cmpr(holePos.z, lowZ) && cmpr(holeDir.z, 1)) {
		  if ((lowZ + globalHole.depth + MIN_HOLE_WALL) < highZ) {
			globalHole.passed = true;
			if (globalHole.mode == HOLE_THRU_TYPE) {
			  thruDrillBlindLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			if (globalHole.cutType == false) {
			  holes.push(new Hole(holePos.x - minX, holePos.y - minY, 0, 0, 0, 1, globalHole.diameter, HOLE_BLIND_TYPE, globalHole.depth));
			}
			else {
			  var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
			  if (planeContour.isExist) {
				planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, globalHole.depth));
			  }
			}
		  }
		  else {
			if (cmpr(globalHole.depth, thicknessZ)) {
			  globalHole.passed = true;
			}
			if (globalHole.mode == HOLE_BLIND_TYPE) {
			  blindDrillThruLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			else {
			  if (globalHole.cutType == false) {
				holes.push(new Hole(holePos.x - minX, holePos.y - minY, 0, 0, 0, 1, globalHole.diameter, HOLE_THRU_TYPE, thicknessZ));
			  }
			  else {
				var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
				if (planeContour.isExist) {
				  planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, 0));
				}
			  }
			}
		  }
		}
		else if (cmpr(holePos.z, highZ) && cmpr(holeDir.z, -1)) {
		  if ((globalHole.depth + MIN_HOLE_WALL) < thicknessZ) {
			globalHole.passed = true;
			if (globalHole.mode == HOLE_THRU_TYPE) {
			  thruDrillBlindLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			if (globalHole.cutType == false) {
			  holes.push(new Hole(holePos.x - minX, holePos.y - minY, thicknessZ, 0, 0, -1, globalHole.diameter, HOLE_BLIND_TYPE, globalHole.depth));
			}
			else {
			  var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
			  if (planeContour.isExist) {
				planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, globalHole.depth * -1.0));
			  }
			}
		  }
		  else {
			if (cmpr(globalHole.depth, thicknessZ)) {
			  globalHole.passed = true;
			}
			if (globalHole.mode == HOLE_BLIND_TYPE) {
			  blindDrillThruLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			else {
			  if (globalHole.cutType == false) {
				holes.push(new Hole(holePos.x - minX, holePos.y - minY, thicknessZ, 0, 0, -1, globalHole.diameter, HOLE_THRU_TYPE, thicknessZ));
			  }
			  else {
				var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
				if (planeContour.isExist) {
				  planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, 0));
				}
			  }
			}
		  }
		}
		else if ((holePos.z < lowZ) && cmpr(holeDir.z, 1)) {
		  if ((holeEndPos.z + MIN_HOLE_WALL) >= highZ) {
			if (globalHole.mode == HOLE_BLIND_TYPE) {
			  blindDrillThruLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			else {
			  if (globalHole.cutType == false) {
				holes.push(new Hole(holePos.x - minX, holePos.y - minY, 0, 0, 0, 1, globalHole.diameter, HOLE_THRU_TYPE, thicknessZ));
			  }
			  else {
				var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
				if (planeContour.isExist) {
				  planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, 0));
				}
			  }
			}
		  }
		  else if ((holeEndPos.z - lowZ) > MIN_HOLE_DEPTH) {
			if (globalHole.mode == HOLE_THRU_TYPE) {
			  thruDrillBlindLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			if (globalHole.cutType == false) {
			  holes.push(new Hole(holePos.x - minX, holePos.y - minY, 0, 0, 0, 1, globalHole.diameter, HOLE_BLIND_TYPE, holeEndPos.z - lowZ));
			}
			else {
			  var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
			  if (planeContour.isExist) {
				planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, holeEndPos.z - lowZ));
			  }
			}
		  }
		}
		else if ((holePos.z > highZ) && cmpr(holeDir.z, -1)) {
		  if (holeEndPos.z <= (lowZ + MIN_HOLE_WALL)) {
			if (globalHole.mode == HOLE_BLIND_TYPE) {
			  blindDrillThruLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			else {
			  if (globalHole.cutType == false) {
				holes.push(new Hole(holePos.x - minX, holePos.y - minY, thicknessZ, 0, 0, -1, globalHole.diameter, HOLE_THRU_TYPE, thicknessZ));
			  }
			  else {
				var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
				if (planeContour.isExist) {
				  planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, 0));
				}
			  }
			}
		  }
		  else if ((holeEndPos.z + MIN_HOLE_DEPTH) < highZ) {
			if (globalHole.mode == HOLE_THRU_TYPE) {
			  thruDrillBlindLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			if (globalHole.cutType == false) {
			  holes.push(new Hole(holePos.x - minX, holePos.y - minY, thicknessZ, 0, 0, -1, globalHole.diameter, HOLE_BLIND_TYPE, highZ - holeEndPos.z));
			}
			else {
			  var planeContour = new holeContourToPanel(modelPanel, globalHole.modelFastener, globalHole.modelHole);
			  if (planeContour.isExist) {
				planeCuts.push(new PlaneCut(minX, minY, planeContour.contour, (highZ - holeEndPos.z) * -1.0));
			  }
			}
		  }
		}
		else if (((cmpr(holeEndPos.z, lowZ) && cmpr(holeDir.z, -1)) || (cmpr(holeEndPos.z, highZ) && cmpr(holeDir.z, 1))) &&
		((globalHole.depth + MIN_HOLE_WALL) < thicknessZ)) {
		  globalHole.passed = true;
		  drillStartAtDepthLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
		  globalHole.modelFastener.Selected = true;
		}
	  }
	  else if (cmpr(holeDir.z, 0) &&
	  (((cmpr(holeDir.x, -1) || cmpr(holeDir.x, 1)) && cmpr(holeDir.y, 0)) ||
	  ((cmpr(holeDir.y, -1) || cmpr(holeDir.y, 1)) && cmpr(holeDir.x, 0))) &&
	  (holePos.z > lowZ) && (holePos.z < highZ) && modelPanel.Contour.IsPointInside(holeEndPos)) {
		var holeAxis = NewContour();
		holeAxis.AddLine(holePos.x, holePos.y, holeEndPos.x, holeEndPos.y);
		for (var i = 0; i < modelPanel.Contour.Count; i++) {
		  var orderedElem = getOrderedElem(modelPanel, i);
		  var distanceToHolePos = orderedElem.DistanceToPoint(holePos);
		  var distanceToHoleEndPos = orderedElem.DistanceToPoint(holeEndPos);
		  if ((orderedElem.IsIntersected(holeAxis[0]) || cmpr(distanceToHolePos, 0)) && (distanceToHoleEndPos > MIN_HOLE_DEPTH)) {
			var holePosX = holePos.x - minX;
			var holePosY = holePos.y - minY;
			var holeDepth = globalHole.depth;

			if (cmpr(holeDir.x, -1) && (cmpr(holePosX, lengthX) || (holePosX > lengthX))) {
			  holePosX = lengthX;
			  holeDepth = distanceToHoleEndPos;
			  holes.push(new Hole(holePosX, holePosY, holePos.z - lowZ, -1, 0, 0, globalHole.diameter, HOLE_BLIND_TYPE, holeDepth));
			}
			else if (cmpr(holeDir.x, 1) && (cmpr(holePosX, 0) || (holePosX < 0))) {
			  holePosX = 0;
			  holeDepth = distanceToHoleEndPos;
			  holes.push(new Hole(holePosX, holePosY, holePos.z - lowZ, 1, 0, 0, globalHole.diameter, HOLE_BLIND_TYPE, holeDepth));
			}
			else if (cmpr(holeDir.y, -1) && (cmpr(holePosY, widthY) || (holePosY > widthY))) {
			  holePosY = widthY;
			  holeDepth = distanceToHoleEndPos;
			  holes.push(new Hole(holePosX, holePosY, holePos.z - lowZ, 0, -1, 0, globalHole.diameter, HOLE_BLIND_TYPE, holeDepth));
			}
			else if (cmpr(holeDir.y, 1) && (cmpr(holePosY, 0) || (holePosY < 0))) {
			  holePosY = 0;
			  holeDepth = distanceToHoleEndPos;
			  holes.push(new Hole(holePosX, holePosY, holePos.z - lowZ, 0, 1, 0, globalHole.diameter, HOLE_BLIND_TYPE, holeDepth));
			}
			else {
			  drillExportLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			  globalHole.modelFastener.Selected = true;
			}
			if (cmpr(distanceToHolePos, 0)) {
			  globalHole.passed = true;
			}
		  }
		}
		holeAxis.Free;
	  }
	  else if (cmpr(holeDir.z, 0) && (holePos.z > lowZ) && (holePos.z < highZ) && modelPanel.Contour.IsPointInside(holeEndPos)) {
		var holeAxis = NewContour();
		holeAxis.AddLine(holePos.x, holePos.y, holeEndPos.x, holeEndPos.y);
		for (var i = 0; i < modelPanel.Contour.Count; i++) {
		  var orderedElem = getOrderedElem(modelPanel, i);
		  var distanceToHolePos = orderedElem.DistanceToPoint(holePos);
		  var distanceToHoleEndPos = orderedElem.DistanceToPoint(holeEndPos);
		  if ((orderedElem.IsIntersected(holeAxis[0]) || cmpr(distanceToHolePos, 0)) && (distanceToHoleEndPos > MIN_HOLE_DEPTH)) {
			drillExportLog += globalHole.modelFastener.Name + ', поз. ' + globalHole.modelFastener.ArtPos + ';\r\n';
			globalHole.modelFastener.Selected = true;
		  }
		}
		holeAxis.Free;
	  }
	}
  });
  holes.sort(sortHoles);
  this.holes = holes;
  this.planeCuts = planeCuts;

  this.isEqualArtPos = function(panel) {
	if ((this.artPos != panel.artPos) || (this.designation != panel.designation)) {
	  return false;
	}
	return true;
  };
  this.isEqual = function(panel) {
	if (!this.material.isEqual(panel.material) || (this.material.multiplicity != panel.material.multiplicity)) {
	  return false;
	}
	if ((this.rectangle != panel.rectangle) || !cmprf(this.thickness, panel.thickness) ||
	!cmpr(this.length, panel.length) || !cmpr(this.width, panel.width)) {
	  return false;
	}
	if ((this.texture != panel.texture) || (this.face != panel.face) || (this.kind != panel.kind)) {
	  return false;
	}
	if (!this.leftButt.isEqual(panel.leftButt) || !this.topButt.isEqual(panel.topButt) ||
	!this.rightButt.isEqual(panel.rightButt) || !this.bottomButt.isEqual(panel.bottomButt)) {
	  return false;
	}
	if (this.holes.length == panel.holes.length) {
	  for (var i = 0; i < panel.holes.length; i++) {
		if (findEqualElem(this.holes, panel.holes[i]) == -1) {
		  return false;
		}
	  }
	}
	else {
	  return false;
	}
	if (this.cuts.length == panel.cuts.length) {
	  for (var i = 0; i < panel.cuts.length; i++) {
		if (findEqualElem(this.cuts, panel.cuts[i]) == -1) {
		  return false;
		}
	  }
	}
	else {
	  return false;
	}
	if (this.planeCuts.length == panel.planeCuts.length) {
	  for (var i = 0; i < panel.planeCuts.length; i++) {
		if (findEqualElem(this.planeCuts, panel.planeCuts[i]) == -1) {
		  return false;
		}
	  }
	}
	else {
	  return false;
	}
	if (!isEqualContour(this.contour, panel.contour)) {
	  return false;
	}
	return true;
  };
}

function findEqualElem(array, elem) {
  for (var i = 0; i < array.length; i++) {
	if (array[i].isEqual(elem)) {
	  return i;
	}
  }
  return -1;
}

var globalHoles = [];
function GlobalHole(fastener, hole) {
  this.modelFastener = fastener;
  this.modelHole = hole;
  this.cutType = (hole.Contour != null) ? true : false;
  this.pos = fastener.ToGlobal(hole.Position);
  this.endPos = fastener.ToGlobal(hole.EndPosition());
  this.dir = fastener.NToGlobal(hole.Direction);
  this.diameter = hole.Diameter;
  this.depth = hole.Depth;
  this.mode = hole.DrillMode;
  this.passed = false;
}

function Hole(posX, posY, posZ, dirX, dirY, dirZ, diameter, type, depth) {
  this.posX = posX;
  this.posY = posY;
  this.posZ = posZ;
  this.dirX = dirX;
  this.dirY = dirY;
  this.dirZ = dirZ;
  this.countersink = false;
  this.diameter = diameter;
  if (cmprf(this.diameter, COUNTERSINK_HOLE_DIAMETER)) {
	this.countersink = true;
	this.diameter = KONFIRMAT_HOLE_DIAMETER;
  }
  this.type = type;
  this.depth = depth;

  this.isEqual = function(hole) {
	if (!cmpr(this.posX, hole.posX) || !cmprf(this.dirX, hole.dirX)) {
	  return false;
	}
	if (!cmpr(this.posY, hole.posY) || !cmprf(this.dirY, hole.dirY)) {
	  return false;
	}
	if (!cmprf(this.diameter, hole.diameter) || !cmpr(this.depth, hole.depth) || (this.type != hole.type)) {
	  return false;
	}
	if (this.countersink && hole.countersink) {
	  if (!cmpr(this.posZ, hole.posZ) || !cmprf(this.dirZ, hole.dirZ)) {
		return false;
	  }
	}
	else if (!this.countersink && !hole.countersink) {
	  if ((cmprf(this.dirZ, 1) || cmprf(this.dirZ, -1)) && (cmprf(hole.dirZ, 1) || cmprf(hole.dirZ, -1)) &&
	  (this.type == HOLE_THRU_TYPE) && (hole.type == HOLE_THRU_TYPE)) {
	  }
	  else if (!cmpr(this.posZ, hole.posZ) || !cmprf(this.dirZ, hole.dirZ)) {
		return false;
	  }
	}
	else {
	  return false;
	}
	return true;
  };
}

function sortHoles(hole1, hole2) {
  if (!cmprf(hole1.dirZ, hole2.dirZ)) {
	if (hole1.dirZ < hole2.dirZ) {
	  return -1;
	}
	if (hole1.dirZ > hole2.dirZ) {
	  return 1;
	}
  }
  if (!cmprf(hole1.dirX, hole2.dirX)) {
	if (hole1.dirX < hole2.dirX) {
	  return -1;
	}
	if (hole1.dirX > hole2.dirX) {
	  return 1;
	}
  }
  if (!cmprf(hole1.dirY, hole2.dirY)) {
	if (hole1.dirY < hole2.dirY) {
	  return -1;
	}
	if (hole1.dirY > hole2.dirY) {
	  return 1;
	}
  }
  if (!cmprf(hole1.posX, hole2.posX)) {
	if (hole1.posX < hole2.posX) {
	  return -1;
	}
	if (hole1.posX > hole2.posX) {
	  return 1;
	}
  }
  if (!cmprf(hole1.posY, hole2.posY)) {
	if (hole1.posY < hole2.posY) {
	  return -1;
	}
	if (hole1.posY > hole2.posY) {
	  return 1;
	}
  }
  if (!cmprf(hole1.posZ, hole2.posZ)) {
	if (hole1.posZ < hole2.posZ) {
	  return -1;
	}
	if (hole1.posZ > hole2.posZ) {
	  return 1;
	}
  }
}

function PlaneCut(shiftX, shiftY, contour, depth) {
  this.depth = depth;
  this.contour = NewContour();
  this.contour.AddList(contour.MakeCopy());
  this.contour.Move(shiftX * -1.0, shiftY * -1.0);
  this.contour.OrderContours();

  if (this.contour.IsClockOtherWise() == false) {
	this.contour.InvertDirection();
  }

  this.isEqual = function(planeCut) {
	if (!cmpr(this.depth, planeCut.depth)) {
	  return false;
	}
	if (!isEqualContour(this.contour, planeCut.contour)) {
	  return false;
	}
	return true;
  };
}

function Cut(shiftX, shiftY, shiftZ, modelCut) {
  this.name = modelCut.Name;
  this.sign = modelCut.Sign;
  this.mode = modelCut.CutMode;
  this.type = modelCut.CutType;
  this.panelElem = modelCut.IndexOfPanelElem;

  this.trajectory = NewContour();
  this.trajectory.AddList(modelCut.Trajectory.MakeCopy());
  this.trajectory.Move(shiftX * -1.0, shiftY * -1.0);

  this.profile = NewContour();
  this.profile.AddList(modelCut.Contour.MakeCopy());
  this.profile.Move(0, shiftZ * -1.0);
  this.profile.OrderContours();

  this.isEqual = function(cut) {
	if ((this.name != cut.name) || (this.sign != cut.sign)) {
	  return false;
	}
	if (!isEqualContour(this.trajectory, cut.trajectory)) {
	  return false;
	}
	if (!isEqualContour(this.profile, cut.profile)) {
	  var symProfile = NewContour();
	  symProfile.AddList(cut.profile.MakeCopy());
	  symProfile.Symmetry(0, 0, 0, 40, false);
	  if (!isEqualContour(this.profile, symProfile)) {
		return false;
	  }
	}
	return true;
  };
}

function findContourElem(contour, elem) {
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].ElType == elem.ElType) {
	  if (elem.ElType == ELEM_LINE_TYPE) {
		if (cmpr(contour[i].Pos1.x, elem.Pos1.x) && cmpr(contour[i].Pos1.y, elem.Pos1.y) &&
		cmpr(contour[i].Pos2.x, elem.Pos2.x) && cmpr(contour[i].Pos2.y, elem.Pos2.y)) {
		  return i;
		}
		if (cmpr(contour[i].Pos1.x, elem.Pos2.x) && cmpr(contour[i].Pos1.y, elem.Pos2.y) &&
		cmpr(contour[i].Pos2.x, elem.Pos1.x) && cmpr(contour[i].Pos2.y, elem.Pos1.y)) {
		  return i;
		}
	  }
	  else if (elem.ElType == ELEM_ARC_TYPE) {
		if (cmpr(contour[i].Pos1.x, elem.Pos1.x) && cmpr(contour[i].Pos1.y, elem.Pos1.y) &&
		cmpr(contour[i].Pos2.x, elem.Pos2.x) && cmpr(contour[i].Pos2.y, elem.Pos2.y) &&
		cmpr(contour[i].Center.x, elem.Center.x) && cmpr(contour[i].Center.y, elem.Center.y)) {
		  return i;
		}
		if (cmpr(contour[i].Pos1.x, elem.Pos2.x) && cmpr(contour[i].Pos1.y, elem.Pos2.y) &&
		cmpr(contour[i].Pos2.x, elem.Pos1.x) && cmpr(contour[i].Pos2.y, elem.Pos1.y) &&
		cmpr(contour[i].Center.x, elem.Center.x) && cmpr(contour[i].Center.y, elem.Center.y)) {
		  return i;
		}
	  }
	  else if (elem.ElType == ELEM_CIRCLE_TYPE) {
		if (cmpr(contour[i].Center.x, elem.Center.x) && cmpr(contour[i].Center.y, elem.Center.y) &&
		cmpr(contour[i].CirRadius, elem.CirRadius)) {
		  return i;
		}
	  }
	}
  }
  return -1;
}

function isEqualContour(contour1, contour2) {
  if (contour1.Count == contour2.Count) {
	for (var i = 0; i < contour1.Count; i++) {
	  var elemIndex = findContourElem(contour2, contour1[i]);
	  if (elemIndex == -1) {
		return false;
	  }
	  else {
		var butt1 = new Butt(contour1[i]);
		var butt2 = new Butt(contour2[elemIndex]);
		if (!butt1.isEqual(butt2)) {
		  return false;
		}
	  }
	}
  }
  else {
	return false;
  }
  return true;
}

function holeContourToPanel(panel, fastener, hole) {
  this.isExist = false;
  if (cmprf(hole.Direction.x, 0) && cmprf(hole.Direction.y, 0) && cmprf(hole.Direction.z, -1)) {
	this.contour = NewContour();
	var contour = NewContour();
	contour.AddList(hole.Contour.MakeCopy());
	var minY = findMinY(contour);
	var maxY = findMaxY(contour);
	contour.Symmetry(0, minY, 0, maxY, false);
	contour.Move(hole.Position.x, hole.Position.y);
	if (contour.IsClockOtherWise() == false) {
	  contour.InvertDirection();
	}
	for (var i = 0; i < contour.Count; i++) {
	  if (contour[i].ElType == ELEM_LINE_TYPE) {
		this.isExist = true;
		this.contour.AddLine(panel.ObjectToObject(fastener, contour[i].Pos1),
		panel.ObjectToObject(fastener, contour[i].Pos2));
	  }
	  else if (contour[i].ElType == ELEM_ARC_TYPE) {
		this.isExist = true;
		this.contour.AddArc3(panel.ObjectToObject(fastener, contour[i].Pos1),
		panel.ObjectToObject(fastener, contour[i].ArcCenter()),
		panel.ObjectToObject(fastener, contour[i].Pos2));
	  }
	  else if (contour[i].ElType == ELEM_CIRCLE_TYPE) {
		this.isExist = true;
		this.contour.AddCircle(panel.ObjectToObject(fastener, contour[i].Center),
		contour[i].CirRadius);
	  }
	  else if (contour[i].ElType == ELEM_ELLIPSE_TYPE) {
		// this.isExist = true;
		this.contour.AddEllipse(panel.ObjectToObject(fastener, contour[i].Center),
		contour[i].MajorRadius, contour[i].MinorRadius,
		contour[i].MajorAxisAngle, contour[i].Dir);
	  }
	}
  }
}

var furns = [];
furns.getIndex = function(furn) {
  for (var i = 0; i < this.length; i++) {
	if(this[i].isEqual(furn)) {
	  return i;
	}
  }
  return -1;
};
furns.add = function(furn) {
  var arr = furn.code.split(',');
  if (arr.length > 1) {
	for (var j = 0; j < arr.length; j++) {
	  var code = arr[j].trim();
	  if (code != '') {
		var newFurn = new Furn(furn.name + '\n' + code, furn.artPos);
		var index = this.getIndex(newFurn);
		if (index != -1) {
		  this[index].quantity++;
		}
		else {
		  this.push(newFurn);
		}
	  }
	}
  }
  else if (furn.code != '') {
	var index = this.getIndex(furn);
	if (index != -1) {
	  this[index].quantity++;
	}
	else {
	  this.push(furn);
	}
  }
};

function Furn(nameCode, artPos) {
  var arr = splitNameCode(nameCode);
  this.name = arr[0];
  this.code = arr[1];
  this.artPos = artPos;
  this.quantity = 1;

  this.isEqual = function(furn) {
	if (this.code == furn.code) {
	  return true;
	}
	return false;
  };
}

var butts = [];
butts.add = function(butt) {
  for (var i = 0; i < this.length; i++) {
	if(this[i].isEqual(butt)) {
	  return;
	}
  }
  this.push(butt);
};

butts.getIndex = function(butt) {
  for (var i = 0; i < this.length; i++) {
	if (this[i].isEqual(butt)) {
	  return i;
	}
  }
  return -1;
};

function Butt(elem) {
  if ((elem != undefined) && (elem.Data != null) && (elem.Data.Butt != null) && (elem.Data.Butt != undefined)) {
	var butt = elem.Data.Butt;
	if (butt.Thickness > 0) {
	  var arr = splitNameCode(butt.Material);
	  this.name = arr[0];
	  this.code = arr[1];
	  this.sign = butt.Sign;
	  this.thickness = butt.Thickness;
	  this.width = butt.Width;
	  this.clip = butt.ClipPanel;
	  this.length = elem.ObjLength();
	  this.isExist = true;
	}
	else {
	  this.name = '';
	  this.code = '';
	  this.thickness = 0;
	  this.isExist = false;
	}
  }
  else {
	this.name = '';
	this.code = '';
	this.thickness = 0;
	this.isExist = false;
  }

  this.isEqual = function(butt) {
	if (this.isExist && butt.isExist) {
	  if ((this.name == butt.name) && (this.code == butt.code) &&
	  (this.width == butt.width) && (this.thickness == butt.thickness)) {
		return true;
	  }
	}
	else if (!this.isExist && !butt.isExist) {
	  return true;
	}
	return false;
  };
}

var materialIndex = -1;
var materials = [];
materials.add = function(material) {
  for (var i = 0; i < this.length; i++) {
	if(this[i].isEqual(material)) {
	  return;
	}
  }
  this.push(material);
};
materials.getIndex = function(comboValue) {
  for (var i = 0; i < this.length; i++) {
	if(this[i].comboValue == comboValue) {
	  return i;
	}
  }
  return -1;
};

function Material(nameCode, thickness) {
  var arr = splitNameCode(nameCode);
  var name = arr[0];
  var multiplicity = 1;
  if ((name.search(/сращ.\(3\)/i) != -1) || (name.search(/cращ.\(3\)/i) != -1)) {
	name = name.replace(/сращ.\(3\)/i, '').replace(/cращ.\(3\)/i, '');
	name = name.trim();
	multiplicity = 3;
  }
  else if ((name.search(/сращ.\(2\)/i) != -1) || (name.search(/cращ.\(2\)/i) != -1)) {
	name = name.replace(/сращ.\(2\)/i, '').replace(/cращ.\(2\)/i, '');
	name = name.trim();
	multiplicity = 2;
  }
  this.name = name;
  this.code = arr[1];
  this.thickness = thickness / multiplicity;
  this.multiplicity = multiplicity;

  this.isEqual = function(material) {
	if ((this.name == material.name) && (this.code == material.code) && (this.thickness == material.thickness)) {
	  return true;
	}
	return false;
  };
  Object.defineProperty(this, "comboValue", {
	get: function() {
	  if (this.code != '') {
		return this.code + '; ' + this.name;
	  }
	  else {
		return this.name;
	  }
	}
  });
}

Model.forEachPanel(function(modelPanel) {
  if ((modelPanel != undefined) && (modelPanel != null) && (isAsmChild(modelPanel) == false)) {
	materials.add(new Material(modelPanel.MaterialName, modelPanel.Thickness));
  }
});

function exportViyarPro() {
  system.require(OBJ_TREE_FILE_NAME);
  if (!arrangePositions()) return false;

  clearReport();
  Model.UnHighlightAll();

  // Loop over materials — for each, set materialIndex and call readModel()
  // to collect this material's panels + butts, build XML, write file.
  var exportedFiles = [];
  var skippedMaterials = [];
  for (var mi = 0; mi < materials.length; mi++) {
    materialIndex = mi;
    Action.Hint = 'Експорт матеріалу ' + (mi + 1) + '/' + materials.length
      + ' (' + materials[mi].name + ')...';
    if (!readModel()) {
      // user aborted — stop the whole run
      return false;
    }
    if (panels.length == 0) {
      // No panels for this material — skip silently.
      skippedMaterials.push(materials[mi].name);
      continue;
    }
    var XMLDoc = createDocNode();
    var xotree = new XML.ObjTree();
    xotree.xmlDecl = '<?xml version="1.0" encoding="windows-1251" ?>';
    var xml = xotree.writeXML(XMLDoc);
    if (DEBUG == false) {
      xml = sjcl.encrypt(PASSWORD, xml);
    }
    var fileName = getExportFileNameForMaterial(mi);
    try {
      system.writeTextFile(fileName, xml);
    }
    catch (e) {
      alert('Не вдається зберегти файл:\n' + fileName);
      return false;
    }
    exportedFiles.push({
      path: fileName,
      material: materials[mi].name,
      panels: panels.length,
      furns: furns.length
    });
  }

  if (exportedFiles.length == 0) {
    if (skippedMaterials.length > 0) {
      alert('Експортованих деталей не знайдено для жодного з '
        + materials.length + ' матеріалів.');
    } else {
      alert('Немає матеріалів для експорту.');
    }
    return false;
  }

  reportExportSummary(exportedFiles, skippedMaterials);
  report();
  return true;
}

// Build an alert-friendly summary of the multi-material run.
function reportExportSummary(files, skipped) {
  var lines = [];
  lines.push('Експорт у ViyarPro v27 завершено!');
  lines.push('');
  lines.push('Матеріалів (файлів): ' + files.length);
  var totalPanels = 0;
  for (var i = 0; i < files.length; i++) totalPanels += files[i].panels;
  lines.push('Деталей: ' + totalPanels);
  if (files[0] && typeof files[0].furns == 'number' && files[0].furns > 0) {
    lines.push('Фурнітура: ' + files[0].furns + ' (у кожному файлі)');
  }
  if (skipped && skipped.length > 0) {
    lines.push('Пропущено (без деталей): ' + skipped.length
      + ' — ' + skipped.join(', '));
  }
  lines.push('');
  lines.push('Згенеровані файли:');
  for (var j = 0; j < files.length; j++) {
    var f = files[j];
    lines.push('  ' + f.path + '  (' + f.panels + ' дет.)');
  }
  alert(lines.join('\n'));
}

function clearReport() {
  contourLog = '';
  grooveLog = '';
  coordsLog = '';
  cutoutLog = '';
  blindDrillThruLog = '';
  thruDrillBlindLog = '';
  drillStartAtDepthLog = '';
  drillExportLog = '';
  clippingLog = '';
  debugLog = '';
}

function report() {
  var log = 'В ViyarPro необходимо:\r\n';
  log +='- проверить проект на соответствие технологическим ограничениям;\r\n' + '\r\n';
  if (contourLog != '') {
	log += '- дополнить чертежами или добавить обработки контура деталей:\r\n' + contourLog + '\r\n';
  }
  if (grooveLog != '') {
	log += '- проверить экспорт следующих пазов:\r\n' + grooveLog + '\r\n';
  }
  if (coordsLog != '') {
	log += '- проверить координаты сверления и пазов деталей:\r\n' + coordsLog + '\r\n';
  }
  if (cutoutLog != '') {
	log += '- проверить экспорт следующих выемок:\r\n' + cutoutLog + '\r\n';
  }
  if (blindDrillThruLog != '') {
	log += '- отверстие глухого типа образует сквозное отверстие в детали. Отверстие перенесено не будет, проверьте установку фурнитуры:\r\n' + blindDrillThruLog + '\r\n';
  }
  if (thruDrillBlindLog != '') {
	log += '- отверстие сквозного типа образует глухое отверстие в детали. Проверьте установку фурнитуры:\r\n' + thruDrillBlindLog + '\r\n';
  }
  if (drillStartAtDepthLog != '') {
	log += '- начало отверстия находится в теле детали. Отверстие перенесено не будет, проверьте установку фурнитуры:\r\n' + drillStartAtDepthLog + '\r\n';
  }
  if (drillExportLog != '') {
	log += '- отверстие перенесено не будет, проверьте установку фурнитуры:\r\n' + drillExportLog + '\r\n';
  }
  if (clippingLog != '') {
	log += '- следующие детали экспортированы с подрезкой:\r\n' + clippingLog + '\r\n';
  }
  if (debugLog != '') {
	log += '- отладочная информация:\r\n' + debugLog + '\r\n';
  }
  // For multi-material runs, write the log next to the first material's file
  // but strip the per-material suffix and the trailing _viyar, so e.g.
  //   "ProjectName.mat1_viyar.project" -> "ProjectName.log.txt"
  var logFileName;
  if (exportFileName) {
    var lastSlash = Math.max(exportFileName.lastIndexOf('\\'), exportFileName.lastIndexOf('/'));
    var dir = (lastSlash > -1) ? exportFileName.substring(0, lastSlash + 1) : '';
    var base = (lastSlash > -1) ? exportFileName.substring(lastSlash + 1) : exportFileName;
    base = base.replace(/\.project$/i, '').replace(/_viyar$/i, '');
    // Strip the trailing ".<material>" if present so multi-material runs share one log.
    base = base.replace(/_[^_\\/\.]+$/, '');
    if (!base) base = 'viyar';
    logFileName = dir + base + '.log.txt';
  } else {
    logFileName = 'viyar.log.txt';
  }
  try {
	system.writeTextFile(logFileName, log);
  }
  catch(e) {
	alert('Не удается сохранить отчет: \n' + logFileName);
  }
  if ((DEBUG == false) && system.fileExists(logFileName) && (logFileName.lastIndexOf("\\") !== -1)) {
	if (system.fileExists(NOTEPAD_DEFAULT_PATH)) {
	  system.exec(NOTEPAD_DEFAULT_PATH, '/a "%PATH%"'.replace('%PATH%', logFileName));
	}
	else {
	  system.require(PATH_FILE);
	  if ((NOTEPAD_PATH != undefined) && system.fileExists(NOTEPAD_PATH)) {
		system.exec(NOTEPAD_PATH, '/a "%PATH%"'.replace('%PATH%', logFileName));
	  }
	}
  }
}

function readModel() {
  var exitFlag = false;
  var startTime = Date.now();
  var alertTime = startTime;
  var hintTime = startTime;

  Action.Hint = 'Экспорт фурнитуры... ';
  furns.length = 0;
  Model.forEach(function(modelObj) {
	if (isExportedFurniture(modelObj)) {
	  if ((system.apiVersion >= 1000) && (modelObj.constructor.name == 'TFastener') && (modelObj.AdvParamData != undefined)) {
		var elements = modelObj.AdvParamData.FindNode('Elements');
		if (elements) {
		  for (var i = 0; i < elements.Count; i++) {
			if (elements[i].Value) {
			  furns.add(new Furn(elements[i].Value, modelObj.ArtPos));
			}
		  }
		}
		else {
		  furns.add(new Furn(modelObj.Name, modelObj.ArtPos));
		}
	  }
	  /*else if (modelObj.constructor.name == 'TExtrusionBody') {
		furns.add(new Furn(modelObj.MaterialName, modelObj.ArtPos));
	  }*/
	  else {
		furns.add(new Furn(modelObj.Name, modelObj.ArtPos));
	  }
	}
  });
  furns.sort(function (a, b) {
	var ac = parseFloat(a.code);
	var bc = parseFloat(b.code);
	if (isNaN(ac) && isNaN(bc)) { return 0; }
	if (isNaN(ac)) { return 1; }
	if (isNaN(bc)) { return -1; }
	if (ac > bc) { return 1; }
	if (ac < bc) { return -1; }
	return 0;
  });
  Action.Hint = 'Обработка отверстий... ';
  globalHoles.length = 0;
  Model.forEach( function(modelObj) {
	if ((modelObj != undefined) && (modelObj.Holes != null)) {
	  for (var i = 0; i < modelObj.Holes.Count; i++) {
		var modelHole = modelObj.Holes[i];
		globalHoles.push(new GlobalHole(modelObj, modelHole));
	  }
	}
  } );
  Action.Hint = 'Экспорт деталей... ';
  panels.length = 0;
  butts.length = 0;
  Model.forEachPanel(function(modelPanel) {
	if (!exitFlag && isExportedPanel(modelPanel)) {
	  if((Date.now() - hintTime) > HINT_TIMEOUT) {
		Action.Hint = 'Экспорт детали... ' + modelPanel.Name;
		hintTime = Date.now();
	  }
	  var panel = new Panel(modelPanel);
	  adjustOrientation(panel);
	  panels.add(panel);
	  if((Date.now() - alertTime) > ALERT_TIMEOUT) {
		if(confirm('Требуется длительное время. Продолжить? \n')) {
		  alertTime = Date.now();
		}
		else {
		  exitFlag = true;
		}
	  }
	}
  });
  panels.sort(function (a, b) {
	if ((a.designation != '') && (b.designation != '')) {
	  if (a.designation > b.designation) { return 1; }
	  if (a.designation < b.designation) { return -1; }
	  return 0;
	}
	else {
	  if (parseFloat(a.artPos) > parseFloat(b.artPos)) { return 1; }
	  if (parseFloat(a.artPos) < parseFloat(b.artPos)) { return -1; }
	  return 0;
	}
  });
  butts.sort(function (a, b) {
	if (a.thickness > b.thickness) { return 1; }
	if (a.thickness < b.thickness) { return -1; }
	return 0;
  });
  if (exitFlag) {
	Action.Hint = 'Прервано пользователем!';
	alert('Прервано пользователем!');
	return false;
  }
  Action.Hint = 'Экспорт проекта завершен... ' + (Date.now() - startTime) / 1000 + ' сек. ';
  return true;
}

function arrangePositions() {
  if (DEBUG == false) {
	if (system.apiVersion < 1000) {
	  var mainForm = Action.Control.Owner.Owner;
	  var modelTree = mainForm.FindComponent('dpModelTree');
	  if (modelTree.Visible == true) {
		var frmModelTree = modelTree.FindComponent('FrmModelTree');
		if (frmModelTree != undefined) {
		  if (arrangeCheckBox.Value == true) {
			var btnArrange = frmModelTree.FindComponent('BtnArrange');
			if (btnArrange != undefined) {
			  Action.Hint = 'Расстановка позиций...';
			  btnArrange.Click();
			  Action.Commit();
			  return true;
			}
			else {
			  alert('Недоступна кнопка <Расставить позиции>!');
			  return false;
			}
		  }
		  else {
			var BtnArrangeNew = frmModelTree.FindComponent('BtnArrangeNew');
			if (BtnArrangeNew != undefined) {
			  Action.Hint = 'Расстановка позиций...';
			  BtnArrangeNew.Click();
			  Action.Commit();
			  return true;
			}
			else {
			  alert('Недоступна кнопка <Расставить позиции для новых объектов>!');
			  return false;
			}
		  }
		}
		else {
		  alert('Недоступна форма <Структура модели>!');
		  return false;
		}
	  }
	  else {
		alert('Закрыт инструмент <Структура модели>, запустите скрипт повторно!');
		return false;
	  }
	}
	else {
	  Action.Hint = 'Расстановка позиций...';
	  if (arrangeCheckBox.Value == true) {
		if (Action.ArrangePositions(0) == true) {
		  Action.Commit();
		  return true;
		}
	  }
	  else {
		if (Action.ArrangePositions(1) == true) {
		  Action.Commit();
		  return true;
		}
	  }
	}
	alert('Расстановка позиций не выполнена!');
	return false;
  }
  return true;
}

function activateModelTree() {
  if (system.apiVersion < 1000) {
	var mainForm = Action.Control.Owner.Owner;
	var modelTree = mainForm.FindComponent('dpModelTree');
	if (modelTree != undefined) {
	  if (modelTree.Visible == false) {
		var actModelTree = mainForm.FindComponent('a3ModelTree');
		if (actModelTree != undefined) {
		  actModelTree.Execute();
		}
		else {
		  alert('Недоступно событие <Структура модели>!');
		  return false;
		}
	  }
	}
	else {
	  alert('Недоступен объект <Структура модели>!');
	  return false;
	}
  }
  return true;
}

function isAsmChild(child) {
  var ownerObj = child.Owner;
  while ((ownerObj != null) && (ownerObj != undefined) && !(ownerObj instanceof TModel3D)) {
	if (ownerObj.constructor.name == 'TFurnAsm') {
	  return true;
	}
	ownerObj = ownerObj.Owner;
  }
  return false;
}

function isAsmKitChild(child) {
  var ownerObj = child.Owner;
  while ((ownerObj != null) && (ownerObj != undefined) && !(ownerObj instanceof TModel3D)) {
	if (ownerObj.constructor.name == 'TAsmKit') {
	  return true;
	}
	ownerObj = ownerObj.Owner;
  }
  return false;
}

function isDraftChild(child) {
  var ownerObj = child.Owner;
  while ((ownerObj != null) && (ownerObj != undefined) && !(ownerObj instanceof TModel3D)) {
	if (ownerObj.constructor.name == 'TDraftBlock') {
	  return true;
	}
	ownerObj = ownerObj.Owner;
  }
  return false;
}

function isDraftAsmChild(child) {
  var ownerObj = child.Owner;
  while ((ownerObj != null) && (ownerObj != undefined) && !(ownerObj instanceof TModel3D)) {
	if (ownerObj.constructor.name == 'TDraftBlock') {
	  if (ownerObj.AsAsm == undefined) {
		return (draftCombo.Value == DRAFT_ASM_METHOD) ? true : false;
	  }
	  else if (ownerObj.AsAsm) {
		return true;
	  }
	}
	ownerObj = ownerObj.Owner;
  }
  return false;
}

function isDraftAsAsmUndefined() {
  var flag = false;
  Model.forEach( function(modelObj) {
	if ((modelObj != undefined) && (modelObj != null)) {
	  if ((modelObj.constructor.name == 'TDraftBlock') && (modelObj.AsAsm == undefined)) {
		flag = true;
	  }
	}
  } );
  return flag;
}

function isBlockChild(child) {
  var ownerObj = child.Owner;
  while ((ownerObj != null) && (ownerObj != undefined) && !(ownerObj instanceof TModel3D)) {
	if (ownerObj.constructor.name == 'TFurnBlock') {
	  return true;
	}
	ownerObj = ownerObj.Owner;
  }
  return false;
}

function splitNameCode(fullName) {
  var articleKey = '(Артикул';
  var articleStartPos = fullName.lastIndexOf(articleKey);
  var articleEndPos = fullName.lastIndexOf(')');
  if ((articleStartPos > 0) && (articleEndPos > articleStartPos)) {
	var name = fullName.substring(0, articleStartPos).trim();
	var code = fullName.substring(articleStartPos + articleKey.length, articleEndPos).trim();
  }
  else {
	var arr = fullName.split(/\r\n|\r|\n/g);
	var name = arr[0];
	var code = arr[1];
  }
  if (code == undefined) {
	code = '';
  }
  name = name.trim().replace(/["']/g, '');
  code = code.trim();
  return [ name, code ];
}

function cmpr(val1, val2) {
  return (Math.abs(val1 - val2) < PRECISION) ? true : false;
}

function cmprf(val1, val2) {
  return (Math.abs(val1 - val2) < FLOAT) ? true : false;
}

function cmprd(val1, val2) {
  return (Math.abs(val1 - val2) < DELTA) ? true : false;
}

function cmprt(val, threshold) {
  if (Math.abs(val - threshold) < (PRECISION / 2)) {
	return true;
  }
  return (val > threshold) ? true : false;
}

function rnd(val, digits) {
  var result = (val + 0.00005).toFixed(digits);
  if (result == 0) {
	return 0;
  }
  return result;
}

function rnds(val, digits) {
  var result = (val + 0.00005).toFixed(digits).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
  if (result == 0) {
	return 0;
  }
  return result;
}

function findMinX(contour) {
  if ((contour[0].ElType == ELEM_LINE_TYPE) || (contour[0].ElType == ELEM_ARC_TYPE)) {
	var minX = contour[0].Pos1.x;
  }
  else if (contour[0].ElType == ELEM_CIRCLE_TYPE) {
	var minX = contour[0].Center.x - contour[0].CirRadius;
  }
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].ElType == ELEM_LINE_TYPE) {
	  if (contour[i].Pos1.x < minX) {
		minX = contour[i].Pos1.x;
	  }
	  if (contour[i].Pos2.x < minX) {
		minX = contour[i].Pos2.x;
	  }
	}
	else if (contour[i].ElType == ELEM_ARC_TYPE) {
	  if (contour[i].AngleOnArc(Math.PI) == true) {
		if ((contour[i].Center.x - contour[i].ArcRadius()) < minX) {
		  minX = contour[i].Center.x - contour[i].ArcRadius();
		}
	  }
	  else {
		if (contour[i].Pos1.x < minX) {
		  minX = contour[i].Pos1.x;
		}
		if (contour[i].Pos2.x < minX) {
		  minX = contour[i].Pos2.x;
		}
	  }
	}
	else if (contour[i].ElType == ELEM_CIRCLE_TYPE) {
	  if ((contour[i].Center.x - contour[i].CirRadius) < minX) {
		minX = contour[i].Center.x - contour[i].CirRadius;
	  }
	}
  }
  return minX;
}

function findMaxX(contour) {
  if ((contour[0].ElType == ELEM_LINE_TYPE) || (contour[0].ElType == ELEM_ARC_TYPE)) {
	var maxX = contour[0].Pos1.x;
  }
  else if (contour[0].ElType == ELEM_CIRCLE_TYPE) {
	var maxX = contour[0].Center.x + contour[0].CirRadius;
  }
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].ElType == ELEM_LINE_TYPE) {
	  if (contour[i].Pos1.x > maxX) {
		maxX = contour[i].Pos1.x;
	  }
	  if (contour[i].Pos2.x > maxX) {
		maxX = contour[i].Pos2.x;
	  }
	}
	else if (contour[i].ElType == ELEM_ARC_TYPE) {
	  if ((contour[i].AngleOnArc(0) == true) || (contour[i].AngleOnArc(2 * Math.PI) == true)) {
		if ((contour[i].Center.x + contour[i].ArcRadius()) > maxX) {
		  maxX = contour[i].Center.x + contour[i].ArcRadius();
		}
	  }
	  else {
		if (contour[i].Pos1.x > maxX) {
		  maxX = contour[i].Pos1.x;
		}
		if (contour[i].Pos2.x > maxX) {
		  maxX = contour[i].Pos2.x;
		}
	  }
	}
	else if (contour[i].ElType == ELEM_CIRCLE_TYPE) {
	  if ((contour[i].Center.x + contour[i].CirRadius) > maxX) {
		maxX = contour[i].Center.x + contour[i].CirRadius;
	  }
	}
  }
  return maxX;
}

function findMinY(contour) {
  if ((contour[0].ElType == ELEM_LINE_TYPE) || (contour[0].ElType == ELEM_ARC_TYPE)) {
	var minY = contour[0].Pos1.y;
  }
  else if (contour[0].ElType == ELEM_CIRCLE_TYPE) {
	var minY = contour[0].Center.y - contour[0].CirRadius;
  }
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].ElType == ELEM_LINE_TYPE) {
	  if (contour[i].Pos1.y < minY) {
		minY = contour[i].Pos1.y;
	  }
	  if (contour[i].Pos2.y < minY) {
		minY = contour[i].Pos2.y;
	  }
	}
	else if (contour[i].ElType == ELEM_ARC_TYPE) {
	  if (contour[i].AngleOnArc((3 * Math.PI) / 2) == true) {
		if ((contour[i].Center.y - contour[i].ArcRadius()) < minY) {
		  minY = contour[i].Center.y - contour[i].ArcRadius();
		}
	  }
	  else {
		if (contour[i].Pos1.y < minY) {
		  minY = contour[i].Pos1.y;
		}
		if (contour[i].Pos2.y < minY) {
		  minY = contour[i].Pos2.y;
		}
	  }
	}
	else if (contour[i].ElType == ELEM_CIRCLE_TYPE) {
	  if ((contour[i].Center.y - contour[i].CirRadius) < minY) {
		minY = contour[i].Center.y - contour[i].CirRadius;
	  }
	}
  }
  return minY;
}

function findMaxY(contour) {
  if ((contour[0].ElType == ELEM_LINE_TYPE) || (contour[0].ElType == ELEM_ARC_TYPE)) {
	var maxY = contour[0].Pos1.y;
  }
  else if (contour[0].ElType == ELEM_CIRCLE_TYPE) {
	var maxY = contour[0].Center.y + contour[0].CirRadius;
  }
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].ElType == ELEM_LINE_TYPE) {
	  if (contour[i].Pos1.y > maxY) {
		maxY = contour[i].Pos1.y;
	  }
	  if (contour[i].Pos2.y > maxY) {
		maxY = contour[i].Pos2.y;
	  }
	}
	else if (contour[i].ElType == ELEM_ARC_TYPE) {
	  if (contour[i].AngleOnArc(Math.PI / 2) == true) {
		if ((contour[i].Center.y + contour[i].ArcRadius()) > maxY) {
		  maxY = contour[i].Center.y + contour[i].ArcRadius();
		}
	  }
	  else {
		if (contour[i].Pos1.y > maxY) {
		  maxY = contour[i].Pos1.y;
		}
		if (contour[i].Pos2.y > maxY) {
		  maxY = contour[i].Pos2.y;
		}
	  }
	}
	else if (contour[i].ElType == ELEM_CIRCLE_TYPE) {
	  if ((contour[i].Center.y + contour[i].CirRadius) > maxY) {
		maxY = contour[i].Center.y + contour[i].CirRadius;
	  }
	}
  }
  return maxY;
}

function getOrderedElem(panel, elem) {
  if (system.apiVersion < 1000) {
	return panel.Contour[elem].Data.OrderedElem;
  }
  else {
	return panel.FindOrderedElem(elem);
  }
  return undefined;
}

function getModelFilePath() {
  if (system.apiVersion < 1000) {
	var fileName = Action.Control.Owner.FileName;
  }
  else {
	var fileName = Action.ModelFilename;
  }
  if (fileName.lastIndexOf(".bln") !== -1) {
	fileName = fileName.substring(0, fileName.lastIndexOf(".bln"));
  }
  return fileName.substring(0, fileName.lastIndexOf("\\") + 1);
}

function getModelFileName() {
  if (system.apiVersion < 1000) {
	var fileName = Action.Control.Owner.FileName;
  }
  else {
	var fileName = Action.ModelFilename;
  }
  return fileName.substring(fileName.lastIndexOf("\\") + 1, fileName.lastIndexOf("."));
}

function getModelLibraryName() {
  if (system.apiVersion < 1000) {
	var fileName = Action.Control.Owner.FileName;
  }
  else {
	var fileName = Action.ModelFilename;
  }
  if (fileName.lastIndexOf(".bln") !== -1) {
	fileName = fileName.substring(0, fileName.lastIndexOf(".bln"));
	return fileName.substring(fileName.lastIndexOf("\\") + 1, fileName.length);
  }
  else {
	return '';
  }
}

function getModelName() {
  if (system.apiVersion < 1000) {
	var modelName = Action.Control.Owner.Article.Name;
  }
  else {
	var modelName = Action.Control.Article.Name;
  }
  return modelName;
}

function getOrderName() {
  if (system.apiVersion < 1000) {
	var orderName = Action.Control.Owner.Article.OrderName;
  }
  else {
	var orderName = Action.Control.Article.OrderName;
  }
  return orderName;
}

// Pick the folder part out of the user's selected file path.
function getExportDir() {
  if (!exportFileName) return '';
  var lastSlash = exportFileName.lastIndexOf('\\');
  var lastFwd = exportFileName.lastIndexOf('/');
  var idx = Math.max(lastSlash, lastFwd);
  return (idx > -1) ? exportFileName.substring(0, idx + 1) : '';
}

// Pick the basename (without .project and without a trailing _viyar).
function getExportBaseName() {
  if (!exportFileName) return 'viyar';
  var lastSlash = exportFileName.lastIndexOf('\\');
  var lastFwd = exportFileName.lastIndexOf('/');
  var idx = Math.max(lastSlash, lastFwd);
  var base = (idx > -1) ? exportFileName.substring(idx + 1) : exportFileName;
  base = base.replace(/\.project$/i, '').replace(/_viyar$/i, '');
  return base;
}

// Default initial value for the file selector — points to the model's folder
// and uses the model's base name as the file's base.
function getDefaultExportFileName() {
  var dir;
  var modelName;
  if (getModelFileName() == '') {
    dir = '';
    modelName = getModelName();
  }
  else {
    dir = getModelFilePath();
    modelName = getModelFileName();
  }
  if (!modelName) modelName = 'project';
  return dir + modelName + '_viyar.project';
}

// Build the .project file path for a specific material: <dir><base>_<material>_viyar.project
function getExportFileNameForMaterial(materialIndex) {
  var dir = getExportDir();
  var base = getExportBaseName();
  var materialName = materials[materialIndex].name.replace(/[\/\\:*?"<>|]/g, ' ');
  return dir + base + '_' + materialName + '_viyar.project';
}

function createDocNode() {
  var docNode = {
	project: {
	  '-currency': '',
	  '-version': '1',
	  '-costOperation': '0',
	  '-costMaterial': '0',
	  '-cost': '0',
	  '-date': '',
	  '-orderDate': '',
	  '-productFilter': false,
	  viyar: {
		'-version': 27,
		order: {
		  '-delivery': '',
		  '-uuid': '',
		},
		creator: {
		  '-id': 'Bazis2Viyar',
		  '-version': SCRIPT_VERSION,
		  '-bazisVersion': system.apiVersion,
		},
		constructor: {
		  '-id': 'dsp',
		  '-site': '',
		}
	  }
	}
  };
  var viyarNode = docNode.project.viyar;

  viyarNode.materials = {};
  viyarNode.materials.material = [];

  var idMaterial = 1;
  var idOffset = 2;
  // materialIndex is set by exportViyarPro() before each readModel() pass.
  var materialNode = {};
  materialNode['-id'] = idMaterial;
  materialNode['-type'] = 'sheet';
  materialNode['-article'] = materials[materialIndex].code;
  materialNode['-name'] = materials[materialIndex].name;
  materialNode['-width'] = 3000;
  materialNode['-height'] = 3000;
  materialNode['-thickness'] = rnds(materials[materialIndex].thickness, 1);
  viyarNode.materials.material.push(materialNode);

  butts.forEach(function(butt) {
	idMaterial++;
	var materialNode = {};
	materialNode['-id'] = idMaterial;
	materialNode['-type'] = 'band';
	materialNode['-article'] = butt.code;
	materialNode['-name'] = butt.name;
	materialNode['-height'] = rnds(butt.width, 1);
	materialNode['-thickness'] = rnds(butt.thickness, 2);
	viyarNode.materials.material.push(materialNode);
  });

  viyarNode.details = {};
  viyarNode.details.detail = [];

  var detailID = 0;
  panels.forEach(function(panel) {
	detailID++;
	var detailNode = {};
	panel.patterns = [];
	panel.corners = [];
	panel.outerStandard = false;
	panel.innerStandard = false;

	if (panel.rectangle) {
	  if (isClippingCapability(panel)) {
		panel.clipping = new ViyarClipping(panel);
		if (panel.clipping.isExist) {
		  clippingLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ';\r\n';
		  if (panel.clipping.type == VIYAR_VERTICAL_CLIPPING) {
			panel.length = panel.length + VIYAR_CLIPPING_EXTRA;
			panel.rightButt = new Butt();
		  }
		  else if (panel.clipping.type == VIYAR_HORIZONTAL_CLIPPING) {
			panel.width = panel.width + VIYAR_CLIPPING_EXTRA;
			panel.topButt = new Butt();
		  }
		}
	  }
	}
	else {
	  var contours = findContours(panel.orderedContour);
	  if (contours.length > 0) {
		panel.outerContour = contours[0];
		panel.outerStandard = standardizeOuterCont(panel);
		if (panel.outerStandard == false) {
		  contourLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ';\r\n';
		  if ((panel.holes.length > 0) || (panel.cuts.length > 0) || (panel.planeCuts.length > 0)) {
			if ((calcLeftLength(panel) == 0) || (calcBottomLength(panel) == 0) ||
			(findLeftButt(panel).isExist && (panel.leftButt.isExist == false)) ||
			(findBottomButt(panel).isExist && (panel.bottomButt.isExist == false))) {
			  coordsLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ';\r\n';
			}
		  }
		}
	  }
	  if (contours.length > 1) {
		panel.innerContours = contours.slice(1);
		panel.innerStandard = standardizeInnerCont(panel);
		if ((panel.innerStandard == false) && (panel.outerStandard == true)) {
		  contourLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ';\r\n';
		}
	  }
	}
	detailNode['-id'] = detailID;
	detailNode['-material'] = '1';
	detailNode['-barcode'] = '';
	detailNode['-amount'] = panel.quantity;
	detailNode['-widthFull'] = rnd(panel.length, 1);
	detailNode['-heightFull'] = rnd(panel.width, 1);

	detailNode['-multiplicity'] = panel.material.multiplicity;
	if (panel.texture == PANEL_TEXTURE_HORIZONTAL) {
	  detailNode['-grain'] = '1';
	}
	else {
	  detailNode['-grain'] = '0';
	}
	if (panel.kind == PANEL_DOOR_TYPE) {
	  detailNode['-detKind'] = 'door';
	}
	else if (panel.kind == PANEL_COUNTERTOP_TYPE) {
	  detailNode['-detKind'] = 'countertop';
	}
	else if (panel.kind == PANEL_PEDESTAL_TYPE) {
	  detailNode['-detKind'] = 'pedestal';
	}
	detailNode['-description'] = getPanelName(panel);
	detailNode['-marker'] ='0';
	if (panel.face == PANEL_FACE_SIDE_1) {
	  detailNode['-decoratedSide'] = 'front';
	}
	else if (panel.face == PANEL_FACE_SIDE_2) {
	  detailNode['-decoratedSide'] = 'back';
	}
	var bottomEdgeType = ''; var leftEdgeType = ''; var topEdgeType = ''; var rightEdgeType = '';
	var bottomEdgeParam = ''; var leftEdgeParam = ''; var topEdgeParam = ''; var rightEdgeParam = '';
	var bottomEdgeAlpha = 0; var leftEdgeAlpha = 0; var topEdgeAlpha = 0; var rightEdgeAlpha = 0;
	var bottomEdgeStart = 0; var leftEdgeStart = 0; var topEdgeStart = 0; var rightEdgeStart = 0;
	if (panel.rectangle || (panel.outerStandard == false)) {
	  if (panel.leftButt.isExist) {
		leftEdgeType = 'kromka';
		leftEdgeParam = butts.getIndex(panel.leftButt) + idOffset;
	  }
	  if (panel.topButt.isExist) {
		topEdgeType = 'kromka';
		topEdgeParam = butts.getIndex(panel.topButt) + idOffset;
	  }
	  if (panel.rightButt.isExist) {
		rightEdgeType = 'kromka';
		rightEdgeParam = butts.getIndex(panel.rightButt) + idOffset;
	  }
	  if (panel.bottomButt.isExist) {
		bottomEdgeType = 'kromka';
		bottomEdgeParam = butts.getIndex(panel.bottomButt) + idOffset;
	  }
	}
	else {
	  var leftButt = findLeftButt(panel);
	  if (leftButt.isExist) {
		leftEdgeType = 'kromka';
		leftEdgeParam = butts.getIndex(leftButt) + idOffset;
	  }
	  var topButt = findTopButt(panel);
	  if (topButt.isExist) {
		topEdgeType = 'kromka';
		topEdgeParam = butts.getIndex(topButt) + idOffset;
	  }
	  var rightButt = findRightButt(panel);
	  if (rightButt.isExist) {
		rightEdgeType = 'kromka';
		rightEdgeParam = butts.getIndex(rightButt) + idOffset;
	  }
	  var bottomButt = findBottomButt(panel);
	  if (bottomButt.isExist) {
		bottomEdgeType = 'kromka';
		bottomEdgeParam = butts.getIndex(bottomButt) + idOffset;
	  }
	}
	panel.grooves = [];
	panel.planeCuts.forEach(function(planeCut) {
	  planeCut.contour.OrderContours();
	  if (planeCut.contour.IsClockOtherWise() == false) {
		planeCut.contour.InvertDirection();
	  }
	  var groove = new ViyarPlaneCutToGroove(panel, planeCut.contour, planeCut.depth);
	  if (groove.isExist) {
		panel.grooves.push(groove);
	  }
	  else {
		var pattern = new ViyarPlaneCutToPattern(panel, planeCut.contour, planeCut.depth);
		if (pattern.isExist) {
		  panel.patterns.push(pattern);
		}
		else {
		  cutoutLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ', ' +
		  'коорд. x = ' + rnds(findMinX(planeCut.contour), 1) + ', y = ' + rnds(findMinY(planeCut.contour), 1) + ';\r\n';
		}
	  }
	});
	var bevels = 0;
	panel.cuts.forEach(function(cut) {
	  var groove = new ViyarCutToGroove(panel, cut);
	  if (groove.isExist) {
		panel.grooves.push(groove);
		if(groove.type == VIYAR_BEVEL) {
		  bevels++;
		  if (groove.start > 0) {
			if (groove.edge == VIYAR_LEFT_SIDE) {
			  leftEdgeType = 'srezkrom';
			  leftEdgeAlpha = rnds(groove.alpha, 1);
			  leftEdgeStart = rnds(groove.start, 1);
			}
			else if(groove.edge == VIYAR_TOP_SIDE) {
			  topEdgeType = 'srezkrom';
			  topEdgeAlpha = rnds(groove.alpha, 1);
			  topEdgeStart = rnds(groove.start, 1);
			}
			else if(groove.edge == VIYAR_RIGHT_SIDE) {
			  rightEdgeType = 'srezkrom';
			  rightEdgeAlpha = rnds(groove.alpha, 1);
			  rightEdgeStart = rnds(groove.start, 1);
			}
			else if(groove.edge == VIYAR_BOTTOM_SIDE) {
			  bottomEdgeType = 'srezkrom';
			  bottomEdgeAlpha = rnds(groove.alpha, 1);
			  bottomEdgeStart = rnds(groove.start, 1);
			}
		  }
		  else {
			if (groove.edge == VIYAR_LEFT_SIDE) {
			  leftEdgeType = 'srez';
			  leftEdgeParam = rnds(groove.alpha, 1);
			}
			else if(groove.edge == VIYAR_TOP_SIDE) {
			  topEdgeType = 'srez';
			  topEdgeParam = rnds(groove.alpha, 1);
			}
			else if(groove.edge == VIYAR_RIGHT_SIDE) {
			  rightEdgeType = 'srez';
			  rightEdgeParam = rnds(groove.alpha, 1);
			}
			else if(groove.edge == VIYAR_BOTTOM_SIDE) {
			  bottomEdgeType = 'srez';
			  bottomEdgeParam = rnds(groove.alpha, 1);
			}
		  }
		}
	  }
	  else {
		grooveLog += '! ' + detailID + ', поз. ' + panel.artPos + ((panel.designation == '') ? '' : (', обозн. ' + panel.designation)) + ', ' + panel.name + ', ' + cut.name + ';\r\n';
	  }
	});
	detailNode.edges = {};

	detailNode.edges.left = {};
	detailNode.edges.left['-type'] = leftEdgeType;
	detailNode.edges.left['-param'] = leftEdgeParam;
	if (leftEdgeStart > 0) {
	  detailNode.edges.left['-srez'] = leftEdgeAlpha;
	  detailNode.edges.left['-krstart'] = leftEdgeStart;
	}
	detailNode.edges.left['-drop'] = '0';

	detailNode.edges.top = {};
	detailNode.edges.top['-type'] = topEdgeType;
	detailNode.edges.top['-param'] = topEdgeParam;
	if (topEdgeStart > 0) {
	  detailNode.edges.top['-srez'] = topEdgeAlpha;
	  detailNode.edges.top['-krstart'] = topEdgeStart;
	}
	detailNode.edges.top['-drop'] = '0';

	detailNode.edges.right = {};
	detailNode.edges.right['-type'] = rightEdgeType;
	detailNode.edges.right['-param'] = rightEdgeParam;
	if (rightEdgeStart > 0) {
	  detailNode.edges.right['-srez'] = rightEdgeAlpha;
	  detailNode.edges.right['-krstart'] = rightEdgeStart;
	}
	detailNode.edges.right['-drop'] = '0';

	detailNode.edges.bottom = {};
	detailNode.edges.bottom['-type'] = bottomEdgeType;
	detailNode.edges.bottom['-param'] = bottomEdgeParam;
	if (bottomEdgeStart > 0) {
	  detailNode.edges.bottom['-srez'] = bottomEdgeAlpha;
	  detailNode.edges.bottom['-krstart'] = bottomEdgeStart;
	}
	detailNode.edges.bottom['-drop'] = '0';

	panel.drillings = [];
	panel.holes.forEach(function(hole) {
	  var drilling = new ViyarDrilling(panel, hole);
	  if (drilling.isExist) {
		panel.drillings.push(drilling);
	  }
	});

	if ((panel.drillings.length > 0) || (panel.grooves.length > bevels) || (panel.corners.length > 0) || (panel.patterns.length > 0)) {
	  detailNode.operations = {};
	  detailNode.operations.operation = [];
	  var operationID = 0;
	}
	if ((panel.clipping != undefined) && panel.clipping.isExist) {
	  operationID++;
	  var operNode = {};
	  operNode['-id'] = operationID;
	  operNode['-type'] = 'clipping';
	  operNode['-cutHSize'] = rnd(panel.clipping.cutHSize, 1);
	  operNode['-cutHBase'] = panel.clipping.cutHBase;
	  if (panel.clipping.edgeMaterialH.isExist) {
		operNode['-edgeMaterialH'] = butts.getIndex(panel.clipping.edgeMaterialH) + idOffset;
	  }
	  else {
		operNode['-edgeMaterialH'] = '';
	  }
	  operNode['-cutVSize'] = rnd(panel.clipping.cutVSize, 1);
	  operNode['-cutVBase'] = panel.clipping.cutVBase;
	  if (panel.clipping.edgeMaterialV.isExist) {
		operNode['-edgeMaterialV'] = butts.getIndex(panel.clipping.edgeMaterialV) + idOffset;
	  }
	  else {
		operNode['-edgeMaterialV'] = '';
	  }
	  operNode['-edgeLengthH'] = '';
	  operNode['-edgeLengthV'] = '';
	  detailNode.operations.operation.push(operNode);
	}
	panel.drillings.forEach(function(drilling) {
	  operationID++;
	  var operNode = {};
	  operNode['-id'] = operationID;
	  operNode['-type'] = 'drilling';
	  if (drilling.subType != undefined) {
		operNode['-subtype'] = drilling.subType;
	  }
	  operNode['-side'] = drilling.side;
	  operNode['-x'] = rnd(drilling.x, 1);
	  operNode['-y'] = rnd(drilling.y, 1);
	  operNode['-xo'] = rnd(drilling.x, 1);
	  operNode['-yo'] = rnd(drilling.y, 1);
	  operNode['-xl'] = '0';
	  operNode['-yl'] = '0';
	  operNode['-d'] = rnds(drilling.diameter, 1);
	  operNode['-depth'] = rnd(drilling.depth, 1);
	  detailNode.operations.operation.push(operNode);
	});
	if (panel.grooves.length > bevels) {
	  panel.grooves.forEach(function(groove) {
		if(groove.type == VIYAR_RABBETING) {
		  operationID++;
		  var operNode = {};
		  operNode['-id'] = operationID;
		  operNode['-type'] = 'rabbeting';
		  operNode['-side'] = groove.side;
		  operNode['-subtype'] = '';
		  operNode['-edge'] = groove.edge;
		  operNode['-shift'] = rnd(groove.shift, 1);
		  operNode['-width'] = rnd(groove.width, 1);
		  operNode['-length'] = rnd(groove.length, 1);
		  operNode['-closed'] = groove.closed;
		  operNode['-depth'] = rnd(groove.depth, 1);
		  if (groove.radius != undefined) {
			operNode['-radius'] = rnd(groove.radius, 1);
		  }
		  detailNode.operations.operation.push(operNode);
		}
		else if (groove.type == VIYAR_GROOVING) {
		  operationID++;
		  var operNode = {};
		  operNode['-id'] = operationID;
		  operNode['-type'] = 'grooving';
		  operNode['-side'] = groove.side;
		  operNode['-subtype'] = groove.subType;
		  operNode['-x'] = rnd(groove.x, 1);
		  operNode['-y'] = rnd(groove.y, 1);
		  operNode['-width'] = rnd(groove.width, 1);
		  operNode['-length'] = rnd(groove.length, 1);
		  operNode['-closed'] = groove.closed;
		  operNode['-depth'] = rnd(groove.depth, 1);
		  if (groove.radius != undefined) {
			operNode['-radius'] = rnd(groove.radius, 1);
		  }
		  detailNode.operations.operation.push(operNode);
		}
	  });
	}
	panel.corners.forEach(function(corner) {
	  operationID++;
	  var operNode = {};
	  operNode['-id'] = operationID;
	  operNode['-type'] = VIYAR_CORNER_OPERATION;
	  operNode['-corner'] = corner.crn;
	  operNode['-subtype'] = corner.subType;
	  operNode['-xFull'] = rnd(corner.x, 1);
	  operNode['-yFull'] = rnd(corner.y, 1);
	  if (corner.radius > 0) {
		operNode['-rFull'] = rnd(corner.radius, 1);
	  }
	  if (corner.subType == VIYAR_CUTOUT_CORNER) {
		operNode['-ext'] = corner.ext;
	  }
	  if (corner.butt != undefined) {
		operNode['-edgeMaterial'] = butts.getIndex(corner.butt) + idOffset;
	  }
	  else {
		operNode['-edgeMaterial'] = '';
	  }
	  operNode['-edgeCovering'] = corner.covering;
	  detailNode.operations.operation.push(operNode);
	});
	panel.patterns.forEach(function(pattern) {
	  if (pattern.patternId == VIYAR_PATTERN_U_SHAPE) {
		operationID++;
		var operNode = {};
		operNode['-id'] = operationID;
		operNode['-type'] = pattern.type;
		operNode['-direction'] = '0';
		operNode['-patternId'] = pattern.patternId;
		operNode['-ext'] = pattern.ext;
		operNode['-edgeId'] = pattern.edge;
		operNode['-shift'] = rnd(pattern.shift, 1);
		operNode['-sizeH'] = rnd(pattern.sizeH, 1);
		operNode['-sizeV'] = rnd(pattern.sizeV, 1);
		operNode['-radius'] = rnd(pattern.radius, 1);
		if (pattern.butt != undefined) {
		  operNode['-edgeMaterial'] = butts.getIndex(pattern.butt) + idOffset;
		}
		else {
		  operNode['-edgeMaterial'] = '';
		}
		detailNode.operations.operation.push(operNode);
	  }
	  else if (pattern.patternId == VIYAR_PATTERN_RECTANGULAR) {
		operationID++;
		var operNode = {};
		operNode['-id'] = operationID;
		operNode['-type'] = pattern.type;
		operNode['-patternId'] = pattern.patternId;
		operNode['-ext'] = pattern.ext;
		operNode['-shiftX'] = rnd(pattern.shiftX, 1);
		operNode['-shiftY'] = rnd(pattern.shiftY, 1);
		operNode['-sizeH'] = rnd(pattern.sizeH, 1);
		operNode['-sizeV'] = rnd(pattern.sizeV, 1);
		operNode['-radius'] = rnd(pattern.radius, 1);
		operNode['-joint'] = '0';
		if (pattern.butt != undefined) {
		  operNode['-edgeMaterial'] = butts.getIndex(pattern.butt) + idOffset;
		}
		else {
		  operNode['-edgeMaterial'] = '';
		}
		detailNode.operations.operation.push(operNode);
	  }
	  else if (pattern.patternId == VIYAR_PATTERN_CIRCLE) {
		operationID++;
		var operNode = {};
		operNode['-id'] = operationID;
		operNode['-type'] = pattern.type;
		operNode['-patternId'] = pattern.patternId;
		operNode['-shiftX'] = rnd(pattern.shiftX, 1);
		operNode['-shiftY'] = rnd(pattern.shiftY, 1);
		operNode['-radius'] = rnd(pattern.radius, 1);
		operNode['-x'] = rnd(pattern.shiftX, 1);
		operNode['-y'] = rnd(pattern.shiftY, 1);
		operNode['-r'] = rnd(pattern.radius, 1);
		if (pattern.butt != undefined) {
		  operNode['-edgeMaterial'] = butts.getIndex(pattern.butt) + idOffset;
		}
		else {
		  operNode['-edgeMaterial'] = '';
		}
		operNode['-joint'] = '0';
		detailNode.operations.operation.push(operNode);
	  }
	  else if (pattern.patternId == VIYAR_PATTERN_ARC) {
		operationID++;
		var operNode = {};
		operNode['-id'] = operationID;
		operNode['-type'] = pattern.type;
		operNode['-patternId'] = pattern.patternId;
		operNode['-shift'] = rnd(pattern.shift, 1);
		operNode['-edgeId'] = pattern.edge;
		operNode['-inner'] = pattern.inner;
		if (pattern.butt != undefined) {
		  operNode['-edgeMaterial'] = butts.getIndex(pattern.butt) + idOffset;
		}
		else {
		  operNode['-edgeMaterial'] = '';
		}
		detailNode.operations.operation.push(operNode);
	  }
	  else if (pattern.patternId == VIYAR_PATTERN_SMILE) {
		operationID++;
		var operNode = {};
		operNode['-id'] = operationID;
		operNode['-type'] = pattern.type;
		operNode['-patternId'] = pattern.patternId;
		operNode['-edgeId'] = pattern.edge;
		operNode['-shift'] = rnd(pattern.shift, 1);
		operNode['-sizeH'] = rnd(pattern.sizeH, 1);
		operNode['-sizeV'] = rnd(pattern.sizeV, 1);
		if (pattern.butt != undefined) {
		  operNode['-edgeMaterial'] = butts.getIndex(pattern.butt) + idOffset;
		}
		else {
		  operNode['-edgeMaterial'] = '';
		}
		operNode['-standartValue'] = rnd(pattern.value, 1);
		operNode['-standartCheck'] = pattern.standart;
		operNode['-center'] = '';
		operNode['-shiftForNotStandart'] = '0';
		detailNode.operations.operation.push(operNode);
	  }
	});
	viyarNode.details.detail.push(detailNode);
  });

  if ((accessoriesCheckBox.Value == true) && (furns.length > 0)) {
	var id = 0;
	viyarNode.products = {};
	viyarNode.products.product = [];
	furns.forEach(function(furn) {
	  id++;
	  var productNode = {};
	  productNode['-id'] = id;
	  productNode['-article'] = furn.code;
	  productNode['-name'] = furn.name;
	  productNode['-amount'] = furn.quantity;
	  viyarNode.products.product.push(productNode);
	});
  }
  return docNode;
}

function getPanelName(panel) {
  var result = panel.name;
  if (formatCombo.Value == POSITION_NAME_FORMAT) {
	result = panel.artPos + '.' +  result;
  }
  else if (formatCombo.Value == DESIGNATION_NAME_FORMAT) {
	result = panel.designation + '.' +  result;
  }
  else if (formatCombo.Value == ORDER_POSITION_NAME_FORMAT) {
	result = getOrderName() + '.' + panel.artPos + '.' +  result;
  }
  else if (formatCombo.Value == ORDER_DESIGNATION_NAME_FORMAT) {
	result = getOrderName() + '.' + panel.designation + '.' +  result;
  }
  if (panel.material.multiplicity > 1) {
	result = result + ' Сращ.(' + panel.material.multiplicity + ')';
  }
  return result;
}

function standardizeInnerCont(panel) {
  var result = true;
  panel.innerContours.forEach(function(contour) {
	var pattern = new CircleShape(contour);
	if (pattern.isExist) {
	  panel.patterns.push(pattern);
	}
	else {
	  var pattern = new RectShape(contour);
	  if (pattern.isExist) {
		panel.patterns.push(pattern);
	  }
	  else {
		var pattern = new RoundRectShape(contour);
		if (pattern.isExist) {
		  panel.patterns.push(pattern);
		}
		else {
		  result = false;
		}
	  }
	}
  });
  return result;
}

function CircleShape(contour) {
  this.isExist = false;
  this.quant = isCircleShape(contour);
  if (this.quant > 0) {
	var i0 = 0;
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_CIRCLE;
	this.shiftX = contour[i0].Center.x;
	this.shiftY = contour[i0].Center.y;
	this.radius = contour[i0].CirRadius;

	this.butt = undefined;
	var butt = new Butt(contour[i0]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isCircleShape(contour) {
  if ((contour.Count == 1) && contour[0].IsCircle()) {
	return 1;
  }
  return 0;
}

function RectShape(contour) {
  this.isExist = false;
  this.quant = isRectShape(contour);
  if (this.quant > 0) {
	var minX = findMinX(contour);
	var maxX = findMaxX(contour);
	var minY = findMinY(contour);
	var maxY = findMaxY(contour);
	if ((maxX > minX) && (maxY > minY) && cmprt(maxX - minX, VIYAR_RECT_SHAPE_THRESHOLD) && cmprt(maxY - minY, VIYAR_RECT_SHAPE_THRESHOLD)) {
	  var i0 = 0;
	  this.type = VIYAR_SHAPE_BY_PATTERN;
	  this.patternId = VIYAR_PATTERN_RECTANGULAR;
	  this.ext = VIYAR_WITH_EXT;
	  this.shiftX = minX;
	  this.shiftY = minY;
	  this.sizeH = maxX - minX;
	  this.sizeV = maxY - minY;
	  this.radius = 0;

	  this.butt = undefined;
	  var butt = new Butt(contour[i0]);
	  if (butt.isExist) {
		this.butt = butt;
	  }
	  this.isExist = true;
	}
  }
}

function isRectShape(contour) {
  if (contour.Count == 4) {
	var i0 = 0;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	if (contour.IsContourRectangle() && (isVertLine(contour[i0]) || isHorLine(contour[i0]))) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  var butt3 = new Butt(contour[i3]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3)) {
		return 4;
	  }
	}
  }
  return 0;
}

function RoundRectShape(contour) {
  this.isExist = false;
  this.quant = isRoundRectShape(contour);
  if (this.quant > 0) {
	var minX = findMinX(contour);
	var maxX = findMaxX(contour);
	var minY = findMinY(contour);
	var maxY = findMaxY(contour);
	if ((maxX > minX) && (maxY > minY) && cmprt(maxX - minX, VIYAR_RECT_SHAPE_THRESHOLD) && cmprt(maxY - minY, VIYAR_RECT_SHAPE_THRESHOLD)) {
	  var i0 = 0;
	  this.type = VIYAR_SHAPE_BY_PATTERN;
	  this.patternId = VIYAR_PATTERN_RECTANGULAR;
	  this.ext = VIYAR_WITHOUT_EXT;
	  this.shiftX = minX;
	  this.shiftY = minY;
	  this.sizeH = maxX - minX;
	  this.sizeV = maxY - minY;
	  this.radius = findRectRadius(contour);

	  this.butt = undefined;
	  var butt = new Butt(contour[i0]);
	  if (butt.isExist) {
		this.butt = butt;
	  }
	  this.isExist = true;
	}
  }
}

function isRoundRectShape(contour) {
  if (contour.Count == 8) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		var i4 = nextIndex(contCopy, i3);
		var i5 = nextIndex(contCopy, i4);
		var i6 = nextIndex(contCopy, i5);
		var i7 = nextIndex(contCopy, i6);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir &&
		contCopy[i2].IsLine() && contCopy[i3].IsArc() && !contCopy[i3].ArcDir &&
		contCopy[i4].IsLine() && contCopy[i5].IsArc() && !contCopy[i5].ArcDir &&
		contCopy[i6].IsLine() && contCopy[i7].IsArc() && !contCopy[i7].ArcDir &&
		isHorLine(contCopy[i0]) && isVertLine(contCopy[i2]) && isHorLine(contCopy[i4]) && isVertLine(contCopy[i6]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.y, contCopy[i1].Center.y) &&
		cmpr(contCopy[i3].Pos2.x, contCopy[i3].Center.x) && cmpr(contCopy[i3].Pos1.y, contCopy[i3].Center.y) &&
		cmpr(contCopy[i5].Pos1.x, contCopy[i5].Center.x) && cmpr(contCopy[i5].Pos2.y, contCopy[i5].Center.y) &&
		cmpr(contCopy[i7].Pos2.x, contCopy[i7].Center.x) && cmpr(contCopy[i7].Pos1.y, contCopy[i7].Center.y) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i3].ArcRadius()) &&
		cmpr(contCopy[i3].ArcRadius(), contCopy[i5].ArcRadius()) &&
		cmpr(contCopy[i5].ArcRadius(), contCopy[i7].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  var butt0 = new Butt(contCopy[i0]);
		  var butt1 = new Butt(contCopy[i1]);
		  var butt2 = new Butt(contCopy[i2]);
		  var butt3 = new Butt(contCopy[i3]);
		  var butt4 = new Butt(contCopy[i4]);
		  var butt5 = new Butt(contCopy[i5]);
		  var butt6 = new Butt(contCopy[i6]);
		  var butt7 = new Butt(contCopy[i7]);
		  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3) &&
		  butt3.isEqual(butt4) && butt4.isEqual(butt5) && butt5.isEqual(butt6) && butt6.isEqual(butt7)) {
			return 8;
		  }
		}
	  }
	}
  }
  if (contour.Count == 6) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		var i4 = nextIndex(contCopy, i3);
		var i5 = nextIndex(contCopy, i4);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir && contCopy[i2].IsArc() && !contCopy[i2].ArcDir &&
		contCopy[i3].IsLine() && contCopy[i4].IsArc() && !contCopy[i4].ArcDir && contCopy[i5].IsArc() && !contCopy[i5].ArcDir &&
		isHorLine(contCopy[i0]) && isHorLine(contCopy[i3]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.y, contCopy[i1].Center.y) &&
		cmpr(contCopy[i2].Pos2.x, contCopy[i2].Center.x) && cmpr(contCopy[i2].Pos1.y, contCopy[i2].Center.y) &&
		cmpr(contCopy[i4].Pos1.x, contCopy[i4].Center.x) && cmpr(contCopy[i4].Pos2.y, contCopy[i4].Center.y) &&
		cmpr(contCopy[i5].Pos2.x, contCopy[i5].Center.x) && cmpr(contCopy[i5].Pos1.y, contCopy[i5].Center.y) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i2].ArcRadius()) &&
		cmpr(contCopy[i2].ArcRadius(), contCopy[i4].ArcRadius()) &&
		cmpr(contCopy[i4].ArcRadius(), contCopy[i5].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  var butt0 = new Butt(contCopy[i0]);
		  var butt1 = new Butt(contCopy[i1]);
		  var butt2 = new Butt(contCopy[i2]);
		  var butt3 = new Butt(contCopy[i3]);
		  var butt4 = new Butt(contCopy[i4]);
		  var butt5 = new Butt(contCopy[i5]);
		  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3) && butt3.isEqual(butt4) && butt4.isEqual(butt5)) {
			return 6;
		  }
		}
	  }
	}
  }
  if (contour.Count == 4) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir &&
		contCopy[i2].IsLine() && contCopy[i3].IsArc() && !contCopy[i3].ArcDir &&
		isHorLine(contCopy[i0]) && isHorLine(contCopy[i2]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.x, contCopy[i1].Center.x) &&
		cmpr(contCopy[i3].Pos1.x, contCopy[i3].Center.x) && cmpr(contCopy[i3].Pos2.x, contCopy[i3].Center.x) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i3].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  var butt0 = new Butt(contCopy[i0]);
		  var butt1 = new Butt(contCopy[i1]);
		  var butt2 = new Butt(contCopy[i2]);
		  var butt3 = new Butt(contCopy[i3]);
		  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3)) {
			return 4;
		  }
		}
	  }
	}
  }
  return 0;
}

function standardizeOuterCont(panel) {
  var cntr = 0;
  var contourCopy = NewContour();
  contourCopy.AddList(panel.outerContour.MakeCopy());
  for (var crn = 4; crn > 0; crn--) {
	contourCopy.Rotate(0, 0, -90.0);
	var minX = findMinX(contourCopy);
	var minY = findMinY(contourCopy);
	contourCopy.Move(minX * -1.0, minY * -1.0);
	for (var i = 0; i < contourCopy.Count; i++) {
	  var side = new SideLine(panel, contourCopy, crn, i);
	  if (side.isExist) {
		cntr += side.quant;
	  }
	  else {
		var corner = new RadiusCorner(panel, contourCopy, crn, i);
		if (corner.isExist) {
		  cntr += corner.quant;
		  panel.corners.push(corner);
		}
		else {
		  var corner = new AngleCutCorner(panel, contourCopy, crn, i);
		  if (corner.isExist) {
			cntr += corner.quant;
			panel.corners.push(corner);
		  }
		  else {
			var corner = new CutoutCorner(panel, contourCopy, crn, i);
			if (corner.isExist) {
			  cntr += corner.quant;
			  panel.corners.push(corner);
			}
			else {
			  var corner = new RoundCutoutCorner1(panel, contourCopy, crn, i);
			  if (corner.isExist) {
				cntr += corner.quant;
				panel.corners.push(corner);
			  }
			  else {
				var corner = new RoundCutoutCorner2(panel, contourCopy, crn, i);
				if (corner.isExist) {
				  cntr += corner.quant;
				  panel.corners.push(corner);
				}
				else {
				  var pattern = new RectCutout(panel, contourCopy, crn, i);
				  if (pattern.isExist) {
					cntr += pattern.quant;
					panel.patterns.push(pattern);
				  }
				  else {
					var pattern = new RoundRectCutout1(panel, contourCopy, crn, i);
					if (pattern.isExist) {
					  cntr += pattern.quant;
					  panel.patterns.push(pattern);
					}
					else {
					  var pattern = new RoundRectCutout2(panel, contourCopy, crn, i);
					  if (pattern.isExist) {
						cntr += pattern.quant;
						panel.patterns.push(pattern);
					  }
					  else {
						var pattern = new ConflRoundRectCutout1(panel, contourCopy, crn, i);
						if (pattern.isExist) {
						  cntr += pattern.quant;
						  panel.patterns.push(pattern);
						}
						else {
						  var pattern = new ConflRoundRectCutout2(panel, contourCopy, crn, i);
						  if (pattern.isExist) {
							cntr += pattern.quant;
							panel.patterns.push(pattern);
						  }
						  else {
							var pattern = new OuterArc(panel, contourCopy, crn, i);
							if (pattern.isExist) {
							  cntr += pattern.quant;
							  panel.patterns.push(pattern);
							}
							else {
							  var pattern = new InnerArc(panel, contourCopy, crn, i);
							  if (pattern.isExist) {
								cntr += pattern.quant;
								panel.patterns.push(pattern);
							  }
							  else {
								var pattern = new StandartSmile(panel, contourCopy, crn, i);
								if (pattern.isExist) {
								  cntr += pattern.quant;
								  panel.patterns.push(pattern);
								}
								else {
								  var pattern = new NotStandartSmile(panel, contourCopy, crn, i);
								  if (pattern.isExist) {
									cntr += pattern.quant;
									panel.patterns.push(pattern);
								  }
								  else {
									var pattern = new HalfCircCutout1(panel, contourCopy, crn, i);
									if (pattern.isExist) {
									  cntr += pattern.quant;
									  panel.patterns.push(pattern);
									}
									else {
									  var pattern = new HalfCircCutout2(panel, contourCopy, crn, i);
									  if (pattern.isExist) {
										cntr += pattern.quant;
										panel.patterns.push(pattern);
									  }
									}
								  }
								}
							  }
							}
						  }
						}
					  }
					}
				  }
				}
			  }
			}
		  }
		}
	  }
	}
  }
  if ((cntr == contourCopy.Count) && (cntr > 0)) {
	return true;
  }
  panel.patterns.length = 0;
  panel.corners.length = 0;
  return false;
}

function SideLine(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isSideLine(contour, index);
  if (this.quant > 0) {
	this.isExist = true;
  }
}

function isSideLine(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (contour[i0].IsLine() && cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
	  return 1;
	}
  }
  return 0;
}

function RadiusCorner(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRadiusCorner(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.subType = VIYAR_RADIUS_CORNER;
	this.crn = crn;
	this.radius = contour[i0].ArcRadius();
	this.x = this.radius;
	this.y = this.radius;
	this.ext = VIYAR_WITHOUT_EXT;

	this.butt = undefined;
	var butt = new Butt(contour[i0]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.covering = VIYAR_BOTH_COVERING;
	this.isExist = true;
  }
}

function isRadiusCorner(contour, index) {
  if (contour.Count > 2) {
	var i0 = index;
	if (contour[i0].IsArc() && !contour[i0].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.x, 0) &&
	cmprt(contour[i0].Center.y, VIYAR_RADIUS_CORNER_THRESHOLD) && cmprt(contour[i0].Center.x, VIYAR_RADIUS_CORNER_THRESHOLD) &&
	cmprd(contour[i0].Center.x, contour[i0].Pos1.x) && cmprd(contour[i0].Center.y, contour[i0].Pos2.y)) {
	  return 1;
	}
  }
  return 0;
}

function AngleCutCorner(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isAngleCutCorner(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.subType = VIYAR_ANGLE_CUT_CORNER;
	this.crn = crn;
	this.ext = VIYAR_WITHOUT_EXT;
	this.radius = 0;

	var butt = new Butt(contour[i0]);
	this.x = contour[i0].Pos1.x;
	this.y = contour[i0].Pos2.y;

	if ((crn == 2) || (crn == 4)) {
	  if (this.y > panel.length) {
		this.y = panel.length;
	  }
	  if (this.x > panel.width) {
		this.x = panel.width;
	  }
	  var temp = this.x;
	  this.x = this.y;
	  this.y = temp;
	}
	else {
	  if (this.y > panel.width) {
		this.y = panel.width;
	  }
	  if (this.x > panel.length) {
		this.x = panel.length;
	  }
	}
	this.butt = undefined;
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.covering = VIYAR_BOTH_COVERING;
	this.isExist = true;
  }
}

function isAngleCutCorner(contour, index) {
  if (contour.Count > 2) {
	var i0 = index;
	if (contour[i0].IsLine() && cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.x, 0) &&
	cmprt(contour[i0].Pos2.y, VIYAR_ANGLE_CUT_THRESHOLD) && cmprt(contour[i0].Pos1.x, VIYAR_ANGLE_CUT_THRESHOLD)) {
	  return 1;
	}
  }
  return 0;
}

function CutoutCorner(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isCutoutCorner(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	this.subType = VIYAR_CUTOUT_CORNER;
	this.crn = crn;
	this.ext = VIYAR_WITH_EXT;
	this.radius = 0;

	var vertButt = new Butt(contour[i0]);
	var horButt = new Butt(contour[i1]);
	if ((crn == 2) || (crn == 4)) {
	  this.x = contour[i1].Pos1.y;
	  this.y = contour[i0].Pos2.x;
	}
	else if ((crn == 1) || (crn == 3)) {
	  this.x = contour[i0].Pos2.x;
	  this.y = contour[i1].Pos1.y;
	}
	this.butt = undefined;
	if (vertButt.isExist && horButt.isExist) {
	  this.butt = vertButt;
	  this.covering = VIYAR_BOTH_COVERING;
	}
	else if (horButt.isExist) {
	  this.butt = horButt;
	  if ((crn == 1) || (crn == 3)) {
		this.covering = VIYAR_HORIZONTAL_COVERING;
	  }
	  else {
		this.covering = VIYAR_VERTICAL_COVERING;
	  }
	}
	else if (vertButt.isExist) {
	  this.butt = vertButt;
	  if ((crn == 1) || (crn == 3)) {
		this.covering = VIYAR_VERTICAL_COVERING;
	  }
	  else {
		this.covering = VIYAR_HORIZONTAL_COVERING;
	  }
	}
	else {
	  this.covering = VIYAR_BOTH_COVERING;
	}
	this.isExist = true;
  }
}

function isCutoutCorner(contour, index) {
  if (contour.Count > 4) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	if (isVertLine(contour[i0]) && isHorLine(contour[i1]) &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i1].Pos2.x, 0) &&
	cmprt(contour[i0].Pos2.y, VIYAR_CUTOUT_THRESHOLD) && cmprt(contour[i1].Pos1.x, VIYAR_CUTOUT_THRESHOLD)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  if (butt0.isExist && butt1.isExist) {
		if (butt0.isEqual(butt1)) {
		  return 2;
		}
		else {
		  return 0;
		}
	  }
	  return 2;
	}
  }
  return 0;
}

function RoundCutoutCorner1(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRoundCutoutCorner1(contour, index);
  if (this.quant > 0) {
	var i1 = nextIndex(contour, index);
	this.subType = VIYAR_CUTOUT_CORNER;
	this.crn = crn;
	this.ext = VIYAR_WITHOUT_EXT;

	var butt = new Butt(contour[i1]);
	this.radius = contour[i1].ArcRadius();
	if ((crn == 2) || (crn == 4)) {
	  this.x = contour[i1].Pos2.y;
	  this.y = contour[i1].Pos1.x;
	}
	else if ((crn == 1) || (crn == 3)) {
	  this.x = contour[i1].Pos1.x;
	  this.y = contour[i1].Pos2.y;
	}

	this.butt = undefined;
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.covering = VIYAR_BOTH_COVERING;
	this.isExist = true;
  }
}

function isRoundCutoutCorner1(contour, index) {
  if (contour.Count > 3) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	if (isVertLine(contour[i0]) && isHorLine(contour[i2]) &&
	contour[i1].IsArc() && contour[i1].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i2].Pos2.x, 0) &&
	(contour[i0].Pos1.y < contour[i0].Pos2.y) && (contour[i2].Pos2.x < contour[i2].Pos1.x) &&
	cmpr(contour[i1].Center.x, contour[i1].Pos2.x) && cmpr(contour[i1].Center.y, contour[i1].Pos1.y) &&
	(contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2)) {
		return 3;
	  }
	}
	else if (isVertLine(contour[i0]) && contour[i1].IsArc() && contour[i1].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i1].Pos2.x, 0) && (contour[i0].Pos1.y < contour[i0].Pos2.y) &&
	cmprd(contour[i1].Center.x, contour[i1].Pos2.x) && cmprd(contour[i1].Center.y, contour[i1].Pos1.y) &&
	(contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  if (butt0.isEqual(butt1)) {
		return 2;
	  }
	}
  }
  return 0;
}

function RoundCutoutCorner2(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRoundCutoutCorner2(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.subType = VIYAR_CUTOUT_CORNER;
	this.crn = crn;
	this.ext = VIYAR_WITHOUT_EXT;

	var butt = new Butt(contour[i0]);
	this.radius = contour[i0].ArcRadius();
	if ((crn == 2) || (crn == 4)) {
	  this.x = contour[i0].Pos2.y;
	  this.y = contour[i0].Pos1.x;
	}
	else if ((crn == 1) || (crn == 3)) {
	  this.x = contour[i0].Pos1.x;
	  this.y = contour[i0].Pos2.y;
	}

	this.butt = undefined;
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.covering = VIYAR_BOTH_COVERING;
	this.isExist = true;
  }
}

function isRoundCutoutCorner2(contour, index) {
  if (contour.Count > 3) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	if (isHorLine(contour[i1]) && contour[i0].IsArc() && contour[i0].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i1].Pos2.x, 0) && (contour[i1].Pos2.x < contour[i1].Pos1.x) &&
	cmprd(contour[i0].Center.x, contour[i0].Pos2.x) && cmprd(contour[i0].Center.y, contour[i0].Pos1.y) &&
	(contour[i0].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  var butt1 = new Butt(contour[i0]);
	  var butt2 = new Butt(contour[i1]);
	  if (butt1.isEqual(butt2)) {
		return 2;
	  }
	}
	else if (contour[i0].IsArc() && contour[i0].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.x, 0) &&
	cmprd(contour[i0].Center.x, 0) && cmprd(contour[i0].Center.y, 0) &&
	(contour[i0].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  return 1;
	}
  }
  return 0;
}

function RectCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRectCutout(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITH_EXT;
	this.radius = 0;

	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width -contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i1]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isRectCutout(contour, index) {
  var i0 = index;
  var i1 = nextIndex(contour, i0);
  var i2 = nextIndex(contour, i1);
  if (contour.Count > 5) {
	if (isVertLine(contour[i0]) && isHorLine(contour[i1]) && isVertLine(contour[i2]) &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i2].Pos2.y, 0) &&
	(contour[i1].Pos2.x < contour[i1].Pos1.x) && cmprt(contour[i1].Pos1.x - contour[i1].Pos2.x, VIYAR_CUTOUT_THRESHOLD) &&
	cmprt(contour[i0].Pos2.y, VIYAR_CUTOUT_THRESHOLD) && cmprt(contour[i2].Pos1.y, VIYAR_CUTOUT_THRESHOLD)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2)) {
		return 3;
	  }
	}
  }
  return 0;
}

function RoundRectCutout1(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRoundRectCutout1(contour, index);
  if (this.quant > 0) {
	var i1 = nextIndex(contour, index);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i1].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i3].Pos2.x;
	  this.sizeH = contour[i2].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i3].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i3].Pos2.x;
	  this.sizeV = contour[i2].Pos2.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i1].Pos1.x;
	  this.sizeH = contour[i2].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i3].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i3].Pos2.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i3].Pos2.x;
	  this.sizeV = contour[i2].Pos2.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i2]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isRoundRectCutout1(contour, index) {
  if (contour.Count > 6) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	var i4 = nextIndex(contour, i3);
	if (contour[i0].IsLine() && contour[i1].IsArc() && contour[i2].IsLine() &&
	contour[i3].IsArc() && contour[i4].IsLine() && contour[i1].ArcDir && contour[i3].ArcDir &&
	isVertLine(contour[i0]) && isHorLine(contour[i2]) && isVertLine(contour[i4]) &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i4].Pos2.y, 0) && (contour[i2].Pos2.x < contour[i2].Pos1.x) &&
	cmprd(contour[i1].ArcRadius(), contour[i3].ArcRadius()) &&
	(contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS) && (contour[i3].ArcRadius() >= VIYAR_MINIMUM_RADIUS) &&
	cmpr(contour[i1].Center.y, contour[i1].Pos1.y) && cmpr(contour[i3].Center.y, contour[i3].Pos2.y)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  var butt3 = new Butt(contour[i3]);
	  var butt4 = new Butt(contour[i4]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) &&
	  butt2.isEqual(butt3) && butt3.isEqual(butt4)) {
		return 5;
	  }
	}
  }
  return 0;
}

function RoundRectCutout2(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isRoundRectCutout2(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i0].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i2].Pos2.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i2].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i0].Pos1.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i2].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i0].Pos1.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i2].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i2].Pos2.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i2].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i1]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isRoundRectCutout2(contour, index) {
  if (contour.Count > 6) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	if (contour[i0].IsArc() && contour[i1].IsLine() && contour[i2].IsArc() &&
	contour[i0].ArcDir && contour[i2].ArcDir && isHorLine(contour[i1]) &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i2].Pos2.y, 0) && (contour[i1].Pos2.x < contour[i1].Pos1.x) &&
	cmprd(contour[i0].ArcRadius(), contour[i2].ArcRadius()) &&
	(contour[i0].ArcRadius() >= VIYAR_MINIMUM_RADIUS) && (contour[i2].ArcRadius() >= VIYAR_MINIMUM_RADIUS) &&
	cmprd(contour[i0].Center.y, contour[i0].Pos1.y) && cmprd(contour[i2].Center.y, contour[i2].Pos2.y)) {
	  var butt1 = new Butt(contour[i0]);
	  var butt2 = new Butt(contour[i1]);
	  var butt3 = new Butt(contour[i2]);
	  if (butt1.isEqual(butt2) && butt2.isEqual(butt3)) {
		return 3;
	  }
	}
  }
  return 0;
}

function ConflRoundRectCutout1(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isConflRoundRectCutout1(contour, index);
  if (this.quant > 0) {
	var i1 = nextIndex(contour, index);
	var i2 = nextIndex(contour, i1);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i1].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i2].Pos2.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i2].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i2].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos2.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i2].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i2].Pos2.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i2].Pos2.x;
	  this.sizeV = contour[i1].Pos2.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i2]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isConflRoundRectCutout1(contour, index) {
  if (contour.Count > 5) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	if (contour[i0].IsLine() && contour[i1].IsArc() && contour[i2].IsArc() && contour[i3].IsLine() &&
	contour[i1].ArcDir && contour[i2].ArcDir && isVertLine(contour[i0]) && isVertLine(contour[i3]) &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i3].Pos2.y, 0) && cmpr(contour[i1].ArcRadius(), contour[i2].ArcRadius()) &&
	(contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS) && (contour[i2].ArcRadius() >= VIYAR_MINIMUM_RADIUS) &&
	cmpr(contour[i1].Center.y, contour[i1].Pos1.y) && cmpr(contour[i2].Center.y, contour[i2].Pos2.y) && cmpr(contour[i1].Center.y, contour[i2].Center.y)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  var butt3 = new Butt(contour[i3]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3)) {
		return 4;
	  }
	}
  }
  return 0;
}

function ConflRoundRectCutout2(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isConflRoundRectCutout2(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i0].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i0].Pos2.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i0].Pos1.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i0].Pos2.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i0].Pos1.x;
	  this.sizeH = contour[i0].Pos2.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i0].Pos2.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i1]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isConflRoundRectCutout2(contour, index) {
  if (contour.Count > 5) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	if (contour[i0].IsArc() && contour[i1].IsArc() && contour[i0].ArcDir && contour[i1].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i1].Pos2.y, 0) && cmprd(contour[i0].ArcRadius(), contour[i1].ArcRadius()) &&
	(contour[i0].ArcRadius() >= VIYAR_MINIMUM_RADIUS) && (contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS) &&
	cmpr(contour[i0].Center.y, contour[i0].Pos1.y) && cmpr(contour[i1].Center.y, contour[i1].Pos2.y) && cmpr(contour[i0].Center.y, contour[i1].Center.y)) {
	  var butt1 = new Butt(contour[i0]);
	  var butt2 = new Butt(contour[i1]);
	  if (butt1.isEqual(butt2)) {
		return 2;
	  }
	}
  }
  return 0;
}

function HalfCircCutout1(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isHalfCircCutout1(contour, index);
  if (this.quant > 0) {
	var i1 = nextIndex(contour, index);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i1].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i1].ArcRadius() + contour[i1].Center.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i1].ArcRadius() + contour[i1].Center.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i1].Pos1.x;
	  this.sizeH = contour[i1].ArcRadius() + contour[i1].Center.y;
	  this.sizeV = contour[i1].Pos1.x - contour[i1].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i1].Pos2.x;
	  this.sizeH = contour[i1].Pos1.x - contour[i1].Pos2.x;
	  this.sizeV = contour[i1].ArcRadius() + contour[i1].Center.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i1]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isHalfCircCutout1(contour, index) {
  if (contour.Count > 3) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	if (contour[i0].IsLine() && contour[i1].IsArc() && contour[i2].IsLine() && contour[i1].ArcDir &&
	isVertLine(contour[i0]) && isVertLine(contour[i2]) && cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i2].Pos2.y, 0) &&
	cmpr(contour[i1].Center.y, contour[i1].Pos1.y) && cmpr(contour[i1].Center.y, contour[i1].Pos2.y) &&
	(contour[i1].Pos2.x < contour[i1].Pos1.x) && (contour[i1].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2)) {
		return 3;
	  }
	}
  }
  return 0;
}

function HalfCircCutout2(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isHalfCircCutout2(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_U_SHAPE;
	this.ext = VIYAR_WITHOUT_EXT;

	this.radius = contour[i0].ArcRadius();
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i0].Pos2.x;
	  this.sizeH = contour[i0].ArcRadius() + contour[i0].Center.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i0].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i0].Pos1.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i0].Pos2.x;
	  this.sizeV = contour[i0].ArcRadius() + contour[i0].Center.y;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i0].Pos1.x;
	  this.sizeH = contour[i0].ArcRadius() + contour[i0].Center.y;
	  this.sizeV = contour[i0].Pos1.x - contour[i0].Pos2.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i0].Pos2.x;
	  this.sizeH = contour[i0].Pos1.x - contour[i0].Pos2.x;
	  this.sizeV = contour[i0].ArcRadius() + contour[i0].Center.y;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i0]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isHalfCircCutout2(contour, index) {
  if (contour.Count > 3) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	if (contour[i0].IsArc() && contour[i0].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && cmpr(contour[i0].Center.y, 0) &&
	(contour[i0].Pos2.x < contour[i0].Pos1.x) && (contour[i0].ArcRadius() >= VIYAR_MINIMUM_RADIUS)) {
	  return 1;
	}
  }
  return 0;
}

function OuterArc(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isOuterArc(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_ARC;
	this.shift = contour[i0].Pos1.x;
	this.inner = VIYAR_OUTER_ARC;
	if (crn == 4) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_RIGHT_SIDE;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_TOP_SIDE;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_LEFT_SIDE;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i0]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isOuterArc(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (contour[i0].IsArc() && !contour[i0].ArcDir && cmpr(contour[i0].Pos1.y, 0) &&
	cmprd(contour[i0].Pos1.x, contour[i0].Pos2.x) && cmpr(contour[i0].Center.x, contour[i0].ArcRadius()) &&
	cmprt(contour[i0].Pos2.y, VIYAR_ARC_THRESHOLD) && cmprd(contour[i0].Center.y, contour[i0].Pos2.y / 2)) {
	  return 1;
	}
  }
  return 0;
}

function InnerArc(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isInnerArc(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_ARC;
	this.shift = contour[i0].Center.x + contour[i0].ArcRadius();
	this.inner = VIYAR_INNER_ARC;
	if (crn == 4) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_RIGHT_SIDE;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_TOP_SIDE;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_LEFT_SIDE;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i0]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isInnerArc(contour, index) {
  if (contour.Count > 3) {
	var i0 = index;
	if (contour[i0].IsArc() && contour[i0].ArcDir && cmpr(contour[i0].Pos1.y, 0) &&
	cmprd(contour[i0].Pos1.x, contour[i0].Pos2.x) && (cmpr(contour[i0].Pos1.x, 0) || cmpr(contour[i0].Pos2.x, 0)) &&
	cmprt(contour[i0].Pos2.y, VIYAR_ARC_THRESHOLD) && cmprd(contour[i0].Center.y, contour[i0].Pos2.y / 2)) {
	  return 1;
	}
  }
  return 0;
}

function StandartSmile(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isStandartSmile(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_SMILE;
	this.value = 0;
	this.sizeH = this.value + 220.0;
	this.sizeV = 30.0;
	this.standart = VIYAR_STANDART_SMILE;
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i2].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i0].Pos1.x;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i0].Pos1.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i2].Pos2.x;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i1]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isStandartSmile(contour, index) {
  if (contour.Count > 6) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	if (contour[i0].IsArc() && contour[i1].IsArc() && contour[i2].IsArc() &&
	!contour[i0].ArcDir && contour[i1].ArcDir && !contour[i2].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i2].Pos2.y, 0) &&
	cmprd(contour[i0].ArcRadius(), 95) && cmprd(contour[i1].ArcRadius(), 122) && cmprd(contour[i2].ArcRadius(), 95)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2)) {
		return 3;
	  }
	}
  }
  return 0;
}

function NotStandartSmile(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isNotStandartSmile(contour, index);
  if (this.quant > 0) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	var i4 = nextIndex(contour, i3);
	this.type = VIYAR_SHAPE_BY_PATTERN;
	this.patternId = VIYAR_PATTERN_SMILE;
	this.value = contour[i2].ObjLength();
	this.sizeH = this.value + 220.0;
	this.sizeV = 30.0;
	this.standart = VIYAR_NOT_STANDART_SMILE;
	if (crn == 4) {
	  this.edge = VIYAR_RIGHT_SIDE;
	  this.shift = contour[i4].Pos2.x;
	}
	else if (crn == 3) {
	  this.edge = VIYAR_TOP_SIDE;
	  this.shift = panel.length - contour[i0].Pos1.x;
	}
	else if (crn == 2) {
	  this.edge = VIYAR_LEFT_SIDE;
	  this.shift = panel.width - contour[i0].Pos1.x;
	}
	else if (crn == 1) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	  this.shift = contour[i4].Pos2.x;
	}

	this.butt = undefined;
	var butt = new Butt(contour[i2]);
	if (butt.isExist) {
	  this.butt = butt;
	}
	this.isExist = true;
  }
}

function isNotStandartSmile(contour, index) {
  if (contour.Count > 7) {
	var i0 = index;
	var i1 = nextIndex(contour, i0);
	var i2 = nextIndex(contour, i1);
	var i3 = nextIndex(contour, i2);
	var i4 = nextIndex(contour, i3);
	if (contour[i0].IsArc() && contour[i1].IsArc() && contour[i2].IsLine() && contour[i3].IsArc() && contour[i4].IsArc() &&
	!contour[i0].ArcDir && contour[i1].ArcDir && contour[i3].ArcDir && !contour[i4].ArcDir &&
	cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i4].Pos2.y, 0) &&
	cmprd(contour[i0].ArcRadius(), 95) && cmprd(contour[i4].ArcRadius(), 95) && (contour[i2].Pos1.x > contour[i2].Pos2.x) &&
	cmprd(contour[i2].Pos1.y, 30) && cmprd(contour[i2].Pos2.y, 30) && cmprt(contour[i2].Pos1.x - contour[i2].Pos2.x, VIYAR_SMILE_THRESHOLD)) {
	  var butt0 = new Butt(contour[i0]);
	  var butt1 = new Butt(contour[i1]);
	  var butt2 = new Butt(contour[i2]);
	  var butt3 = new Butt(contour[i3]);
	  var butt4 = new Butt(contour[i4]);
	  if (butt0.isEqual(butt1) && butt1.isEqual(butt2) && butt2.isEqual(butt3) && butt3.isEqual(butt4)) {
		return 5;
	  }
	}
  }
  return 0;
}

function SideOuterCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isSideOuterCutout(contour, index);
  if (this.quant > 0) {
	this.contour = NewContour();
	var i0 = index;
	for (var cntr = 0; cntr < this.quant; cntr++) {
	  this.contour.AddCopy(contour[i0]);
	  i0 = nextIndex(contour, i0);
	}
	this.params = {};
	this.params.location = 'side';
	if (crn == 4) {
	  this.params.begin = 'right';
	  this.params.end = 'right';
	}
	else if (crn == 3) {
	  this.params.begin = 'top';
	  this.params.end = 'top';
	}
	else if (crn == 2) {
	  this.params.begin = 'left';
	  this.params.end = 'left';
	}
	else if (crn == 1) {
	  this.params.begin = 'bottom';
	  this.params.end = 'bottom';
	}
	this.isExist = true;
  }
}

function isSideOuterCutout(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (cmpr(contour[i0].Pos1.y, 0)) {
	  i1 = i0;
	  var maxX = findMaxX(contour);
	  var maxY = findMaxY(contour);
	  for (cntr = 1; cntr <= contour.Count; cntr++) {
		if (cmpr(contour[i1].Pos2.x, maxX) || cmpr(contour[i1].Pos2.y, maxY)) {
		  return 0;
		}
		if (cmpr(contour[i1].Pos2.y, 0)) {
		  if (contour[i0].Pos1.x > contour[i1].Pos2.x) {
			return cntr;
		  }
		  else {
			return 0;
		  }
		}
		if (cmpr(contour[i1].Pos2.x, 0)) {
		  return 0;
		}
		i1 = nextIndex(contour, i1);
	  }
	}
  }
  return 0;
}

function CornerOuterCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isCornerOuterCutout(contour, index);
  if (this.quant > 0) {
	this.contour = NewContour();
	var i0 = index;
	for (var cntr = 0; cntr < this.quant; cntr++) {
	  this.contour.AddCopy(contour[i0]);
	  i0 = nextIndex(contour, i0);
	}
	this.params = {};
	this.params.location = 'corner';
	if (crn == 4) {
	  this.params.begin = 'right';
	  this.params.end = 'bottom';
	}
	else if (crn == 3) {
	  this.params.begin = 'top';
	  this.params.end = 'right';
	}
	else if (crn == 2) {
	  this.params.begin = 'left';
	  this.params.end = 'top';
	}
	else if (crn == 1) {
	  this.params.begin = 'bottom';
	  this.params.end = 'left';
	}
	this.isExist = true;
  }
}

function isCornerOuterCutout(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (cmpr(contour[i0].Pos1.y, 0) && !cmpr(contour[i0].Pos1.x, 0)) {
	  i1 = i0;
	  var maxX = findMaxX(contour);
	  var maxY = findMaxY(contour);
	  for (cntr = 1; cntr <= contour.Count; cntr++) {
		if (cmpr(contour[i1].Pos2.y, 0) || cmpr(contour[i1].Pos2.x, maxX)) {
		  return 0;
		}
		if (cmpr(contour[i1].Pos2.x, 0)) {
		  return cntr;
		}
		if (cmpr(contour[i1].Pos2.y, maxY)) {
		  return 0;
		}
		i1 = nextIndex(contour, i1);
	  }
	}
  }
  return 0;
}

function OppositeOuterCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isOppositeOuterCutout(contour, index);
  if (this.quant > 0) {
	this.contour = NewContour();
	var i0 = index;
	for (var cntr = 0; cntr < this.quant; cntr++) {
	  this.contour.AddCopy(contour[i0]);
	  i0 = nextIndex(contour, i0);
	}
	this.params = {};
	this.params.location = 'opposite';
	if (crn == 4) {
	  this.params.begin = 'right';
	  this.params.end = 'left';
	}
	else if (crn == 3) {
	  this.params.begin = 'top';
	  this.params.end = 'bottom';
	}
	else if (crn == 2) {
	  this.params.begin = 'left';
	  this.params.end = 'right';
	}
	else if (crn == 1) {
	  this.params.begin = 'bottom';
	  this.params.end = 'top';
	}
	this.isExist = true;
  }
}

function isOppositeOuterCutout(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (cmpr(contour[i0].Pos1.y, 0) && !cmpr(contour[i0].Pos1.x, 0)) {
	  i1 = i0;
	  var maxX = findMaxX(contour);
	  var maxY = findMaxY(contour);
	  for (cntr = 1; cntr <= contour.Count; cntr++) {
		if (cmpr(contour[i1].Pos2.y, 0) || cmpr(contour[i1].Pos2.x, 0)) {
		  return 0;
		}
		if (cmpr(contour[i1].Pos2.y, maxY)) {
		  return cntr;
		}
		if (cmpr(contour[i1].Pos2.x, maxX)) {
		  return 0;
		}
		i1 = nextIndex(contour, i1);
	  }
	}
  }
  return 0;
}

function AdjacentOuterCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isAdjacentOuterCutout(contour, index);
  if (this.quant > 0) {
	this.contour = NewContour();
	var i0 = index;
	for (var cntr = 0; cntr < this.quant; cntr++) {
	  this.contour.AddCopy(contour[i0]);
	  i0 = nextIndex(contour, i0);
	}
	this.params = {};
	this.params.location = 'plane';
	if (crn == 4) {
	  this.params.begin = 'right';
	  this.params.end = 'top';
	}
	else if (crn == 3) {
	  this.params.begin = 'top';
	  this.params.end = 'left';
	}
	else if (crn == 2) {
	  this.params.begin = 'left';
	  this.params.end = 'bottom';
	}
	else if (crn == 1) {
	  this.params.begin = 'bottom';
	  this.params.end = 'right';
	}
	this.isExist = true;
  }
}

function isAdjacentOuterCutout(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (cmpr(contour[i0].Pos1.y, 0) && !cmpr(contour[i0].Pos1.x, 0)) {
	  i1 = i0;
	  var maxX = findMaxX(contour);
	  var maxY = findMaxY(contour);
	  for (cntr = 1; cntr <= contour.Count; cntr++) {
		if (cmpr(contour[i1].Pos2.x, 0) || cmpr(contour[i1].Pos2.y, maxY)) {
		  return 0;
		}
		if (cmpr(contour[i1].Pos2.x, maxX)) {
		  return cntr;
		}
		if (cmpr(contour[i1].Pos2.y, 0)) {
		  return 0;
		}
		i1 = nextIndex(contour, i1);
	  }
	}
  }
  return 0;
}

function PlaneOuterCutout(panel, contour, crn, index) {
  this.isExist = false;
  this.quant = isPlaneOuterCutout(contour, index);
  if (this.quant > 0) {
	this.contour = NewContour();
	var i0 = index;
	for (var cntr = 0; cntr < this.quant; cntr++) {
	  this.contour.AddCopy(contour[i0]);
	  i0 = nextIndex(contour, i0);
	}
	this.params = {};
	this.params.location = 'plane';
	if (crn == 4) {
	  this.params.begin = 'right';
	  this.params.end = 'right';
	}
	else if (crn == 3) {
	  this.params.begin = 'top';
	  this.params.end = 'top';
	}
	else if (crn == 2) {
	  this.params.begin = 'left';
	  this.params.end = 'left';
	}
	else if (crn == 1) {
	  this.params.begin = 'bottom';
	  this.params.end = 'bottom';
	}
	this.isExist = true;
  }
}

function isPlaneOuterCutout(contour, index) {
  if (contour.Count > 1) {
	var i0 = index;
	if (cmpr(contour[i0].Pos1.y, 0) && !cmpr(contour[i0].Pos1.x, 0)) {
	  i1 = i0;
	  var maxX = findMaxX(contour);
	  var maxY = findMaxY(contour);
	  for (cntr = 1; cntr <= contour.Count; cntr++) {
		if (cmpr(contour[i1].Pos2.x, 0) || cmpr(contour[i1].Pos2.y, maxY)) {
		  return 0;
		}
		if (cmpr(contour[i1].Pos2.y, 0)) {
		  return cntr;
		  if (contour[i1].Pos2.x >= contour[i0].Pos1.x) {
			return cntr;
		  }
		  else {
			return 0;
		  }
		}
		if (cmpr(contour[i1].Pos2.x, maxX)) {
		  return 0;
		}
		i1 = nextIndex(contour, i1);
	  }
	}
  }
  return 0;
}

function ViyarClipping(panel) {
  this.isExist = false;
  this.cutHSize = 0;
  this.cutVSize = 0;
  this.cutHBase = "";
  this.edgeMaterialH = "";
  this.edgeLengthH = "";
  this.cutVBase = "";
  this.edgeMaterialV = "";
  this.edgeLengthV = "";
  this.type = VIYAR_WITHOUT_CLIPPING;
  if ((cmprt(panel.width, VIYAR_CLIPPING_THRESHOLD) == false) && (calcDirYHoles(panel, -1, HOLE_BLIND_TYPE) == 0)) {
	this.cutVBase = VIYAR_BOTTOM_SIDE;
	this.cutVSize = panel.width - panel.topButt.thickness;
	this.edgeMaterialV = panel.topButt;
	this.type = VIYAR_HORIZONTAL_CLIPPING;
	this.isExist = true;
  }
  else if ((cmprt(panel.length, VIYAR_CLIPPING_THRESHOLD) == false) && (calcDirXHoles(panel, -1, HOLE_BLIND_TYPE) == 0)) {
	this.cutHBase = VIYAR_LEFT_SIDE;
	this.cutHSize = panel.length - panel.rightButt.thickness;
	this.edgeMaterialH = panel.rightButt;
	this.type = VIYAR_VERTICAL_CLIPPING;
	this.isExist = true;
  }
}

function isClippingCapability(panel) {
  if (panel.rectangle && (panel.cuts.length == 0) && (panel.holes.length > 0)) {
	return true;
  }
  return false;
}

function ViyarDrilling(panel, hole) {
  this.isExist = false;
  this.diameter = hole.diameter;
  if (hole.countersink) {
	this.subType = VIYAR_COUNTERSINK_HOLE;
  }
  if (hole.dirX == 1) {
	this.side = VIYAR_LEFT_SIDE;
	this.x = panel.thickness - hole.posZ;
	this.y = hole.posY;
	this.depth = hole.depth;
	this.isExist = true;
  }
  else if (hole.dirX == -1) {
	this.side = VIYAR_RIGHT_SIDE;
	this.x = panel.thickness - hole.posZ;
	this.y = hole.posY;
	this.depth = hole.depth;
	this.isExist = true;
  }
  else if (hole.dirY == 1) {
	this.side = VIYAR_BOTTOM_SIDE;
	this.x = hole.posX;
	this.y = panel.thickness - hole.posZ;
	this.depth = hole.depth;
	this.isExist = true;
  }
  else if (hole.dirY == -1) {
	this.side = VIYAR_TOP_SIDE;
	this.x = hole.posX;
	this.y = panel.thickness - hole.posZ;
	this.depth = hole.depth;
	this.isExist = true;
  }
  else if (hole.dirZ == 1) {
	this.side = VIYAR_BACK_SIDE;
	this.x = hole.posX;
	this.y = hole.posY;
	this.depth = (hole.type == HOLE_BLIND_TYPE) ? (hole.depth) : (panel.thickness + 5);
	this.isExist = true;
  }
  else if (hole.dirZ == -1) {
	this.side = VIYAR_FRONT_SIDE;
	this.x = hole.posX;
	this.y = hole.posY;
	this.depth = (hole.type == HOLE_BLIND_TYPE) ? (hole.depth) : (panel.thickness + 5);
	this.isExist = true;
  }
}

function ViyarCutToGroove(panel, cut) {
  this.isExist = false;
  this.type = VIYAR_UNDEFINED;
  this.subType = VIYAR_UNDEFINED;
  this.depth = 0;
  this.alpha = 0;
  this.shift = 0;
  this.width = 0;
  this.length = 0;
  this.radius = undefined;
  this.x = 0;
  this.y = 0;
  this.side = VIYAR_UNDEFINED;
  this.edge = VIYAR_UNDEFINED;
  this.closed = 0;

  if (isOrthoLine(cut.trajectory) && isRightTriangle(cut.profile)) {
	for (var i = 0; i < cut.profile.Count; i++) {
	  var line = cut.profile[i];
	  if(isVertLine(line)) {
		var edgeX = line.Pos1.x;
		var bevelDepth = Math.abs(line.Pos2.y - line.Pos1.y);
	  }
	  else if(isHorLine(line)) {
		var sideY = line.Pos1.y;
		var bevelWidth = Math.abs(line.Pos2.x - line.Pos1.x);
	  }
	}
	var traj = cut.trajectory[0];
	this.subType = VIYAR_HORIZONTAL_CUT;
	if (isVertLine(traj)) {
	  this.subType = VIYAR_VERTICAL_CUT;
	}
	var edgeTraj = parallel(traj.Pos1, traj.Pos2, edgeX, false);
	if (cmpr(sideY, 0)) {
	  this.side = VIYAR_BACK_SIDE;
	}
	else if (cmpr(sideY, panel.thickness)) {
	  this.side = VIYAR_FRONT_SIDE;
	}
	if (this.subType == VIYAR_VERTICAL_CUT) {
	  if (cmpr(edgeTraj[0].x, 0)) {
		this.edge = VIYAR_LEFT_SIDE;
	  }
	  if (cmpr(edgeTraj[0].x, panel.length)) {
		this.edge = VIYAR_RIGHT_SIDE;
	  }
	}
	else if (this.subType == VIYAR_HORIZONTAL_CUT) {
	  if (cmpr(edgeTraj[0].y, 0)) {
		this.edge = VIYAR_BOTTOM_SIDE;
	  }
	  if (cmpr(edgeTraj[0].y, panel.width)) {
		this.edge = VIYAR_TOP_SIDE;
	  }
	}
	if ((this.edge != VIYAR_UNDEFINED) && (this.side != VIYAR_UNDEFINED) && !cmpr(bevelWidth, 0) && !cmpr(bevelDepth, 0)) {
	  if (cmpr(bevelDepth, panel.thickness)) {
		if (this.side == VIYAR_FRONT_SIDE) {
		  this.type = VIYAR_BEVEL;
		  this.start = 0;
		  this.alpha = (Math.atan(bevelWidth / panel.thickness) * 180.0) / Math.PI;
		  this.isExist = true;
		}
		else if (this.side == VIYAR_BACK_SIDE) {
		  this.type = VIYAR_BEVEL;
		  this.start = 0;
		  this.alpha = -1.0 * ((Math.atan(bevelWidth / panel.thickness) * 180.0) / Math.PI);
		  this.isExist = true;
		}
	  }
	  else if (bevelDepth < panel.thickness) {
		if (this.side == VIYAR_FRONT_SIDE) {
		  this.type = VIYAR_BEVEL;
		  this.start = panel.thickness - bevelDepth;
		  this.alpha = (Math.atan(bevelWidth / bevelDepth) * 180.0) / Math.PI;
		  this.isExist = true;
		}
		else if (this.side == VIYAR_BACK_SIDE) {
		  this.type = VIYAR_BEVEL;
		  this.start = panel.thickness - bevelDepth;
		  this.alpha = -1.0 * ((Math.atan(bevelWidth / bevelDepth) * 180.0) / Math.PI);
		  this.isExist = true;
		}
	  }
	}
  }
  else if (isOrthoLine(cut.trajectory) && cut.profile.IsContourRectangle()) {
	var line = cut.trajectory[0];
	this.subType = VIYAR_HORIZONTAL_CUT;
	if (isVertLine(line)) {
	  this.subType = VIYAR_VERTICAL_CUT;
	}
	var p = [];
	var arr = parallel(line.Pos1, line.Pos2, findMinX(cut.profile), false);
	p[0] = arr[0];
	p[2] = arr[1];
	var arr = parallel(line.Pos1, line.Pos2, findMaxX(cut.profile), false);
	p[1] = arr[0];
	p[3] = arr[1];

	var i = 0;
	var minX = p[i].x;
	var maxX = minX;
	var minY = p[i].y;
	var maxY = minY;
	while (++i < 4) {
	  if (minX > p[i].x) {
		minX = p[i].x;
	  }
	  if (maxX < p[i].x) {
		maxX = p[i].x;
	  }
	  if (minY > p[i].y) {
		minY = p[i].y;
	  }
	  if (maxY < p[i].y) {
		maxY = p[i].y;
	  }
	}
	var minZ = findMinY(cut.profile);
	var maxZ = findMaxY(cut.profile);

	if (minX < 0) {
	  minX = 0;
	}
	if (minY < 0) {
	  minY = 0;
	}
	if (maxY > panel.width) {
	  maxY = panel.width;
	}
	if (maxX > panel.length) {
	  maxX = panel.length;
	}
	if (minZ < 0) {
	  minZ = 0;
	}
	if (maxZ > panel.thickness) {
	  maxZ = panel.thickness;
	}

	if (cmpr(minZ, 0)) {
	  this.side = VIYAR_BACK_SIDE;
	}
	if (cmpr(maxZ, panel.thickness)) {
	  this.side = VIYAR_FRONT_SIDE;
	}
	if (this.subType == VIYAR_VERTICAL_CUT) {
	  if (cmpr(minX, 0)) {
		this.edge = VIYAR_LEFT_SIDE;
	  }
	  if (cmpr(maxX, panel.length)) {
		this.edge = VIYAR_RIGHT_SIDE;
	  }
	}
	if (this.subType == VIYAR_HORIZONTAL_CUT) {
	  if (cmpr(minY, 0)) {
		this.edge = VIYAR_BOTTOM_SIDE;
	  }
	  if (cmpr(maxY, panel.width)) {
		this.edge = VIYAR_TOP_SIDE;
	  }
	}
	var bottomButtThickness = findBottomButt(panel).thickness;
	var leftButtThickness = findLeftButt(panel).thickness;
	var topButtThickness = findTopButt(panel).thickness;
	var rightButtThickness = findRightButt(panel).thickness;
	if (((maxX - minX) > PRECISION) && ((maxY - minY) > PRECISION) && ((maxZ - minZ) > PRECISION)) {
	  if (this.side == VIYAR_UNDEFINED) {
		if (this.edge != VIYAR_UNDEFINED) {
		  this.type = VIYAR_GROOVING;
		  this.side = this.edge;
		  this.width = maxZ - minZ;
		  if (this.subType == VIYAR_VERTICAL_CUT) {
			this.x = panel.thickness - maxZ;
			this.depth = maxX - minX;

			var topCutClosed = false;
			var bottomCutClosed = false;
			if (cmpr(bottomButtThickness, minY) && (bottomButtThickness > PRECISION)) {
			  bottomCutClosed = true;
			}
			if (cmpr(panel.width, maxY + topButtThickness) && (topButtThickness > PRECISION)) {
			  topCutClosed = true;
			}
			if (bottomCutClosed) {
			  this.y = 0;
			}
			else {
			  this.y = minY;
			}
			if (topCutClosed && bottomCutClosed) {
			  this.length = panel.width;
			}
			else if (topCutClosed) {
			  this.length = panel.width - minY;
			}
			else if (bottomCutClosed) {
			  this.length = maxY;
			}
			else {
			  this.length = maxY - minY;
			}
			if (bottomCutClosed || topCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		  else if (this.subType == VIYAR_HORIZONTAL_CUT) {
			this.y = panel.thickness - maxZ;
			this.depth = maxY - minY;

			var leftCutClosed = false;
			var rightCutClosed = false;
			if (cmpr(leftButtThickness, minX) && (leftButtThickness > PRECISION)) {
			  leftCutClosed = true;
			}
			if (cmpr(panel.length, maxX + rightButtThickness) && (rightButtThickness > PRECISION)) {
			  rightCutClosed = true;
			}
			if (leftCutClosed) {
			  this.x = 0;
			}
			else {
			  this.x = minX;
			}
			if (rightCutClosed && leftCutClosed) {
			  this.length = panel.length;
			}
			else if (rightCutClosed) {
			  this.length = panel.length - minX;
			}
			else if (leftCutClosed) {
			  this.length = maxX;
			}
			else {
			  this.length = maxX - minX;
			}
			if (rightCutClosed || leftCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		}
	  }
	  else {
		if (this.edge == VIYAR_UNDEFINED) {
		  this.type = VIYAR_GROOVING;
		  this.depth = maxZ - minZ;
		  if (this.subType == VIYAR_VERTICAL_CUT) {
			this.x = minX;
			this.width = maxX - minX;

			var topCutClosed = false;
			var bottomCutClosed = false;
			if (cmpr(bottomButtThickness, minY) && (bottomButtThickness > PRECISION)) {
			  bottomCutClosed = true;
			}
			if (cmpr(panel.width, maxY + topButtThickness) && (topButtThickness > PRECISION)) {
			  topCutClosed = true;
			}
			if (bottomCutClosed) {
			  this.y = 0;
			}
			else {
			  this.y = minY;
			}
			if (topCutClosed && bottomCutClosed) {
			  this.length = panel.width;
			}
			else if (topCutClosed) {
			  this.length = panel.width - minY;
			}
			else if (bottomCutClosed) {
			  this.length = maxY;
			}
			else {
			  this.length = maxY - minY;
			}
			if (bottomCutClosed || topCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		  else if (this.subType == VIYAR_HORIZONTAL_CUT) {
			this.y = minY;
			this.width = maxY - minY;

			var leftCutClosed = false;
			var rightCutClosed = false;
			if (cmpr(leftButtThickness, minX) && (leftButtThickness > PRECISION)) {
			  leftCutClosed = true;
			}
			if (cmpr(panel.length, maxX + rightButtThickness) && (rightButtThickness > PRECISION)) {
			  rightCutClosed = true;
			}
			if (leftCutClosed) {
			  this.x = 0;
			}
			else {
			  this.x = minX;
			}
			if (rightCutClosed && leftCutClosed) {
			  this.length = panel.length;
			}
			else if (rightCutClosed) {
			  this.length = panel.length - minX;
			}
			else if (leftCutClosed) {
			  this.length = maxX;
			}
			else {
			  this.length = maxX - minX;
			}
			if (rightCutClosed || leftCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		}
		else {
		  this.type = VIYAR_RABBETING;
		  this.depth = maxZ - minZ;
		  if (this.subType == VIYAR_VERTICAL_CUT) {
			this.width = maxX - minX;

			var topCutClosed = false;
			var bottomCutClosed = false;
			if (cmpr(bottomButtThickness, minY) && (bottomButtThickness > PRECISION)) {
			  bottomCutClosed = true;
			}
			if (cmpr(panel.width, maxY + topButtThickness) && (topButtThickness > PRECISION)) {
			  topCutClosed = true;
			}
			if (bottomCutClosed) {
			  this.shift = 0;
			}
			else {
			  this.shift = minY;
			}
			if (topCutClosed && bottomCutClosed) {
			  this.length = panel.width;
			}
			else if (topCutClosed) {
			  this.length = panel.width - minY;
			}
			else if (bottomCutClosed) {
			  this.length = maxY;
			}
			else {
			  this.length = maxY - minY;
			}
			if (bottomCutClosed || topCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		  else if (this.subType == VIYAR_HORIZONTAL_CUT) {
			this.width = maxY - minY;

			var leftCutClosed = false;
			var rightCutClosed = false;
			if (cmpr(leftButtThickness, minX) && (leftButtThickness > PRECISION)) {
			  leftCutClosed = true;
			}
			if (cmpr(panel.length, maxX + rightButtThickness) && (rightButtThickness > PRECISION)) {
			  rightCutClosed = true;
			}
			if (leftCutClosed) {
			  this.shift = 0;
			}
			else {
			  this.shift = minX;
			}
			if (rightCutClosed && leftCutClosed) {
			  this.length = panel.length;
			}
			else if (rightCutClosed) {
			  this.length = panel.length - minX;
			}
			else if (leftCutClosed) {
			  this.length = maxX;
			}
			else {
			  this.length = maxX - minX;
			}
			if (rightCutClosed || leftCutClosed) {
			  this.closed = 1;
			}
			else {
			  this.closed = 0;
			}
			this.isExist = true;
		  }
		}
	  }
	}
  }
}

function ViyarPlaneCutToPattern(panel, contour, depth) {
  if (depth != 0) {
	return;
  }
  var pattern = new CircleShape(contour);
  if (pattern.isExist) {
	return pattern;
  }
  else {
	var pattern = new RectShape(contour);
	if (pattern.isExist) {
	  return pattern;
	}
	else {
	  var pattern = new RoundRectShape(contour);
	  if (pattern.isExist) {
		return pattern;
	  }
	}
  }
  return pattern;
}

function ViyarPlaneCutToGroove(panel, contour, depth) {
  this.isExist = false;
  this.type = VIYAR_UNDEFINED;
  this.subType = VIYAR_UNDEFINED;
  this.depth = 0;
  this.alpha = 0;
  this.shift = 0;
  this.width = 0;
  this.length = 0;
  this.radius = 0;
  this.x = 0;
  this.y = 0;
  this.side = VIYAR_UNDEFINED;
  this.edge = VIYAR_UNDEFINED;
  this.closed = 0;

  if (depth < 0) {
	this.side = VIYAR_FRONT_SIDE;
	this.depth = Math.abs(depth);
  }
  else if (depth > 0) {
	this.side = VIYAR_BACK_SIDE;
	this.depth = Math.abs(depth);
  }
  else {
	return;
  }
  this.radius = findRectRadius(contour);

  var minX = findMinX(contour);
  var maxX = findMaxX(contour);
  var minY = findMinY(contour);
  var maxY = findMaxY(contour);
  if (minX < 0) {
	minX = 0;
  }
  if (minY < 0) {
	minY = 0;
  }
  if (maxY > panel.width) {
	maxY = panel.width;
  }
  if (maxX > panel.length) {
	maxX = panel.length;
  }
  var sizeX = maxX - minX;
  var sizeY = maxY - minY;
  if ((sizeX < PRECISION) || (sizeY < PRECISION)) {
	return;
  }
  if (sizeY > sizeX) {
	this.subType = VIYAR_VERTICAL_CUT;
	if (cmpr(minX, 0)) {
	  this.edge = VIYAR_LEFT_SIDE;
	}
	if (cmpr(maxX, panel.length)) {
	  this.edge = VIYAR_RIGHT_SIDE;
	}
  }
  else {
	this.subType = VIYAR_HORIZONTAL_CUT;
	if (cmpr(minY, 0)) {
	  this.edge = VIYAR_BOTTOM_SIDE;
	}
	if (cmpr(maxY, panel.width)) {
	  this.edge = VIYAR_TOP_SIDE;
	}
  }
  if (this.edge == VIYAR_UNDEFINED) {
	this.type = VIYAR_GROOVING;
	if (this.subType == VIYAR_VERTICAL_CUT) {
	  this.x = minX;
	  this.y = minY;
	  this.width = sizeX;
	  this.length = sizeY;
	  this.closed = 0;

	  if (isOrthoRect(contour) || isRoundOrthoRect(contour)) {
		this.isExist = true;
	  }
	}
	else if (this.subType == VIYAR_HORIZONTAL_CUT) {
	  this.x = minX;
	  this.y = minY;
	  this.width = sizeY;
	  this.length = sizeX;
	  this.closed = 0;

	  if (isOrthoRect(contour) || isRoundOrthoRect(contour)) {
		this.isExist = true;
	  }
	}
  }
  else {
	this.type = VIYAR_RABBETING;
	if (this.subType == VIYAR_VERTICAL_CUT) {
	  this.shift = minY;
	  this.width = sizeX;
	  this.length = sizeY;
	  this.closed = 0;

	  if (this.edge == VIYAR_LEFT_SIDE) {
		if (isOrthoRect(contour) || isRightRoundOrthoRect(contour) || isRightTopRoundOrthoRect(contour) || isRightBottomRoundOrthoRect(contour)) {
		  this.isExist = true;
		}
	  }
	  else if (this.edge == VIYAR_RIGHT_SIDE) {
		if (isOrthoRect(contour) || isLeftRoundOrthoRect(contour) || isLeftTopRoundOrthoRect(contour) || isLeftBottomRoundOrthoRect(contour)) {
		  this.isExist = true;
		}
	  }
	}
	else if (this.subType == VIYAR_HORIZONTAL_CUT) {
	  this.shift = minX;
	  this.width = sizeY;
	  this.length = sizeX;
	  this.closed = 0;

	  if (this.edge == VIYAR_TOP_SIDE) {
		if (isOrthoRect(contour) || isBottomRoundOrthoRect(contour) || isLeftBottomRoundOrthoRect(contour) || isRightBottomRoundOrthoRect(contour)) {
		  this.isExist = true;
		}
	  }
	  else if (this.edge == VIYAR_BOTTOM_SIDE) {
		if (isOrthoRect(contour) || isTopRoundOrthoRect(contour) || isLeftTopRoundOrthoRect(contour) || isRightTopRoundOrthoRect(contour)) {
		  this.isExist = true;
		}
	  }
	}
  }
}

function isOrthoRect(contour) {
  if (contour.Count == 4) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		if (isHorLine(contCopy[i0]) && isVertLine(contCopy[i1]) && isHorLine(contCopy[i2]) && isVertLine(contCopy[i3])) {
		  return true;
		}
	  }
	}
  }
  return false;
}

function isRoundOrthoRect(contour) {
  if (contour.Count == 8) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		var i4 = nextIndex(contCopy, i3);
		var i5 = nextIndex(contCopy, i4);
		var i6 = nextIndex(contCopy, i5);
		var i7 = nextIndex(contCopy, i6);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir &&
		contCopy[i2].IsLine() && contCopy[i3].IsArc() && !contCopy[i3].ArcDir &&
		contCopy[i4].IsLine() && contCopy[i5].IsArc() && !contCopy[i5].ArcDir &&
		contCopy[i6].IsLine() && contCopy[i7].IsArc() && !contCopy[i7].ArcDir &&
		isHorLine(contCopy[i0]) && isVertLine(contCopy[i2]) && isHorLine(contCopy[i4]) && isVertLine(contCopy[i6]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.y, contCopy[i1].Center.y) &&
		cmpr(contCopy[i3].Pos2.x, contCopy[i3].Center.x) && cmpr(contCopy[i3].Pos1.y, contCopy[i3].Center.y) &&
		cmpr(contCopy[i5].Pos1.x, contCopy[i5].Center.x) && cmpr(contCopy[i5].Pos2.y, contCopy[i5].Center.y) &&
		cmpr(contCopy[i7].Pos2.x, contCopy[i7].Center.x) && cmpr(contCopy[i7].Pos1.y, contCopy[i7].Center.y) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i3].ArcRadius()) &&
		cmpr(contCopy[i3].ArcRadius(), contCopy[i5].ArcRadius()) &&
		cmpr(contCopy[i5].ArcRadius(), contCopy[i7].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  return true;
		}
	  }
	}
  }
  if (contour.Count == 6) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		var i4 = nextIndex(contCopy, i3);
		var i5 = nextIndex(contCopy, i4);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir && contCopy[i2].IsArc() && !contCopy[i2].ArcDir &&
		contCopy[i3].IsLine() && contCopy[i4].IsArc() && !contCopy[i4].ArcDir && contCopy[i5].IsArc() && !contCopy[i5].ArcDir &&
		isHorLine(contCopy[i0]) && isHorLine(contCopy[i3]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.y, contCopy[i1].Center.y) &&
		cmpr(contCopy[i2].Pos2.x, contCopy[i2].Center.x) && cmpr(contCopy[i2].Pos1.y, contCopy[i2].Center.y) &&
		cmpr(contCopy[i4].Pos1.x, contCopy[i4].Center.x) && cmpr(contCopy[i4].Pos2.y, contCopy[i4].Center.y) &&
		cmpr(contCopy[i5].Pos2.x, contCopy[i5].Center.x) && cmpr(contCopy[i5].Pos1.y, contCopy[i5].Center.y) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i2].ArcRadius()) &&
		cmpr(contCopy[i2].ArcRadius(), contCopy[i4].ArcRadius()) &&
		cmpr(contCopy[i4].ArcRadius(), contCopy[i5].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  return true;
		}
	  }
	}
  }
  if (contour.Count == 4) {
	var contCopy = NewContour();
	contCopy.AddList(contour.MakeCopy());
	for (var side = 2; side > 0; side--) {
	  contCopy.Rotate(0, 0, -90.0);
	  var minX = findMinX(contCopy);
	  var minY = findMinY(contCopy);
	  contCopy.Move(minX * -1.0, minY * -1.0);
	  for (var i = 0; i < contCopy.Count; i++) {
		var i0 = i;
		var i1 = nextIndex(contCopy, i0);
		var i2 = nextIndex(contCopy, i1);
		var i3 = nextIndex(contCopy, i2);
		if (contCopy[i0].IsLine() && contCopy[i1].IsArc() && !contCopy[i1].ArcDir &&
		contCopy[i2].IsLine() && contCopy[i3].IsArc() && !contCopy[i3].ArcDir &&
		isHorLine(contCopy[i0]) && isHorLine(contCopy[i2]) &&
		cmpr(contCopy[i1].Pos1.x, contCopy[i1].Center.x) && cmpr(contCopy[i1].Pos2.x, contCopy[i1].Center.x) &&
		cmpr(contCopy[i3].Pos1.x, contCopy[i3].Center.x) && cmpr(contCopy[i3].Pos2.x, contCopy[i3].Center.x) &&
		cmpr(contCopy[i1].ArcRadius(), contCopy[i3].ArcRadius()) &&
		cmpr(contCopy[i0].Pos1.y, 0) && cmpr(contCopy[i0].Pos2.y, 0) && (contCopy[i0].Pos1.x > contCopy[i0].Pos2.x)) {
		  return true;
		}
	  }
	}
  }
  return false;
}

function isSideRoundOrthoRect(contour) {
  if (contour.Count == 2) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  if (contour[i0].IsLine() && contour[i1].IsArc() && !contour[i1].ArcDir &&
	  isHorLine(contour[i0]) &&
	  cmpr(contour[i1].Pos1.y, contour[i1].Center.y) && cmpr(contour[i1].Pos2.y, contour[i1].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  if (contour.Count == 3) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  if (contour[i0].IsLine() && contour[i1].IsArc() && !contour[i1].ArcDir && contour[i2].IsArc() && !contour[i2].ArcDir &&
	  isHorLine(contour[i0]) &&
	  cmpr(contour[i1].Pos1.y, contour[i1].Center.y) && cmpr(contour[i1].Pos2.x, contour[i1].Center.x) &&
	  cmpr(contour[i1].ArcRadius(), contour[i2].ArcRadius()) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  if (contour.Count == 4) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  var i3 = nextIndex(contour, i2);
	  if (contour[i0].IsLine() && contour[i1].IsArc() && !contour[i1].ArcDir &&
	  contour[i2].IsLine() && contour[i3].IsArc() && !contour[i3].ArcDir &&
	  isHorLine(contour[i0]) && isHorLine(contour[i2]) &&
	  cmpr(contour[i1].Pos1.y, contour[i1].Center.y) && cmpr(contour[i1].Pos2.x, contour[i1].Center.x) &&
	  cmpr(contour[i3].Pos1.x, contour[i3].Center.x) && cmpr(contour[i3].Pos2.y, contour[i3].Center.y) &&
	  cmpr(contour[i1].ArcRadius(), contour[i3].ArcRadius()) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	  if (contour[i0].IsLine() && contour[i1].IsLine() && contour[i3].IsLine() &&
	  contour[i2].IsArc() && !contour[i2].ArcDir &&
	  isHorLine(contour[i0]) && isVertLine(contour[i1]) && isVertLine(contour[i3]) &&
	  cmpr(contour[i2].Pos1.y, contour[i2].Center.y) && cmpr(contour[i2].Pos2.y, contour[i2].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  if (contour.Count == 5) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  var i3 = nextIndex(contour, i2);
	  var i4 = nextIndex(contour, i3);
	  if (contour[i0].IsLine() && contour[i1].IsLine() && contour[i4].IsLine() &&
	  contour[i2].IsArc() && !contour[i2].ArcDir && contour[i3].IsArc() && !contour[i3].ArcDir &&
	  isHorLine(contour[i0]) && isVertLine(contour[i1]) && isVertLine(contour[i4]) &&
	  cmpr(contour[i2].Pos1.y, contour[i2].Center.y) && cmpr(contour[i2].Pos2.x, contour[i2].Center.x) &&
	  cmpr(contour[i3].Pos1.x, contour[i3].Center.x) && cmpr(contour[i3].Pos2.y, contour[i3].Center.y) &&
	  cmpr(contour[i2].ArcRadius(), contour[i3].ArcRadius()) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  if (contour.Count == 6) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  var i3 = nextIndex(contour, i2);
	  var i4 = nextIndex(contour, i3);
	  var i5 = nextIndex(contour, i4);
	  if (contour[i0].IsLine() && contour[i1].IsLine() && contour[i3].IsLine() && contour[i5].IsLine() &&
	  contour[i2].IsArc() && !contour[i2].ArcDir && contour[i4].IsArc() && !contour[i4].ArcDir &&
	  isHorLine(contour[i0]) && isVertLine(contour[i1]) && isHorLine(contour[i3]) && isVertLine(contour[i5]) &&
	  cmpr(contour[i2].Pos1.y, contour[i2].Center.y) && cmpr(contour[i2].Pos2.x, contour[i2].Center.x) &&
	  cmpr(contour[i4].Pos1.x, contour[i4].Center.x) && cmpr(contour[i4].Pos2.y, contour[i4].Center.y) &&
	  cmpr(contour[i2].ArcRadius(), contour[i4].ArcRadius()) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  return false;
}

function isCornerRoundOrthoRect(contour) {
  if (contour.Count == 3) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  if (contour[i0].IsArc() && !contour[i0].ArcDir && contour[i1].IsLine() && contour[i2].IsLine() &&
	  isHorLine(contour[i1]) && isHorLine(contour[i2]) &&
	  cmpr(contour[i0].Pos1.x, contour[i0].Center.x) && cmpr(contour[i0].Pos2.y, contour[i0].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.x, 0)) {
		return true;
	  }
	}
  }
  if (contour.Count == 4) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  var i3 = nextIndex(contour, i2);
	  if (contour[i0].IsLine() && contour[i1].IsArc() && !contour[i1].ArcDir &&
	  contour[i2].IsLine() && contour[i3].IsLine() &&
	  isHorLine(contour[i0]) && isHorLine(contour[i2]) && isVertLine(contour[i3]) &&
	  cmpr(contour[i1].Pos1.x, contour[i1].Center.x) && cmpr(contour[i1].Pos2.y, contour[i1].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	  if (contour[i0].IsArc() && !contour[i0].ArcDir &&
	  contour[i1].IsLine() && contour[i2].IsLine() && contour[i3].IsLine() &&
	  isVertLine(contour[i1]) && isHorLine(contour[i2]) && isVertLine(contour[i3]) &&
	  cmpr(contour[i0].Pos1.x, contour[i0].Center.x) && cmpr(contour[i0].Pos2.y, contour[i0].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.x, 0)) {
		return true;
	  }
	}
  }
  if (contour.Count == 5) {
	for (var i = 0; i < contour.Count; i++) {
	  var i0 = i;
	  var i1 = nextIndex(contour, i0);
	  var i2 = nextIndex(contour, i1);
	  var i3 = nextIndex(contour, i2);
	  var i4 = nextIndex(contour, i3);
	  if (contour[i0].IsLine() && contour[i2].IsLine() && contour[i3].IsLine() &&
	  contour[i4].IsLine() && contour[i1].IsArc() && !contour[i1].ArcDir &&
	  isHorLine(contour[i0]) && isVertLine(contour[i2]) && isHorLine(contour[i3]) && isVertLine(contour[i4]) &&
	  cmpr(contour[i1].Pos1.x, contour[i1].Center.x) && cmpr(contour[i1].Pos2.y, contour[i1].Center.y) &&
	  cmpr(contour[i0].Pos1.y, 0) && cmpr(contour[i0].Pos2.y, 0) && (contour[i0].Pos1.x > contour[i0].Pos2.x)) {
		return true;
	  }
	}
  }
  return false;
}

function isRightRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, 90.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isSideRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isLeftRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, -90.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isSideRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isBottomRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, 180.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isSideRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isTopRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isSideRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isRightBottomRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, -90.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isCornerRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isRightTopRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, 180.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isCornerRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isLeftTopRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  contCopy.Rotate(0, 0, 90.0);
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isCornerRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function isLeftBottomRoundOrthoRect(contour) {
  var contCopy = NewContour();
  contCopy.AddList(contour.MakeCopy());
  var minX = findMinX(contCopy);
  var minY = findMinY(contCopy);
  contCopy.Move(minX * -1.0, minY * -1.0);
  if (isCornerRoundOrthoRect(contCopy)) {
	return true;
  }
  return false;
}

function findRectRadius(contour) {
  var radius = 0;
  for (var i = 0; i < contour.Count; i++) {
	if (contour[i].IsArc()) {
	  radius = contour[i].ArcRadius();
	}
  }
  return radius;
}

function findLeftButt(panel) {
  if (panel.rectangle) {
	return panel.leftButt;
  }
  else {
	var minX = findMinX(panel.contour);
	for (var i = 0; i < panel.contour.Count; i++) {
	  var elem = panel.contour[i];
	  if (elem.IsLine()) {
		if (cmpr(elem.Pos1.x, minX) && cmpr(elem.Pos2.x, minX)) {
		  return new Butt(elem);
		}
	  }
	}
  }
  return new Butt();
}

function findBottomButt(panel) {
  if (panel.rectangle) {
	return panel.bottomButt;
  }
  else {
	var minY = findMinY(panel.contour);
	for (var i = 0; i < panel.contour.Count; i++) {
	  var elem = panel.contour[i];
	  if (elem.IsLine()) {
		if (cmpr(elem.Pos1.y, minY) && cmpr(elem.Pos2.y, minY)) {
		  return new Butt(elem);
		}
	  }
	}
  }
  return new Butt();
}

function findTopButt(panel) {
  if (panel.rectangle) {
	return panel.topButt;
  }
  else {
	var maxY = findMaxY(panel.contour);
	for (var i = 0; i < panel.contour.Count; i++) {
	  var elem = panel.contour[i];
	  if (elem.IsLine()) {
		if (cmpr(elem.Pos1.y, maxY) && cmpr(elem.Pos2.y, maxY)) {
		  return new Butt(elem);
		}
	  }
	}
  }
  return new Butt();
}

function findRightButt(panel) {
  if (panel.rectangle) {
	return panel.rightButt;
  }
  else {
	var maxX = findMaxX(panel.contour);
	for (var i = 0; i < panel.contour.Count; i++) {
	  var elem = panel.contour[i];
	  if (elem.IsLine()) {
		if (cmpr(elem.Pos1.x, maxX) && cmpr(elem.Pos2.x, maxX)) {
		  return new Butt(elem);
		}
	  }
	}
  }
  return new Butt();
}

function isVertLine(line) {
  if (line.IsLine() && cmpr(line.Pos1.x, line.Pos2.x)) {
	return true;
  }
  return false;
}

function isHorLine(line) {
  if (line.IsLine() && cmpr(line.Pos1.y, line.Pos2.y)) {
	return true;
  }
  return false;
}

function isRightTriangle(contour) {
  var vert = false;
  var hor = false;
  var slant = false;

  if (contour.Count == 3) {
	if (contour.IsClosedContour()) {
	  for (var i = 0; i < contour.Count; i++) {
		if (contour[i].IsLine()) {
		  var line = contour[i];
		  if(isVertLine(line)) {
			vert = true;
		  }
		  else if (isHorLine(line)) {
			hor = true;
		  }
		  else {
			slant = true;
		  }
		}
	  }
	  if (vert && hor && slant) {
		return true;
	  }
	}
  }
  return false;
}

function isOrthoLine(trajectory) {
  if ((trajectory.Count == 1) && (trajectory[0].IsLine())) {
	var line = trajectory[0];
	if(isVertLine(line) || isHorLine(line)) {
	  return true;
	}
  }
  return false;
}

function validateProject() {
  var arrArtPos = [];
  Model.forEachPanel(function(modelPanel) {
	if (isExportedPanel(modelPanel)) {
	  for (var i = 0; i < modelPanel.Contour.Count; i++) {
		if (modelPanel.Contour[i].ObjLength() == 0) {
		  modelPanel.Highlighted = true;
		  if (arrArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			arrArtPos.push(modelPanel.ArtPos);
		  }
		}
	  }
	}
  });
  arrArtPos.sort(function(a, b) {return a - b});
  if (arrArtPos.length > 0) {
	if (arrArtPos.length == 1) {
	  var msg = 'Контур детали поз. ' + arrArtPos[0] + ' содержит элементы нулевой длины.';
	}
	else if (arrArtPos.length > 1) {
	  var msg = 'Контуры деталей поз. ' + arrArtPos.join(', ') + ' содержат элементы нулевой длины.';
	}
	if (confirm(msg + ' Удалить элементы автоматически?')) {
	  Model.forEachPanel( function(modelPanel) {
		if (isExportedPanel(modelPanel)) {
		  for (var i = 0; i < modelPanel.Contour.Count; i++) {
			if (modelPanel.Contour[i].ObjLength() == 0) {
			  StartEditing(modelPanel);
			  modelPanel.Contour.Delete(modelPanel.Contour[i]);
			  modelPanel.Contour.OrderContours();
			  modelPanel.Build();
			}
		  }
		}
	  });
	  Model.UnHighlightAll();
	  Action.Commit();
	} else {
	  alert('Необходимо выполнить редактирование контура!');
	  return false;
	}
  }
  var arrArtPos = [];
  Model.forEachPanel(function(modelPanel) {
	if (isExportedPanel(modelPanel)) {
	  for (var i = 0; i < modelPanel.Contour.Count; i++) {
		if (modelPanel.Contour[i].ObjLength() < 1.0) {
		  modelPanel.Highlighted = true;
		  if (arrArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			arrArtPos.push(modelPanel.ArtPos);
		  }
		}
	  }
	}
  });
  arrArtPos.sort(function(a, b) {return a - b});
  if (arrArtPos.length == 1) {
	alert('Контур детали поз. ' + arrArtPos[0] + ' содержит элементы длиной менее 1мм. Необходимо выполнить редактирование контура!');
	return false;
  }
  else if (arrArtPos.length > 1) {
	alert('Контуры деталей поз. ' + arrArtPos.join(', ') + ' содержат элементы длиной менее 1мм. Необходимо выполнить редактирование контура!');
	return false;
  }
  var arrArtPos = [];
  Model.forEachPanel(function(modelPanel) {
	if (isExportedPanel(modelPanel)) {
	  for (var i = 0; i < modelPanel.Butts.Count; i++) {
		var butt = modelPanel.Butts[i];
		if (butt != undefined) {
		  if ((butt.Profile != null) || (butt.CutAssigned == true)) {
			modelPanel.Highlighted = true;
			if (arrArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			  arrArtPos.push(modelPanel.ArtPos);
			}
		  }
		}
	  }
	}
  });
  arrArtPos.sort(function(a, b) {return a - b});
  if (arrArtPos.length == 1) {
	alert('Деталь поз. ' + arrArtPos[0] + ' облицована кантом. Облицовка кантом не поддерживается!');
	return false;
  }
  else if (arrArtPos.length > 1) {
	alert('Детали поз. ' + arrArtPos.join(', ') + ' облицованы кантом. Облицовка кантом не поддерживается!');
	return false;
  }
  var arrWidthArtPos = [];
  var arrThicknessArtPos = [];
  Model.forEachPanel(function(modelPanel) {
	if (isExportedPanel(modelPanel)) {
	  for (var i = 0; i < modelPanel.Butts.Count; i++) {
		var butt = modelPanel.Butts[i];
		if (butt != undefined) {
		  if (butt.Width < (modelPanel.ZThickness + BUTT_WIDTH_MANUFACT_RULE)) {
			modelPanel.Highlighted = true;
			if (arrWidthArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			  arrWidthArtPos.push(modelPanel.ArtPos);
			}
		  }
		  if (butt.Thickness == 0) {
			modelPanel.Highlighted = true;
			if (arrThicknessArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			  arrThicknessArtPos.push(modelPanel.ArtPos);
			}
		  }
		}
	  }
	}
  });
  arrWidthArtPos.sort(function(a, b) {return a - b});
  if (arrWidthArtPos.length == 1) {
	alert('Деталь поз. ' + arrWidthArtPos[0] + ' облицована недопустимой по ширине кромкой. Ширина кромки должна быть на 3мм больше толщины детали.');
	return false;
  }
  else if (arrWidthArtPos.length > 1) {
	alert('Детали поз. ' + arrWidthArtPos.join(', ') + ' облицованы недопустимой по ширине кромкой. Ширина кромки должна быть на 3мм больше толщины детали.');
	return false;
  }
  arrThicknessArtPos.sort(function(a, b) {return a - b});
  if (arrThicknessArtPos.length > 0) {
	if (arrThicknessArtPos.length == 1) {
	  var msg = 'Деталь поз. ' + arrThicknessArtPos[0] + ' облицована кромкой с нулевой толщиной. Кромка будет проигнорирована.';
	}
	else if (arrThicknessArtPos.length > 1) {
	  var msg = 'Детали поз. ' + arrThicknessArtPos.join(', ') + ' облицованы кромкой с нулевой толщиной. Кромка будет проигнорирована.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  var arrPanelName = [];
  var arrTextureArtPos = [];
  var arrPlasticArtPos = [];
  var arrQuantityArtPos = [];
  var arrMethodArtPos = [];
  Model.forEachPanel(function(modelPanel) {
	if (isValidatedPanel(modelPanel)) {
	  if (modelPanel.ArtPos == '') {
		modelPanel.Highlighted = true;
		if (arrPanelName.some(function (item) { return item == modelPanel.Name; }) == false) {
		  arrPanelName.push(modelPanel.Name);
		}
	  }
	  else if (modelPanel.Plastics.Count == 0) {
	  }
	  else if (calcPlasticsQuantity(modelPanel) >= VIYAR_MAX_MULTIPLICITY) {
		modelPanel.Highlighted = true;
		if (arrQuantityArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
		  arrQuantityArtPos.push(modelPanel.ArtPos);
		}
	  }
	  else if (isPlasticsZero(modelPanel)) {
	  }
	  else if (isPlasticsEqual(modelPanel, true)) {
		var panelMaterial = new Material(modelPanel.MaterialName, modelPanel.Thickness);
		if (panelMaterial.multiplicity > 1) {
		  modelPanel.Highlighted = true;
		  if (arrMethodArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
			arrMethodArtPos.push(modelPanel.ArtPos);
		  }
		}
	  }
	  else if (isPlasticsEqual(modelPanel, false)) {
		modelPanel.Highlighted = true;
		if (arrTextureArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
		  arrTextureArtPos.push(modelPanel.ArtPos);
		}
	  }
	  else {
		modelPanel.Highlighted = true;
		if (arrPlasticArtPos.some(function (item) { return item == modelPanel.ArtPos; }) == false) {
		  arrPlasticArtPos.push(modelPanel.ArtPos);
		}
	  }
	}
  });
  if (arrPanelName.length > 0) {
	if (arrPanelName.length == 1) {
	  var msg = 'У детали "' + arrPanelName[0] + '" отсутвует позиция, деталь не будет экспортирована.';
	}
	else if (arrPanelName.length > 1) {
	  var msg = 'У деталей "' + arrPanelName.join(', ') + '" отсутвуют позиции, детали не будут экспортированы.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  arrTextureArtPos.sort(function(a, b) {return a - b});
  if (arrTextureArtPos.length > 0) {
	if (arrTextureArtPos.length == 1) {
	  var msg = 'Облицовка пласти детали поз. ' + arrTextureArtPos[0] + ' имеет разное направление текстуры. Направление текстуры должно совпадать, деталь не будет экспортирована.';
	}
	else if (arrTextureArtPos.length > 1) {
	  var msg = 'Облицовка пласти деталей поз. ' + arrTextureArtPos.join(', ') + ' имеет разное направление текстуры. Направление текстуры должно совпадать, детали не будут экспортированы.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  arrMethodArtPos.sort(function(a, b) {return a - b});
  if (arrMethodArtPos.length > 0) {
	if (arrMethodArtPos.length == 1) {
	  var msg = 'Сращенную деталь поз. ' + arrMethodArtPos[0] + ' необходимо задавать одним из способов, деталь не будет экспортирована.';
	}
	else if (arrMethodArtPos.length > 1) {
	  var msg = 'Сращенные детали поз. ' + arrMethodArtPos.join(', ') + ' необходимо задавать одним из способов, детали не будут экспортированы.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  arrQuantityArtPos.sort(function(a, b) {return a - b});
  if (arrQuantityArtPos.length > 0) {
	if (arrQuantityArtPos.length == 1) {
	  var msg = 'Деталь поз. ' + arrQuantityArtPos[0] + ' имеет более 3-х слоев, деталь не будет экспортирована.';
	}
	else if (arrQuantityArtPos.length > 1) {
	  var msg = 'Детали поз. ' + arrQuantityArtPos.join(', ') + ' имеют более 3-х слоев, детали не будут экспортированы.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  arrPlasticArtPos.sort(function(a, b) {return a - b});
  if (arrPlasticArtPos.length > 0) {
	if (arrPlasticArtPos.length == 1) {
	  var msg = 'Пласть детали поз. ' + arrPlasticArtPos[0] + ' облицована различными материалами, деталь не будет экспортирована.';
	}
	else if (arrPlasticArtPos.length > 1) {
	  var msg = 'Пласть деталей поз. ' + arrPlasticArtPos.join(', ') + ' облицована различными материалами, детали не будут экспортированы.';
	}
	if (confirm(msg + ' Продолжить?')) {
	} else {
	  return false;
	}
  }
  return true;
}

function isExportedPanel(modelPanel) {
  if ((modelPanel != undefined) && (modelPanel != null)) {
	var panelMaterial = new Material(modelPanel.MaterialName, modelPanel.Thickness);
	if (materials[materialIndex].isEqual(panelMaterial)) {
	  var plasticsQuantity = calcPlasticsQuantity(modelPanel);
	  if ((modelPanel.ArtPos != '') && (isAsmChild(modelPanel) == false) && (isDraftAsmChild(modelPanel) == false) && (modelPanel.Bent == false) &&
	  ((plasticsQuantity == 0) || ((plasticsQuantity < VIYAR_MAX_MULTIPLICITY) && isPlasticsEqual(modelPanel, true)))) {
		if ((panelMaterial.multiplicity > 1) && (plasticsQuantity > 0)) {
		  return false;
		}
		return true;
	  }
	}
  }
  return false;
}

function isValidatedPanel(modelPanel) {
  if ((modelPanel != undefined) && (modelPanel != null)) {
	var panelMaterial = new Material(modelPanel.MaterialName, modelPanel.Thickness);
	if (materials[materialIndex].isEqual(panelMaterial)) {
	  if ((isAsmChild(modelPanel) == false) && (modelPanel.Bent == false) && (isDraftAsmChild(modelPanel) == false)) {
		return true;
	  }
	}
  }
  return false;
}

function isExportedFurniture(modelObj) {
  if ((modelObj != undefined) && (modelObj != null)) {
	if (modelObj.constructor.name == 'TFastener') {
	  if ((isAsmChild(modelObj) == false) && (isDraftAsmChild(modelObj) == false)) {
		if (modelObj.ForEstimate == undefined) {
		  return true;
		}
		else {
		  return modelObj.ForEstimate;
		}
	  }
	}
	else if ((modelObj.constructor.name == 'TFurnAsm') || (modelObj.constructor.name == 'TAsmKit')) {
	  if ((isAsmChild(modelObj) == false) && (isAsmKitChild(modelObj) == false) && (isDraftAsmChild(modelObj) == false)) {
		return true;
	  }
	}
	else if (modelObj.constructor.name == 'TDraftBlock') {
	  if ((isAsmChild(modelObj) == false) && (isDraftAsmChild(modelObj) == false)) {
		if (modelObj.AsAsm == undefined) {
		  return (draftCombo.Value == DRAFT_ASM_METHOD) ? true : false;
		}
		else {
		  return modelObj.AsAsm;
		}
	  }
	}
	/*else if (modelObj.constructor.name == 'TExtrusionBody') {
	  if ((isAsmChild(modelObj) == false) && (isDraftAsmChild(modelObj) == false)) {

	  }
	}*/
  }
  return false;
}

function calcPlasticsQuantity(modelPanel) {
  var cntr = 0;
  for (var i = 0; i < modelPanel.Plastics.Count; i++) {
	if (modelPanel.Plastics[i].Thickness > 0) {
	  cntr++;
	}
  }
  return cntr;
}

function isPlasticsZero(modelPanel) {
  for (var i = 0; i < modelPanel.Plastics.Count; i++) {
	if (modelPanel.Plastics[i].Thickness > 0) {
	  return false;
	}
  }
  return true;
}

function isPlasticsEqual(modelPanel, checkTexture) {
  var panelMaterial = new Material(modelPanel.MaterialName, modelPanel.Thickness);
  for (var i = 0; i < modelPanel.Plastics.Count; i++) {
	if (modelPanel.Plastics[i].Thickness > 0) {
	  var plasticMaterial = new Material(modelPanel.Plastics[i].Material, modelPanel.Plastics[i].Thickness);
	  if (panelMaterial.isEqual(plasticMaterial) && (panelMaterial.multiplicity == plasticMaterial.multiplicity)) {
		if (checkTexture && (modelPanel.TextureOrientation != modelPanel.Plastics[i].TextureOrientation)) {
		  return false;
		}
	  }
	  else {
		return false;
	  }
	}
  }
  return true;
}

function calcDirXHoles(panel, dir, type) {
  var cntr = 0;
  panel.holes.forEach(function(hole) {
	if ((hole.dirX == dir) && (hole.type == type)) {
	  cntr++;
	}
  });
  return cntr;
}

function calcDirYHoles(panel, dir, type) {
  var cntr = 0;
  panel.holes.forEach(function(hole) {
	if ((hole.dirY == dir) && (hole.type == type)) {
	  cntr++;
	}
  });
  return cntr;
}

function calcDirZHoles(panel, dir, type) {
  var cntr = 0;
  panel.holes.forEach(function(hole) {
	if ((hole.dirZ == dir) && (hole.type == type)) {
	  cntr++;
	}
  });
  return cntr;
}

function calcDirZCounterSinkHoles(panel, dir, type) {
  var cntr = 0;
  panel.holes.forEach(function(hole) {
	if ((hole.countersink == true) && (hole.dirZ == dir) && (hole.type == type)) {
	  cntr++;
	}
  });
  return cntr;
}

function calcLeftLength(panel) {
  var length = 0;
  for (var i = 0; i < panel.orderedContour.Count; i++) {
	var elem = panel.orderedContour[i];
	if (elem.ElType == ELEM_LINE_TYPE) {
	  if (cmpr(elem.Pos1.x, 0) && cmpr(elem.Pos2.x, 0)) {
		length += elem.ObjLength();
	  }
	}
  }
  return length;
}

function calcTopLength(panel) {
  var length = 0;
  for (var i = 0; i < panel.orderedContour.Count; i++) {
	var elem = panel.orderedContour[i];
	if (elem.ElType == ELEM_LINE_TYPE) {
	  if (cmpr(elem.Pos1.y, panel.width) && cmpr(elem.Pos2.y, panel.width)) {
		length += elem.ObjLength();
	  }
	}
  }
  return length;
}

function calcRightLength(panel) {
  var length = 0;
  for (var i = 0; i < panel.orderedContour.Count; i++) {
	var elem = panel.orderedContour[i];
	if (elem.ElType == ELEM_LINE_TYPE) {
	  if (cmpr(elem.Pos1.x, panel.length) && cmpr(elem.Pos2.x, panel.length)) {
		length += elem.ObjLength();
	  }
	}
  }
  return length;
}

function calcBottomLength(panel) {
  var length = 0;
  for (var i = 0; i < panel.orderedContour.Count; i++) {
	var elem = panel.orderedContour[i];
	if (elem.ElType == ELEM_LINE_TYPE) {
	  if (cmpr(elem.Pos1.y, 0) && cmpr(elem.Pos2.y, 0)) {
		length += elem.ObjLength();
	  }
	}
  }
  return length;
}

function rotate180(panel) {
  var rightButt = panel.leftButt;
  var bottomButt = panel.topButt;
  var leftButt = panel.rightButt;
  var topButt = panel.bottomButt;
  panel.rightButt = rightButt;
  panel.bottomButt = bottomButt;
  panel.leftButt = leftButt;
  panel.topButt = topButt;

  var length = panel.length;
  var width = panel.width;

  panel.holes.forEach(function(hole) {
	hole.dirX = -1 * hole.dirX;
	hole.dirY = -1 * hole.dirY;
	hole.posX = length - hole.posX;
	hole.posY = width - hole.posY;
  });

  panel.orderedContour.Rotate(0, 0, -180.0);
  panel.contour.Rotate(0, 0, -180.0);
  var minX = findMinX(panel.orderedContour);
  var minY = findMinY(panel.orderedContour);
  panel.orderedContour.Move(minX * -1.0, minY * -1.0);
  panel.contour.Move(minX * -1.0, minY * -1.0);

  panel.cuts.forEach(function(cut) {
	cut.trajectory.Rotate(0, 0, -180.0);
	cut.trajectory.Move(minX * -1.0, minY * -1.0);
  });
  panel.planeCuts.forEach(function(planeCut) {
	planeCut.contour.Rotate(0, 0, -180.0);
	planeCut.contour.Move(minX * -1.0, minY * -1.0);
  });
}

function rotate90(panel) {
  var rightButt = panel.topButt;
  var bottomButt = panel.rightButt;
  var leftButt = panel.bottomButt;
  var topButt = panel.leftButt;
  panel.rightButt = rightButt;
  panel.bottomButt = bottomButt;
  panel.leftButt = leftButt;
  panel.topButt = topButt;

  var length = panel.length;
  var width = panel.width;

  panel.holes.forEach(function(hole) {
	var dirX = hole.dirY;
	var dirY = -1 * hole.dirX;
	hole.dirX = dirX;
	hole.dirY = dirY;

	var posX = hole.posY;
	var posY = length - hole.posX;
	hole.posX = posX;
	hole.posY = posY;
  });

  panel.orderedContour.Rotate(0, 0, -90.0);
  panel.contour.Rotate(0, 0, -90.0);
  var minX = findMinX(panel.orderedContour);
  var minY = findMinY(panel.orderedContour);
  panel.orderedContour.Move(minX * -1.0, minY * -1.0);
  panel.contour.Move(minX * -1.0, minY * -1.0);

  panel.cuts.forEach(function(cut) {
	cut.trajectory.Rotate(0, 0, -90.0);
	cut.trajectory.Move(minX * -1.0, minY * -1.0);
  });
  panel.planeCuts.forEach(function(planeCut) {
	planeCut.contour.Rotate(0, 0, -90.0);
	planeCut.contour.Move(minX * -1.0, minY * -1.0);
  });

  panel.width = length;
  panel.length = width;

  if (panel.texture == PANEL_TEXTURE_VERTICAL) {
	panel.texture = PANEL_TEXTURE_HORIZONTAL;
  }
  else if (panel.texture == PANEL_TEXTURE_HORIZONTAL) {
	panel.texture = PANEL_TEXTURE_VERTICAL;
  }
}

function flipY(panel) {
  var rightButt = panel.leftButt;
  var leftButt = panel.rightButt;
  panel.rightButt = rightButt;
  panel.leftButt = leftButt;

  var length = panel.length;

  panel.holes.forEach(function(hole) {
	hole.dirX = -1 * hole.dirX;
	hole.dirZ = -1 * hole.dirZ;
	hole.posX = length - hole.posX;
	hole.posZ = panel.thickness - hole.posZ;
  });
  if (panel.face == PANEL_FACE_SIDE_1) {
	panel.face = PANEL_FACE_SIDE_2;
  }
  else if (panel.face == PANEL_FACE_SIDE_2) {
	panel.face = PANEL_FACE_SIDE_1;
  }
  panel.orderedContour.Symmetry(0, 0, 0, panel.width, false);
  panel.contour.Symmetry(0, 0, 0, panel.width, false);
  var minX = findMinX(panel.orderedContour);
  var minY = findMinY(panel.orderedContour);
  panel.orderedContour.Move(minX * -1.0, minY * -1.0);
  panel.contour.Move(minX * -1.0, minY * -1.0);

  panel.cuts.forEach(function(cut) {
	cut.trajectory.Symmetry(0, 0, 0, panel.width, false);
	cut.trajectory.Move(minX * -1.0, minY * -1.0);
	cut.profile.Rotate(0, 0, -180.0);
	cut.profile.Move(0, panel.thickness);
  });
  panel.planeCuts.forEach(function(planeCut) {
	planeCut.contour.Symmetry(0, 0, 0, panel.width, false);
	planeCut.contour.Move(minX * -1.0, minY * -1.0);
	planeCut.depth = planeCut.depth * -1.0;
  });
}

function findContours(contour) {
  var contourCopy = NewContour();
  contourCopy.AddList(contour.MakeCopy());

  var result = [];
  var closedContour = NewContour();
  while (contourCopy.FindContour(closedContour, true)) {
	closedContour.OrderContours();
	if (closedContour.IsClosedContour() && !closedContour.IsClockOtherWise()) {
	  closedContour.InvertDirection();
	}
	result.push(closedContour);
	closedContour = NewContour();
  }
  result.sort(function (a, b) {
	if (isInContour(a, b)) { return 1; }
	if (isInContour(b, a)) { return -1; }
	return 0;
  });
  for (var i = 0; i < result.length; i++) {
	if (!result[i].IsClosedContour()) {
	  result.length = 0;
	  return result;
	}
  }
  for (var i = 1; i < result.length; i++) {
	if (!isInContour(result[i], result[0])) {
	  result.length = 0;
	  return result;
	}
  }
  return result;
}

function isInContour(inCont, outCont) {
  if (system.apiVersion < 1000) {
	if ((inCont.Count > 0) && (outCont.Count > 0)) {
	  for (var i = 0; i < inCont.Count; i++) {
		var elem = inCont[i];
		if (elem.IsArc() || elem.IsLine()) {
		  if ((outCont.IsPointInside(elem.Pos1) == false) || (outCont.IsPointInside(elem.Pos2) == false)) {
			return false;
		  }
		}
		else if (elem.IsCircle()) {
		  if ((outCont.IsPointInside(NewPoint(elem.Center.x + elem.CirRadius, elem.Center.y)) == false) ||
		  (outCont.IsPointInside(NewPoint(elem.Center.x - elem.CirRadius, elem.Center.y)) == false) ||
		  (outCont.IsPointInside(NewPoint(elem.Center.x, elem.Center.y + elem.CirRadius)) == false) ||
		  (outCont.IsPointInside(NewPoint(elem.Center.x, elem.Center.y - elem.CirRadius)) == false)) {
			return false;
		  }
		}
		else {
		  return false;
		}
	  }
	  return true;
	}
	else {
	  return false;
	}
  }
  else {
	return inCont.IsInContour(outCont);
  }
}

function adjustOrientation(panel) {
  if (panel.texture == PANEL_TEXTURE_VERTICAL) {
	rotate90(panel);
  }
  else if ((panel.texture == PANEL_TEXTURE_UNDEFINED) && (panel.width > panel.length)) {
	rotate90(panel);
  }
  if (panel.face == PANEL_FACE_SIDE_2) {
	flipY(panel);
  }
  else if ((panel.face == PANEL_FACE_UNDEFINED) && (calcDirZCounterSinkHoles(panel, 1, HOLE_THRU_TYPE) > calcDirZCounterSinkHoles(panel, -1, HOLE_THRU_TYPE))) {
	flipY(panel);
  }
  else if ((panel.face == PANEL_FACE_UNDEFINED) && (calcDirZCounterSinkHoles(panel, 1, HOLE_THRU_TYPE) == 0) && (calcDirZCounterSinkHoles(panel, -1, HOLE_THRU_TYPE) == 0) &&
  (calcDirZHoles(panel, -1, HOLE_BLIND_TYPE) > calcDirZHoles(panel, 1, HOLE_BLIND_TYPE))) {
	flipY(panel);
  }
  else if ((panel.face == PANEL_FACE_UNDEFINED) && (calcDirZCounterSinkHoles(panel, 1, HOLE_THRU_TYPE) == 0) && (calcDirZCounterSinkHoles(panel, -1, HOLE_THRU_TYPE) == 0) &&
  (calcDirZHoles(panel, -1, HOLE_BLIND_TYPE) == calcDirZHoles(panel, 1, HOLE_BLIND_TYPE)) &&
  (calcDirZHoles(panel, 1, HOLE_THRU_TYPE) > calcDirZHoles(panel, -1, HOLE_THRU_TYPE))) {
	flipY(panel);
  }
  if (panel.rectangle) {
	if (!panel.topButt.isExist && panel.bottomButt.isExist) {
	}
	else if (panel.topButt.isExist && !panel.bottomButt.isExist) {
	  rotate180(panel);
	}
	else if (!panel.rightButt.isExist && panel.leftButt.isExist) {
	}
	else if (panel.rightButt.isExist && !panel.leftButt.isExist) {
	  rotate180(panel);
	}
	if (isClippingCapability(panel)) {
	  if (cmprt(panel.width, VIYAR_CLIPPING_THRESHOLD) == false) {
		if ((calcDirYHoles(panel, 1, HOLE_BLIND_TYPE) == 0) && (calcDirYHoles(panel, -1, HOLE_BLIND_TYPE) > 0)) {
		  rotate180(panel);
		}
	  }
	  else if (cmprt(panel.length, VIYAR_CLIPPING_THRESHOLD) == false) {
		if ((calcDirXHoles(panel, 1, HOLE_BLIND_TYPE) == 0) && (calcDirXHoles(panel, -1, HOLE_BLIND_TYPE) > 0)) {
		  rotate180(panel);
		}
	  }
	}
  }
  else {
	var topLength = calcTopLength(panel);
	var bottomLength = calcBottomLength(panel);
	var leftLength = calcLeftLength(panel);
	var rightLength = calcRightLength(panel);
	if (!cmpr(bottomLength, topLength) && (bottomLength < topLength) && !cmpr(leftLength, rightLength) && (leftLength < rightLength)) {
	  rotate180(panel);
	}
	else if (!cmpr(bottomLength, topLength) && (bottomLength < topLength) && cmpr(leftLength, rightLength)) {
	  rotate180(panel);
	}
	else if (cmpr(bottomLength, topLength) && !cmpr(leftLength, rightLength) && (leftLength < rightLength)) {
	  rotate180(panel);
	}
  }
}

function prevIndex(contour, index) {
  if (contour.Count > 0) {
	if (index > 0) {
	  return index - 1;
	}
	else {
	  return contour.Count - 1;
	}
  }
  return 0;
}

function nextIndex(contour, index) {
  if (contour.Count > 0) {
	if (index < (contour.Count - 1)) {
	  return index + 1;
	}
  }
  return 0;
}

function distance(p1, p2) {
  var a = p1.x - p2.x;
  var b = p1.y - p2.y;
  var dist = Math.sqrt(a*a + b*b);
  return dist;
}

function perpendicular(p1, p2, d, dir) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  dx /= dist;
  dy /= dist;

  if (dir) {
	return {
	  x: p1.x - d * dy,
	  y: p1.y + d * dx
	};
  }
  return {
	x: p1.x + d * dy,
	y: p1.y - d * dx
  };
}

function parallel(p1, p2, d, dir) {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  dx /= dist;
  dy /= dist;

  if (dir) {
	var p3 = {
	  x: p1.x + d * dy,
	  y: p1.y - d * dx
	};
	var p4 = {
	  x: p2.x + d * dy,
	  y: p2.y - d * dx
	};
  }
  else {
	var p3 = {
	  x: p1.x - d * dy,
	  y: p1.y + d * dx
	};
	var p4 = {
	  x: p2.x - d * dy,
	  y: p2.y + d * dx
	};
  }
  return [p3, p4];
}

function intersect(p1, p2, p3, p4) {
  if ((p1.x == p2.x && p1.y == p2.y) || (p3.x == p4.x && p3.y == p4.y)) {
	return null;
  }
  var denom = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
  if (Math.abs(denom) < 1) {
	return null;
  }
  var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  return {
	x: p1.x + ua * (p2.x - p1.x),
	y: p1.y + ua * (p2.y - p1.y)
  };
}

function vertex(elem1, elem2) {
  var offset1 = 0;
  var end1 = { x: elem1.Pos2.x, y: elem1.Pos2.y };
  if (elem1.ElType == ELEM_LINE_TYPE) {
	var start1 = { x: elem1.Pos1.x, y: elem1.Pos1.y };
	butt1 = new Butt(elem1);
	if (butt1.isExist && butt1.clip) {
	  offset1 = butt1.thickness;
	  arr = parallel(start1, end1, offset1, true);
	  start1 = arr[0];
	  end1 = arr[1];
	}
  }
  else if (elem1.ElType == ELEM_ARC_TYPE) {
	var center = { x: elem1.Center.x, y: elem1.Center.y };
	var dist = elem1.ArcRadius();
	var dir = !elem1.ArcDir;
	var start1 = perpendicular(end1, center, dist, dir);
	butt1 = new Butt(elem1);
	if (butt1.isExist && butt1.clip) {
	  offset1 = butt1.thickness;
	  arr = parallel(start1, end1, offset1, true);
	  start1 = arr[0];
	  end1 = arr[1];
	}
  }
  var offset2 = 0;
  var start2 = { x: elem2.Pos1.x, y: elem2.Pos1.y };
  if (elem2.ElType == ELEM_LINE_TYPE) {
	var end2 = { x: elem2.Pos2.x, y: elem2.Pos2.y };
	butt2 = new Butt(elem2);
	if (butt2.isExist && butt2.clip) {
	  offset2 = butt2.thickness;
	  arr = parallel(start2, end2, offset2, true);
	  start2 = arr[0];
	  end2 = arr[1];
	}
  }
  else if (elem2.ElType == ELEM_ARC_TYPE) {
	var center = { x: elem2.Center.x, y: elem2.Center.y };
	var dist = elem2.ArcRadius();
	var dir = elem2.ArcDir;
	var end2 = perpendicular(start2, center, dist, dir);
	butt2 = new Butt(elem2);
	if (butt2.isExist && butt2.clip) {
	  offset2 = butt2.thickness;
	  arr = parallel(start2, end2, offset2, true);
	  start2 = arr[0];
	  end2 = arr[1];
	}
  }
  if (distance(end1, start2) < 0.01) {
	var vert = end1;
  }
  else {
	var offset = Math.sqrt(offset1 * offset1 + offset2 * offset2) * 2.0;
	var junc = { x: elem1.Pos2.x, y: elem1.Pos2.y };
	var vert = intersect(start1, end1, start2, end2);
	if ((vert != null) && (distance(junc, vert) > offset)) {
	  vert = null;
	}
  }
  return vert;
}
// === VP_ENGINE ENTRY (replaces viyarpro3 exportViyarPro + reportExportSummary) ===
//
// Run ViyarPro export for ALL materials in the model. Writes one .project
// file per material into `dir` using `base` as the basename. Returns
// { files: [{path, material, panels, furns}], totals, furnsCount, skipped,
// elapsedMs, log }. On error throws.
//
// opts (all optional):
//   format: one of POSITION_NAME_FORMAT, DESIGNATION_NAME_FORMAT,
//     ORDER_POSITION_NAME_FORMAT, ORDER_DESIGNATION_NAME_FORMAT, NAME_FORMAT.
//     Defaults to POSITION_NAME_FORMAT.
//   accessoriesExport: bool. Defaults to true.
//   arrangePositions: bool. Defaults to false (caller may have already arranged).
//   draftMethod: DRAFT_BLOCK_METHOD | DRAFT_ASM_METHOD. Defaults to DRAFT_BLOCK_METHOD.
//   version: string. Defaults to SCRIPT_VERSION.
//
// Called from OBI.js via ViyarExport.exportProjects().
function exportProjects(dir, base, opts) {
  opts = opts || {};
  var savedAccessoriesValue, savedFormatValue;
  if (typeof accessoriesCheckBox !== "undefined") savedAccessoriesValue = accessoriesCheckBox.Value;
  if (typeof formatCombo !== "undefined") savedFormatValue = formatCombo.Value;
  if (opts.format != null && typeof formatCombo !== "undefined") formatCombo.Value = opts.format;
  else if (typeof formatCombo === "undefined") {
    formatCombo = { Value: opts.format || POSITION_NAME_FORMAT };
  }
  if (opts.accessoriesExport != null && typeof accessoriesCheckBox !== "undefined") accessoriesCheckBox.Value = !!opts.accessoriesExport;
  else if (typeof accessoriesCheckBox === "undefined") {
    accessoriesCheckBox = { Value: opts.accessoriesExport !== false };
  }
  if (opts.draftMethod != null && typeof draftCombo !== "undefined") draftCombo.Value = opts.draftMethod;
  else if (typeof draftCombo === "undefined") {
    draftCombo = { Value: opts.draftMethod || DRAFT_BLOCK_METHOD };
  }
  if (opts.version != null) SCRIPT_VERSION = opts.version;

  if (typeof system !== "undefined" && system.require) {
    try { system.require(OBJ_TREE_FILE_NAME); } catch (e) {}
  }
  if (opts.arrangePositions && typeof arrangePositions === "function") {
    if (!arrangePositions()) return { files: [], totals: 0, furnsCount: 0, skipped: [], elapsedMs: 0, log: "arrange-cancelled" };
  }

  clearReport();
  if (typeof Model !== "undefined" && Model.UnHighlightAll) Model.UnHighlightAll();

  if (typeof materials === "undefined" || materials.length === 0) {
    if (typeof Model !== "undefined" && Model.forEachPanel) {
      materials = [];
      materials.add = function(m) { for (var i = 0; $i < this.length; $i++) if (this[i].isEqual(m)) return; this.push(m); };
      Model.forEachPanel(function(modelPanel) {
        if ((modelPanel != undefined) && (modelPanel != null) && (isAsmChild(modelPanel) == false)) {
          materials.add(new Material(modelPanel.MaterialName, modelPanel.Thickness));
        }
      });
    }
  }
  if (!materials || materials.length === 0) {
    return { files: [], totals: 0, furnsCount: 0, skipped: [], elapsedMs: 0, log: "no-materials" };
  }

  materials.sort(function (a, b) {
    if (a.thickness > 18) return 1;
    if (b.thickness > 18) return -1;
    if (a.thickness > b.thickness) return -1;
    if (a.thickness < b.thickness) return 1;
    return 0;
  });

  if (!base) base = "project";
  var dirSep = dir.indexOf("/") >= 0 ? "/" : "\\\\";
  function buildFileName(materialIndex) {
    var materialName = materials[materialIndex].name.replace(/[\/\\\\:*?"<>|]/g, " ");
    return dir + dirSep + base + "_" + materialName + "_viyar.project";
  }

  var startTime = Date.now();
  var exportedFiles = [];
  var skippedMaterials = [];
  for (var mi = 0; $mi < materials.length; $mi++) {
    materialIndex = mi;
    if (typeof Action !== "undefined" && Action.Hint) {
    Action.Hint = "Export material " + (mi + 1) + "/" + materials.length + " (" + materials[mi].name + ")...";
    }
    if (typeof readModel === "function") {
      if (!readModel()) {
        if (savedAccessoriesValue !== undefined) accessoriesCheckBox.Value = savedAccessoriesValue;
        if (savedFormatValue !== undefined) formatCombo.Value = savedFormatValue;
        return { files: exportedFiles, totals: exportedFiles.length, furnsCount: furns.length, skipped: skippedMaterials, elapsedMs: Date.now() - startTime, log: "aborted" };
      }
    }
    if (panels.length === 0) {
      skippedMaterials.push(materials[mi].name);
      continue;
    }
    if (typeof createDocNode !== "function") {
      return { files: exportedFiles, totals: exportedFiles.length, furnsCount: furns.length, skipped: skippedMaterials, elapsedMs: Date.now() - startTime, log: "no-createDocNode" };
    }
    var XMLDoc = createDocNode();
    var xotree = new XML.ObjTree();
    xotree.xmlDecl = "<?xml version=\"1.0\" encoding=\"windows-1251\" ?>";
    var xml = xotree.writeXML(XMLDoc);
    if (DEBUG === false && typeof sjcl !== "undefined" && sjcl.encrypt) {
      xml = sjcl.encrypt(PASSWORD, xml);
    }
    var fileName = buildFileName(mi);
    try {
      if (typeof system !== "undefined" && system.writeTextFile) {
        system.writeTextFile(fileName, xml);
      }
    } catch (e) {
      throw new Error("Save failed:\\n" + fileName + "\\n" + (e.message || e));
    }
    exportedFiles.push({
      path: fileName,
      material: materials[mi].name,
      panels: panels.length,
      furns: furns.length
    });
  }

  if (typeof report === "function") {
    try { report(); } catch (e) {}
  }

  if (savedAccessoriesValue !== undefined && typeof accessoriesCheckBox !== "undefined") accessoriesCheckBox.Value = savedAccessoriesValue;
  if (savedFormatValue !== undefined && typeof formatCombo !== "undefined") formatCombo.Value = savedFormatValue;

  return {
    files: exportedFiles,
    totals: exportedFiles.length,
    furnsCount: furns.length,
    skipped: skippedMaterials,
    elapsedMs: Date.now() - startTime,
    log: ""
  };
}

globalThis.ViyarExport = {
  exportProjects: exportProjects,
  SCRIPT_VERSION: SCRIPT_VERSION,
  POSITION_NAME_FORMAT: POSITION_NAME_FORMAT
};


})();

