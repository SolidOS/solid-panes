/*
 **                 Pane for running existing forms for any object
 **
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')
const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_122196.svg',

  name: 'form',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve this pane?
  label: function (subject) {
    const n = UI.widgets.formsFor(subject).length
    UI.log.debug('Form pane: forms for ' + subject + ': ' + n)
    if (!n) return null
    return '' + n + ' forms'
  },

  render: function (subject, context) {
    const kb = context.session.store
    const dom = context.dom

    const mention = function complain (message, style) {
      const pre = dom.createElement('p')
      pre.setAttribute('style', style || 'color: grey; background-color: white')
      box.appendChild(pre).textContent = message
      return pre
    }

    const complain = function complain (message, style) {
      mention(message, 'style', style || 'color: grey; background-color: #fdd;')
    }

    const complainIfBad = function (ok, body) {
      if (ok) {
        // setModifiedDate(store, kb, store);
        // rerender(box);   // Deleted forms at the moment
      } else complain('Sorry, failed to save your change:\n' + body)
    }

    // The question of where to store this data about subject
    // This in general needs a whole lot more thought
    // and it connects to the discoverbility through links

    // var t = kb.findTypeURIs(subject)

    const me = UI.authn.currentUser()

    var box = dom.createElement('div')
    box.setAttribute('class', 'formPane')

    if (!me) {
      mention(
        'You are not logged in. If you log in and have ' +
          'workspaces then you would be able to select workspace in which ' +
          'to put this new information'
      )
    } else {
      const ws = kb.each(me, ns.ui('workspace'))
      if (ws.length === 0) {
        mention(
          "You don't seem to have any workspaces defined.  " +
            'A workspace is a place on the web (http://..) or in ' +
            'the file system (file:///) to store application data.\n'
        )
      } else {
        // @@
      }
    }

    // Render forms using a given store

    const renderFormsFor = function (store, subject) {
      kb.fetcher.nowOrWhenFetched(store.uri, subject, function (ok, body) {
        if (!ok) return complain('Cannot load store ' + store.uri + ': ' + body)

        //              Render the forms

        const forms = UI.widgets.formsFor(subject)

        // complain('Form for editing this form:');
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i]
          const heading = dom.createElement('h4')
          box.appendChild(heading)
          if (form.uri) {
            const formStore = $rdf.Util.uri.document(form)
            if (formStore.uri !== form.uri) {
              // The form is a hash-type URI
              const e = box.appendChild(
                UI.widgets.editFormButton(
                  dom,
                  box,
                  form,
                  formStore,
                  complainIfBad
                )
              )
              e.setAttribute('style', 'float: right;')
            }
          }
          const anchor = dom.createElement('a')
          anchor.setAttribute('href', form.uri)
          heading.appendChild(anchor)
          anchor.textContent = UI.utils.label(form, true)

          /*  Keep tis as a reminder to let a New one have its URI given by user
          mention("Where will this information be stored?")
          var ele = dom.createElement('input');
          box.appendChild(ele);
          ele.setAttribute('type', 'text');
          ele.setAttribute('size', '72');
          ele.setAttribute('maxlength', '1024');
          ele.setAttribute('style', 'font-size: 80%; color:#222;');
          ele.value = store.uri
          */

          UI.widgets.appendForm(
            dom,
            box,
            {},
            subject,
            form,
            store,
            complainIfBad
          )
        }
      }) // end: when store loded
    } // renderFormsFor

    // Figure out what store

    // Which places are editable and have stuff about the subject?

    let store = null

    // 1. The document URI of the subject itself
    const docuri = $rdf.Util.uri.docpart(subject.uri)
    if (subject.uri !== docuri && kb.updater.editable(docuri, kb)) {
      store = subject.doc()
    } // an editable data file with hash

    store = store || kb.any(kb.sym(docuri), ns.link('annotationStore'))

    // 2. where stuff is already stored
    if (!store) {
      const docs = {}
      const docList = []
      store.statementsMatching(subject).forEach(function (st) {
        docs[st.why.uri] = 1
      })
      store
        .statementsMatching(undefined, undefined, subject)
        .forEach(function (st) {
          docs[st.why.uri] = 2
        })
      for (const d in docs) docList.push(docs[d], d)
      docList.sort()
      for (var i = 0; i < docList.length; i++) {
        const uri = docList[i][1]
        if (uri && store.updater.editable(uri)) {
          store = store.sym(uri)
          break
        }
      }
    }

    // 3. In a workspace store
    // @@ TODO: Can probably remove _followeach (not done this time because the commit is a very safe refactor)
    var _followeach = function (kb, subject, path) {
      if (path.length === 0) return [subject]
      const oo = kb.each(subject, path[0])
      let res = []
      for (let i = 0; i < oo.length; i++) {
        res = res.concat(_followeach(kb, oo[i], path.slice(1)))
      }
      return res
    }

    const date = '2014' // @@@@@@@@@@@@ pass as parameter

    if (store) {
      // mention("@@ Ok, we have a store <" + store.uri + ">.");
      renderFormsFor(store, subject)
    } else {
      complain('No suitable store is known, to edit <' + subject.uri + '>.')
      const foobarbaz = UI.authn.selectWorkspace(dom, function (ws) {
        mention('Workspace selected OK: ' + ws)

        const activities = store.each(undefined, ns.space('workspace'), ws)
        for (let j = 0; j < activities.length; i++) {
          const act = activities[j]

          const subjectDoc2 = store.any(ws, ns.space('store'))
          const start = store.any(ws, ns.cal('dtstart')).value()
          const end = store.any(ws, ns.cal('dtend')).value()
          if (subjectDoc2 && start && end && start <= date && end > date) {
            renderFormsFor(subjectDoc2, subject)
            break
          } else {
            complain('Note no suitable annotation store in activity: ' + act)
          }
        }
      })
      box.appendChild(foobarbaz)
    }

    return box
  }
}
