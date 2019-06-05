/*   Trusted Apps Editing Pane
**
** Unlike most panes, this is available any place whatever the real subject,
** and allows the user to edit their own profil, sepciufically the set of apps they trust.
**
** or standalone script adding onto existing mashlib.
*/

/* global alert */
const nodeMode = (typeof module !== 'undefined')
var panes, UI

if (nodeMode) {
  UI = require('solid-ui')
  panes = require('pane-registry')
} else { // Add to existing mashlib
  panes = window.panes
  UI = panes.UI
}

const kb = UI.store
const ns = UI.ns

const thisColor = '#418d99'

const thisPane = {
  icon: UI.icons.iconBase + 'noun_15177.svg', // Looks like an A - could say it's for Applications?

  name: 'trustedApplications',

  label: function (subject) {
    // var types = kb.findTypeURIs(subject) // Show aloways like home pane
    // if (types[UI.ns.foaf('Person').uri] || types[UI.ns.vcard('Individual').uri]) {
    return 'Manage your trusted applications'
    // }
    // return null
  },

  render: function (subject, dom) {
    var div = dom.createElement('div')
    div.classList.add('trusted-applications-pane')
    div.setAttribute('style', 'border: 0.3em solid ' + thisColor + '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;')
    var table = div.appendChild(dom.createElement('table'))
    var main = table.appendChild(dom.createElement('tr'))
    var bottom = table.appendChild(dom.createElement('tr'))
    var statusArea = bottom.appendChild(dom.createElement('div'))
    statusArea.setAttribute('style', 'padding: 0.7em;')

    var context = { dom: dom, div: main, statusArea: statusArea, me: null }
    UI.authn.logInLoadProfile(context).then(context => {
      subject = context.me

      var profile = subject.doc()
      var editable = UI.store.updater.editable(profile.uri, kb)

      main.appendChild(createText('h3', 'Manage your trusted Web Applications'))

      if (!editable) {
        main.appendChild(UI.widgets.errorMessageBlock(dom, `Your profile ${subject.doc().uri} is not editable, so we cannot do much here.`))
        return
      }

      main.appendChild(createText('p', 'Here you can manage the applications you trust.'))

      const applicationsTable = createApplicationTable(subject)
      main.appendChild(applicationsTable)

      main.appendChild(createText('h4', 'Notes'))
      main.appendChild(createContainer('ol', [
        main.appendChild(createText('li', 'If put a web app in this list, you can then add it to specific files or folders in the sharing pane.')),
        main.appendChild(createText('li', 'You can also give an app acecss to ALL of you data, by checking the box here.  Only do that if you know the app very well.')),
        main.appendChild(createText('li', 'When a person uses the web app, they AND the app must both have access.'))
      ]))
      main.appendChild(createText('p', `Application URLs must be valid URL, without the trailing slash. Examples are https://mine.gihub.io,
      http://localhost:3000, https://trusted.app, and https://sub.trusted.app.`))
    }, err => {
      statusArea.appendChild(UI.widgets.errorMessageBlock(dom, err))
    })
    return div
  } // render()
} //

function createApplicationTable (subject) {
  var applicationsTable = createElement('table', {
    'class': 'results'
  })

  // creating headers
  var header = createContainer('tr', [
    createText('th', 'Application URL'),
    createText('th', 'Access modes to ALL your data'),
    createText('th', 'Actions')
  ])
  applicationsTable.appendChild(header)

  // creating rows
  kb.each(subject, ns.acl('trustedApp'))
    .flatMap(app => kb.each(app, ns.acl('origin')).map(origin => ({ appModes: kb.each(app, ns.acl('mode')), origin })))
    .sort(({ origin: a }, { origin: b }) => a.value < b.value ? -1 : 1)
    .forEach(({ appModes, origin }) => applicationsTable.appendChild(createApplicationEntry(subject, origin, appModes, updateTable)))

  // adding a row for new applications
  applicationsTable.appendChild(createApplicationEntry(subject, null, [ns.acl('Read')], updateTable))

  return applicationsTable

  function updateTable () {
    applicationsTable.parentElement.replaceChild(createApplicationTable(subject), applicationsTable)
  }
}

function createApplicationEntry (subject, origin, appModes, updateTable) {
  var trustedApplicationState = { origin, appModes, formElements: { modes: [] } }
  var profile = subject.doc()

  return createContainer('tr', [
    createContainer('td', [
      createElement('input', {
        'class': 'textinput',
        placeholder: 'Write new URL here',
        value: origin ? origin.value : ''
      }, {}, (element) => trustedApplicationState.formElements.origin = element)
    ]),
    createContainer('td', createModesInput(trustedApplicationState)),
    createContainer('td', origin
      ? [
        createText('button', 'Update', {
          'class': 'controlButton',
          style: 'background: LightGreen;'
        }, {
          click: () => addOrEditApplication(subject)
        }),
        createText('button', 'Delete', {
          'class': 'controlButton',
          style: 'background: LightCoral;'
        }, {
          click: () => removeApplication()
        })
      ]
      : [
        createText('button', 'Add', {
          'class': 'controlButton',
          style: 'background: LightGreen;'
        }, {
          click: () => addOrEditApplication(subject)
        })
      ])
  ])

  function addOrEditApplication (me) {
    const profile = me.doc()
    let origin
    try {
      origin = $rdf.sym(trustedApplicationState.formElements.origin.value.trim())
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    var deletions = getStatementsToDelete(origin)
    var additions = getStatementsToAdd(origin, profile)
    kb.updater.update(deletions, additions, handleUpdateResponse)
  }

  function removeApplication () {
    var origin
    try {
      origin = $rdf.sym(trustedApplicationState.formElements.origin.value)
    } catch (err) {
      return alert('Please provide an application URL you want to remove trust from')
    }

    var deletions = getStatementsToDelete(origin)
    kb.updater.update(deletions, null, handleUpdateResponse)
  }

  function getStatementsToAdd (origin, profile) {
    var application = new $rdf.BlankNode(`bn_${generateRandomString()}`)
    return [
      $rdf.st(subject, ns.acl('trustedApp'), application, profile),
      $rdf.st(application, ns.acl('origin'), origin, profile),
      ...trustedApplicationState.formElements.modes
        .filter(checkbox => checkbox.checked)
        .map(checkbox => $rdf.sym(checkbox.value))
        .map(mode => $rdf.st(application, ns.acl('mode'), mode, profile))
    ]
  }

  function getStatementsToDelete (origin) {
    var applicationStatements = kb.statementsMatching(null, ns.acl('origin'), origin)
    return applicationStatements.reduce((memo, st) => memo
        .concat(kb.statementsMatching(subject, ns.acl('trustedApp'), st.subject))
        .concat(kb.statementsMatching(st.subject)),
      [])
  }

  function handleUpdateResponse (uri, success, errorBody) {
    if (success) {
      return updateTable()
    }
    console.error(uri, errorBody)
  }
}

function createElement (elementName, attributes = {}, eventListeners = {}, onCreated = null) {
  var element = document.createElement(elementName)
  if (onCreated) {
    onCreated(element)
  }
  Object.keys(attributes).forEach(attName => {
    element.setAttribute(attName, attributes[attName])
  })
  Object.keys(eventListeners).forEach(eventName => {
    element.addEventListener(eventName, eventListeners[eventName])
  })
  return element
}

function createContainer (elementName, children, attributes = {}, eventListeners = {}, onCreated = null) {
  var element = createElement(elementName, attributes, eventListeners, onCreated)
  children.forEach(child => element.appendChild(child))
  return element
}

function createText (elementName, textContent, attributes = {}, eventListeners = {}, onCreated = null) {
  var element = createElement(elementName, attributes, eventListeners, onCreated)
  element.textContent = textContent
  return element
}

function createModesInput ({ appModes, formElements }) {
  return ['Read', 'Write', 'Append', 'Control'].map(mode => {
    var isChecked = appModes.some(appMode => appMode.value === ns.acl(mode).value)
    return createContainer('label', [
      createElement('input', {
        type: 'checkbox',
        ...(isChecked ? { checked: '' } : {}),
        value: ns.acl(mode).uri
      }, {}, (element) => formElements.modes.push(element)),
      createText('span', mode)
    ])
  })
}

function generateRandomString () {
  return Math.random().toString(36).substring(7)
}

if (nodeMode) {
  module.exports = thisPane
} else {
  console.log('*** patching in live pane: ' + thisPane.name)
  panes.register(thisPane)
}
// ENDS
