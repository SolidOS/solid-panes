"use strict";
exports.__esModule = true;
var $rdf = require("rdflib");
var panes;
var UI;
var kb = UI.store;
var ns = UI.ns;
exports.basicPreferencesPane = {
    icon: UI.icons.iconBase + 'noun_Sliders_341315_000000.svg',
    name: 'basicPreferences',
    label: function (subject) {
        if (subject.uri === subject.site().uri) {
            return "Prefs";
        }
        return null;
    },
    // Render the pane
    // The subject should be the logged in user.
    render: function (subject, dom, paneOptions) {
        function complainIfBad(ok, mess) {
            if (ok)
                return;
            container.appendChild(UI.widgets.errorMessageBlock(dom, mess, '#fee'));
        }
        var container = dom.createElement('div');
        var formArea = container.appendChild(dom.createElement('div'));
        var statusArea = container.appendChild(dom.createElement('div'));
        /* Preferences
        **
        **  Things like whether to color text by author webid, to expand image URLs inline,
        ** expanded inline image height. ...
        ** In general, preferences can be set per user, per user/app combo, per instance,
        ** and per instance/user combo. (Seee the long chat pane preferences for an example.)
        ** Here in the basic preferences, we are only setting  per-user defaults.
        */
        var preferencesFormText = "\n\n  @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n  @prefix solid: <http://www.w3.org/ns/solid/terms#>.\n  @prefix ui: <http://www.w3.org/ns/ui#>.\n  @prefix : <#>.\n\n  :this\n    <http://purl.org/dc/elements/1.1/title> \"Basic preferences\" ;\n    a ui:Form ;\n    ui:part :powerUser, :developerUser;\n    ui:parts ( :powerUser :developerUser  ).\n\n:powerUser a ui:BooleanField; ui:property solid:powerUser;\n  ui:label \"Color user input by user\".\n:developerUser a ui:BooleanField; ui:property solid:developerUser;\n  ui:label \"Expand image URLs inline\".\n:newestFirst a ui:BooleanField; ui:property solid:newestFirst;\n  ui:label \"Newest messages at the top\".\n\n:inlineImageHeightEms a ui:IntegerField; ui:property solid:inlineImageHeightEms;\n  ui:label \"Inline image height (lines)\".\n\n";
        var preferencesForm = kb.sym('https://solid.github.io/solid-panes/dashboard/basicPreferencesForm.ttl#this');
        var preferencesFormDoc = preferencesForm.doc();
        if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
            $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle'); // Load form directly
        }
        // todo make Statement type for fn nelow
        var preferenceProperties = kb.statementsMatching(null, ns.ui.property, null, preferencesFormDoc).map(function (st) { return st.object; });
        var me = UI.authn.currentUser();
        // var context = {noun: 'chat room', me: me, statusArea: statusArea, div: formArea, dom, kb}
        // container.appendChild(UI.preferences.renderPreferencesForm(me, mainClass, preferencesForm, context))
        UI.widgets.appendForm(dom, formArea, {}, me, preferencesForm, me.doc(), complainIfBad);
        return container;
    }
};
// ends
