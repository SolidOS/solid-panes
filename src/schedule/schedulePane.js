/*   Scheduler Pane
 **
 **
 */
/* global alert */

const UI = require('solid-ui')
const $rdf = UI.rdf
const ns = UI.ns

// @@ Give other combos too-- see schedule ontology
const possibleAvailabilities = [
  ns.sched('No'),
  ns.sched('Maybe'),
  ns.sched('Yes')
]

module.exports = {
  icon: UI.icons.iconBase + 'noun_346777.svg', // @@ better?

  name: 'schedule',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve an Scheduler pane?
  label: function (subject, context) {
    const kb = context.session.store
    const t = kb.findTypeURIs(subject)
    if (t['http://www.w3.org/ns/pim/schedule#SchedulableEvent']) {
      return 'Scheduling poll'
    }
    return null // No under other circumstances
  },

  //  Mint a new Schedule poll
  mintClass: ns.sched('SchedulableEvent'),

  mintNew: function (context, options) {
    return new Promise(function (resolve, reject) {
      const ns = UI.ns
      const kb = context.session.store
      let newBase = options.newBase
      const thisInstance =
        options.useExisting || $rdf.sym(options.newBase + 'index.ttl#this')

      const complainIfBad = function (ok, body) {
        if (ok) return
        console.log(
          'Error in Schedule Pane: Error constructing new scheduler: ' + body
        )
        reject(new Error(body))
      }

      // ////////////////////// Accesss control

      // Two variations of ACL for this app, public read and public read/write
      // In all cases owner has read write control

      const genACLtext = function (docURI, aclURI, allWrite) {
        const g = $rdf.graph()
        const auth = $rdf.Namespace('http://www.w3.org/ns/auth/acl#')
        let a = g.sym(aclURI + '#a1')
        const acl = g.sym(aclURI)
        const doc = g.sym(docURI)
        g.add(a, UI.ns.rdf('type'), auth('Authorization'), acl)
        g.add(a, auth('accessTo'), doc, acl)
        g.add(a, auth('agent'), me, acl)
        g.add(a, auth('mode'), auth('Read'), acl)
        g.add(a, auth('mode'), auth('Write'), acl)
        g.add(a, auth('mode'), auth('Control'), acl)

        a = g.sym(aclURI + '#a2')
        g.add(a, UI.ns.rdf('type'), auth('Authorization'), acl)
        g.add(a, auth('accessTo'), doc, acl)
        g.add(a, auth('agentClass'), ns.foaf('Agent'), acl)
        g.add(a, auth('mode'), auth('Read'), acl)
        if (allWrite) {
          g.add(a, auth('mode'), auth('Write'), acl)
        }
        return $rdf.serialize(acl, g, aclURI, 'text/turtle')
      }

      /*
          var setACL3 = function (docURI, allWrite, callbackFunction) {
            var aclText = genACLtext(docURI, aclDoc.uri, allWrite)
            return UI.acl.setACL(docURI, aclText, callbackFunction)
          }
          */

      const setACL2 = function setACL2 (docURI, allWrite, callbackFunction) {
        const aclDoc = kb.any(
          kb.sym(docURI),
          kb.sym('http://www.iana.org/assignments/link-relations/acl')
        ) // @@ check that this get set by web.js

        if (aclDoc) {
          // Great we already know where it is
          const aclText = genACLtext(docURI, aclDoc.uri, allWrite)

          return fetcher
            .webOperation('PUT', aclDoc.uri, {
              data: aclText,
              contentType: 'text/turtle'
            })
            .then(_result => callbackFunction(true))
            .catch(err => {
              callbackFunction(false, err.message)
            })
        } else {
          return fetcher
            .load(docURI)
            .catch(err => {
              callbackFunction(false, 'Getting headers for ACL: ' + err)
            })
            .then(() => {
              const aclDoc = kb.any(
                kb.sym(docURI),
                kb.sym('http://www.iana.org/assignments/link-relations/acl')
              )

              if (!aclDoc) {
                // complainIfBad(false, "No Link rel=ACL header for " + docURI)
                throw new Error('No Link rel=ACL header for ' + docURI)
              }

              const aclText = genACLtext(docURI, aclDoc.uri, allWrite)

              return fetcher.webOperation('PUT', aclDoc.uri, {
                data: aclText,
                contentType: 'text/turtle'
              })
            })
            .then(_result => callbackFunction(true))
            .catch(err => {
              callbackFunction(false, err.message)
            })
        }
      }

      // Body of mintNew
      var fetcher = kb.fetcher
      const updater = kb.updater

      var me = options.me || UI.authn.currentUser()
      if (!me) {
        console.log('MUST BE LOGGED IN')
        alert('NOT LOGGED IN')
        return
      }

      const base = thisInstance.dir().uri
      let newDetailsDoc, newInstance // , newIndexDoc

      if (options.useExisting) {
        newInstance = options.useExisting
        newBase = thisInstance.dir().uri
        newDetailsDoc = newInstance.doc()
        // newIndexDoc = null
        if (options.newBase) {
          throw new Error(
            'mint new scheduler: Illegal - have both new base and existing event'
          )
        }
      } else {
        newDetailsDoc = kb.sym(newBase + 'details.ttl')
        // newIndexDoc = kb.sym(newBase + 'index.html')
        newInstance = kb.sym(newDetailsDoc.uri + '#event')
      }

      const newResultsDoc = kb.sym(newBase + 'results.ttl')

      const toBeCopied = options.noIndexHTML
        ? {}
        : [{ local: 'index.html', contentType: 'text/html' }]

      const agenda = []

      //   @@ This needs some form of visible progress bar
      for (let f = 0; f < toBeCopied.length; f++) {
        const item = toBeCopied[f]
        const fun = function copyItem (item) {
          agenda.push(function () {
            const newURI = newBase + item.local
            console.log('Copying ' + base + item.local + ' to ' + newURI)

            const setThatACL = function () {
              setACL2(newURI, false, function (ok, message) {
                if (!ok) {
                  complainIfBad(
                    ok,
                    'FAILED to set ACL ' + newURI + ' : ' + message
                  )
                  console.log('FAILED to set ACL ' + newURI + ' : ' + message)
                } else {
                  agenda.shift()() // beware too much nesting
                }
              })
            }

            kb.fetcher
              .webCopy(
                base + item.local,
                newBase + item.local,
                item.contentType
              )
              .then(() => UI.authn.checkUser())
              .then(webId => {
                me = webId

                setThatACL()
              })
              .catch(err => {
                console.log(
                  'FAILED to copy ' + base + item.local + ' : ' + err.message
                )
                complainIfBad(
                  false,
                  'FAILED to copy ' + base + item.local + ' : ' + err.message
                )
              })
          })
        }
        fun(item)
      }

      agenda.push(function createDetailsFile () {
        kb.add(
          newInstance,
          ns.rdf('type'),
          ns.sched('SchedulableEvent'),
          newDetailsDoc
        )
        if (me) {
          kb.add(newInstance, ns.dc('author'), me, newDetailsDoc) // Who is sending the invitation?
          kb.add(newInstance, ns.foaf('maker'), me, newDetailsDoc) // Uneditable - wh is allowed to edit this?
        }

        kb.add(newInstance, ns.dc('created'), new Date(), newDetailsDoc)
        kb.add(newInstance, ns.sched('resultsDocument'), newDetailsDoc)

        updater.put(
          newDetailsDoc,
          kb.statementsMatching(undefined, undefined, undefined, newDetailsDoc),
          'text/turtle',
          function (uri2, ok, message) {
            if (ok) {
              agenda.shift()()
            } else {
              complainIfBad(
                ok,
                'FAILED to save new scheduler at: ' +
                  newDetailsDoc +
                  ' : ' +
                  message
              )
              console.log(
                'FAILED to save new scheduler at: ' +
                  newDetailsDoc +
                  ' : ' +
                  message
              )
            }
          }
        )
      })

      agenda.push(function () {
        kb.fetcher
          .webOperation('PUT', newResultsDoc.uri, {
            data: '',
            contentType: 'text/turtle'
          })
          .then(() => {
            agenda.shift()()
          })
          .catch(err => {
            complainIfBad(
              false,
              'Failed to initialize empty results file: ' + err.message
            )
          })
      })

      agenda.push(function () {
        setACL2(newResultsDoc.uri, true, function (ok, body) {
          complainIfBad(
            ok,
            'Failed to set Read-Write ACL on results file: ' + body
          )
          if (ok) agenda.shift()()
        })
      })

      agenda.push(function () {
        setACL2(newDetailsDoc.uri, false, function (ok, body) {
          complainIfBad(
            ok,
            'Failed to set read ACL on configuration file: ' + body
          )
          if (ok) agenda.shift()()
        })
      })

      agenda.push(function () {
        // give the user links to the new app
        console.log('Finished minting new scheduler')
        options.newInstance = newInstance
        resolve(options)
      })

      agenda.shift()()
      // Created new data files.
    }) // promise
  }, // mintNew

  //  Render one meeting schedule poll
  render: function (subject, context) {
    const dom = context.dom
    const kb = context.session.store
    const ns = UI.ns
    const invitation = subject
    const appPathSegment = 'app-when-can-we.w3.org' // how to allocate this string and connect to

    // ////////////////////////////////////////////

    const fetcher = kb.fetcher
    const updater = kb.updater
    let waitingForLogin = false

    const thisInstance = subject
    const detailsDoc = subject.doc()
    const baseDir = detailsDoc.dir()
    const base = baseDir.uri

    const resultsDoc = $rdf.sym(base + 'results.ttl')
    // var formsURI = base + 'forms.ttl'
    // We can't in fact host stuff from there because of CORS
    const formsURI =
      'https://solid.github.io/solid-panes/schedule/formsForSchedule.ttl'

    const form1 = kb.sym(formsURI + '#form1')
    const form2 = kb.sym(formsURI + '#form2')
    const form3 = kb.sym(formsURI + '#form3')

    const formText = require('./formsForSchedule.js')
    $rdf.parse(formText, kb, formsURI, 'text/turtle') // Load forms directly

    const inputStyle =
      'background-color: #eef; padding: 0.5em;  border: .5em solid white; font-size: 100%' //  font-size: 120%
    const buttonIconStyle = 'width: 1.8em; height: 1.8em;'

    // Utility functions

    const complainIfBad = function (ok, message) {
      if (!ok) {
        div.appendChild(UI.widgets.errorMessageBlock(dom, message, 'pink'))
      }
    }

    const clearElement = function (ele) {
      while (ele.firstChild) {
        ele.removeChild(ele.firstChild)
      }
      return ele
    }

    const refreshCellColor = function (cell, value) {
      const bg = kb.any(value, UI.ns.ui('backgroundColor'))
      if (bg) {
        cell.setAttribute(
          'style',
          'padding: 0.3em; text-align: center; background-color: ' + bg + ';'
        )
      }
    }

    let me

    UI.authn.checkUser().then(webId => {
      me = webId

      if (logInOutButton) {
        logInOutButton.refresh()
      }
      if (webId && waitingForLogin) {
        waitingForLogin = false
        showAppropriateDisplay()
      }
    })
    console.log('me: ' + me) // @@ curently not actually used elsewhere

    // //////////////////////////////  Reproduction: spawn a new instance
    //
    // Viral growth path: user of app decides to make another instance
    //

    const newInstanceButton = function () {
      const b = UI.authn.newAppInstance(
        dom,
        { noun: 'scheduler' },
        initializeNewInstanceInWorkspace
      )
      b.firstChild.setAttribute('style', inputStyle)
      return b
    } // newInstanceButton

    // ///////////////////////  Create new document files for new instance of app

    var initializeNewInstanceInWorkspace = function (ws) {
      let newBase = kb.any(ws, ns.space('uriPrefix'))
      if (!newBase) {
        newBase = ws.uri.split('#')[0]
      } else {
        newBase = newBase.value
      }
      if (newBase.slice(-1) !== '/') {
        $rdf.log.error(appPathSegment + ': No / at end of uriPrefix ' + newBase) // @@ paramater?
        newBase = newBase + '/'
      }
      const now = new Date()
      newBase += appPathSegment + '/id' + now.getTime() + '/' // unique id

      initializeNewInstanceAtBase(thisInstance, newBase)
    }

    var initializeNewInstanceAtBase = function (thisInstance, newBase) {
      const options = { thisInstance: thisInstance, newBase: newBase }
      this.mintNew(context, options)
        .then(function (options) {
          const p = div.appendChild(dom.createElement('p'))
          p.setAttribute('style', 'font-size: 140%;')
          p.innerHTML =
            "Your <a href='" +
            options.newInstance.uri +
            "'><b>new scheduler</b></a> is ready to be set up. " +
            "<br/><br/><a href='" +
            options.newInstance.uri +
            "'>Say when you what days work for you.</a>"
        })
        .catch(function (error) {
          complainIfBad(
            false,
            'Error createing new scheduler at ' +
              options.newInstance +
              ': ' +
              error
          )
        })
    }

    // ///////////////////////

    const getForms = function () {
      console.log('getforms()')
      getDetails()
      /*
      fetcher.nowOrWhenFetched(formsURI, undefined, function (ok, body) {
        console.log('getforms() ok? ' + ok)
        if (!ok) return complainIfBad(ok, body)
        getDetails()
      })
      */
    }

    var getDetails = function () {
      console.log('getDetails()') // Looking for blank screen hang-up
      fetcher.nowOrWhenFetched(detailsDoc.uri, undefined, function (ok, body) {
        console.log('getDetails() ok? ' + ok)
        if (!ok) return complainIfBad(ok, body)
        showAppropriateDisplay()
      })
    }

    var showAppropriateDisplay = function showAppropriateDisplay () {
      console.log('showAppropriateDisplay()')

      UI.authn.checkUser().then(webId => {
        if (!webId) {
          return showSignon()
        }

        // On gh-pages, the turtle will not load properly (bad mime type)
        // but we can trap it as being a non-editable server.

        if (
          !kb.updater.editable(detailsDoc.uri, kb) ||
          kb.holds(subject, ns.rdf('type'), ns.wf('TemplateInstance'))
        ) {
          // This is read-only example e.g. on github pages, etc
          showBootstrap(div)
          return
        }

        const ready = kb.any(subject, ns.sched('ready'))

        if (!ready) {
          showForms()
        } else {
          // no editing not author
          getResults()
        }
      })
    }

    var showSignon = function showSignon () {
      clearElement(naviMain)
      const signonContext = { div: div, dom: dom }
      UI.authn.logIn(signonContext).then(context => {
        me = context.me
        waitingForLogin = false // untested
        showAppropriateDisplay()
      })
    }

    var showBootstrap = function showBootstrap () {
      const div = clearElement(naviMain)
      div.appendChild(
        UI.authn.newAppInstance(
          dom,
          { noun: 'poll' },
          initializeNewInstanceInWorkspace
        )
      )

      div.appendChild(dom.createElement('hr')) // @@

      const p = div.appendChild(dom.createElement('p'))
      p.textContent =
        'Where would you like to store the data for the poll?  ' +
        'Give the URL of the directory where you would like the data stored.'
      const baseField = div.appendChild(dom.createElement('input'))
      baseField.setAttribute('type', 'text')
      baseField.size = 80 // really a string
      baseField.label = 'base URL'
      baseField.autocomplete = 'on'

      div.appendChild(dom.createElement('br')) // @@

      const button = div.appendChild(dom.createElement('button'))
      button.setAttribute('style', inputStyle)
      button.textContent = 'Start new poll at this URI'
      button.addEventListener('click', function (_e) {
        let newBase = baseField.value
        if (newBase.slice(-1) !== '/') {
          newBase += '/'
        }
        initializeNewInstanceAtBase(thisInstance, newBase)
      })
    }

    // ///////////// The forms to configure the poll

    const doneButton = dom.createElement('button')

    var showForms = function () {
      clearElement(naviCenter) // Remove refresh button if nec
      const div = naviMain
      const wizard = true
      let currentSlide = 0
      let gotDoneButton = false
      if (wizard) {
        const forms = [form1, form2, form3]
        const slides = []
        currentSlide = 0
        for (let f = 0; f < forms.length; f++) {
          const slide = dom.createElement('div')
          UI.widgets.appendForm(
            document,
            slide,
            {},
            subject,
            forms[f],
            detailsDoc,
            complainIfBad
          )
          slides.push(slide)
        }

        const refresh = function () {
          clearElement(naviMain).appendChild(slides[currentSlide])

          if (currentSlide === 0) {
            b1.setAttribute('disabled', '')
          } else {
            b1.removeAttribute('disabled')
          }
          if (currentSlide === slides.length - 1) {
            b2.setAttribute('disabled', '')
            if (!gotDoneButton) {
              // Only expose at last slide seen
              naviCenter.appendChild(emailButton) // could also check data shape
              naviCenter.appendChild(doneButton) // could also check data shape
              gotDoneButton = true
            }
          } else {
            b2.removeAttribute('disabled')
          }
        }
        var b1 = clearElement(naviLeft).appendChild(dom.createElement('button'))
        b1.setAttribute('style', inputStyle)
        b1.textContent = '<- go back'
        b1.addEventListener(
          'click',
          function (_e) {
            if (currentSlide > 0) {
              currentSlide -= 1
              refresh()
            }
          },
          false
        )

        var b2 = clearElement(naviRight).appendChild(
          dom.createElement('button')
        )
        b2.setAttribute('style', inputStyle)
        b2.textContent = 'continue ->'
        b2.addEventListener(
          'click',
          function (_e) {
            if (currentSlide < slides.length - 1) {
              currentSlide += 1
              refresh()
            }
          },
          false
        )

        refresh()
      } else {
        // not wizard one big form
        // @@@ create the initial config doc if not exist
        const table = div.appendChild(dom.createElement('table'))
        UI.widgets.appendForm(
          document,
          table,
          {},
          subject,
          form1,
          detailsDoc,
          complainIfBad
        )
        UI.widgets.appendForm(
          document,
          table,
          {},
          subject,
          form2,
          detailsDoc,
          complainIfBad
        )
        UI.widgets.appendForm(
          document,
          table,
          {},
          subject,
          form3,
          detailsDoc,
          complainIfBad
        )
        naviCenter.appendChild(doneButton) // could also check data shape
      }
      // @@@  link config to results

      const insertables = []
      insertables.push(
        $rdf.st(
          subject,
          ns.sched('availabilityOptions'),
          ns.sched('YesNoMaybe'),
          detailsDoc
        )
      )
      insertables.push(
        $rdf.st(subject, ns.sched('ready'), new Date(), detailsDoc)
      )
      insertables.push(
        $rdf.st(subject, ns.sched('results'), resultsDoc, detailsDoc)
      ) // @@ also link in results

      doneButton.setAttribute('style', inputStyle)
      doneButton.textContent = 'Go to poll'
      doneButton.addEventListener(
        'click',
        function (_e) {
          if (kb.any(subject, ns.sched('ready'))) {
            // already done
            getResults()
            naviRight.appendChild(emailButton)
          } else {
            naviRight.appendChild(emailButton)
            kb.updater.update([], insertables, function (
              uri,
              success,
              errorBody
            ) {
              if (!success) {
                complainIfBad(success, errorBody)
              } else {
                // naviRight.appendChild(emailButton)
                getResults()
              }
            })
          }
        },
        false
      )

      var emailButton = dom.createElement('button')
      emailButton.setAttribute('style', inputStyle)
      const emailIcon = emailButton.appendChild(dom.createElement('img'))
      emailIcon.setAttribute('src', UI.icons.iconBase + 'noun_480183.svg') // noun_480183.svg
      emailIcon.setAttribute('style', buttonIconStyle)
      // emailButton.textContent = 'email invitations'
      emailButton.addEventListener(
        'click',
        function (_e) {
          const title =
            kb.anyValue(subject, ns.cal('summary')) ||
            kb.anyValue(subject, ns.dc('title')) ||
            ''
          const mailto =
            'mailto:' +
            kb
              .each(subject, ns.sched('invitee'))
              .map(function (who) {
                const mbox = kb.any(who, ns.foaf('mbox'))
                return mbox ? mbox.uri.replace('mailto:', '') : ''
              })
              .join(',') +
            '?subject=' +
            encodeURIComponent(title + '-- When can we meet?') +
            '&body=' +
            encodeURIComponent(
              title + '\n\nWhen can you?\n\nSee ' + subject + '\n'
            )
          // @@ assumed there is a data browser

          console.log('Mail: ' + mailto)
          window.location.href = mailto
        },
        false
      )
    } // showForms

    // Ask for each day, what times .. @@ to be added some time
    /*
    var setTimesOfDay = function () {
      var i, j, x, y, slot, cell, day
      var insertables = []
      var possibleDays = kb.each(invitation, ns.sched('option'))
        .map(function (opt) {return kb.any(opt, ns.cal('dtstart'))})
      var cellLookup = []
      var slots = kb.each(invitation, ns.sched('slot'))
      if (slots.length === 0) {
        for (i = 0; i < 2; i++) {
          slot = UI.widgets.newThing(detailsDoc)
          insertables.push($rdf.st(invitation, ns.sched('slot'), slot))
          insertables.push($rdf.st(slot, ns.rdfs('label'), 'slot ' + (i + 1)))
          for (j = 0; j < possibleDays.length; j++) {
            day - possibleDays[j]
            x = kb.any(slot, ns.rdfs('label'))
            y = kb.any(day, ns.cal('dtstart'))
            cell = UI.widgets.newThing(detailsDoc)
            cellLookup[x.toNT() + y.toNT()] = cell
            insertables.push($rdf.st(slot, ns.sched('cell'), cell))
            insertables.push($rdf.st(cell, ns.sched('day'), possibleDays[j]))
          }
        }
      }

      var query = new $rdf.Query('TimesOfDay')
      var v = {}['day', 'label', 'value', 'slot', 'cell'].map(function (x) {
        query.vars.push(v[x] = $rdf.variable(x)) })
      query.pat.add(invitation, ns.sched('slot'), v.slot)
      query.pat.add(v.slot, ns.rdfs('label'), v.label)
      query.pat.add(v.slot, ns.sched('cell'), v.cell)
      query.pat.add(v.cell, ns.sched('timeOfDay'), v.value)
      query.pat.add(v.cell, ns.sched('day'), v.day)

      var options = {}
      options.set_x = kb.each(subject, ns.sched('slot')) // @@@@@ option -> dtstart in future
      options.set_x = options.set_x.map(function (opt) { return kb.any(opt, ns.rdfs('label')) })

      options.set_y = kb.each(subject, ns.sched('option')); // @@@@@ option -> dtstart in future
      options.set_y = options.set_y.map(function (opt) { return kb.any(opt, ns.cal('dtstart')) })

      var possibleTimes = kb.each(invitation, ns.sched('option'))
        .map(function (opt) { return kb.any(opt, ns.cal('dtstart')) })

      var displayTheMatrix = function () {
        var matrix = div.appendChild(UI.matrix.matrixForQuery(
          dom, query, v.time, v.author, v.value, options, function () {}))

        matrix.setAttribute('class', 'matrix')

        var refreshButton = dom.createElement('button')
        refreshButton.setAttribute('style', inputStyle)
        refreshButton.textContent = 'refresh'
        refreshButton.addEventListener('click', function (e) {
          refreshButton.disabled = true
          UI.store.fetcher.nowOrWhenFetched(subject.doc(), undefined, function (ok, body) {
            if (!ok) {
              console.log('Cant refresh matrix' + body)
            } else {
              matrix.refresh()
              refreshButton.disabled = false
            }
          })
        }, false)

        clearElement(naviCenter)
        naviCenter.appendChild(refreshButton)
      }

      var dataPointForNT = []

      var doc = resultsDoc
      options.set_y = options.set_y.filter(function (z) { return (! z.sameTerm(me)) })
      options.set_y.push(me) // Put me on the end

      options.cellFunction = function (cell, x, y, value) {
        // var point = cellLookup[x.toNT() + y.toNT()]

        if (y.sameTerm(me)) {
          var callbackFunction = function () { refreshCellColor(cell, value); }; //  @@ may need that
          var selectOptions = {}
          var predicate = ns.sched('timeOfDay')
          var cellSubject = dataPointForNT[x.toNT()]
          var selector = UI.widgets.makeSelectForOptions(dom, kb, cellSubject, predicate,
            possibleAvailabilities, selectOptions, resultsDoc, callbackFunction)
          cell.appendChild(selector)
        } else if (value !== null) {
          cell.textContent = UI.utils.label(value)
        }

      }

      var responses = kb.each(invitation, ns.sched('response'))
      var myResponse = null
      responses.map(function (r) {
        if (kb.holds(r, ns.dc('author'), me)) {
          myResponse = r
        }
      })

      var id = UI.widgets.newThing(doc).uri
      if (myResponse === null) {
        myResponse = $rdf.sym(id + '_response')
        insertables.push($rdf.st(invitation, ns.sched('response'), myResponse, doc))
        insertables.push($rdf.st(myResponse, ns.dc('author'), me, doc))
      } else {
        var dps = kb.each(myResponse, ns.sched('cell'))
        dps.map(function (dataPoint) {
          var time = kb.any(dataPoint, ns.cal('dtstart'))
          dataPointForNT[time.toNT()] = dataPoint
        })
      }
      for (let j = 0; j < possibleTimes.length; j++) {
        if (dataPointForNT[possibleTimes[j].toNT()]) continue
        var dataPoint = $rdf.sym(id + '_' + j)
        insertables.push($rdf.st(myResponse, ns.sched('cell'), dataPoint, doc))
        insertables.push($rdf.st(dataPoint, ns.cal('dtstart'), possibleTimes[j], doc)) // @@
        dataPointForNT[possibleTimes[j].toNT()] = dataPoint
      }
      if (insertables.length) {
        UI.store.updater.update([], insertables, function (uri, success, errorBody) {
          if (!success) {
            complainIfBad(success, errorBody)
          } else {
            displayTheMatrix()
          }
        })
      } else { // no insertables
        displayTheMatrix()
      }
    }
    */
    // end setTimesOfDay

    // Read or create empty results file
    var getResults = function () {
      fetcher.nowOrWhenFetched(resultsDoc.uri, (ok, body, response) => {
        if (!ok) {
          if (response.status === 404) {
            // /  Check explicitly for 404 error
            console.log('Initializing details file ' + resultsDoc)
            updater.put(resultsDoc, [], 'text/turtle', function (
              uri2,
              ok,
              message
            ) {
              if (ok) {
                clearElement(naviMain)
                showResults()
              } else {
                complainIfBad(
                  ok,
                  'FAILED to create results file at: ' +
                    resultsDoc.uri +
                    ' : ' +
                    message
                )
                console.log(
                  'FAILED to craete results file at: ' +
                    resultsDoc.uri +
                    ' : ' +
                    message
                )
              }
            })
          } else {
            // Other error, not 404 -- do not try to overwite the file
            complainIfBad(ok, 'FAILED to read results file: ' + body)
          }
        } else {
          // Happy read
          clearElement(naviMain)
          showResults()
        }
      })
    }

    var showResults = function () {
      //       Now the form for responsing to the poll
      //

      // div.appendChild(dom.createElement('hr'))

      // var invitation = subject
      const title = kb.any(invitation, ns.cal('summary'))
      const comment = kb.any(invitation, ns.cal('comment'))
      const location = kb.any(invitation, ns.cal('location'))
      const div = naviMain
      if (title) div.appendChild(dom.createElement('h3')).textContent = title
      if (location) {
        div.appendChild(dom.createElement('address')).textContent =
          location.value
      }
      if (comment) {
        div.appendChild(dom.createElement('p')).textContent = comment.value
      }
      const author = kb.any(invitation, ns.dc('author'))
      if (author) {
        const authorName = kb.any(author, ns.foaf('name'))
        if (authorName) {
          div.appendChild(dom.createElement('p')).textContent = authorName
        }
      }

      const query = new $rdf.Query('Responses')
      const v = {}
      const vs = ['time', 'author', 'value', 'resp', 'cell']
      vs.forEach(function (x) {
        query.vars.push((v[x] = $rdf.variable(x)))
      })
      query.pat.add(invitation, ns.sched('response'), v.resp)
      query.pat.add(v.resp, ns.dc('author'), v.author)
      query.pat.add(v.resp, ns.sched('cell'), v.cell)
      query.pat.add(v.cell, ns.sched('availabilty'), v.value)
      query.pat.add(v.cell, ns.cal('dtstart'), v.time)

      // Sort by by person @@@

      const options = {}
      options.set_x = kb.each(subject, ns.sched('option')) // @@@@@ option -> dtstart in future
      options.set_x = options.set_x.map(function (opt) {
        return kb.any(opt, ns.cal('dtstart'))
      })

      options.set_y = kb.each(subject, ns.sched('response'))
      options.set_y = options.set_y.map(function (resp) {
        return kb.any(resp, ns.dc('author'))
      })

      const possibleTimes = kb
        .each(invitation, ns.sched('option'))
        .map(function (opt) {
          return kb.any(opt, ns.cal('dtstart'))
        })

      const displayTheMatrix = function () {
        const matrix = div.appendChild(
          UI.matrix.matrixForQuery(
            dom,
            query,
            v.time,
            v.author,
            v.value,
            options,
            function () {}
          )
        )

        matrix.setAttribute('class', 'matrix')

        const refreshButton = dom.createElement('button')
        refreshButton.setAttribute('style', inputStyle)
        // refreshButton.textContent = 'refresh' // noun_479395.svg
        const refreshIcon = dom.createElement('img')
        refreshIcon.setAttribute('src', UI.icons.iconBase + 'noun_479395.svg')
        refreshIcon.setAttribute('style', buttonIconStyle)
        refreshButton.appendChild(refreshIcon)
        refreshButton.addEventListener(
          'click',
          function (_e) {
            refreshButton.disabled = true
            kb.fetcher.refresh(resultsDoc, function (ok, body) {
              if (!ok) {
                console.log('Cant refresh matrix' + body)
              } else {
                matrix.refresh()
                refreshButton.disabled = false
              }
            })
          },
          false
        )

        clearElement(naviCenter)
        naviCenter.appendChild(refreshButton)
      }

      // @@ Give other combos too-- see schedule ontology
      // var possibleAvailabilities = [ SCHED('No'), SCHED('Maybe'), SCHED('Yes') ]

      // var me = UI.authn.currentUser()

      const dataPointForNT = []

      const loginContext = { div: naviCenter, dom: dom }
      UI.authn.logIn(loginContext).then(context => {
        const me = context.me
        const doc = resultsDoc
        options.set_y = options.set_y.filter(function (z) {
          return !z.sameTerm(me)
        })
        options.set_y.push(me) // Put me on the end

        options.cellFunction = function (cell, x, y, value) {
          if (value !== null) {
            kb.fetcher.nowOrWhenFetched(
              value.uri.split('#')[0],
              undefined,
              function (ok, _error) {
                if (ok) refreshCellColor(cell, value)
              }
            )
          }
          if (y.sameTerm(me)) {
            const callbackFunction = function () {
              refreshCellColor(cell, value)
            } //  @@ may need that
            const selectOptions = {}
            const predicate = ns.sched('availabilty')
            const cellSubject = dataPointForNT[x.toNT()]
            const selector = UI.widgets.makeSelectForOptions(
              dom,
              kb,
              cellSubject,
              predicate,
              possibleAvailabilities,
              selectOptions,
              resultsDoc,
              callbackFunction
            )
            cell.appendChild(selector)
          } else if (value !== null) {
            cell.textContent = UI.utils.label(value)
          }
        }

        const responses = kb.each(invitation, ns.sched('response'))
        let myResponse = null
        responses.forEach(function (r) {
          if (kb.holds(r, ns.dc('author'), me)) {
            myResponse = r
          }
        })

        const insertables = [] // list of statements to be stored

        const id = UI.widgets.newThing(doc).uri
        if (myResponse === null) {
          myResponse = $rdf.sym(id + '_response')
          insertables.push(
            $rdf.st(invitation, ns.sched('response'), myResponse, doc)
          )
          insertables.push($rdf.st(myResponse, ns.dc('author'), me, doc))
        } else {
          const dps = kb.each(myResponse, ns.sched('cell'))
          dps.forEach(function (dataPoint) {
            const time = kb.any(dataPoint, ns.cal('dtstart'))
            dataPointForNT[time.toNT()] = dataPoint
          })
        }
        for (let j = 0; j < possibleTimes.length; j++) {
          if (dataPointForNT[possibleTimes[j].toNT()]) continue
          const dataPoint = $rdf.sym(id + '_' + j)
          insertables.push(
            $rdf.st(myResponse, ns.sched('cell'), dataPoint, doc)
          )
          insertables.push(
            $rdf.st(dataPoint, ns.cal('dtstart'), possibleTimes[j], doc)
          ) // @@
          dataPointForNT[possibleTimes[j].toNT()] = dataPoint
        }
        if (insertables.length) {
          kb.updater.update([], insertables, function (
            uri,
            success,
            errorBody
          ) {
            if (!success) {
              complainIfBad(success, errorBody)
            } else {
              displayTheMatrix()
            }
          })
        } else {
          // no insertables
          displayTheMatrix()
        }
      })

      // If I made this in the first place, allow me to edit it.
      // @@ optionally -- allows others to if according to original
      const instanceCreator = kb.any(subject, ns.foaf('maker')) // owner?
      if (!instanceCreator || instanceCreator.sameTerm(me)) {
        const editButton = dom.createElement('button')
        editButton.setAttribute('style', inputStyle)
        // editButton.textContent = '(Modify the poll)' // noun_344563.svg
        const editIcon = dom.createElement('img')
        editIcon.setAttribute('src', UI.icons.iconBase + 'noun_344563.svg')
        editIcon.setAttribute('style', buttonIconStyle)
        editButton.appendChild(editIcon)
        editButton.addEventListener(
          'click',
          function (_e) {
            clearElement(div)
            showForms()
          },
          false
        )
        clearElement(naviLeft)
        naviLeft.appendChild(editButton)
      }

      // div.appendChild(editButton)

      clearElement(naviRight)
      naviRight.appendChild(newInstanceButton())
    } // showResults

    var div = dom.createElement('div')
    const structure = div.appendChild(dom.createElement('table')) // @@ make responsive style
    structure.setAttribute(
      'style',
      'background-color: white; min-width: 40em; min-height: 13em;'
    )

    const naviLoginoutTR = structure.appendChild(dom.createElement('tr'))
    naviLoginoutTR.appendChild(dom.createElement('td'))
    naviLoginoutTR.appendChild(dom.createElement('td'))
    naviLoginoutTR.appendChild(dom.createElement('td'))

    var logInOutButton = null
    /*
    var logInOutButton = UI.authn.loginStatusBox(dom, setUser)
    // floating divs lead to a mess
    // logInOutButton.setAttribute('style', 'float: right') // float the beginning of the end
    naviLoginout3.appendChild(logInOutButton)
    logInOutButton.setAttribute('style', 'margin-right: 0em;')
    */

    const naviTop = structure.appendChild(dom.createElement('tr'))
    var naviMain = naviTop.appendChild(dom.createElement('td'))
    naviMain.setAttribute('colspan', '3')

    const naviMenu = structure.appendChild(dom.createElement('tr'))
    naviMenu.setAttribute('class', 'naviMenu')
    naviMenu.setAttribute(
      'style',
      ' text-align: middle; vertical-align: middle; padding-top: 4em; '
    )
    //    naviMenu.setAttribute('style', 'margin-top: 3em;')
    var naviLeft = naviMenu.appendChild(dom.createElement('td'))
    var naviCenter = naviMenu.appendChild(dom.createElement('td'))
    var naviRight = naviMenu.appendChild(dom.createElement('td'))

    getForms()

    return div
  } // render
} // property list
// ends
