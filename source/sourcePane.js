/*      Source editor Pane
**
**  This pane allows the original source of a resource to be edited by hand
**
*/
/* global alert */

const UI = require('solid-ui')
const mime = require('mime-types')
const kb = UI.store

const thisPane = {
  icon: UI.icons.iconBase + 'noun_109873.svg', // noun_109873_51A7F9.svg

  name: 'source',

  label: function (subject) {
    var typeURIs = kb.findTypeURIs(subject)
    var prefix = $rdf.Util.mediaTypeClass('text/*').uri.split('*')[0]
    for (var t in typeURIs) {
      if (t.startsWith(prefix)) return 'Source'
      if (t.includes('xml')) return 'XML Source'
    }
    return null
  },

  // Create a new text file in a Solid system,
  mintNew: function (newPaneOptions) {
    var newInstance = newPaneOptions.newInstance
    if (!newInstance) {
      let uri = newPaneOptions.newBase
      if (uri.endsWith('/')) {
        uri = uri.slice(0, -1)
        newPaneOptions.newBase = uri
      }
      newInstance = kb.sym(uri)
      newPaneOptions.newInstance = newInstance
    }

    var contentType = mime.lookup(newInstance.uri)
    if (!contentType || !(contentType.startsWith('text') || contentType.includes('xml'))) {
      let msg = 'A new text file has to have an file extension like .txt .ttl etc.'
      alert(msg)
      throw new Error(msg)
    }

    return new Promise(function (resolve, reject) {
      kb.fetcher.webOperation('PUT', newInstance.uri, {data: '\n', contentType: contentType})
        .then(function (response) {
          console.log('New text file created: ' + newInstance.uri)
          newPaneOptions.newInstance = newInstance
          resolve(newPaneOptions)
        }, err => {
          alert('Cant make new file: ' + err)
          reject(err)
        })
    })
  },

  render: function (subject, dom) {
    const kb = UI.store
    const fetcher = kb.fetcher
    const editStyle = 'font-family: monospace; font-size: 100%; min-width:60em; margin: 1em 0.2em 1em 0.2em; padding: 1em; border: 0.1em solid #888; border-radius: 0.5em;'
    var readonly = true
    var editing = false
    var broken = false
    // Set in refresh()
    var contentType, allowed, eTag // Note it when we read and use it when we save

    var div = dom.createElement('div')
    div.setAttribute('class', 'sourcePane')
    var table = div.appendChild(dom.createElement('table'))
    var main = table.appendChild(dom.createElement('tr'))
    var statusRow = table.appendChild(dom.createElement('tr'))
    var controls = table.appendChild(dom.createElement('tr'))
    controls.setAttribute('style', 'text-align: right;')

    var textArea = main.appendChild(dom.createElement('textarea'))
    textArea.setAttribute('style', editStyle)

    function editButton (dom) {
      return UI.widgets.button(dom, UI.icons.iconBase + 'noun_253504.svg', 'Edit')
    }

    var cancelButton = controls.appendChild(UI.widgets.cancelButton(dom))
    var saveButton = controls.appendChild(UI.widgets.continueButton(dom))
    var myEditButton = controls.appendChild(editButton(dom))

    function setUnedited () {
      if (broken) return
      editing = false
      myEditButton.style.visibility = 'visible'
      textArea.style.color = '#888'
      cancelButton.style.visibility = 'collapse'
      saveButton.style.visibility = 'collapse'
      textArea.setAttribute('readonly', 'true')
    }
    function setEditable () {
      if (broken) return
      editing = true
      textArea.style.color = 'black'
      cancelButton.style.visibility = 'visible' // not logically needed but may be comforting
      saveButton.style.visibility = 'collapse'
      myEditButton.style.visibility = 'collapse'
      textArea.removeAttribute('readonly')
    }
    function setEdited (event) {
      if (broken || !editing) return
      textArea.style.color = 'green'
      cancelButton.style.visibility = 'visible'
      saveButton.style.visibility = 'visible'
      myEditButton.style.visibility = 'collapse'
      textArea.removeAttribute('readonly')
    }
    const parseable = {
      'text/n3': true,
      'text/turtle': true,
      'application/rdf+xml': true,
      'application/xhtml+xml': true, // For RDFa?
//        'text/html': true,
//        'application/sparql-update': true,
      'application/ld+json': true
//        'application/nquads' : true,
//        'application/n-quads' : true
    }

    /** Set Caret position in a text box
    * @param {Element} elem - the element to be tweaked
    * @param {Integer} caretPos - the poisition starting at zero
    * @credit  https://stackoverflow.com/questions/512528/set-keyboard-caret-position-in-html-textbox
    */
    function setCaretPosition(elem, caretPos) {
      if(elem != null) {
        if(elem.createTextRange) {
          var range = elem.createTextRange();
          range.move('character', caretPos);
          range.select();
        } else {
          elem.focus();
          if(elem.selectionStart) {
              elem.setSelectionRange(caretPos, caretPos);
          }
        }
      }
    }

    function checkSyntax (data, contentType, base) {
      if (!parseable[contentType]) return true // don't check things we don't understand
      try {
        statusRow.innerHTML = ''
        $rdf.parse(data, kb, base, contentType)
      } catch (e) {
        statusRow.appendChild(UI.widgets.errorMessageBlock(dom, e))
        for (let cause = e; cause = cause.cause; cause) {
          if (cause.characterInFile) {
            setCaretPosition(textArea, e2.characterInFile)
          }
        }
        return false
      }
      return true
    }

    function saveBack (e) {
      const data = textArea.value
      if (!checkSyntax(data, contentType, subject.uri)) {
        setEdited() // failed to save -> differenet from web
        textArea.style.color = 'red'
        return
      }
      var options = { data, contentType }
      if (eTag) options.headers = {'if-match': eTag} // avoid overwriting changed files -> status 412
      fetcher.webOperation('PUT', subject.uri, options)
      .then(function (response) {
        if (!happy(response, 'PUT')) return
        /// @@ show edited: make save button disabled util edited again.
        setEditable()
      })
      .catch(function (err) {
        div.appendChild(UI.widgets.errorMessageBlock(dom, 'Error saving back: ' + err))
      })
    }

    function happy (response, method) {
      if (!response.ok) {
        let msg = 'HTTP error on ' + method + '! Status: ' + response.status
        console.log(msg)
        if (response.status === 412) msg = 'Error: File changed by someone else'
        statusRow.appendChild(UI.widgets.errorMessageBlock(dom, msg))
      }
      return response.ok
    }

    function refresh (event) {
      fetcher.webOperation('GET', subject.uri).then(function (response) {
        if (!happy(response, 'GET')) return
        var desc = response.responseText
        textArea.rows = desc ? desc.split('\n').length + 2 : 2
        textArea.cols = 80
        textArea.value = desc

        setUnedited()
        if (response.headers && response.headers.get('content-type')) {
          contentType = response.headers.get('content-type') // Should work but headers may be empty
          allowed = response.headers.get('allow')
          eTag = response.headers.get('etag')
        }

        let reqs = kb.each(null, kb.sym('http://www.w3.org/2007/ont/link#requestedURI'), subject.uri)
        reqs.forEach(req => {
          let rrr = kb.any(req, kb.sym('http://www.w3.org/2007/ont/link#response'))
          if (rrr) {
            contentType = kb.anyValue(rrr, UI.ns.httph('content-type'))
            allowed = kb.anyValue(rrr, UI.ns.httph('allow'))
            eTag = kb.anyValue(rrr, UI.ns.httph('etag'))
            if (!eTag) console.log('sourcePane: No eTag on GET')
          }
        })
        // contentType = response.headers['content-type'] // Not available ?!
        if (!contentType) {
          readonly = true
          broken = true
          statusRow.appendChild(UI.widgets.errorMessageBlock(dom, 'Error: No content-type available!'))
          return
        }
        console.log('       source content-type ' + contentType)
        // let allowed = response.headers['allow']
        if (!allowed) {
          console.log('@@@@@@@@@@ No Allow: header from this server')
          readonly = false // better allow just in case
        } else {
          readonly = allowed.indexOf('PUT') < 0 // In future more info re ACL allow?
        }
        textArea.readonly = readonly
      }).catch(err => {
        div.appendChild(UI.widgets.errorMessageBlock(dom, 'Error reading file: ' + err))
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

module.exports = thisPane
// ENDS
