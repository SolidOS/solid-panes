"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
/* eslint-env jest */
var rdflib_1 = require("rdflib");
var data_1 = require("./data");
var solid_namespace_1 = require("solid-namespace");
var ns = solid_namespace_1["default"](rdflib_1["default"]);
describe('getInitialisationStatements()', function () {
    it('should properly initialise a new notepad', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, _a, _pad, additions;
        return __generator(this, function (_b) {
            mockStore = rdflib_1["default"].graph();
            mockStore.namespaces = { pub: 'https://localhost:8443/public/' };
            _a = data_1.getInitialisationStatements(new Date(0), mockStore), _pad = _a[0], additions = _a[1];
            expect(additions).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
    it('should include author information if available', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, _a, _pad, additions;
        return __generator(this, function (_b) {
            mockStore = rdflib_1["default"].graph();
            mockStore.namespaces = { pub: 'https://localhost:8443/public/' };
            _a = data_1.getInitialisationStatements(new Date(0), mockStore, rdflib_1["default"].sym('https://user.example')), _pad = _a[0], additions = _a[1];
            expect(additions).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
});
describe('getSetContentsStatements()', function () {
    it('should properly set a notepad\'s contents', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockContents, _a, deletions, additions;
        return __generator(this, function (_b) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockContents = "\nHere's some arbitrary\nmultiline\ncontent\n    ";
            _a = data_1.getSetContentsStatements(mockContents, new Date(0), mockPad, mockStore), deletions = _a[0], additions = _a[1];
            expect(deletions).toEqual([]);
            expect(additions).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
    it('should include author information if available', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockContents, _a, deletions, additions;
        return __generator(this, function (_b) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockContents = 'Arbitrary content';
            _a = data_1.getSetContentsStatements(mockContents, new Date(0), mockPad, mockStore, rdflib_1["default"].sym('https://user.example')), deletions = _a[0], additions = _a[1];
            expect(deletions).toEqual([]);
            expect(additions).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
    it('should clear previous content, if any', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockExistingLine, mockContents, _a, deletions, _additions;
        return __generator(this, function (_b) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockExistingLine = rdflib_1["default"].sym('https://arbitrary-line.example');
            mockStore.add(mockPad, ns.pad('next'), mockExistingLine, mockPad.doc());
            mockStore.add(mockExistingLine, ns.pad('content'), 'Existing content', mockPad.doc());
            mockStore.add(mockExistingLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockContents = 'Arbitrary content';
            _a = data_1.getSetContentsStatements(mockContents, new Date(0), mockPad, mockStore, rdflib_1["default"].sym('https://user.example')), deletions = _a[0], _additions = _a[1];
            expect(deletions).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
});
describe('getContents()', function () {
    it('should be able to reconstruct a multiline file', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockFirstLine, mockSecondLine;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockFirstLine = rdflib_1["default"].sym('https://arbitrary-line-1.example');
            mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
            mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockSecondLine = rdflib_1["default"].sym('https://arbitrary-line-2.example');
            mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
            mockStore.add(mockSecondLine, ns.sioc('content'), 'Second line', mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
            expect(data_1.getContents(mockStore, mockPad)).toBe(
            // eslint-disable-next-line indent
            "First line\nSecond line");
            return [2 /*return*/];
        });
    }); });
    it('should ignore lines without contents', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockFirstLine, mockSecondLine;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockFirstLine = rdflib_1["default"].sym('https://arbitrary-line-1.example');
            mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
            mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockSecondLine = rdflib_1["default"].sym('https://arbitrary-line-2.example');
            mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
            expect(data_1.getContents(mockStore, mockPad)).toBe('First line');
            return [2 /*return*/];
        });
    }); });
});
describe('getLatestAuthor()', function () {
    it('should be able to get the latest author', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockEarlyAuthor, mockLateAuthor, mockFirstLine, mockSecondLine;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockEarlyAuthor = rdflib_1["default"].sym('https://early-author.example');
            mockLateAuthor = rdflib_1["default"].sym('https://late-author.example');
            mockFirstLine = rdflib_1["default"].sym('https://arbitrary-line-1.example');
            mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
            mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('author'), mockEarlyAuthor, mockPad.doc());
            mockSecondLine = rdflib_1["default"].sym('https://arbitrary-line-2.example');
            mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
            mockStore.add(mockSecondLine, ns.sioc('content'), 'Second line', mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('created'), new Date(24 * 60 * 60 * 1000), mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('author'), mockLateAuthor, mockPad.doc());
            mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
            expect(data_1.getLatestAuthor(mockStore, mockPad)).toEqual(mockLateAuthor);
            return [2 /*return*/];
        });
    }); });
    it('should return an author even when all lines were authored at the same time', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockEarlyAuthor, mockLateAuthor, mockFirstLine, mockSecondLine;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockEarlyAuthor = rdflib_1["default"].sym('https://early-author.example');
            mockLateAuthor = rdflib_1["default"].sym('https://late-author.example');
            mockFirstLine = rdflib_1["default"].sym('https://arbitrary-line-1.example');
            mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
            mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('author'), mockEarlyAuthor, mockPad.doc());
            mockSecondLine = rdflib_1["default"].sym('https://arbitrary-line-2.example');
            mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
            mockStore.add(mockSecondLine, ns.sioc('content'), 'Second line', mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('author'), mockLateAuthor, mockPad.doc());
            mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
            expect(data_1.getLatestAuthor(mockStore, mockPad)).not.toBeNull();
            return [2 /*return*/];
        });
    }); });
    it('should return null if no author data is present', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockFirstLine, mockSecondLine;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockFirstLine = rdflib_1["default"].sym('https://arbitrary-line-1.example');
            mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
            mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
            mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockSecondLine = rdflib_1["default"].sym('https://arbitrary-line-2.example');
            mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
            mockStore.add(mockSecondLine, ns.sioc('content'), 'Second line', mockPad.doc());
            mockStore.add(mockSecondLine, ns.dc('created'), new Date(0), mockPad.doc());
            mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
            expect(data_1.getLatestAuthor(mockStore, mockPad)).toBeNull();
            return [2 /*return*/];
        });
    }); });
});
describe('getTitle()', function () {
    it('should return a document\'s title', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockStore.add(mockPad, ns.dc('title'), 'Some title', mockPad.doc());
            expect(data_1.getTitle(mockStore, mockPad)).toBe('Some title');
            return [2 /*return*/];
        });
    }); });
});
describe('isPad()', function () {
    it('should recognise when a subject is not a Pad', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockNotAPad;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockNotAPad = rdflib_1["default"].sym('https://chat.example');
            mockStore.add(mockNotAPad, ns.rdf('type'), ns.meeting('Chat'), mockNotAPad.doc());
            expect(data_1.isPad(mockNotAPad, mockStore)).toBe(false);
            return [2 /*return*/];
        });
    }); });
    it('should recognise when a subject is a Pad', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad;
        return __generator(this, function (_a) {
            mockStore = rdflib_1["default"].graph();
            mockPad = rdflib_1["default"].sym('https://pad.example');
            mockStore.add(mockPad, ns.rdf('type'), ns.pad('Notepad'), mockPad.doc());
            expect(data_1.isPad(mockPad, mockStore)).toBe(true);
            return [2 /*return*/];
        });
    }); });
});
