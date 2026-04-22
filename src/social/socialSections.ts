import { createAddMeToYourFriendsButton } from 'profile-pane'
import { DataBrowserContext } from 'pane-registry'
import { Statement, NamedNode } from 'rdflib'
import { ns, utils, widgets } from 'solid-ui'
import { appendProfileLinks, createEditProfileDetailsButton } from './editProfileDetails'
import { locationIcon, personInCircleIcon as personInCircleIconSvg } from './icons'

export type ViewerMode = 'owner' | 'authenticated' | 'anonymous'

export type HeaderControls = {
  canEdit: boolean,
  viewerMode: ViewerMode
}

export type SocialHeaderElement = HTMLElement & {
  refreshSocialHeader?: (controls: HeaderControls) => void
}

export type HeaderStats = {
  friendCount: number,
  mutualFriendCount: number | null,
  onSelectFriends?: () => void,
  onSelectMutual?: () => void
}

export type HeaderProfileData = {
  imageUrl?: string,
  name?: string,
  jobTitle?: string,
  organization?: string,
  location?: string | null
} | null

export type FriendRowRenderers = {
  renderSupportingInfo: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null,
  renderNameSuffix: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null
}

export function createHeaderSection (
  context: DataBrowserContext,
  subject: NamedNode,
  controls: HeaderControls,
  stats: HeaderStats,
  getProfileData: () => HeaderProfileData
): SocialHeaderElement {
  const dom = context.dom
  const kb = context.session.store
  const header = document.createElement('header') as SocialHeaderElement
  header.className = 'social-pane__header'
  let headerControls = controls

  const renderHeader = function () {
    header.replaceChildren()
    const profileData = getProfileData()

    if (headerControls.canEdit) {
      header.appendChild(createEditProfileDetailsButton({
        dom,
        store: kb,
        subject,
        header,
        onSaved: renderHeader
      }))
    } else if (headerControls.viewerMode === 'authenticated') {
      const addToFriendsButton = createAddMeToYourFriendsButton(subject, context)
      addToFriendsButton.classList.add('social-pane__friend-action', 'profile__action-button', 'profile__btn-friends', 'flex-center')
      header.appendChild(addToFriendsButton)
    }

    const headerContent = dom.createElement('div')
    headerContent.className = 'social-pane__header-content'
    header.appendChild(headerContent)

    const headerMedia = dom.createElement('div')
    headerMedia.className = 'social-pane__header-media'
    headerContent.appendChild(headerMedia)

    if (profileData) {
      headerMedia.appendChild(createImage(profileData.imageUrl, profileData.name))
    }

    const headerDetails = dom.createElement('div')
    headerDetails.className = 'social-pane__header-details'
    headerContent.appendChild(headerDetails)

    const headerSummary = dom.createElement('div')
    headerSummary.className = 'social-pane__header-summary'
    headerDetails.appendChild(headerSummary)

    const name = profileData?.name || '???'
    const h1 = dom.createElement('h1')
    h1.classList.add('social-pane__header-name')
    h1.appendChild(dom.createTextNode(name))
    headerSummary.appendChild(h1)

    const jobAndOrganization = [profileData?.jobTitle, profileData?.organization].filter(Boolean).join(' | ')
    if (jobAndOrganization) {
      const jobLine = dom.createElement('div')
      jobLine.className = 'social-pane__header-job-org'
      jobLine.textContent = jobAndOrganization
      headerSummary.appendChild(jobLine)
    }

    if (profileData?.location) {
      const locationLine = dom.createElement('div')
      locationLine.className = 'social-pane__header-location'

      const locationIconSpan = dom.createElement('span')
      locationIconSpan.className = 'social-pane__header-location-icon'
      locationIconSpan.innerHTML = locationIcon
      locationLine.appendChild(locationIconSpan)
      locationLine.appendChild(dom.createTextNode(profileData.location))

      headerSummary.appendChild(locationLine)
    }

    const statsRow = dom.createElement('div')
    statsRow.className = 'social-pane__header-stats'

    const friendCount = dom.createElement('button')
    friendCount.className = 'social-pane__header-stat'
    friendCount.type = 'button'
    const friendCountLabel = dom.createElement('span')
    friendCountLabel.className = 'social-pane__header-stat-label'
    friendCountLabel.textContent = `${stats.friendCount} friend${stats.friendCount === 1 ? '' : 's'}`
    friendCount.appendChild(friendCountLabel)
    if (stats.onSelectFriends) {
      friendCount.addEventListener('click', stats.onSelectFriends)
    }
    statsRow.appendChild(friendCount)

    if (typeof stats.mutualFriendCount === 'number') {
      const mutualCount = dom.createElement('button')
      mutualCount.className = 'social-pane__header-stat'
      mutualCount.type = 'button'
      const mutualCountLabel = dom.createElement('span')
      mutualCountLabel.className = 'social-pane__header-stat-label'
      mutualCountLabel.textContent = `${stats.mutualFriendCount} mutual friend${stats.mutualFriendCount === 1 ? '' : 's'}`
      mutualCount.appendChild(mutualCountLabel)
      if (stats.onSelectMutual) {
        mutualCount.addEventListener('click', stats.onSelectMutual)
      }
      statsRow.appendChild(mutualCount)
    }

    headerSummary.appendChild(statsRow)
    appendProfileLinks(headerMedia, dom, kb, subject)
  }

  header.refreshSocialHeader = function (nextControls: HeaderControls) {
    headerControls = nextControls
    renderHeader()
  }

  renderHeader()

  return header
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
  icon.innerHTML = personInCircleIconSvg
  fallback.appendChild(icon)

  return fallback
}

export function createMutualSection (options: {
  dom: HTMLDocument,
  subject: NamedNode,
  familiar: string,
  me: NamedNode,
  meUri: string | null,
  incoming: boolean | NamedNode[] | undefined,
  outgoing: boolean | NamedNode[] | undefined,
  editable: boolean,
  profile: NamedNode | null,
  knows: NamedNode,
  mutualConnections: NamedNode[],
  link: (contents: Node, uri: string | null | undefined) => Node,
  text: (value: string) => Text,
  people: (count: number) => string,
  buildCheckboxForm: (
    label: string | Node,
    statement: Statement,
    state: boolean,
    options?: { disabled?: boolean, disabledTitle?: string }
  ) => HTMLElement,
  renderSupportingInfo: FriendRowRenderers['renderSupportingInfo'],
  renderNameSuffix: FriendRowRenderers['renderNameSuffix']
}): { section: HTMLElement, content: HTMLElement, refreshMutualFriends: () => void } {
  const {
    dom,
    subject,
    familiar,
    me,
    meUri,
    incoming,
    outgoing,
    editable,
    profile,
    knows,
    mutualConnections,
    link,
    text,
    people,
    buildCheckboxForm,
    renderSupportingInfo,
    renderNameSuffix
  } = options

  let refreshMutualFriends = function () {}

  const mutualSection = dom.createElement('section')
  mutualSection.className = 'social-pane__mutual-friends social-primary__panel'
  mutualSection.id = 'social-panel-mutual'
  mutualSection.setAttribute('role', 'tabpanel')
  mutualSection.setAttribute('aria-labelledby', 'social-tab-mutual')

  const mutualContent = mutualSection.appendChild(dom.createElement('div'))
  mutualContent.className = 'social-main social-main--mutual'

  const relationshipSummary = dom.createElement('div')
  relationshipSummary.className = 'social-mutual-summary'
  mutualContent.appendChild(relationshipSummary)

  const youAndThem = function () {
    relationshipSummary.appendChild(link(text('You'), meUri))
    relationshipSummary.appendChild(text(' and '))
    relationshipSummary.appendChild(link(text(familiar), subject.uri))
  }

  if (!incoming) {
    if (!outgoing) {
      youAndThem()
      relationshipSummary.appendChild(text(' have not said you know each other.'))
    } else {
      relationshipSummary.appendChild(link(text('You'), meUri))
      relationshipSummary.appendChild(text(' know '))
      relationshipSummary.appendChild(link(text(familiar), subject.uri))
      relationshipSummary.appendChild(text(' (unconfirmed)'))
    }
  } else if (!outgoing) {
    relationshipSummary.classList.add('social-mutual-summary--confirm')

    const incomingLine = relationshipSummary.appendChild(dom.createElement('div'))
    incomingLine.className = 'social-mutual-summary-line'
    incomingLine.appendChild(link(text(familiar), subject.uri))
    incomingLine.appendChild(text(' knows '))
    incomingLine.appendChild(link(text('you'), meUri))
    incomingLine.appendChild(text(' (unconfirmed).'))
  } else {
    youAndThem()
    relationshipSummary.appendChild(text(' say you know each other.'))
  }

  const shouldShowCheckboxPreview = editable || (Boolean(incoming) && !outgoing)
  if (shouldShowCheckboxPreview) {
    const confirmLabel = dom.createElement('span')
    confirmLabel.appendChild(text('Confirm you know '))
    confirmLabel.appendChild(link(text(familiar), subject.uri))

    const relationshipForm = buildCheckboxForm(
      confirmLabel,
      new Statement(me, knows, subject, profile ?? undefined),
      Boolean(outgoing),
      {
        disabled: !editable,
        disabledTitle: !editable ? 'Your profile is not editable' : undefined
      }
    )
    relationshipForm.classList.add('social-mutual-checkbox-form')

    mutualContent.appendChild(relationshipForm)
  }

  if (mutualConnections.length) {
    const mutualConnectionsSummary = dom.createElement('div')
    mutualConnectionsSummary.className = 'social-mutual-summary'
    mutualContent.appendChild(mutualConnectionsSummary)
    mutualConnectionsSummary.appendChild(
      dom.createTextNode(
        'You' +
          (familiar ? ' and ' + familiar : '') +
          ' know' +
          people(mutualConnections.length) +
          ' found in common'
      )
    )
    mutualConnections.forEach((mutualConnection) => {
      mutualConnectionsSummary.appendChild(
        dom.createTextNode(',  ' + utils.label(mutualConnection))
      )
    })

    const mutualFriendsTable = mutualContent.appendChild(dom.createElement('table'))
    mutualFriendsTable.className = 'social-main social-friends-list social-friends-grid'

    const createMutualRow = function (target: NamedNode) {
      return widgets.personTR(dom, ns.foaf('knows'), target, {
        renderSupportingInfo,
        renderNameSuffix
      })
    }

    refreshMutualFriends = function () {
      const sortedMutualConnections = [...mutualConnections].sort((left, right) => {
        const leftLabel = utils.label(left) || left.value
        const rightLabel = utils.label(right) || right.value
        return leftLabel.localeCompare(rightLabel)
      })

      utils.syncTableToArray(
        mutualFriendsTable,
        sortedMutualConnections,
        createMutualRow,
        function (row, thing) {
          const replacement = createMutualRow(thing)
          return replacement
        }
      )
    }

    refreshMutualFriends()
  }

  return { section: mutualSection, content: mutualContent, refreshMutualFriends }
}

export function createAllFriendsSection (options: {
  dom: HTMLDocument,
  subject: NamedNode,
  profile: NamedNode | null,
  editable: boolean,
  renderSupportingInfo: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null,
  renderNameSuffix: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null
}): { section: HTMLElement, mainTable: HTMLTableElement, friendsList: HTMLElement } {
  const { dom, subject, profile, editable, renderSupportingInfo, renderNameSuffix } = options

  const allFriends = dom.createElement('section')
  allFriends.className = 'social-pane__all-friends social-primary__panel'
  allFriends.id = 'social-panel-all-friends'
  allFriends.setAttribute('role', 'tabpanel')
  allFriends.setAttribute('aria-labelledby', 'social-tab-all-friends')

  const mainTable = allFriends.appendChild(dom.createElement('table'))
  mainTable.className = 'social-main'

  const friendsList = widgets.attachmentList(dom, subject, mainTable, {
    doc: profile,
    modify: !!editable,
    predicate: ns.foaf('knows'),
    noun: 'friend',
    renderSupportingInfo,
    renderNameSuffix
  })
  friendsList.classList.add('social-friends-list')
  friendsList.style.marginTop = '0'

  const friendsListRow = friendsList.querySelector('tr')
  const friendsListPromptCell = friendsListRow?.children?.[0]
  const friendsListRightCell = friendsListRow?.children?.[1]
  const friendsHeaderActions = dom.createElement('div')
  friendsHeaderActions.className = 'social-friends-header-actions'

  if (friendsListPromptCell instanceof HTMLElement) {
    while (friendsListPromptCell.firstChild) {
      friendsHeaderActions.appendChild(friendsListPromptCell.firstChild)
    }
    friendsListPromptCell.remove()
  }

  if (friendsHeaderActions.childNodes.length > 0) {
    const friendDropButtons = friendsHeaderActions.querySelectorAll('button')
    friendDropButtons.forEach((button) => {
      button.setAttribute('title', 'Drop friend here')
      button.setAttribute('aria-label', 'Drop friend here')
      const buttonImages = button.querySelectorAll('img')
      buttonImages.forEach((image) => {
        image.setAttribute('title', 'Drop friend here')
        image.setAttribute('alt', 'Drop friend here')
      })
    })

    const friendsActionsRow = dom.createElement('div')
    friendsActionsRow.className = 'social-friends-header-actions social-friends-header-actions--standalone'
    friendsActionsRow.appendChild(friendsHeaderActions)
    allFriends.prepend(friendsActionsRow)
  }

  if (friendsListRightCell instanceof HTMLTableCellElement) {
    friendsListRightCell.colSpan = 2
  }

  const friendsItemsTable = friendsList.querySelector('td table')
  if (friendsItemsTable instanceof HTMLTableElement) {
    friendsItemsTable.classList.add('social-friends-grid')
  }

  return { section: allFriends, mainTable, friendsList }
}
