// Format an array of RDF statements as an HTML table.
//
// This can operate in one of three modes: when the class of object is given
// or when the source document from which data is taken is given,
// or if a prepared query object is given.
// (In principle it could operate with neither class nor document
// given but typically
// there would be too much data.)
// When the tableClass is not given, it looks for common  classes in the data,
// and gives the user the option.
//
// 2008 Written, Ilaria Liccardi
// 2014 core functionality now in common/table.js   -timbl

// ///////////////////////////////////////////////////////////////////

// Table view pane  -- view of a class/
const UI = require('solid-ui')

module.exports = {
  icon: UI.icons.originalIconBase + 'table.png',

  name: 'tableOfClass',

  label: function (subject, context) {
    const store = context.session.store
    // if (!store.holds(subject, UI.ns.rdf('type'),UI.ns.rdfs('Class'))) return null
    if (!store.any(undefined, UI.ns.rdf('type'), subject)) {
      return null
    }
    const n = store.statementsMatching(undefined, UI.ns.rdf('type'), subject)
      .length
    if (n === 0) {
      // None, suppress pane
      return null
    }
    if (n > 15) {
      // @@ At the moment this pane can be slow with too many @@ fixme by using limits
      return null
    }
    return UI.utils.label(subject) + ' table'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const div = myDocument.createElement('div')
    div.setAttribute('class', 'tablePane')
    div.appendChild(UI.table(myDocument, { tableClass: subject }))
    return div
  }
}
