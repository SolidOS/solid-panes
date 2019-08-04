"use strict";
exports.__esModule = true;
var $rdf = require("rdflib");
function getStatementsToDelete(origin, person, kb, ns) {
    // `as any` is used because the rdflib typings incorrectly require a Node to be passed,
    // even though null is also valid:
    var applicationStatements = kb.statementsMatching(null, ns.acl('origin'), origin, null, null);
    var statementsToDelete = applicationStatements.reduce(function (memo, st) {
        return memo
            .concat(kb.statementsMatching(person, ns.acl('trustedApp'), st.subject, null, false))
            .concat(kb.statementsMatching(st.subject, null, null, null, false));
    }, []);
    return statementsToDelete;
}
exports.getStatementsToDelete = getStatementsToDelete;
function getStatementsToAdd(origin, nodeName, modes, person, ns) {
    var application = new $rdf.BlankNode("bn_" + nodeName);
    return [
        $rdf.st(person, ns.acl('trustedApp'), application, person.doc()),
        $rdf.st(application, ns.acl('origin'), origin, person.doc())
    ].concat(modes
        .map(function (mode) { return $rdf.sym(mode); })
        .map(function (mode) { return $rdf.st(application, ns.acl('mode'), mode, person.doc()); }));
}
exports.getStatementsToAdd = getStatementsToAdd;
