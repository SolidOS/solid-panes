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
var UI = require("solid-ui");
var panes = require("pane-registry");
var rdflib_1 = require("rdflib");
var homepage_1 = require("./homepage");
var nodeMode = (typeof module !== 'undefined');
exports.dashboardPane = {
    icon: UI.icons.iconBase + 'noun_547570.svg',
    name: 'dashboard',
    label: function (subject) {
        if (subject.uri === subject.site().uri) {
            return "Dashboard";
        }
        return null;
    },
    render: function (subject, dom) {
        var container = dom.createElement('div');
        var webId = UI.authn.currentUser();
        buildPage(container, webId, dom, subject);
        UI.authn.solidAuthClient.trackSession(function (session) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                container.innerHTML = "";
                buildPage(container, session ? rdflib_1.sym(session.webId) : null, dom, subject);
                return [2 /*return*/];
            });
        }); });
        return container;
    }
};
function buildPage(container, webId, dom, subject) {
    if (!webId) {
        return buildHomePage(container, subject);
    }
    if (webId.site().uri === subject.site().uri) {
        return buildDashboard(container, dom);
    }
    return buildHomePage(container, subject);
}
function buildDashboard(container, dom) {
    var outliner = panes.getOutliner(dom);
    outliner.showDashboard(container);
}
function buildHomePage(container, subject) {
    var wrapper = document.createElement('div');
    container.appendChild(wrapper);
    var shadow = wrapper.attachShadow({ mode: 'open' });
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/common/css/bootstrap.min.css';
    shadow.appendChild(link);
    homepage_1.generateHomepage(subject, UI.store, UI.store.fetcher).then(function (homepage) { return shadow.appendChild(homepage); });
}
exports["default"] = exports.dashboardPane;
