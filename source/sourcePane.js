/*      Source editor Pane
**
**  This pane allows the original source of a  resource to be edited by hand
*/

const nodeMode = (typeof module !== 'undefined')
var panes, UI

if (nodeMode) {
  UI = require('solid-ui')
} else { // Add to existing mashlib
  panes = window.panes
  UI = panes.UI
}

const thisPane = {
  icon: UI.icons.iconBase + 'noun_109873_51A7F9.svg', // noun_109873_51A7F9.svg

  name: 'source',

  label: function (subject) {
    const kb = UI.store
    var typeURIs = kb.findTypeURIs(subject)
    var prefix = $rdf.Util.mediaTypeClass('text/*').uri.split('*')[0]
    for (var t in typeURIs) {
      if (t.startsWith(prefix)) return 'View Source'
    }
    return null
  },

  render: function (subject, dom) {
    const kb = UI.store
    const fetcher = kb.fetcher
    const editStyle = 'font-family: monospace; font-size: 100%; min-width:60em; margin: 1em 0.2em 1em 0.2em; padding: 1em; border: 0.1em solid #888; border-radius: 0.5em;'
    var readonly = true
    var contentType // Note it when we read and use it when we save

    var div = dom.createElement('div')
    div.setAttribute('class', 'sourcePane')
    var table = div.appendChild(dom.createElement('table'))
    var main = table.appendChild(dom.createElement('tr'))
    var controls = table.appendChild(dom.createElement('tr'))
    controls.setAttribute('style', 'text-align: right;')

    var textArea = main.appendChild(dom.createElement('textarea'))
    textArea.setAttribute('style', editStyle)

    function editButton (dom) {
      return UI.widgets.button(dom, UI.icons.iconBase + 'noun_253504.svg', 'Edit')
    }

    var myEditButton = controls.appendChild(editButton(dom))
    var cancelButton = controls.appendChild(UI.widgets.cancelButton(dom))
    var saveButton = controls.appendChild(UI.widgets.continueButton(dom))

    function setUnedited () {
      textArea.style.color = '#888'
//      textArea.setAttribute('style', editStyle + 'color: #888;') // Grey
      cancelButton.disabled = true
      saveButton.disabled = true
      textArea.disabled = true
    }
    function setEditable () {
      textArea.style.color = 'black'
      // textArea.setAttribute('style', editStyle + 'color: black;')
      cancelButton.disabled = false
      saveButton.disabled = false
      textArea.disabled = false
    }
    function setEdited (event) {
      textArea.style.color = 'green'
      // textArea.setAttribute('style', editStyle + 'color: green;')
      cancelButton.disabled = readonly
      saveButton.disabled = readonly
      textArea.disabled = false
    }
    function saveBack (e) {
      fetcher.webOperation('PUT', subject.uri, { data: textArea.value, contentType: contentType })
      .then(function (response) {
        setEditable()
      })
      .catch(function (err) {
        div.appendChild(UI.utils.errorMessageBlock(err))
      })
    }

    function refresh (event) {
      fetcher.webOperation('GET', subject.uri).then(function (response) {
        var desc = response.responseText
        textArea.rows = desc ? desc.split('\n').length + 2 : 2
        textArea.cols = 80
        textArea.value = desc

        setUnedited()
        contentType = response.headers['content-type']
        console.log('       source content-type ' + contentType)
        let allowed = response.headers['allow']
        if (!allowed) {
          console.log("@@@@@@@@@@ No Allow: header from this server")
          readonly = false // better allow just in case
        } else {
          readonly = allowed.indexOf('PUT') < 0 // In future more info re ACL allow?
        }
        textArea.disabled = readonly
      }).catch(err => {
        div.appendChild(UI.widgets.errorMessageBlock(err))
      })
    }

    textArea.addEventListener('keyup', setEdited)
    myEditButton.addEventListener('click', setEditable)
    cancelButton.addEventListener('click', refresh)
    saveButton.addEventListener('click', saveBack)

    refresh()
    return div
  }
}

if (nodeMode) {
  module.exports = thisPane
} else {
  console.log('*** patching in live pane: ' + thisPane.name)
  panes.register(thisPane)
}
// ENDS
