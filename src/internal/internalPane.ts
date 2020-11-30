/*   Internal Pane
 **
 **  This outline pane contains the properties which are
 ** internal to the user's interaction with the web, and are not normally displayed
 */
/* global alert confirm */

import { icons, ns, widgets } from 'solid-ui'
import { BlankNode, IndexedFormula, literal, NamedNode, st, sym, Variable, Store } from 'rdflib'
import { PaneDefinition } from 'pane-registry'

const pane: PaneDefinition = {
  icon: icons.originalIconBase + 'tango/22-emblem-system.png',

  name: 'internal',

  audience: [ns.solid('Developer')],

  label: function () {
    return 'under the hood' // There is often a URI even of no statements
  },

  render: function (subject, context) {
    const dom = context.dom
    const store = context.session.store as Store
    const canonizedSubject = store.canon(subject) as BlankNode | NamedNode | Variable
    const types = store.findTypeURIs(canonizedSubject)

    function filter (pred: NamedNode) {
      if (types['http://www.w3.org/2007/ont/link#ProtocolEvent']) return true // display everything for them
      const view = context.session.paneRegistry.byName('internal')
      return (
        view &&
        view.predicates &&
        !!(typeof view.predicates[pred.uri] !== 'undefined')
      )
    }

    const div = dom.createElement('div')
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
          const promises = kb.each(folder, ns.ldp('contains')).map(file => {
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
                  resolve(undefined)
                })
                .catch((err: string) => {
                  const str = 'Unable to delete ' + folder + ': ' + err
                  console.log(str)
                  reject(new Error(str))
                })
              resolve(undefined)
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
        const deleteButton = widgets.deleteButtonWithCheck(
          dom,
          deleteCell,
          noun,
          function () {
            if (
              !confirm(
                `Are you sure you want to delete ${subject}? This cannot be undone.`
              )
            ) {
              return
            }
            // @@ TODO Remove casing of store.fetcher
            if (!store.fetcher) {
              throw new Error('Store has no fetcher')
            }
            const promise = isFolder
              ? (deleteRecursive(store, subject) || Promise.resolve())
              : store.fetcher.webOperation('DELETE', subject.uri) || Promise.resolve()
            promise
              .then(() => {
                const str = 'Deleted: ' + subject
                console.log(str)
              })
              .catch((err: any) => {
                const str = 'Unable to delete ' + subject + ': ' + err
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
        if (!store.fetcher) {
          throw new Error('Store has no fetcher')
        }
        store.fetcher.refresh(subject, function (
          ok,
          errm
        ) {
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

    let plist = store.statementsMatching(subject)
    let docURI = ''
    if (!store.fetcher) {
      throw new Error('Store has no fetcher')
    }

    if (subject.uri) {
      plist.push(
        st(
          subject,
          sym('http://www.w3.org/2007/ont/link#uri'),
          subject.uri as any, // @@ TODO Remove casting
          store.fetcher.appNode
        )
      )
      if (subject.uri.indexOf('#') >= 0) {
        docURI = subject.uri.split('#')[0]
        plist.push(
          st(
            subject,
            sym('http://www.w3.org/2007/ont/link#documentURI'),
            subject.uri.split('#')[0] as any, // @@ TODO Remove casting
            store.fetcher.appNode
          )
        )
        plist.push(
          st(
            subject,
            sym('http://www.w3.org/2007/ont/link#document'),
            sym(subject.uri.split('#')[0]),
            store.fetcher.appNode
          )
        )
      } else {
        docURI = subject.uri
      }
    }
    if (docURI) {
      if (!store.updater) {
        throw new Error('Store has no updater')
      }

      const ed = store.updater.editable(docURI)
      if (ed) {
        plist.push(
          st(
            subject,
            sym('http://www.w3.org/ns/rww#editable'),
            literal(ed.toString()),
            store.fetcher.appNode
          )
        )
      }
    }
    // @@ TODO get a proper type
    const outliner: any = context.getOutliner(dom)
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
