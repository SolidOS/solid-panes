//  The tools pane is for managing and debugging and maintaining solid contacts databases
//
var UI = require('solid-ui')
var mime = require('mime-types')

// var toolsPane
var toolsPane = function (selectAllGroups, selectedGroups, groupsMainTable, book, dom, me) {
  var kb = UI.store, ns = UI.ns
  var updater = UI.store.updater
  var ACL = UI.ns.acl, VCARD = UI.ns.vcard
  var doc = $rdf.sym(book.uri.split('#')[0]) // The ACL is actually to the doc describing the thing

  var buttonStyle = 'font-size: 100%; margin: 0.8em; padding:0.5em;'

  var pane = dom.createElement('div')
  var table = pane.appendChild(dom.createElement('table'))
  table.setAttribute('style', 'font-size:120%; margin: 1em; border: 0.1em #ccc ;')
  var headerRow = table.appendChild(dom.createElement('tr'))
  headerRow.textContent = UI.utils.label(book) + ' - tools'
  headerRow.setAttribute('style', 'min-width: 20em; padding: 1em; font-size: 150%; border-bottom: 0.1em solid red; margin-bottom: 2em;')

  var statusRow = table.appendChild(dom.createElement('tr'))
  var statusBlock = statusRow.appendChild(dom.createElement('div'))
  statusBlock.setAttribute('style', 'padding: 2em;')
  var MainRow = table.appendChild(dom.createElement('tr'))
  var box = MainRow.appendChild(dom.createElement('table'))
  var bottomRow = table.appendChild(dom.createElement('tr'))

  context = { target: book, me: me, noun: 'address book',
  div: pane, dom: dom, statusRegion: statusBlock }

  box.appendChild(UI.aclControl.ACLControlBox5(book.dir(), dom, 'book', kb, function (ok, body) {
    if (!ok) box.innerHTML = 'ACL control box Failed: ' + body
  }))

  //
  UI.widgets.registrationControl(
    context, book, ns.vcard('AddressBook'))
    .then(function (context) {
      console.log('Registration control finished.')
        // pane.appendChild(box)
    }).catch(function (e) {UI.widgets.complain(context, e)})

  //  Output stats in line mode form
  var logSpace = MainRow.appendChild(dom.createElement('pre'))
  var log = function (message) {
    console.log(message)
    logSpace.textContent += message + '\n'
  }

  var stats = function () {
    var totalCards = kb.each(undefined, VCARD('inAddressBook'), book).length
    log('' + totalCards + ' cards loaded. ')
    var groups = kb.each(book, VCARD('includesGroup'))
    log('' + groups.length + ' total groups. ')
    var gg = [], g
    for (g in selectedGroups) {
      gg.push(g)
    }
    log('' + gg.length + ' selected groups. ')
  }

  var loadIndexButton = pane.appendChild(dom.createElement('button'))
  loadIndexButton.textContent = 'Load main index'
  loadIndexButton.style = buttonStyle
  loadIndexButton.addEventListener('click', function (e) {
    loadIndexButton.setAttribute('style', 'background-color: #ffc;')

    var nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))
    UI.store.fetcher.nowOrWhenFetched(nameEmailIndex, undefined, function (ok, message) {
      if (ok) {
        loadIndexButton.setAttribute('style', 'background-color: #cfc;')
        log(' People index has been loaded\n')
      } else {
        loadIndexButton.setAttribute('style', 'background-color: #fcc;')
        log('Error: People index has NOT been loaded' + message + '\n')
      }
    })
  })

  var statButton = pane.appendChild(dom.createElement('button'))
  statButton.textContent = 'Statistics'
  statButton.style = buttonStyle
  statButton.addEventListener('click', stats)

  var checkAccessButton = MainRow.appendChild(dom.createElement('button'))
  checkAccessButton.textContent = 'Check inidividual card access of selected groups'
  checkAccessButton.style = buttonStyle
  checkAccessButton.addEventListener('click', function (event) {

    var gg = [], g
    for (g in selectedGroups) {
      gg.push(g)
    }

    for (var i = 0; i < gg.length; i++) {
      var g = kb.sym(gg[i])
      var a = kb.each(g, ns.vcard('hasMember'))
      log(UI.utils.label(g) + ': ' + a.length + ' members')
      for (var j = 0; j < a.length; j++) {
        var card = a[j]
        log(UI.utils.label(card))
        function doCard (card) {
          UI.widgets.fixIndividualCardACL(card, log, function (ok, message) {
            if (ok) {
              log('Sucess for ' + UI.utils.label(card))
            } else {
              log('Failure for ' + UI.utils.label(card) + ': ' + message)
            }
          })
        }
        doCard(card)
      }
    }
  })

  /////////////////////////////////////////////////////////////////////////////
  //
  //      DUPLICATES CHECK

  var checkDuplicates = MainRow.appendChild(dom.createElement('button'))
  checkDuplicates.textContent = 'Find duplicate cards'
  checkDuplicates.style = buttonStyle
  checkDuplicates.addEventListener('click', function (event) {

    var stats = {} // global god context

    stats.book = book
    stats.nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))
    log('Loading name index...')


    UI.store.fetcher.nowOrWhenFetched(stats.nameEmailIndex, undefined,
      function (ok, message) {
        log('Loaded name index.')

        stats.cards = []
        stats.duplicates = []
        stats.definitive = []
        stats.nameless = []

        stats.exactDuplicates = []
        stats.nameOnlyDuplicates = []

        stats.uniquesSet = []
        stats.groupProblems = []

        // Erase one card and all its files  -> (err)
        //
        var eraseOne = function(card){
          return new Promise(function(resolve, reject){
            var removeFromMainIndex = function(){
              var indexBit = kb.connectedStatements(card, stats.nameEmailIndex)
              log('Bits of the name index file:' + indexBit)
              log('Patching main index file...')
              kb.updater.update(indexBit, [], function (uri, ok, body){
                if (ok){
                  log('Success')
                  resolve(null)
                } else {
                  log('Error patching index file! ' + body)
                  reject('Error patching index file! ' + body)
                }
              })
            }
          })

          var filesToDelete = [ card.doc()]
          var photo = kb.any(card, ns.vcard('hasPhoto'))
          if (photo) filesToDelete.push(photo)
          filesToDelete.push(card.dir()) // the folder last
          log('Files to delete: ' + filesToDelete)
          if (!confirm('DELETE card ' + card.dir() + ' for ' + name + ', with ' + desc.length + 'statements?')){
            return resolve('Cancelled by user')
          }

          var deleteOneFile = function(){
            var resource = filesToDelete.shift()
            if (!resource) {
              log('All deleted')
              removeFromMainIndex()
              return
            }
            log('Deleting ... ' + resource)
            kb.fetcher.webOperation('DELETE', resource).then(function(xhr){
              log('Deleted ok: ' + resource)
              deleteOneFile()
            }).catch(function(e){
              var err = '*** ERROR deleteing ' + resource + ': ' + e
              log(err)
              if (confirm('Patch out index file for card ' + card.dir() + ' EVEN THOUGH card DELETE errors?')){
                removeFromMainIndex()
              } else {
                reject(err)
              }
            })
          }
          deleteOneFile()
        } // erase one

        //   Check actual recorrds to see which are exact matches - slow
        stats.nameDupLog = kb.sym(book.dir().uri + "dedup-nameDupLog.ttl")
        stats.exactDupLog = kb.sym(book.dir().uri + "dedup-exactDupLog.ttl")

        var checkOne = function(card){
          return new Promise(function(resolve, reject){
            var name = kb.anyValue(card, ns.vcard('fn'))
            var other = definitive[name]
            kb.fetcher.load([card, other]).then(function(xhrs){
              var exclude = {}
              exclude[ns.vcard('hasUID').uri] = true
              exclude[ns.dc('created').uri] = true
              exclude[ns.dc('modified').uri] = true
              var filtered = function(x){
                return kb.statementsMatching(null, null, null, x.doc()).filter(function(st){
                  return !exclude[st.predicate.uri]
                })
              }
              var desc = filtered(card)
              var desc2 = filtered(other)
              // var desc = connectedStatements(card, card.doc(), exclude)
              // var desc2 = connectedStatements(other, other.doc(), exclude)
              if (desc.length !== desc2.length){
                log('CARDS to NOT match lengths ')
                stats.nameOnlyDuplicates.push(card)
                return resolve(false)
              }
              if (!desc.length){
                log('@@@@@@  Zero length ')
                stats.nameOnlyDuplicates.push(card)
                return resolve(false)
              }
              ////////// Compare the two
              // Cheat: serialize and compare
              // var cardText = $rdf.serialize(card.doc(), kb, card.doc().uri, 'text/turtle')
              // var otherText = $rdf.serialize(other.doc(), kb, other.doc().uri, 'text/turtle')
              var cardText = (new $rdf.Serializer(kb)).setBase(card.doc().uri).statementsToN3(desc)
              var otherText = (new $rdf.Serializer(kb)).setBase(other.doc().uri).statementsToN3(desc2)
/*
              log('Name: ' + name + ', statements: ' + desc.length)
              log('___________________________________________')
              log('KEEPING: ' + other.doc() + '\n' + cardText);
              log('___________________________________________')
              log('DELETING: '+ card.doc() + '\n' + otherText);
              log('___________________________________________')
*/
              if (cardText !== otherText){
                log("Texts differ")
                stats.nameOnlyDuplicates.push(card)
                return resolve(false)
              }
              var cardGroups = kb.each(null, ns.vcard('hasMember'), card)
              var otherGroups = kb.each(null, ns.vcard('hasMember'), other)
              for (var j=0; j< cardGroups.length; j++){
                var found = false
                for (var k=0; k < otherGroups.length; k++){
                  if (otherGroups[k].sameTerm(cardGroups[j])) found = true;
                }
                if (!found){
                  log('This one groups: ' + cardGroups)
                  log('Other one groups: ' + otherGroups)
                  log('Cant delete this one because it has a group, ' + cardGroups[j] + ', which the other does not.')
                  stats.nameOnlyDuplicates.push(card)
                  return resolve(false)
                }
              }
              console.log('Group check done -- exact duplicate: ' + card)
              stats.exactDuplicates.push(card)
              resolve(true)

            }).catch(function(e){
              log('Cant load a card! ' + [card, other] + ': ' + e)
              stats.nameOnlyDuplicates.push(card)
              resolve(false)
              //if (confirm('Patch out index file for card ' + card.dir() + ' EVEN THOUGH card READ errors?')){
              //  removeFromMainIndex()
              // }
            })
          })
        } // checkOne

        stats.nameOnlyErrors = []
        stats.nameLessZeroData = []
        stats.nameLessIndex = []
        stats.namelessUniques = []
        stats.nameOnlyDuplicatesGroupDiff = []

        var checkOneNameless = function(card){
          return new Promise(function(resolve, reject){
            kb.fetcher.load(card).then(function(xhr){
              log(' Nameless check ' + card)
              var exclude = {}
              exclude[ns.vcard('hasUID').uri] = true
              exclude[ns.dc('created').uri] = true
              exclude[ns.dc('modified').uri] = true
              var filtered = function(x){
                return kb.statementsMatching(null, null, null, x.doc()).filter(function(st){
                  return !exclude[st.predicate.uri]
                })
              }

              var desc = filtered(card)
              // var desc = connectedStatements(card, card.doc(), exclude)
              // var desc2 = connectedStatements(other, other.doc(), exclude)
              if (!desc.length){
                log('  Zero length ' + card)
                stats.nameLessZeroData.push(card)
                return resolve(false)
              }
              ////////// Compare the two
              // Cheat: serialize and compare
              // var cardText = $rdf.serialize(card.doc(), kb, card.doc().uri, 'text/turtle')
              // var otherText = $rdf.serialize(other.doc(), kb, other.doc().uri, 'text/turtle')
              var cardText = (new $rdf.Serializer(kb)).setBase(card.doc().uri).statementsToN3(desc)
              var other = stats.nameLessIndex[cardText]
              if (other){
                log('  Matches with ' + other)
                var cardGroups = kb.each(null, ns.vcard('hasMember'), card)
                var otherGroups = kb.each(null, ns.vcard('hasMember'), other)
                for (var j=0; j< cardGroups.length; j++){
                  var found = false
                  for (var k=0; k < otherGroups.length; k++){
                    if (otherGroups[k].sameTerm(cardGroups[j])) found = true;
                  }
                  if (!found){
                    log('This one groups: ' + cardGroups)
                    log('Other one groups: ' + otherGroups)
                    log('Cant skip this one because it has a group, ' + cardGroups[j] + ', which the other does not.')
                    stats.nameOnlyDuplicatesGroupDiff.push(card)
                    return resolve(false)
                  }
                }
                console.log('Group check done -- exact duplicate: ' + card)
              } else {
                log('First nameless like: ' + card.doc());
                log('___________________________________________')
                log(cardText)
                log('___________________________________________')
                 stats.nameLessIndex[cardText] = card
                 stats.namelessUniques.push(card)
              }
              resolve(true)

            }).catch(function(e){
              log('Cant load a nameless card! ' + other + ': ' + e)
              stats.nameOnlyErrors.push(card)
              resolve(false)
            })
          })
        } // checkOneNameless

        var duplicatesToCheck = stats.duplicates.slice() // copy
        var checkAll = function(){
          return new Promise(function(resolve, reject){
            var x = duplicatesToCheck.shift()
            if (!x) return resolve(true)
            checkOne(x).then(function(exact){
              var logg = exact? exactDupLog : nameDupLog
              var klass = exact ? 'ExactDuplicate' : 'NameOnlyDuplicate'
              kb.updater.update([], $rdf.st(x, ns.rdf('type'), ns.vcard(klass), logg),
                function(uri, ok, error_body){
                  if (ok) {
                    checkAll() // loop
                  } else {
                    log('Stop: log write failure ' +  error_body)
                  }
                })
              })
          })
        }

        var checkAllNameless = function(){
          stats.namelessToCheck = stats.namelessToCheck  || stats.nameless.slice()
          log('Nameless check left: ' + stats.namelessToCheck.length)
          return new Promise(function(resolve, reject){
            var x = stats.namelessToCheck.shift()
            if (!x) {
              log('namelessUniques: ' + stats.namelessUniques.length)
              log('namelessUniques: ' + stats.namelessUniques)
              if (confirm("Add all " + stats.namelessUniques.length + " nameless cards to the rescued set?")){
                stats.uniques = stats.uniques.concat(stats.namelessUniques)
                for (var k=0; k < stats.namelessUniques.length; k++){
                  stats.uniqueSet[stats.namelessUniques[k].uri] = true
                }
              }
              return resolve(true)
            }
            checkOneNameless(x).then(function(exact){
              log('    Namelessc check returns ' + exact)
              checkAllNameless() // loop
              })
          })
        }


        var checkGroupMembers = function(){
          return new Promise(function(resolve, reject){
            var i, inUniques = 0
            log('Groups loaded')
            for (i=0; i < stats.uniques.length; i++){
              stats.uniquesSet[stats.uniques[i].uri] = true
            }
            stats.groupMembers = kb.statementsMatching(null, ns.vcard('hasMember')).map(st => st.object)
            log('  Naive group members ' + stats.groupMembers.length)
            stats.groupMemberSet = []
            for (var j=0; j < stats.groupMembers.length; j++){
              stats.groupMemberSet[stats.groupMembers[j].uri] = stats.groupMembers[j]
            }
            stats.groupMembers2 = []
            for (var g in stats.groupMemberSet){
              stats.groupMembers2.push(stats.groupMemberSet[g])
            }
            log('  Compact group members ' + stats.groupMembers2.length)

            if (false){ // Don't inspect as seems groups membership is complete
              for (i=0; i< stats.groupMembers.length; i++){
                var card = stats.groupMembers[i]
                if (stats.uniquesSet[card.uri]) {
                  inUniques += 1
                } else {
                  log('  Not in uniques: ' + card)
                  stats.groupProblems.push(card)
                  if (stats.duplicateSet[card.uri]){
                    log('    ** IN duplicates alas:' + card)
                  } else {
                    log('   **** WTF?')
                  }
                }
              }
              log('Problem cards: ' + stats.groupProblems.length)
            } // if
            resolve(true)
          })
        } //  checkGroupMembers

        var scanForDuplicates = function(){
          return new Promise(function(resolve, reject){
            stats.cards = kb.each(undefined, VCARD('inAddressBook'), stats.book)
            log('' + stats.cards.length + ' total cards')


            var c, card, name, count = 0
            for (c = 0; c < stats.cards.length; c++) {
              card = stats.cards[c]
              name = kb.anyValue(card, ns.vcard('fn'))
              if (!name) {
                stats.nameless.push(card)
                continue
              }
              if (stats.definitive[name] == card) {
                  // pass
              } else if (stats.definitive[name]){
                var n = stats.duplicates.length
                if ((n < 100 ) || (n < 1000 && (n % 10 === 0)) || (n % 100 === 0)) {
                  // log('' + n + ') Possible duplicate ' + card + ' of: ' + definitive[name])
                }
                stats.duplicates.push(card)
              } else {
                stats.definitive[name] = card
              }
            }

            stats.duplicateSet = []
            for (var i=0; i < stats.duplicates.length; i++){
              stats.duplicateSet[stats.duplicates[i].uri] = stats.duplicates[i]
            }
            stats.namelessSet = []
            for (i=0; i < stats.nameless.length; i++){
              stats.namelessSet[stats.nameless[i].uri] = stats.nameless[i]
            }
            stats.uniques = []
            stats.uniqueSet = []
            for (i=0; i< stats.cards.length; i++){
              var uri = stats.cards[i].uri
              if (!stats.duplicateSet[uri] && !stats.namelessSet[uri]){
                  stats.uniques.push(stats.cards[i])
                  stats.uniqueSet[uri] = stats.cards[i]
              }
            }
            log('Uniques: ' + stats.uniques.length)

            log('' + stats.nameless.length + ' nameless cards.')
            log('' + stats.duplicates.length + ' name-duplicate cards, leaving ' + (stats.cards.length - stats.duplicates.length))
            resolve(true)
          })
        }


        // Save a new clean version
        var saveCleanPeople = function(){
          return new Promise(function(resolve, reject){
            var cleanPeople = kb.sym(stats.book.dir().uri + 'clean-people.ttl')
            var sts = []
            for (i=0; i < stats.uniques.length; i++){
              sts = sts.concat(kb.connectedStatements(stats.uniques[i], stats.nameEmailIndex))
            }
            var sz = (new $rdf.Serializer(kb)).setBase(stats.nameEmailIndex.uri)
            log('Serializing index of uniques...')
            var data = sz.statementsToN3(sts)
            kb.fetcher.webOperation('PUT', cleanPeople, { data: data, contentType: 'text/turtle'})
            .then(function(xhr){
              log("Done uniques log " + cleanPeople)
              resolve(true)
            }).catch(function(e){
              log("Error saving uniques: " + e)
              reject("Error saving uniques: " + e)
            })
          })
        }

        var saveCleanGroup = function(g){
          return new Promise(function(resolve, reject){
            var s = g.uri.replace('/Group/', '/NewGroup/')
            var cleanGroup = kb.sym(s)
            var sts = []
            for (i=0; i < stats.uniques.length; i++){
              sts = sts.concat(kb.connectedStatements(stats.uniques[i], g.doc()))
            }
            var sz = (new $rdf.Serializer(kb)).setBase(g.uri)
            log('   Regenerating group of uniques...' + cleanGroup)
            var data = sz.statementsToN3(sts)
            kb.fetcher.webOperation('PUT', cleanGroup, { data})
            .then(function(xhr){
              log("     Done uniques group " + cleanGroup)
              resolve(true)
            }).catch(function(e){
              log("Error saving : " + e)
              reject(e)
            })
          })
        }

        var saveAllGroups = function(){
          log('Saving ALL GROUPS')
          return Promise.all(stats.groupObjects.map(saveCleanGroup))
        }

        stats.groupObjects = groups.map(gstr => gstr[2])
        log('Loading ' + stats.groupObjects.length + ' groups... ')
        kb.fetcher.load(stats.groupObjects)
        .then(scanForDuplicates)
        .then(checkGroupMembers)
        .then(checkAllNameless)
        .then((resolve, reject) => { if (confirm("Write new clean versions?")) resolve(true); else reject() })
        .then(saveCleanPeople)
        .then(saveAllGroups)
        .then(function(resolve, reject){
          log("Done!")
        })
      })
  })

  var checkGroupless = MainRow.appendChild(dom.createElement('button'))
  checkGroupless.style = buttonStyle
  checkGroupless.textContent = 'Find inidividuals with no group'
  checkGroupless.addEventListener('click', function (event) {


    log('Loading groups...')
    selectAllGroups(selectedGroups, groupsMainTable, function (ok, message) {
      if (!ok) {
        log('Failed: ' + message)
        return
      }

      var nameEmailIndex = kb.any(book, ns.vcard('nameEmailIndex'))
      UI.store.fetcher.nowOrWhenFetched(nameEmailIndex, undefined,
        function (ok, message) {
          log('Loaded groups and name index.')
          var reverseIndex = {}, groupless = []
          var groups = kb.each(book, VCARD('includesGroup'))
          log('' + groups.length + ' total groups. ')

          for (var i = 0; i < groups.length; i++) {
            var g = groups[i]
            var a = kb.each(g, ns.vcard('hasMember'))
            log(UI.utils.label(g) + ': ' + a.length + ' members')
            for (var j = 0; j < a.length; j++) {
              kb.allAliases(a[j]).forEach(function(y){
                reverseIndex[y.uri] = g
              })
            }
          }

          var cards = kb.each(undefined, VCARD('inAddressBook'), book)
          log('' + cards.length + ' total cards')
          var c, card
          for (c = 0; c < cards.length; c++) {
            if (!reverseIndex[cards[c].uri]) {
              groupless.push(cards[c])
              log('   groupless ' + UI.utils.label(cards[c]))
            }
          }
          log('' + groupless.length + ' groupless cards.')
        })

    })
  })
  return pane
} // toolsPane
module.exports = {}
module.exports.toolsPane = toolsPane
