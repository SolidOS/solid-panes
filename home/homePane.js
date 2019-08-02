"use strict";
/*   Home Pane
**
** The home pane is avaiable everywhere and allows a user
** to
**  - keep track of their stuff
**  - make new things, and possibly
**  - keep track of accounts and workspaces etc
**
*/
exports.__esModule = true;
var solid_ui_1 = require("solid-ui");
var pane_registry_1 = require("pane-registry");
var HomePane = {
    icon: solid_ui_1["default"].icons.iconBase + 'noun_547570.svg',
    global: true,
    name: 'home',
    // Does the subject deserve an home pane?
    //
    //   yes, always!
    //
    label: function () {
        return 'home';
    },
    render: function (subject, dom) {
        var showContent = function () {
            var context = { div: div, dom: dom, statusArea: div, me: me };
            /*
                  div.appendChild(dom.createElement('h4')).textContent = 'Login status'
                  var loginStatusDiv = div.appendChild(dom.createElement('div'))
                  // TODO: Find out what the actual type is:
                  type UriType = unknown;
                  loginStatusDiv.appendChild(UI.authn.loginStatusBox(dom, () => {
                    // Here we know new log in status
                  }))
            */
            div.appendChild(dom.createElement('h4')).textContent = 'Create new thing somewhere';
            var creationDiv = div.appendChild(dom.createElement('div'));
            var creationContext = { div: creationDiv, dom: dom, statusArea: div, me: me };
            solid_ui_1["default"].create.newThingUI(creationContext, pane_registry_1["default"]); // newUI Have to pass panes down
            div.appendChild(dom.createElement('h4')).textContent = 'Private things';
            solid_ui_1["default"].authn.registrationList(context, { private: true }).then(function (context) {
                div.appendChild(dom.createElement('h4')).textContent = 'Public things';
                div.appendChild(dom.createElement('p')).textContent = 'Things in this list are visible to others.';
                solid_ui_1["default"].authn.registrationList(context, { public: true }).then(function () {
                    // done
                });
            });
        };
        var div = dom.createElement('div');
        var me = solid_ui_1["default"].authn.currentUser();
        showContent();
        return div;
    }
}; // pane object
// ends
exports["default"] = HomePane;
