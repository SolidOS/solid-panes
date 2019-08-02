"use strict";
exports.__esModule = true;
var solid_ui_1 = require("solid-ui");
var pane_registry_1 = require("pane-registry");
var panes;
var UI;
var kb = UI.store;
var nodeMode = (typeof module !== 'undefined');
if (nodeMode) {
    UI = solid_ui_1["default"];
    panes = pane_registry_1["default"];
}
else { // Add to existing mashlib
    panes = window.panes;
    UI = panes.UI;
}
exports.basicPreferencesPane = {
    icon: UI.icons.iconBase + 'noun_Sliders_341315_000000.svg',
    name: 'preferences',
    label: function (subject) {
        if (subject.uri === subject.site().uri) {
            return "Prefs";
        }
        return null;
    },
    // Render the pane
    // The subject should be the logged in user.
    render: function (subject, dom) {
        var container = dom.createElement('div');
        /* Preferences
        **
        **  Things like whether to color text by author webid, to expand image URLs inline,
        ** expanded inline image height. ...
        ** In general, preferences can be set per user, per user/app combo, per instance,
        ** and per instance/user combo. (Seee the long chat pane preferences for an example.)
        ** Here in the basic preferences, we are only setting  per-user defaults.
        */
        var preferencesFormText = "\n\n  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n  @prefix solid: <http://www.w3.org/ns/solid/terms#>.\n  @prefix ui: <http://www.w3.org/ns/ui#>.\n  @prefix : <#>.\n\n  :this\n    <http://purl.org/dc/elements/1.1/title> \"Basic preferences\" ;\n    a ui:Form ;\n    ui:part :powerUser, :developerUser, :newestFirst, :inlineImageHeightEms;\n    ui:parts ( :powerUser :developerUser :newestFirst :inlineImageHeightEms ).\n\n:powerUser a ui:BooleanField; ui:property solid:powerUser;\n  ui:label \"Color user input by user\".\n:developerUser a ui:BooleanField; ui:property solid:developerUser;\n  ui:label \"Expand image URLs inline\".\n:newestFirst a ui:BooleanField; ui:property solid:newestFirst;\n  ui:label \"Newest messages at the top\".\n\n:inlineImageHeightEms a ui:IntegerField; ui:property solid:inlineImageHeightEms;\n  ui:label \"Inline image height (lines)\".\n\n";
        var preferencesForm = kb.sym('https://solid.github.io/solid-panes/dashboard/basicPreferencesForm.ttl#this');
        var preferencesFormDoc = preferencesForm.doc();
        if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
            $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle'); // Load form directly
        }
        var preferenceProperties = kb.statementsMatching(null, ns.ui.property, null, preferencesFormDoc).map(function (st) { return st.object; });
        var context = { noun: 'chat room', me: me, statusArea: statusArea, div: menuArea, dom: dom, kb: kb };
        container.appendChild(UI.preferences.renderPreferencesForm(chatChannel, mainClass, preferencesForm, context));
    }
};
// ends
