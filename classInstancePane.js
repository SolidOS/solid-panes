/*   Class member Pane, Folder pane
**
**  This outline pane lists the members of a class
*/

var UI = require('solid-ui')
//var Solid = require('solid-client')

var ns = UI.ns

module.exports = {
  icon: UI.icons.originalIconBase + 'tango/22-folder-open.png',

  name: 'classInstance',

  // Create a new folder in a Solid system,
  //
  mintNew: function(newPaneOptions){
    var kb = UI.store, updater = kb.updater
    var newInstance = newPaneOptions.newInstance
    var u = newInstance.uri
    if (!u.endsWith('/')) throw new Error('URI of new folder must end in "/" :' + u)
    u = u.slice(0,-1) // chop off trailer

    var parentURI = newInstance.dir().uri // ends in /
    var slash = u.lastIndexOf('/')
    var folderName = u.slice(slash + 1)

    // @@@@ kludge until we can get the solid-client version working
    // Force the folder by saving a dummy file insie it
    return new Promise(function(resolve, reject){
      kb.fetcher.webOperation('PUT', newInstance.uri + ".dummy").then(function(xhr){
        console.log('New folder created: ' + newInstance.uri)
        kb.fetcher.webOperation('DELETE', newInstance.uri + ".dummy").then(function(xhr){
          console.log('Dummy file deleted : ' + newInstance.uri + ".dummy")
          resolve(newPaneOptions)
        }).catch(function(e){
          reject(e)
        })
      }).catch(function(e){
        reject(e)
      })
    }) // Promise

    return new Promise(function(resolve, reject){
      UI.solid.web.createContainer(parentURI, folderName).then(function(xhr){
        console.log('New container created: ' + newInstance.uri)
        resolve(newPaneOptions)
      }).catch(function(e){
        reject(e)
      })
    })
  },

  label: function (subject) {
    var n = UI.store.each(
      undefined, ns.rdf('type'), subject).length
    if (n > 0) return 'List (' + n + ')' // Show how many in hover text
    n = UI.store.each(
      subject, ns.ldp('contains')).length
    if (n > 0) {
      return 'Contents (' + n + ')' // Show how many in hover text
    }
    return null // Suppress pane otherwise
  },

  render: function (subject, dom) {
    var outliner = UI.panes.getOutliner(dom)
    var kb = UI.store
    var complain = function complain (message, color) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute('style', '  border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em ')

    // If this is an LDP container just list the directory
    var noHiddenFiles = function (st) {
      var lastbit = st.object.uri.slice(st.object.dir().length + 1)
      return !(lastbit.length && lastbit[0] === '.' || lastbit.slice(-3) === '.acl')
    }
    var contentsStatements = kb.statementsMatching(subject, ns.ldp('contains'))
    if (contentsStatements.length) {
      // complain("Contents:", 'white'); // filter out hidden files?
      outliner.appendPropertyTRs(div, contentsStatements, false, function (pred) {return true;})
    }

    // If this is a class, look for all both explicit and implicit
    var sts = kb.statementsMatching(undefined, ns.rdf('type'), subject)
    if (sts.length > 0) {
      var already = {}, more = []
      sts.map(function (st) {already[st.subject.toNT()] = st})
      for (var nt in kb.findMembersNT(subject)) if (!already[nt])
          more.push($rdf.st(kb.fromNT(nt), ns.rdf('type'), subject)); // @@ no provenence
      if (more.length) complain('There are ' + sts.length + ' explicit and ' +
          more.length + ' implicit members of ' + UI.utils.label(subject))
      if (subject.sameTerm(ns.rdf('Property'))) {
        // / Do not find all properties used as properties .. unlesss look at kb index
      } else if (subject.sameTerm(ns.rdfs('Class'))) {
        var uses = kb.statementsMatching(undefined, ns.rdf('type'), undefined)
        var usedTypes = {}
        uses.map(function (st) {usedTypes[st.object] = st}) // Get unique
        var used = []
        for (var i in usedTypes) {
          used.push($rdf.st(
            $rdf.sym(i), ns.rdf('type'), ns.rdfs('Class')))
        }
        complain('Total of ' + uses.length + ' type statments and ' + used.length + ' unique types.')
      }

      if (sts.length > 10) {
        var tr = dom.createElement('TR')
        tr.appendChild(dom.createTextNode('' + sts.length))
        // tr.AJAR_statement=sts[i]
        div.appendChild(tr)
      }

      outliner.appendPropertyTRs(div, sts, true, function (pred) {return true;})

      if (more.length) {
        complain('Implcit:')
        outliner.appendPropertyTRs(div, more, true, function (pred) {return true;})
      }
    }

    ///////////// Allow new file to be Uploaded
    var droppedFileHandler = function (files) {
      for (var i = 0, f; f = files[i]; i++) {
        console.log(' folder: dropped filename: ' + f.name + ', type: ' + (f.type || 'n/a') +
          ' size: ' + f.size + ' bytes, last modified: ' +
          (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a')
        );

        var reader = new FileReader()
        reader.onload = (function (theFile) {
          return function (e) {
            var data = e.target.result
            console.log(' File read byteLength : ' + data.byteLength)
            if (!subject.uri.endsWith('/')){
              console.log("FAIL: - folder name should end in /")
              return
            }
            // Check it does not already exist
            var destination = kb.sym(subject.uri + theFile.name)
            if (kb.holds(subject, ns.ldp('contains'), destination)) {
              alert("Sorry, " + subject.uri + " already has something called " + theFile.name)
              console.log("Drag-drop upload aborted: resource already exists: " + destination)
              return
            }
            UI.store.fetcher.webOperation('PUT', destination, { data: data, contentType: theFile.type}).then(function (xhr) {
              console.log(' Upload: put OK: ' + destination)
              // @@ Restore the target style
              // @@ refresh the display from the container!
            }).catch(function (status) {
              console.log(' Upload: FAIL ' + destination + ', Error: ' + status)
            })
          }
        })(f)
        reader.readAsArrayBuffer(f)
      }
    }


    UI.aclControl.preventBrowserDropEvents(dom)

    var target = div.appendChild(dom.createElement('img'))
    target.setAttribute('src', UI.icons.iconBase + 'noun_25830.svg')
    target.style = 'width: 2em; height: 2em'

    UI.widgets.makeDropTarget(target, null, droppedFileHandler)

    return div
  }
}

// ends
