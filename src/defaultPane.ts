/*   Default Pane
 **
 **  This outline pane contains the properties which are
 **  normally displayed to the user. See also: internalPane
 ** This pane hides the ones considered too low-level for the normal user.
 */

import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type { BlankNode, Literal, NamedNode, Statement } from 'rdflib'
import './defaultPane.css'

const ns = UI.ns
type DefaultPaneSubject = NamedNode | BlankNode | Literal

type DefaultPaneDefinition = {
  icon: string
  name: string
  audience: NamedNode[]
  label: (subject: DefaultPaneSubject) => string
  render: (subject: DefaultPaneSubject, context: DataBrowserContext) => HTMLDivElement
}

type DefaultPaneOutliner = {
  appendPropertyTRs: (
    parent: HTMLElement,
    statements: Statement[],
    inverse: boolean,
    filter: (pred: NamedNode, inverse: boolean) => boolean
  ) => void
  UserInput: {
    addNewPredicateObject: (event: Event) => void
  }
}

export const defaultPane: DefaultPaneDefinition = {
  icon: UI.icons.originalIconBase + 'about.png',

  name: 'default',

  audience: [ns.solid('Developer')],

  label: function (_subject: DefaultPaneSubject): string {
    return 'about '
  },

  render: function (
    subject: DefaultPaneSubject,
    context: DataBrowserContext
  ): HTMLDivElement {
    const dom = context.dom

    function applyEnvironmentAttributes (element: HTMLDivElement): void {
      const environment = (context.environment ?? {}) as Partial<RenderEnvironment>
      element.dataset.layout = environment.layout ?? 'desktop'
    }

    const filter = function (pred: NamedNode, inverse: boolean): boolean {
      if (
        typeof context.session.paneRegistry.byName('internal').predicates[
          pred.uri
        ] !== 'undefined'
      ) {
        return false
      }
      if (
        inverse &&
        pred.uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      ) {
        return false
      }
      return true
    }

    const outliner = context.getOutliner(dom) as DefaultPaneOutliner
    const kb = context.session.store
    // var outline = outliner; // @@
    UI.log.info('@defaultPane.render, dom is now ' + dom.location)
    subject = kb.canon(subject) as DefaultPaneSubject
    const div = dom.createElement('div')
    div.setAttribute('class', 'defaultPane')
    applyEnvironmentAttributes(div)
    //        appendRemoveIcon(div, subject, div)

    let plist = subject.termType === 'Literal' ? [] : kb.statementsMatching(subject)
    outliner.appendPropertyTRs(div, plist, false, filter)
    plist = kb.statementsMatching(undefined, undefined, subject)
    outliner.appendPropertyTRs(div, plist, true, filter)
    const subjectStatement = subject.termType === 'BlankNode'
      ? kb.anyStatementMatching(subject)
      : undefined
    if (
      subject.termType === 'Literal' &&
      subject.value.slice(0, 7) === 'http://'
    ) {
      outliner.appendPropertyTRs(
        div,
        [$rdf.st(kb.sym(subject.value), UI.ns.link('uri'), subject)],
        true,
        filter
      )
    }
    if (
      (subject.termType === 'NamedNode' &&
        kb.updater.editable($rdf.Util.uri.docpart(subject.uri), kb)) ||
      (subject.termType === 'BlankNode' &&
        subjectStatement &&
        subjectStatement.why &&
        'uri' in subjectStatement.why &&
        typeof subjectStatement.why.uri === 'string' &&
        kb.updater.editable(subjectStatement.why.uri))
      // check the document containing something about of the bnode @@ what about as object?
      /*  ! && HCIoptions["bottom insert highlights"].enabled  */
    ) {
      const holdingTr = dom.createElement('tr') // these are to minimize required changes
      const holdingTd = dom.createElement('td') // in userinput.js
      holdingTd.setAttribute('colspan', '2')
      holdingTd.setAttribute('notSelectable', 'true')
      const img = dom.createElement('img')
      img.src = UI.icons.originalIconBase + 'tango/22-list-add-new.png'
      img.addEventListener('click', function addNewTripleIconMouseDownListener (
        e
      ) {
        outliner.UserInput.addNewPredicateObject(e)
        e.stopPropagation()
        e.preventDefault()
      })
      img.className = 'bottom-border-active'
      // img.addEventListener('click', thisOutline.UserInput.addNewPredicateObject,false)
      div
        .appendChild(holdingTr)
        .appendChild(holdingTd)
        .appendChild(img)
    }
    return div
  }
}

// ends
