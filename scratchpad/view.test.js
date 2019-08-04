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
var $rdf = require("rdflib");
var vocab = require("solid-namespace");
var view_1 = require("./view");
var ns = vocab($rdf);
function addMockPad(mockStore) {
    var mockPad = $rdf.sym('https://mock-pad');
    var mockFirstLine = $rdf.sym('https://arbitrary-line-1');
    mockStore.add(mockPad, ns.pad('next'), mockFirstLine, mockPad.doc());
    mockStore.add(mockFirstLine, ns.sioc('content'), 'First line', mockPad.doc());
    mockStore.add(mockFirstLine, ns.dc('created'), new Date(0), mockPad.doc());
    var mockSecondLine = $rdf.sym('https://arbitrary-line-2');
    mockStore.add(mockFirstLine, ns.pad('next'), mockSecondLine, mockPad.doc());
    mockStore.add(mockSecondLine, ns.sioc('content'), 'Second line', mockPad.doc());
    mockStore.add(mockSecondLine, ns.dc('created'), new Date(0), mockPad.doc());
    mockStore.add(mockSecondLine, ns.pad('next'), mockPad, mockPad.doc());
    return mockPad;
}
describe('View mode', function () {
    it('should not show an edit button when the user is not logged in', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, container, button;
        return __generator(this, function (_a) {
            mockStore = $rdf.graph();
            mockPad = addMockPad(mockStore);
            container = document.createElement('div');
            view_1.view({
                container: container,
                subject: mockPad,
                store: mockStore,
                visitNode: jest.fn()
            });
            button = container.querySelector('button');
            expect(button).toBeNull();
            return [2 /*return*/];
        });
    }); });
    it('should show an edit button when the user is logged in', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockUser, container, button;
        return __generator(this, function (_a) {
            mockStore = $rdf.graph();
            mockPad = addMockPad(mockStore);
            mockUser = $rdf.sym('https://mock-user');
            container = document.createElement('div');
            view_1.view({
                container: container,
                subject: mockPad,
                store: mockStore,
                user: mockUser,
                visitNode: jest.fn()
            });
            button = container.querySelector('button');
            expect(button).toBeDefined();
            expect(button.textContent).toBe('Edit');
            return [2 /*return*/];
        });
    }); });
    it('should properly render the pad\'s contents', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, container;
        return __generator(this, function (_a) {
            mockStore = $rdf.graph();
            mockPad = addMockPad(mockStore);
            container = document.createElement('div');
            view_1.view({
                container: container,
                subject: mockPad,
                store: mockStore,
                visitNode: jest.fn()
            });
            expect(container.outerHTML).toMatchSnapshot();
            return [2 /*return*/];
        });
    }); });
});
describe('Edit mode', function () {
    it('should switch to edit mode when clicking the edit button', function () { return __awaiter(_this, void 0, void 0, function () {
        var mockStore, mockPad, mockUser, container, button, textarea;
        return __generator(this, function (_a) {
            mockStore = $rdf.graph();
            mockPad = addMockPad(mockStore);
            mockUser = $rdf.sym('https://mock-user');
            container = document.createElement('div');
            view_1.view({
                container: container,
                subject: mockPad,
                store: mockStore,
                visitNode: jest.fn(),
                user: mockUser
            });
            button = container.querySelector('button');
            button.dispatchEvent(new Event('click'));
            textarea = container.querySelector('textarea');
            expect(textarea).toBeDefined();
            return [2 /*return*/];
        });
    }); });
});
