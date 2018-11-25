/*   Long Chat Pane
**
**  A long chat consists a of a series of chat files saved by date.
*/
/* global alert */

const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store
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
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.
  @prefix ui: <http://www.w3.org/ns/ui#>.
  @prefix : <#>.

  :this
    <http://purl.org/dc/elements/1.1/title> "Chat preferences" ;
    a ui:Form ;
    ui:part :colorizeByAuthor, :expandImagesInline, :newestFirst, :inlineImageHeightEms;
    ui:parts ( :colorizeByAuthor :expandImagesInline :newestFirst :inlineImageHeightEms ).

:colorizeByAuthor a ui:TristateField; ui:property solid:colorizeByAuthor;
  ui:label "Color user input by user".
:expandImagesInline a ui:TristateField; ui:property solid:expandImagesInline;
  ui:label "Expand image URLs inline".
:newestFirst a ui:TristateField; ui:property solid:newestFirst;
  ui:label "Newest messages at the top".

:inlineImageHeightEms a ui:IntegerField; ui:property solid:inlineImageHeightEms;
  ui:label "Inline image height (lines)".

`
    const preferencesForm = kb.sym('https://solid.github.io/solid-panes/longCharPane/preferencesForm.ttl#this')
    const preferencesFormDoc = preferencesForm.doc()
    if (!kb.holds(undefined, undefined, undefined, preferencesFormDoc)) { // If not loaded already
      $rdf.parse(preferencesFormText, kb, preferencesFormDoc.uri, 'text/turtle') // Load form directly
    }
    let preferenceProperties = kb.statementsMatching(null, ns.ui.property, null, preferencesFormDoc).map(st => st.object)

    //          Menu
    //
    // Build a menu a the side (@@ reactive: on top?)
    function menuHandler (event, subject, menuOptions) {
      let div = menuOptions.div
      let dom = menuOptions.dom
      // let me = menuOptions.me

      div.menuExpaded = !div.menuExpaded
      if (div.menuExpaded) { // Expand
        let menuArea = div.appendChild(dom.createElement('div'))
        // @@ style below fix .. just make it onviious while testing
        menuArea.style = 'border-radius: 1em; border: 0.1em solid purple; padding: 1em;'
        let menuTable = menuArea.appendChild(dom.createElement('table'))

        let participantsArea = menuTable.appendChild(dom.createElement('tr'))
        let registrationArea = menuTable.appendChild(dom.createElement('tr'))
        let preferencesArea = menuTable.appendChild(dom.createElement('tr'))
        // let commandsArea = menuTable.appendChild(dom.createElement('tr'))
        let statusArea = menuTable.appendChild(dom.createElement('tr'))

        UI.pad.manageParticipation(dom, participantsArea, subject.doc(), subject, menuOptions.me, {})

        var context = {noun: 'chat room', me: menuOptions.me, statusArea: statusArea, div: registrationArea, dom: dom}
        UI.authn.registrationControl(context, subject, mainClass).then(function (context) {
          console.log('Registration control finsished.')
        })

        var context2 = {noun: 'chat room', me: menuOptions.me, statusArea: statusArea, div: preferencesArea, dom, kb}
        if (!menuOptions.me) alert('menu: no me!')
        preferencesArea.appendChild(UI.preferences.renderPreferencesForm(subject, mainClass, preferencesForm, context2))

        div.menuArea = menuArea
      } else { // Close menu  (hide or delete??)
        div.removeChild(div.menuArea)
      }
    } // menuHandler

    var div = dom.createElement('div')
    div.setAttribute('class', 'chatPane')
    let options = {infinite: true, menuHandler: menuHandler} // Like newestFirst
    let context = {noun: 'chat room', div, dom}
    context.me = UI.authn.currentUser() // If already logged on

    UI.preferences.getPreferencesForClass(subject, mainClass, preferenceProperties, context).then(prefMap => {
      for (let propuri in prefMap) {
        options[propuri.split('#')[1]] = prefMap[propuri]
      }
      div.appendChild(UI.infiniteMessageArea(dom, kb, subject, options))
    }, err => UI.widgets.complain(err))

    return div
  }
}
