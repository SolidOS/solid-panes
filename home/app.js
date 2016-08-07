// Find your stuff
//
// This is or was part of https://github.com/Linkeddata/solid-app-set/
//

document.addEventListener('DOMContentLoaded', function () {

  var UI = require('mashlib')


  var inputStyle = 'background-color: #eef; padding: 0.5em;  border: .5em solid white; font-size: 150%; text-align: center;' //  ;
  var kb = UI.store
  var fetcher = kb.fetcher
  var ns = UI.ns
  var dom = document
  var updater = kb.updater

  var waitingForLogin = false

  var uri = window.location.href
  var base = uri.slice(0, uri.lastIndexOf('/') + 1)

  var scriptBase = 'https://linkeddata.github.io/solid-app-set/'

  var div = document.getElementById('FormTarget')

  // //////////////////////////////////// Getting logged in with a WebId

  var setUser = function (webid) {
    if (webid) {
      tabulator.preferences.set('me', webid)
      console.log('(SetUser: Logged in as ' + webid + ')')
      me = kb.sym(webid)
    // @@ Here enable all kinds of stuff
    } else {
      tabulator.preferences.set('me', '')
      console.log('(SetUser: Logged out)')
      me = null
    }
  }

  var me_uri = tabulator.preferences.get('me')
  var me = me_uri ? kb.sym(me_uri) : null

  var userTest = $rdf.sym('https://databox.me/')

  UI.widgets.checkUser(userTest, setUser)

  var pane = UI.panes.home
  var target = me // @@ for now, in fact not relevant

  // subject, expand, pane, solo, referrer, table
  UI.outline.GotoSubject(target, true, pane, true, undefined)
  // //////////////////////////////  Reproduction: spawn a new instance
  //
  // Viral growth path: user of app decides to make another instance
  //

  var newInstanceButtonDiv = function () {
    return UI.widgets.newAppInstance(dom,
      { noun: 'meeting',
        appPathSegment: appPathSegment},
      initializeNewInstanceInWorkspace)
  } // newInstanceButtonDiv

  // ///////////////////////  Create new document files for new instance of app

  var initializeNewInstanceInWorkspace = function (ws, newBase) {

    if (newBase.slice(-1) !== '/') {
      console.log(appPathSegment + ': No / at end of uriPrefix ' + newBase); // @@ paramater?
      newBase = newBase + '/'
    }
    var now = new Date()

    initializeNewInstanceAtBase(null, newBase)
  }

  var initializeNewInstanceAtBase = function (thisInstance, newBase) {
    var pane = UI.panes.byName('meeting')
    var newInstance = pane.mint(newBase)
    .then(function(newInstance){
      UI.outline.GotoSubject(newInstance, true, undefined, true);
      div.removeChild(d)
    })
    .catch(function(e){
      div.textContent = 'Error making new meeting: ' + e
    })
  }

  var d = newInstanceButtonDiv() // Actually a div in which minting will happen
  var button = d.firstChild
  button.setAttribute('style', inputStyle)
  div.appendChild(d)
})
