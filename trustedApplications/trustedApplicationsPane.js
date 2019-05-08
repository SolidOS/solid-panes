/*   Profile Editing Pane
**
** Unlike most panes, this is available any place whatever the real subject,
** and allows the user to edit their own profile.
**
** Usage: paneRegistry.register('profile/profilePane')
** or standalone script adding onto existing mashlib.
*/

const nodeMode = (typeof module !== 'undefined')

const {getStatementsToAdd, getStatementsToDelete} = require('./trustedApplicationsUtils');
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
    var types = kb.findTypeURIs(subject)
    if (types[UI.ns.foaf('Person').uri] || types[UI.ns.vcard('Individual').uri]) {
      return 'Manage your trusted applications'
    }
    return null
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

      main.appendChild(createText('h3', 'Manage your trusted applications'))

      if (!editable) {
        main.appendChild(UI.widgets.errorMessageBlock(dom, `Your profile ${subject.doc().uri} is not editable, so we cannot do much here.`))
        return
      }

      main.appendChild(createText('p', 'Here you can manage the applications you trust.'))

      const applicationsTable = createApplicationTable(subject)
      main.appendChild(applicationsTable)

      main.appendChild(createText('h4', 'Notes'))
      main.appendChild(createContainer('ol', [
        main.appendChild(createText('li', 'Trusted applications will get access to all resources that you have access to.')),
        main.appendChild(createText('li', 'You can limit which modes they have by default.')),
        main.appendChild(createText('li', 'They will not gain more access than you have.'))
      ]))
      main.appendChild(createText('p', 'Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.'))
    }, err => {
      statusArea.appendChild(UI.widgets.errorMessageBlock(dom, err))
    })
    return div
  } // render()
} //

function createApplicationTable(subject) {
  var applicationsTable = createElement('table', {
    'class': 'results'
  })

  // creating headers
  var header = createContainer('tr', [
    createText('th', 'Application URL'),
    createText('th', 'Access modes'),
    createText('th', 'Actions')
  ])
  applicationsTable.appendChild(header)

  // creating rows
  kb.each(subject, ns.acl('trustedApp'))
    .flatMap(app => kb.each(app, ns.acl('origin')).map(origin => ({appModes: kb.each(app, ns.acl('mode')), origin})))
    .sort(({origin: a}, {origin: b}) => a.value < b.value ? -1 : 1)
    .forEach(({appModes, origin}) => applicationsTable.appendChild(createApplicationEntry(subject, origin, appModes, updateTable)))

  // adding a row for new applications
  applicationsTable.appendChild(createApplicationEntry(subject, null, [ns.acl('Read')], updateTable))

  return applicationsTable

  function updateTable() {
    applicationsTable.parentElement.replaceChild(createApplicationTable(subject), applicationsTable)
  }
}

function createApplicationEntry(subject, origin, appModes, updateTable) {
  var trustedApplicationState = { origin, appModes, formElements: { modes: [] } }
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
          click: () => addOrEditApplication()
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
          click: () => addOrEditApplication()
        })
      ])
  ])

  function addOrEditApplication() {
    let origin
    try {
      origin = $rdf.sym(trustedApplicationState.formElements.origin.value)
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    var modes = trustedApplicationState.formElements.modes
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value)

    var deletions = getStatementsToDelete(origin, subject, kb, ns)
    var additions = getStatementsToAdd(origin, generateRandomString(), modes, profile, ns)
    kb.updater.update(deletions, additions, handleUpdateResponse)
  }

  function removeApplication() {
    let origin
    try {
      origin = $rdf.sym(trustedApplicationState.formElements.origin.value)
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    var deletions = getStatementsToDelete(origin, subject, kb, ns)
    kb.updater.update(deletions, null, handleUpdateResponse)
  }

  function handleUpdateResponse(uri, success, errorBody) {
    if (success) {
      return updateTable()
    }
    console.error(uri, errorBody)
  }
}

function createElement(elementName, attributes = {}, eventListeners = {}, onCreated = null) {
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

function createContainer(elementName, children, attributes = {}, eventListeners = {}, onCreated = null) {
  var element = createElement(elementName, attributes, eventListeners, onCreated)
  children.forEach(child => element.appendChild(child))
  return element
}

function createText(elementName, textContent, attributes = {}, eventListeners = {}, onCreated = null) {
  var element = createElement(elementName, attributes, eventListeners, onCreated)
  element.textContent = textContent
  return element
}

function createModesInput({ appModes, formElements }) {
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

if (nodeMode) {
  module.exports = thisPane
} else {
  console.log('*** patching in live pane: ' + thisPane.name)
  panes.register(thisPane)
}
// ENDS
