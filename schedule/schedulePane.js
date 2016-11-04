/*   Scheduler Pane
**
**
*/

var UI = require('solid-ui')

module.exports = {
  icon: UI.icons.iconBase + 'noun_346777.svg', // @@ better?

  name: 'schedule',

  // Does the subject deserve an contact pane?
  label: function (subject) {
    var kb = UI.store
    var ns = UI.ns
    var t = kb.findTypeURIs(subject)
    if (t['http://www.w3.org/ns/pim/schedule#SchedulableEvent']) return 'Scheduling poll'
    return null // No under other circumstances
  },

//////////////////////// Mint a new Schedule poll

  mintNew: function (options) {

    return new Promise(function(resolve, reject){

      var ns = UI.ns
      var newBase = options.newBase
      var thisInstance = options.useExisting

      var ICAL = $rdf.Namespace('http://www.w3.org/2002/12/cal/ical#')
      var SCHED = $rdf.Namespace('http://www.w3.org/ns/pim/schedule#')
      var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/')
      var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')

      var complainIfBad = function(ok, body){
        if (ok) return;
        console.log("Error in Schedule Pane: Error constructing new scheduler: " + body)
        reject(new Error(body))
      }

      var webOperation = function (method, uri, options, callback) {
        var xhr = $rdf.Util.XMLHTTPFactory()
        uri = UI.store.fetcher.proxyIfNecessary(uri)
        xhr.onreadystatechange = function () {
          if (xhr.readyState == 4) {
            var success = (!xhr.status || (xhr.status >= 200 && xhr.status < 300))
            callback(uri, success, xhr.responseText, xhr)
          }
        }
        xhr.open(method, uri, true)
        if (options.contentType) {
          xhr.setRequestHeader('Content-type', options.contentType)
        }
        xhr.send(options.data ? options.data : undefined)
      }

      var webCopy = function (here, there, content_type, callback) {
        webOperation('GET', here, {}, function (uri, success, body, xhr) {
          if (success) {
            webOperation('PUT', there, { data: xhr.responseText, contentType: content_type}, callback)
          } else {
            callback(uri, success, '(on read) ' + body, xhr)
          }
        })
      }

      // ////////////////////// Accesss control

      // Two variations of ACL for this app, public read and public read/write
      // In all cases owner has read write control

      var genACLtext = function (docURI, aclURI, allWrite) {
        var g = $rdf.graph(), auth = $rdf.Namespace('http://www.w3.org/ns/auth/acl#')
        var a = g.sym(aclURI + '#a1'), acl = g.sym(aclURI), doc = g.sym(docURI)
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
      var setACL3 = function (docURI, allWrite, callback) {
        var aclText = genACLtext(docURI, aclDoc.uri, allWrite)
        return UI.acl.setACL(docURI, aclText, callback)
      }
      */

      var setACL2 = function (docURI, allWrite, callback) {
       var aclDoc = kb.any(kb.sym(docURI),
         kb.sym('http://www.iana.org/assignments/link-relations/acl')); // @@ check that this get set by web.js
       if (aclDoc) { // Great we already know where it is
         var aclText = genACLtext(docURI, aclDoc.uri, allWrite)
         webOperation('PUT', aclDoc.uri, { data: aclText, contentType: 'text/turtle'}, callback)
       } else {
         fetcher.nowOrWhenFetched(docURI, undefined, function (ok, body) {
           if (!ok) return callback(ok, 'Gettting headers for ACL: ' + body)
           var aclDoc = kb.any(kb.sym(docURI),
             kb.sym('http://www.iana.org/assignments/link-relations/acl')); // @@ check that this get set by web.js
           if (!aclDoc) {
             // complainIfBad(false, "No Link rel=ACL header for " + docURI)
             callback(false, 'No Link rel=ACL header for ' + docURI)
           } else {
             var aclText = genACLtext(docURI, aclDoc.uri, allWrite)
             webOperation('PUT', aclDoc.uri, { data: aclText, contentType: 'text/turtle'}, callback)
           }
         })
       }
     }

      // Body of mintNew

      var kb = UI.store
      var fetcher = kb.fetcher
      var updater = kb.updater

      var me = tabulator.preferences.get('me')
      me = me ? kb.sym(me) : null
      if (!me) {
        console.log('MUST BE LOGGED IN')
        alert('NOT LOGGED IN')
        return
      }

      var base = thisInstance.dir().uri
      var newDetailsDoc, newInstance, newResultsDoc, newIndexDoc

      if (options.useExisting){
        newInstance = options.useExisting
        newBase = thisInstance.dir().uri
        newDetailsDoc = newInstance.doc()
        newIndexDoc = null
        if (options.newBase) throw "mint new scheduler: Illegal - have both new base and existing event"
      } else {
        newDetailsDoc = kb.sym(newBase + 'details.ttl')
        newIndexDoc = kb.sym(newBase + 'index.html')
        newInstance = kb.sym(newDetailsDoc.uri + '#event')
      }
      var newResultsDoc = kb.sym(newBase + 'results.ttl')


      var toBeCopied = options.noIndexHTML ? {} : [ { local: 'index.html', contentType: 'text/html'}

      //   { local: 'forms.ttl', contentType: 'text/turtle'}
      //            { local: 'schedule.js', contentType: 'application/javascript'} ,
      //            { local: 'mashlib.js', contentType: 'application/javascript'} , //  @@ centrialize after testing?
      ]


      var agenda = []

      var f, fi, fn; //   @@ This needs some form of visible progress bar
      for (f = 0; f < toBeCopied.length; f++) {
        var item = toBeCopied[f]
        var fun = function copyItem (item) {
          agenda.push(function () {
            var newURI = newBase + item.local
            console.log('Copying ' + base + item.local + ' to ' + newURI)
            fetcher.webCopy(base + item.local, newBase + item.local, item.contentType)
            .then(function(xhr){

              xhr.resource = kb.sym(newURI);
              kb.fetcher.parseLinkHeader(xhr, kb.bnode()); // Dont save the whole headers, just the links

              var setThatACL = function () {
                setACL2(newURI, false, function (ok, message) {
                  if (!ok) {
                    complainIfBad(ok, 'FAILED to set ACL ' + newURI + ' : ' + message)
                    console.log('FAILED to set ACL ' + newURI + ' : ' + message)
                  } else {
                    agenda.shift()() // beware too much nesting
                  }
                })
              }
              if (!me) {
                console.log('Waiting to find out id user users to access ' + xhr.resource)
                UI.widgets.checkUser(xhr.resource, function (webid) {
                  me = kb.sym(webid)
                  console.log('Got user id: ' + me)
                  setThatACL()
                })
              } else {
                setThatACL()
              }
            })
            .catch(function(e){
              complainIfBad(false, 'FAILED to copy ' + base + item.local + ' : ' + e)
              console.log('FAILED to copy ' + base + item.local + ' : ' + e)
            });
          }) // agenda.push
        }
        fun(item)
      }

      agenda.push(function createDetailsFile () {
        kb.add(newInstance, ns.rdf('type'), SCHED('SchedulableEvent'), newDetailsDoc)
        if (me) {
          kb.add(newInstance, DC('author'), me, newDetailsDoc)
        }

        kb.add(newInstance, DC('created'), new Date(), newDetailsDoc)
        kb.add(newInstance, SCHED('resultsDocument'), newDetailsDoc)

        updater.put(
          newDetailsDoc,
          kb.statementsMatching(undefined, undefined, undefined, newDetailsDoc),
          'text/turtle',
          function (uri2, ok, message) {
            if (ok) {
              agenda.shift()()
            } else {
              complainIfBad(ok, 'FAILED to save new scheduler at: ' + there.uri + ' : ' + message)
              console.log('FAILED to save new scheduler at: ' + there.uri + ' : ' + message)
            }
          }
        )
      })

      agenda.push(function () {
        webOperation('PUT', newResultsDoc.uri, { data: '', contentType: 'text/turtle'}, function (ok, body) {
          complainIfBad(ok, 'Failed to initialize empty results file: ' + body)
          if (ok) agenda.shift()()
        })
      })

      agenda.push(function () {
        setACL2(newResultsDoc.uri, true, function (ok, body) {
          complainIfBad(ok, 'Failed to set Read-Write ACL on results file: ' + body)
          if (ok) agenda.shift()()
        })
      })

      agenda.push(function () {
        setACL2(newDetailsDoc.uri, false, function (ok, body) {
          complainIfBad(ok, 'Failed to set read ACL on configuration file: ' + body)
          if (ok) agenda.shift()()
        })
      })

      agenda.push(function () { // give the user links to the new app
        console.log("Finished minting new scheduler")
        resolve(options)
      })

      agenda.shift()()
    // Created new data files.
    }) // promise
  }, // mintNew

  /////////////////////////////////////// Render one meeting schedule poll

  render: function (subject, dom) {
    var kb = UI.store
    var ns = UI.ns
    var appPathSegment = 'app-when-can-we.w3.org' // how to allocate this string and connect to

    // ////////////////////////////////////////////

    var fetcher = UI.store.fetcher
    var updater = kb.updater
    var waitingForLogin = false

    var ICAL = $rdf.Namespace('http://www.w3.org/2002/12/cal/ical#')
    var SCHED = $rdf.Namespace('http://www.w3.org/ns/pim/schedule#')
    var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/')
    var DCT = $rdf.Namespace('http://purl.org/dc/terms/')
    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/')

    var thisInstance = subject
    var detailsDoc = subject.doc()
    var baseDir = detailsDoc.dir()
    var base = baseDir.uri

    var resultsDoc = $rdf.sym(base + 'results.ttl')
    //var forms_uri = base + 'forms.ttl'
    var forms_uri = 'https://linkeddata.github.io/solid-app-set/schedule/formsForSchedule.ttl'

    var form1 = kb.sym(forms_uri + '#form1')
    var form2 = kb.sym(forms_uri + '#form2')
    var form3 = kb.sym(forms_uri + '#form3')

    var inputStyle = 'background-color: #eef; padding: 0.5em;  border: .5em solid white;' //  font-size: 120%;

    // Utility functions

    var complainIfBad = function (ok, message) {
      if (!ok) {
        div.appendChild(UI.widgets.errorMessageBlock(dom, message, 'pink'))
      }
    }

    var clearElement = function (ele) {
      while (ele.firstChild) {
        ele.removeChild(ele.firstChild)
      }
      return ele
    }

    // //////////////////////////////////// Getting logged in with a WebId

    var setUser = function (webid) {
      if (webid) {
        tabulator.preferences.set('me', webid)
        console.log('(SetUser: Logged in as ' + webid + ')')
        me = kb.sym(webid)
      // @@ Here enable all kinds of stuff
      } else {
        tabulator.preferences.set('me', '')
        console.log('(SetUser: Logged out)')
        me = null
      }
      if (logInOutButton) {
        logInOutButton.refresh()
      }
      if (webid && waitingForLogin) {
        waitingForLogin = false
        showAppropriateDisplay()
      }
    }

    var me_uri = tabulator.preferences.get('me')
    var me = me_uri ? kb.sym(me_uri) : null
    UI.widgets.checkUser(detailsDoc, setUser)

    // //////////////////////////////  Reproduction: spawn a new instance
    //
    // Viral growth path: user of app decides to make another instance
    //

    var newInstanceButton = function () {
      var b = UI.widgets.newAppInstance(dom, { noun: 'scheduler'},
        initializeNewInstanceInWorkspace)
      b.firstChild.setAttribute('style', inputStyle)
      return b
    } // newInstanceButton

    // ///////////////////////  Create new document files for new instance of app

    var initializeNewInstanceInWorkspace = function (ws) {
      var newBase = kb.any(ws, ns.space('uriPrefix'))
      if (!newBase) {
        newBase = ws.uri.split('#')[0]
      } else {
        newBase = newBase.value
      }
      if (newBase.slice(-1) !== '/') {
        $rdf.log.error(appPathSegment + ': No / at end of uriPrefix ' + newBase); // @@ paramater?
        newBase = newBase + '/'
      }
      var now = new Date()
      newBase += appPathSegment + '/id' + now.getTime() + '/' // unique id

      initializeNewInstanceAtBase(thisInstance, newBase)
    }

    var initializeNewInstanceAtBase = function (thisInstance, newBase) {
      var options = {thisInstance: thisInstance, newBase: newBase}
      this.mintNew(options).then(function(options){
        var p = div.appendChild(dom.createElement('p'))
        p.setAttribute('style', 'font-size: 140%;')
        p.innerHTML =
          "Your <a href='" + result.uri + "'><b>new scheduler</b></a> is ready to be set up. " +
          "<br/><br/><a href='" + result.uri + "'>Say when you what days work for you.</a>"
      }).catch(function(error){
        complainIfBad(false, result)
      });
    }


    // ///////////////////////

    var getForms = function () {
      console.log('getforms()')
      fetcher.nowOrWhenFetched(forms_uri, undefined, function (ok, body) {
        console.log('getforms() ok? ' + ok)
        if (!ok) return complainIfBad(ok, body)
        getDetails()
      })
    }

    var getDetails = function () {
      console.log('getDetails()'); // Looking for blank screen hang-up
      fetcher.nowOrWhenFetched(detailsDoc.uri, undefined, function (ok, body) {
        console.log('getDetails() ok? ' + ok)
        if (!ok) return complainIfBad(ok, body)
        showAppropriateDisplay()
      })
    }

    var listenToIframe = function () {
      // Event listener for login (from child iframe)
      var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
      var eventListener = window[eventMethod]
      var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message'

      // Listen to message from child window
      eventListener(messageEvent, function (e) {
        if (e.data.slice(0, 5) == 'User:') {
          // the URI of the user (currently either http* or dns:* values)
          var user = e.data.slice(5, e.data.length)
          if (user.slice(0, 4) == 'http') {
            // we have an HTTP URI (probably a WebID), do something with the user variable
            // i.e. app.login(user)
            setUser(user)
          }
        }
      }, false)
    }

    var showAppropriateDisplay = function () {
      console.log('showAppropriateDisplay()')
      var me_uri = tabulator.preferences.get('me')
      var me = me_uri ? kb.sym(me_uri) : null

      if (!me) {
        showSignon()
      } else {
        // On gh-pages, the turtle will not load properly (bad mime type)
        // but we can trap it as being a non-editable server.

        if (!UI.store.updater.editable(detailsDoc.uri, kb) ||
          kb.holds(subject, ns.rdf('type'), ns.wf('TemplateInstance'))) {
          // This is read-only example e.g. on github pages, etc
          showBootstrap(div)
          return
        }

        var ready = kb.any(subject, SCHED('ready'))
        if (!ready) {
          showForms()
        } else { // no editing not author
          getResults()
        }
      }
    }

    var showSignon = function showSignon () {
      var d = clearElement(naviMain)
      // var d = div.appendChild(dom.createElement('div'))
      var origin = window && window.location ? window.location.origin : ''
      d.innerHTML = '<p style="font-size: 120%; background-color: #ffe; padding: 2em; margin: 1em; border-radius: 1em;">' +
        'You need to be logged in.<br />To be able to use this app' +
        ' you need to log in with webid account at a storage provider.</p> ' +
        '<iframe class="text-center" src="https://solid.github.io/solid-idps/?origin=' + origin + '" ' +
        'style="margin-left: 1em; margin-right: 1em; width: 95%; height: 40em;" ' +
        ' sandbox="allow-same-origin allow-scripts allow-forms" frameborder="0"></iframe>'
      listenToIframe()
      waitingForLogin = true // hack
    }

    var showBootstrap = function showBootstrap () {
      var div = clearElement(naviMain)
      var na = div.appendChild(UI.widgets.newAppInstance(
        dom, 'Start a new poll in a workspace', initializeNewInstanceInWorkspace))

      var hr = div.appendChild(dom.createElement('hr')); // @@

      var p = div.appendChild(dom.createElement('p'))
      p.textContent = 'Where would you like to store the data for the poll?  ' +
        'Give the URL of the directory where you would like the data stored.'
      var baseField = div.appendChild(dom.createElement('input'))
      baseField.setAttribute('type', 'text')
      baseField.size = 80 // really a string
      baseField.label = 'base URL'
      baseField.autocomplete = 'on'

      div.appendChild(dom.createElement('br')); // @@

      var button = div.appendChild(dom.createElement('button'))
      button.setAttribute('style', inputStyle)
      button.textContent = 'Start new poll at this URI'
      button.addEventListener('click', function (e) {
        var newBase = baseField.value
        if (newBase.slice(-1) !== '/') {
          newBase += '/'
        }
        initializeNewInstanceAtBase(thisInstance, newBase)
      })
    }

    // ///////////// The forms to configure the poll

    var showForms = function () {
      var div = naviMain
      var wizard = true
      var currentSlide = 0
      var gotDoneButton = false
      if (wizard) {
        forms = [ form1, form2, form3 ]
        slides = []
        var slide, currentSlide = 0
        for (var f = 0; f < forms.length; f++) {
          slide = dom.createElement('div')
          UI.widgets.appendForm(document, slide, {}, subject, forms[f], detailsDoc, complainIfBad)
          slides.push(slide)
        }

        var refresh = function () {
          clearElement(naviMain).appendChild(slides[currentSlide])

          if (currentSlide === 0) {
            b1.setAttribute('disabled', '')
          } else {
            b1.removeAttribute('disabled')
          }
          if (currentSlide === slides.length - 1) {
            b2.setAttribute('disabled', '')
            if (!gotDoneButton) { // Only expose at last slide seen
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
        b1.addEventListener('click', function (e) {
          if (currentSlide > 0) {
            currentSlide -= 1
            refresh()
          }
        }, false)

        var b2 = clearElement(naviRight).appendChild(dom.createElement('button'))
        b2.setAttribute('style', inputStyle)
        b2.textContent = 'continue ->'
        b2.addEventListener('click', function (e) {
          if (currentSlide < slides.length - 1) {
            currentSlide += 1
            refresh()
          }
        }, false)

        refresh()

      } else { // not wizard one big form
        // @@@ create the initial config doc if not exist
        var table = div.appendChild(dom.createElement('table'))
        UI.widgets.appendForm(document, table, {}, subject, form1, detailsDoc, complainIfBad)
        UI.widgets.appendForm(document, table, {}, subject, form2, detailsDoc, complainIfBad)
        UI.widgets.appendForm(document, table, {}, subject, form3, detailsDoc, complainIfBad)
        naviCenter.appendChild(doneButton) // could also check data shape

      }
      // @@@  link config to results

      insertables = []
      insertables.push($rdf.st(subject, SCHED('availabilityOptions'), SCHED('YesNoMaybe'), detailsDoc))
      insertables.push($rdf.st(subject, SCHED('ready'), new Date(), detailsDoc))
      insertables.push($rdf.st(subject, SCHED('results'), resultsDoc, detailsDoc)); // @@ also link in results

      var doneButton = dom.createElement('button')
      doneButton.setAttribute('style', inputStyle)
      doneButton.textContent = 'Go to poll'
      doneButton.addEventListener('click', function (e) {
        if (kb.any(subject, SCHED('ready'))) { // already done
          getResults()
          naviRight.appendChild(emailButton)
        } else {
          naviRight.appendChild(emailButton)
          UI.store.updater.update([], insertables, function (uri, success, error_body) {
            if (!success) {
              complainIfBad(success, error_body)
            } else {
              // naviRight.appendChild(emailButton)
              getResults()
            }
          })
        }
      }, false)

      var emailButton = dom.createElement('button')
      emailButton.setAttribute('style', inputStyle)
      var emailIcon = emailButton.appendChild(dom.createElement('img'))
      //emailIcon.setAttribute('src', scriptBase + 'envelope-icon.png') // noun_480183.svg
      emailIcon.setAttribute('src', UI.icons.iconBase + 'noun_480183.svg') // noun_480183.svg
      emailButton.textContent = 'email invitations'
      emailButton.addEventListener('click', function (e) {
        var title = '' + (kb.any(subject, DC('title')) || '')
        var mailto = 'mailto:' +
          kb.each(subject, SCHED('invitee')).map(function (who) {
            var mbox = kb.any(who, FOAF('mbox'))
            return mbox ? '' + mbox : ''
          }).join(',') +
          '?subject=' + encodeURIComponent(title + '-- When can we meet?') +
          '&body=' + encodeURIComponent(title + '\n\nWhen can you?\n\nSee ' + base + 'index.html\n')

        console.log('Mail: ' + mailto)
        window.location.href = mailto
      }, false)
    } // showForms

    // Ask for each day, what times

    var setTimesOfDay = function () {
      var i, j, x, y, slot, cell, day, insertables = []
      var possibleDays = kb.each(invitation, SCHED('option'))
        .map(function (opt) {return kb.any(opt, ICAL('dtstart'))})
      var cellLookup = []
      var slots = kb.each(invitation, SCHED('slot'))
      if (slots.length === 0) {
        for (i = 0; i < 2; i++) {
          slot = UI.widgets.newThing(detailsDoc)
          insertables.push($rdf.st(invitation, SCHED('slot'), slot))
          insertables.push($rdf.st(slott, RDFS('label'), 'slot ' + (i + 1)))
          for (j = 0; j < possibleDays.length; j++) {
            day - possibleDays[j]
            x = kb.any(slot, RDFS('label'))
            y = kb.any(day, ICAL('dtstart'))
            cell = UI.widgets.newThing(detailsDoc)
            cellLookup[x.toNT() + y.toNT()] = cell
            insertables.push($rdf.st(slot, SCHED('cell'), cell))
            insertables.push($rdf.st(cell, SCHED('day'), possibleDays[j]))
          }
        }
      }

      var query = new $rdf.Query('TimesOfDay')
      var v = {}['day', 'label', 'value', 'slot', 'cell'].map(function (x) {
        query.vars.push(v[x] = $rdf.variable(x))})
      query.pat.add(invitation, SCHED('slot'), v.slot)
      query.pat.add(v.slot, RDFS('label'), v.label)
      query.pat.add(v.slot, SCHED('cell'), v.cell)
      query.pat.add(v.cell, SCHED('timeOfDay'), v.value)
      query.pat.add(v.cell, SCHED('day'), v.day)

      var options = {}
      options.set_x = kb.each(subject, SCHED('slot')); // @@@@@ option -> dtstart in future
      options.set_x = options.set_x.map(function (opt) {return kb.any(opt, RDFS('label'))})

      options.set_y = kb.each(subject, SCHED('option')); // @@@@@ option -> dtstart in future
      options.set_y = options.set_y.map(function (opt) {return kb.any(opt, ICAL('dtstart'))})

      var possibleTimes = kb.each(invitation, SCHED('option'))
        .map(function (opt) {return kb.any(opt, ICAL('dtstart'))})

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
      options.set_y = options.set_y.filter(function (z) { return (! z.sameTerm(me))})
      options.set_y.push(me) // Put me on the end

      options.cellFunction = function (cell, x, y, value) {
        var point = cellLookup[x.toNT() + y.toNT()]

        if (y.sameTerm(me)) {
          var callback = function () { refreshColor(); }; //  @@ may need that
          var selectOptions = {}
          var predicate = SCHED('timeOfDay')
          var cellSubject = dataPointForNT[x.toNT()]
          var selector = UI.widgets.makeSelectForOptions(dom, kb, cellSubject, predicate,
            possibleAvailabilities, selectOptions, resultsDoc, callback)
          cell.appendChild(selector)
        } else if (value !== null) {
          cell.textContent = UI.utils.label(value)
        }

      }

      var responses = kb.each(invitation, SCHED('response'))
      var myResponse = null
      responses.map(function (r) {
        if (kb.holds(r, DC('author'), me)) {
          myResponse = r
        }
      })

      var insertables = [] // list of statements to be stored

      var id = UI.widgets.newThing(doc).uri
      if (myResponse === null) {
        myResponse = $rdf.sym(id + '_response')
        insertables.push($rdf.st(invitation, SCHED('response'), myResponse, doc))
        insertables.push($rdf.st(myResponse, DC('author'), me, doc))
      } else {
        var dps = kb.each(myResponse, SCHED('cell'))
        dps.map(function (dataPoint) {
          var time = kb.any(dataPoint, ICAL('dtstart'))
          dataPointForNT[time.toNT()] = dataPoint
        })
      }
      for (var j = 0; j < possibleTimes.length; j++) {
        if (dataPointForNT[possibleTimes[j].toNT()]) continue
        var dataPoint = $rdf.sym(id + '_' + j)
        insertables.push($rdf.st(myResponse, SCHED('cell'), dataPoint, doc))
        insertables.push($rdf.st(dataPoint, ICAL('dtstart'), possibleTimes[j], doc)); // @@
        dataPointForNT[possibleTimes[j].toNT()] = dataPoint
      }
      if (insertables.length) {
        UI.store.updater.update([], insertables, function (uri, success, error_body) {
          if (!success) {
            complainIfBad(success, error_body)
          } else {
            displayTheMatrix()
          }
        })

      } else { // no insertables
        displayTheMatrix()
      }

    }

    // Read or create empty results file

    var getResults = function () {
      var div = naviMain
      fetcher.nowOrWhenFetched(resultsDoc.uri, undefined, function (ok, body, xhr) {
        if (!ok) {
          if (0 + xhr.status === 404) { // /  Check explictly for 404 error
            console.log('Initializing deails file ' + resultsDoc)
            updater.put(resultsDoc, [], 'text/turtle', function (uri2, ok, message, xhr) {
              if (ok) {
                kb.fetcher.saveRequestMetadata(xhr, kb, resultsDoc.uri)
                kb.fetcher.saveResponseMetadata(xhr, kb) // Drives the isEditable question
                clearElement(naviMain)
                showResults()
              } else {
                complainIfBad(ok, 'FAILED to create results file at: ' + resultsDoc.uri + ' : ' + message)
                console.log('FAILED to craete results file at: ' + resultsDoc.uri + ' : ' + message)
              }
            })
          } else { // Other error, not 404 -- do not try to overwite the file
            complainIfBad(ok, 'FAILED to read results file: ' + body)
          }
        } else { // Happy read
          clearElement(naviMain)
          showResults()
        }
      })
    }

    var showResults = function () {
      //       Now the form for responsing to the poll
      //

      // div.appendChild(dom.createElement('hr'))

      var invitation = subject
      var title = kb.any(invitation, DC('title'))
      var comment = kb.any(invitation, ns.rdfs('comment'))
      var location = kb.any(invitation, ICAL('location'))
      var div = naviMain
      if (title) div.appendChild(dom.createElement('h3')).textContent = title
      if (location) div.appendChild(dom.createElement('address')).textContent = location.value
      if (comment) div.appendChild(dom.createElement('p')).textContent = comment.value
      var author = kb.any(invitation, DC('author'))
      if (author) {
        var authorName = kb.any(author, FOAF('name'))
        if (authorName) {
          div.appendChild(dom.createElement('p')).textContent = authorName
        }
      }

      var query = new $rdf.Query('Responses')
      var v = {}
      var vs = ['time', 'author', 'value', 'resp', 'cell']
      vs.map(function (x) {
        query.vars.push(v[x] = $rdf.variable(x))})
      query.pat.add(invitation, SCHED('response'), v.resp)
      query.pat.add(v.resp, DC('author'), v.author)
      query.pat.add(v.resp, SCHED('cell'), v.cell)
      query.pat.add(v.cell, SCHED('availabilty'), v.value)
      query.pat.add(v.cell, ICAL('dtstart'), v.time)

      // Sort by by person @@@

      var options = {}
      options.set_x = kb.each(subject, SCHED('option')); // @@@@@ option -> dtstart in future
      options.set_x = options.set_x.map(function (opt) {return kb.any(opt, ICAL('dtstart'))})

      options.set_y = kb.each(subject, SCHED('response'))
      options.set_y = options.set_y.map(function (resp) {return kb.any(resp, DC('author'))})

      var possibleTimes = kb.each(invitation, SCHED('option'))
        .map(function (opt) {return kb.any(opt, ICAL('dtstart'))})

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

      // @@ Give other combos too-- see schedule ontology
      var possibleAvailabilities = [ SCHED('No'), SCHED('Maybe'), SCHED('Yes')]

      var me_uri = tabulator.preferences.get('me')
      var me = me_uri ? kb.sym(me_uri) : null

      var dataPointForNT = []

      if (me) {
        var doc = resultsDoc
        options.set_y = options.set_y.filter(function (z) { return (! z.sameTerm(me))})
        options.set_y.push(me) // Put me on the end

        options.cellFunction = function (cell, x, y, value) {
          var refreshColor = function () {
            var bg = kb.any(value, UI.ns.ui('backgroundColor'))
            if (bg) cell.setAttribute('style', 'padding: 0.3em; text-align: center; background-color: ' + bg + ';')
          }
          if (value !== null) {
            kb.fetcher.nowOrWhenFetched(value.uri.split('#')[0], undefined, function (uri, ok, error) {
              refreshColor()
            })
          }
          if (y.sameTerm(me)) {
            var callback = function () { refreshColor(); }; //  @@ may need that
            var selectOptions = {}
            var predicate = SCHED('availabilty')
            var cellSubject = dataPointForNT[x.toNT()]
            var selector = UI.widgets.makeSelectForOptions(dom, kb, cellSubject, predicate,
              possibleAvailabilities, selectOptions, resultsDoc, callback)
            cell.appendChild(selector)
          } else if (value !== null) {
            cell.textContent = UI.utils.label(value)
          }
        }

        var responses = kb.each(invitation, SCHED('response'))
        var myResponse = null
        responses.map(function (r) {
          if (kb.holds(r, DC('author'), me)) {
            myResponse = r
          }
        })

        var insertables = [] // list of statements to be stored

        var id = UI.widgets.newThing(doc).uri
        if (myResponse === null) {
          myResponse = $rdf.sym(id + '_response')
          insertables.push($rdf.st(invitation, SCHED('response'), myResponse, doc))
          insertables.push($rdf.st(myResponse, DC('author'), me, doc))
        } else {
          var dps = kb.each(myResponse, SCHED('cell'))
          dps.map(function (dataPoint) {
            var time = kb.any(dataPoint, ICAL('dtstart'))
            dataPointForNT[time.toNT()] = dataPoint
          })
        }
        for (var j = 0; j < possibleTimes.length; j++) {
          if (dataPointForNT[possibleTimes[j].toNT()]) continue
          var dataPoint = $rdf.sym(id + '_' + j)
          insertables.push($rdf.st(myResponse, SCHED('cell'), dataPoint, doc))
          insertables.push($rdf.st(dataPoint, ICAL('dtstart'), possibleTimes[j], doc)); // @@
          dataPointForNT[possibleTimes[j].toNT()] = dataPoint
        }
        if (insertables.length) {
          UI.store.updater.update([], insertables, function (uri, success, error_body) {
            if (!success) {
              complainIfBad(success, error_body)
            } else {
              displayTheMatrix()
            }
          })

        } else { // no insertables
          displayTheMatrix()
        }

      } else {
        // pass me not defined
      }

      var instanceAuthor = kb.any(subject, DC('author'))
      if (!instanceAuthor || instanceAuthor.sameTerm(me)) {
        var editButton = dom.createElement('button')
        editButton.setAttribute('style', inputStyle)
        editButton.textContent = '(Modify the poll)'
        editButton.addEventListener('click', function (e) {
          clearElement(div)
          showForms()
        }, false)
        clearElement(naviLeft)
        naviLeft.appendChild(editButton)
      }

      // div.appendChild(editButton)

      clearElement(naviRight)
      naviRight.appendChild(newInstanceButton())

    } // showResults

    var div = dom.createElement('div')
    var structure = div.appendChild(dom.createElement('table')); // @@ make responsive style
    structure.setAttribute('style', 'background-color: white; min-width: 40em; min-height: 13em;')

    var naviLoginoutTR = structure.appendChild(dom.createElement('tr'))
    var naviLoginout1 = naviLoginoutTR.appendChild(dom.createElement('td'))
    var naviLoginout2 = naviLoginoutTR.appendChild(dom.createElement('td'))
    var naviLoginout3 = naviLoginoutTR.appendChild(dom.createElement('td'))

    var logInOutButton = null
    /*
    var logInOutButton = UI.widgets.loginStatusBox(dom, setUser)
    // floating divs lead to a mess
    // logInOutButton.setAttribute('style', 'float: right') // float the beginning of the end
    naviLoginout3.appendChild(logInOutButton)
    logInOutButton.setAttribute('style', 'margin-right: 0em;')
    */

    var naviTop = structure.appendChild(dom.createElement('tr'))
    var naviMain = naviTop.appendChild(dom.createElement('td'))
    naviMain.setAttribute('colspan', '3')

    var naviMenu = structure.appendChild(dom.createElement('tr'))
    naviMenu.setAttribute('class', 'naviMenu')
    naviMenu.setAttribute('style', ' text-align: middle; vertical-align: middle; padding-top: 4em; ')
    //    naviMenu.setAttribute('style', 'margin-top: 3em;')
    var naviLeft = naviMenu.appendChild(dom.createElement('td'))
    var naviCenter = naviMenu.appendChild(dom.createElement('td'))
    var naviRight = naviMenu.appendChild(dom.createElement('td'))

    getForms()

    return div
  } // render
} // property list
// ends
