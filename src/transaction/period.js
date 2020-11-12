/*   Financial Period Pane
 **
 **  This outline pane allows a user to interact with a period
 **  downloaded from a bank statement, annotting it with classes and comments,
 ** trips, etc
 */

const UI = require('solid-ui')
const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_142708.svg',

  name: 'period',

  audience: [ns.solid('PowerUser')],

  // Does the subject deserve this pane?
  label: function (subject, context) {
    const kb = context.session.store
    const t = kb.findTypeURIs(subject)
    if (t['http://www.w3.org/2000/10/swap/pim/qif#Period']) return 'period'
    return null // No under other circumstances (while testing at least!)
  },

  render: function (subject, context) {
    const dom = context.dom
    const kb = context.session.store
    const ns = UI.ns

    const div = dom.createElement('div')
    div.setAttribute('class', 'periodPane')

    const mention = function mention (message, style) {
      if (!style) style = 'color: grey;'
      const pre = dom.createElement('pre')
      pre.setAttribute('style', style)
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }
    const happy = function happy (message) {
      return mention('✓ ' + message, 'color: #010; background-color: #efe')
    }
    const complain = function complain (message) {
      return mention(message, 'color: #100; background-color: #fee')
    }
    /*
    var rerender = function (div) {
      var parent = div.parentNode
      var div2 = thisPane.render(subject, dom)
      parent.replaceChild(div2, div)
    }
*/
    const renderPeriod = function () {
      const dtstart = kb.any(subject, ns.cal('dtstart'))
      if (dtstart === undefined) {
        complain(
          '(Error: There is no start date known for this period <' +
            subject.uri +
            '>,\n -- every period needs one.)'
        )
      }

      const dtend = kb.any(subject, ns.cal('dtend'))
      if (dtend === undefined) {
        complain(
          '(Error: There is no end date known for this period <' +
            subject.uri +
            '>,\n -- every period needs one.)'
        )
      }

      // var store = kb.any(subject, UI.ns.qu('annotationStore')) || null

      const predicateURIsDone = {}
      const donePredicate = function (pred) {
        predicateURIsDone[pred.uri] = true
      }
      donePredicate(ns.rdf('type'))

      const inPeriod = function (date) {
        return !!(date && date >= dtstart && date < dtend)
      }

      const d2 = function (n) {
        const s = '' + n
        if (s.indexOf('.') >= 0) {
          return s.split('.')[0] + '.' + (s.split('.')[1] + '00').slice(0, 2)
        }
        return s + '.00'
      }

      const transactionInPeriod = function (x) {
        return inPeriod(kb.any(x, ns.qu('date')))
      }

      const oderByDate = function (x, y) {
        const dx = kb.any(x, ns.qu('date'))
        const dy = kb.any(y, ns.qu('date'))
        if (dx !== undefined && dy !== undefined) {
          if (dx.value < dy.value) return -1
          if (dx.value > dy.value) return 1
        }
        if (x.uri < y.uri) return -1 // Arbitrary but repeatable
        if (x.uri > y.uri) return 1
        return 0
      }
      /*
      var setPaneStyle = function (account) {
        var mystyle = 'padding: 0.5em 1.5em 1em 1.5em; '
        if (account) {
          var backgroundColor = kb.any(account, UI.ns.ui('backgroundColor'))
          if (backgroundColor) {
            mystyle += 'background-color: ' + backgroundColor.value + '; '
          }
        }
        div.setAttribute('style', mystyle)
      }
      // setPaneStyle();
*/
      const h2 = div.appendChild(dom.createElement('h2'))
      h2.textContent =
        'Period ' +
        dtstart.value.slice(0, 10) +
        ' - ' +
        dtend.value.slice(0, 10)

      const insertedPane = function (context, subject, paneName) {
        const p = context.session.paneRegistry.byName(paneName)
        const d = p.render(subject, context)
        d.setAttribute('style', 'border: 0.1em solid green;')
        return d
      }

      const expandAfterRow = function (dom, row, subject, paneName, solo) {
        const siblings = row.parentNode.children
        if (solo) {
          for (let j = siblings.length - 1; j >= 0; j--) {
            if (siblings[j].expanded) {
              siblings[j].parentNode.removeChild(siblings[j].expanded)
              siblings[j].expanded = false
            }
          }
        }
        const tr = dom.createElement('tr')
        const td = tr.appendChild(dom.createElement('td'))
        td.setAttribute(
          'style',
          'width: 98%; padding: 1em; border: 0.1em solid grey;'
        )
        const cols = row.children.length
        if (row.nextSibling) {
          row.parentNode.insertBefore(tr, row.nextSibling)
        } else {
          row.parentNode.appendChild(tr)
        }
        row.expanded = tr
        td.setAttribute('colspan', '' + cols)
        td.appendChild(insertedPane(context, subject, paneName))
      }

      const expandAfterRowOrCollapse = function (
        dom,
        row,
        subject,
        paneName,
        solo
      ) {
        if (row.expanded) {
          row.parentNode.removeChild(row.expanded)
          row.expanded = false
        } else {
          expandAfterRow(dom, row, subject, paneName, solo)
        }
      }

      const transactionTable = function (dom, list) {
        const table = dom.createElement('table')
        table.setAttribute(
          'style',
          'margin-left: 100; font-size: 9pt; width: 85%;'
        )
        const transactionRow = function (dom, x) {
          const tr = dom.createElement('tr')

          const setTRStyle = function (tr, account) {
            // var mystyle = "padding: 0.5em 1.5em 1em 1.5em; ";
            let mystyle = 'margin-left: 8em; padding-left: 5em;'
            if (account) {
              const backgroundColor = kb.any(account, UI.ns.ui('backgroundColor'))
              if (backgroundColor) {
                mystyle += 'background-color: ' + backgroundColor.value + '; '
              }
            }
            tr.setAttribute('style', mystyle)
          }

          const account = kb.any(x, ns.qu('toAccount'))
          setTRStyle(tr, account)

          const c0 = tr.appendChild(dom.createElement('td'))
          const date = kb.any(x, ns.qu('date'))
          c0.textContent = date ? date.value.slice(0, 10) : '???'
          c0.setAttribute('style', 'width: 7em;')

          const c1 = tr.appendChild(dom.createElement('td'))
          c1.setAttribute('style', 'width: 36em;')
          const payee = kb.any(x, ns.qu('payee'))
          c1.textContent = payee ? payee.value : '???'
          const a1 = c1.appendChild(dom.createElement('a'))
          a1.textContent = ' ➜'
          a1.setAttribute('href', x.uri)

          const c3 = tr.appendChild(dom.createElement('td'))
          const amount = kb.any(x, ns.qu('in_USD'))
          c3.textContent = amount ? d2(amount.value) : '???'
          c3.setAttribute('style', 'width: 6em; text-align: right; ') // @@ decimal alignment?
          tr.addEventListener(
            'click',
            function (e) {
              // solo unless shift key
              expandAfterRowOrCollapse(dom, tr, x, 'transaction', !e.shiftKey)
            },
            false
          )

          return tr
        }

        const list2 = list.filter(transactionInPeriod)
        list2.sort(oderByDate)

        for (let i = 0; i < list2.length; i++) {
          table.appendChild(transactionRow(dom, list2[i]))
        }
        return table
      }

      // List unclassified transactions

      const dummies = {
        'http://www.w3.org/2000/10/swap/pim/qif#Transaction': true, // (we knew)
        'http://www.w3.org/2000/10/swap/pim/qif#Unclassified': true, // pseudo classifications we may phase out
        'http://www.w3.org/2000/10/swap/pim/qif#UnclassifiedOutgoing': true,
        'http://www.w3.org/2000/10/swap/pim/qif#UnclassifiedIncome': true
      }
      const xURIs = kb.findMemberURIs(ns.qu('Transaction'))
      const unclassifiedIn = []
      const unclassifiedOut = []
      let usd, z
      for (const y in xURIs) {
        // For each thing which can be inferred to be a transaction
        // @@ TODO: Write away the need for exception on next line
        // eslint-disable-next-line no-prototype-builtins
        if (xURIs.hasOwnProperty(y)) {
          z = kb.sym(y)
          const tt = kb.each(z, ns.rdf('type')) // What EXPLICIT definitions
          let classified = false
          for (let j = 0; j < tt.length; j++) {
            const t = tt[j]
            if (dummies[t.uri] === undefined) {
              classified = true
            }
          }
          if (!classified) {
            usd = kb.any(z, ns.qu('in_USD'))
            if (usd === undefined) {
              usd = kb.any(z, ns.qu('amount'))
            }
            if (usd && ('' + usd.value).indexOf('-') >= 0) {
              unclassifiedOut.push(kb.sym(y))
            } else {
              unclassifiedIn.push(kb.sym(y))
            }
          }
        }
      }
      let tab, count
      if (unclassifiedIn.length) {
        tab = transactionTable(dom, unclassifiedIn)
        count = tab.children.length
        div.appendChild(dom.createElement('h3')).textContent =
          'Unclassified Income' + (count < 4 ? '' : ' (' + count + ')')
        div.appendChild(tab)
      } else {
        happy('No unclassified income')
      }
      if (unclassifiedOut.length) {
        tab = transactionTable(dom, unclassifiedOut)
        count = tab.children.length
        div.appendChild(dom.createElement('h3')).textContent =
          'Unclassified Outgoings' + (count < 4 ? '' : ' (' + count + ')')
        div.appendChild(tab)
      } else {
        happy('No unclassified outgoings ')
      }

      // ///////////////  Check some categories of transaction for having given fields

      const catSymbol = function (catTail) {
        const cats = kb.findSubClassesNT(ns.qu('Transaction'))
        for (const cat in cats) {
          // @@ TODO: Write away the need for exception on next line
          // eslint-disable-next-line no-prototype-builtins
          if (cats.hasOwnProperty(cat)) {
            if (cat.slice(1, -1).split('#')[1] === catTail) {
              return kb.sym(cat.slice(1, -1))
            }
          }
        }
        return null
      }

      const checkCatHasField = function (catTail, pred) {
        const cat = catSymbol(catTail)
        let tab
        const guilty = []
        let count = 0
        if (!cat) {
          complain('Error: No category correspnding to ' + catTail)
          return null
        }
        const list = kb.each(undefined, ns.rdf('type'), cat)
        for (let i = 0; i < list.length; i++) {
          if (!kb.any(list[i], pred)) {
            guilty.push(list[i])
          }
        }
        if (guilty.length) {
          tab = transactionTable(dom, guilty)
          count = tab.children.length
          div.appendChild(dom.createElement('h3')).textContent =
            UI.utils.label(cat) +
            ' with no ' +
            UI.utils.label(pred) +
            (count < 4 ? '' : ' (' + count + ')')
          div.appendChild(tab)
        }
        return count
      }

      // Load dynamically as properties of period
      if (checkCatHasField('Reimbursables', ns.trip('trip')) === 0) {
        happy('Reimbursables all have trips')
      }
      if (checkCatHasField('Other_Inc_Speaking', ns.trip('trip')) === 0) {
        happy('Speaking income all has trips')
      }
      // end of render period instance
    } // renderPeriod

    // //////////////////////////////////////////////////////////////////////////////

    // var me = UI.authn.currentUser()

    //              Render a single Period

    // This works only if enough metadata about the properties can drive the RDFS
    // (or actual type statements whichtypically are NOT there on)
    const t = kb.findTypeURIs(subject)
    if (t['http://www.w3.org/2000/10/swap/pim/qif#Period']) {
      const needed = kb.each(subject, ns.rdfs('seeAlso'))
      console.log('Loading before render: ' + needed.length)
      kb.fetcher.load(needed).then(function () {
        renderPeriod()
      })
    }

    // if (!me) complain("You do not have your Web Id set. Set your Web ID to make changes.");

    return div
  }
}
// ends
