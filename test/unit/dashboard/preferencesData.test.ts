import { describe, expect, it, vi } from 'vitest'
import * as $rdf from 'rdflib'
import { ns } from 'solid-ui'
import {
  getDeletionUrlForServer,
  getUserRole,
  listTrustedApps,
  normalizeOrigin,
  roleChange,
  trustedAppChange
} from '../../../src/dashboard/preferencesData'

const me = $rdf.sym('https://alice.example/profile/card#me')
const prefs = $rdf.sym('https://alice.example/settings/prefs.ttl')

describe('user role', () => {
  it('defaults to a regular user', () => {
    expect(getUserRole($rdf.graph(), me, prefs)).toBe('user')
  })

  it('reads power user and developer from the preferences file', () => {
    const store = $rdf.graph()
    store.add(me, ns.rdf('type'), ns.solid('PowerUser'), prefs)
    expect(getUserRole(store, me, prefs)).toBe('powerUser')
    store.add(me, ns.rdf('type'), ns.solid('Developer'), prefs)
    expect(getUserRole(store, me, prefs)).toBe('developer')
  })

  it('ignores types stated in other documents', () => {
    const store = $rdf.graph()
    store.add(me, ns.rdf('type'), ns.solid('Developer'), me.doc())
    expect(getUserRole(store, me, prefs)).toBe('user')
  })

  it('replaces the old role with the new one', () => {
    const store = $rdf.graph()
    store.add(me, ns.rdf('type'), ns.solid('PowerUser'), prefs)
    const { deletions, insertions } = roleChange(store, me, prefs, 'developer')
    expect(deletions.map(s => s.object.value)).toEqual([ns.solid('PowerUser').value])
    expect(insertions).toHaveLength(1)
    expect(insertions[0].object.value).toBe(ns.solid('Developer').value)
    expect(insertions[0].why.value).toBe(prefs.value)
  })

  it('removes all role classes when going back to a regular user', () => {
    const store = $rdf.graph()
    store.add(me, ns.rdf('type'), ns.solid('PowerUser'), prefs)
    store.add(me, ns.rdf('type'), ns.solid('Developer'), prefs)
    const { deletions, insertions } = roleChange(store, me, prefs, 'user')
    expect(deletions).toHaveLength(2)
    expect(insertions).toHaveLength(0)
  })

  it('does nothing when the role is already set', () => {
    const store = $rdf.graph()
    store.add(me, ns.rdf('type'), ns.solid('Developer'), prefs)
    expect(roleChange(store, me, prefs, 'developer')).toEqual({ deletions: [], insertions: [] })
  })
})

describe('normalizeOrigin', () => {
  it.each([
    ['https://trusted.app', 'https://trusted.app'],
    ['https://sub.trusted.app/some/path?x=1', 'https://sub.trusted.app'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['trusted.app', 'https://trusted.app'],
    ['  https://Trusted.App/  ', 'https://trusted.app']
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeOrigin(input)).toBe(expected)
  })

  it.each(['', '   ', 'ftp://files.example', 'javascript:alert(1)', 'https://'])('rejects %j', input => {
    expect(normalizeOrigin(input)).toBeNull()
  })
})

describe('trusted applications', () => {
  function storeWithApp (origin: $rdf.NamedNode | $rdf.Literal, modes: string[]) {
    const store = $rdf.graph()
    const app = $rdf.blankNode()
    store.add(me, ns.acl('trustedApp'), app, me.doc())
    store.add(app, ns.acl('origin'), origin, me.doc())
    modes.forEach(mode => store.add(app, ns.acl('mode'), ns.acl(mode), me.doc()))
    return store
  }

  it('lists apps with their modes in a fixed order', () => {
    const store = storeWithApp($rdf.sym('https://b.example'), ['Write', 'Read'])
    const other = $rdf.blankNode()
    store.add(me, ns.acl('trustedApp'), other, me.doc())
    store.add(other, ns.acl('origin'), $rdf.sym('https://a.example'), me.doc())
    store.add(other, ns.acl('mode'), ns.acl('Control'), me.doc())
    expect(listTrustedApps(store, me)).toEqual([
      { origin: 'https://a.example', modes: ['Control'] },
      { origin: 'https://b.example', modes: ['Read', 'Write'] }
    ])
  })

  it('adds a new app with the chosen modes', () => {
    const store = $rdf.graph()
    const { deletions, insertions } = trustedAppChange(store, me, 'https://new.example', ['Read', 'Append'])
    expect(deletions).toHaveLength(0)
    expect(insertions).toHaveLength(4)
    insertions.forEach(s => store.add(s.subject, s.predicate, s.object, s.why))
    expect(listTrustedApps(store, me)).toEqual([{ origin: 'https://new.example', modes: ['Read', 'Append'] }])
  })

  it('replaces the modes of an existing app', () => {
    const store = storeWithApp($rdf.sym('https://app.example'), ['Read'])
    const { deletions, insertions } = trustedAppChange(store, me, 'https://app.example', ['Read', 'Write'])
    expect(deletions).toHaveLength(3)
    store.remove(deletions)
    insertions.forEach(s => store.add(s.subject, s.predicate, s.object, s.why))
    expect(listTrustedApps(store, me)).toEqual([{ origin: 'https://app.example', modes: ['Read', 'Write'] }])
  })

  it('removes an app when no modes are left', () => {
    const store = storeWithApp($rdf.sym('https://app.example'), ['Read', 'Control'])
    const { deletions, insertions } = trustedAppChange(store, me, 'https://app.example', [])
    expect(deletions).toHaveLength(4)
    expect(insertions).toHaveLength(0)
  })

  it('finds apps whose origin was stored as a literal', () => {
    const store = storeWithApp($rdf.lit('https://app.example'), ['Read'])
    const { deletions } = trustedAppChange(store, me, 'https://app.example', [])
    expect(deletions).toHaveLength(3)
  })
})

describe('getDeletionUrlForServer', () => {
  const ok = { ok: true } as Response
  const notFound = { ok: false } as Response

  it('prefers the multi-user server page', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok)
    await expect(getDeletionUrlForServer('https://alice.solidcommunity.net/', fetchFn))
      .resolves.toBe('https://solidcommunity.net/account/delete')
  })

  it('falls back to the single-user page', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce(ok)
    await expect(getDeletionUrlForServer('https://alice.solidcommunity.net/', fetchFn))
      .resolves.toBe('https://alice.solidcommunity.net/account/delete')
  })

  it('returns null when neither page exists or the fetch fails', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new TypeError('CORS'))
      .mockResolvedValueOnce(notFound)
    await expect(getDeletionUrlForServer('https://alice.solidcommunity.net/', fetchFn)).resolves.toBeNull()
  })

  it('does not try a parent domain for a two-part host name', async () => {
    const fetchFn = vi.fn().mockResolvedValue(notFound)
    await getDeletionUrlForServer('https://example.net/', fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith('https://example.net/account/delete', { method: 'HEAD' })
  })
})
