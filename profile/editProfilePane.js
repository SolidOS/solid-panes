"use strict";
/*   Profile Editing Appp Pane
**
** Unlike view panes, this is available any place whatever the real subject,
** and allows the user to edit their own profile.
**
** Usage: paneRegistry.register('profile/profilePane')
** or standalone script adding onto existing mashlib.
*/
exports.__esModule = true;
var profilePaneUtils_1 = require("./profilePaneUtils");
var nodeMode = (typeof module !== 'undefined');
// let panes: any
// let UI
var UI = require('solid-ui');
var panes = require('pane-registry');
if (nodeMode) {
    // UI = solidUi
    // panes = paneRegistry
}
else { // Add to existing mashlib
    // panes = (window as any).panes
    // UI = panes.UI
}
var kb = UI.store;
var ns = UI.ns;
var $rdf = UI.rdf;
var highlightColor = UI.style.highlightColor || '#7C4DFF';
var thisPane = {
    global: true,
    icon: UI.icons.iconBase + 'noun_492246.svg',
    name: 'editProfile',
    label: function (subject) {
        return profilePaneUtils_1.getLabel(subject, kb, UI.ns);
    },
    render: function (subject, dom) {
        function paneDiv(dom, subject, paneName) {
            var p = panes.byName(paneName);
            var d = p.render(subject, dom);
            d.setAttribute('style', 'border: 0.3em solid #444; border-radius: 0.5em');
            return d;
        }
        function complainIfBad(ok, mess) {
            if (ok)
                return;
            div.appendChild(UI.widgets.errorMessageBlock(dom, mess, '#fee'));
        }
        function renderProfileForm(div, subject) {
            var preferencesFormText = "\n\n    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n    @prefix solid: <http://www.w3.org/ns/solid/terms#>.\n    @prefix ui: <http://www.w3.org/ns/ui#>.\n    @prefix : <#>.\n\n    :this\n      <http://purl.org/dc/elements/1.1/title> \"Profile style form\" ;\n      a ui:Form ;\n      ui:part :backgroundColor, :highlightColor;\n      ui:parts ( :backgroundColor :highlightColor ).\n\n  :backgroundColor a ui:ColorField; ui:property solid:profileBackgroundColor;\n    ui:label \"background colorr\".\n    :highlightColor a ui:ColorField; ui:property solid:profileHighlightColor;\n      ui:label \"background colorr\".\n\n  ";
            var preferencesForm = kb.sym('https://solid.github.io/solid-panes/dashboard/profileStyle.ttl#this');
            var preferencesFormDoc = preferencesForm.doc();
            if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
                $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle'); // Load form directly
            }
            UI.widgets.appendForm(dom, div, {}, subject, preferencesForm, editableProfile, complainIfBad);
        } // renderProfileForm
        var div = dom.createElement('div');
        var editableProfile;
        div.setAttribute('style', 'border: 0.3em solid ' + highlightColor + '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;');
        var table = div.appendChild(dom.createElement('table'));
        // var top = table.appendChild(dom.createElement('tr'))
        var main = table.appendChild(dom.createElement('tr'));
        var bottom = table.appendChild(dom.createElement('tr'));
        var statusArea = bottom.appendChild(dom.createElement('div'));
        statusArea.setAttribute('style', 'padding: 0.7em;');
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
        var context = { dom: dom, div: main, statusArea: statusArea, me: null };
        UI.authn.logInLoadProfile(context).then(function (context) {
            var me = context.me;
            subject = me;
            heading('Edit your public profile');
            var profile = me.doc();
            if (kb.any(subject, ns.solid('editableProfile'))) {
                editableProfile = kb.any(subject, ns.solid('editableProfile'));
            }
            else if (UI.store.updater.editable(profile.uri, kb)) {
                editableProfile = profile;
            }
            statusArea.appendChild(UI.widgets.errorMessageBlock(dom, "\u26A0\uFE0F Your profile " + profile + " is not editable, so we cannot do much here.", 'straw'));
            comment("Everything you put here will be public.\n     There will be other places to record private things..");
            heading('Your contact information');
            main.appendChild(paneDiv(dom, me, 'contact'));
            heading('People you know who have webids');
            comment("This is your public social network.\n        Just put people here you are happy to be connected with publicly\n        (You can always keep private track of friends and family in your contacts.)");
            // TODO: would be useful to explain what it means to "drag people"
            //       what is it that is being dragged?
            //       is there a way to search for people (or things to drag) on this page?
            if (editableProfile)
                comment("Drag people onto the target below to add people.");
            UI.widgets.attachmentList(dom, subject, main, {
                doc: profile,
                modify: !!editableProfile,
                predicate: ns.foaf('knows'),
                noun: 'friend'
            });
            heading('The style of your public profile');
            renderProfileForm(div, subject);
            heading('Thank you for filling your profile.');
        }, function (err) {
            statusArea.appendChild(UI.widgets.errorMessageBlock(dom, err, '#fee'));
        });
        return div;
    } // render()
}; //
exports["default"] = thisPane;
// ENDS
