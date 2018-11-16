/*   Folder pane
**
**  This outline pane lists the members of a folder
*/

var UI = require('solid-ui')
var panes = require('./paneRegistry')

var ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_973694_expanded.svg',

  name: 'folder',

  // Create a new folder in a Solid system,
  mintNew: function (newPaneOptions) {
    var kb = UI.store
    var newInstance = newPaneOptions.newInstance || kb.sym(newPaneOptions.newBase)
    var u = newInstance.uri
    if (u.endsWith('/')) {
      u = u.slice(0, -1) // chop off trailer
    }// { throw new Error('URI of new folder must end in "/" :' + u) }
    newPaneOptions.newInstance = kb.sym(u + '/')

    // @@@@ kludge until we can get the solid-client version working
    // Force the folder by saving a dummy file inside it
    return kb.fetcher.webOperation('PUT', newInstance.uri + '.dummy')
      .then(function () {
        console.log('New folder created: ' + newInstance.uri)

        return kb.fetcher.delete(newInstance.uri + '.dummy')
      })
      .then(function () {
        console.log('Dummy file deleted : ' + newInstance.uri + '.dummy')
/*
        return kb.fetcher.createContainer(parentURI, folderName) // Not BOTH ways
      })
      .then(function () {
*/
        console.log('New container created: ' + newInstance.uri)
        return newPaneOptions
      })
  },

  label: function (subject) {
    var kb = UI.store
    var n = kb.each(subject, ns.ldp('contains')).length
    if (n > 0) {
      return 'Contents (' + n + ')' // Show how many in hover text
    }
    if (kb.holds(subject, ns.rdf('type'), ns.ldp('Container'))) { // It is declared as being a container
      return 'Container (0)'
    }
    return null // Suppress pane otherwise
  },

  // Render a file folder in a LDP/solid system

  render: function (subject, dom) {
    var outliner = panes.getOutliner(dom)
    var kb = UI.store
    var mainTable // This is a live synced table
/*
    var complain = function complain (message, color) {
      var pre = dom.createElement('pre')
      console.log(message)
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
*/
    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute('style', '  border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em ')

    // If this is an LDP container just list the directory

    var noHiddenFiles = function (obj) { // @@ This hiddenness should actually be server defined
      var pathEnd = obj.uri.slice(obj.dir().uri.length)
      return !(pathEnd.startsWith('.') || pathEnd.endsWith('.acl') || pathEnd.endsWith('~'))
    }
    let thisDir = subject.uri.endsWith('/') ? subject.uri : subject.uri + '/'
    let indexThing = kb.sym(thisDir + 'index.ttl#this')
    if (kb.holds(subject, ns.ldp('contains'), indexThing.doc())) {
      console.log('View of folder with be view of indexThing. Loading ' + indexThing)
      let packageDiv = div.appendChild(dom.createElement('div'))
      packageDiv.style.cssText = 'border-top: 0.2em solid #ccc;' // Separate folder views above from package views below
      kb.fetcher.load(indexThing.doc()).then(function () {
        mainTable = packageDiv.appendChild(dom.createElement('table'))
        panes.getOutliner(dom).GotoSubject(indexThing, true, undefined, false, undefined, mainTable)
      })

      return div
    } else {
      mainTable = div.appendChild(dom.createElement('table'))
      var refresh = function () {
        var objs = kb.each(subject, ns.ldp('contains')).filter(noHiddenFiles)
        objs = objs.map(obj => [ UI.utils.label(obj).toLowerCase(), obj ])
        objs.sort() // Sort by label case-insensitive
        objs = objs.map(pair => pair[1])
        UI.utils.syncTableToArray(mainTable, objs, function (obj) {
          let st = kb.statementsMatching(subject, ns.ldp('contains'), obj)[0]
          let defaultpropview = outliner.VIEWAS_boring_default
          let tr = outliner.propertyTR(dom,
            st, false)
          tr.firstChild.textContent = '' // Was initialized to 'Contains'
          tr.firstChild.style.cssText += 'min-width: 3em;'
          tr.appendChild(outliner.outlineObjectTD(obj, defaultpropview, undefined, st))
          // UI.widgets.makeDraggable(tr, obj)
          return tr
        })
      }
      mainTable.refresh = refresh
      refresh()
    }

    // Allow user to create new things within the folder
    var creationDiv = div.appendChild(dom.createElement('div'))
    var me = UI.authn.currentUser()
    var creationContext = {folder: subject, div: creationDiv, dom: dom, statusArea: creationDiv, me: me}
    creationContext.refreshTarget = mainTable
    UI.create.newThingUI(creationContext, panes) // Have to pass panes down  newUI

    // /////////// Allow new file to be Uploaded
    var droppedFileHandler = function (files) {
      UI.widgets.uploadFiles(kb.fetcher, files, subject.uri, subject.uri, function (file, uri) {
        // A file has been uploaded
        let destination = kb.sym(uri)
        console.log(' Upload: put OK: ' + destination)
        kb.add(subject, ns.ldp('contains'), destination, subject.doc())
        mainTable.refresh()
      })
    }

    UI.aclControl.preventBrowserDropEvents(dom)

    const explictDropIcon = false
    var target
    if (explictDropIcon) {
      let iconStyleFound = creationDiv.firstChild.style.cssText
      target = creationDiv.insertBefore(dom.createElement('img'), creationDiv.firstChild)
      target.style.cssText = iconStyleFound
      target.setAttribute('src', UI.icons.iconBase + 'noun_748003.svg')
      target.setAttribute('style', 'width: 2em; height: 2em') // Safari says target.style is read-only
    } else {
      target = creationDiv.firstChild // Overload drop target semantics onto the plus sign
    }

    UI.widgets.makeDropTarget(target, null, droppedFileHandler)

    return div
  }
}
// ends
