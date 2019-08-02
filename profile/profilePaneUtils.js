"use strict";
exports.__esModule = true;
function getLabel(subject, kb, ns) {
    var types = kb.findTypeURIs(subject);
    if (types[ns.foaf('Person').uri] || types[ns.vcard('Individual').uri]) {
        return 'Your Profile';
    }
    return 'Edit your profile'; // At the moment, just allow on any object. Like home pane
}
exports.getLabel = getLabel;
