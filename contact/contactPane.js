/*   Contact AddressBook Pane
**
**  This outline pane allows a user to interact with an contact,
to change its state according to an ontology, comment on it, etc.
**
** See also things like
**  http://www.w3.org/TR/vcard-rdf/
**  http://tools.ietf.org/html/rfc6350
**  http://www.iana.org/assignments/vcard-elements/vcard-elements.xhtml
**
** I am using in places single quotes strings like 'this'
** where internationalization ("i18n") is not a problem, and double quoted
** like "this" where the string is seen by the user and so I18n is an issue.
*/

var UI = require('solid-ui')
var mime = require('mime-types')
var toolsPane0 = require('./toolsPane')
var toolsPane = toolsPane0.toolsPane

// if (typeof console === 'undefined') { // e.g. firefox extension. Node and browser have console
//   console = {}
//   console.log = function (msg) { UI.log.info(msg) }
// }

module.exports = {
  icon: UI.icons.iconBase + 'noun_99101.svg', // changed from embedded icon 2016-05-01

  name: 'contact',

  // Does the subject deserve an contact pane?
  label: function (subject) {
    var kb = UI.store
    var ns = UI.ns
    var t = kb.findTypeURIs(subject)
    if (t[ns.vcard('Individual').uri]) return 'Contact'
    if (t[ns.vcard('Organization').uri]) return 'contact'
    if (t[ns.vcard('Group').uri]) return 'Group'
    if (t[ns.vcard('AddressBook').uri]) return 'Address book'
    return null // No under other circumstances
  },

  mintClass: UI.ns.vcard('AddressBook'),

  mintNew: function mintNew (context) {
    return new Promise(function (resolve, reject) {
      var dom = context.dom
      var me = context.me
      var div = context.div
      var kb = UI.store
      var ns = UI.ns
      var newBase = context.newBase || context.newInstance.dir().uri
      var instanceClass = context.instanceClass || ns.vcard('AddressBook')

      if (instanceClass.sameTerm(ns.vcard('Group'))) {
        // Make a group not an address book
        var g = context.newInstance || kb.sym(context.newBase + 'index.ttl#this')
        var doc = g.doc()
        kb.add(g, ns.rdf('type'), ns.vcard('Group'), doc)
        kb.add(g, ns.vcard('fn'), context.instanceName || 'untitled group', doc) // @@ write doc back
        kb.fetcher.putBack(doc, {contentType: 'text/turtle'})
          .then(function (xhr) {
            resolve(context)
          })
          .catch(function (err) {
            reject(new Error('Error creating document for new group ' + err))
          })
        return
      }
      var appInstanceNoun = 'address book'

      var complain = function (message) {
        div.appendChild(UI.widgets.errorMessageBlock(dom, message, 'pink'))
      }

      var bookContents = '@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.\n\
  @prefix ab: <http://www.w3.org/ns/pim/ab#>.\n\
  @prefix dc: <http://purl.org/dc/elements/1.1/>.\n\
  @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n\
  \n\
  <#this> a vcard:AddressBook;\n\
      dc:title "New address Book";\n\
      vcard:nameEmailIndex <people.ttl>;\n\
      vcard:groupIndex <groups.ttl>. \n\n'

      bookContents += '<#this> <http://www.w3.org/ns/auth/acl#owner> <' + me.uri + '>.\n\n'

      var toBeWritten = [
        // { to: 'index.html', contentType: 'text/html' },
        { to: 'index.ttl', content: bookContents, contentType: 'text/turtle' },
        { to: 'groups.ttl', content: '', contentType: 'text/turtle' },
        { to: 'people.ttl', content: '', contentType: 'text/turtle' },
        { to: '', existing: true, aclOptions: { defaultForNew: true } }
      ]

      var newAppPointer = newBase + 'index.html' // @@ assuming we can't trust server with bare dir

      var offline = UI.authn.offlineTestID()
      if (offline) {
        toBeWritten.push({ to: 'local.html', from: 'local.html', contentType: 'text/html' })
        newAppPointer = newBase + 'local.html' // kludge for testing
      }

      // @@ Ask user abut ACLs?

      //
      //   @@ Add header to PUT     If-None-Match: *       to prevent overwrite
      //

      var claimSuccess = function (uri, appInstanceNoun) { // @@ delete or grey other stuff
        console.log('Files created. App ready at ' + uri)
        var p = div.appendChild(dom.createElement('p'))
        p.setAttribute('style', 'font-size: 140%;')
        p.innerHTML =
          "Your <a href='" + uri + "'><b>new " + appInstanceNoun + '</b></a> is ready. ' +
          "<br/><br/><a href='" + uri + "'>Go to new " + appInstanceNoun + '</a>'
        resolve(context)
      }

      var doNextTask = function () {
        if (toBeWritten.length === 0) {
          claimSuccess(newAppPointer, appInstanceNoun)
        } else {
          var task = toBeWritten.shift()
          console.log('Creating new file ' + task.to + ' in new instance ')
          var dest = $rdf.uri.join(task.to, newBase) //
          var aclOptions = task.aclOptions || {}
          var checkOKSetACL = function (uri, ok) {
            if (!ok) {
              complain('Error writing new file ' + task.to)
              return reject(new Error('Error writing new file ' + task.to))
            }

            UI.widgets.setACLUserPublic(dest, me, aclOptions)
              .then(() => doNextTask())
              .catch(err => {
                let message = 'Error setting access permissions for ' +
                  task.to + ' : ' + err.message
                complain(message)
                return reject(new Error(message))
              })
          }

          if ('content' in task) {
            kb.fetcher.webOperation('PUT', dest, { data: task.content, saveMetadata: true, contentType: task.contentType })
              .then(() => checkOKSetACL(dest, true))
          } else if ('existing' in task) {
            checkOKSetACL(dest, true)
          } else {
            reject(new Error('copy not expected buiding new app'))
            // var from = task.from || task.to // default source to be same as dest
            // UI.widgets.webCopy(base + from, dest, task.contentType, checkOKSetACL)
          }
        }
      }
      doNextTask()
    })
  },

  //  Render the pane
  render: function (subject, dom, paneOptions) {
    paneOptions = paneOptions || {}
    var kb = UI.store
    var ns = UI.ns
    // var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/')
    // var DCT = $rdf.Namespace('http://purl.org/dc/terms/')
    var div = dom.createElement('div')
    var cardDoc = subject.doc()

    UI.aclControl.preventBrowserDropEvents(dom) // protect drag and drop

    var buttonStyle = 'font-size: 100%; margin: 0.8em; padding:0.5em;'

    div.setAttribute('class', 'contactPane')

    var commentFlter = function (pred, inverse) {
      if (!inverse && pred.uri ===
        'http://www.w3.org/2000/01/rdf-schema#comment') return true
      return false
    }

    var complain = function (message) {
      console.log(message)
      div.appendChild(UI.widgets.errorMessageBlock(dom, message, 'pink'))
    }
    var complainIfBad = function (ok, body) {
      if (!ok) {
        complain('Error: ' + body)
      }
    }

    var thisPane = this

    var timestring = function timestring () {
      var now = new Date()
      return '' + now.getTime()
      // http://www.w3schools.com/jsref/jsref_obj_date.asp
    }

    //  Reproduction: Spawn a new instance of this app
    var newAddressBookButton = function (thisAddressBook) {
      return UI.authn.newAppInstance(dom,
        {noun: 'address book', appPathSegment: 'contactorator.timbl.com'}, function (ws, newBase) {
          thisPane.clone(thisAddressBook, newBase, {me: me, div: div, dom: dom})
        })
    } // newAddressBookButton

    var updater = UI.store.updater
    UI.aclControl.preventBrowserDropEvents(dom)

    var plist = kb.statementsMatching(subject)
    var qlist = kb.statementsMatching(undefined, undefined, subject)

    var t = kb.findTypeURIs(subject)

    var meUri = tabulator.preferences.get('me')
    var me = meUri ? kb.sym(meUri) : null

    var context = {
      target: subject,
      me: me,
      noun: 'address book',
      div: div,
      dom: dom
    } // missing: statusRegion

    // Reload resource then
    var reloadStore = function (store, callBack) {
      UI.store.fetcher.unload(store)
      UI.store.fetcher.nowOrWhenFetched(store.uri, undefined, function (ok, body) {
        if (!ok) {
          console.log('Cant refresh data:' + body)
        } else {
          callBack()
        }
      })
    }

    // Refresh the DOM tree
    var refreshTree = function (root) {
      if (root.refresh) {
        root.refresh()
        return
      }
      for (var i = 0; i < root.children.length; i++) {
        refreshTree(root.children[i])
      }
    }

    //  Render a 3-column browser for an address book or a group
    var renderThreeColumnBrowser = function (books, context, options) {
      kb.fetcher.load(books).then(function (xhr) {
        renderThreeColumnBrowser2(books, context, options)
      }).catch(function (err) { complain(err) })
    }
    var renderThreeColumnBrowser2 = function (books, context, options) {
      var classLabel = UI.utils.label(ns.vcard('AddressBook'))
      var IndividualClassLabel = UI.utils.label(ns.vcard('Individual'))

      var book = books[0] // for now
      var groupIndex = kb.any(book, ns.vcard('groupIndex'))
      var selectedGroups = {}

      var target = options.foreignGroup || book

      var title = kb.any(target, ns.dc('title')) || kb.any(target, ns.vcard('fn'))
      if (paneOptions.solo && title && typeof document !== 'undefined') {
        document.title = title.value // @@ only when the outermmost pane
      }
      title = title ? title.value : classLabel

      var doGroupsForBook = function (book) {
        kb.load(book).then(function (xhr) {
          var nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))
          var groupIndex = kb.any(book, ns.vcard('groupIndex'))
          var selectedGroups = {}
          var title = kb.any(book, ns.dc('title'))
          title = title ? title.value : classLabel
          // @@ Todo
        })
          .catch(function (err) { UI.widgets.complain(context, err) })
      }

      // var cats = kb.each(book, ns.wf('contactCategory')) // zero or more

      //  Write a new contact to the web
      var createNewContact = function (book, name, selectedGroups, callback) {
        var nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))

        var uuid = UI.utils.genUuid()
        var person = kb.sym(book.dir().uri + 'Person/' + uuid + '/index.ttl#this')
        var doc = person.doc()

        // Sets of statements to different files
        var agenda = [ // Patch the main index to add the person
          [ $rdf.st(person, ns.vcard('inAddressBook'), book, nameEmailIndex), // The people index
            $rdf.st(person, ns.vcard('fn'), name, nameEmailIndex) ]
        ]

        // @@ May be missing email - sync that differently

        // sts.push(new $rdf.Statement(person, DCT('created'), new Date(), doc));  ??? include this?
        for (var gu in selectedGroups) {
          var g = kb.sym(gu)
          var gd = g.doc()
          agenda.push([ $rdf.st(g, ns.vcard('hasMember'), person, gd),
            $rdf.st(person, ns.vcard('fn'), name, gd)
          ])
        }

        var updateCallback = function (uri, success, body) {
          if (!success) {
            dump("Error: can't update " + uri + ' for new contact:' + body + '\n')
            callback(false, "Error: can't update " + uri + ' for new contact:' + body)
          } else {
            if (agenda.length > 0) {
              dump('Patching ' + agenda[0] + '\n')
              updater.update([], agenda.shift(), updateCallback)
            } else { // done!
              dump('Done patching. Now reading back in.\n')
              UI.store.fetcher.nowOrWhenFetched(doc, undefined, function (ok, body) {
                if (ok) {
                  dump('Read back in OK.\n')
                  callback(true, person)
                } else {
                  dump('Read back in FAILED: ' + body + '\n')
                  callback(false, body)
                }
              })
            }
          }
        }

        UI.store.fetcher.nowOrWhenFetched(nameEmailIndex, undefined, function (ok, message) {
          if (ok) {
            dump(' People index must be loaded\n')
            updater.put(doc, [
                $rdf.st(person, ns.vcard('fn'), name, doc),
                $rdf.st(person, ns.rdf('type'), ns.vcard('Individual'), doc) ],
              'text/turtle', updateCallback)
          } else {
            dump('Error loading people index!' + nameEmailIndex.uri + ': ' + message)
            callback(false, 'Error loading people index!' + nameEmailIndex.uri + ': ' + message + '\n')
          }
        })
      }

      // Write new group to web
      // Creates an empty new group file and adds it to the index
      //
      var saveNewGroup = function (book, name, callback) {
        var gix = kb.any(book, ns.vcard('groupIndex'))

        var x = book.uri.split('#')[0]
        var gname = name.replace(' ', '_')
        var doc = kb.sym(x.slice(0, x.lastIndexOf('/') + 1) + 'Group/' + gname + '.ttl')
        var group = kb.sym(doc.uri + '#this')
        dump(' New group will be: ' + group + '\n')

        UI.store.fetcher.nowOrWhenFetched(gix, function (ok, message) {
          if (ok) {
            dump(' Group index must be loaded\n')

            var insertTriples = [
              $rdf.st(book, ns.vcard('includesGroup'), group, gix),
              $rdf.st(group, ns.rdf('type'), ns.vcard('Group'), gix),
              $rdf.st(group, ns.vcard('fn'), name, gix)
            ]
            updater.update([], insertTriples, function (uri, success, body) {
              if (ok) {
                var triples = [
                  $rdf.st(group, ns.rdf('type'), ns.vcard('Group'), doc),
                  $rdf.st(group, ns.vcard('fn'), name, doc)
                ]
                updater.put(doc, triples, 'text/turtle', function (uri, ok, body) {
                  callback(ok, ok ? group : "Can't save new group file " + doc + body)
                })
              } else {
                callback(ok, 'Could not update group index ' + body) // fail
              }
            })
          } else {
            dump('Error loading people index!' + gix.uri + ': ' + message)
            callback(false, 'Error loading people index!' + gix.uri + ': ' + message + '\n')
          }
        })
      }

      // Form to get the name of a new thing before we create it
      var getNameForm = function (dom, kb, classLabel, gotNameCallback) {
        var form = dom.createElement('div') // form is broken as HTML behaviour can resurface on js error

        UI.store.fetcher.removeCallback('done', 'expand') // @@ experimental -- does this kill the re-paint? no
        UI.store.fetcher.removeCallback('fail', 'expand') // @@ ??

        // classLabel = UI.utils.label(ns.vcard('Individual'))
        form.innerHTML = '<p>Name of new ' + classLabel + ':</p>'
        var namefield = dom.createElement('input')
        namefield.setAttribute('type', 'text')
        namefield.setAttribute('size', '100')
        namefield.setAttribute('maxLength', '2048') // No arbitrary limits
        namefield.select() // focus next user input

        var gotName = function () {
          namefield.setAttribute('class', 'pendingedit')
          namefield.disabled = true
          gotNameCallback(true, namefield.value)
        }

        namefield.addEventListener('keyup', function (e) {
          if (e.keyCode === 13) {
            gotName()
          }
        }, false)
        form.appendChild(namefield)

        var br = form.appendChild(dom.createElement('br'))

        var cancel = form.appendChild(dom.createElement('button'))
        cancel.setAttribute('type', 'button')
        cancel.style.cssText = buttonStyle
        cancel.innerHTML = 'Cancel'
        cancel.addEventListener('click', function (e) {
          form.parentNode.removeChild(form)
          gotNameCallback(false)
        }, false)

        var b = form.appendChild(dom.createElement('button'))
        b.setAttribute('type', 'button')
        b.innerHTML = 'Continue'
        b.addEventListener('click', function (e) {
          gotName()
        }, false)

        return form
      }

      // organization-name is a hack for Mac records with no FN which is mandatory.
      var nameFor = function (x) {
        var name = kb.any(x, ns.vcard('fn')) ||
          kb.any(x, ns.foaf('name')) || kb.any(x, ns.vcard('organization-name'))
        return name ? name.value : '???'
      }

      var filterName = function (name) {
        var filter = searchInput.value.trim().toLowerCase()
        if (filter.length === 0) return true
        var parts = filter.split(' ') // Each name part must be somewhere
        for (var j = 0; j < parts.length; j++) {
          var word = parts[j]
          if (name.toLowerCase().indexOf(word) < 0) return false
        }
        return true
      }

      var searchFilterNames = function () {
        for (var i = 0; i < peopleMainTable.children.length; i++) {
          var row = peopleMainTable.children[i]
          row.setAttribute('style',
            filterName(nameFor(row.subject)) ? '' : 'display: none;')
        }
      }

      var selectAllGroups = function (selectedGroups, groupsMainTable, callback) {
        var todo = groupsMainTable.children.length
        var badness = []
        for (var k = 0; k < groupsMainTable.children.length; k++) {
          var groupRow = groupsMainTable.children[k]
          var group = groupRow.subject
          var foo = function (group, groupRow) {
            groupRow.setAttribute('style', 'background-color: #ffe;')
            kb.fetcher.nowOrWhenFetched(group.doc(), undefined, function (ok, message) {
              if (!ok) {
                var msg = "Can't load group file: " + group + ': ' + message
                badness.push(msg)
                return complainIfBad(ok, msg)
              }
              groupRow.setAttribute('style', 'background-color: #cce;')
              selectedGroups[group.uri] = true
              refreshGroupsSelected()
              refreshNames() // @@ every time??
              todo -= 1
              if (!todo) {
                if (callback) callback(badness.length === 0, badness)
              }
            })
          }
          foo(group, groupRow)
        } // for each row
      }

      var sortGroups = function () {
        var gs = []
        groups = []
        if (options.foreignGroup) {
          groups.push(['', kb.any(options.foreignGroup, ns.vcard('fn')), options.foreignGroup])
        }
        if (book) {
          books.map(function (book) {
            var gs = book ? kb.each(book, ns.vcard('includesGroup')) : []
            var gs2 = gs.map(function (g) { return [ book, kb.any(g, ns.vcard('fn')), g ] })
            groups = groups.concat(gs2)
          })
          groups.sort()
        }
      }

      var cardPane = function (dom, subject, paneName) {
        var p = UI.panes.byName(paneName)
        var d = p.render(subject, dom)
        d.setAttribute('style', 'border: 0.1em solid #444; border-radius: 0.5em')
        return d
      }

      var compareForSort = function (self, other) {
        var s = nameFor(self)
        var o = nameFor(other)
        if (s && o) {
          s = s.toLowerCase()
          o = o.toLowerCase()
          if (s > o) return 1
          if (s < o) return -1
        }
        if (self.uri > other.uri) return 1
        if (self.uri < other.uri) return -1
        return 0
      }

      // In a LDP work, deletes the whole document describing a thing
      // plus patch out ALL mentiosn of it!    Use with care!
      // beware of other dta picked up from other places being smushed
      // together and then deleted.

      var deleteThing = function (x) {
        var ds = kb.statementsMatching(x).concat(kb.statementsMatching(undefined, undefined, x))
        var targets = {}
        ds.map(function (st) { targets[st.why.uri] = st })
        var agenda = [] // sets of statements of same dcoument to delete
        for (var target in targets) {
          agenda.push(ds.filter(function (st) { return st.why.uri === target }))
          dump('Deleting ' + agenda[agenda.length - 1].length + ' from ' + target)
        }
        function nextOne () {
          if (agenda.length > 0) {
            updater.update(agenda.shift(), [], function (uri, ok, body) {
              if (!ok) {
                complain('Eror deleting all trace of: ' + x + ': ' + body)
                return
              }
              nextOne()
            })
          } else {
            dump('Deleting resoure ' + x.doc())
            kb.fetcher.delete(x.doc())
              .then(function () {
                console.log('Delete thing ' + x + ': complete.')
              })
              .catch(function (e) {
                complain('Error deleting thing ' + x + ': ' + e)
              })
          }
        }
        nextOne()
      }

      var localNode = function (person, div) {
        var aliases = kb.allAliases(person)
        var prefix = book.dir().uri
        for (var i = 0; i < aliases.length; i++) {
          if (aliases[i].uri.slice(0, prefix.length) === prefix) {
            return aliases[i]
          }
        }
        throw new Error('No local URI for ' + person)
      }

      var refreshNames = function () {
        var cards = []
        var ng = 0
        for (var u in selectedGroups) {
          if (selectedGroups[u]) {
            var a = kb.each(kb.sym(u), ns.vcard('hasMember'))
            // dump('Adding '+ a.length + ' people from ' + u + '\n')
            cards = cards.concat(a)
            ng += 1
          }
        }
        cards.sort(compareForSort) // @@ sort by name not UID later
        for (var k = 0; k < cards.length - 1;) {
          if (cards[k].uri === cards[k + 1].uri) {
            cards.splice(k, 1)
          } else {
            k++
          }
        }

        peopleMainTable.innerHTML = '' // clear
        peopleHeader.textContent = (cards.length > 5 ? '' + cards.length + ' contacts' : 'contact')

        for (var j = 0; j < cards.length; j++) {
          var personRow = peopleMainTable.appendChild(dom.createElement('tr'))
          var personLeft = personRow.appendChild(dom.createElement('td'))
          var personRight = personRow.appendChild(dom.createElement('td'))
          personLeft.setAttribute('style', dataCellStyle)
          var person = cards[j]
          var name = nameFor(person)
          personLeft.textContent = name
          personRow.subject = person
          UI.widgets.makeDraggable(personRow, person)

          var setPersonListener = function toggle (personLeft, person) {
            UI.widgets.deleteButtonWithCheck(dom, personRight, 'contact', function () {
              deleteThing(person)
              refreshNames()
              cardMain.innerHTML = ''
            })
            personRow.addEventListener('click', function (event) {
              event.preventDefault()
              cardMain.innerHTML = 'loading...'
              var local = book ? localNode(person) : person
              UI.store.fetcher.nowOrWhenFetched(local.doc(), undefined, function (ok, message) {
                cardMain.innerHTML = ''
                if (!ok) return complainIfBad(ok, "Can't load card: " + local + ': ' + message)
                // dump("Loaded card " + local + '\n')
                cardMain.appendChild(cardPane(dom, local, 'contact'))
                cardMain.appendChild(dom.createElement('br'))

                var anchor = cardMain.appendChild(UI.widgets.linkIcon(dom, local)) // hoverHide
              })
            })
          }
          setPersonListener(personRow, person)
        }
        searchFilterNames()
      }

      var refreshGroupsSelected = function () {
        for (var i = 0; i < groupsMainTable.children.length; i++) {
          var row = groupsMainTable.children[i]
          if (row.subject) {
            row.setAttribute('style', selectedGroups[row.subject.uri] ? 'background-color: #cce;' : '')
          }
        }
      }

      // Check every group is in the list and add it if not.

      var syncGroupTable = function () {
        var foundOne
        sortGroups()

        var i
        for (i = 0; i < groupsMainTable.children.length; i++) {
          var row = groupsMainTable.children[i]
          row.trashMe = true
        }

        for (var g = 0; g < groups.length; g++) {
          var book = groups[g][0]
          var name = groups[g][1]
          var group = groups[g][2]

          // selectedGroups[group.uri] = false
          foundOne = false

          for (i = 0; i < groupsMainTable.children.length; i++) {
            var row = groupsMainTable.children[i]
            if (row.subject && row.subject.sameTerm(group)) {
              row.trashMe = false
              foundOne = true
              break
            }
          }
          if (!foundOne) {
            var groupRow = groupsMainTable.appendChild(dom.createElement('tr'))
            groupRow.subject = group
            UI.widgets.makeDraggable(groupRow, group)

            groupRow.setAttribute('style', dataCellStyle)
            groupRow.textContent = name
            var foo = function addNewGroupRow2 (groupRow, group, name) {
              // Is something is dropped on a group, add people to group
              var handleURIsDroppedOnGroup = function (uris) {
                uris.forEach(function (u) {
                  console.log('Dropped on group: ' + u)
                  var thing = kb.sym(u)
                  var toBeFetched = [ thing.doc(), group.doc()]

                  kb.fetcher.load(toBeFetched).then(function (xhrs) {
                    var types = kb.findTypeURIs(thing)
                    for (var ty in types) {
                      console.log('    drop object type includes: ' + ty) // @@ Allow email addresses and phone numbers to be dropped?
                    }
                    if (ns.vcard('Individual').uri in types || ns.vcard('Organization').uri in types) {
                      var pname = kb.any(thing, ns.vcard('fn'))
                      if (!pname) return alert('No vcard name known for ' + thing)
                      var already = kb.holds(group, ns.vcard('hasMember'), thing, group.doc())
                      if (already) return alert('ALREADY added ' + pname + ' to group ' + name)
                      var message = 'Add ' + pname + ' to group ' + name + '?'
                      if (confirm(message)) {
                        var ins = [ $rdf.st(group, ns.vcard('hasMember'), thing, group.doc()),
                          $rdf.st(thing, ns.vcard('fn'), pname, group.doc())]
                        kb.updater.update([], ins, function (uri, ok, err) {
                          if (!ok) return complain('Error adding member to group ' + group + ': ' + err)
                          console.log('Added ' + pname + ' to group ' + name)
                          // @@ refresh UI
                        })
                      }
                    }
                  }).catch(function (e) {
                    complain('Error looking up dropped thing ' + thing + ' and group: ' + e)
                  })
                })
              }
              UI.widgets.makeDropTarget(groupRow, handleURIsDroppedOnGroup)

              UI.widgets.deleteButtonWithCheck(dom, groupRow, 'group ' + name, function () {
                deleteThing(group)
                syncGroupTable()
              })
              groupRow.addEventListener('click', function (event) {
                event.preventDefault()
                var groupList = kb.sym(group.uri.split('#')[0])
                if (!event.metaKey) {
                  selectedGroups = {} // If Command key pressed, accumulate multiple
                }
                selectedGroups[group.uri] = !selectedGroups[group.uri]
                refreshGroupsSelected()
                peopleMainTable.innerHTML = '' // clear in case refreshNames doesn't work for unknown reason

                kb.fetcher.nowOrWhenFetched(groupList.uri, undefined, function (ok, message) {
                  if (!ok) return complainIfBad(ok, "Can't load group file: " + groupList + ': ' + message)
                  refreshNames()

                  if (!event.metaKey) { // If only one group has beeen selected show ACL
                    cardMain.innerHTML = ''
                    var visible = false
                    var aclControl = UI.aclControl.ACLControlBox5(group, dom, 'group', kb, function (ok, body) {
                      if (!ok) cardMain.innerHTML = 'Failed: ' + body
                    })
                    var sharingButton = cardMain.appendChild(dom.createElement('button'))
                    sharingButton.style.cssText = 'padding: 1em; margin: 1em'
                    var img = sharingButton.appendChild(dom.createElement('img'))
                    img.style.cssText = 'width: 1.5em; height: 1.5em'
                    img.setAttribute('src', UI.icons.iconBase + 'noun_123691.svg')
                    sharingButton.addEventListener('click', function () {
                      visible = !visible
                      if (visible) {
                        cardMain.appendChild(aclControl)
                      } else {
                        cardMain.removeChild(aclControl)
                      }
                    })
                  }
                })
              }, true)
            }
            foo(groupRow, group, name)
          } // if not foundOne
        } // loop g

        for (i = 0; i < groupsMainTable.children.length; i++) {
          var row = groupsMainTable.children[i]
          if (row.trashMe) {
            groupsMainTable.removeChild(row)
          }
        }
        refreshGroupsSelected()
      } // syncGroupTable

      // //////////////////////////// Three-column Contact Browser  - Body

      // UI.store.fetcher.nowOrWhenFetched(groupIndex.uri, book, function (ok, body) {
      //   if (!ok) return console.log('Cannot load group index: ' + body)

      // //////////////////   Body of 3-column browser

      var bookTable = dom.createElement('table')
      bookTable.setAttribute('style', 'border-collapse: collapse; margin-right: 0;')
      div.appendChild(bookTable)
      var bookHeader = bookTable.appendChild(dom.createElement('tr'))
      var bookMain = bookTable.appendChild(dom.createElement('tr'))
      var bookFooter = bookTable.appendChild(dom.createElement('tr'))
      var groupsHeader = bookHeader.appendChild(dom.createElement('td'))
      var peopleHeader = bookHeader.appendChild(dom.createElement('td'))
      var cardHeader = bookHeader.appendChild(dom.createElement('td'))
      var groupsMain = bookMain.appendChild(dom.createElement('td'))
      var groupsMainTable = groupsMain.appendChild(dom.createElement('table'))
      var peopleMain = bookMain.appendChild(dom.createElement('td'))
      var peopleMainTable = peopleMain.appendChild(dom.createElement('table'))

      var groupsFooter = bookFooter.appendChild(dom.createElement('td'))
      var peopleFooter = bookFooter.appendChild(dom.createElement('td'))
      var cardFooter = bookFooter.appendChild(dom.createElement('td'))

      var searchDiv = cardHeader.appendChild(dom.createElement('div'))
      // searchDiv.setAttribute('style', 'border: 0.1em solid #888; border-radius: 0.5em')
      var searchInput = cardHeader.appendChild(dom.createElement('input'))
      searchInput.setAttribute('type', 'text')
      searchInput.setAttribute('style', 'border: 0.1em solid #444; border-radius: 0.5em; width: 100%;')
      // searchInput.addEventListener('input', searchFilterNames)
      searchInput.addEventListener('input', function (e) {
        searchFilterNames()
      })

      var cardMain = bookMain.appendChild(dom.createElement('td'))
      cardMain.setAttribute('style', 'margin: 0;') // fill space available
      var dataCellStyle = 'padding: 0.1em;'

      groupsHeader.textContent = 'groups'
      groupsHeader.setAttribute('style', 'min-width: 10em; padding-bottom 0.2em;')

      var setGroupListVisibility = function (visible) {
        var vis = visible ? '' : 'display: none;'
        groupsHeader.setAttribute('style', 'min-width: 10em; padding-bottom 0.2em;' + vis)
        var hfstyle = 'padding: 0.1em;'
        groupsMain.setAttribute('style', hfstyle + vis)
        groupsFooter.setAttribute('style', hfstyle + vis)
      }
      setGroupListVisibility(true)

      var groups
      if (options.foreignGroup) {
        selectedGroups[options.foreignGroup.uri] = true
      }
      if (book) {
        var allGroups = groupsHeader.appendChild(dom.createElement('button'))
        allGroups.textContent = 'All'
        var style = 'margin-left: 1em; font-size: 100%;'
        allGroups.setAttribute('style', style)
        allGroups.addEventListener('click', function (event) {
          allGroups.state = allGroups.state ? 0 : 1
          peopleMainTable.innerHTML = '' // clear in case refreshNames doesn't work for unknown reason
          if (allGroups.state) {
            allGroups.setAttribute('style', style + 'background-color: #ff8;')
            selectAllGroups(selectedGroups, groupsMainTable, function (ok, message) {
              if (!ok) return complain(message)
              allGroups.setAttribute('style', style + 'background-color: black; color: white')
              refreshGroupsSelected()
            })
          } else {
            allGroups.setAttribute('style', style + 'background-color: #cfc;') // pale green hint groups loaded
            selectedGroups = {}
            refreshGroupsSelected()
          }
        }) // on button click
        UI.store.fetcher.nowOrWhenFetched(groupIndex.uri, book, function (ok, body) {
          if (!ok) return console.log('Cannot load group index: ' + body)
          syncGroupTable()
          refreshNames()
        })
      } else {
        syncGroupTable()
        refreshNames()
        console.log('No book, only one group -> hide list of groups')
        setGroupListVisibility(false) // If no books involved, hide group list
      } // if not book

      peopleHeader.textContent = 'name'
      peopleHeader.setAttribute('style', 'min-width: 18em;')
      peopleMain.setAttribute('style', 'overflow:scroll;')

      // New Contact button
      var newContactButton = dom.createElement('button')
      var container = dom.createElement('div')
      newContactButton.setAttribute('type', 'button')
      if (!me) newContactButton.setAttribute('disabled', 'true')
      UI.authn.checkUser(target.doc(), function (uri) {
        newContactButton.removeAttribute('disabled')
      })
      container.appendChild(newContactButton)
      newContactButton.innerHTML = 'New Contact' // + IndividualClassLabel
      peopleFooter.appendChild(container)

      var createdNewContactCallback1 = function (ok, person) {
        dump('createdNewContactCallback1 ' + ok + ' - ' + person + '\n')
        cardMain.innerHTML = ''
        if (ok) {
          cardMain.appendChild(cardPane(dom, person, 'contact'))
        } // else no harm done delete form
      }

      newContactButton.addEventListener('click', function (e) {
        // b.setAttribute('disabled', 'true');  (do we need o do this?)
        cardMain.innerHTML = ''

        var nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))
        UI.store.fetcher.nowOrWhenFetched(nameEmailIndex, undefined, function (ok, message) {
          if (ok) {
            dump(' People index has been loaded\n')
          } else {
            dump('Error: People index has NOT been loaded' + message + '\n')
          }
          // Just a heads up, actually used later.
        })
        // cardMain.appendChild(newContactForm(dom, kb, selectedGroups, createdNewContactCallback1))
        cardMain.appendChild(getNameForm(dom, kb, 'Contact',
          function (ok, name) {
            if (!ok) return // cancelled by user
            createNewContact(book, name, selectedGroups, function (success, body) {
              if (!success) {
                console.log("Error: can't save new contact:" + body)
              } else {
                cardMain.innerHTML = ''
                refreshNames() // Add name to list of group
                cardMain.appendChild(cardPane(dom, body, 'contact'))
              }
            })
          }))
      }, false)

      // New Group button
      if (book) {
        var newGroupButton = groupsFooter.appendChild(dom.createElement('button'))
        newGroupButton.setAttribute('type', 'button')
        newGroupButton.innerHTML = 'New Group' // + IndividualClassLabel
        newGroupButton.addEventListener('click', function (e) {
          // b.setAttribute('disabled', 'true');  (do we need o do this?)
          cardMain.innerHTML = ''
          var groupIndex = kb.any(book, ns.vcard('groupIndex'))
          UI.store.fetcher.nowOrWhenFetched(groupIndex, undefined, function (ok, message) {
            if (ok) {
              dump(' Group index has been loaded\n')
            } else {
              dump('Error: Group index has NOT been loaded' + message + '\n')
            }
          })

          cardMain.appendChild(getNameForm(dom, kb, 'Group',
            function (ok, name) {
              if (!ok) return // cancelled by user
              saveNewGroup(book, name, function (success, body) {
                if (!success) {
                  console.log("Error: can't save new group:" + body)
                  cardMain.innerHTML = 'Failed to save group' + body
                } else {
                  selectedGroups = {}
                  selectedGroups[body.uri] = true
                  syncGroupTable() // Refresh list of groups

                  cardMain.innerHTML = ''
                  cardMain.appendChild(UI.aclControl.ACLControlBox5(body, dom, 'group', kb, function (ok, body) {
                    if (!ok) cardMain.innerHTML = 'Group sharing setup failed: ' + body
                  }))
                }
              })
            }))
        }, false)

        // Tools button
        var toolsButton = cardFooter.appendChild(dom.createElement('button'))
        toolsButton.setAttribute('type', 'button')
        toolsButton.innerHTML = 'Tools'
        toolsButton.addEventListener('click', function (e) {
          cardMain.innerHTML = ''
          cardMain.appendChild(toolsPane(selectAllGroups, selectedGroups, groupsMainTable, book, dom, me))
        })
      } // if book

      cardFooter.appendChild(newAddressBookButton(book))

      // })

      div.appendChild(dom.createElement('hr'))
      //  div.appendChild(newAddressBookButton(book))       // later
      // end of AddressBook instance
    } // renderThreeColumnBrowser

    // ///////////////////////////////////////////////////////////////////////////////////

    // Render Individual card

    var renderIndividual = function (subject) {
      var mainImage
      // ////////////////////  DRAG and Drop for mugshot image
      var card = subject

      var handleDroppedThing = function (thing) {
        kb.fetcher.nowOrWhenFetched(thing.doc(), function (ok, mess) {
          if (!ok) {
            console.log('Error looking up dropped thing ' + thing + ': ' + mess)
          } else {
            var types = kb.findTypeURIs(thing)
            for (ty in types) {
              console.log('    drop object type includes: ' + ty) // @@ Allow email addresses and phone numbers to be dropped?
            }
            console.log('Default: assume web page  ' + u) // icon was: UI.icons.iconBase + 'noun_25830.svg'
            var b = kb.bnode()
            kb.add(card, UI.ns.vcard('url'), b, card.doc())
            kb.add(b, UI.ns.vcard('value'), kb.sym(u), card.doc())
            // @@ refresh UI
          }
        })
      }

      // When a set of URIs are dropped on
      var handleURIsDroppedOnMugshot = function (uris) {
        uris.map(function (u) {
          var thing = $rdf.sym(u) // Attachment needs text label to disinguish I think not icon.
          console.log('Dropped on thing ' + thing) // icon was: UI.icons.iconBase + 'noun_25830.svg'
          var thing = kb.sym(u)
          if (u.startsWith('http') && u.indexOf('#') < 0) { // Plain document
            kb.add(subject, UI.ns.vcard('url'), thing, subject.doc())
            kb.fetcher.putBack(subject.doc()).then(function (xhr) {
              // @@@ Refresh UI
              // mainImage.setAttribute('src', pic.uri)
              // UI.widgets.setImage(mainImage, subject)// try again
            })
            return
          }
          handleDroppedThing(thing)
        })
      }

      // Drop an image file to set up the mugshot
      var droppedFileHandler = function (files) {
        for (var i = 0, f; f = files[i]; i++) {
          console.log(' meeting: Filename: ' + f.name + ', type: ' + (f.type || 'n/a') +
            ' size: ' + f.size + ' bytes, last modified: ' +
            (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a')
          ) // See e.g. https://www.html5rocks.com/en/tutorials/file/dndfiles/

          // @@ Add: progress bar(s)
          var reader = new FileReader()
          reader.onload = (function (theFile) {
            return function (e) {
              var data = e.target.result
              console.log(' File read byteLength : ' + data.byteLength)
              // var folderName = theFile.type.startsWith('image/') ? 'Pictures' : 'Files'
              var filename = encodeURIComponent(theFile.name)
              var extension = mime.extension(theFile.type)
              if (theFile.type !== mime.lookup(theFile.name)) {
                filename += '_.' + extension
                console.log('MIME TYPE MISMATCH -- adding extension: ' + filename)
              }
              var photos = kb.any(subject, ns.vcard('hasPhoto'))
              var n, pic
              for (n = 0; ; n++) {
                pic = kb.sym(card.dir().uri + filename)
                if (!kb.holds(subject, ns.vcard('hasPhoto'), pic)) {
                  break
                }
                filename = 'image' + n + extension
              }
              kb.add(subject, ns.vcard('hasPhoto'), pic, subject.doc())
              kb.fetcher.webOperation('PUT', pic, { data: data, contentType: theFile.type })
                .then(function () {
                  console.log(' Upload: put OK: ' + pic)

                  return kb.fetcher.putBack(subject.doc())
                })
                .then(function () {
                  mainImage.setAttribute('src', pic.uri)
                  // UI.widgets.setImage(mainImage, subject)// try again
                })
                .catch(function (status) {
                  console.log(' Upload: FAIL ' + pic + ', Error: ' + status)
                })
            }
          })(f)
          reader.readAsArrayBuffer(f)
        }
      }
      // //////// End of drag and drop

      // Background metadata for this pane we bundle with the JS
      var individualForm = kb.sym('https://linkeddata.github.io/solid-app-set/contact/individualForm.ttl#form1')
      var individualFormDoc = individualForm.doc()
      if (!kb.holds(undefined, undefined, undefined, individualFormDoc)) { // If not loaded already
        var individualFormText = require('./individualForm.js')
        $rdf.parse(individualFormText, kb, individualFormDoc.uri, 'text/turtle') // Load form directly
      }
      var vcardOnt = UI.ns.vcard('Type').doc()
      if (!kb.holds(undefined, undefined, undefined, vcardOnt)) { // If not loaded already
        $rdf.parse(require('./vcard.js'), kb, vcardOnt.uri, 'text/turtle') // Load ontology directly
      }

      var toBeFetched = [ subject.doc() ] // was: individualFormDoc, UI.ns.vcard('Type').doc()
      UI.store.fetcher.load(toBeFetched)

        .catch(function (e) {
          console.log('Error: Failed to load form or ontology: ' + e)
        }) // load.then

        .then(function (xhrs) {
          var setPaneStyle = function () {
            var types = kb.findTypeURIs(subject)
            var mystyle = 'padding: 0.5em 1.5em 1em 1.5em; '
            var backgroundColor = null
            for (var uri in types) {
              backgroundColor = kb.any(kb.sym(uri), kb.sym('http://www.w3.org/ns/ui#backgroundColor'))
              if (backgroundColor) break
            }
            backgroundColor = backgroundColor ? backgroundColor.value : '#fff' // default white
            mystyle += 'background-color: ' + backgroundColor + '; '
            div.setAttribute('style', mystyle)
          }
          setPaneStyle()

          UI.authn.checkUser(cardDoc)  // kick off async operation

          mainImage = div.appendChild(dom.createElement('img'))
          mainImage.setAttribute('style', 'max-height: 10em; border-radius: 1em; margin: 0.7em;')
          UI.widgets.setImage(mainImage, subject)
          UI.widgets.makeDropTarget(mainImage, handleURIsDroppedOnMugshot, droppedFileHandler)

          UI.widgets.appendForm(dom, div, {}, subject, individualForm, cardDoc, complainIfBad)

          //   Comment/discussion area
          /*
          var messageStore = kb.any(tracker, ns.wf('messageStore'))
          if (!messageStore) messageStore = kb.any(tracker, ns.wf('doc'))
          div.appendChild(UI.messageArea(dom, kb, subject, messageStore))
          donePredicate(ns.wf('message'))
          */

          div.appendChild(dom.createElement('tr'))
            .setAttribute('style', 'height: 1em') // spacer

          var lookUpId = function (dom, container, x) {
            var tr = table.appendChild(dom.createElement('tr'))
            tr.setAttribute('style', 'margin-top: 0.1em solid #ccc;')
            var nameTD = tr.appendChild(dom.createElement('td'))
            var formTD = tr.appendChild(dom.createElement('td'))
            nameTD.textContent = x.uri.split('/')[2]

            kb.fetcher.load(x)
              .then(function (xhr) {
                nameTD.textContent = x.uri.split('/')[2] + ' (' +
                  kb.statementsMatching(undefined, undefined, undefined, x.doc()).length + ')'
              })
              .catch(function (e) {
                formTD.appendChild(UI.widgets.errorMessageBlock(dom, e, 'pink'))
              })

            var anchor = formTD.appendChild(UI.widgets.linkIcon(dom, x))
          }

          var table = div.appendChild(dom.createElement('table'))

          var aliases = kb.allAliases(subject)
          if (aliases.length > 1) {
            for (var i = 0; i < aliases.length; i++) {
              var x = aliases[i]
              if (!x.sameTerm(subject)) {
                lookUpId(dom, table, x)
                // UI.widgets.appendForm(dom, formTD, {}, x, individualForm, x.doc(), complainIfBad)
              }
            }
          }

          var attachementControl = UI.widgets.attachmentList(dom, subject, div, {
            // promptIcon: UI.icons.iconBase +  'noun_681601.svg',
            predicate: UI.ns.vcard('url') // @@@@@@@@@ ,--- no, the actual structure uses a bnode.
          })

          var hr = div.appendChild(dom.createElement('hr'))

          var pages = kb.each(subject, ns.vcard('url')) // vcard:url [ a vcard:HomePage; vcard:value <http://www.w3.org/People/Berners-Lee>],
          pages.forEach(function (p) {
            var cla = kb.any(p, ns.rdf('type'))
            var val = kb.any(p, ns.vcard('value'))
            if (val) {
              var tr = table.appendChild(dom.createElement('tr'))
              tr.setAttribute('style', 'margin-top: 0.1em solid #ccc;')

              var nameTD = tr.appendChild(dom.createElement('td'))
              nameTD.textContent = UI.utils.label(cla)

              var formTD = tr.appendChild(dom.createElement('td'))
              var anchor = formTD.appendChild(dom.createElement('a'))
              anchor.setAttribute('href', val.uri)
              var span = anchor.appendChild(dom.createElement('span'))
              span.textContent = val.uri
            }
          })
        })
      /*
            .catch(function(e){
              console.log('Error: Failed to load form or ontology: ' + e)
            }) // load.then
      */
    } // renderIndividual

    //              Render a single contact Individual

    if (t[ns.vcard('Individual').uri] || t[ns.vcard('Organization').uri] ||
      t[ns.foaf('Person').uri]) {
      renderIndividual(subject)

      //          Render a Group instance
    } else if (t[ns.vcard('Group').uri]) {
      // If we have a main address book, then render this group as a guest group within it
      UI.authn.findAppInstances(context, ns.vcard('AddressBook'))
        .then(function (context) {
          var addressBooks = context.instances
          var options = { foreignGroup: subject }
          if (addressBooks.length > 0) {
            // var book = addressBooks[0]
            renderThreeColumnBrowser(addressBooks, context, options)
          } else {
            renderThreeColumnBrowser([], context, options)
            // @@ button to Make a new addressBook
          }
        })
        .catch(function (e) {
          UI.widgets.complain(context, e)
        })

      // Render a AddressBook instance
    } else if (t[ns.vcard('AddressBook').uri]) {
      renderThreeColumnBrowser([subject], context, {})
    } else {
      console.log('Error: Contact pane: No evidence that ' + subject +
        ' is anything to do with contacts.')
    }
    if (!tabulator.preferences.get('me')) {
      console.log('(You do not have your Web Id set. Sign in or sign up to make changes.)')
    } else {
      // console.log("(Your webid is "+ tabulator.preferences.get('me')+")")
    }

    // /////////////// Fix user when testing on a plane

    if (tabulator.mode === 'webapp' && typeof document !== 'undefined' &&
      document.location && ('' + document.location).slice(0, 16) === 'http://localhost') {
      me = kb.any(subject, UI.ns.acl('owner')) // when testing on plane with no webid
      console.log('Assuming user is ' + me)
    }
    return div
  }
}
// ends
