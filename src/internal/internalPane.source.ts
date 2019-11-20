/*   Internal Pane
 **
 **  This outline pane contains the properties which are
 ** internal to the user's interaction with the web, and are not normally displayed
 */
/* global alert confirm */

import { PaneDefinition } from '../types'
import { icons, ns, store, widgets } from 'solid-ui'
import panes from 'pane-registry'
import { IndexedFormula, NamedNode } from 'rdflib'

const pane: PaneDefinition = {
  icon: icons.originalIconBase + 'tango/22-emblem-system.png',

  name: 'internal',

  audience: [ns.solid('Developer')],

  label: function () {
    return 'under the hood' // There is often a URI even of no statements
  },

  render: function (subject, dom) {
    subject = store.canon(subject)
    var types = store.findTypeURIs(subject)

    function filter (pred: NamedNode) {
      if (types['http://www.w3.org/2007/ont/link#ProtocolEvent']) return true // display everything for them
      return !!(
        typeof (panes as any).internal.predicates[pred.uri] !== 'undefined'
      )
    }

    var div = dom.createElement('div')
    div.setAttribute('class', 'internalPane')
    div.setAttribute(
      'style',
      'background-color: #ddddff; padding: 0.5em; border-radius: 1em;'
    )

    function deleteRecursive (kb: IndexedFormula, folder: NamedNode) {
      const fetcher = (kb as any).fetcher
      if (!fetcher) {
        console.error('No fetcher available')
        return
      }
      return new Promise(function (resolve, reject) {
        fetcher.load(folder).then(function () {
          let promises = kb.each(folder, ns.ldp('contains')).map(file => {
            if (kb.holds(file, ns.rdf('type'), ns.ldp('BasicContainer'))) {
              return deleteRecursive(kb, file as NamedNode)
            } else {
              console.log('deleteRecursive leaf file: ' + file)
              return fetcher.webOperation('DELETE', (file as NamedNode).uri)
            }
          })
          Promise.all(promises).then(
            () => {
              console.log('deleteRecursive empty folder: ' + folder)
              fetcher
                .webOperation('DELETE', folder.uri)
                .then(() => {
                  console.log('Deleted Ok: ' + folder)
                  resolve()
                })
                .catch((err: string) => {
                  var str = 'Unable to delete ' + folder + ': ' + err
                  console.log(str)
                  reject(new Error(str))
                })
              resolve()
            },
            err => {
              alert(err)
              reject(err)
            }
          )
        })
      })
    }

    const isDocument = subject.uri && !subject.uri.includes('#')
    if (isDocument) {
      const controls = div.appendChild(dom.createElement('table'))
      controls.style.width = '100%'
      controls.style.margin = '1em'
      const controlRow = controls.appendChild(dom.createElement('tr'))

      const deleteCell = controlRow.appendChild(dom.createElement('td'))
      const isFolder =
        (subject.uri && subject.uri.endsWith('/')) ||
        store.holds(subject, ns.rdf('type'), ns.ldp('Container'))
      const noun = isFolder ? 'folder' : 'file'
      if (!isProtectedUri(subject)) {
        console.log(subject)
        var deleteButton = widgets.deleteButtonWithCheck(
          dom,
          deleteCell,
          noun,
          function () {
            if (
              !confirm(
                'Are you sure you want to delete ' +
                  subject +
                  '? This cannot be undone.'
              )
            )
              return
            var promise = isFolder
              ? deleteRecursive(store, subject)
              : store.fetcher.webOperation('DELETE', subject.uri)
            promise
              .then(() => {
                var str = 'Deleted: ' + subject
                console.log(str)
              })
              .catch((err: any) => {
                var str = 'Unable to delete ' + subject + ': ' + err
                console.log(str)
                alert(str)
              })
          }
        )
        deleteButton.style = 'height: 2em;'
        deleteButton.class = '' // Remove hover hide
        deleteCell.appendChild(deleteButton)
      }

      const refreshCell = controlRow.appendChild(dom.createElement('td'))
      const refreshButton = widgets.button(
        dom,
        icons.iconBase + 'noun_479395.svg',
        'refresh'
      )
      refreshCell.appendChild(refreshButton)
      refreshButton.addEventListener('click', () => {
        store.fetcher.refresh(subject, function (ok: boolean, errm: string) {
          let str
          if (ok) {
            str = 'Refreshed OK: ' + subject
          } else {
            str = 'Error refreshing: ' + subject + ': ' + errm
          }
          console.log(str)
          alert(str)
        })
      })
    }

    var plist = store.statementsMatching(subject)
    var docURI = ''
    if (subject.uri) {
      plist.push(
        store.st(
          subject,
          store.sym('http://www.w3.org/2007/ont/link#uri'),
          subject.uri,
          store.fetcher.appNode
        )
      )
      if (subject.uri.indexOf('#') >= 0) {
        docURI = subject.uri.split('#')[0]
        plist.push(
          store.st(
            subject,
            store.sym('http://www.w3.org/2007/ont/link#documentURI'),
            subject.uri.split('#')[0],
            store.fetcher.appNode
          )
        )
        plist.push(
          store.st(
            subject,
            store.sym('http://www.w3.org/2007/ont/link#document'),
            store.sym(subject.uri.split('#')[0]),
            store.fetcher.appNode
          )
        )
      } else {
        docURI = subject.uri
      }
    }
    if (docURI) {
      var ed = store.updater.editable(docURI)
      if (ed) {
        plist.push(
          store.st(
            subject,
            store.sym('http://www.w3.org/ns/rww#editable'),
            store.literal(ed),
            store.fetcher.appNode
          )
        )
      }
    }
    var outliner = panes.getOutliner(dom)
    outliner.appendPropertyTRs(div, plist, false, filter)
    plist = store.statementsMatching(undefined, undefined, subject)
    outliner.appendPropertyTRs(div, plist, true, filter)
    return div
  },

  predicates: {
    // Predicates used for inner workings. Under the hood
    'http://www.w3.org/2007/ont/link#request': 1,
    'http://www.w3.org/2007/ont/link#requestedBy': 1,
    'http://www.w3.org/2007/ont/link#source': 1,
    'http://www.w3.org/2007/ont/link#session': 2, // 2=  test neg but display
    'http://www.w3.org/2007/ont/link#uri': 1,
    'http://www.w3.org/2007/ont/link#documentURI': 1,
    'http://www.w3.org/2007/ont/link#document': 1,
    'http://www.w3.org/2007/ont/link#all': 1, // From userinput.js
    'http://www.w3.org/2007/ont/link#Document': 1,
    'http://www.w3.org/ns/rww#editable': 1,
    'http://www.w3.org/2000/01/rdf-schema#seeAlso': 1,
    'http://www.w3.org/2002/07/owl#': 1
  },

  classes: {
    // Things which are inherently already undercover
    'http://www.w3.org/2007/ont/link#ProtocolEvent': 1
  }
}

function isProtectedUri (subject: NamedNode): boolean {
  // TODO: Could make the code below smarter by removing some of the redundancy by creating a recursive function, but did not bother now
  const siteUri = subject.site().uri
  return (
    subject.uri === siteUri ||
    subject.uri === siteUri + 'profile/' ||
    subject.uri === siteUri + 'profile/card' ||
    subject.uri === siteUri + 'settings/' ||
    subject.uri === siteUri + 'settings/prefs.ttl' ||
    subject.uri === siteUri + 'settings/privateTypeIndex.ttl' ||
    subject.uri === siteUri + 'settings/publicTypeIndex.ttl' ||
    subject.uri === siteUri + 'settings/serverSide.ttl'
  )
}

export default pane

// ends
