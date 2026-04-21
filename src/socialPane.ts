/*   Social Pane
 **
 **  This outline pane provides social network functions
 **  Using for example the FOAF ontology.
 **  Goal:  A *distributed* version of facebook, advogato, etc etc
 **  - Similarly easy user interface, but data storage distributed
 **  - Read and write both user-private (address book) and public data clearly
 **  -- todo: use common code to get username and load profile and set 'me'
 */

import './socialPane.css'
import { utils, ns, log, widgets } from 'solid-ui'
import { authn } from 'solid-logic'
import { NamedNode, Statement } from 'rdflib'

export const socialPane = {
  icon: utils.icons.originalIconBase + 'foaf/foafTiny.gif',

  name: 'social',

  label: function (subject, context) {
    const kb = context.session.store
    const types = kb.findTypeURIs(subject)
    if (
      types[ns.foaf('Person').uri] ||
      types[ns.vcard('Individual').uri]
    ) {
      return 'Friends'
    }
    return null
  },
  global: true, // doe snot add it to the nav tray in OutlineView

  render: function (s, context) {
    const dom = context.dom
    const common = function (x: NamedNode[], y: NamedNode[]) {
      // Find common members of two lists
      const both: NamedNode[] = []
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

    const people = function (n: number) {
      let res = ' '
      res += n || 'no'
      if (n === 1) return res + ' person'
      return res + ' people'
    }

    const link = function (contents: Node, uri: string | null | undefined) {
      if (!uri) return contents
      const a = dom.createElement('a')
      a.setAttribute('href', uri)
      a.appendChild(contents)
      return a
    }

    const text = function (str: string) {
      return dom.createTextNode(str)
    }

    const buildCheckboxForm = function (lab: string, statement: Statement, state: boolean) {
      const f = dom.createElement('form')
      const label = dom.createElement('label')
      const input = dom.createElement('input')
      const tx = dom.createElement('span')
      tx.className = 'question'
      tx.textContent = lab
      input.setAttribute('type', 'checkbox')
      label.appendChild(input)
      label.appendChild(tx)
      f.appendChild(label)
      const boxHandler = function (this: HTMLInputElement, _e: Event) {
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
                log.alert(
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
            log.error('Data write fails:' + e)
            log.alert('Data write fails:' + e)
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
                log.alert(
                  'Error occurs while deleting ' +
                    statement +
                    '\n\n' +
                    errorBody
                )
                input.checked = true // Rollback UI
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
              log.alert('Delete fails:' + e)
            input.checked = true // Rollback UI
            // return
          }
        }
      }
      input.checked = state
      input.addEventListener('click', boxHandler, false)
      return f
    }

    const oneFriend = function (friend: NamedNode, _confirmed: boolean) {
      return widgets.personTR(dom, ns.foaf('knows'), friend, {})
    }

    // Retained for future reactivation of the older triage-based friends rendering.
    void oneFriend

    // ////////// Body of render():

    const outliner = context.getOutliner(dom)
    const kb = context.session.store
    const div = dom.createElement('div')
    div.setAttribute('class', 'socialPane')
    const foaf = ns.foaf
    const vcard = ns.vcard

    const foafPicStyle = 'social-pic'

    const structure = div.appendChild(dom.createElement('div'))
    structure.className = 'social-layout'
    const primary = structure.appendChild(dom.createElement('div'))
    primary.className = 'social-primary'
    const left = primary.appendChild(dom.createElement('div'))
    left.className = 'social-nav'
    const middle = primary.appendChild(dom.createElement('div'))
    middle.className = 'social-content'
    const right = structure.appendChild(dom.createElement('div'))
    right.className = 'social-toolbar'

    const tools = left
    const mainTable = middle.appendChild(dom.createElement('table'))
    mainTable.className = 'social-main'

    // Image top left
    const src = kb.any(s, foaf('img')) || kb.any(s, foaf('depiction'))
    if (src) {
      const img = dom.createElement('IMG')
      img.setAttribute('src', src.uri) // w640 h480
      // img.className = 'foafPic'
      img.className = foafPicStyle
      tools.appendChild(img)
    }
    const name = kb.anyValue(s, vcard('fn')) || '???'
    let h3 = dom.createElement('H3')
    h3.appendChild(dom.createTextNode(name + '\'s Friends'))
    tools.appendChild(h3)

    const me = authn.currentUser()
    const meUri = me ? me.uri : null

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
    let profile: NamedNode | null = null // This could be  SPARQL { ?me foaf:primaryTopic [ a foaf:PersonalProfileDocument ] }
    let editable = false
    let incoming: boolean | NamedNode[]
    let outgoing: boolean | NamedNode[]

    if (me) {
      // The definition of FOAF personal profile document is ..
      const works = kb.each(undefined, foaf('primaryTopic'), me) // having me as primary topic
      let message = ''
      for (let i = 0; i < works.length; i++) {
        if (
          kb.whether(
            works[i],
            ns.rdf('type'),
            foaf('PersonalProfileDocument')
          )
        ) {
          const doc = works[i]
          editable = outliner.UserInput.sparqler.editable(doc.uri, kb)
          if (!editable) {
            message +=
              'Your profile <' +
              utils.escapeForXML(doc.uri) +
              '> is not remotely editable.'
          } else {
            profile = doc
            break
          }
        }
      }

      /*
      if (!profile) {
        say(
          message + '\nI couldn\'t find your editable personal profile document.'
        )
      } else {
        say('Editing your profile ' + profile + '.')
        editable = outliner.UserInput.sparqler.editable(profile.uri, kb)
      }
        */

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
        incoming = kb.whether(s, knows, cme)
        outgoing = false
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
            new Statement(me, knows, s, profile ?? undefined),
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
                  dom.createTextNode(',  ' + utils.label(mutualFriends[i]))
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
    const friendsList = widgets.attachmentList(dom, s, mainTable, {
      doc: profile,
      modify: !!editable,
      predicate: foaf('knows'),
      noun: 'friend'
    })
    /* ,
      renderSupportingInfo?: RenderSupportingInfo,
      renderNameSuffix?: RenderNameSuffix */
    friendsList.classList.add('social-friends-list')
    const friendsListRow = friendsList.querySelector('tr')
    const friendsListPromptCell = friendsListRow?.children?.[0]
    const friendsListRightCell = friendsListRow?.children?.[1]
    const friendsHeader = dom.createElement('caption')
    friendsHeader.className = 'social-friends-header'

    const friendsHeaderTitle = dom.createElement('span')
    friendsHeaderTitle.className = 'social-friends-header-title'
    friendsHeaderTitle.textContent = 'Friends'
    friendsHeader.appendChild(friendsHeaderTitle)

    const friendsHeaderActions = dom.createElement('div')
    friendsHeaderActions.className = 'social-friends-header-actions'

    if (friendsListPromptCell instanceof HTMLElement) {
      while (friendsListPromptCell.firstChild) {
        friendsHeaderActions.appendChild(friendsListPromptCell.firstChild)
      }
      friendsListPromptCell.remove()
    }

    if (friendsHeaderActions.childNodes.length > 0) {
      friendsHeader.appendChild(friendsHeaderActions)
    }

    if (friendsListRightCell instanceof HTMLTableCellElement) {
      friendsListRightCell.colSpan = 2
    }
    friendsList.prepend(friendsHeader)

    const friendsItemsTable = friendsList.querySelector('td table')
    let friendRows: HTMLTableRowElement[] = []
    if (friendsItemsTable instanceof HTMLTableElement) {
      friendsItemsTable.style.display = 'flex'
      friendsItemsTable.style.flexWrap = 'wrap'
      friendsItemsTable.style.alignItems = 'stretch'
      friendsItemsTable.style.width = '100%'
      friendsItemsTable.style.tableLayout = 'fixed'
      friendsItemsTable.style.borderCollapse = 'separate'
      friendsItemsTable.style.borderSpacing = '0'
      friendsItemsTable.style.gap = '0.75rem'

      friendRows = Array.from(
        friendsItemsTable.querySelectorAll<HTMLTableRowElement>(':scope > tr')
      )
      friendRows.forEach(function (row) {
        if (!row.textContent?.trim()) {
          row.style.display = 'none'
          return
        }
        row.style.display = 'inline-table'
        row.style.width = 'calc(50% - 0.375rem)'
        row.style.tableLayout = 'fixed'
        row.style.boxSizing = 'border-box'
        row.style.border = '1px solid #d8d8d8'
        row.style.background = '#fff'
      })
    }

    console.groupCollapsed('[socialPane] friendsList DOM')
    console.log('friendsList element', friendsList)
    console.log('friendsList outerHTML', friendsList.outerHTML)
    console.log('friendsHeader outerHTML', friendsHeader.outerHTML)
    console.log('friendsItemsTable', friendsItemsTable)
    console.log(
      'friendRows',
      friendRows.map(function (row) {
        return {
          text: row.textContent?.trim(),
          html: row.outerHTML
        }
      })
    )
    console.groupEnd()

    // Figure out which are reciprocated:
    // @@ Does not look up profiles
    // Does distinguish reciprocated from unreciprocated friendships
    //
    function _triageFriends (subject: NamedNode) {
      const outgoingFriends: NamedNode[] = kb.each(subject, foaf('knows'))
      const incomingFriends: NamedNode[] = kb.each(undefined, foaf('knows'), subject) // @@ have to load the friends
      const confirmed: NamedNode[] = []
      const unconfirmed: NamedNode[] = []
      const requests: NamedNode[] = []

      for (let i = 0; i < outgoingFriends.length; i++) {
        const friend = outgoingFriends[i]
        let found = false
        for (let j = 0; j < incomingFriends.length; j++) {
          if (incomingFriends[j].sameTerm(friend)) {
            found = true
            break
          }
        }
        if (found) confirmed.push(friend)
        else unconfirmed.push(friend)
      } // outgoing

      for (let i = 0; i < incomingFriends.length; i++) {
        const friend = incomingFriends[i]
        let found = false
        for (let j = 0; j < outgoingFriends.length; j++) {
          if (outgoingFriends[j].sameTerm(friend)) {
            found = true
            break
          }
        }
        if (!found) requests.push(friend)
      } // incoming

      const cases = [
        ['Acquaintances', outgoingFriends],
        ['Mentioned as acquaintances by: ', requests]
      ] as Array<[string, NamedNode[]]>
      for (let i = 0; i < cases.length; i++) {
        const thisCase = cases[i]
        const friends = thisCase[1]
        if (friends.length === 0) continue // Skip empty sections (sure?)

        const h3 = dom.createElement('h3')
        h3.textContent = thisCase[0]
        const htr = dom.createElement('tr')
        htr.appendChild(h3)
        mainTable.appendChild(htr)

        const items: Array<[string, NamedNode]> = []
        for (let j9 = 0; j9 < friends.length; j9++) {
          items.push([utils.label(friends[j9]), friends[j9]])
        }
        items.sort()
        let last: NamedNode | null = null
        let friendNode: NamedNode
        for (let j7 = 0; j7 < items.length; j7++) {
          friendNode = items[j7][1]
          if (last && friendNode.sameTerm(last)) continue // unique
          last = friendNode
          if (utils.label(friendNode) !== '...') {
            // This check is to avoid bnodes with no labels attached
            // appearing in the friends list with "..." - Oshani
            mainTable.appendChild(oneFriend(friendNode, false))
          }
        }
      }
    }

    // Retained intentionally for later use without affecting the current render path.
    void _triageFriends

    /* if ($rdf.keepThisCodeForLaterButDisableFerossConstantConditionPolice) {
      triageFriends(s)
    } */
    // //////////////////////////////////// Basic info on left

    /*
    h3 = dom.createElement('h3')
    h3.appendChild(dom.createTextNode('Basic Information'))
    tools.appendChild(h3)
    */
    // For each home page like thing make a label which will
    // make sense and add the domain (like "w3.org blog") if there are more than one of the same type
    //
    const preds: NamedNode[] = [
      ns.foaf('homepage'),
      ns.foaf('weblog'),
      ns.foaf('workplaceHomepage'),
      ns.foaf('schoolHomepage')
    ]
    for (let i6 = 0; i6 < preds.length; i6++) {
      const pred = preds[i6]
      const sts = kb.statementsMatching(s, pred)
      if (sts.length === 0) {
        // if (editable) say("No home page set. Use the blue + icon at the bottom of the main view to add information.")
      } else {
        const uris: string[] = []
        for (let j5 = 0; j5 < sts.length; j5++) {
          const st = sts[j5]
          if (st.object.uri) uris.push(st.object.uri) // Ignore if not symbol
        }
        uris.sort()
        let last2 = ''
        let lab2
        for (let k = 0; k < uris.length; k++) {
          const uri = uris[k]
          if (uri === last2) continue // uniques only
          last2 = uri
          let hostlabel = ''
          lab2 = utils.label(pred)
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

    const preds2: NamedNode[] = [ns.foaf('openid'), ns.foaf('nick')]
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
