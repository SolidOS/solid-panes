/*      Source editor Pane
**
**  This pane allows the original source of a  resource to be edited by hand
*/
var UI = require('solid-ui')

module.exports = {
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
    const editStyle = 'font-family: monospace; min-width:60em; padding: 1em; border: 0.1em solid black;'
    var readonly = true
    var contentType // Note it when we read and use it when we save

    var div = dom.createElement('div')
    div.setAttribute('class', 'sourcePane')
    var table = div.appendChild(dom.createElement('table'))
    var main = table.appendChild(dom.createElement('tr'))
    var controls = table.appendChild(dom.createElement('tr'))

    var textArea = main.appendChild(dom.createElement('input'))
    textArea.setAttribute('type', 'textarea')

    function editButton (dom) {
      return UI.widgets.button(dom, UI.icons.iconBase + 'noun_253504.svg', 'Edit')
    }

    var myEditButton = controls.appendChild(editButton(dom))
    var cancelButton = controls.appendChild(UI.widgets.cancelButton(dom))
    var saveButton = controls.appendChild(UI.widgets.continueButton(dom))

    function setUnedited () {
      textArea.setAttribute('style', editStyle + 'color: #888;') // Grey
      cancelButton.disabled = true
      saveButton.disabled = true
    }
    function setEditable () {
      textArea.setAttribute('style', editStyle + 'color: black;')
      cancelButton.disabled = true
      saveButton.disabled = true
    }
    function setEdited (event) {
      textArea.setAttribute('style', editStyle + 'color: green;')
      cancelButton.disabled = readonly
      saveButton.disabled = readonly
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
      fetcher._fetch(subject.uri).then(response => {
        textArea.textContent = response.responseText
        setUnedited()
        contentType = response.headers['content-type']
        let allowed = response.headers['allow']
        readonly = allowed.indexOf('PUT') < 0 // In future more info re ACL allow?
        textArea.disabled = readonly
      }).catch(err => {
        div.appendChild(UI.utils.errorMessageBlock(err))
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
