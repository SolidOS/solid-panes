/*   Tabbed view of anything
**
** data-driven
**
*/
const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store


module.exports =  {

  icon: UI.icons.iconBase + 'noun_688606.svg',

  name: 'tabbed',

  // Does the subject deserve an audio play pane?
  label: function(subject) {
    var kb = UI.store;
    var ns = UI.ns;
    var typeURIs = kb.findTypeURIs(subject);
    if (ns.meeting('Cluster').uri in typeURIs){
      return "Tabbed"
    }
    return null;
  },

  render: function(subject, dom) {

    var div = dom.createElement('div')
    kb.fetcher.load(subject).then(function(xhr){

      var renderTab = function(div, item){
        div.appendChild(UI.widgets.personTR(dom, predicate, item, {}));
      }

      var renderMain = function(containerDiv, item){
        var pane = null
        containerDiv.innerHTML = ''
        var table = containerDiv.appendChild(dom.createElement('table'))
        UI.outline.GotoSubject(item, true, pane, false, undefined, table)
      }

      var orientation = kb.anyValue(subject, ns.meeting('orientation')) || 0
      var predicate = kb.the(subject, ns.meeting('predicate'))

      var options = {dom: dom, subject:subject}
      options.predicate = kb.any(subject, ns.meeting('predicate')) || ns.meeting('toolList')
      options.ordered = true
      options.orientation =  kb.anyValue(subject, ns.meeting('orientation')) || 0
      options.renderMain = renderMain
      options.renderTab = renderTab
      // options.renderTabSettings = renderTabSettings  No tab-specific settings
      options.backgroundColor = kb.anyValue(subject, ns.ui('backgroundColor')) || "#ddddcc"
      var tabs = div.appendChild(UI.tabs.tabWidget(options))
    }) // then
    return div;
  }
}
//ends
