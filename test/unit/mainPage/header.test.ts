import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import type { OutlineManager } from '../../../src/outline/manager'

const { getProfilePane, getSocialPane, getFolderPanes } = vi.hoisted(() => ({
  getProfilePane: vi.fn(),
  getSocialPane: vi.fn(),
  getFolderPanes: vi.fn()
}))

vi.mock('../../../src/utils/paneUtils', () => ({
  getProfilePaneFromURI: getProfilePane,
  getSocialPaneFromURI: getSocialPane,
  getFolderPanesFromURI: getFolderPanes
}))

import { createHeader } from '../../../src/mainPage/header'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
})

type MenuItem = { onSelected?: () => unknown }

describe('account menu', () => {
  const viewer = sym('https://viewer.example/profile/card#me')

  async function setup (currentUser: typeof viewer | null, checkUser: typeof viewer | null = null) {
    const GotoSubject = vi.fn()
    const outliner = { GotoSubject, context: { session: { paneRegistry: { byName: vi.fn() } } } } as unknown as OutlineManager
    const outlineView = document.createElement('table')
    outlineView.id = 'OutlineView'
    document.body.append(outlineView)
    const currentUserSpy = vi.spyOn(authn, 'currentUser').mockReturnValue(currentUser)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(checkUser)
    getFolderPanes.mockResolvedValue([])
    window.history.replaceState({}, '', '/other/container/')
    const header = await createHeader(outliner) as HTMLElement & { menuItems: MenuItem[] }
    const [profile, friends] = header.menuItems
    return { GotoSubject, currentUserSpy, profile, friends, outlineView }
  }

  it('opens the profile pane for the viewer without changing the URL', async () => {
    const profilePane = { name: 'profile', subject: viewer }
    getProfilePane.mockResolvedValue(profilePane)
    const { GotoSubject, profile, outlineView } = await setup(viewer)

    await profile.onSelected?.()

    expect(getProfilePane).toHaveBeenCalledWith(viewer)
    expect(GotoSubject).toHaveBeenCalledWith(
      sym(window.location.href), true, profilePane, true, undefined, outlineView, false
    )
  })

  it.each([
    ['logged in after the header was created', null, viewer, null],
    ['restored by a session check', null, null, viewer]
  ])('opens the profile and friends panes when the viewer was %s', async (_name, atCreation, later, fromCheck) => {
    const profilePane = { name: 'profile', subject: viewer }
    const socialPane = { name: 'social', subject: viewer }
    getProfilePane.mockResolvedValue(profilePane)
    getSocialPane.mockResolvedValue(socialPane)
    const { GotoSubject, currentUserSpy, profile, friends } = await setup(atCreation, fromCheck)
    currentUserSpy.mockReturnValue(later)

    await profile.onSelected?.()
    await friends.onSelected?.()

    expect(GotoSubject.mock.calls.map(call => call[2])).toEqual([profilePane, socialPane])
  })

  it('does nothing when nobody is logged in', async () => {
    const { GotoSubject, profile } = await setup(null, null)

    await profile.onSelected?.()

    expect(getProfilePane).not.toHaveBeenCalled()
    expect(GotoSubject).not.toHaveBeenCalled()
  })

  it('does not fall back to the URL\'s default view when the pane cannot be built', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    getProfilePane.mockResolvedValue(null)
    const { GotoSubject, profile } = await setup(viewer)

    await profile.onSelected?.()

    expect(GotoSubject).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })
})
