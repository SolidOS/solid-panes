"use strict";
/*   Profile Editing Pane
**
** Unlike most panes, this is available any place whatever the real subject,
** and allows the user to edit their own profile.
**
** Usage: paneRegistry.register('profile/profilePane')
** or standalone script adding onto existing mashlib.
*/
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var solid_ui_1 = require("solid-ui");
var $rdf = require("rdflib");
var pane_registry_1 = require("pane-registry");
var trustedApplicationsUtils_1 = require("./trustedApplicationsUtils");
var nodeMode = (typeof module !== 'undefined');
var panes;
var UI;
if (nodeMode) {
    UI = solid_ui_1["default"];
    panes = pane_registry_1["default"];
}
else { // Add to existing mashlib
    panes = window.panes;
    UI = panes.UI;
}
var kb = UI.store;
var ns = UI.ns;
var thisColor = '#418d99';
;
var thisPane = {
    icon: UI.icons.iconBase + 'noun_15177.svg',
    global: true,
    name: 'trustedApplications',
    label: function (subject) {
        var types = kb.findTypeURIs(subject);
        if (types[UI.ns.foaf('Person').uri] || types[UI.ns.vcard('Individual').uri]) {
            return 'Manage your trusted applications';
        }
        return null;
    },
    render: function (subject, dom) {
        var div = dom.createElement('div');
        div.classList.add('trusted-applications-pane');
        div.setAttribute('style', 'border: 0.3em solid ' + thisColor + '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;');
        var table = div.appendChild(dom.createElement('table'));
        var main = table.appendChild(dom.createElement('tr'));
        var bottom = table.appendChild(dom.createElement('tr'));
        var statusArea = bottom.appendChild(dom.createElement('div'));
        statusArea.setAttribute('style', 'padding: 0.7em;');
        var context = { dom: dom, div: main, statusArea: statusArea, me: null };
        UI.authn.logInLoadProfile(context).then(function (context) {
            var subject = context.me;
            var profile = subject.doc();
            var editable = UI.store.updater.editable(profile.uri, kb);
            main.appendChild(createText('h3', 'Manage your trusted applications'));
            if (!editable) {
                main.appendChild(UI.widgets.errorMessageBlock(dom, "Your profile " + subject.doc().uri + " is not editable, so we cannot do much here."));
                return;
            }
            main.appendChild(createText('p', 'Here you can manage the applications you trust.'));
            var applicationsTable = createApplicationTable(subject);
            main.appendChild(applicationsTable);
            main.appendChild(createText('h4', 'Notes'));
            main.appendChild(createContainer('ol', [
                main.appendChild(createText('li', 'Trusted applications will get access to all resources that you have access to.')),
                main.appendChild(createText('li', 'You can limit which modes they have by default.')),
                main.appendChild(createText('li', 'They will not gain more access than you have.'))
            ]));
            main.appendChild(createText('p', 'Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.'));
        }, function (err) {
            statusArea.appendChild(UI.widgets.errorMessageBlock(dom, err));
        });
        return div;
    } // render()
}; //
function createApplicationTable(subject) {
    var applicationsTable = createElement('table', {
        'class': 'results'
    });
    // creating headers
    var header = createContainer('tr', [
        createText('th', 'Application URL'),
        createText('th', 'Access modes'),
        createText('th', 'Actions')
    ]);
    applicationsTable.appendChild(header);
    // creating rows
    kb.each(subject, ns.acl('trustedApp'), undefined, undefined)
        .flatMap(function (app) {
        return kb.each(app, ns.acl('origin'), undefined, undefined)
            .map(function (origin) { return ({ appModes: kb.each(app, ns.acl('mode'), undefined, undefined), origin: origin }); });
    })
        .sort(function (a, b) { return a.origin.value < b.origin.value ? -1 : 1; })
        .forEach(function (_a) {
        var appModes = _a.appModes, origin = _a.origin;
        return applicationsTable.appendChild(createApplicationEntry(subject, origin, appModes, updateTable));
    });
    // adding a row for new applications
    applicationsTable.appendChild(createApplicationEntry(subject, null, [ns.acl('Read')], updateTable));
    return applicationsTable;
    function updateTable() {
        applicationsTable.parentElement.replaceChild(createApplicationTable(subject), applicationsTable);
    }
}
function createApplicationEntry(subject, origin, appModes, updateTable) {
    var trustedApplicationState = {
        origin: origin,
        appModes: appModes,
        formElements: {
            modes: [],
            origin: undefined
        }
    };
    return createContainer('tr', [
        createContainer('td', [
            createElement('input', {
                'class': 'textinput',
                placeholder: 'Write new URL here',
                value: origin ? origin.value : ''
            }, {}, function (element) { trustedApplicationState.formElements.origin = element; })
        ]),
        createContainer('td', createModesInput(trustedApplicationState)),
        createContainer('td', origin
            ? [
                createText('button', 'Update', {
                    'class': 'controlButton',
                    style: 'background: LightGreen;'
                }, {
                    click: function () { return addOrEditApplication(); }
                }),
                createText('button', 'Delete', {
                    'class': 'controlButton',
                    style: 'background: LightCoral;'
                }, {
                    click: function () { return removeApplication(); }
                })
            ]
            : [
                createText('button', 'Add', {
                    'class': 'controlButton',
                    style: 'background: LightGreen;'
                }, {
                    click: function () { return addOrEditApplication(); }
                })
            ])
    ]);
    function addOrEditApplication() {
        var origin;
        try {
            origin = $rdf.sym(trustedApplicationState.formElements.origin.value);
        }
        catch (err) {
            return alert('Please provide an application URL you want to trust');
        }
        var modes = trustedApplicationState.formElements.modes
            .filter(function (checkbox) { return checkbox.checked; })
            .map(function (checkbox) { return checkbox.value; });
        var deletions = trustedApplicationsUtils_1.getStatementsToDelete(origin, subject, kb, ns);
        var additions = trustedApplicationsUtils_1.getStatementsToAdd(origin, generateRandomString(), modes, subject, ns);
        kb.updater.update(deletions, additions, handleUpdateResponse);
    }
    function removeApplication() {
        var origin;
        try {
            origin = $rdf.sym(trustedApplicationState.formElements.origin.value);
        }
        catch (err) {
            return alert('Please provide an application URL you want to remove trust from');
        }
        var deletions = trustedApplicationsUtils_1.getStatementsToDelete(origin, subject, kb, ns);
        kb.updater.update(deletions, null, handleUpdateResponse);
    }
    function handleUpdateResponse(uri, success, errorBody) {
        if (success) {
            return updateTable();
        }
        console.error(uri, errorBody);
    }
}
function createElement(elementName, attributes, eventListeners, onCreated) {
    if (attributes === void 0) { attributes = {}; }
    if (eventListeners === void 0) { eventListeners = {}; }
    if (onCreated === void 0) { onCreated = null; }
    var element = document.createElement(elementName);
    if (onCreated) {
        onCreated(element);
    }
    Object.keys(attributes).forEach(function (attName) {
        element.setAttribute(attName, attributes[attName]);
    });
    Object.keys(eventListeners).forEach(function (eventName) {
        element.addEventListener(eventName, eventListeners[eventName]);
    });
    return element;
}
function createContainer(elementName, children, attributes, eventListeners, onCreated) {
    if (attributes === void 0) { attributes = {}; }
    if (eventListeners === void 0) { eventListeners = {}; }
    if (onCreated === void 0) { onCreated = null; }
    var element = createElement(elementName, attributes, eventListeners, onCreated);
    children.forEach(function (child) { return element.appendChild(child); });
    return element;
}
function createText(elementName, textContent, attributes, eventListeners, onCreated) {
    if (attributes === void 0) { attributes = {}; }
    if (eventListeners === void 0) { eventListeners = {}; }
    if (onCreated === void 0) { onCreated = null; }
    var element = createElement(elementName, attributes, eventListeners, onCreated);
    element.textContent = textContent;
    return element;
}
function createModesInput(_a) {
    var appModes = _a.appModes, formElements = _a.formElements;
    return ['Read', 'Write', 'Append', 'Control'].map(function (mode) {
        var isChecked = appModes.some(function (appMode) { return appMode.value === ns.acl(mode).value; });
        return createContainer('label', [
            createElement('input', __assign({ type: 'checkbox' }, (isChecked ? { checked: '' } : {}), { value: ns.acl(mode).uri }), {}, function (element) { return formElements.modes.push(element); }),
            createText('span', mode)
        ]);
    });
}
function generateRandomString() {
    return Math.random().toString(36).substring(7);
}
exports["default"] = thisPane;
if (!nodeMode) {
    console.log('*** patching in live pane: ' + thisPane.name);
    panes.register(thisPane);
}
// ENDS
