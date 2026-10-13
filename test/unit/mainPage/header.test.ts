import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn } from 'solid-logic'
import { sym } from 'rdflib'
import type { NavigationController } from '../../../src/navigation/controller'

const { getFolderPanes } = vi.hoisted(() => ({ getFolderPanes: vi.fn() }))

vi.mock('../../../src/utils/paneUtils', () => ({ getFolderPanesFromURI: getFolderPanes }))

import { createHeader } from '../../../src/mainPage/header'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  document.body.replaceChildren()
})

type MenuItem = { onSelected?: () => unknown }

describe('account menu', () => {
  const viewer = sym('https://viewer.example/profile/card#me')

  async function setup (currentUser: typeof viewer | null, checkUser: typeof viewer | null = null, storages: object[] = []) {
    const show = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(authn, 'currentUser').mockReturnValue(currentUser)
    vi.spyOn(authn, 'checkUser').mockResolvedValue(checkUser)
    getFolderPanes.mockResolvedValue(storages)
    const header = await createHeader({ show } as NavigationController) as HTMLElement & { menuItems: MenuItem[] }
    return { show, header, items: header.menuItems }
  }

  it('shows the viewer\'s profile, friends, dashboard and preferences as the account menu', async () => {
    const { show, items } = await setup(viewer)
    const [profile, friends, dashboard, preferences] = items

    await profile.onSelected?.()
    await friends.onSelected?.()
    await dashboard.onSelected?.()
    await preferences.onSelected?.()

    expect(show.mock.calls.map(call => call[0])).toEqual([
      { kind: 'profile', subject: viewer.value, source: 'accountMenu' },
      { kind: 'friends', subject: viewer.value, source: 'accountMenu' },
      { kind: 'app', pane: 'home', source: 'accountMenu' },
      { kind: 'app', pane: 'basicPreferences', source: 'accountMenu' }
    ])
  })

  it('offers each of the viewer\'s storages, between friends and the dashboard', async () => {
    const storage = { paneName: 'folder', label: () => 'Storage' }
    const { show, items } = await setup(viewer, null, [storage])

    expect(items).toHaveLength(5)
    await items[2].onSelected?.()

    expect(show).toHaveBeenCalledWith({ kind: 'storage', pane: storage, source: 'accountMenu' })
  })

  it.each([
    ['logged in after the header was created', null, viewer, null],
    ['restored by a session check', null, null, viewer]
  ])('uses the viewer when it was %s', async (_name, atCreation, later, fromCheck) => {
    const { show, items } = await setup(atCreation, fromCheck)
    vi.mocked(authn.currentUser).mockReturnValue(later)

    await items[0].onSelected?.()
    await items[1].onSelected?.()

    expect(show.mock.calls.map(call => call[0].subject)).toEqual([viewer.value, viewer.value])
  })

  it('does nothing when nobody is logged in', async () => {
    const { show, items } = await setup(null, null)

    for (const item of items) await item.onSelected?.()

    expect(show).not.toHaveBeenCalled()
  })

  it('is created once', async () => {
    const { header, show } = await setup(viewer)

    expect(await createHeader({ show } as NavigationController)).toBe(header)
  })
})
