/*   Tabbed view of anything
 **
 ** data-driven
 **
 */
const UI = require('solid-ui')
const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_688606.svg',

  name: 'tabbed',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve this pane?
  label: function (subject, context) {
    var kb = context.session.store
    var ns = UI.ns
    var typeURIs = kb.findTypeURIs(subject)
    if (ns.meeting('Cluster').uri in typeURIs) {
      return 'Tabbed'
    }
    return null
  },

  render: function (subject, context) {
    const dom = context.dom
    var kb = context.session.store
    var div = dom.createElement('div')
    kb.fetcher.load(subject).then(function (_xhr) {
      var renderTab = function (div, item) {
        div.appendChild(UI.widgets.personTR(dom, predicate, item, {}))
      }

      var renderMain = function (containerDiv, item) {
        var pane = null
        containerDiv.innerHTML = ''
        var table = containerDiv.appendChild(dom.createElement('table'))
        context
          .getOutliner(dom)
          .GotoSubject(item, true, pane, false, undefined, table)
      }

      var predicate = kb.the(subject, ns.meeting('predicate'))

      var options = { dom: dom, subject: subject }
      options.predicate =
        kb.any(subject, ns.meeting('predicate')) || ns.meeting('toolList')
      options.ordered = true
      options.orientation = kb.anyValue(subject, ns.meeting('orientation')) || 0
      options.renderMain = renderMain
      options.renderTab = renderTab
      // options.renderTabSettings = renderTabSettings  No tab-specific settings
      options.backgroundColor =
        kb.anyValue(subject, ns.ui('backgroundColor')) || '#ddddcc'
      div.appendChild(UI.tabs.tabWidget(options)) // var tabs =
    }) // then
    return div
  }
}
// ends
