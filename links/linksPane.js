/*   Single audio play Pane
**
*/
const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store

const predicate = ns.wf('attachment')


module.exports =  {

  icon: UI.icons.iconBase + 'noun_160581.svg', // right arrow noun_160581.svg

  name: 'link',

  // Does the subject deserve an audio play pane?
  label: function(subject) {

    var count = kb.each(subject, predicate).length
    if (count > 0){
      return UI.utils.label(predicate) + ' ' + count
    }
    return null;
  },

  mintNew: function(options){
    return new Promise(function(resolve, reject){
      resolve(options)
    })
  },

  render: function(subject, dom) {

    createNewRow = function(object){
      var opts = {} // @@ Add delete function
      return UI.widgets.personTR(dom, predicate, object, opts)
    }
    var div = dom.createElement('div')
    var table = div.appendChild(dom.createElement('table'))
    return div;
    var refresh = function(){
      var things = kb.each(subject, predicate)
      UI.utils.syncTableToArray(table, things, createNewRow)
    }
    div.refresh = refresh
    refresh()
  }
}

//ends
