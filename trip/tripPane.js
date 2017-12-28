/*   Trip Pane
**
** This pane deals with trips themselves and also
** will look at transactions organized by trip.
**
**  This outline pane allows a user to interact with a transaction
**  downloaded from a bank statement, annotting it with classes and comments,
**  trips, etc
*/

var UI = require('solid-ui')

module.exports = {

  icon: UI.icons.iconBase + 'noun_62007.svg',

  name: 'travel expenses',

  // Does the subject deserve this pane?
  label: function (subject) {
    var kb = UI.store
    var t = kb.findTypeURIs(subject)

    // if (t['http://www.w3.org/2000/10/swap/pim/qif#Transaction']) return "$$";
    // if(kb.any(subject, UI.ns.qu('amount'))) return "$$$"; // In case schema not picked up

    if (UI.ns.qu('Transaction') in kb.findSuperClassesNT(subject)) return 'by Trip'
    if (t['http://www.w3.org/ns/pim/trip#Trip']) return 'Trip $'

    return null // No under other circumstances (while testing at least!)
  },

  render: function (subject, myDocument) {
    var kb = UI.store
    var ns = UI.ns
    var CAL = $rdf.Namespace('http://www.w3.org/2002/12/cal/ical#')
    var TRIP = $rdf.Namespace('http://www.w3.org/ns/pim/trip#')

    var div = myDocument.createElement('div')
    div.setAttribute('class', 'transactionPane')
    div.innerHTML = '<h2>Trip transactions</h2>'

    var complain = function complain (message, style) {
      if (style === undefined) style = 'color: grey'
      var pre = myDocument.createElement('pre')
      pre.setAttribute('style', style)
      div.appendChild(pre)
      pre.appendChild(myDocument.createTextNode(message))
    }

// //////////////////////////////////////////////////////////////////////////////
//
//   Body of trip pane

    var t = kb.findTypeURIs(subject)

    // var me = UI.authn.currentUser()

    //      Function: Render a single trip

    var renderTrip = function renderTrip (subject, thisDiv) {
      var query = new $rdf.Query(UI.utils.label(subject))
      var vars = [ 'date', 'transaction', 'comment', 'type', 'in_USD' ]
      var v = { }
      vars.map(function (x) { query.vars.push(v[x] = $rdf.variable(x)) }) // Only used by UI
      query.pat.add(v['transaction'], TRIP('trip'), subject)

      var opt = kb.formula()
      opt.add(v['transaction'], ns.rdf('type'), v['type']) // Issue: this will get stored supertypes too
      query.pat.optional.push(opt)

      query.pat.add(v['transaction'], UI.ns.qu('date'), v['date'])

      opt.add(v['transaction'], ns.rdfs('comment'), v['comment'])
      query.pat.optional.push(opt)

      // opt = kb.formula();
      query.pat.add(v['transaction'], UI.ns.qu('in_USD'), v['in_USD'])
      // query.pat.optional.push(opt);

      var calculations = function () {
        var total = {}
        var trans = kb.each(undefined, TRIP('trip'), subject)
        // complain("@@ Number of transactions in this trip: " + trans.length);
        trans.map(function (t) {
          var ty = kb.the(t, ns.rdf('type'))
          // complain(" -- one trans: "+t.uri + ' -> '+kb.any(t, UI.ns.qu('in_USD')));
          if (!ty) ty = UI.ns.qu('ErrorNoType')
          if (ty && ty.uri) {
            var tyuri = ty.uri
            if (!total[tyuri]) total[tyuri] = 0.0
            var lit = kb.any(t, UI.ns.qu('in_USD'))
            if (!lit) {
              complain('    @@ No amount in USD: ' + lit + ' for ' + t)
            }
            if (lit) {
              total[tyuri] = total[tyuri] + parseFloat(lit.value)
              // complain('      Trans type ='+ty+'; in_USD "' + lit
              //       +'; total[tyuri] = '+total[tyuri]+';')
            }
          }
        })
        var str = ''
        var types = 0
        var grandTotal = 0.0
        for (var uri in total) {
          str += UI.utils.label(kb.sym(uri)) + ': ' + total[uri] + '; '
          types++
          grandTotal += total[uri]
        }
        complain('Totals of ' + trans.length + ' transactions: ' + str, '') // @@@@@  yucky -- need 2 col table
        if (types > 1) complain('Overall net: ' + grandTotal, 'text-treatment: bold;')
      }
      var tableDiv = UI.table(myDocument, {'query': query, 'onDone': calculations})
      thisDiv.appendChild(tableDiv)
    }

    //          Render the set of trips which have transactions in this class

    if (UI.ns.qu('Transaction') in kb.findSuperClassesNT(subject)) {
      let ts = kb.each(undefined, ns.rdf('type'), subject)
      let tripless = []
      var index = []
      for (var i = 0; i < ts.length; i++) {
        var trans = ts[i]
        var trip = kb.any(trans, TRIP('trip'))
        if (!trip) {
          tripless.push(trans)
        } else {
          if (!(trans in index)) index[trip] = { total: 0, transactions: [] }
          var usd = kb.any(trans, UI.ns.qu('in_USD'))
          if (usd) index[trip]['total'] += usd
          var date = kb.any(trans, UI.ns.qu('date'))
          index[trip.toNT()]['transactions'].push([date, trans])
        }
      }
      /*            var byDate = function(a,b) {
                      return new Date(kb.any(a, CAL('dtstart'))) -
                              new Date(kb.any(b, CAL('dtstart')));
                  }
      */
      var list = []
      for (var h1 in index) {
        var t1 = kb.fromNT(h1)
        list.push([kb.any(t1, CAL('dtstart')), t1])
      }
      list.sort()
      for (var j = 0; j < list.length; j++) {
        var t2 = list[j][1]
        renderTrip(t2, div)
      }

      //       Render a single trip
    } else if (t['http://www.w3.org/ns/pim/trip#Trip']) {
      renderTrip(subject, div)
    }

    // if (!me) complain("You do not have your Web Id set. Set your Web ID to make changes.");

    return div
  }
}
// ends
