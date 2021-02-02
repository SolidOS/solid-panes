/*   Attachment Pane
 **
 ** - Attach a document to a thing
 **  - View attachments
 ** - Look at all unattached Supporting Documents.
 ** - Drag a document onto the pane to attach it @@
 **
 **
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')

module.exports = {
  icon: UI.icons.iconBase + 'noun_25830.svg', // noun_25830

  name: 'attachments',

  // Does the subject deserve an attachments pane?
  //
  //  In this case we will render any thing which is in any subclass of
  //  certain classes, or also the certain classes themselves, as a
  //  triage tool for correlating many attachees with attachments.
  // We also offer the pane for anything of any class which just has an attachment already.
  //
  label: function (subject, context) {
    const kb = context.session.store
    const t = kb.findTypeURIs(subject)
    const QU = $rdf.Namespace('http://www.w3.org/2000/10/swap/pim/qif#')
    const WF = $rdf.Namespace('http://www.w3.org/2005/01/wf/flow#')
    if (
      t['http://www.w3.org/ns/pim/trip#Trip'] || // If in any subclass
      subject.uri === 'http://www.w3.org/ns/pim/trip#Trip' ||
      t['http://www.w3.org/2005/01/wf/flow#Task'] ||
      t['http://www.w3.org/2000/10/swap/pim/qif#Transaction'] ||
      // subject.uri == 'http://www.w3.org/2000/10/swap/pim/qif#Transaction' ||
      QU('Transaction') in kb.findSuperClassesNT(subject) ||
      kb.holds(subject, WF('attachment'))
    ) {
      return 'attachments'
    }
    return null
  },

  render: function (subject, context) {
    const dom = context.dom
    const kb = context.session.store
    const WF = $rdf.Namespace('http://www.w3.org/2005/01/wf/flow#')
    const QU = $rdf.Namespace('http://www.w3.org/2000/10/swap/pim/qif#')

    // ////////////////////////////////////////////////////////////////////////////

    const complain = function complain (message) {
      const pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: pink')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    // Where can we write about this thing?
    //
    // Returns term for document or null
    const findStore = function (kb, subject) {
      if (kb.updater.editable(subject.doc(), kb)) return subject.doc()
      const store = kb.any(subject.doc(), QU('annotationStore'))
      return store
    }

    var div = dom.createElement('div')
    const esc = UI.utils.escapeForXML
    div.setAttribute('class', 'attachPane')
    div.innerHTML =
      '<h1>' + esc(UI.utils.label(subject, true)) + ' attachments</h1>' //

    const predicate = WF('attachment')
    const range = QU('SupportingDocument')

    let subjects, multi
    const options = {}
    let currentMode = 0 // 0 -> Show all;  1 -> Attached;    2 -> unattached
    let currentSubject = null
    let currentObject = null
    const objectType = QU('SupportingDocument')

    // Find all members of the class which we know about
    // and sort them by an appropriate property.   @@ Move to library
    //

    const getSortKeySimple = function (_c) {
      const uriMap = {
        'http://www.w3.org/2005/01/wf/flow#Task': 'http://purl.org/dc/elements/1.1/created',
        'http://www.w3.org/ns/pim/trip#Trip': 'http://www.w3.org/2002/12/cal/ical#dtstart',
        'http://www.w3.org/2000/10/swap/pim/qif#Transaction': 'http://www.w3.org/2000/10/swap/pim/qif#date',
        'http://www.w3.org/2000/10/swap/pim/qif#SupportingDocument': 'http://purl.org/dc/elements/1.1/date'
      }
      const uri = uriMap[subject.uri]
      return uri ? kb.sym(uri) : kb.any(subject, UI.ns.ui('sortBy'))
    }

    const getSortKey = function (c) {
      let k = getSortKeySimple(c.uri)
      if (k) return k
      const sup = kb.findSuperClassesNT(c)
      for (const cl in sup) {
        // note unordered -- could be closest first
        k = getSortKeySimple(kb.fromNT(cl).uri)
        if (k) return k
      }
      return undefined // failure
    }

    const getMembersAndSort = function (subject) {
      const sortBy = getSortKey(subject)
      let u, x, key
      const uriHash = kb.findMemberURIs(subject)
      const pairs = []
      const subjects = []
      for (u in uriHash) {
        // @@ TODO: Write away the need for exception on next line
        // eslint-disable-next-line no-prototype-builtins
        if (uriHash.hasOwnProperty(u)) {
          x = kb.sym(u)
          if (sortBy) {
            key = kb.any(x, sortBy)
            if (!key) {
              // complain("No key "+key+" sortby "+sortBy+" for "+x)
              key = '8888-12-31'
            } else {
              key = key.value
            }
          } else {
            complain('No sortby ' + sortBy + ' for ' + x)
            key = '9999-12-31'
          }
          // key = (sortBy && kb.any(x, sortBy)) || kb.literal("9999-12-31") // Undated appear future
          // if (!key) complain("Sort: '"+key+"' No "+sortBy+" for "+x) // Assume just not in this year
          pairs.push([key, x])
        }
      }
      pairs.sort()
      pairs.reverse() // @@ Descending order .. made a toggle?
      for (let i = 0; i < pairs.length; i++) {
        subjects.push(pairs[i][1])
      }
      return subjects
    }

    // Set up a triage of many class members against documents or just one
    if (
      subject.uri === 'http://www.w3.org/ns/pim/trip#Trip' ||
      QU('Transaction') in kb.findSuperClassesNT(subject)
      // subject.uri == 'http://www.w3.org/2000/10/swap/pim/qif#Transaction'
    ) {
      multi = true
      subjects = getMembersAndSort(subject)
    } else {
      currentSubject = subject
      currentMode = 1 // Show attached only.
      subjects = [subject]
      multi = false
    }

    // var store = findStore(kb, subject)
    // if (!store) complain("There is no annotation store for: "+subject.uri)

    // var objects = kb.each(undefined, ns.rdf('type'), range)
    const objects = getMembersAndSort(range)
    if (!objects) complain('objects:' + objects.length)

    const deselectObject = function () {
      currentObject = null
      preview.innerHTML = ''
    }

    const showFiltered = function (mode) {
      const filtered = mode === 0 ? objects : getFiltered()
      // eslint-enable
      UI.widgets.selectorPanelRefresh(
        objectList,
        dom,
        kb,
        objectType,
        predicate,
        true,
        filtered,
        options,
        showObject,
        linkClicked
      )
      if (filtered.length === 1) {
        currentObject = filtered[0]
        showObject(currentObject, null, true) // @@ (Sure?) if only one select it.
      } else {
        deselectObject()
      }

      function getFiltered () {
        return mode === 1
          ? currentSubject === null
            ? objects.filter(y => !!kb.holds(undefined, predicate, y))
            : objects.filter(y => !!kb.holds(currentSubject, predicate, y))
          : objects.filter(y => kb.each(undefined, predicate, y).length === 0)
      }
    }

    const setAttachment = function (x, y, value, refresh) {
      if (kb.holds(x, predicate, y) === value) return
      const verb = value ? 'attach' : 'detach'
      // complain("Info: starting to "+verb+" " + y.uri + " to "+x.uri+ ":\n")
      const linkDone3 = function (uri, ok, body) {
        if (ok) {
          // complain("Success "+verb+" "+y.uri+" to "+x.uri+ ":\n"+ body)
          refresh()
        } else {
          complain(
            'Error: Unable to ' +
              verb +
              ' ' +
              y.uri +
              ' to ' +
              x.uri +
              ':\n' +
              body
          )
        }
      }

      const store = findStore(kb, x)
      if (!store) {
        complain('There is no annotation store for: ' + x.uri)
      } else {
        const sts = [$rdf.st(x, predicate, y, store)]
        if (value) {
          kb.updater.update([], sts, linkDone3)
        } else {
          kb.updater.update(sts, [], linkDone3)
        }
      }
    }

    var linkClicked = function (x, event, inverse, refresh) {
      let s, o
      if (inverse) {
        // Objectlist
        if (!currentSubject) {
          complain('No subject for the link has been selected')
          return
        } else {
          s = currentSubject
          o = x
        }
      } else {
        // Subjectlist
        if (!currentObject) {
          complain('No object for the link has been selected')
          return
        } else {
          s = x
          o = currentObject
        }
      }
      setAttachment(s, o, !kb.holds(s, predicate, o), refresh) // @@ toggle
    }

    // When you click on a subject, filter the objects connected to the subject in Mode 1
    const showSubject = function (x, event, selected) {
      if (selected) {
        currentSubject = x
      } else {
        currentSubject = null
        if (currentMode === 1) deselectObject()
      } // If all are displayed, refresh would just annoy:
      if (currentMode !== 0) showFiltered(currentMode) // Refresh the objects
    }

    if (multi) {
      const subjectList = UI.widgets.selectorPanel(
        dom,
        kb,
        subject,
        predicate,
        false,
        subjects,
        options,
        showSubject,
        linkClicked
      )
      subjectList.setAttribute(
        'style',
        'background-color: white;  width: 25em; height: 100%; padding: 0 em; overflow:scroll; float:left'
      )
      div.appendChild(subjectList)
    }

    var showObject = function (x, event, selected) {
      if (!selected) {
        deselectObject()
        preview.innerHTML = '' // Clean out what is there
        // complain("Show object "+x.uri)
        return
      }
      currentObject = x
      try {
        /*
        var dispalyable = function (kb, x) {
          var cts = kb.fetcher.getHeader(x, 'content-type')
          if (cts) {
            var displayables = ['text/html', 'image/png', 'application/pdf']
            for (var j = 0; j < cts.length; j++) {
              for (var k = 0; k < displayables.length; k++) {
                if (cts[j].indexOf(displayables[k]) >= 0) {
                  return true
                }
              }
            }
          }
          return false
        }
        */
        preview.innerHTML = 'Loading ....'
        if (x.uri) {
          kb.fetcher
            .load(x.uri)
            .then(() => {
              const outliner = context.getOutliner(dom)
              const display = outliner.propertyTable(x) //  ,table, pane
              preview.innerHTML = ''
              preview.appendChild(display)
            })
            .catch(err => {
              preview.textContent = 'Error loading ' + x.uri + ': ' + err
            })
        }
        /*
              if (dispalyable(kb, x) || x.uri.slice(-4) == ".pdf" || x.uri.slice(-4) == ".png" || x.uri.slice(-5) == ".html" ||
                      x.uri.slice(-5) == ".jpeg") { // @@@@@@ MAJOR KLUDGE! use metadata after HEAD
                  preview.innerHTML = '<iframe height="100%" width="100%"src="'
                      + x.uri + '">' + x.uri + '</iframe>'
              } else {
              }
          */
      } catch (e) {
        preview.innerHTML =
          '<span style="background-color: pink;">' + 'Error:' + e + '</span>' // @@ enc
      }
    }

    div.setAttribute(
      'style',
      'background-color: white; width:40cm; height:20cm;'
    )

    const headerButtons = function (dom, labels, intial, callback) {
      const head = dom.createElement('table')
      let current = intial
      head.setAttribute(
        'style',
        'float: left; width: 30em; padding: 0.5em; height: 1.5em; background-color: #ddd; color: #444; font-weight: bold'
      )
      const tr = dom.createElement('tr')
      const style0 = 'border-radius: 0.6em; text-align: center;'
      const style1 = style0 + 'background-color: #ccc; color: black;'
      head.appendChild(tr)
      const setStyles = function () {
        for (i = 0; i < labels.length; i++) {
          buttons[i].setAttribute('style', i === current ? style1 : style0)
        }
      }
      let i, b
      var buttons = []
      for (i = 0; i < labels.length; i++) {
        b = buttons[i] = dom.createElement('td')
        b.textContent = labels[i]
        tr.appendChild(buttons[i])
        const listen = function (b, i) {
          b.addEventListener('click', function (_e) {
            current = i
            setStyles()
            callback(i)
          })
        }
        listen(b, i)
      }
      setStyles()
      return head
    }

    const setMode = function (mode) {
      if (mode !== currentMode) {
        currentMode = mode
        deselectObject()
        showFiltered(mode)
      }
    }

    const wrapper = dom.createElement('div')
    wrapper.setAttribute(
      'style',
      ' width: 30em; height: 100%;  padding: 0em; float:left;'
    )
    // wrapper.appendChild(head)
    div.appendChild(wrapper)
    wrapper.appendChild(
      headerButtons(
        dom,
        ['all', 'attached', 'not attached'],
        currentMode,
        setMode
      )
    )

    var objectList = UI.widgets.selectorPanel(
      dom,
      kb,
      objectType,
      predicate,
      true,
      objects,
      options,
      showObject,
      linkClicked
    )
    objectList.setAttribute(
      'style',
      'background-color: #ffe;  width: 30em; height: 100%; padding: 0em; overflow:scroll;'
    ) // float:left
    wrapper.appendChild(objectList)

    // objectList.insertBefore(head, objectList.firstChild)

    var preview = dom.createElement('div')
    preview.setAttribute(
      'style',
      /* background-color: black; */ 'padding: 0em; margin: 0;  height: 100%; overflow:scroll;'
    )
    div.appendChild(preview)
    showFiltered(currentMode)

    if (subjects.length > 0 && multi) {
      const stores = {}
      for (let k = 0; k < subjects.length; k++) {
        const store = findStore(kb, subjects[k])
        if (store) stores[store.uri] = subjects[k]
        // if (!store) complain("No store for "+subjects[k].uri)
      }
      for (const storeURI in stores) {
        // var store = findStore(kb,subjects[subjectList.length-1])
        const store = kb.sym(storeURI)
        var mintBox = dom.createElement('div')
        mintBox.setAttribute(
          'style',
          'clear: left; width: 20em; margin-top:2em; background-color:#ccc; border-radius: 1em; padding: 1em; font-weight: bold;'
        )
        mintBox.textContent = '+ New ' + UI.utils.label(subject)

        mintBox.textContent += ' in ' + UI.utils.label(store)
        const storeLab = dom.createElement('span')
        storeLab.setAttribute(
          'style',
          'font-weight: normal; font-size: 80%; color: #777;'
        )
        storeLab.textContent = storeURI
        mintBox.appendChild(dom.createElement('br'))
        mintBox.appendChild(storeLab)
        /*
        var mintButton = dom.createElement('img')
        mintBox.appendChild(mintButton)
        mintButton.setAttribute('src', ...); @@ Invokes master handler
        */
        mintBox.addEventListener(
          'click',
          function (_event) {
            const thisForm = UI.widgets.promptForNew(
              dom,
              kb,
              subject,
              predicate,
              subject,
              null,
              store,
              function (ok, _body) {
                if (!ok) {
                  // callback(ok, body); // @@ if ok, need some form of refresh of the select for the new thing
                } else {
                  // Refresh @@
                }
              }
            )
            try {
              div.insertBefore(thisForm, mintBox.nextSibling) // Sigh no insertAfter
            } catch (e) {
              div.appendChild(thisForm)
            }
            // var newObject = thisForm.AJAR_subject
          },
          false
        )
        div.appendChild(mintBox)
      }
    }

    // if (!me) complain("(You do not have your Web Id set. Set your Web ID to make changes.)")

    return div
  }
} // pane object

// ends
