/*   Meeting materials and tools Pane
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
  //  returns: A promise of a meeting object
  //
  mint: function(base, context){
    return new Promise(function(resolve, reject){
      var kb = UI.store, ns = UI.ns
      var meeting = kb.sym(base + 'index.ttl#this')
      var meetingDoc = meeting.doc()

      var me = tabulator.preferences.get('me')
      me = me ? kb.sym(me) : null
      if (me){
        kb.add(meeting, ns.dc('author'), me, meetingDoc)
      }

      kb.add(meeting, ns.rdf('type'), ns.meeting('Meeting'), meetingDoc)
      kb.add(meeting, ns.dc('created'), new Date(), meetingDoc)
      var toolList = new $rdf.Collection()
      kb.add(meeting, ns.meeting('toolList'), toolList , meetingDoc)

      toolList.elements.push(meeting) // Add the meeting itself - see showMain()

      kb.updater.put(
        meetingDoc,
        kb.statementsMatching(undefined, undefined, undefined, meetingDoc),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok){
            resolve(meeting)
          } else {
              reject('Error writing meeting configuration: ' + err)
          }
        })
    })
  },

  // Returns a div

  render: function (subject, dom) {
    var kb = UI.store, ns = UI.ns
    var updater = kb.updater
    var thisPane = this

    var complain = function complain (message, color) {
      console.log(message)
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    var complainIfBad = function(ok, message){
      if (!ok) complain(message)
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

    topTR.setAttribute('style','height: 2em;') // spacer if notthing else

    var me = null; // @@ Put code to find out logged in person





    var saveBackMeetingDoc = function(){
      updater.put(
        meetingDoc,
        kb.statementsMatching(undefined, undefined, undefined, meetingDoc),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok) {
              tabs.refresh()
              resetTools()
          } else {
              message = "FAILED to save new thing at: "+ meetingDoc +' : ' + message
              complain(message)
          };
      })
    }

    var saveAppDocumentLinkAndAddNewThing = function(tool, thing, pred){
      var appDoc = thing.doc()
      if (pred) {
        kb.add(meeting, pred, thing, appDoc) // Specific Link back to meeting
      }
      kb.add(thing, ns.meeting('parentMeeting'), meeting, appDoc) // Generic link back to meeting
      updater.put(
        appDoc,
        kb.statementsMatching(undefined, undefined, undefined, appDoc),
        'text/turtle',
        function(uri2, ok, message) {
          if (ok) {
              saveBackMeetingDoc()
          } else {
              complain("FAILED to save new tool at: "+ thing +' : ' + message);
          };
      })
    }

    var makeToolNode = function(target, pred, label, iconURI){
      kb.add(meeting, pred, target, meetingDoc)
      var x = UI.widgets.newThing(meetingDoc)
      if (label) kb.add(x, ns.rdfs('label'), label, meetingDoc)
      if (iconURI) kb.add(x, ns.meeting('icon'), kb.sym(iconURI), meetingDoc)
      kb.add(x, ns.rdf('type'), ns.meeting('Tool'), meetingDoc)
      kb.add(x, ns.meeting('target'), target, meetingDoc)
      var toolList = kb.the(meeting, ns.meeting('toolList'))
      toolList.elements.push(x)
      return x
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
        console.log('@@ WARNING non-standard drop event: ' + uris[0])
      }
      console.log('Dropped URI list (2): ' + uris)
      if (uris) {
        uris.map(function (u) {
          var target = $rdf.sym(u) // Attachment needs text label to disinguish I think not icon.
          console.log('Dropped on attachemnt ' + u) // icon was: UI.icons.iconBase + 'noun_25830.svg'
          var tool = makeToolNode(target, UI.ns.wf('attachment'), UI.utils.label(target), null)
          kb.add(tool, UI.ns.meeting('view'), 'iframe', meetingDoc)
          saveBackMeetingDoc()
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
      var newBase = meetingBase + 'Group/'
      var kb = UI.store
      var newDetailsDoc = kb.sym(newBase + 'poll.ttl');
      if (kb.holds(meeting, ns.meeting('particpants'))){
        console.log("Ignored - already have set up your particpants");
        return // already got one
      }

      var div = dom.createElement('div')
      var context = {dom: dom, div: div}
      var book
      UI.widgets.findAppInstances(context, ns.vcard('AddressBook')).then(
        function(context){
          if (context.instances.length === 0) {
            complain('You have no solid address book. It is really handy to have one to keep track of people and groups')
          } else if (context.instances.length > 1) {
            var s = context.instances.map(function(x){return '' + x}).join(', ')
            complain('You have more than one solid address book: ' + s + ' Not supported yet.')
          } else { // addressbook
            book = context.instances[0]
            var tool = makeToolNode(book, ns.meeting('addressBook'), 'Particpants', UI.icons.iconBase + 'noun_15695.svg') // group: noun_339237.svg
            kb.add(tool, UI.ns.meeting('view'), 'contact', meetingDoc)
            saveBackMeetingDoc()
          }
        }
      )
    }

    var makePoll = function(event, icon){
      selectTool(icon);

      var newBase = meetingBase + 'Schedule/'
      var kb = UI.store
      var newDetailsDoc = kb.sym(newBase + 'poll.ttl');
      if (kb.holds(meeting, ns.meeting('schedulingPoll'))){
        console.log("Ignored - already have a scheduling poll");
        return // already got one
      }

      var options = { useExisting: meeting, noIndexHTML: true} // Regard the meeting as being the schedulable event itself.

      var div = UI.panes.byName('schedule').mintNew(options, function(ok, newInstance){
        if (ok) {
          var tool = makeToolNode(newInstance, ns.meeting('schedulingPoll'), 'Schedule poll', UI.icons.iconBase + 'noun_346777.svg')
          kb.add(tool, UI.ns.meeting('view'), 'schedule', meetingDoc)
          saveBackMeetingDoc()
        } else {
          complain('Error making new scheduler: ' + newInstance)
        }
      })
    }

    //   Make Pad for notes of meeting

    var makePad = function(event, icon){
      selectTool(icon);
      var newBase = meetingBase + 'SharedNotes/'
      var kb = UI.store

      if (kb.holds(meeting, ns.meeting('sharedNotes'))){
        console.log("Ignored - already have a shared notepad");
        return // already got one
      }

      var newInstance = kb.sym(newBase + 'pad.ttl#thisPad');
      var newPadDoc = newInstance.doc()

      kb.add(newInstance, ns.rdf('type'), ns.pad('Notepad'), newPadDoc);
      kb.add(newInstance, ns.dc('title'), 'Shared Notes', newPadDoc)
	    kb.add(newInstance, ns.dc('created'), new Date(), newPadDoc);
	    if (me) {
		      kb.add(newInstance, ns.dc('author'), me, newPadDoc);
	    }
	    kb.add(newInstance, ns.pad('next'), newInstance, newPadDoc); // linked list empty
      var tool = makeToolNode(newInstance, ns.meeting('sharedNotes'), 'Shared Notes', UI.icons.iconBase + 'noun_79217.svg')

      saveAppDocumentLinkAndAddNewThing(tool, newInstance, ns.meeting('sharedNotes'))
    }

    var makeAgenda = function(event, icon){
      selectTool(icon);
    }

    var makeActions = function(event, icon){
      selectTool(icon);
      var newBase = meetingBase + 'Actions/'
      var kb = UI.store
      if (kb.holds(meeting, ns.meeting('actions'))){
        console.log("Ignored - already have chat");
        return // already got one
      }
      var appDoc = kb.sym(newBase + 'config.ttl');
      var newInstance = kb.sym(newBase + 'config.ttl#this');
      var stateStore = kb.sym(newBase + 'state.ttl');

      //kb.add(newInstance, ns.dc('title'), 'Actions', appDoc)

      kb.add(newInstance, ns.wf('issueClass'), ns.wf('Task'), appDoc)
      kb.add(newInstance, ns.wf('initialState'), ns.wf('Open'), appDoc)
      kb.add(newInstance, ns.wf('stateStore'), stateStore, appDoc)
      kb.add(newInstance, ns.wf('assigneeClass'), ns.foaf('Person'), appDoc) // @@ set to people in the meeting?

      kb.add(newInstance, ns.rdf('type'), ns.wf('Tracker'), appDoc)

      // Flag its type in the chat itself as well as in the master meeting config file
      kb.add(newInstance, ns.rdf('type'), ns.wf('Tracker'), appDoc)
      var tool = makeToolNode(newInstance, ns.meeting('actions'), 'Actions', UI.icons.iconBase + 'noun_17020.svg')
      saveAppDocumentLinkAndAddNewThing(tool, newInstance, ns.meeting('actions'))
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

      kb.add(messageStore, ns.rdf('type'), ns.meeting('Chat'), messageStore)

      var tool = makeToolNode(messageStore, ns.meeting('chat'), 'Chat',
        UI.icons.iconBase + 'noun_346319.svg')
      saveAppDocumentLinkAndAddNewThing(tool, messageStore, ns.meeting('chat'))
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
      var tool = makeToolNode(newInstance, ns.meeting('videoCallPage'), 'Video call', UI.icons.iconBase + 'noun_260227.svg')
      kb.add(tool, ns.meeting('view'), 'iframe', meetingDoc)
      saveBackMeetingDoc()
    }

    var makeAttachment = function(event, icon){
      selectTool(icon);
    }

    var makeMeeting = function(event, icon){ // @@@ make option of continuing series
      selectTool(icon);
      var appDetails = { noun: 'meeting'}
      var gotWS = function(ws, base){
        thisPane.mint(base, {}).then(function(newInstance){
          bottomTR.removeChild(mintUI)
          var p = bottomTR.appendChild(dom.createElement('p'))
          p.setAttribute('style', 'font-size: 140%;')
          p.innerHTML =
            "Your <a target='newMeeting' href='" + newInstance.uri + "'><b>new meeting</b></a> is ready to be set up. " +
            "<br/><br/><a target='newMeeting' href='" + newInstance.uri + "'>Go to your new meeting.</a>"
        }).catch(function(err){
          bottomTR.removeChild(mintUI)
          bottomTR.appendChild(UI.widgets.errorMessageBlock(dom, err))
        })
      }
      var mintUI = UI.widgets.selectWorkspace(dom, appDetails, gotWS)
      bottomTR.appendChild(mintUI)
    }

    ///////////////////////////////////

    var toolIcons = [
      { icon: 'noun_339237.svg', maker: makeGroup, hint: 'Make a group of people', limit: 1 },
      { icon: 'noun_346777.svg', maker: makePoll, hint: 'Make a poll to schedule the meeting'}, // When meet THIS or NEXT time
      { icon: 'noun_48218.svg', maker: makeAgenda, limit:1 , hint: 'Add an agenda list', disabled: true}, // When meet THIS or NEXT time
      { icon: 'noun_79217.svg', maker: makePad, hint: 'Add a shared notepad'},
      { icon: 'noun_346319.svg', maker: makeChat, limit:1, hint: 'Add a chat channel for the meeting'},
      { icon: 'noun_17020.svg', maker: makeActions, limit: 1, hint: 'Add a list of action items'}, // When meet THIS or NEXT time
      { icon: 'noun_260227.svg', maker: makeVideoCall, limit: 1, hint: 'Add a video call for the meeting'},
      { icon: 'noun_25830.svg', maker: makeAttachment, hint: 'Attach meeting materials', disabled: true},
      { icon: 'noun_66617.svg', maker: makeMeeting, hint: 'Make a new separate meeting', disabled: false}
    ] // 'noun_66617.svg'

    var iconStyle = 'padding: 1em; width: 3em; height: 3em;'
    var star = bottomTR.appendChild(dom.createElement('img'))
    var visible = false; // the inividual tools tools
    star.setAttribute('src', UI.icons.iconBase + 'noun_19460_green.svg') //  noun_272948.svg
    star.setAttribute('style', iconStyle + 'opacity: 50%;')
    star.setAttribute('title', 'Add another tool to the meeting')
    var selectNewTool = function(event){
      visible = !visible
      star.setAttribute('style', iconStyle + (visible? 'background-color: yellow;': ''));
      styleTheIcons(visible? '' : 'display: none;')
    }
    // star.addEventListener('click', selectNewTool)
    var resetIcons = function(){
      star.setAttribute('style', iconStyle)
    }


    var loginOutButton
    UI.widgets.checkUser(subject.doc(), function(id){
      if (id) {
        star.addEventListener('click', selectNewTool)
        star.setAttribute('style', iconStyle)
        return
      }
      loginOutButton = UI.widgets.loginStatusBox(dom, function(webid){
          if (webid) {
              tabulator.preferences.set('me', webid.uri);
              console.log("(Logged in as "+ webid+")")
              me = webid;
              bottomTR.removeChild(loginOutButton)
              // loginOutButton.setAttribute('',iconStyle) // make it match the icons
              star.addEventListener('click', selectNewTool)
              star.setAttribute('style', iconStyle)
          } else {
              tabulator.preferences.set('me', '');
              console.log("(Logged out)")
              me = null;
          }
      });
      loginOutButton.setAttribute('style', 'margin: 0.5em 1em;');
      bottomTR.appendChild(loginOutButton);

    })



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

    ////////////////////////////////


    var renderTab = function(div, item){
      if (kb.holds(item, ns.rdf('type'), ns.meeting('Tool'))) {
        var target = kb.any(item, ns.meeting('target'))
        var label = kb.any(item, ns.rdfs('label'))
        label = label ? label.value : UI.utils.label(item)
        var icon = kb.any(item, ns.meeting('icon'))
        if (icon){
          var img = div.appendChild(dom.createElement('img'))
          img.setAttribute('src', icon.uri)
          img.setAttribute('style', 'max-width: 3em; max-height: 3em;') // @
          img.setAttribute('title', label)
        } else {
          div.textContent = label
        }
      } else {
        div.textContent = UI.utils.label(item)
      }
    }

    var tipDiv = function(text){
      var d = dom.createElement('div')
      var p = d.appendChild(dom.createElement('p'))
      p.setAttribute('style', 'margin: 0em; padding:3em; color: #888;')
      p.textContent = 'Tip: ' + text
      return d
    }

    var renderTabSettings = function(containerDiv, subject){
      containerDiv.innerHTML = ''
      containerDiv.style += "border-color: #eed;"
      containerDiv.appendChild(dom.createElement('h3')).textContent = 'Adjust this tab'
      if (kb.holds(subject, ns.rdf('type'), ns.meeting('Tool'))){
        var form = $rdf.sym('https://linkeddata.github.io/solid-app-set/meeting/meetingDetailsForm.ttl#settings')
        UI.store.fetcher.nowOrWhenFetched(form, function(ok, message){
          if (!ok) return complainIfBad(ok, message)
          UI.widgets.appendForm(document, containerDiv, {}, subject, form, meeting.doc(), complainIfBad)
          var delButton = UI.widgets.deleteButtonWithCheck(dom, containerDiv, 'tab', function () {
            var toolList = kb.the(meeting, ns.meeting('toolList'))
            for (var i=0; i < toolList.elements.length; i++){
              if (toolList.elements[i].sameTerm(subject)){
                toolList.elements.splice(i, 1)
                break
              }
            }
            var target = kb.any(subject, ns.meeting('target'))
            var ds = kb.statementsMatching(subject).
              concat(kb.statementsMatching(undefined, undefined, subject)).
              concat(kb.statementsMatching(meeting, undefined, target))
            kb.remove(ds) // Remove all links to and from the tab node
            saveBackMeetingDoc()
          })
          // delButton.setAttribute('class', '')
          // delButton.setAttribute('style', 'height: 2em; width: 2em; margin: 1em; border-radius: 0.5em; padding: 1em; font-size: 120%; background-color: red; color: white;')
          // delButton.textContent = 'Delete this tab'
          containerDiv.appendChild(tipDiv(
            'Drag URL-bar icons of web pages into the tab bar on the left to add new meeting materials.'))
        })
      } else {
        containerDiv.appendChild(dom.createElement('h4')).textContent = '(No adjustments available)'
      }
    }

    var showMain = function(containerDiv, subject){
      var pane = null, table
      containerDiv.innerHTML = ''
      var complainIfBad = function(ok, message){
        if (!ok){
          containerDiv.textContent = '' + message
        }
      }
      var showIframe = function(target){
        var iframe = containerDiv.appendChild(dom.createElement('iframe'))
        iframe.setAttribute('src', target.uri)
        // iframe.setAttribute('style', 'height: 350px; border: 0; margin: 0; padding: 0; resize:both; width: 100%;')
        iframe.setAttribute('style', 'border: none; margin: 0; padding: 0; height: 100%; width: 100%;')
      }
      var showDetails = function(){
        containerDiv.appendChild(dom.createElement('h3')).textContent = 'Details of meeting'
        var form = $rdf.sym('https://linkeddata.github.io/solid-app-set/meeting/meetingDetailsForm.ttl#main')
        UI.store.fetcher.nowOrWhenFetched(form, function(xhr){
          UI.widgets.appendForm(document, containerDiv, {}, meeting, form, meeting.doc(), complainIfBad)
            containerDiv.appendChild(tipDiv(
            'Drag URL-bar icons of web pages into the tab bar on the left to add new meeting materials.'))
            me = tabulator.preferences.get('me')
            me = me ? kb.sym(me) : null
            if (me){
              kb.add(meeting, ns.dc('author'), me, meetingDoc)
            }
          var context = { noun: 'meeting', me: me, statusArea: containerDiv, div: containerDiv, dom: dom}
          UI.widgets.registrationControl(context, meeting, ns.meeting('Meeting')).then(function(context){
            console.log("Registration control finsished.")
          })
          var options = {}
          UI.pad.manageParticipation(dom, containerDiv, meetingDoc, meeting, me, options)

        })
      }
      if (kb.holds(subject, ns.rdf('type'), ns.meeting('Tool'))) {
        var target = kb.any(subject, ns.meeting('target'))
        if (target.sameTerm(meeting) && !kb.any(subject, ns.meeting('view'))){ // self reference? force details form
          showDetails() // Legacy meeting instances
        } else {
          var view = kb.any(subject, ns.meeting('view'))
          view = view ? view.value : null
          if (view === 'details'){
            showDetails()
          } else if (view === 'iframe'){
            showIframe(target)
          } else {
            var pane = view? UI.panes.byName(view) : null
            table = containerDiv.appendChild(dom.createElement('table'))
            UI.outline.GotoSubject(target, true, pane, false, undefined, table)
          }
        }
      } else if (subject.sameTerm(meeting)){ // self reference? force details form
        showDetails()
      } else if (subject.sameTerm(subject.doc()) &&
        !kb.holds(subject, UI.ns.rdf('type'), UI.ns.meeting('Chat')) &&
          !kb.holds(subject, UI.ns.rdf('type'), UI.ns.meeting('PaneView'))){

      } else {
        table = containerDiv.appendChild(dom.createElement('table'))
        UI.outline.GotoSubject(subject, true, undefined, false, undefined, table)
      }
    }

    options = {dom: dom}
    options.predicate = ns.meeting('toolList')
    options.subject = subject
    options.ordered = true
    options.orientation = 1 // tabs on LHS
    options.showMain = showMain
    options.renderTab = renderTab
    options.renderTabSettings = renderTabSettings
    var tabs = mainTR.appendChild(UI.tabs.tabWidget(options));

    UI.aclControl.preventBrowserDropEvents(dom)
    addTargetListeners(tabs.tabContainer)
    addTargetListeners(bottomTR)


    return div
  }
}

// ends
