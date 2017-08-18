/*   Home Pane
**
** The home pane is avaiable everywhere and allows a user
** to
**  - keep track of their stuff
**  - make new things, and possibly
**  - keep track of accounts and workspaces etc
**
*/

var UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'noun_547570.svg', // noun_25830

  name: 'home',

  // Does the subject deserve an home pane?
  //
  //   yes, always!
  //
  label: function (subject) {
    return 'home'
  },

  render: function (subject, dom) {
    // ////////////////////////////////////////////////////////////////////////////

    var complain = function complain (message) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: pink')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    /*
    var newThingUI = function (context) {
      var iconStyle = 'padding: 1em; width: 3em; height: 3em;'
      var star = context.div.appendChild(dom.createElement('img'))
      var visible = false // the inividual tools tools
      star.setAttribute('src', UI.icons.iconBase + 'noun_272948.svg')
      star.setAttribute('style', iconStyle)
      star.setAttribute('title', 'Add another tool to the meeting')

      var selectNewTool = function (event) {
        visible = !visible
        star.setAttribute('style', iconStyle + (visible ? 'background-color: yellow;' : ''))
        styleTheIcons(visible ? '' : 'display: none;')
      }
      star.addEventListener('click', selectNewTool)
      var makeNewAppInstance = function (options) {
        return new Promise(function (resolve, reject) {
          var callbackWS = function (ws, newBase) {
            var newPaneOptions = {
              newBase: newBase,
              workspace: ws,
              pane: options.pane
            }
            for (var opt in options) { // get div, dom, me
              newPaneOptions[opt] = options[opt]
            }
            options.pane.mintNew(newPaneOptions)
              .then(function (newPaneOptions) {
                if (!newPaneOptions || !newPaneOptions.newInstance) {
                  throw new Error('Cannot mint new - missing newInstance')
                }
                var p = options.div.appendChild(dom.createElement('p'))
                p.setAttribute('style', 'font-size: 120%;')
                // Make link to new thing
                p.innerHTML =
                  "Your <a target='_blank' href='" + newPaneOptions.newInstance.uri + "'><b>new " + options.noun + '</b></a> is ready to be set up. ' +
                  "<br/><br/><a target='_blank' href='" + newPaneOptions.newInstance.uri + "'>Go to your new " + options.noun + '.</a>'
                selectUI.parentNode.removeChild(selectUI) // Clean up
                selectNewTool() // toggle star to plain and menu vanish again
              })
              .catch(function (err) {
                complain(err)
                reject(err)
              })
          }

          var pa = options.pane
          options.appPathSegment = 'edu.mit.solid.pane.' + pa.name
          options.noun = pa.mintClass ? UI.utils.label(pa.mintClass) : (pa.name + ' @@')

          var selectUI = UI.authn.selectWorkspace(dom, options, callbackWS)
          options.div.appendChild(selectUI)
        })
      } // newAppInstance

      var iconArray = []
      for (var pn in UI.panes) {
        var pane = UI.panes[pn]
        if (pane.mintNew) {
          var icon = context.div.appendChild(dom.createElement('img'))
          icon.setAttribute('src', pane.icon)
          var noun = pane.mintClass ? UI.utils.label(pane.mintClass) : (pane.name + ' @@')
          icon.setAttribute('title', 'Make new ' + noun)
          icon.setAttribute('style', iconStyle + 'display: none;')
          iconArray.push(icon)
          var foo = function (pane, icon, noun) {
            var iconEle = icon
            var thisPane = pane
            var thisNoun = noun
            if (!icon.disabled) {
              icon.addEventListener('click', function (e) {
                selectTool(iconEle)
                var options = {
                  event: e,
                  iconEle: iconEle,
                  pane: thisPane,
                  noun: thisNoun,
                  noIndexHTML: true, // do NOT @@ for now write a HTML file
                  div: context.div,
                  me: context.me,
                  dom: context.dom
                }
                makeNewAppInstance(options)
              })
            }
          } // foo
          foo(pane, icon, noun)
        }
      }

      var styleTheIcons = function (style) {
        for (var i = 0; i < iconArray.length; i++) {
          var st = iconStyle + style
          if (iconArray[i].disabled) { // @@ unused
            st += 'opacity: 0.3;'
          }
          iconArray[i].setAttribute('style', st) // eg 'background-color: #ccc;'
        }
      }
      var selectTool = function (icon) {
        styleTheIcons('display: none;') // 'background-color: #ccc;'
        icon.setAttribute('style', iconStyle + 'background-color: yellow;')
      }
    }
    */

    var showContent = function () {
      var context = {div: div, dom: dom, statusArea: div, me: me}

      var creationDiv = div.appendChild(dom.createElement('div'))
      var creationContext = {div: creationDiv, dom: dom, statusArea: div, me: me}
      creationDiv.appendChild(dom.createElement('h4')).textContent = 'Make a new tool'
      var newUI = UI.create.newThingUI(creationContext, UI.panes) // Have to pass panes down

      div.appendChild(dom.createElement('h4')).textContent = 'Private:'
      UI.authn.registrationList(context, {private: true}).then(function (context) {
        div.appendChild(dom.createElement('h4')).textContent = 'Public:'
        UI.authn.registrationList(context, {public: true}).then(function (context) {
          // done
        })
      })
    }

    var div = dom.createElement('div')
    var me = UI.authn.currentUser()

    showContent()

    return div
  }
} // pane object

// ends
