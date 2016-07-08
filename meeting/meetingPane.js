/*   Meeting materials Pane
**
**  Putting together some of the tools we have to manage a Meeting
*/

var UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'noun_66617.svg',

  name: 'meeting',

  label: function (subject) {
    var kb = UI.store, ns = UI.ns
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('Meeting'))) {
      return 'Meeting'
    }
    return null // Suppress pane otherwise
  },

  // Create a new Meeting thing
  //
  // Returns a promise of meeting
  //
  mint: function(base, context){
    return new Promise(function(resolve, reject){
      var kb = UI.store, ns = UI.ns
      var meeting = kb.sym(base + 'meet#this')
      var meetingDoc = meeting.doc()
      kb.add(meeting, ns.rdf('type'), ns.meeting('Meeting'), meetingDoc)
      kb.fetcher.webOperation('PUT', meetingDoc).then(function(xhr){
        resolve(meeting)})
        .catch(function(err){
          reject('Error writing meeting configuration: ' + err)
        })
    })
  },

  render: function (subject, dom) {
    var kb = UI.store, ns = UI.ns
    var updater = kb.updater

    var complain = function complain (message, color) {
      console.log(message)
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    var meeting = subject
    var meetingDoc = subject.doc()
    var meetingBase = subject.dir().uri
    var ins = []
    var div = dom.createElement('div')
    var table = div.appendChild(dom.createElement('table'))
    var topTR = table.appendChild(dom.createElement('tr'))
    var topDiv = topTR.appendChild(dom.createElement('div'))
    var mainTR = table.appendChild(dom.createElement('tr'))
    var bottomTR = table.appendChild(dom.createElement('tr'))

    var me = null; // @@ Put code to find out logged in person
    var loginOutButton = UI.widgets.loginStatusBox(dom, function(webid){
        // sayt.parent.removeChild(sayt);
        if (webid) {
            tabulator.preferences.set('me', webid.uri);
            console.log("(Logged in as "+ webid+")")
            me = webid;
            topDiv.removeChild(loginOutButton);
        } else {
            tabulator.preferences.set('me', '');
            console.log("(Logged out)")
            me = null;
        }
    });
    loginOutButton.setAttribute('style', 'margin: 0.5em 1em;');
    topDiv.appendChild(loginOutButton);

    var addInNewThing = function(thing, pred){
      var ins = []
      kb.add(meeting, pred, thing, meetingDoc)
      var toolList = kb.the(meeting, ns.meeting('toolList'))
      toolList.elements.push(thing) //  Will this work?  Should use patch?
      updater.put(
        meetingDoc,
        kb.statementsMatching(undefined, undefined, undefined, meetingDoc),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok) {
              tabs.refresh()
              resetTools()
          } else {
              message = "FAILED to save new thing at: "+ there.uri +' : ' + message
              complain(message)
          };
      })
    }

//////////////////////  DRAG and Drop

    var dragoverListener = function (e) {
      e.preventDefault() // Neeed else drop does not work [sic]
      e.dataTransfer.dropEffect = 'copy'
    // console.log('dragover event') // millions of them
    }

    var dragenterListener = function (e) {
      console.log('dragenter event dropEffect: ' + e.dataTransfer.dropEffect)
      this.style.backgroundColor = '#ccc'
      e.dataTransfer.dropEffect = 'link'
      console.log('dragenter event dropEffect 2: ' + e.dataTransfer.dropEffect)
    }
    var dragleaveListener = function (e) {
      console.log('dragleave event dropEffect: ' + e.dataTransfer.dropEffect)
      this.style.backgroundColor = 'white'
    }


    var dropListener = function (e) {
      if (e.preventDefault) e.preventDefault() // stops the browser from redirecting off to the text.
      console.log('Drop event. dropEffect: ' + e.dataTransfer.dropEffect)
      console.log('Drop event. types: ' + (e.dataTransfer.types ? e.dataTransfer.types.join(', ') : 'NOPE'))

      var uris = null
      var text
      var thisEle = this
      if (e.dataTransfer.types) {
        for (var t = 0; t < e.dataTransfer.types.length; t++) {
          var type = e.dataTransfer.types[t]
          if (type === 'text/uri-list') {
            uris = e.dataTransfer.getData(type).split('\n') // @ ignore those starting with #
            console.log('Dropped text/uri-list: ' + uris)
          } else if (type === 'text/plain') {
            text = e.dataTransfer.getData(type)
          }
        }
        if (uris === null && text && text.slice(0, 4) === 'http') {
          uris = text
          console.log("Waring: Poor man's drop: using text for URI") // chrome disables text/uri-list??
        }
      } else {
        // ... however, if we're IE, we don't have the .types property, so we'll just get the Text value
        uris = [ e.dataTransfer.getData('Text') ]
        console.log('@@ WARNING non-standrad drop event: ' + uris[0])
      }
      console.log('Dropped URI list (2): ' + uris)
      if (uris) {
        uris.map(function (u) {
          var thing = $rdf.sym(u)
          console.log('Dropped on attachemnt ' + u)
          addInNewThing(thing, UI.ns.wf('attachment'))
        })
      }
      return false
    } // dropListener

    var addTargetListeners = function(ele){
      if (!ele){
        console.log("@@@ addTargetListeners: ele " + ele)
      }
      ele.addEventListener('dragover', dragoverListener)
      ele.addEventListener('dragenter', dragenterListener)
      ele.addEventListener('dragleave', dragleaveListener)
      ele.addEventListener('drop', dropListener)
    }

/////////////////////////


    var makeGroup = function(event, icon){
      selectTool(icon);
    }
    var makePoll = function(event, icon){
      selectTool(icon);

      var newBase = meetingBase + 'Schedule/'


      // This should all really be in with the pad code:

      var kb = UI.store
      var newDetailsDoc = kb.sym(newBase + 'poll.ttl');
      //var newIndexDoc = kb.sym(newBase + 'index.html');
      if (kb.holds(meeting, ns.meeting('schedulingPoll'))){
        console.log("Ignored - already have a scheduling poll");
        return // already got one
      }

      var div = UI.panes.byName('schedule').mintNew(undefined, newBase, function(ok, newInstance){
        if (ok) {
          addInNewThing(newInstance, ns.meeting('schedulingPoll'))
        } else {
          complain('Error making new scheduler: ' + newInstance)
        }
      })
    }

    //   Make Pad for notes of meeting

    var makePad = function(event, icon){
      selectTool(icon);
      var newBase = meetingBase + 'SharedNotes/'

      // This should all really be in with the pad code:

      var kb = UI.store
      var newPadDoc = kb.sym(newBase + 'pad.ttl');
      //var newIndexDoc = kb.sym(newBase + 'index.html');
      if (kb.holds(meeting, ns.meeting('sharedNotes'))){
        console.log("Ignored - already have a shared notepad");
        return // already got one
      }

      newInstance = kb.sym(newPadDoc.uri + '#thisPad');

      kb.add(newInstance, ns.rdf('type'), ns.pad('Notepad'), newPadDoc);
      kb.add(newInstance, ns.dc('title'), 'Shared Notes', newPadDoc)
	    kb.add(newInstance, ns.dc('created'), new Date(), newPadDoc);
	    if (me) {
		      kb.add(newInstance, ns.dc('author'), me, newPadDoc);
	    }
	    kb.add(newInstance, ns.pad('next'), newInstance, newPadDoc); // linked list empty

	    // Keep a paper trail   @@ Revisit when we have non-public ones @@ Privacy
	    // kb.add(newInstance, UI.ns.space('inspiration'), thisInstance, padDoc);
	    // kb.add(newInstance, UI.ns.space('inspiration'), thisInstance, newPadDoc);

      updater.put(
        newPadDoc,
        kb.statementsMatching(undefined, undefined, undefined, newPadDoc),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok) {
              addInNewThing(newInstance, ns.meeting('sharedNotes'))
          } else {
              complain("FAILED to save new notepad at: "+ there.uri +' : ' + message);
          };
      })
    }

    var makeAgenda = function(event, icon){
      selectTool(icon);

    }

    var makeActions = function(event, icon){
      selectTool(icon);

    }

    var makeChat = function(event, icon){
      var newBase = meetingBase + 'Chat/'
      var kb = UI.store
      selectTool(icon);
      if (kb.holds(meeting, ns.meeting('chat'))){
        console.log("Ignored - already have chat");
        return // already got one
      }
      var messageStore = kb.sym(newBase + 'chat.ttl');

      kb.add(messageStore, ns.dc('title'), 'Chat', meetingDoc)
      kb.add(messageStore, ns.rdf('type'), ns.meeting('Chat'), meetingDoc)

      // Flag its type in the chat itself as well as in the master meeting config file
      kb.add(messageStore, ns.rdf('type'), ns.meeting('Chat'), messageStore)

      updater.put(
        messageStore,
        kb.statementsMatching(undefined, undefined, undefined, messageStore),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok) {
              addInNewThing(messageStore, ns.meeting('chat'))
          } else {
              complain("FAILED to save new chat at: "+ there.uri +' : ' + message);
          };
      })
    }

    var makeVideoCall = function(event, icon){
      selectTool(icon);

      var kb = UI.store
      var newInstance = $rdf.sym('https://appear.in/' + UI.utils.gen_uuid())

      if (kb.holds(meeting, ns.meeting('videoCallPage'))){
        console.log("Ignored - already have a videoCallPage");
        return // already got one
      }

      kb.add(newInstance, ns.rdf('type'), ns.meeting('VideoCallPage'), meetingDoc);
      kb.add(newInstance, ns.dc('title'), 'Video call', meetingDoc)
      addInNewThing(newInstance, ns.meeting('videoCallPage'))

    }

    var makeAttachment = function(event, icon){
      selectTool(icon);
    }

    ///////////////////////////////////

    var toolIcons = [
      { icon: 'noun_339237.svg', maker: makeGroup, limit: 1},
      { icon: 'noun_346777.svg', maker: makePoll }, // When meet THIS or NEXT time
      { icon: 'noun_48218.svg', maker: makeAgenda, limit:1 }, // When meet THIS or NEXT time
      { icon: 'noun_79217.svg', maker: makePad },
      { icon: 'noun_346319.svg', maker: makeChat, limit:1 },
      { icon: 'noun_17020.svg', maker: makeActions, limit: 1}, // When meet THIS or NEXT time
      { icon: 'noun_260227.svg', maker: makeVideoCall, limit: 1},
      { icon: 'noun_25830.svg', maker: makeAttachment }
    ]

    var iconStyle = 'padding: 1em; width: 3em; height: 3em;'
    var star = bottomTR.appendChild(dom.createElement('img'))
    var visible = false; // the inividual tools tools
    star.setAttribute('src', UI.icons.iconBase + 'noun_272948.svg')
    star.setAttribute('style', iconStyle)
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
        var icon = bottomTR.appendChild(dom.createElement('img'))
        icon.setAttribute('src', UI.icons.iconBase + toolIcons[i].icon)
        icon.setAttribute('style', iconStyle + "display: none;")
        iconArray.push(icon)
        icon.tool = toolIcons[i]
        var maker = toolIcons[i].maker
        icon.addEventListener('click', function(e){
            maker(e, icon)
        })
      }
      foo()
    }

    var styleTheIcons = function(style){
      for (var i=0; i<iconArray.length; i++){
        iconArray[i].setAttribute('style', iconStyle + style) // eg 'background-color: #ccc;'
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

    var showMain = function(containerDiv, subject){
      containerDiv.innerHTML = ''
      if (subject.sameTerm(subject.doc())){
        var iframe = containerDiv.appendChild(dom.createElement('iframe'))
        iframe.setAttribute('src', subject.uri)
        iframe.setAttribute('style', 'height: 350px; border: 0; margin: 0; padding: 0; resize:both; width: 100%;')
        //tabContentCache[subject.uri] = iframe
      } else {
        var table = containerDiv.appendChild(dom.createElement('table'))
        UI.outline.GotoSubject(subject, true, undefined, false, undefined, table)
      }
    }

    options = {dom: dom}
    options.predicate = ns.meeting('toolList')
    options.subject = subject
    options.ordered = true
    options.orientation = 1 // tabs on LHS
    options.showMain = showMain
    var tabs = mainTR.appendChild(UI.tabs.tabWidget(options));

    UI.aclControl.preventBrowserDropEvents(dom)
    addTargetListeners(tabs.tabContainer)
    addTargetListeners(bottomTR)

    return div
  }
}

// ends
