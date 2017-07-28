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

  var target

  UI.authn.checkUser()
    .then(webId => {
      target = webId // @@ for now, in fact not relevant

      // subject, expand, pane, solo, referrer, table
      UI.outline.GotoSubject(target, true, pane, true, undefined)
    })

  var pane = UI.panes.home

  // //////////////////////////////  Reproduction: spawn a new instance
  //
  // Viral growth path: user of app decides to make another instance
  //

  var newInstanceButtonDiv = function () {
    return UI.authn.newAppInstance(dom,
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
    pane.mint(newBase)
      .then((newInstance) => {
        UI.outline.GotoSubject(newInstance, true, undefined, true);
        div.removeChild(d)
      })
      .catch((e) => {
        div.textContent = 'Error making new meeting: ' + e
      })
  }

  var d = newInstanceButtonDiv() // Actually a div in which minting will happen
  var button = d.firstChild
  button.setAttribute('style', inputStyle)
  div.appendChild(d)
})
