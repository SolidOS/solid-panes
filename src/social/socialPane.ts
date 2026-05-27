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
import { locationIcon } from './icons'
import {
  createAllFriendsSection,
  createHeaderSection,
  FriendRowRenderers,
  createMutualSection,
  createRequestsSection,
  HeaderControls,
  SocialHeaderElement
} from './socialSections'
import type { ViewerMode } from './socialSections'
import { FriendshipTriage, loadFriendshipTriage, triageFriends } from './triage'

function applyEnvironmentAttributes (
  element: HTMLElement,
  context: DataBrowserContext
): void {
  const layout = context.environment?.layout ?? 'desktop'
  const theme = context.environment?.theme ?? 'light'
  const inputMode = context.environment?.inputMode ?? 'pointer'

  element.classList.add('social-pane-host')
  element.dataset.layout = layout
  element.dataset.theme = theme
  element.dataset.inputMode = inputMode
}

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
  global: false,

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

    const uniqueNodes = function (nodes: NamedNode[]) {
      const seen = new Set<string>()
      const unique: NamedNode[] = []
      for (const node of nodes) {
        if (!node?.value || seen.has(node.value)) continue
        seen.add(node.value)
        unique.push(node)
      }
      return unique
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

    let refreshRelationshipUi = function () {}

    const buildCheckboxForm = function (
      lab: string | Node,
      statement: Statement,
      state: boolean,
      options: { disabled?: boolean, disabledTitle?: string } = {}
    ) {
      const f = dom.createElement('form')
      const label = dom.createElement('label')
      const input = dom.createElement('input')
      const tx = dom.createElement('span')
      tx.className = 'question'
      if (typeof lab === 'string') {
        tx.textContent = lab
      } else {
        tx.appendChild(lab)
      }
      input.setAttribute('type', 'checkbox')
      if (options.disabled) {
        input.disabled = true
        if (options.disabledTitle) {
          input.title = options.disabledTitle
          input.setAttribute('aria-label', options.disabledTitle)
        }
      }
      label.appendChild(tx)
      label.appendChild(input)
      f.appendChild(label)
      const boxHandler = function (this: HTMLInputElement, _e: Event) {
        if (this.checked) {
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
              refreshRelationshipUi()
            })
          } catch (e) {
            log.error('Data write fails:' + e)
            log.alert('Data write fails:' + e)
            input.checked = false // rollback UI
            tx.className = 'question'
          }
        } else {
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
                refreshRelationshipUi()
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

    // ////////// Body of render():

    const outliner = context.getOutliner(dom)
    const kb = context.session.store
    const socialPane = dom.createElement('div')
    socialPane.classList.add('social-pane', 'flex-column', 'gap-xxs')
    applyEnvironmentAttributes(socialPane, context)
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
    const uniqueFriends = uniqueNodes(friends as NamedNode[])
    const myFriends = me ? uniqueNodes(kb.each(me, foaf('knows')) as NamedNode[]) : []
    const mutualConnections = me && !thisIsYou
      ? uniqueNodes(common(uniqueFriends, myFriends)).filter(friend => !kb.sameThings(friend, me))
      : []
    const mutualFriendCount = me && !thisIsYou ? mutualConnections.length : null
    const viewerMode = getViewerMode(s, me)

    // Do I have a public profile document?
    let profile: NamedNode | null = null // This could be  SPARQL { ?me foaf:primaryTopic [ a foaf:PersonalProfileDocument ] }
    let editable = false
    let incoming: boolean | NamedNode[] = false
    let outgoing: boolean | NamedNode[] = false

    const structure = socialPane.appendChild(dom.createElement('div'))
    structure.className = 'social-layout'
    const primary = structure.appendChild(dom.createElement('div'))
    primary.className = 'social-primary'

    const tabs = primary.appendChild(dom.createElement('div'))
    tabs.classList.add('social-primary__tabs', 'flex-center')
    tabs.setAttribute('role', 'tablist')
    tabs.setAttribute('aria-label', 'Social sections')

    const allFriendsTab = tabs.appendChild(dom.createElement('button'))
    allFriendsTab.className = 'social-primary__tab'
    allFriendsTab.type = 'button'
    allFriendsTab.id = 'social-tab-all-friends'
    allFriendsTab.textContent = 'All Friends'
    allFriendsTab.setAttribute('role', 'tab')
    allFriendsTab.setAttribute('aria-controls', 'social-panel-all-friends')
    allFriendsTab.setAttribute('aria-selected', 'true')
    allFriendsTab.tabIndex = 0

    const mutualTab = tabs.appendChild(dom.createElement('button'))
    mutualTab.className = 'social-primary__tab'
    mutualTab.type = 'button'
    mutualTab.id = 'social-tab-mutual'
    mutualTab.textContent = 'Mutual'
    mutualTab.setAttribute('role', 'tab')
    mutualTab.setAttribute('aria-controls', 'social-panel-mutual')
    mutualTab.setAttribute('aria-selected', 'false')
    mutualTab.tabIndex = -1

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

        const cme = kb.canon(me)
        incoming = kb.whether(s, knows, cme)
        outgoing = false
        const outgoingSt = kb.statementsMatching(cme, knows, s)
        if (outgoingSt.length) {
          outgoing = true
          if (!profile) profile = outgoingSt[0].why
        }
      } // About someone else
    } // me is defined
    // End of you and s

    const shouldShowHeaderAddFriendAction = (mode: ViewerMode) => {
      return mode === 'authenticated' && !thisIsYou && !outgoing
    }

    const canEditOwnedProfile = viewerMode === 'owner' && editable
    const canManageRelationship = viewerMode === 'authenticated' && !thisIsYou && editable && Boolean(profile)
    const canModifyFriendsTab = canEditOwnedProfile

    let headerControls: HeaderControls = {
      canEdit: canEditOwnedProfile,
      viewerMode,
      showAddFriendAction: shouldShowHeaderAddFriendAction(viewerMode)
    }

    const header = createHeaderSection(context, s, headerControls, {
      friendCount: uniqueFriends.length,
      mutualFriendCount,
      onSelectFriends: function () {
        setActivePanel('all-friends')
      },
      onSelectMutual: typeof mutualFriendCount === 'number'
        ? function () {
          setActivePanel('mutual')
        }
        : undefined
    }, function () {
      return selectProfileData(context, s)
    })
    header.classList.add('social-pane__header-section', 'flex-column')
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

    hydrateFriendDetailsCache(uniqueFriends)

    const renderSupportingInfo: FriendRowRenderers['renderSupportingInfo'] = function (target: NamedNode, renderDom: HTMLDocument) {
      const friend = friendDetailsByUri.get(target.value) || toFriendDetails(kb, target)
      friendDetailsByUri.set(target.value, friend)

      const container = renderDom.createElement('div')
      const jobAndOrganization = [friend.jobTitle, friend.organization].filter(Boolean).join(' | ')
      if (jobAndOrganization) {
        const jobLine = container.appendChild(renderDom.createElement('div'))
        jobLine.className = 'social-friend-job-org'
        jobLine.textContent = jobAndOrganization
      }

      if (friend.location) {
        const locationLine = container.appendChild(renderDom.createElement('div'))
        locationLine.className = 'social-friend-location'
        locationLine.innerHTML = `${locationIcon} ${friend.location}`
      }

      if (!container.childNodes.length) return null

      return container
    }

    const renderNameSuffix: FriendRowRenderers['renderNameSuffix'] = function (target: NamedNode, renderDom: HTMLDocument) {
      const friend = friendDetailsByUri.get(target.value) || toFriendDetails(kb, target)
      friendDetailsByUri.set(target.value, friend)
      const pronouns = friend.pronouns
      if (!pronouns) return null

      const suffix = renderDom.createElement('span')
      suffix.className = 'social-friend-pronouns'
      suffix.textContent = `(${pronouns})`
      return suffix
    }

    let mutualSection = me && !thisIsYou
      ? createMutualSection({
        dom,
        subject: s,
        familiar,
        me,
        meUri,
        incoming,
        outgoing,
        editable: canManageRelationship,
        profile,
        knows,
        mutualConnections,
        link,
        text,
        buildCheckboxForm,
        renderSupportingInfo,
        renderNameSuffix
      })
      : {
          section: dom.createElement('section'),
          content: dom.createElement('div'),
          refreshMutualFriends: function () {}
        }

    let mutualFriends = mutualSection.section
    let mutualContent = mutualSection.content
    if (!mutualFriends.className) {
      mutualFriends.className = 'social-pane__mutual-friends social-primary__panel'
      mutualFriends.id = 'social-panel-mutual'
      mutualFriends.setAttribute('role', 'tabpanel')
      mutualFriends.setAttribute('aria-labelledby', 'social-tab-mutual')
      mutualContent.className = 'social-main social-main--mutual'
      mutualFriends.appendChild(mutualContent)
    }
    primary.appendChild(mutualFriends)

    const allFriendsSection = createAllFriendsSection({
      dom,
      subject: s,
      profile: canModifyFriendsTab ? profile : null,
      editable: canModifyFriendsTab,
      renderSupportingInfo,
      renderNameSuffix
    })

    const allFriends = allFriendsSection.section
    const friendsList = allFriendsSection.friendsList
    primary.appendChild(allFriends)

    let requestsTriage: FriendshipTriage = triageFriends(kb, s)
    const requestsSection = createRequestsSection({
      dom,
      triage: requestsTriage,
      renderSupportingInfo,
      renderNameSuffix
    })
    const requestsPanel = requestsSection.section
    primary.appendChild(requestsPanel)

    const requestsTab = tabs.appendChild(dom.createElement('button'))
    requestsTab.className = 'social-primary__tab'
    requestsTab.type = 'button'
    requestsTab.id = 'social-tab-requests'
    requestsTab.textContent = 'Requests'
    requestsTab.setAttribute('role', 'tab')
    requestsTab.setAttribute('aria-controls', 'social-panel-requests')
    requestsTab.setAttribute('aria-selected', 'false')
    requestsTab.tabIndex = -1

    type SocialPanel = 'mutual' | 'all-friends' | 'requests'
    let activePanel: SocialPanel = 'all-friends'
    let showRequestsTab = viewerMode === 'owner'

    const setActivePanel = function (panel: SocialPanel) {
      activePanel = panel
      const showMutual = panel === 'mutual'
      const showAllFriends = panel === 'all-friends'
      const showRequests = showRequestsTab && panel === 'requests'
      mutualTab.classList.toggle('social-primary__tab--active', showMutual)
      mutualTab.setAttribute('aria-selected', String(showMutual))
      mutualTab.tabIndex = showMutual ? 0 : -1

      allFriendsTab.classList.toggle('social-primary__tab--active', showAllFriends)
      allFriendsTab.setAttribute('aria-selected', String(showAllFriends))
      allFriendsTab.tabIndex = showAllFriends ? 0 : -1

      requestsTab.classList.toggle('social-primary__tab--active', showRequests)
      requestsTab.setAttribute('aria-selected', String(showRequests))
      requestsTab.tabIndex = showRequests ? 0 : -1

      mutualFriends.classList.toggle('social-primary__panel--active', showMutual)
      mutualFriends.setAttribute('aria-hidden', String(!showMutual))

      allFriends.classList.toggle('social-primary__panel--active', showAllFriends)
      allFriends.setAttribute('aria-hidden', String(!showAllFriends))

      requestsPanel.classList.toggle('social-primary__panel--active', showRequests)
      requestsPanel.setAttribute('aria-hidden', String(!showRequests))
      requestsPanel.hidden = !showRequestsTab || !showRequests
    }
    const rebuildMutualSection = function () {
      if (!me || thisIsYou) return

      const cme = kb.canon(me)
      incoming = kb.whether(s, knows, cme)

      const outgoingStatements = kb.statementsMatching(cme, knows, s)
      outgoing = outgoingStatements.length > 0

      const nextMutualSection = createMutualSection({
        dom,
        subject: s,
        familiar,
        me,
        meUri,
        incoming,
        outgoing,
        editable: canManageRelationship,
        profile,
        knows,
        mutualConnections,
        link,
        text,
        buildCheckboxForm,
        renderSupportingInfo,
        renderNameSuffix
      })

      mutualFriends.replaceWith(nextMutualSection.section)
      mutualSection = nextMutualSection
      mutualFriends = nextMutualSection.section
      mutualContent = nextMutualSection.content
    }

    refreshRelationshipUi = function () {
      rebuildMutualSection()
      headerControls = {
        ...headerControls,
        showAddFriendAction: shouldShowHeaderAddFriendAction(headerControls.viewerMode)
      }
      ;(header as SocialHeaderElement).refreshSocialHeader?.(headerControls)
      requestsTriage = triageFriends(kb, s)
      requestsSection.refreshRequests(requestsTriage)
      setActivePanel(activePanel)
    }

    setActivePanel('all-friends')

    const applyViewerMode = function (mode: ViewerMode) {
      const showMutualTab = mode === 'authenticated' && !thisIsYou
      showRequestsTab = mode === 'owner'
      mutualTab.hidden = !showMutualTab
      requestsTab.hidden = !showRequestsTab
      if (!showRequestsTab && activePanel === 'requests') {
        setActivePanel('all-friends')
        return
      }
      setActivePanel('all-friends')
    }

    mutualTab.addEventListener('click', function () {
      setActivePanel('mutual')
    })

    allFriendsTab.addEventListener('click', function () {
      setActivePanel('all-friends')
    })

    requestsTab.addEventListener('click', function () {
      setActivePanel('requests')
    })

    const refreshFriendsList = function () {
      const refresh = (friendsList as HTMLTableElement & { refresh?: () => void }).refresh
      if (typeof refresh !== 'function') return

      refresh.call(friendsList)
    }

    const refreshMutualFriends = function () {
      mutualSection.refreshMutualFriends()
    }

    ;(async () => {
      try {
        for await (const streamedFriends of streamFriends(context, s)) {
          friendDetailsByUri.clear()
          streamedFriends.forEach(friend => {
            friendDetailsByUri.set(friend.url, friend)
          })
          refreshFriendsList()
          refreshMutualFriends()
        }
      } catch {
        // Keep the initial snapshot if async friend loading fails.
      }
    })()

    ;(async () => {
      try {
        requestsTriage = await loadFriendshipTriage(context, s)
        requestsSection.refreshRequests(requestsTriage)
        refreshFriendsList()
        refreshMutualFriends()
      } catch {
        // Keep the initial requests snapshot if additional loading fails.
      }
    })()

    // Older triage logic is preserved below as a reusable data helper.

    applyViewerMode('anonymous')

    authn.checkUser()
      .then(webId => {
        const confirmedViewerMode = getViewerMode(s, webId)
        applyViewerMode(confirmedViewerMode)
        const confirmedCanEditOwnedProfile = confirmedViewerMode === 'owner' && editable
        headerControls = {
          ...headerControls,
          canEdit: confirmedCanEditOwnedProfile,
          viewerMode: confirmedViewerMode,
          showAddFriendAction: shouldShowHeaderAddFriendAction(confirmedViewerMode)
        }
        ;(header as SocialHeaderElement).refreshSocialHeader?.(headerControls)
      })
      .catch(() => {
        applyViewerMode('anonymous')
        headerControls = {
          ...headerControls,
          canEdit: false,
          viewerMode: 'anonymous',
          showAddFriendAction: false
        }
        ;(header as SocialHeaderElement).refreshSocialHeader?.(headerControls)
      })

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

function formatLocation (countryName: string | void, locality: string | void) {
  return countryName && locality
    ? `${locality}, ${countryName}`
    : countryName || locality || null
}

function toFriendDetails (store: any, friendNode: NamedNode): FriendDetails {
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

export async function * streamFriends (
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

export async function extractFriends (context: DataBrowserContext, subject: NamedNode): Promise<FriendDetails[] | null> {
  let latestFriends: FriendDetails[] | null = null

  for await (const friends of streamFriends(context, subject)) {
    latestFriends = friends
  }

  return latestFriends
}

export function selectProfileData (context: DataBrowserContext, subject: NamedNode): ProfileDetails | null {
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

export type { ViewerMode } from './socialSections'

function getViewerMode (subject: NamedNode, currentUser: unknown = authn.currentUser()): ViewerMode {
  const currentUserUri =
    typeof currentUser === 'string'
      ? currentUser
      : typeof currentUser === 'object' && currentUser !== null
        ? ((currentUser as { value?: string, uri?: string }).value ||
            (currentUser as { value?: string, uri?: string }).uri ||
            null)
        : null
  let mode: ViewerMode = 'anonymous'
  if (currentUserUri === subject.value) mode = 'owner'
  if (currentUserUri && currentUserUri !== subject.value) mode = 'authenticated'
  return mode
}
