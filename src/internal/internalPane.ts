/*   Internal Pane
 **
 **  This outline pane contains the properties which are
 ** internal to the user's interaction with the web, and are not normally displayed
 */
import { solidLogicSingleton } from 'solid-logic'
import { icons, ns, widgets } from 'solid-ui'
import { BlankNode, literal, NamedNode, st, sym, Variable, Store } from 'rdflib'
import { PaneDefinition } from 'pane-registry'
import './internalPane.css'
import '../components/resource-action-dialog/ResourceActionDialog'
import type ResourceActionDialog from '../components/resource-action-dialog/ResourceActionDialog'

const pane: PaneDefinition = {
  icon: icons.originalIconBase + 'tango/22-emblem-system.png',

  name: 'internal',

  label: function () {
    return 'Under The Hood' // There is often a URI even of no statements
  },

  render: function (subject, context) {
    const dom = context.dom
    // @ts-ignore
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
    div.classList.add('internalPane', 'internalPaneContent')

    function showMessage (title: string, message: string) {
      const dialog = dom.createElement('solid-panes-resource-action-dialog') as ResourceActionDialog
      dialog.title = title
      dialog.message = message
      dialog.confirmation = false
      dialog.open()
      dom.body?.appendChild(dialog)
    }

    function confirmDeletion (message: string): Promise<boolean> {
      const dialog = dom.createElement('solid-panes-resource-action-dialog') as ResourceActionDialog
      dialog.title = 'Delete resource'
      dialog.message = message
      dialog.confirmation = true
      const result = dialog.open()
      dom.body?.appendChild(dialog)
      return result
    }

    const isDocument = subject.uri && !subject.uri.includes('#')
    if (isDocument) {
      const controls = div.appendChild(dom.createElement('table'))
      controls.classList.add('internalPaneControls')
      const controlRow = controls.appendChild(dom.createElement('tr'))

      const deleteCell = controlRow.appendChild(dom.createElement('td'))
      const isFolder =
        (subject.uri && subject.uri.endsWith('/')) ||
        store.holds(subject, ns.rdf('type'), ns.ldp('Container'))
      const noun = isFolder ? 'folder' : 'file'
      if (!isProtectedUri(subject)) {
        let deletionPending = false
        const deleteButton = widgets.button(
          dom,
          icons.iconBase + 'noun_2188_red.svg',
          'Remove this ' + noun,
          () => {
            if (deletionPending) return
            return confirmDeletion(`Are you sure you want to delete ${subject}? This cannot be undone.`)
              .then(confirmed => {
                if (!confirmed) return
                deletionPending = true
                deleteButton.disabled = true
                const resourceLogic = context.session.logic?.resource || solidLogicSingleton.resource
                return resourceLogic.recursiveDelete(subject)
                  .then(() => {
                    const str = 'Deleted: ' + subject
                    console.log(str)
                    showMessage('Resource deleted', str)
                    dom.dispatchEvent(new CustomEvent('solid-resource-deleted', {
                      detail: { resource: subject }
                    }))
                  })
                  .catch((err: unknown) => {
                    const str = 'Unable to delete ' + subject + ': ' + (err instanceof Error ? err.message : String(err))
                    console.log(str)
                    showMessage('Unable to delete resource', str)
                  })
                  .finally(() => {
                    deletionPending = false
                    deleteButton.disabled = false
                  })
              })
          }
        )

        deleteButton.classList.add('internalPaneDeleteButton')
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
          showMessage(ok ? 'Resource refreshed' : 'Unable to refresh resource', str)
        })
      })
    }

    // rdflib returns its live subject index; display-only statements must not enter it.
    let plist = store.statementsMatching(subject).slice()
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
