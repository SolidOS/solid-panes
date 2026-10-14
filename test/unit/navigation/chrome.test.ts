import { describe, expect, it } from 'vitest'
import {
  deriveExplorerHeader,
  deriveHeading,
  deriveNavbarSelection,
  explorerHeaderForPane,
  isNavbarHidden,
  isNavbarItemSelected,
  isPersonPane,
  pickNavbarItem,
  type HeadingInput
} from '../../../src/navigation/chrome'
import { viewFromPane } from '../../../src/navigation/state'

const viewerUri = 'https://pod.example/me/profile/card#me'
const ownerUri = 'https://pod.example/owner/profile/card#me'
const pageUrl = 'https://pod.example/owner/container/'

const ownerStorage = 'https://pod.example/owner/'

function heading (overrides: Partial<HeadingInput> & { pane?: string, subject?: string } = {}) {
  const { pane, subject, ...rest } = overrides
  return deriveHeading({
    view: viewFromPane(pane, subject),
    viaAccountMenu: false,
    viewer: viewerUri,
    pageUrl,
    owner: ownerUri,
    storageUris: [ownerStorage],
    ...rest
  })
}

describe('isPersonPane', () => {
  it.each([['profile', true], ['social', true], ['folder', false], ['home', false], [undefined, false]])(
    '%s -> %s', (pane, expected) => {
      expect(isPersonPane(pane)).toBe(expected)
    }
  )
})

describe('deriveHeading', () => {
  describe('profile and friends panes present their own subject', () => {
    it('is full for the profile pane and compact for friends', () => {
      expect(heading({ pane: 'profile', subject: ownerUri })).toEqual({ mode: 'full', subjectUri: ownerUri, paneName: 'profile' })
      expect(heading({ pane: 'social', subject: ownerUri })).toEqual({ mode: 'compact', subjectUri: ownerUri, paneName: 'social' })
    })

    it('presents the saved subject, else the navbar entry\'s profile, else the page', () => {
      const other = 'https://pod.example/saved/profile/card#me'
      expect(heading({ pane: 'profile', subject: other })).toMatchObject({ subjectUri: other })
      expect(heading({ pane: 'profile' })).toMatchObject({ subjectUri: ownerUri })
      expect(heading({ pane: 'profile', owner: undefined })).toMatchObject({ subjectUri: pageUrl })
    })

    it('does not depend on who is logged in or where the view came from', () => {
      const own = heading({ pane: 'profile', subject: viewerUri, viewer: viewerUri, viaAccountMenu: true })

      expect(own).toEqual({ mode: 'full', subjectUri: viewerUri, paneName: 'profile' })
    })
  })

  describe('other panes show the owner of the pod the page is in', () => {
    it.each([undefined, 'folder', 'source', 'dataContents'])('shows a compact heading for pane %s', pane => {
      expect(heading({ pane })).toEqual({ mode: 'compact', subjectUri: ownerUri, paneName: pane })
    })

    it('is hidden when the owner is the viewer', () => {
      expect(heading({ viewer: ownerUri })).toEqual({ mode: 'none' })
    })

    it('shows the owner to a visitor who is not logged in, but nothing without an owner', () => {
      expect(heading({ viewer: undefined })).toMatchObject({ mode: 'compact' })
      expect(heading({ viewer: undefined, owner: undefined })).toEqual({ mode: 'none' })
    })

    it('is hidden for account-menu views, which show the viewer\'s content', () => {
      expect(heading({ pane: 'home', viaAccountMenu: true })).toEqual({ mode: 'none' })
      expect(heading({ viaAccountMenu: true })).toEqual({ mode: 'none' })
    })

    it('is hidden for the viewer\'s storage opened from the account menu', () => {
      expect(heading({ pane: 'folder', subject: 'https://pod.example/me/', viaAccountMenu: true })).toEqual({ mode: 'none' })
    })

    it('is hidden for the viewer\'s own storage opened from the account menu even when the pod has storages', () => {
      expect(heading({ pane: 'folder', subject: 'https://pod.example/me/', viaAccountMenu: true, storageUris: [ownerStorage] }))
        .toEqual({ mode: 'none' })
    })

    it('shows the owner for a storage of the pod, whichever way it was opened', () => {
      expect(heading({ pane: 'folder', subject: ownerStorage, viaAccountMenu: true, viewer: viewerUri }))
        .toEqual({ mode: 'compact', subjectUri: ownerUri, paneName: 'folder' })
      expect(heading({ pane: 'folder', viaAccountMenu: true }))
        .toEqual({ mode: 'compact', subjectUri: ownerUri, paneName: 'folder' })
    })

    it('shows the owner for a storage the pod does not list, unless the account menu opened it', () => {
      expect(heading({ pane: 'folder', subject: 'https://pod.example/elsewhere/' }))
        .toEqual({ mode: 'compact', subjectUri: ownerUri, paneName: 'folder' })
      expect(heading({ pane: 'folder', subject: 'https://pod.example/elsewhere/', viaAccountMenu: true }))
        .toEqual({ mode: 'none' })
    })

    it('is hidden without a known owner of the pod', () => {
      expect(heading({ owner: undefined })).toEqual({ mode: 'none' })
      expect(heading({ owner: undefined, storageUris: [] })).toEqual({ mode: 'none' })
    })
  })
})

describe('navbar', () => {
  describe('deriveNavbarSelection', () => {
    it('selects the displayed pane and its subject', () => {
      expect(deriveNavbarSelection(viewFromPane('folder', 'https://pod.example/s/'), false))
        .toEqual({ paneName: 'folder', paneUri: 'https://pod.example/s/' })
    })

    it('selects Profile on a WebID, and nothing on other pages', () => {
      expect(deriveNavbarSelection(viewFromPane(), true)).toEqual({ paneName: 'profile', paneUri: undefined })
      expect(deriveNavbarSelection(viewFromPane(), false)).toEqual({ paneName: undefined, paneUri: undefined })
    })

    it('prefers the displayed pane over the WebID default', () => {
      expect(deriveNavbarSelection(viewFromPane('social', ownerUri), true).paneName).toBe('social')
    })
  })

  describe('isNavbarItemSelected', () => {
    const storage = { paneName: 'folder', paneUri: 'https://pod.example/a/' }

    it('selects profile and friends by pane alone', () => {
      expect(isNavbarItemSelected({ paneName: 'profile' }, { paneName: 'profile' }, 0)).toBe(true)
      expect(isNavbarItemSelected({ paneName: 'social' }, { paneName: 'profile' }, 0)).toBe(false)
    })

    it('selects a storage by its URI', () => {
      expect(isNavbarItemSelected(storage, { paneName: 'folder', paneUri: storage.paneUri }, 2)).toBe(true)
      expect(isNavbarItemSelected(storage, { paneName: 'folder', paneUri: 'https://pod.example/b/' }, 2)).toBe(false)
    })

    it('selects a storage without a URI only when it is the single one', () => {
      expect(isNavbarItemSelected(storage, { paneName: 'folder' }, 1)).toBe(true)
      expect(isNavbarItemSelected(storage, { paneName: 'folder' }, 2)).toBe(false)
    })

    it('selects nothing when nothing is displayed', () => {
      expect(isNavbarItemSelected({ paneName: 'profile' }, {}, 0)).toBe(false)
    })
  })

  describe('pickNavbarItem', () => {
    const items = [
      { paneName: 'profile', paneUri: 'p' },
      { paneName: 'folder', paneUri: 'a' },
      { paneName: 'folder', paneUri: 'b' }
    ]

    it('prefers the item for that subject, else the first for that pane', () => {
      expect(pickNavbarItem(items, 'folder', 'b')).toBe(items[2])
      expect(pickNavbarItem(items, 'folder', 'unknown')).toBe(items[1])
      expect(pickNavbarItem(items, 'folder')).toBe(items[1])
    })

    it('finds nothing for a pane the navbar does not have', () => {
      expect(pickNavbarItem(items, 'social')).toBeUndefined()
    })
  })

  describe('isNavbarHidden', () => {
    it.each([
      [false, false, false, false],
      [true, false, false, true],
      [false, true, false, true],
      [true, true, false, true],
      [false, false, true, true],
      [true, false, true, true]
    ])('account menu %s, own profile %s, own pod %s -> hidden %s', (viaAccountMenu, ownProfile, inViewerPod, hidden) => {
      expect(isNavbarHidden({ viaAccountMenu, ownProfile, inViewerPod })).toBe(hidden)
    })
  })
})

describe('file explorer header', () => {
  const resource = { isRootResource: false, isWebId: false, viewerPodOnly: false, inViewerPod: false }

  it('is shown for an ordinary resource', () => {
    expect(deriveExplorerHeader(resource)).toBe(true)
  })

  it('is never shown for root resources or WebIDs', () => {
    expect(deriveExplorerHeader({ ...resource, isRootResource: true, inViewerPod: true })).toBe(false)
    expect(deriveExplorerHeader({ ...resource, isWebId: true, inViewerPod: true })).toBe(false)
  })

  it('is shown for views of the viewer\'s own content only inside the viewer\'s pod', () => {
    expect(deriveExplorerHeader({ ...resource, viewerPodOnly: true, inViewerPod: false })).toBe(false)
    expect(deriveExplorerHeader({ ...resource, viewerPodOnly: true, inViewerPod: true })).toBe(true)
  })

  it('is never shown over profile or friends panes', () => {
    expect(explorerHeaderForPane(true, 'profile')).toBe(false)
    expect(explorerHeaderForPane(true, 'social')).toBe(false)
    expect(explorerHeaderForPane(true, 'folder')).toBe(true)
    expect(explorerHeaderForPane(true, undefined)).toBe(true)
    expect(explorerHeaderForPane(false, 'folder')).toBe(false)
  })
})
