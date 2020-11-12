/*   Social Pane
 **
 **  This outline pane provides social network functions
 **  Using for example the FOAF ontology.
 **  Goal:  A *distributed* version of facebook, advogato, etc etc
 **  - Similarly easy user interface, but data storage distributed
 **  - Read and write both user-private (address book) and public data clearly
 **  -- todo: use common code to get username and load profile and set 'me'
 */

const UI = require('solid-ui')
const $rdf = require('rdflib')

module.exports = {
  icon: UI.icons.originalIconBase + 'foaf/foafTiny.gif',

  name: 'social',

  label: function (subject, context) {
    const kb = context.session.store
    const types = kb.findTypeURIs(subject)
    if (
      types[UI.ns.foaf('Person').uri] ||
      types[UI.ns.vcard('Individual').uri]
    ) {
      return 'Friends'
    }
    return null
  },

  render: function (s, context) {
    const dom = context.dom
    const common = function (x, y) {
      // Find common members of two lists
      const both = []
      for (let i = 0; i < x.length; i++) {
        for (let j = 0; j < y.length; j++) {
          if (y[j].sameTerm(x[i])) {
            both.push(y[j])
            break
          }
        }
      }
      return both
    }

    const people = function (n) {
      let res = ' '
      res += n || 'no'
      if (n === 1) return res + ' person'
      return res + ' people'
    }
    const say = function (str) {
      console.log(str)
      const p = dom.createElement('p')
      p.textContent = str
      tips.appendChild(p)
    }

    const link = function (contents, uri) {
      if (!uri) return contents
      const a = dom.createElement('a')
      a.setAttribute('href', uri)
      a.appendChild(contents)
      return a
    }

    const text = function (str) {
      return dom.createTextNode(str)
    }

    const buildCheckboxForm = function (lab, statement, state) {
      const f = dom.createElement('form')
      const input = dom.createElement('input')
      f.appendChild(input)
      const tx = dom.createTextNode(lab)
      tx.className = 'question'
      f.appendChild(tx)
      input.setAttribute('type', 'checkbox')
      const boxHandler = function (_e) {
        tx.className = 'pendingedit'
        // alert('Should be greyed out')
        if (this.checked) {
          // Add link
          try {
            outliner.UserInput.sparqler.insert_statement(statement, function (
              uri,
              success,
              errorBody
            ) {
              tx.className = 'question'
              if (!success) {
                UI.log.alert(
                  null,
                  'Message',
                  'Error occurs while inserting ' +
                    statement +
                    '\n\n' +
                    errorBody
                )
                input.checked = false // rollback UI
                return
              }
              kb.add(
                statement.subject,
                statement.predicate,
                statement.object,
                statement.why
              )
            })
          } catch (e) {
            UI.log.error('Data write fails:' + e)
            UI.log.alert('Data write fails:' + e)
            input.checked = false // rollback UI
            tx.className = 'question'
          }
        } else {
          // Remove link
          try {
            outliner.UserInput.sparqler.delete_statement(statement, function (
              uri,
              success,
              errorBody
            ) {
              tx.className = 'question'
              if (!success) {
                UI.log.alert(
                  'Error occurs while deleting ' +
                    statement +
                    '\n\n' +
                    errorBody
                )
                this.checked = true // Rollback UI
              } else {
                kb.removeMany(
                  statement.subject,
                  statement.predicate,
                  statement.object,
                  statement.why
                )
              }
            })
          } catch (e) {
            UI.log.alert('Delete fails:' + e)
            this.checked = true // Rollback UI
            // return
          }
        }
      }
      input.checked = state
      input.addEventListener('click', boxHandler, false)
      return f
    }

    const oneFriend = function (friend, _confirmed) {
      return UI.widgets.personTR(dom, UI.ns.foaf('knows'), friend, {})
    }

    // ////////// Body of render():

    var outliner = context.getOutliner(dom)
    var kb = context.session.store
    const div = dom.createElement('div')
    div.setAttribute('class', 'socialPane')
    const foaf = UI.ns.foaf
    const vcard = UI.ns.vcard

    // extracted from tabbedtab.css 2017-03-21
    const navBlockStyle =
      'background-color: #eee; width: 25%; border: 0; padding: 0.5em; margin: 0;'
    const mainBlockStyle =
      'background-color: #fff; color: #000; width: 46%; margin: 0; border-left: 1px solid #ccc; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 0;'
    const foafPicStyle = ' width: 100% ; border: none; margin: 0; padding: 0;'

    const structure = div.appendChild(dom.createElement('table'))
    const tr = structure.appendChild(dom.createElement('tr'))
    const left = tr.appendChild(dom.createElement('td'))
    const middle = tr.appendChild(dom.createElement('td'))
    const right = tr.appendChild(dom.createElement('td'))

    const tools = left
    tools.style.cssText = navBlockStyle
    const mainTable = middle.appendChild(dom.createElement('table'))
    mainTable.style.cssText = mainBlockStyle
    var tips = right
    tips.style.cssText = navBlockStyle

    // Image top left
    const src = kb.any(s, foaf('img')) || kb.any(s, foaf('depiction'))
    if (src) {
      const img = dom.createElement('IMG')
      img.setAttribute('src', src.uri) // w640 h480
      // img.className = 'foafPic'
      img.style.cssText = foafPicStyle
      tools.appendChild(img)
    }
    const name = kb.anyValue(s, foaf('name')) || '???'
    let h3 = dom.createElement('H3')
    h3.appendChild(dom.createTextNode(name))

    let me = UI.authn.currentUser()
    const meUri = me ? me.uri : null

    // @@ Add: event handler to redraw the stuff below when me changes.
    const loginOutButton = UI.authn.loginStatusBox(dom, webIdUri => {
      me = kb.sym(webIdUri)
      // @@ To be written:   redraw as a function the new me
      // @@ refresh the sidebars
      UI.widgets.refreshTree(div) // this refreshes the middle at least
    })

    tips.appendChild(loginOutButton)

    const thisIsYou = me && kb.sameThings(me, s)

    const knows = foaf('knows')
    //        var givenName = kb.sym('http://www.w3.org/2000/10/swap/pim/contact#givenName')
    const familiar =
      kb.anyValue(s, foaf('givenname')) ||
      kb.anyValue(s, foaf('firstName')) ||
      kb.anyValue(s, foaf('nick')) ||
      kb.anyValue(s, foaf('name')) ||
      kb.anyValue(s, vcard('fn'))
    const friends = kb.each(s, knows)

    // Do I have a public profile document?
    let profile = null // This could be  SPARQL { ?me foaf:primaryTopic [ a foaf:PersonalProfileDocument ] }
    let editable = false
    if (me) {
      // The definition of FAF personal profile document is ..
      const works = kb.each(undefined, foaf('primaryTopic'), me) // having me as primary topic
      let message = ''
      for (let i = 0; i < works.length; i++) {
        if (
          kb.whether(
            works[i],
            UI.ns.rdf('type'),
            foaf('PersonalProfileDocument')
          )
        ) {
          editable = outliner.UserInput.sparqler.editable(works[i].uri, kb)
          if (!editable) {
            message +=
              'Your profile <' +
              UI.utils.escapeForXML(works[i].uri) +
              '> is not remotely editable.'
          } else {
            profile = works[i]
            break
          }
        }
      }

      if (!profile) {
        say(
          message + "\nI couldn't find your editable personal profile document."
        )
      } else {
        say('Editing your profile ' + profile + '.')
        // Do I have an EDITABLE profile?
        editable = outliner.UserInput.sparqler.editable(profile.uri, kb)
      }

      if (thisIsYou) {
        // This is about me
        // pass... @@
      } else {
        // This is about someone else
        // My relationship with this person

        h3 = dom.createElement('h3')
        h3.appendChild(dom.createTextNode('You and ' + familiar))
        tools.appendChild(h3)

        const cme = kb.canon(me)
        var incoming = kb.whether(s, knows, cme)
        var outgoing = false
        const outgoingSt = kb.statementsMatching(cme, knows, s)
        if (outgoingSt.length) {
          outgoing = true
          if (!profile) profile = outgoingSt[0].why
        }

        const tr = dom.createElement('tr')
        tools.appendChild(tr)

        const youAndThem = function () {
          tr.appendChild(link(text('You'), meUri))
          tr.appendChild(text(' and '))
          tr.appendChild(link(text(familiar), s.uri))
        }

        if (!incoming) {
          if (!outgoing) {
            youAndThem()
            tr.appendChild(text(' have not said you know each other.'))
          } else {
            tr.appendChild(link(text('You'), meUri))
            tr.appendChild(text(' know '))
            tr.appendChild(link(text(familiar), s.uri))
            tr.appendChild(text(' (unconfirmed)'))
          }
        } else {
          if (!outgoing) {
            tr.appendChild(link(text(familiar), s.uri))
            tr.appendChild(text(' knows '))
            tr.appendChild(link(text('you'), meUri))
            tr.appendChild(text(' (unconfirmed).')) // @@
            tr.appendChild(text(' confirm you know '))
            tr.appendChild(link(text(familiar), s.uri))
            tr.appendChild(text('.'))
          } else {
            youAndThem()
            tr.appendChild(text(' say you know each other.'))
          }
        }

        if (editable) {
          const f = buildCheckboxForm(
            'You know ' + familiar,
            new UI.rdf.Statement(me, knows, s, profile),
            outgoing
          )
          tools.appendChild(f)
        } // editable

        // //////////////// Mutual friends
        if (friends) {
          const myFriends = kb.each(me, foaf('knows'))
          if (myFriends.length) {
            const mutualFriends = common(friends, myFriends)
            const tr = dom.createElement('tr')
            tools.appendChild(tr)
            tr.appendChild(
              dom.createTextNode(
                'You' +
                  (familiar ? ' and ' + familiar : '') +
                  ' know' +
                  people(mutualFriends.length) +
                  ' found in common'
              )
            )
            if (mutualFriends) {
              for (let i = 0; i < mutualFriends.length; i++) {
                tr.appendChild(
                  dom.createTextNode(',  ' + UI.utils.label(mutualFriends[i]))
                )
              }
            }
          }
          const tr = dom.createElement('tr')
          tools.appendChild(tr)
        } // friends
      } // About someone else
    } // me is defined
    // End of you and s

    // div.appendChild(dom.createTextNode(plural(friends.length, 'acquaintance') +'. '))

    // /////////////////////////////////////////////  Main block
    //
    // Should: Find the intersection and difference sets

    // List all x such that s knows x.
    UI.widgets.attachmentList(dom, s, mainTable, {
      doc: profile,
      modify: !!editable,
      predicate: foaf('knows'),
      noun: 'friend'
    })

    // Figure out which are reciprocated:
    // @@ Does not look up profiles
    // Does distinguish reciprocated from unreciprocated friendships
    //
    function triageFriends (s) {
      outgoing = kb.each(s, foaf('knows'))
      incoming = kb.each(undefined, foaf('knows'), s) // @@ have to load the friends
      const confirmed = []
      const unconfirmed = []
      const requests = []

      for (let i = 0; i < outgoing.length; i++) {
        const friend = outgoing[i]
        let found = false
        for (let j = 0; j < incoming.length; j++) {
          if (incoming[j].sameTerm(friend)) {
            found = true
            break
          }
        }
        if (found) confirmed.push(friend)
        else unconfirmed.push(friend)
      } // outgoing

      for (let i = 0; i < incoming.length; i++) {
        const friend = incoming[i]
        // var lab = UI.utils.label(friend)
        let found = false
        for (let j = 0; j < outgoing.length; j++) {
          if (outgoing[j].sameTerm(friend)) {
            found = true
            break
          }
        }
        if (!found) requests.push(friend)
      } // incoming

      const cases = [
        ['Acquaintances', outgoing],
        ['Mentioned as acquaintances by: ', requests]
      ]
      for (let i = 0; i < cases.length; i++) {
        const thisCase = cases[i]
        const friends = thisCase[1]
        if (friends.length === 0) continue // Skip empty sections (sure?)

        const h3 = dom.createElement('h3')
        h3.textContent = thisCase[0]
        const htr = dom.createElement('tr')
        htr.appendChild(h3)
        mainTable.appendChild(htr)

        const items = []
        for (let j9 = 0; j9 < friends.length; j9++) {
          items.push([UI.utils.label(friends[j9]), friends[j9]])
        }
        items.sort()
        let last = null
        var fr
        for (let j7 = 0; j7 < items.length; j7++) {
          fr = items[j7][1]
          if (fr.sameTerm(last)) continue // unique
          last = fr
          if (UI.utils.label(fr) !== '...') {
            // This check is to avoid bnodes with no labels attached
            // appearing in the friends list with "..." - Oshani
            mainTable.appendChild(oneFriend(fr))
          }
        }
      }
    }
    if ($rdf.keepThisCodeForLaterButDisableFerossConstantConditionPolice) {
      triageFriends(s)
    }
    // //////////////////////////////////// Basic info on left

    h3 = dom.createElement('h3')
    h3.appendChild(dom.createTextNode('Basic Information'))
    tools.appendChild(h3)

    // For each home page like thing make a label which will
    // make sense and add the domain (like "w3.org blog") if there are more than one of the same type
    //
    const preds = [
      UI.ns.foaf('homepage'),
      UI.ns.foaf('weblog'),
      UI.ns.foaf('workplaceHomepage'),
      UI.ns.foaf('schoolHomepage')
    ]
    for (let i6 = 0; i6 < preds.length; i6++) {
      const pred = preds[i6]
      const sts = kb.statementsMatching(s, pred)
      if (sts.length === 0) {
        // if (editable) say("No home page set. Use the blue + icon at the bottom of the main view to add information.")
      } else {
        const uris = []
        for (let j5 = 0; j5 < sts.length; j5++) {
          const st = sts[j5]
          if (st.object.uri) uris.push(st.object.uri) // Ignore if not symbol
        }
        uris.sort()
        let last2 = ''
        var lab2
        for (let k = 0; k < uris.length; k++) {
          const uri = uris[k]
          if (uri === last2) continue // uniques only
          last2 = uri
          let hostlabel = ''
          lab2 = UI.utils.label(pred)
          if (uris.length > 1) {
            const l = uri.indexOf('//')
            if (l > 0) {
              let r = uri.indexOf('/', l + 2)
              const r2 = uri.lastIndexOf('.', r)
              if (r2 > 0) r = r2
              hostlabel = uri.slice(l + 2, r)
            }
          }
          if (hostlabel) lab2 = hostlabel + ' ' + lab2 // disambiguate
          const t = dom.createTextNode(lab2)
          const a = dom.createElement('a')
          a.appendChild(t)
          a.setAttribute('href', uri)
          const d = dom.createElement('div')
          // d.className = 'social_linkButton'
          d.style.cssText =
            'width: 80%; background-color: #fff; border: solid 0.05em #ccc;  margin-top: 0.1em; margin-bottom: 0.1em; padding: 0.1em; text-align: center;'
          d.appendChild(a)
          tools.appendChild(d)
        }
      }
    }

    const preds2 = [UI.ns.foaf('openid'), UI.ns.foaf('nick')]
    for (let i2 = 0; i2 < preds2.length; i2++) {
      const pred = preds2[i2]
      const sts2 = kb.statementsMatching(s, pred)
      if (sts2.length === 0) {
        // if (editable) say("No home page set. Use the blue + icon at the bottom of the main view to add information.")
      } else {
        outliner.appendPropertyTRs(tools, sts2, false, function (_pred) {
          return true
        })
      }
    }

    return div
  } // render()
} //
// ends
