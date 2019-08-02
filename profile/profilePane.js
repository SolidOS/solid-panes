"use strict";
/*   Display A Public Profile Pane
**
** This is the subject's primary representation in the world.
** When anyone scans the QR code of their webid on theor card, it takes gthem
** to here and here alone.  Thiks has better be good.  This has better be
** worth the subjectjoing solid for
** - informative
**
** Usage: paneRegistry.register('profile/profilePane')
** or standalone script adding onto existing mashlib.
*/
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
var nodeMode = (typeof module !== 'undefined');
var UI = require('solid-ui');
var panes = require('pane-registry');
/*
 let panes: any
let UI: SolidUi

if (nodeMode) {
  UI = solidUi
  panes = paneRegistry
} else { // Add to existing mashlib
  panes = (window as any).panes
  UI = panes.UI
}
*/
var kb = UI.store;
var ns = UI.ns;
var thisPane = {
    global: false,
    icon: UI.icons.iconBase + 'noun_15059.svg',
    name: 'profile',
    label: function (subject) {
        var t = kb.findTypeURIs(subject);
        if (t[ns.vcard('Individual').uri]
            || t[ns.vcard('Organization').uri]
            || t[ns.foaf('Person').uri]
            || t[ns.schema('Person').uri])
            return 'Profile';
        return null;
    },
    render: function (subject, dom) {
        function paneDiv(dom, subject, paneName) {
            var p = panes.byName(paneName);
            var d = p.render(subject, dom);
            d.setAttribute('style', 'border: 0.3em solid #444; border-radius: 0.5em');
            return d;
        }
        function doRender(container, subject, dom) {
            return __awaiter(this, void 0, void 0, function () {
                function comment(str) {
                    var p = main.appendChild(dom.createElement('p'));
                    p.setAttribute('style', 'padding: 1em;');
                    p.textContent = str;
                    return p;
                }
                function heading(str) {
                    var h = main.appendChild(dom.createElement('h3'));
                    h.setAttribute('style', 'color:' + highlightColor + ';');
                    h.textContent = str;
                    return h;
                }
                var profile, otherProfiles, err_1, backgroundColor, highlightColor, table, main, bottom, statusArea;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!subject)
                                throw new Error('subject missing');
                            profile = subject.doc();
                            otherProfiles = kb.each(subject, ns.rdfs('seeAlso'), null, profile);
                            if (!(otherProfiles.length > 0)) return [3 /*break*/, 4];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, kb.fetcher.load(otherProfiles)];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            container.appendChild(UI.widgets.errorMessageBlock(err_1));
                            return [3 /*break*/, 4];
                        case 4:
                            backgroundColor = kb.anyValue(subject, ns.solid('profileBackgroundColor')) || '#ffffff';
                            // Todo: check format of color matches regexp and not too dark
                            container.style.backgroundColor = backgroundColor; // @@ Limit to pale?
                            highlightColor = kb.anyValue(subject, ns.solid('profileHighlightColor')) || '#090' // @@ beware injection attack
                            ;
                            container.setAttribute('style', 'border: 0.3em solid ' + highlightColor + '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;');
                            table = container.appendChild(dom.createElement('table'));
                            main = table.appendChild(dom.createElement('tr'));
                            bottom = table.appendChild(dom.createElement('tr'));
                            statusArea = bottom.appendChild(dom.createElement('div'));
                            statusArea.setAttribute('style', 'padding: 0.7em;');
                            // Todo: only show this if there is
                            heading('Contact');
                            main.appendChild(paneDiv(dom, subject, 'contact'));
                            if (kb.holds(subject, ns.foaf('knows'))) {
                                heading('Solid Friends');
                                UI.widgets.attachmentList(dom, subject, container, {
                                    doc: profile,
                                    modify: false,
                                    predicate: ns.foaf('knows'),
                                    noun: 'friend'
                                });
                            }
                            return [2 /*return*/];
                    }
                });
            });
        }
        var container = dom.createElement('div');
        doRender(container, subject, dom); // async
        return container; // initially unpopulated
    } // render()
}; //
exports["default"] = thisPane;
// ENDS
