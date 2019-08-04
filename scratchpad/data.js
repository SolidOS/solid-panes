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
require("@babel/polyfill");
var rdflib_1 = require("rdflib");
var solid_namespace_1 = require("solid-namespace");
var ns = solid_namespace_1["default"](rdflib_1["default"]);
/* istanbul ignore next [Side effects are contained to initialise(), so ignore just that for test coverage] */
exports.initialise = function (store, user) { return __awaiter(_this, void 0, void 0, function () {
    var creationDate, _a, pad, initialisationAdditions, _b, _setContentDeletions, setContentAdditions, statementsToAdd;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                creationDate = new Date();
                _a = getInitialisationStatements(creationDate, store, user), pad = _a[0], initialisationAdditions = _a[1];
                _b = getSetContentsStatements('', creationDate, pad, store, user), _setContentDeletions = _b[0], setContentAdditions = _b[1];
                statementsToAdd = initialisationAdditions.concat(setContentAdditions);
                if (!store.updater) return [3 /*break*/, 2];
                return [4 /*yield*/, store.updater.put(pad, statementsToAdd, 'text/turtle', function () { return undefined; })];
            case 1:
                _c.sent();
                _c.label = 2;
            case 2: return [2 /*return*/, pad];
        }
    });
}); };
function isPad(pad, store) {
    var padStatement = store.statementsMatching(pad, ns.rdf('type'), ns.pad('Notepad'), pad.doc(), true)[0];
    return !!padStatement;
}
exports.isPad = isPad;
function getInitialisationStatements(creationDate, store, user) {
    var storeNamespaces = store.namespaces;
    var padName = creationDate.getTime();
    var pad = store.sym(storeNamespaces.pub + padName + '/index.ttl#this');
    var statementsToAdd = [
        rdflib_1["default"].st(pad, ns.rdf('type'), ns.pad('Notepad'), pad.doc()),
        rdflib_1["default"].st(pad, ns.dc('title'), "Scratchpad (" + creationDate.toLocaleDateString() + ")", pad.doc()),
        rdflib_1["default"].st(pad, ns.dc('created'), creationDate, pad.doc())
    ];
    if (user) {
        statementsToAdd.push(rdflib_1["default"].st(pad, ns.dc('author'), user, pad.doc()));
    }
    return [pad, statementsToAdd];
}
exports.getInitialisationStatements = getInitialisationStatements;
// Potential improvement: get current content, generate a diff
function getSetContentsStatements(contents, creationDate, pad, store, user) {
    var lines = contents.split('\n');
    var statementsToAdd = lines.reduce(function (statementsToAdd, lineContents, lineNr) {
        var line = store.sym(pad.uri + ("_line" + lineNr));
        var prevLine = (lineNr === 0) ? pad : statementsToAdd[statementsToAdd.length - 1].subject;
        statementsToAdd.push(rdflib_1["default"].st(prevLine, ns.pad('next'), line, pad.doc()), rdflib_1["default"].st(line, ns.sioc('content'), lineContents, pad.doc()), rdflib_1["default"].st(line, ns.dc('created'), creationDate, pad.doc()));
        if (user) {
            statementsToAdd.push(rdflib_1["default"].st(line, ns.dc('author'), user, pad.doc()));
        }
        return statementsToAdd;
    }, []);
    var lastLine = statementsToAdd[statementsToAdd.length - 1].subject;
    statementsToAdd.push(rdflib_1["default"].st(lastLine, ns.pad('next'), pad, pad.doc()));
    var oldLines = store.statementsMatching(null, ns.pad('next'), null, pad.doc(), false)
        .map(function (statement) { return statement.object; })
        .filter(function (line) { return line.value !== pad.value; });
    var statementsPerOldLine = oldLines.map(function (oldLine) {
        return store.statementsMatching(oldLine, null, null, pad.doc(), false);
    });
    var statementsToDelete = statementsPerOldLine.reduce(function (statementsToDelete, oldLineStatements) {
        statementsToDelete.push.apply(statementsToDelete, oldLineStatements);
        return statementsToDelete;
    }, []);
    var startingLink = store.statementsMatching(pad, ns.pad('next'), null, pad.doc(), true)[0];
    if (startingLink) {
        statementsToDelete.push(startingLink);
    }
    return [statementsToDelete, statementsToAdd];
}
exports.getSetContentsStatements = getSetContentsStatements;
function getTitle(store, pad) {
    var titleStatement = store.statementsMatching(pad, ns.dc('title'), null, pad.doc(), true)[0];
    return titleStatement.object.value;
}
exports.getTitle = getTitle;
function getContents(store, pad) {
    var firstLineStatement = store.statementsMatching(pad, ns.pad('next'), null, pad.doc(), true)[0];
    var prevLine = firstLineStatement.object;
    var lines = [];
    while (prevLine.value !== pad.value) {
        var currentLineStatement = store.statementsMatching(prevLine, ns.pad('next'), null, pad.doc(), true)[0];
        var lineContentStatement = store.statementsMatching(currentLineStatement.subject, ns.sioc('content'), null, pad.doc(), true)[0];
        if (lineContentStatement) {
            lines.push(lineContentStatement.object.value);
        }
        prevLine = currentLineStatement.object;
    }
    return lines.join('\n');
}
exports.getContents = getContents;
function getLatestAuthor(store, pad) {
    var firstLineStatement = store.statementsMatching(pad, ns.pad('next'), null, pad.doc(), true)[0];
    var prevLine = firstLineStatement.object;
    var datesAndAuthors = [];
    while (prevLine.value !== pad.value) {
        var currentLineStatement = store.statementsMatching(prevLine, ns.pad('next'), null, pad.doc(), true)[0];
        var lineDateStatement = store.statementsMatching(currentLineStatement.subject, ns.dc('created'), null, pad.doc(), true)[0];
        var lineAuthorStatement = store.statementsMatching(currentLineStatement.subject, ns.dc('author'), null, pad.doc(), true)[0];
        if (lineDateStatement && lineAuthorStatement) {
            datesAndAuthors.push({
                created: new Date(lineDateStatement.object.value),
                author: lineAuthorStatement.object
            });
        }
        prevLine = currentLineStatement.object;
    }
    if (datesAndAuthors.length === 0) {
        return null;
    }
    var latestAuthor = datesAndAuthors.reduce(function (latestAuthor, lineDateAndAuthor) {
        return (latestAuthor.created.getTime() < lineDateAndAuthor.created.getTime())
            ? lineDateAndAuthor
            : latestAuthor;
    });
    return latestAuthor.author;
}
exports.getLatestAuthor = getLatestAuthor;
