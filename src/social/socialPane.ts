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
import { icons, utils, ns, log, widgets } from 'solid-ui'
import { authn } from 'solid-logic'
import { LiveStore, NamedNode, Statement } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { appendProfileLinks, createEditProfileDetailsButton } from './editProfileDetails'


export const socialPane = {
  icon: icons.originalIconBase + 'foaf/foafTiny.gif',

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
    const socialPane = dom.createElement('div')
    socialPane.classList.add('social-pane', 'flex-column', 'gap-lg', 'p-lg')
    const foaf = ns.foaf
    const vcard = ns.vcard
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

    const structure = socialPane.appendChild(dom.createElement('div'))
    structure.className = 'social-layout'
    const primary = structure.appendChild(dom.createElement('div'))
    primary.className = 'social-primary'
    const left = primary.appendChild(dom.createElement('section'))
    left.className = 'social-pane__header-section'
    const middle = primary.appendChild(dom.createElement('div'))
    middle.className = 'social-content'

    const tools = left
    const mainTable = middle.appendChild(dom.createElement('table'))
    mainTable.className = 'social-main'

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

        const h3 = dom.createElement('h3')
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

    const header = createHeader(context, s, Boolean(thisIsYou && editable))
    header.classList.add('social-pane__header-section')
    socialPane.prepend(header)

    // div.appendChild(dom.createTextNode(plural(friends.length, 'acquaintance') +'. '))

    // /////////////////////////////////////////////  Main block
    //
    // Should: Find the intersection and difference sets

    const friendDetailsByUri = new Map<string, FriendDetails>()

    const hydrateFriendDetailsCache = function (friendNodes: NamedNode[]) {
      const nextCache = new Map<string, FriendDetails>()

      friendNodes.forEach(friendNode => {
        if (!friendNode?.value || friendNode.value === s.value) return
        nextCache.set(friendNode.value, toFriendDetails(kb, friendNode))
      })

      friendDetailsByUri.clear()
      nextCache.forEach((value, key) => {
        friendDetailsByUri.set(key, value)
      })
    }

    hydrateFriendDetailsCache(friends as NamedNode[])

    const renderSupportingInfo = function (target: NamedNode, renderDom: HTMLDocument) {
      const friend = friendDetailsByUri.get(target.value)
      if (!friend) return null

      const lines = [
        [friend.jobTitle, friend.organization].filter(Boolean).join(' | '),
        friend.location || ''
      ].filter(Boolean)

      if (lines.length === 0) return null

      const container = renderDom.createElement('div')
      for (let index = 0; index < lines.length; index++) {
        const line = container.appendChild(renderDom.createElement('div'))
        line.textContent = lines[index]
      }
      return container
    }

    const renderNameSuffix = function (target: NamedNode, _renderDom: HTMLDocument) {
      return friendDetailsByUri.get(target.value)?.pronouns || null
    }

    // List all x such that s knows x.
    const friendsList = widgets.attachmentList(dom, s, mainTable, {
      doc: profile,
      modify: !!editable,
      predicate: foaf('knows'),
      noun: 'friend',
      renderSupportingInfo,
      renderNameSuffix
    })
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
    if (friendsItemsTable instanceof HTMLTableElement) {
      friendsItemsTable.classList.add('social-friends-grid')
    }

    const refreshFriendsList = function () {
      const refresh = (friendsList as HTMLTableElement & { refresh?: () => void }).refresh
      if (typeof refresh !== 'function') return

      refresh.call(friendsList)
    }

    void (async () => {
      try {
        for await (const streamedFriends of streamFriends(context, s)) {
          friendDetailsByUri.clear()
          streamedFriends.forEach(friend => {
            friendDetailsByUri.set(friend.url, friend)
          })
          refreshFriendsList()
        }
      } catch {
        // Keep the initial snapshot if async friend loading fails.
      }
    })()

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

    return socialPane
  } // render()
} //
// ends
// ***************** Social Pane Selectors **********/
/* Should move to another file, but will leave for now */
/* Will create a social pane folder or maybe repo later */

const FRIEND_BATCH_SIZE = 3

export interface ProfileDetails {
  url: string
  imageUrl?: string
  name?: string
  nickname?: string
  jobTitle?: string
  organization?: string
  location?: string | null
  pronouns?: string
  birthdate?: string
}

export interface FriendDetails extends ProfileDetails {
  subjectNode: NamedNode
}


/* pronounsAsText and formatLocation were copied from HeadingSection selectors */
export function pronounsAsText (store: LiveStore, subject: NamedNode): string {
  let pronouns = store.anyJS(subject, ns.solid('preferredSubjectPronoun')) || ''
  if (pronouns) {
    const them = store.anyJS(subject, ns.solid('preferredObjectPronoun'))
    if (them) {
      pronouns += '/' + them
    }
  }
  return pronouns || ''
}

function formatLocation(countryName: string | void, locality: string | void) {
  return countryName && locality
    ? `${locality}, ${countryName}`
    : countryName || locality || null
}

function toFriendDetails(store: any, friendNode: NamedNode): FriendDetails {
  const name =
    store.anyValue(friendNode, ns.vcard('fn')) ||
    store.anyValue(friendNode, ns.foaf('name')) ||
    null
  const nickname =
    store.anyValue(friendNode, ns.vcard('nickname')) ||
    store.anyValue(friendNode, ns.foaf('nick')) ||
    null
  const dateOfBirth = store.anyValue(friendNode, ns.vcard('bday')) || null
  const imageSrc = widgets.findImage(friendNode)
  const jobTitle = store.anyValue(friendNode, ns.vcard('role')) || null
  const orgName = store.anyValue(friendNode, ns.vcard('organization-name')) || null
  const primaryAddressEntryNode = store.any(friendNode, ns.vcard('hasAddress')) as NamedNode | null
  const address: NamedNode | null = primaryAddressEntryNode || null
  const countryName =
      address != null
        ? store.anyValue(address, ns.vcard('country-name'))
        : null
  const locality =
    address != null
      ? store.anyValue(address, ns.vcard('locality'))
      : null

  const location = formatLocation(countryName, locality)
  const pronouns = pronounsAsText(store, friendNode)
    
  return {
    url: friendNode.value,
    imageUrl: imageSrc,
    name,
    nickname,
    jobTitle,
    organization: orgName,
    birthdate: dateOfBirth,
    location,
    pronouns,
    subjectNode: friendNode
  }
}

export async function * streamFriends(
  context: DataBrowserContext,
  subject: NamedNode,
  batchSize = FRIEND_BATCH_SIZE
): AsyncGenerator<FriendDetails[], void, void> {
  const store = context.session.store
  const fetcher = (store as any)?.fetcher

  if (fetcher && typeof fetcher.load === 'function') {
    try {
      await fetcher.load(subject.doc())
    } catch {
      // Continue with whatever is already in the store.
    }
  }

  const seen = new Set<string>()
  const friendNodes = store.each(subject, ns.foaf('knows'), null, subject.doc())
  const uniqueFriendNodes: NamedNode[] = []

  for (const friendNode of friendNodes) {
    const key = friendNode?.value
    if (!key || seen.has(key) || subject.value === key) continue
    seen.add(key)
    uniqueFriendNodes.push(friendNode as NamedNode)
  }

  const friends: FriendDetails[] = []

  for (const friendNode of uniqueFriendNodes) {
    if (fetcher && typeof fetcher.load === 'function') {
      try {
        await fetcher.load(friendNode.doc())
      } catch {
        // Keep partial friend data when one linked document fails to load.
      }
    }

    friends.push(toFriendDetails(store, friendNode))

    if (friends.length % batchSize === 0) {
      yield [...friends]
    }
  }

  if (friends.length > 0 && friends.length % batchSize !== 0) {
    yield [...friends]
  }
}

export async function extractFriends(context: DataBrowserContext, subject: NamedNode): Promise<FriendDetails[] | null> {
  let latestFriends: FriendDetails[] | null = null

  for await (const friends of streamFriends(context, subject)) {
    latestFriends = friends
  }

  return latestFriends
}

export function selectProfileData(context: DataBrowserContext, subject: NamedNode): ProfileDetails | null {
  const store = context.session.store

  const name =
      store.anyValue(subject, ns.vcard('fn')) ||
      store.anyValue(subject, ns.foaf('name')) ||
      undefined
    const nickname =
      store.anyValue(subject, ns.vcard('nickname')) ||
      store.anyValue(subject, ns.foaf('nick')) ||
      undefined
    const dateOfBirth = store.anyValue(subject, ns.vcard('bday')) || undefined
    const imageSrc = widgets.findImage(subject)
    const jobTitle = store.anyValue(subject, ns.vcard('role')) || undefined
    const orgName = store.anyValue(subject, ns.vcard('organization-name')) || undefined
    const primaryAddressEntryNode = store.any(subject, ns.vcard('hasAddress')) as NamedNode | null
    const address: NamedNode | null = primaryAddressEntryNode || null
    const countryName =
        address != null
          ? store.anyValue(address, ns.vcard('country-name'))
          : undefined
    const locality =
      address != null
        ? store.anyValue(address, ns.vcard('locality'))
        : undefined

    const location = formatLocation(countryName, locality)
    const pronouns = pronounsAsText(store, subject)
    return {
      url: subject.value,
      imageUrl: imageSrc,
      name,
      nickname,
      jobTitle,
      organization: orgName,
      birthdate: dateOfBirth,
      location,
      pronouns
    }
}

export function personInCircleIcon (): SVGSVGElement {
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNamespace, 'svg')
  svg.setAttribute('xmlns', svgNamespace)
  svg.setAttribute('width', '64')
  svg.setAttribute('height', '64')
  svg.setAttribute('viewBox', '0 0 64 64')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')

  const paths = [
    'M32.0007 58.6666C46.7282 58.6666 58.6673 46.7275 58.6673 31.9999C58.6673 17.2723 46.7282 5.33325 32.0007 5.33325C17.2731 5.33325 5.33398 17.2723 5.33398 31.9999C5.33398 46.7275 17.2731 58.6666 32.0007 58.6666Z',
    'M32 34.6667C36.4183 34.6667 40 31.085 40 26.6667C40 22.2485 36.4183 18.6667 32 18.6667C27.5817 18.6667 24 22.2485 24 26.6667C24 31.085 27.5817 34.6667 32 34.6667Z',
    'M18.666 55.0986V50.6666C18.666 49.2521 19.2279 47.8955 20.2281 46.8954C21.2283 45.8952 22.5849 45.3333 23.9993 45.3333H39.9993C41.4138 45.3333 42.7704 45.8952 43.7706 46.8954C44.7708 47.8955 45.3327 49.2521 45.3327 50.6666V55.0986'
  ]

  paths.forEach(function (d) {
    const path = document.createElementNS(svgNamespace, 'path')
    path.setAttribute('d', d)
    path.setAttribute('stroke', '#CBD5E1')
    path.setAttribute('stroke-width', '5.33333')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
  })

  return svg
}

function createImage (src: string | null | undefined, alt = ''): HTMLElement {
  if (src) {
    const img = document.createElement('img')
    img.className = 'social-pane__header-hero'
    img.src = src
    img.alt = alt
    img.width = 180
    img.height = 180
    img.loading = 'eager'
    return img
  }

  const fallback = document.createElement('div')
  fallback.className = 'social-pane__header-hero-alt flex-center'
  fallback.setAttribute('role', 'img')
  fallback.setAttribute('aria-label', alt)
  fallback.tabIndex = 0

  const icon = document.createElement('span')
  icon.className = 'social-pane__header-hero-icon'
  icon.appendChild(personInCircleIcon())
  fallback.appendChild(icon)

  return fallback
}

function createHeader(context: any, s: any, canEdit = false): HTMLElement {
  const dom = context.dom
  const kb = context.session.store
  const header = document.createElement('header')
  header.className = 'social-pane__header'
  const renderHeader = function () {
    header.replaceChildren()

    if (canEdit) {
      header.appendChild(createEditProfileDetailsButton({
        dom,
        store: kb,
        subject: s,
        header,
        onSaved: renderHeader
      }))
    }

    const profileData = selectProfileData(context, s)
    if (profileData) {
      header.appendChild(createImage(profileData.imageUrl, profileData.name))
    }

    const name = profileData?.name || '???'
    const h1 = dom.createElement('h1')
    h1.classList.add('social-pane__header-name')
    h1.appendChild(dom.createTextNode(name))
    header.appendChild(h1)

    appendProfileLinks(header, dom, kb, s)
  }

  renderHeader()

  return header
}
