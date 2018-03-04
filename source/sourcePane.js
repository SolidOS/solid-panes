/*      Source editor Pane
**
**  This pane allows the original source of a  resource to be edited by hand
*/
var UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'noun_109873_51A7F9.svg',

  name: 'source',

  label: function (subject) {
    if ('http://www.w3.org/2007/ont/link#ProtocolEvent' in UI.store.findTypeURIs(subject)) return null
    var n = UI.store.statementsMatching(
      undefined, undefined, undefined, subject).length
    if (n === 0) return null
    return 'Data (' + n + ') as N3'
  },

  render: function (subject, myDocument) {
    const kb = UI.store
    const fetcher = kb.fetcher
    const editStyle = "font-family: monospace; min-width:60em; padding: 1em; border: 0.1em solid black;"
    var modify = true
    var contentType // Note it when we read and use it when we save

    var div = myDocument.createElement('div')
    div.setAttribute('class', 'sourcePane')
    var textArea = div.appendChild(dom.createElement('inout'))
    textArea.setAttribute('type', 'textarea')

    var cancelButton = div.appendChild(UI.widgets.cancelButton(dom))
    var saveButton = div.appendChild(UI.widgets.UI.widgets.continueButton(dom))

    function setEdited (event) {
      textArea.setAttribute('style', editStyle + 'color: greeen;')
      cancelButton.disabled = false
      saveButton.disabled = false
    }
    textArea.addEventListener('keyup', setEdited)
    cancelButton.addEventListener('click', refresh)

    function saveBack (e) {
      fetcher.webOperation('PUT', subject.uri, { data: textArea.value, contentType: contentType })
      .then(function(@@))
      .catch(function (err) {
        div.appendChild(UI.utils.errorMessageBlock(err))
      })
    }

    // We have to fetch the original source as rdflib does not cache it
    function refresh (event) {
      fetcher._fetch(subject.uri).then( response => {
        textArea.textContent = response.text
        textArea.setAttribute('style', editStyle + 'color: black;')
        contentType = response.headers['content-type']
        // @@@ check headers to find out whether we have write access -> set modify
      }).catch( err => {
        div.appendChild(UI.utils.errorMessageBlock(err))
      })
    }
    refresh()
    return div
  }
}
