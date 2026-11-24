import { afterEach, describe, expect, it, vi } from 'vitest'
import * as $rdf from 'rdflib'
import { ns } from 'solid-ui'
import { screen, waitFor, within } from '@testing-library/dom'

const { ensureLoadedPreferences } = vi.hoisted(() => ({ ensureLoadedPreferences: vi.fn() }))
vi.mock('solid-ui', async importOriginal => {
  const actual = await importOriginal<typeof import('solid-ui')>()
  return { ...actual, login: { ...actual.login, ensureLoadedPreferences } }
})

import basicPreferencesPane from '../../../src/dashboard/basicPreferences'

const me = $rdf.sym('https://alice.example/profile/card#me')
const prefs = $rdf.sym('https://alice.example/settings/prefs.ttl')

function setup ({ editable = true, withPrefs = true } = {}) {
  const store = $rdf.graph() as $rdf.Store
  const update = vi.fn(async (deletions: $rdf.Statement[], insertions: $rdf.Statement[]) => {
    store.remove(deletions)
    insertions.forEach(s => store.add(s.subject, s.predicate, s.object, s.why))
  })
  ;(store as any).updater = { editable: () => editable, update }
  const app = $rdf.blankNode()
  store.add(me, ns.acl('trustedApp'), app, me.doc())
  store.add(app, ns.acl('origin'), $rdf.sym('https://solid-ui.example.com'), me.doc())
  store.add(app, ns.acl('mode'), ns.acl('Read'), me.doc())
  store.add(me, ns.space('storage'), $rdf.sym('https://alice.example/'), me.doc())

  ensureLoadedPreferences.mockResolvedValue({
    me,
    preferencesFile: withPrefs ? prefs : undefined
  } as any)

  const container = basicPreferencesPane.render(me, {
    dom: document,
    session: { store, paneRegistry: { byName: () => null } }
  } as any)
  document.body.appendChild(container)
  return { store, update }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('Preferences view', () => {
  it('shows the sections of the design', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: 'User types' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Manage your trusted applications/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Delete your Solid account/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Help & Support' })).toBeInTheDocument()
    expect(screen.queryByText(/Customize Theme/)).not.toBeInTheDocument()
  })

  it('saves the chosen role to the preferences file', async () => {
    const { store, update } = setup()
    const select = await screen.findByLabelText(/Role/) as HTMLSelectElement
    expect(select.value).toBe('user')
    select.value = 'developer'
    select.dispatchEvent(new Event('change'))
    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(store.holds(me, ns.rdf('type'), ns.solid('Developer'), prefs)).toBe(true)
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })

  it('disables the role when the preferences file is unavailable', async () => {
    setup({ withPrefs: false })
    const select = await screen.findByLabelText(/Role/) as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(screen.getByText(/preferences file could not be loaded/)).toBeInTheDocument()
  })

  it('lists trusted apps and updates a mode when ticked', async () => {
    const { update } = setup()
    const row = (await screen.findByText('https://solid-ui.example.com')).closest('tr')!
    const write = within(row).getByLabelText('Write access for https://solid-ui.example.com') as HTMLInputElement
    expect(within(row).getByLabelText('Read access for https://solid-ui.example.com')).toBeChecked()
    expect(write).not.toBeChecked()
    write.click()
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(within(screen.getByText('https://solid-ui.example.com').closest('tr')!)
      .getByLabelText('Write access for https://solid-ui.example.com')).toBeChecked())
  })

  it('removes a trusted app with the trash button', async () => {
    setup()
    const remove = await screen.findByRole('button', { name: 'Remove https://solid-ui.example.com' })
    remove.click()
    await waitFor(() => expect(screen.queryByText('https://solid-ui.example.com')).not.toBeInTheDocument())
  })

  it('adds a new app on Enter and rejects invalid URLs', async () => {
    setup()
    const input = await screen.findByLabelText('New application URL') as HTMLInputElement

    input.value = 'not a url'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid application URL/)

    input.value = 'https://notepad.example.com/app'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(await screen.findByText('https://notepad.example.com')).toBeInTheDocument()
  })

  it('explains when the profile cannot be edited', async () => {
    setup({ editable: false })
    expect(await screen.findByText(/is not editable/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('offers the account deletion page when one is found', async () => {
    setup()
    const link = await screen.findByRole('link', { name: /Delete your account/ })
    expect(link.getAttribute('href')).toMatch(/\/account\/delete$/)
  })
})
