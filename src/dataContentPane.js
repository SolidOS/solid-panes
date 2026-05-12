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

const ns = UI.ns

export const dataContentPane = {
  icon: UI.icons.originalIconBase + 'rdf_flyer.24.gif',

  name: 'dataContents',

  audience: [ns.solid('Developer')],

  label: function (subject, context) {
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
  statementsAsTables: function statementsAsTables (sts, context, initialRoots) {
    const myDocument = context.dom
    // const outliner = context.getOutliner(myDocument)
    // The outer container groups one block per "root" subject. Each block holds
    // a subject label and a <dl class="property-list"> of its predicates/values.
    const rep = myDocument.createElement('section')
    rep.classList.add('data-content')
    const sz = $rdf.Serializer(context.session.store)
    const res = sz.rootSubjects(sts)
    let roots = res.roots
    const subjects = res.subjects
    const loopBreakers = res.loopBreakers
    for (const x in loopBreakers) {
      console.log('\tdataContentPane: loopbreaker:' + x)
    }
    const doneBnodes = {} // For preventing looping
    const referencedBnodes = {} // Bnodes which need to be named alas

    // The property tree for a single subject or anonymous node. Returns a
    // <dl class="property-list"> with one <dt> per predicate followed by one
    // <dd> per value. Replaces the previous <table>/<tr>/<td> with rowspan.
    function propertyTree (subject) {
      const rep = myDocument.createElement('dl')
      rep.classList.add('property-list')
      let lastPred = null
      const sts = subjects[sz.toStr(subject)] // relevant statements
      if (!sts) {
        // No statements in tree
        rep.appendChild(myDocument.createTextNode('...')) // just empty bnode as object
        return rep
      }
      sts.sort()
      for (const st of sts) {
        if (st.predicate.uri !== lastPred) {
          const dt = myDocument.createElement('dt')
          dt.classList.add('pred')
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
          dt.appendChild(anchor)
          rep.appendChild(dt)
          lastPred = st.predicate.uri
        }
        const dd = myDocument.createElement('dd')
        dd.classList.add('obj')
        dd.appendChild(objectTree(st.object))
        rep.appendChild(dd)
      }
      return rep
    }

    // Convert a set of statements into a nested tree of tables
    function objectTree (obj) {
      let res, anchor
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
            res.setAttribute('style', 'white-space: pre-wrap;')
            res.textContent = obj.value
            return res
          } else if (
            obj.datatype.uri ===
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral'
          ) {
            res = myDocument.createElement('div')
            res.setAttribute('class', 'embeddedXHTML')
            res.innerHTML = obj.value // Try that  @@@ beware embedded dangerous code
            return res
          }
          return myDocument.createTextNode(obj.value) // placeholder - could be smarter,

        case 'BlankNode': {
          if (obj.toNT() in doneBnodes) {
            // Break infinite recursion
            referencedBnodes[obj.toNT()] = true
            const anchor = myDocument.createElement('a')
            anchor.setAttribute('href', '#' + obj.toNT().slice(2))
            anchor.setAttribute('class', 'bnodeRef')
            anchor.textContent = '*' + obj.toNT().slice(3)
            return anchor
          }
          doneBnodes[obj.toNT()] = true // Flag to prevent infinite recursion in propertyTree
          const newTree = propertyTree(obj)
          newTree.classList.add('nestedBnode')
          doneBnodes[obj.toNT()] = newTree // Track where we mentioned it first
          return newTree
        }
        case 'Collection':
          // rdf:List → semantic ordered list with browser-provided numbering.
          res = myDocument.createElement('ol')
          res.classList.add('rdf-collection')
          for (const elt of obj.elements) {
            const li = myDocument.createElement('li')
            li.appendChild(objectTree(elt))
            res.appendChild(li)
          }
          return res
        case 'Graph':
          res = context.session.paneRegistry
            .byName('dataContents')
            .statementsAsTables(obj.statements, context)
          res.setAttribute('class', 'nestedFormula')
          return res
        case 'Variable':
          res = myDocument.createTextNode('?' + obj.uri)
          return res
      }
      throw new Error('Unhandled node type: ' + obj.termType)
    }

    // roots.sort()

    if (initialRoots) {
      roots = initialRoots.concat(
        roots.filter(function (x) {
          for (let i = 0; i < initialRoots.length; i++) {
            // Max 2
            if (x.sameTerm(initialRoots[i])) return false
          }
          return true
        })
      )
    }
    for (let i = 0; i < roots.length; i++) {
      const subjBlock = myDocument.createElement('section')
      subjBlock.classList.add('data-content__subject')
      // Alternating background as visual separator (was previously row striping).
      if (i % 2 === 0) subjBlock.classList.add('data-content__subject--even')
      rep.appendChild(subjBlock)

      const subjLabel = myDocument.createElement('div')
      subjLabel.classList.add('data-content__subject-label')
      const root = roots[i]
      if (root.termType === 'BlankNode') {
        subjLabel.appendChild(myDocument.createTextNode(UI.utils.label(root))) // Don't recurse!
      } else {
        subjLabel.appendChild(objectTree(root)) // won't have tree
      }
      subjBlock.appendChild(subjLabel)
      subjBlock.appendChild(propertyTree(root))
    }
    for (const bNT in referencedBnodes) {
      // Add number to refer to
      const table = doneBnodes[bNT]
      // let tr = myDocument.createElement('tr')
      const anchor = myDocument.createElement('a')
      anchor.setAttribute('id', bNT.slice(2))
      anchor.setAttribute('class', 'bnodeDef')
      anchor.textContent = bNT.slice(3) + ')'
      table.insertBefore(anchor, table.firstChild)
    }
    return rep
  }, // statementsAsTables
  // View the data in a file in user-friendly way
  render: function (subject, context) {
    const myDocument = context.dom

    function alternativeRendering () {
      const sz = $rdf.Serializer(context.session.store)
      const res = sz.rootSubjects(sts)
      const roots = res.roots
      const p = {}
      p.render = function (s2) {
        const div = myDocument.createElement('div')
        div.setAttribute('class', 'withinDocumentPane')
        const plist = kb.statementsMatching(s2, undefined, undefined, subject)
        outliner.appendPropertyTRs(div, plist, false, function (
          _pred,
          _inverse
        ) {
          return true
        })
        return div
      }
      for (let i = 0; i < roots.length; i++) {
        const tr = myDocument.createElement('TR')
        const root = roots[i]
        tr.style.verticalAlign = 'top'
        const td = outliner.outlineObjectTD(root, undefined, tr)
        tr.appendChild(td)
        div.appendChild(tr)
        outliner.outlineExpand(td, root, { pane: p })
      }
    }

    function mainRendering () {
      const initialRoots = [] // Ordering: start with stuff about this doc
      if (kb.holds(subject, undefined, undefined, subject)) {
        initialRoots.push(subject)
      }
      // Then about the primary topic of the document if any
      const ps = kb.any(subject, UI.ns.foaf('primaryTopic'), undefined, subject)
      if (ps) initialRoots.push(ps)
      div.appendChild(
        context.session.paneRegistry
          .byName('dataContents')
          .statementsAsTables(sts, context, initialRoots)
      )
    }

    const outliner = context.getOutliner(myDocument)
    const kb = context.session.store
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'dataContentPane')
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    const sts = kb.statementsMatching(undefined, undefined, undefined, subject) // @@ slow with current store!

    // eslint-disable-next-line no-constant-condition
    if (false) { // keep code
      alternativeRendering()
    } else {
      mainRendering()
    }
    return div
  }
}
