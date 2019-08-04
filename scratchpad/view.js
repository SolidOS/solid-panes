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
exports.__esModule = true;
var solid_namespace_1 = require("solid-namespace");
var rdflib_1 = require("rdflib");
var data_1 = require("./data");
var ns = solid_namespace_1["default"](rdflib_1["default"]);
function view(_a) {
    var container = _a.container, subject = _a.subject, store = _a.store, visitNode = _a.visitNode, user = _a.user;
    toViewMode();
    function toViewMode() {
        var content = data_1.getContents(store, subject);
        container.innerHTML = '';
        var lines = content.split('\n');
        lines.forEach(function (line) {
            container.appendChild(document.createTextNode(line));
            container.appendChild(document.createElement('br'));
        });
        container.appendChild(document.createElement('hr'));
        if (user) {
            var editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', function (event) {
                event.preventDefault();
                toEditMode();
            });
            container.appendChild(editButton);
            container.appendChild(document.createElement('br'));
        }
        var authorContainer = document.createElement('small');
        container.appendChild(authorContainer);
        showLatestAuthor(authorContainer);
    }
    /* istanbul ignore next [This function depends on a side effect (fetch), so skip it for testing for now:] */
    function showLatestAuthor(authorContainer) {
        return __awaiter(this, void 0, void 0, function () {
            var latestAuthor, fetcher, nameStatement, authorLink, name_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        latestAuthor = data_1.getLatestAuthor(store, subject);
                        if (!latestAuthor) return [3 /*break*/, 2];
                        fetcher = rdflib_1["default"].fetcher(store, {});
                        return [4 /*yield*/, fetcher.load(latestAuthor.uri)];
                    case 1:
                        _a.sent();
                        nameStatement = store.statementsMatching(latestAuthor, ns.vcard('fn'), null, null, true)[0];
                        authorContainer.appendChild(document.createTextNode('Latest author: '));
                        authorLink = document.createElement('a');
                        authorLink.href = latestAuthor.uri;
                        name_1 = (nameStatement) ? nameStatement.object.value : latestAuthor.uri;
                        authorLink.textContent = name_1;
                        authorLink.title = "View the profile of " + name_1;
                        authorLink.addEventListener('click', function (event) {
                            event.preventDefault();
                            visitNode(latestAuthor);
                        });
                        authorContainer.appendChild(authorLink);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    }
    function toEditMode() {
        /* istanbul ignore if [This should not be able to happen, but since the view is not stateless, we cannot verify this in unit tests.] */
        if (!user) {
            return;
        }
        var content = data_1.getContents(store, subject);
        container.innerHTML = '<form><textarea></textarea><button type="submit">Save</button></form>';
        var textArea = container.getElementsByTagName('textarea')[0];
        textArea.textContent = content;
        var form = container.getElementsByTagName('form')[0];
        /* istanbul ignore next [Side effects get executed here, so do not run them in unit tests:] */
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var creationDate = new Date();
            var _a = data_1.getSetContentsStatements(textArea.value, creationDate, subject, store, user), setContentDeletions = _a[0], setContentAdditions = _a[1];
            if (store.updater) {
                store.updater.update(setContentDeletions, setContentAdditions, toViewMode);
            }
        });
    }
}
exports.view = view;
