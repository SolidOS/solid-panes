/*   Long Chat Pane
**
**  A long chat consists a of a series of chat files saved by date.
*/

const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store

module.exports = { // noun_704.svg Canoe   noun_346319.svg = 1 Chat  noun_1689339.svg = three chat
  icon: UI.icons.iconBase + 'noun_1689339.svg',

  name: 'long chat',

  label: function (subject) {
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('LongChat'))) { // subject is the object
      return 'Chat channnel'
    }
    return null // Suppress pane otherwise
  },

  mintClass: ns.meeting('LongChat'),

  mintNew: function (newPaneOptions) {
    var updater = kb.updater
    if (newPaneOptions.me && !newPaneOptions.me.uri) throw new Error('chat mintNew:  Invalid userid ' + newPaneOptions.me)

    var newInstance = newPaneOptions.newInstance = newPaneOptions.newInstance || kb.sym(newPaneOptions.newBase + 'index.ttl#this')
    var newChatDoc = newInstance.doc()

    kb.add(newInstance, ns.rdf('type'), ns.meeting('LongChat'), newChatDoc)
    kb.add(newInstance, ns.dc('title'), 'Chat channel', newChatDoc)
    kb.add(newInstance, ns.dc('created'), new Date(), newChatDoc)
    if (newPaneOptions.me) {
      kb.add(newInstance, ns.dc('author'), newPaneOptions.me, newChatDoc)
    }

    return new Promise(function (resolve, reject) {
      updater.put(
        newChatDoc,
        kb.statementsMatching(undefined, undefined, undefined, newChatDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            resolve(newPaneOptions)
          } else {
            reject(new Error('FAILED to save new chat channel at: ' + uri2 + ' : ' +
              message))
          };
        })
    })
  },

  render: function (subject, dom) {
    var complain = function complain (message, color) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    var div = dom.createElement('div')
    div.setAttribute('class', 'chatPane')
    let options = {infinite: true} // Like newestFirst

    var messageStore
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('LongChat'))) { // subject may be the file
      messageStore = subject.doc()
    } else {
      complain('Unknown chat type')
    }

    div.appendChild(UI.infiniteMessageArea(dom, kb, subject, options))
    /*
    kb.updater.addDownstreamChangeListener(messageStore, function () {
      UI.widgets.refreshTree(div)
    }) // Live update
    */
//    })

    return div
  }
}
