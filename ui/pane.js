/*   Form building/editing Pane
**
*/

const UI = require('solid-ui')
const panes = require('pane-registry')

module.exports = {

  // noun_170702.svg' builder   noun_122196.svg form
  icon: UI.icons.iconBase + 'noun_170702.svg',

  name: 'ui',

  // Does the subject deserve this pane?
  label: function (subject) {
    var ns = UI.ns
    var kb = UI.store
    var t = kb.findTypeURIs(subject)
    if (t[ns.rdfs('Class').uri]) return 'creation forms'
    // if (t[ns.rdf('Property').uri]) return "user interface";
    if (t[ns.ui('Form').uri]) return 'edit form'

    return null // No under other circumstances (while testing at least!)
  },

  render: function (subject, dom) {
    var kb = UI.store
    var ns = UI.ns

    var box = dom.createElement('div')
    box.setAttribute('class', 'formPane') // Share styles
    var label = UI.utils.label(subject)

    var mention = function complain (message, style) {
      var pre = dom.createElement('p')
      pre.setAttribute('style', style || 'color: grey; background-color: white')
      box.appendChild(pre).textContent = message
      return pre
    }

    var complain = function complain (message, style) {
      mention(message, 'style', style || 'color: grey; background-color: #fdd')
    }

    var complainIfBad = function (ok, body) {
      if (ok) {
        // setModifiedDate(store, kb, store);
        // rerender(box);   // Deleted forms at the moment
      } else complain('Sorry, failed to save your change:\n' + body)
    }

    // //////////////////////////////////////////////////////////////////////////////

    var t = kb.findTypeURIs(subject)

    var store = null
    if (subject.uri) {
      var docuri = $rdf.Util.uri.docpart(subject.uri)
      if (subject.uri !== docuri && UI.store.updater.editable(docuri)) {
        store = kb.sym($rdf.Util.uri.docpart(subject.uri))
      } // an editable ontology with hash
    }
    if (!store) store = kb.any(kb.sym(docuri), ns.link('annotationStore'))
    if (!store) store = UI.widgets.defaultAnnotationStore(subject)

    if (!store) store = kb.sym('https://formsregistry.solid.community/public/formRegistry/') // fallback
    // if (!store) store = kb.sym('http://tabulator.org/wiki/ontologyAnnotation/common') // fallback

    // A fallback which gives a different store page for each ontology would be good @@

    var pred
    if (t[ns.rdfs('Class').uri]) { // Stuff we can do before we load the store
    }

    var wait = mention('(Loading data from: ' + store + ')')

    kb.fetcher.nowOrWhenFetched(store.uri, subject, function (ok, body) {
      if (!ok) {
        complain('Cannot load store ' + store + ' :' + body)
        return
      }
      box.removeChild(wait)

      //              Render a Class -- the forms associated with it

      if (t[ns.rdfs('Class').uri]) {
        // For each creation form, allow one to create a new object with it, and also to edit the form.
        var displayFormsForRelation = function displayFormsForRelation (pred, allowCreation) {
          var sts = kb.statementsMatching(subject, pred)
          const outliner = panes.getOutliner(dom)
          if (sts.length) {
            for (var i = 0; i < sts.length; i++) {
              outliner.appendPropertyTRs(box, [ sts[i] ])
              var form = sts[i].object
              var cell = dom.createElement('td')
              box.lastChild.appendChild(cell)
              if (allowCreation) {
                cell.appendChild(UI.widgets.newButton(
                  dom, kb, null, null, subject, form, store, function (ok, body) {
                    if (ok) {
                      // dom.outlineManager.GotoSubject(newThing@@, true, undefined, true, undefined);
                      // rerender(box);   // Deleted forms at the moment
                    } else complain('Sorry, failed to save your change:\n' + body)
                  }))
              }
              var formdef = kb.statementsMatching(form, ns.rdf('type'))
              if (!formdef.length) formdef = kb.statementsMatching(form)
              if (!formdef.length) complain('No data about form')
              else {
                UI.widgets.editFormButton(dom, box,
                form, formdef[0].why, complainIfBad)
              }
            }
            box.appendChild(dom.createElement('hr'))
          } else {
            mention('There are currently no known forms to make a ' +
              label + '.')
          }
        }

        pred = ns.ui('creationForm')
        box.appendChild(dom.createElement('h2')).textContent = UI.utils.label(pred)
        mention('Creation forms allow you to add information about a new thing,' +
                      ' in this case a new ' + label + '.')
        displayFormsForRelation(pred, true)
        box.appendChild(dom.createElement('hr'))
        mention('You can make a new creation form:')
        box.appendChild(UI.widgets.newButton(
          dom, kb, subject, pred, ns.ui('Form'), null, store, complainIfBad))

        box.appendChild(dom.createElement('hr'))

        pred = ns.ui('annotationForm')
        box.appendChild(dom.createElement('h2')).textContent = UI.utils.label(pred)
        mention('Annotaion forms allow you to add extra information about a ,' +
                              label + ' we already know about.')
        displayFormsForRelation(pred, false)
        box.appendChild(dom.createElement('hr'))
        mention('You can make a new annotation form:')
        box.appendChild(UI.widgets.newButton(
          dom, kb, subject, pred, ns.ui('Form'), null, store, complainIfBad))

        mention('(Storing new forms in: ' + store + ')')

        // Render a Form
      } else if (t[ns.ui('Form').uri]) {
        UI.widgets.appendForm(dom, box, kb, subject, ns.ui('FormForm'), store, complainIfBad)
      } else {
        complain('ui/pane internal error -- Eh?')
      }
    }) // end: when store loded

    return box
  }
}
// ends
