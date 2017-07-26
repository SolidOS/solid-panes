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
    return "home"
  },

  render: function (subject, dom) {

    // ////////////////////////////////////////////////////////////////////////////

    var complain = function complain (message) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: pink')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    var newThingUI = function(context) {

      var genericMaker = function(event, tool){

      }
      var toolIcons = [
        { icon: 'noun_339237.svg', maker: genericMaker, paneName: 'contact', hint: 'Make an address book', limit: 1 },
        { icon: 'noun_346777.svg', maker: genericMaker, paneName: 'schedule',  hint: 'Make a poll to schedule a meeting'},
        { icon: 'noun_79217.svg', maker: genericMaker, paneName: 'pad', hint: 'Make a shared notepad'},
        { icon: 'noun_346319.svg', maker: genericMaker, paneName: 'chat', limit:1, hint: 'Create a chat channel'},
        { icon: 'noun_17020.svg', maker: genericMaker, paneName: 'issue', hint: 'Make an issue tracker'},
        { icon: 'noun_66617.svg', maker: genericMaker, paneName: 'meeting', hint: 'Make a new meeting', disabled: false}
      ] // 'noun_66617.svg'

      var iconStyle = 'padding: 1em; width: 3em; height: 3em;'
      var star = context.div.appendChild(dom.createElement('img'))
      var visible = false; // the inividual tools tools
      star.setAttribute('src', UI.icons.iconBase + 'noun_272948.svg')
      star.setAttribute('style', iconStyle)
      star.setAttribute('title', 'Add another tool to the meeting')

      var selectNewTool = function(event){
        visible = !visible
        star.setAttribute('style', iconStyle + (visible? 'background-color: yellow;': ''));
        styleTheIcons(visible? '' : 'display: none;')
      }
      star.addEventListener('click', selectNewTool)
      var resetIcons = function(){
        star.setAttribute('style', iconStyle)
      }

      var makeNewAppInstance = function (options) {
        return new Promise(function (resolve, reject) {
          var kb = UI.store

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
                  "Your <a target='_blank' href='" + newPaneOptions.newInstance.uri + "'><b>new " + options.noun + "</b></a> is ready to be set up. " +
                  "<br/><br/><a target='_blank' href='" + newPaneOptions.newInstance.uri + "'>Go to your new " + options.noun + ".</a>"
                selectUI.parentNode.removeChild(selectUI)  // Clean up
                selectNewTool() // toggle star to plain and menu vanish again

              })
              .catch(function (err) {
                complain(err)
                reject(err)
              })
          }

          var pa = options.pane
          options.appPathSegment = 'edu.mit.solid.pane.' + pa.name
          options.noun = pa.mintClass ? UI.utils.label(pa.mintClass) : ( pa.name + ' @@' )

          var selectUI = UI.authn.selectWorkspace(dom, options, callbackWS)
          options.div.appendChild(selectUI)
        })
      }

      var iconArray = []

      for (var pn in UI.panes){
        var pane = UI.panes[pn]
        if (pane.mintNew){
          var icon = context.div.appendChild(dom.createElement('img'))
          icon.setAttribute('src', pane.icon)
          var noun = pane.mintClass ? UI.utils.label(pane.mintClass) : ( pane.name + ' @@' )
          icon.setAttribute('title', 'Make new ' + noun)
          icon.setAttribute('style', iconStyle + "display: none;")
          iconArray.push(icon)
          var foo = function(pane, icon, noun){
            var iconEle = icon
            var thisPane = pane
            var thisNoun = noun
            if (!icon.disabled){
              icon.addEventListener('click', function(e){
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
          }// foo
          foo(pane, icon, noun)
        }
      }

/*
      for (var i=0; i< toolIcons.length; i++){
        var foo = function() {
          var tool = toolIcons[i]
          var icon = context.div.appendChild(dom.createElement('img'))
          icon.setAttribute('src', UI.icons.iconBase + tool.icon)
          icon.setAttribute('title', tool.hint)
          icon.setAttribute('style', iconStyle + "display: none;")
          iconArray.push(icon)
          icon.tool = tool
          var maker = toolIcons[i].maker
          if (!tool.disabled){
            icon.addEventListener('click', function(e){
                maker(e, tool)
            })
          }
        }
        foo()
      }
*/
      var styleTheIcons = function(style){
        for (var i=0; i<iconArray.length; i++){
          var st = iconStyle + style
          if (toolIcons[i].disabled){
            st += 'opacity: 0.3;'
          }
          iconArray[i].setAttribute('style', st) // eg 'background-color: #ccc;'
        }
      }
      var resetTools = function(){
        styleTheIcons('display: none;')
        star.setAttribute('style', iconStyle)
      }

      var selectTool = function(icon){
        styleTheIcons('display: none;') // 'background-color: #ccc;'
        icon.setAttribute('style', iconStyle + 'background-color: yellow;')
      }
    }

    var showContent = function(){
      var context = {div: div, dom: dom, statusArea: div, me: me}

      div.appendChild(dom.createElement('h4')).textContent = 'Private:'
      UI.authn.registrationList(context, { private: true}).then(function(context){
        div.appendChild(dom.createElement('h4')).textContent = 'Public:'
        UI.authn.registrationList(context, { public: true}).then(function(context){
          div.appendChild(dom.createElement('h4')).textContent = 'Make a new tool'
          newThingUI(context)
        })
      })
    }
    var thisPane = this
    var kb = UI.store
    var ns = UI.ns

    var div = dom.createElement('div')

    var me = tabulator.preferences.get('me')
    me = me? kb.sym(me) : null
    if (!me) {
      console.log('Waiting to find out id user users to access ' + subject.doc())
      UI.authn.checkUser(subject.doc(), function (webid) {
        me = webid ? kb.sym(webid) : null
        console.log('Got user id: ' + me)
        showContent()
      })
    } else {
      showContent()
    }

    return div
  }
} // pane object

// ends
