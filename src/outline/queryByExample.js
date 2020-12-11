/* istanbul ignore file */
// The query-by-example functionality in the tabulator
// was the ability to expore a bit of the web in outline mode,
// select a ceratain set of fields in the tree,
// then pres "find all" which would then generte a SPARQL query
// to find all other places which had the same pattern.
// Fields could be optional by pressing th ewhite optoional button

const UI = require('solid-ui')

module.exports = {
  makeQueryRow,
  QuerySource,
  viewAndSaveQuery // Main function to generate and use the query
}

const optionalSubqueriesIndex = []

function predParentOf (node) {
  let n = node
  while (true) {
    if (n.getAttribute('predTR')) {
      return n
    } else if (n.previousSibling && n.previousSibling.nodeName === 'TR') {
      n = n.previousSibling
    } else {
      console.log('Could not find predParent')
      return node
    }
  }
}

function makeQueryRow (q, tr, constraint) {
  const kb = UI.store
  // predtr = predParentOf(tr)
  // var nodes = tr.childNodes
  // var n = tr.childNodes.length
  const inverse = tr.AJAR_inverse
  // var hasVar = 0
  let parentVar, level, pat

  function makeRDFStatement (freeVar, parent) {
    if (inverse) {
      return new UI.rdf.Statement(freeVar, st.predicate, parent)
    } else {
      return new UI.rdf.Statement(parent, st.predicate, freeVar)
    }
  }

  let optionalSubqueryIndex = null

  for (level = tr.parentNode; level; level = level.parentNode) {
    if (typeof level.AJAR_statement !== 'undefined') {
      // level.AJAR_statement
      level.setAttribute('bla', level.AJAR_statement) // @@? -timbl
      // UI.log.debug("Parent TR statement="+level.AJAR_statement + ", var=" + level.AJAR_variable)
      /* for(let c=0;c<level.parentNode.childNodes.length;c++) //This makes sure the same variable is used for a subject
      if(level.parentNode.childNodes[c].AJAR_variable)
        level.AJAR_variable = level.parentNode.childNodes[c].AJAR_variable; */
      if (!level.AJAR_variable) {
        makeQueryRow(q, level)
      }
      parentVar = level.AJAR_variable
      const predLevel = predParentOf(level)
      if (predLevel.getAttribute('optionalSubqueriesIndex')) {
        optionalSubqueryIndex = predLevel.getAttribute(
          'optionalSubqueriesIndex'
        )
        pat = optionalSubqueriesIndex[optionalSubqueryIndex]
      }
      break
    }
  }

  if (!pat) {
    pat = q.pat
  }

  const predtr = predParentOf(tr)
  // /////OPTIONAL KLUDGE///////////
  const opt = predtr.getAttribute('optional')
  if (!opt) {
    if (optionalSubqueryIndex) {
      predtr.setAttribute('optionalSubqueriesIndex', optionalSubqueryIndex)
    } else {
      predtr.removeAttribute('optionalSubqueriesIndex')
    }
  }
  if (opt) {
    const optForm = kb.formula()
    optionalSubqueriesIndex.push(optForm)
    predtr.setAttribute(
      'optionalSubqueriesIndex',
      optionalSubqueriesIndex.length - 1
    )
    pat.optional.push(optForm)
    pat = optForm
  }

  // //////////////////////////////

  var st = tr.AJAR_statement

  const constraintVar = tr.AJAR_inverse ? st.subject : st.object // this is only used for constraints
  let hasParent = true
  if (constraintVar.isBlank && constraint) {
    window.alert(
      'You cannot constrain a query with a blank node. No constraint will be added.'
    )
  }
  if (!parentVar) {
    hasParent = false
    parentVar = inverse ? st.object : st.subject // if there is no parents, uses the sub/obj
  }
  // UI.log.debug('Initial variable: '+tr.AJAR_variable)
  const v = tr.AJAR_variable
    ? tr.AJAR_variable
    : kb.variable(UI.utils.newVariableName())
  q.vars.push(v)
  v.label = hasParent ? parentVar.label : UI.utils.label(parentVar)
  v.label += ' ' + UI.utils.predicateLabelForXML(st.predicate, inverse)
  const pattern = makeRDFStatement(v, parentVar)
  // alert(pattern)
  v.label = v.label.slice(0, 1).toUpperCase() + v.label.slice(1) // init cap

  // See ../rdf/sparql.js
  // This should only work on literals but doesn't.
  function ConstraintEqualTo (value) {
    this.describe = function (varstr) {
      return varstr + ' = ' + value.toNT()
    }
    this.test = function (term) {
      return value.sameTerm(term)
    }
    return this
  }

  if (constraint) {
    // binds the constrained variable to its selected value
    pat.constraints[v] = new ConstraintEqualTo(constraintVar)
  }
  UI.log.info('Pattern: ' + pattern)
  pattern.tr = tr
  tr.AJAR_pattern = pattern // Cross-link UI and query line
  tr.AJAR_variable = v
  // UI.log.debug('Final variable: '+tr.AJAR_variable)
  UI.log.debug('Query pattern: ' + pattern)
  pat.statements.push(pattern)
  return v
} // makeQueryRow

function saveQuery (selection, qs) {
  // var qs = outline.qs // @@
  const q = new UI.rdf.Query()
  const n = selection.length
  let i, sel, st, tr
  for (i = 0; i < n; i++) {
    sel = selection[i]
    tr = sel.parentNode
    st = tr.AJAR_statement
    UI.log.debug('Statement ' + st)
    if (sel.getAttribute('class').indexOf('pred') >= 0) {
      UI.log.info('   We have a predicate')
      makeQueryRow(q, tr)
    }
    if (sel.getAttribute('class').indexOf('obj') >= 0) {
      UI.log.info('   We have an object')
      makeQueryRow(q, tr, true)
    }
  }
  qs.addQuery(q)

  function resetOutliner (pat) {
    const n = pat.statements.length
    let pattern, tr
    for (let i = 0; i < n; i++) {
      pattern = pat.statements[i]
      tr = pattern.tr
      // UI.log.debug('tr: ' + tr.AJAR_statement);
      if (typeof tr !== 'undefined') {
        tr.AJAR_pattern = null // TODO: is this == to whats in current version?
        tr.AJAR_variable = null
      }
    }
    for (const x in pat.optional) {
      resetOutliner(pat.optional[x])
    }
  }
  resetOutliner(q.pat)
  // NextVariable=0;
  return q
} // saveQuery

// When the user asks for all list of all matching parts of the data
//
function viewAndSaveQuery (outline, selection) {
  const qs = outline.qs
  UI.log.info('outline.doucment is now ' + outline.document.location)
  const q = saveQuery(selection, qs)
  /*
  if (tabulator.isExtension) {
    // tabulator.drawInBestView(q)
  } else
  */

  for (let i = 0; i < qs.listeners.length; i++) {
    qs.listeners[i].getActiveView().view.drawQuery(q)
    qs.listeners[i].updateQueryControls(qs.listeners[i].getActiveView())
  }
}

/**
 * The QuerySource object stores a set of listeners and a set of queries.
 * It keeps the listeners aware of those queries that the source currently
 * contains, and it is then up to the listeners to decide what to do with
 * those queries in terms of displays.
 * Not used 2010-08 -- TimBL
 * @class QuerySource
 * @author jambo
 */

function QuerySource () {
  /**
   * stores all of the queries currently held by this source,
   * indexed by ID number.
   */
  this.queries = []
  /**
   * stores the listeners for a query object.
   * @see TabbedContainer
   */
  this.listeners = []

  /**
   * add a Query object to the query source--It will be given an ID number
   * and a name, if it doesn't already have one. This subsequently adds the
   * query to all of the listeners the QuerySource knows about.
   */
  this.addQuery = function (q) {
    let i
    if (q.name === null || q.name === '') {
      q.name = 'Query #' + (this.queries.length + 1)
    }
    q.id = this.queries.length
    this.queries.push(q)
    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i] !== null) {
        this.listeners[i].addQuery(q)
      }
    }
  }

  /**
   * Remove a Query object from the source.  Tells all listeners to also
   * remove the query.
   */
  this.removeQuery = function (q) {
    let i
    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i] !== null) {
        this.listeners[i].removeQuery(q)
      }
    }
    if (this.queries[q.id] !== null) {
      delete this.queries[q.id]
    }
  }

  /**
   * adds a "Listener" to this QuerySource - that is, an object
   * which is capable of both adding and removing queries.
   * Currently, only the TabbedContainer class is added.
   * also puts all current queries into the listener to be used.
   */
  this.addListener = function (listener) {
    let i
    this.listeners.push(listener)
    for (i = 0; i < this.queries.length; i++) {
      if (this.queries[i] !== null) {
        listener.addQuery(this.queries[i])
      }
    }
  }
  /**
   * removes listener from the array of listeners, if it exists! Also takes
   * all of the queries from this source out of the listener.
   */
  this.removeListener = function (listener) {
    let i
    for (i = 0; i < this.queries.length; i++) {
      if (this.queries[i] !== null) {
        listener.removeQuery(this.queries[i])
      }
    }

    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i] === listener) {
        delete this.listeners[i]
      }
    }
  }
}
