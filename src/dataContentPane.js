/*      Data content Pane
 **
 **  This pane shows the content of a particular RDF resource
 ** or at least the RDF semantics we attribute to that resource.
 */

// To do:  - Only take data from one graph
//         - Only do forwards not backward?
//         - Expand automatically all the way down
//         - original source view?  Use ffox view source

const UI = require('solid-ui')
const $rdf = require('rdflib')
const ns = UI.ns

module.exports = {
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
      return UI.store.whether(subject, UI.ns.rdf('type'), UI.ns.link('RDFDocument'))
  },
*/
  statementsAsTables: function statementsAsTables (sts, context, initialRoots) {
    const myDocument = context.dom
    // var outliner = context.getOutliner(myDocument)
    const rep = myDocument.createElement('table')
    const sz = UI.rdf.Serializer(context.session.store)
    const res = sz.rootSubjects(sts)
    let roots = res.roots
    const subjects = res.subjects
    const loopBreakers = res.loopBreakers
    for (const x in loopBreakers) {
      console.log('\tdataContentPane: loopbreaker:' + x)
    }
    const doneBnodes = {} // For preventing looping
    const referencedBnodes = {} // Bnodes which need to be named alas

    // The property tree for a single subject or anonymous node
    function propertyTree (subject) {
      // print('Proprty tree for '+subject)
      const rep = myDocument.createElement('table')
      let lastPred = null
      const sts = subjects[sz.toStr(subject)] // relevant statements
      if (!sts) {
        // No statements in tree
        rep.appendChild(myDocument.createTextNode('...')) // just empty bnode as object
        return rep
      }
      sts.sort()
      let same = 0
      let predicateTD // The cell which holds the predicate
      for (let i = 0; i < sts.length; i++) {
        const st = sts[i]
        const tr = myDocument.createElement('tr')
        if (st.predicate.uri !== lastPred) {
          if (lastPred && same > 1) {
            predicateTD.setAttribute('rowspan', '' + same)
          }
          predicateTD = myDocument.createElement('td')
          predicateTD.setAttribute('class', 'pred')
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
        objectTD.appendChild(objectTree(st.object))
        tr.appendChild(objectTD)
        rep.appendChild(tr)
      }
      if (lastPred && same > 1) predicateTD.setAttribute('rowspan', '' + same)
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

        case 'BlankNode':
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
          var newTable = propertyTree(obj)
          doneBnodes[obj.toNT()] = newTable // Track where we mentioned it first
          if (
            UI.utils.ancestor(newTable, 'TABLE') &&
            UI.utils.ancestor(newTable, 'TABLE').style.backgroundColor ===
              'white'
          ) {
            newTable.style.backgroundColor = '#eee'
          } else {
            newTable.style.backgroundColor = 'white'
          }
          return newTable

        case 'Collection':
          res = myDocument.createElement('table')
          res.setAttribute('class', 'collectionAsTables')
          for (let i = 0; i < obj.elements.length; i++) {
            const tr = myDocument.createElement('tr')
            res.appendChild(tr)
            tr.appendChild(objectTree(obj.elements[i]))
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
      const tr = myDocument.createElement('tr')
      rep.appendChild(tr)
      const subjectTD = myDocument.createElement('td')
      tr.appendChild(subjectTD)
      const TDTree = myDocument.createElement('td')
      tr.appendChild(TDTree)
      const root = roots[i]
      if (root.termType === 'BlankNode') {
        subjectTD.appendChild(myDocument.createTextNode(UI.utils.label(root))) // Don't recurse!
      } else {
        subjectTD.appendChild(objectTree(root)) // won't have tree
      }
      TDTree.appendChild(propertyTree(root))
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
      const sz = UI.rdf.Serializer(context.session.store)
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

    var outliner = context.getOutliner(myDocument)
    var kb = context.session.store
    var div = myDocument.createElement('div')
    div.setAttribute('class', 'dataContentPane')
    // Because of smushing etc, this will not be a copy of the original source
    // We could instead either fetch and re-parse the source,
    // or we could keep all the pre-smushed triples.
    var sts = kb.statementsMatching(undefined, undefined, undefined, subject) // @@ slow with current store!

    if ($rdf.keepThisCodeForLaterButDisableFerossConstantConditionPolice) {
      alternativeRendering()
    } else {
      mainRendering()
    }
    return div
  }
}
