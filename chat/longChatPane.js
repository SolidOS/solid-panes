/*   Long Chat Pane
**
**  A long chat consists a of a series of chat files saved by date.
*/

const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store
const panes = require('../paneRegistry')
const mainClass = ns.meeting('LongChat') // @@ something from SIOC?

module.exports = { // noun_704.svg Canoe   noun_346319.svg = 1 Chat  noun_1689339.svg = three chat
  icon: UI.icons.iconBase + 'noun_1689339.svg',

  name: 'long chat',

  label: function (subject) {
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('LongChat'))) { // subject is the object
      return 'Chat channnel'
    }
    return null // Suppress pane otherwise
  },

  mintClass: mainClass,

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
  /*
    function complain (message, color) {
      var pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
*/


    /* Preferences
    **
    **  Things like whether to color text by author webid, to expand image URLs inline,
    ** expanded inline image height. ...
    ** In general, preferences can be set per user, per user/app combo, per instance,
    ** and per instance/user combo. Per instance? not sure about unless it is valuable
    ** for everyone to be seeing the same thing.
    */

    const preferencesFormText = `
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
    @prefix ui: <http://www.w3.org/ns/ui#>.
    @prefix : <#>.

    <http://www.w3.org/2006/vcard/ns#Individual>
        ui:creationForm <#form1> .


    <#form1>
        <http://purl.org/dc/elements/1.1/title> "Chat preferences" ;
        a ui:Form ;
        ui:part
            <#fullNameField>,   <#roleField>,   <#fullNameFieldC>, <#addressesComment>, <#addresses>,
            <#emailComment>, <#eMails>,
            <#telephoneComment>, <#telephones>, <#noteComment>, <#noteField> ;
        ui:parts (
                    <#fullNameField>  <#roleField> <#fullNameFieldC>
                     <#addressesComment> <#addresses>
                    <#emailComment> <#eMails>
                    <#telephoneComment> <#telephones> <#noteComment> <#noteField> ) .

        <#fullNameField>
            a <http://www.w3.org/ns/ui#SingleLineTextField> ;
`
    var preferencesForm = kb.sym('https://solid.github.io/solid-panes/longCharPane/preferencesForm.ttl#this')
    var preferencesFormDoc = preferencesForm.doc()
    if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
      $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle') // Load form directly
    }

    var partipation
    function preferences (subject, context) {
      participation = participation || UI.pad.recordParticipation(subject, subject.doc())
      let dom = context.dom
      let prefContainer = dom.createElement('div')
/*
      let table = dom.createElement('table')
      let row = table.appendChild(dom.createElement('tr'))
      let predicate = ns.solid('colorInputByAuthor')
      let cell = row.appendChild(dom.createElement('td'))
*/
      UI.widgets.appendForm(dom, prefContainer, {}, subject, preferencesForm, subject.doc(), complainIfBad)

      // @@ add a form with checkboxes for binary Options
      // Look for user-specific instance-generic options
      return prefContainer
    }


    //          Menu
    //
    // Build a menu a the side (@@ reactive: on top?)
    function menuHandler (event, subject, menuOptions) {
      let div = menuOptions.div
      let dom = menuOptions.dom
      div.menuExpaded = !div.menuExpaded
      if (div.menuExpaded) { // Expand
        let menuArea = div.appendChild(dom.createElement('div'))
        // @@ style below fix .. just make it onviious while testing
        menuArea.style = 'border-radius: 1em; border: 0.1em solid purple; padding: 1em;'
        let menuTable = menuArea.appendChild(dom.createElement('table'))

        let participantsArea = menuTable.appendChild(dom.createElement('tr'))
        let registrationArea = menuTable.appendChild(dom.createElement('tr'))
        let commandsArea = menuTable.appendChild(dom.createElement('tr'))
        let statusArea = menuTable.appendChild(dom.createElement('tr'))

        UI.pad.manageParticipation(dom, participantsArea, subject.doc(), subject, menuOptions.me, {})

        var context = {noun: 'chat room', me: menuOptions.me, statusArea: statusArea, div: registrationArea, dom: dom}
        UI.authn.registrationControl(context, subject, mainClass).then(function (context) {
          console.log('Registration control finsished.')
        })

        let c1 = commandsArea.appendChild(dom.createElement('td'))
        let dropTarget = UI.widgets.button(dom, UI.icons.iconBase + 'noun_748003.svg', 'Drop to upload')
        c1.appendChild(dropTarget)

        let c2 = commandsArea.appendChild(dom.createElement('td'))
        let gistButton = UI.widgets.button(dom, UI.icons.iconBase + 'noun_681601.svg', 'Make gist text file')
        c2.appendChild(gistButton)
        gistButton.addEventListener('click', event => {
          let newBase = menuOptions + 'Gists/'
          let options = {dom: dom, div: statusArea, newBase}
          let pane = panes.byName('source')
          pane.mintNew(options)
            .then(function (options) { // Add a message pointing to the gist

            })
        }, false)

        div.menuArea = menuArea
      } else { // Close menu  (hide or delete??)
        div.removeChild(div.menuArea)
      }
    } // menuHandler

    var div = dom.createElement('div')
    div.setAttribute('class', 'chatPane')
    let options = {infinite: true, menuHandler: menuHandler} // Like newestFirst

    /*
    var messageStore
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('LongChat'))) { // subject may be the file
      messageStore = subject.doc()
    } else {
      complain('Unknown chat type')
    }
    */

    div.appendChild(UI.infiniteMessageArea(dom, kb, subject, options))

    return div
  }
}
