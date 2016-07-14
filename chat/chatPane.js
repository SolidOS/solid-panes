/*   Chat Pane
**
**  Plan is to support a finte number of chat graph shapes
** and investigate the interop between them.
*/

var UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'noun_346319.svg',

  name: 'chat',

  /*   AN RRSAgent IRC log:

  <irc://localhost:6667/&mit>
      a    foaf:ChatChannel
      foaf:chatEventList
              [ rdf:_100
                 <#T19-10-58>
              rdf:_101
                 <#T19-10-58-1>
              rdf:_102
  ..
  <#T19-28-47-1>
      dc:creator
         [ a wn:Person; foaf:nick "timbl" ]
      dc:date
         "2016-03-15T19:28:47Z"
      dc:description
         "timbl has joined &mit"
      a    foaf:chatEvent.

  */

  label: function (subject) {
    var kb = UI.store, ns = UI.ns
    var n = UI.store.each(subject, ns.wf('message')).length
    if (n > 0) return 'Chat (' + n + ')' // Show how many in hover text

//  ns.meeting('Chat')

if (kb.holds(subject, ns.rdf('type'), ns.meeting('Chat'))) { // subject is the file
  return 'Meeting chat'
}
if (kb.holds(undefined, ns.rdf('type'), ns.foaf('ChatChannel'), subject)) { // subject is the file
  return 'IRC log' // contains anything of this type
}
    return null // Suppress pane otherwise
  },

  render: function (subject, dom) {
    var kb = UI.store, ns = UI.ns
    var complain = function complain (message, color) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    ////////////////////////////////////// Getting logged in with a WebId

    var me = null;
    var setUser = function(webid) {
        if (webid) {
            tabulator.preferences.set('me', webid);
            console.log("(SetUser: Logged in as "+ webid+")")
            me = kb.sym(webid);
            // @@ Here enable all kinds of stuff
        } else {
            tabulator.preferences.set('me', '');
            console.log("(SetUser: Logged out)")
            me = null;
        }
    }


    ////////// Who am I

    var whoAmI = function() {
        var me_uri = tabulator.preferences.get('me');
        me = me_uri? kb.sym(me_uri) : null;
        UI.widgets.checkUser(messageStore, setUser);

        if (!tabulator.preferences.get('me')) {
            console.log("(You do not have your Web Id set. Sign in or sign up to make changes.)");
/*
            if (tabulator.mode == 'webapp' && typeof document !== 'undefined' &&
                document.location &&  ('' + document.location).slice(0,16) === 'http://localhost') {

                me = kb.any(subject, UI.ns.dc('author')); // when testing on plane with no webid
                console.log("Assuming user is " + me)
            }
*/
        } else {
            me = kb.sym(tabulator.preferences.get('me'))
            // console.log("(Your webid is "+ tabulator.preferences.get('me')+")");
        };

    }

//////////////////////////


    var div = dom.createElement('div')
    div.setAttribute('class', 'chatPane')
    options = {} // Like newestFirst
    var messageStore
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('Chat'))) { // subject is the file
      messageStore = subject
    } else if (kb.any(subject, UI.ns.wf('message'))) {
      messageStore = UI.store.any(subject, UI.ns.wf('message')).doc()

    } else if (kb.holds(undefined, ns.rdf('type'), ns.foaf('ChatChannel'), subject)
       || kb.holds(subject, ns.rdf('type'), ns.foaf('ChatChannel'))) { // subject is the file
      var ircLogQuery = function () {
        var query = new $rdf.Query('IRC log entries')
        var v = []
        var vv = ['chan', 'msg', 'date', 'list', 'pred', 'creator', 'content']
        vv.map(function (x) {
          query.vars.push(v[x] = $rdf.variable(x))
        })
        query.pat.add(v['chan'], ns.foaf('chatEventList'), v['list']) // chatEventList
        query.pat.add(v['list'], v['pred'], v['msg']) //
        query.pat.add(v['msg'], ns.dc('date'), v['date'])
        query.pat.add(v['msg'], ns.dc('creator'), v['creator'])
        query.pat.add(v['msg'], ns.dc('description'), v['content'])
        return query
      }
      messageStore = subject
      options.query = ircLogQuery()

    } else {
      complain('Unknown chat type')
    }

    whoAmI()
    div.appendChild(UI.messageArea(dom, kb, subject, messageStore, options))

    return div
  }
}

// ends
