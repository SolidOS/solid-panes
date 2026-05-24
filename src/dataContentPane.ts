/*      Data content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource.
 */

// To do:  - Only take data from one graph
//         - Only do forwards not backward?
//         - Expand automatically all the way down
//         - original source view?  Use ffox view source

import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import DOMPurify from 'dompurify'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type {
  BlankNode,
  Formula,
  NamedNode,
  Statement
} from 'rdflib'
import './dataContentPane.css'

const ns = UI.ns

type SubjectTerm = NamedNode | BlankNode
type ObjectTerm = Statement['object'] | Formula

type RootSubjectsResult = {
  roots: SubjectTerm[]
  subjects: Record<string, Statement[]>
  loopBreakers?: Record<string, unknown>
}

type DataContentPaneLike = {
  statementsAsTables: (
    sts: Statement[],
    context: DataBrowserContext,
    initialRoots?: SubjectTerm[]
  ) => HTMLTableElement
}

export const dataContentPane = {
  icon: UI.icons.originalIconBase + 'rdf_flyer.24.gif',

  name: 'dataContents',

  audience: [ns.solid('Developer')],

  label: function (subject: NamedNode, context: DataBrowserContext) {
    if (
      'http://www.w3.org/2007/ont/link#ProtocolEvent' in
      context.session.store.findTypeURIs(subject)
    ) {
      return null
    }
    const n = context.session.store.statementsMatching(
      undefined,
      undefined,
      undefined,
      subject
    ).length
    if (n === 0) return null
    return 'Data (' + n + ')'
  },
  /*
  shouldGetFocus: function(subject) {
      return store.whether(subject, UI.ns.rdf('type'), UI.ns.link('RDFDocument'))
  },
*/
  statementsAsTables: function statementsAsTables (
    sts: Statement[],
    context: DataBrowserContext,
    initialRoots?: SubjectTerm[]
  ): HTMLTableElement {
    const myDocument = context.dom
    // const outliner = context.getOutliner(myDocument)
    const rep = myDocument.createElement('table')
    rep.classList.add('data-content-pane__table', 'data-content-pane__table--root')
    const isMobileLayout = context.environment?.layout === 'mobile'
    const sz = $rdf.Serializer(context.session.store)
    const res = sz.rootSubjects(sts) as RootSubjectsResult
    let roots = res.roots
    const subjects = res.subjects
    const loopBreakers = res.loopBreakers ?? {}
    for (const x in loopBreakers) {
      console.log('\tdataContentPane: loopbreaker:' + x)
    }
    const doneBnodes: Record<string, true | HTMLTableElement> = {}
    const referencedBnodes: Record<string, true> = {}

    function propertyTree (
      subject: SubjectTerm,
      nestingLevel = 0
    ): HTMLTableElement {
      const rep = myDocument.createElement('table')
      rep.classList.add('data-content-pane__table', 'data-content-pane__table--property')
      let lastPred: string | null = null
      const subjectStatements = subjects[sz.toStr(subject)]
      if (!subjectStatements) {
        rep.appendChild(myDocument.createTextNode('...'))
        return rep
      }
      subjectStatements.sort()
      let same = 0
      let predicateTD: HTMLTableCellElement | undefined
      for (let i = 0; i < subjectStatements.length; i++) {
        const st = subjectStatements[i]
        const tr = myDocument.createElement('tr')
        tr.classList.add('data-content-pane__row--top-aligned', 'data-content-pane__row--property')
        if (st.predicate.uri !== lastPred || isMobileLayout) {
          if (!isMobileLayout && lastPred && same > 1) {
            predicateTD?.setAttribute('rowspan', '' + same)
          }
          predicateTD = myDocument.createElement('td')
          predicateTD.setAttribute('class', 'data-content-pane__predicate-cell')
          const anchor = myDocument.createElement('a')
          anchor.setAttribute('href', st.predicate.uri)
          anchor.addEventListener(
            'click',
            UI.widgets.openHrefInOutlineMode,
            true
          )
          anchor.appendChild(
            myDocument.createTextNode(
              UI.utils.predicateLabelForXML(st.predicate)
            )
          )
          predicateTD.appendChild(anchor)
          tr.appendChild(predicateTD)
          lastPred = st.predicate.uri
          same = 0
        }
        same++
        const objectTD = myDocument.createElement('td')
        objectTD.classList.add('data-content-pane__value-cell')
        objectTD.appendChild(objectTree(st.object, nestingLevel + 1))
        tr.appendChild(objectTD)
        rep.appendChild(tr)
      }
      if (!isMobileLayout && lastPred && same > 1) {
        predicateTD?.setAttribute('rowspan', '' + same)
      }
      return rep
    }

    function objectTree (obj: ObjectTerm, nestingLevel = 0): Node {
      let res: HTMLElement | HTMLTableElement | Text
      let anchor: HTMLAnchorElement
      switch (obj.termType) {
        case 'NamedNode':
          anchor = myDocument.createElement('a')
          anchor.setAttribute('href', obj.uri)
          anchor.addEventListener(
            'click',
            UI.widgets.openHrefInOutlineMode,
            true
          )
          anchor.appendChild(myDocument.createTextNode(UI.utils.label(obj)))
          return anchor

        case 'Literal':
          if (!obj.datatype || !obj.datatype.uri) {
            res = myDocument.createElement('div')
            res.classList.add('data-content-pane__literal')
            res.textContent = obj.value
            return res
          } else if (
            obj.datatype.uri ===
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral'
          ) {
            res = myDocument.createElement('div')
            res.classList.add('embeddedXHTML')
            res.innerHTML = DOMPurify.sanitize(obj.value)
            return res
          }
          return myDocument.createTextNode(obj.value)

        case 'BlankNode': {
          if (obj.toNT() in doneBnodes) {
            referencedBnodes[obj.toNT()] = true
            const referenceAnchor = myDocument.createElement('a')
            referenceAnchor.setAttribute('href', '#' + obj.toNT().slice(2))
            referenceAnchor.setAttribute('class', 'bnodeRef')
            referenceAnchor.textContent = '*' + obj.toNT().slice(3)
            return referenceAnchor
          }
          doneBnodes[obj.toNT()] = true
          const newTable = propertyTree(obj, nestingLevel)
          doneBnodes[obj.toNT()] = newTable
          if (nestingLevel % 2 === 1) {
            newTable.classList.add('data-content-pane__nested-table--light')
          } else {
            newTable.classList.add('data-content-pane__nested-table--dark')
          }
          return newTable
        }

        case 'Collection':
          res = myDocument.createElement('table')
          res.setAttribute('class', 'collectionAsTables')
          for (let i = 0; i < obj.elements.length; i++) {
            const tr = myDocument.createElement('tr')
            res.appendChild(tr)
            tr.appendChild(objectTree(obj.elements[i] as ObjectTerm, nestingLevel + 1))
          }
          return res

        case 'Graph':
          res = (context.session.paneRegistry
            .byName('dataContents') as DataContentPaneLike)
            .statementsAsTables(obj.statements, context)
          res.setAttribute('class', 'data-content-pane__nested-formula')
          return res

        case 'Variable':
          return myDocument.createTextNode('?' + obj.uri)
      }
      throw new Error('Unhandled node type: ' + obj.termType)
    }

    if (initialRoots) {
      roots = initialRoots.concat(
        roots.filter(function (x: SubjectTerm) {
          for (let i = 0; i < initialRoots.length; i++) {
            if (x.sameTerm(initialRoots[i])) return false
          }
          return true
        })
      )
    }
    for (let i = 0; i < roots.length; i++) {
      const tr = myDocument.createElement('tr')
      tr.classList.add(
        i % 2 === 0 ? 'data-content-pane__row--even' : 'data-content-pane__row--odd',
        'data-content-pane__row--root'
      )
      rep.appendChild(tr)
      const subjectTD = myDocument.createElement('td')
      subjectTD.classList.add('data-content-pane__subject-cell')
      tr.appendChild(subjectTD)
      const TDTree = myDocument.createElement('td')
      TDTree.classList.add('data-content-pane__details-cell')
      tr.appendChild(TDTree)
      const root = roots[i]
      if (root.termType === 'BlankNode') {
        subjectTD.appendChild(myDocument.createTextNode(UI.utils.label(root)))
      } else {
        subjectTD.appendChild(objectTree(root, 0))
      }
      TDTree.appendChild(propertyTree(root, 0))
    }
    for (const bNT in referencedBnodes) {
      const table = doneBnodes[bNT]
      if (table === true) continue
      const anchor = myDocument.createElement('a')
      anchor.setAttribute('id', bNT.slice(2))
      anchor.setAttribute('class', 'bnodeDef')
      anchor.textContent = bNT.slice(3) + ')'
      table.insertBefore(anchor, table.firstChild)
    }
    return rep
  },

  render: function (
    subject: NamedNode,
    context: DataBrowserContext
  ): HTMLDivElement {
    const myDocument = context.dom

    function applyEnvironmentAttributes (element: HTMLDivElement): void {
      const environment = (context.environment ?? {}) as Partial<RenderEnvironment>
      element.dataset.layout = environment.layout ?? 'desktop'
      element.dataset.theme = environment.theme ?? 'light'
      element.dataset.inputMode = environment.inputMode ?? 'pointer'
    }

    function mainRendering () {
      const kb = context.session.store
      const sts = kb.statementsMatching(undefined, undefined, undefined, subject)
      const initialRoots: SubjectTerm[] = []
      if (kb.holds(subject, undefined, undefined, subject)) {
        initialRoots.push(subject)
      }
      const ps = kb.any(subject, UI.ns.foaf('primaryTopic'), undefined, subject)
      if (ps && (ps.termType === 'NamedNode' || ps.termType === 'BlankNode')) {
        initialRoots.push(ps as SubjectTerm)
      }

      div.appendChild(
        context.session.paneRegistry
          .byName('dataContents')
          .statementsAsTables(sts, context, initialRoots)
      )
    }

    const div = myDocument.createElement('div')
    div.classList.add('dataContentPane', 'data-content-pane')
    applyEnvironmentAttributes(div)

    mainRendering()
    return div
  }
}
