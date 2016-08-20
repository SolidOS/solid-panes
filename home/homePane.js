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
      var toolIcons = [
        { icon: 'noun_339237.svg', maker: makeGroup, hint: 'Make an address book', limit: 1 },
        { icon: 'noun_346777.svg', maker: makePoll, hint: 'Make a poll to schedule a meeting'},
        { icon: 'noun_79217.svg', maker: makePad, hint: 'Make a shared notepad'},
        { icon: 'noun_346319.svg', maker: makeChat, limit:1, hint: 'Create a chat channel'},
        { icon: 'noun_17020.svg', maker: makeActions, limit: 1, hint: 'Make an issue tracker'},
        { icon: 'noun_66617.svg', maker: makeMeeting, hint: 'Make a new meeting', disabled: false}
      ] // 'noun_66617.svg'

      var iconStyle = 'padding: 1em; width: 3em; height: 3em;'
      var star = bottomTR.appendChild(dom.createElement('img'))
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

      var icon, iconArray = []
      for (var i=0; i< toolIcons.length; i++){
        var foo = function() {
          var tool = toolIcons[i]
          var icon = bottomTR.appendChild(dom.createElement('img'))
          icon.setAttribute('src', UI.icons.iconBase + tool.icon)
          icon.setAttribute('title', tool.hint)
          icon.setAttribute('style', iconStyle + "display: none;")
          iconArray.push(icon)
          icon.tool = tool
          var maker = toolIcons[i].maker
          if (!tool.disabled){
            icon.addEventListener('click', function(e){
                maker(e, icon)
            })
          }
        }
        foo()
      }

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
      UI.widgets.registrationList(context, { private: true}).then(function(context){
        div.appendChild(dom.createElement('h4')).textContent = 'Public:'
        UI.widgets.registrationList(context, { public: true}).then(function(context){
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
      UI.widgets.checkUser(subject.doc(), function (webid) {
        me = kb.sym(webid)
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
