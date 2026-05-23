import { DataBrowserContext } from 'pane-registry'
import { createAddMeToYourFriendsButton } from 'profile-pane'
import { Statement, NamedNode } from 'rdflib'
import { ns, utils, widgets } from 'solid-ui'
import { appendProfileLinks } from './editProfileDetails'
import { locationIcon, personInCircleIcon as personInCircleIconSvg } from './icons'
import { FriendshipTriage } from './triage'

export type ViewerMode = 'owner' | 'authenticated' | 'anonymous'

export type HeaderControls = {
  canEdit: boolean,
  viewerMode: ViewerMode,
  showAddFriendAction?: boolean
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
  const header = dom.createElement('header') as SocialHeaderElement
  header.className = 'social-pane__header'
  let headerControls = controls

  const renderHeader = function () {
    header.replaceChildren()
    const profileData = getProfileData()

    const headerContent = dom.createElement('div')
    headerContent.className = 'social-pane__header-content'

    const headerActions = dom.createElement('div')
    headerActions.className = 'social-pane__header-actions profile__actions profile__heading-actions'

    if (headerControls.canEdit) {
      // Hidden for now because the social pane header edit control does not match the new design.
      // Revisit later if we decide to restore profile-link editing here.
    } else if (headerControls.viewerMode === 'authenticated' && headerControls.showAddFriendAction) {
      headerActions.classList.add('social-pane__header-actions--friend')
      const addToFriendsButton = createAddMeToYourFriendsButton(subject, context)
      addToFriendsButton.classList.add('flex-center')
      headerActions.appendChild(addToFriendsButton)
    }

    header.appendChild(headerContent)

    const headerMedia = dom.createElement('div')
    headerMedia.className = 'social-pane__header-media'
    headerContent.appendChild(headerMedia)

    if (profileData) {
      headerMedia.appendChild(createImage(dom, profileData.imageUrl, profileData.name))
    }

    const headerDetails = dom.createElement('div')
    headerDetails.className = 'social-pane__header-details'
    headerContent.appendChild(headerDetails)

    if (headerActions.childNodes.length > 0) {
      headerContent.appendChild(headerActions)
    }

    const headerSummary = dom.createElement('div')
    headerSummary.classList.add('social-pane__header-summary', 'flex-column')
    headerDetails.appendChild(headerSummary)

    const name = profileData?.name || utils.label(subject)
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
      locationIconSpan.classList.add('social-pane__header-location-icon', 'inline-flex-row')
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

function createImage (dom: HTMLDocument, src: string | null | undefined, alt = ''): HTMLElement {
  if (src) {
    const img = dom.createElement('img')
    img.className = 'social-pane__header-hero'
    img.src = src
    img.alt = alt
    img.width = 180
    img.height = 180
    img.loading = 'eager'
    return img
  }

  const fallback = dom.createElement('div')
  fallback.className = 'social-pane__header-hero-alt flex-center'
  fallback.setAttribute('role', 'img')
  fallback.setAttribute('aria-label', alt)
  fallback.tabIndex = 0

  const icon = dom.createElement('span')
  icon.classList.add('social-pane__header-hero-icon', 'inline-flex-row')
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
  mutualContent.classList.add('social-main', 'social-main--mutual', 'flex-column')

  const relationshipSummary = dom.createElement('div')
  relationshipSummary.classList.add('social-mutual-summary', 'flex-column')
  mutualContent.appendChild(relationshipSummary)

  const createRelationshipLine = function () {
    const line = relationshipSummary.appendChild(dom.createElement('div'))
    line.classList.add('social-mutual-summary-line')
    return line
  }

  const youAndThem = function () {
    const line = createRelationshipLine()
    line.appendChild(link(text('You'), meUri))
    line.appendChild(text(' and '))
    line.appendChild(link(text(familiar), subject.uri))
    return line
  }

  if (!incoming) {
    if (!outgoing) {
      const line = youAndThem()
      line.appendChild(text(' have not said you know each other.'))
    } else {
      const line = createRelationshipLine()
      line.appendChild(link(text('You'), meUri))
      line.appendChild(text(' know '))
      line.appendChild(link(text(familiar), subject.uri))
      line.appendChild(text(' (unconfirmed).'))
    }
  } else if (!outgoing) {
    relationshipSummary.classList.add('social-mutual-summary--confirm')

    const incomingLine = relationshipSummary.appendChild(dom.createElement('div'))
    incomingLine.classList.add('social-mutual-summary-line')
    incomingLine.appendChild(link(text(familiar), subject.uri))
    incomingLine.appendChild(text(' knows '))
    incomingLine.appendChild(link(text('you'), meUri))
    incomingLine.appendChild(text(' (unconfirmed).'))
  } else {
    const line = youAndThem()
    line.appendChild(text(' say you know each other.'))
  }

  const shouldShowCheckboxPreview = Boolean(incoming) && !outgoing
  if (shouldShowCheckboxPreview) {
    const confirmLabel = dom.createElement('span')
    confirmLabel.className = 'social-mutual-confirm-prompt'
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
    // Social pane already owns the async refresh cycle for friend data in
    // socialPane.ts. Leave attachmentList's generic follow-up rerender disabled
    // here or each fetched friend profile will trigger an extra whole-table refresh
    // on top of the pane's own batched updates.
    refreshOnDocumentLoad: false,
    renderSupportingInfo,
    renderNameSuffix
  })
  friendsList.classList.add('social-friends-list')
  friendsList.style.marginTop = '0'

  const friendsListRow = friendsList.querySelector('tr')
  const friendsListPromptCell = friendsListRow?.children?.[0]
  const friendsListRightCell = friendsListRow?.children?.[1]
  const friendsHeaderActions = dom.createElement('div')
  friendsHeaderActions.classList.add('social-friends-header-actions')

  if (friendsListPromptCell instanceof HTMLTableCellElement) {
    friendsListPromptCell.classList.add('social-friends-header-dropzone-cell')
    const friendsHeaderDropzone = dom.createElement('table')
    friendsHeaderDropzone.className = 'social-friends-header-dropzone'
    friendsHeaderDropzone.setAttribute('role', 'presentation')
    const friendsHeaderDropzoneBody = friendsHeaderDropzone.appendChild(dom.createElement('tbody'))
    const friendsHeaderDropzoneRow = friendsHeaderDropzoneBody.appendChild(dom.createElement('tr'))
    friendsHeaderDropzoneRow.appendChild(friendsListPromptCell)
    friendsHeaderActions.appendChild(friendsHeaderDropzone)
  } else if (friendsListPromptCell instanceof HTMLElement) {
    while (friendsListPromptCell.firstChild) {
      friendsHeaderActions.appendChild(friendsListPromptCell.firstChild)
    }
    friendsListPromptCell.remove()
  }

  const friendDropButtons = friendsHeaderActions.querySelectorAll('button')
  if (editable && friendDropButtons.length > 0) {
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
    const dropHint = dom.createElement('span')
    dropHint.className = 'social-friends-header-hint'
    dropHint.textContent = 'Drag a WebId on the target to add a friend.'
    friendsActionsRow.appendChild(dropHint)
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

export function createRequestsSection (options: {
  dom: HTMLDocument,
  triage: FriendshipTriage,
  renderSupportingInfo: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null,
  renderNameSuffix: (target: NamedNode, renderDom: HTMLDocument) => HTMLElement | null
}): { section: HTMLElement, refreshRequests: (triage: FriendshipTriage) => void } {
  const { dom, triage, renderSupportingInfo, renderNameSuffix } = options

  const requestsSection = dom.createElement('section')
  requestsSection.className = 'social-pane__requests social-primary__panel'
  requestsSection.id = 'social-panel-requests'
  requestsSection.setAttribute('role', 'tabpanel')
  requestsSection.setAttribute('aria-labelledby', 'social-tab-requests')

  const requestsContent = requestsSection.appendChild(dom.createElement('div'))
  requestsContent.classList.add('social-main', 'social-main--requests', 'flex-column')

  const note = requestsContent.appendChild(dom.createElement('p'))
  note.className = 'social-requests__note'
  note.textContent = 'Best effort preview: this view only reflects profile documents that are currently loaded. A dedicated inbox would still be needed for complete request discovery.'

  const createRequestGroup = function (title: string, description: string, emptyText: string) {
    const group = requestsContent.appendChild(dom.createElement('section'))
    group.classList.add('social-requests__group', 'flex-column')

    const header = group.appendChild(dom.createElement('div'))
    header.className = 'social-requests__group-header'

    const heading = header.appendChild(dom.createElement('h2'))
    heading.className = 'social-requests__group-title'
    heading.textContent = title

    const blurb = header.appendChild(dom.createElement('p'))
    blurb.className = 'social-requests__group-description'
    blurb.textContent = description

    const empty = group.appendChild(dom.createElement('p'))
    empty.className = 'social-requests__empty'
    empty.textContent = emptyText

    const table = group.appendChild(dom.createElement('table'))
    table.className = 'social-main social-friends-list social-friends-grid social-requests__table'

    return { empty, table }
  }

  const incomingGroup = createRequestGroup(
    'Incoming requests',
    'People who say they know this profile, but have not been confirmed yet.',
    'No incoming requests are visible from the currently loaded data.'
  )
  const pendingGroup = createRequestGroup(
    'Awaiting confirmation',
    'People this profile knows who have not linked back yet.',
    'Nothing is waiting for confirmation right now.'
  )

  const createPersonRow = function (target: NamedNode) {
    return widgets.personTR(dom, ns.foaf('knows'), target, {
      renderSupportingInfo,
      renderNameSuffix
    })
  }

  const sortNodes = function (nodes: NamedNode[]) {
    return [...nodes].sort((left, right) => {
      const leftLabel = utils.label(left) || left.value
      const rightLabel = utils.label(right) || right.value
      return leftLabel.localeCompare(rightLabel)
    })
  }

  const syncRequestGroup = function (
    group: { empty: HTMLElement, table: HTMLTableElement },
    nodes: NamedNode[]
  ) {
    const sortedNodes = sortNodes(nodes)
    group.empty.hidden = sortedNodes.length > 0
    group.table.hidden = sortedNodes.length === 0

    utils.syncTableToArray(
      group.table,
      sortedNodes,
      createPersonRow,
      function (_row, thing) {
        return createPersonRow(thing)
      }
    )
  }

  const refreshRequests = function (nextTriage: FriendshipTriage) {
    syncRequestGroup(incomingGroup, nextTriage.requests)
    syncRequestGroup(pendingGroup, nextTriage.unconfirmed)
  }

  refreshRequests(triage)

  return { section: requestsSection, refreshRequests }
}
