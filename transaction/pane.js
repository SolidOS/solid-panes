/*   Financial Transaction Pane
**
**  This outline pane allows a user to interact with a transaction
**  downloaded from a bank statement, annotting it with classes and comments,
** trips, etc
*/

var UI = require('solid-ui')

module.exports = {
  // icon:  (module.__dirname || __dirname) + '22-pixel-068010-3d-transparent-glass-icon-alphanumeric-dollar-sign.png',
  icon: UI.icons.iconBase + 'noun_106746.svg',

  name: 'transaction',

  // Does the subject deserve this pane?
  label: function (subject) {
    var kb = UI.store
    var t = kb.findTypeURIs(subject)
    if (t['http://www.w3.org/2000/10/swap/pim/qif#Transaction']) return '$$'
    if (kb.any(subject, UI.ns.qu('amount'))) return '$$$' // In case schema not picked up

    // if (t['http://www.w3.org/2000/10/swap/pim/qif#Period']) return "period $"

    if (t['http://www.w3.org/ns/pim/trip#Trip']) return 'Trip $'

    return null; // No under other circumstances (while testing at least!)
  },

  render: function (subject, dom) {
    var kb = UI.store
    var fetcher = kb.fetcher
    var ns = UI.ns
    var WF = $rdf.Namespace('http://www.w3.org/2005/01/wf/flow#')
    var DCT = $rdf.Namespace('http://purl.org/dc/terms/')
    var Q = $rdf.Namespace('http://www.w3.org/2000/10/swap/pim/qif#')
    var TRIP = $rdf.Namespace('http://www.w3.org/ns/pim/trip#')

    var div = dom.createElement('div')
    div.setAttribute('class', 'transactionPane')

    var mention = function mention (message, style) {
      if (style == undefined) style = 'color: grey'
      var pre = dom.createElement('pre')
      pre.setAttribute('style', style)
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    var complain = function complain (message) {
      return mention(message, 'color: #100; background-color: #fee')
    }

    var thisPane = this
    var rerender = function (div) {
      var parent = div.parentNode
      var div2 = thisPane.render(subject, dom)
      parent.replaceChild(div2, div)
    }

    // //////////////////////////////////////////////////////////////////////////////

    var sparqlService = UI.store.updater

    var plist = kb.statementsMatching(subject)
    var qlist = kb.statementsMatching(undefined, undefined, subject)

    var t = kb.findTypeURIs(subject)

    var me_uri = tabulator.preferences.get('me')
    var me = me_uri ? kb.sym(me_uri) : null
    var predicateURIsDone = {}
    var donePredicate = function (pred) {predicateURIsDone[pred.uri] = true}

    var setPaneStyle = function () {
      var mystyle = 'padding: 0.5em 1.5em 1em 1.5em; '
      if (account) {
        var backgroundColor = kb.any(account, UI.ns.ui('backgroundColor'))
        if (backgroundColor) mystyle += 'background-color: '
            + backgroundColor.value + '; '
      }
      div.setAttribute('style', mystyle)
    }
    // setPaneStyle()

    // Functions for displaying lists of transactions
    // Click on the transaction line to expand it into a pane
    // Shift-click to expand without collapsing others

    var d2 = function (n) {
      if (n === undefined) return ''
      var s = '' + n
      if (s.indexOf('.') >= 0) {
        return s.split('.')[0] + '.' + (s.split('.')[1] + '00').slice(0, 2)
      }
      return s + '.00'
    }

    var numericCell = function numericCell (amount, suppressZero) {
      var td = dom.createElement('td')
      if (!(0.0 + amount === 0.0 && suppressZero)) {
        td.textContent = d2(amount)
      }
      td.setAttribute('style', 'width: 6em; text-align: right; ')
      return td
    }

    var headerCell = function headerCell (str) {
      var td = dom.createElement('th')
      td.textContent = str
      td.setAttribute('style', 'text-align: right; ')
      return td
    }

    var oderByDate = function (x, y) {
      dx = UI.store.any(x, ns.qu('date'))
      dy = UI.store.any(y, ns.qu('date'))
      if (dx !== undefined && dy !== undefined) {
        if (dx.value < dy.value) return -1
        if (dx.value > dy.value) return 1
      }
      if (x.uri < y.uri) return -1 // Arbitrary but repeatable
      if (x.uri > y.uri) return 1
      return 0
    }

    var insertedPane = function (dom, subject, paneName) {
      var p = UI.panes.byName(paneName)
      var d = p.render(subject, dom)
      d.setAttribute('style', 'border: 0.1em solid green;')
      return d
    }

    var expandAfterRow = function (dom, row, subject, paneName, solo) {
      var siblings = row.parentNode.children
      if (solo) {
        for (var j = siblings.length - 1; j >= 0; j--) {
          if (siblings[j].expanded) {
            siblings[j].parentNode.removeChild(siblings[j].expanded)
            siblings[j].expanded = false
          }
        }
      }
      var tr = dom.createElement('tr')
      var td = tr.appendChild(dom.createElement('td'))
      td.setAttribute('style', 'width: 98%; padding: 1em; border: 0.1em solid grey;')
      var cols = row.children.length
      if (row.nextSibling) {
        row.parentNode.insertBefore(tr, row.nextSibling)
      } else {
        row.parentNode.appendChild(tr)
      }
      row.expanded = tr
      td.setAttribute('colspan', '' + cols)
      td.appendChild(insertedPane(dom, subject, paneName))
    }

    var expandAfterRowOrCollapse = function (dom, row, subject, paneName, solo) {
      if (row.expanded) {
        row.parentNode.removeChild(row.expanded)
        row.expanded = false
      } else {
        expandAfterRow(dom, row, subject, paneName, solo)
      }
    }

    var transactionTable = function (dom, list, filter) {
      var table = dom.createElement('table')
      table.setAttribute('style', 'padding-left: 0.5em; padding-right: 0.5em; font-size: 9pt; width: 85%;')
      var transactionRow = function (dom, x) {
        var tr = dom.createElement('tr')

        var setTRStyle = function (tr, account) {
          // var mystyle = "padding: 0.5em 1.5em 1em 1.5em; "
          var mystyle = "'padding-left: 0.5em; padding-right: 0.5em; padding-top: 0.1em;"
          if (account) {
            var backgroundColor = kb.any(account, UI.ns.ui('backgroundColor'))
            if (backgroundColor) mystyle += 'background-color: '
                + backgroundColor.value + '; '
          }
          tr.setAttribute('style', mystyle)
        }

        var account = kb.any(x, ns.qu('toAccount'))
        setTRStyle(tr, account)

        var c0 = tr.appendChild(dom.createElement('td'))
        var date = kb.any(x, ns.qu('date'))
        c0.textContent = date ? date.value.slice(0, 10) : '???'
        c0.setAttribute('style', 'width: 7em;')

        var c1 = tr.appendChild(dom.createElement('td'))
        c1.setAttribute('style', 'width: 36em;')
        var payee = kb.any(x, ns.qu('payee'))
        c1.textContent = payee ? payee.value : '???'
        var a1 = c1.appendChild(dom.createElement('a'))
        a1.textContent = ' ➜'
        a1.setAttribute('href', x.uri)

        var c3 = tr.appendChild(dom.createElement('td'))
        var amount = kb.any(x, ns.qu('in_USD'))
        c3.textContent = amount ? d2(amount.value) : '???'
        c3.setAttribute('style', 'width: 6em; text-align: right; '); // @@ decimal alignment?
        tr.addEventListener('click', function (e) { // solo unless shift key
          expandAfterRowOrCollapse(dom, tr, x, 'transaction', !e.shiftKey)
        }, false)

        return tr
      }

      var list2 = filter ? list.filter(filter) : list.slice(); // don't sort a paramater passed in place
      list2.sort(oderByDate)

      for (var i = 0; i < list2.length; i++) {
        table.appendChild(transactionRow(dom, list2[i]))
      }
      return table
    }


    //              Render a single transaction

    // This works only if enough metadata about the properties can drive the RDFS
    // (or actual type statements whichtypically are NOT there on)
    if (t['http://www.w3.org/2000/10/swap/pim/qif#Transaction'] || kb.any(subject, ns.qu('toAccount'))) {
      var trip = kb.any(subject, WF('trip'))
      var ns = UI.ns
      donePredicate(ns.rdf('type'))

      var setPaneStyle = function (account) {
        var mystyle = 'padding: 0.5em 1.5em 1em 1.5em; '
        if (account) {
          var backgroundColor = kb.any(account, UI.ns.ui('backgroundColor'))
          if (backgroundColor) mystyle += 'background-color: '
              + backgroundColor.value + '; '
        }
        div.setAttribute('style', mystyle)
      }

      var account = kb.any(subject, UI.ns.qu('toAccount'))
      setPaneStyle(account)
      if (account == undefined) {
        complain('(Error: There is no bank account known for this transaction <'
          + subject.uri + '>,\n -- every transaction needs one.)')
      }

      var store = null
      var statement = kb.any(subject, UI.ns.qu('accordingTo'))
      if (statement == undefined) {
        complain('(Error: There is no back link to the original data source foir this transaction <'
          + subject.uri + ">,\nso I can't tell how to annotate it.)")
      } else {
        store = statement != undefined ? kb.any(statement, UI.ns.qu('annotationStore')) : null
        if (store == undefined) {
          complain('(There is no annotation document for this statement\n<'
            + statement.uri + '>,\nso you cannot classify this transaction.)')
        }
      }

      var nav = dom.createElement('div')
      nav.setAttribute('style', 'float:right')
      div.appendChild(nav)

      var navLink = function (pred, label) {
        donePredicate(pred)
        var obj = kb.any(subject, pred)
        if (!obj) return
        var a = dom.createElement('a')
        a.setAttribute('href', obj.uri)
        a.setAttribute('style', 'float:right')
        nav.appendChild(a).textContent = label ? label : UI.utils.label(obj)
        nav.appendChild(dom.createElement('br'))
      }

      navLink(UI.ns.qu('toAccount'))
      navLink(UI.ns.qu('accordingTo'), 'Statement')
      navLink(TRIP('trip'))

      // Basic data:
      var table = dom.createElement('table')
      div.appendChild(table)
      var preds = ['date', 'payee', 'amount', 'in_USD', 'currency'].map(Q)
      var inner = preds.map(function (p) {
        donePredicate(p)
        var value = kb.any(subject, p)
        var s = value ? UI.utils.labelForXML(value) : ''
        return '<tr><td style="text-align: right; padding-right: 0.6em">' + UI.utils.labelForXML(p) +
        '</td><td style="font-weight: bold;">' + s + '</td></tr>'
      }).join('\n')
      table.innerHTML = inner

      var complainIfBad = function (ok, body) {
        if (ok) {
          // setModifiedDate(store, kb, store)
          // rerender(div) // deletes the new trip form
        }
        else complain('Sorry, failed to save your change:\n' + body)
      }

      // What trips do we know about?

      // Classify:
      if (store) {
        kb.fetcher.nowOrWhenFetched(store.uri, subject, function (ok, body) {
          if (!ok) complain('Cannot load store ' + store + ' ' + body)

          var calendarYear = kb.any(store, ns.qu('calendarYear'))

          var renderCatgorySelectors = function(){
            div.insertBefore(
              UI.widgets.makeSelectForNestedCategory(dom, kb,
                subject, UI.ns.qu('Classified'), store, complainIfBad),
              table.nextSibling)
          }

          if (kb.any(undefined, ns.rdfs('subClassOf'), ns.qu.Classified)) {
            renderCatgorySelectors()
          } else if (calendarYear) {
            fetcher.load(calendarYear).then(function(xhrs){
              fetcher.load(kb.each(calendarYear, ns.rdfs('seeAlso'))).then(function(){
                renderCatgorySelectors()
              }).catch(function(e){
                console.log('Error loading background data: ' + e)
              })
            }).catch(function(e){
              console.log('Error loading calendarYear: ' + e)
            })
          } else {
            console.log("Can't get categories, because no calendarYear")
          }
          div.appendChild(UI.widgets.makeDescription(dom, kb, subject,
            UI.ns.rdfs('comment'), store, complainIfBad))

          var trips = kb.statementsMatching(undefined, TRIP('trip'), undefined, store)
            .map(function (st) {return st.object}); // @@ Use rdfs
          var trips2 = kb.each(undefined, UI.ns.rdf('type'), TRIP('Trip'))
          trips = trips.concat(trips2).sort(); // @@ Unique

          var sortedBy = function (kb, list, pred, reverse) {
            l2 = list.map(function (x) {
              var key = kb.any(x, pred)
              key = key ? key.value : '9999-12-31'
              return [ key, x ]
            })
            l2.sort()
            if (reverse) l2.reverse()
            return l2.map(function (pair) {return pair[1]})
          }

          trips = sortedBy(kb, trips, UI.ns.cal('dtstart'), true) // Reverse chron

          if (trips.length > 1) div.appendChild(UI.widgets.makeSelectForOptions(
              dom, kb, subject, TRIP('trip'), trips,
              { 'multiple': false, 'nullLabel': '-- what trip? --', 'mint': 'New Trip *',
                'mintClass': TRIP('Trip'),
                'mintStatementsFun': function (trip) {
                  var is = []
                  is.push($rdf.st(trip, UI.ns.rdf('type'), TRIP('Trip'), trip.doc()))
                return is}},
              store, complainIfBad))


          div.appendChild(dom.createElement('br'))

          // Add in simple comments about the transaction

          var outliner = UI.panes.getOutliner(dom)

          donePredicate(ns.rdfs('comment')) // Done above

          var a = UI.widgets.attachmentList(dom, subject, div)
          donePredicate(ns.wf('attachment'))

          div.appendChild(dom.createElement('tr'))
            .setAttribute('style', 'height: 1em') // spacer

          // Remaining properties
          outliner.appendPropertyTRs(div, plist, false,
            function (pred, inverse) {
              return !(pred.uri in predicateURIsDone)
            })
          outliner.appendPropertyTRs(div, qlist, true,
            function (pred, inverse) {
              return !(pred.uri in predicateURIsDone)
            })



        }) // fetch
      }


        // end of render tranasaction instance

    // ////////////////////////////////////////////////////////////////////
    //
    //      Render the transactions in a Trip
    //
    } else if (t['http://www.w3.org/ns/pim/trip#Trip']) {
      /*
          var query = new $rdf.Query(UI.utils.label(subject))
          var vars =  [ 'date', 'transaction', 'comment', 'type',  'in_USD']
          var v = {}
          vars.map(function(x){query.vars.push(v[x]=$rdf.variable(x))}) // Only used by UI
          query.pat.add(v['transaction'], TRIP('trip'), subject)

          var opt = kb.formula()
          opt.add(v['transaction'], ns.rdf('type'), v['type']); // Issue: this will get stored supertypes too
          query.pat.optional.push(opt)

          query.pat.add(v['transaction'], UI.ns.qu('date'), v['date'])

          var opt = kb.formula()
          opt.add(v['transaction'], ns.rdfs('comment'), v['comment'])
          query.pat.optional.push(opt)

          //opt = kb.formula()
          query.pat.add(v['transaction'], UI.ns.qu('in_USD'), v['in_USD'])

          //query.pat.optional.push(opt)

          var tableDiv = UI.widgets.renderTableViewPane(dom, {'query': query, 'onDone': calculations} )
          div.appendChild(tableDiv)

*/
      var calculations = function () {
        var total = {}
        var yearTotal = {}
        var yearCategoryTotal = {}
        var trans = kb.each(undefined, TRIP('trip'), subject)
        var bankStatements = trans.map(function(t){return t.doc()})
        kb.fetcher.load(bankStatements).then(function(){

          trans.map(function (t) {

            var date = kb.the(t, ns.qu('date'))
            var year = date ? ('' + date.value).slice(0, 4) : '????'
            var ty = kb.the(t, ns.rdf('type')); // @@ find most specific type
            // complain(" -- one trans: "+t.uri + ' -> '+kb.any(t, UI.ns.qu('in_USD')))
            if (!ty) ty = UI.ns.qu('ErrorNoType')
            if (ty && ty.uri) {
              var tyuri = ty.uri
              if (!yearTotal[year]) yearTotal[year] = 0.0
              if (!yearCategoryTotal[year]) yearCategoryTotal[year] = {}
              if (!total[tyuri]) total[tyuri] = 0.0
              if (!yearCategoryTotal[year][tyuri]) yearCategoryTotal[year][tyuri] = 0.0

              var lit = kb.any(t, UI.ns.qu('in_USD'))
              if (!lit) {
                complain('@@ No amount in USD: ' + lit + ' for ' + t)
              }
              if (lit) {
                var amount = parseFloat(lit.value)
                total[tyuri] += amount
                yearCategoryTotal[year][tyuri] += amount
                yearTotal[year] += amount
              }
            }

          })

          var types = []
          var grandTotal = 0.0
          var years = [], i

          for (var y in yearCategoryTotal) {
            if (yearCategoryTotal.hasOwnProperty(y)) {
              years.push(y)
            }
          }
          years.sort()
          var ny = years.length, cell

          var table = div.appendChild(dom.createElement('table'))
          table.setAttribute('style', 'font-size: 120%; margin-left:auto; margin-right:1em; margin-top: 1em; border: 0.05em solid gray; padding: 1em;')

          if (ny > 1) {
            var header = table.appendChild(dom.createElement('tr'))
            header.appendChild(headerCell(''))
            for (i = 0; i < ny; i++) {
              header.appendChild(headerCell(years[i]))
            }
            header.appendChild(headerCell('total'))
          }

          for (var uri in total) if (total.hasOwnProperty(uri)) {
              types.push(uri)
              grandTotal += total[uri]
          }
          types.sort()
          var row, label, z
          for (var j = 0; j < types.length; j++) {
            var cat = kb.sym(types[j])
            row = table.appendChild(dom.createElement('tr'))
            label = row.appendChild(dom.createElement('td'))
            label.textContent = UI.utils.label(cat)
            if (ny > 1) {
              for (i = 0; i < ny; i++) {
                z = yearCategoryTotal[years[i]][types[j]]
                cell = row.appendChild(numericCell(z, true))
              }
            }
            row.appendChild(numericCell(total[types[j]], true))
          }

          // Trailing totals
          if (types.length > 1) {
            row = table.appendChild(dom.createElement('tr'))
            row.appendChild(headerCell('total'))
            if (ny > 1) {
              for (i = 0; i < ny; i++) {
                z = yearTotal[years[i]]
                cell = row.appendChild(numericCell(z ? d2(z) : ''))
              }
            }
            cell = row.appendChild(numericCell(grandTotal))
            cell.setAttribute('style', 'font-weight: bold; text-align: right;')
          }

          var tab = transactionTable(dom, trans)
          tab.setAttribute('style', 'margin-left:auto; margin-right:1em; margin-top: 1em; border: padding: 1em;')
          div.appendChild(tab)

          UI.widgets.attachmentList(dom, subject, div)


        }).catch(function(e){complain('Error loading transactions: ' + e)})

      }

      calculations()



    } // if

    // if (!me) complain("You do not have your Web Id set. Set your Web ID to make changes.")

    return div
  }
}

// ends
