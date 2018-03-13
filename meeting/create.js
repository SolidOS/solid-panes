// Create a new application instance
//
// This is or was part of https://github.com/solid/solid-panes/
//
var panes = require('../paneRegistry')

document.addEventListener('DOMContentLoaded', function () {
  var UI = require('mashlib')
  var appPathSegment = 'meetulator.timbl.com'

  var inputStyle = 'background-color: #eef; padding: 0.5em;  border: .5em solid white; font-size: 150%; text-align: center;' //  ;
  var dom = document

  var div = document.getElementById('FormTarget')

  UI.authn.checkUser()  // kick off async operation

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
      console.log(appPathSegment + ': No / at end of uriPrefix ' + newBase) // @@ paramater?
      newBase = newBase + '/'
    }
    //  var now = new Date()
    initializeNewInstanceAtBase(null, newBase)
  }

  var initializeNewInstanceAtBase = function (thisInstance, newBase) {
    var pane = panes.byName('meeting')
    pane.mint(newBase)
      .then((newInstance) => {
        panes.getOutliner(dom).GotoSubject(newInstance, true, undefined, true)
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
