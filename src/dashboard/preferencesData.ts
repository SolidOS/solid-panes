/*
 * Data helpers for the Preferences view (basicPreferences pane).
 *
 * Kept free of DOM code so they can be unit tested against a plain rdflib store.
 */
import { IndexedFormula, NamedNode, Statement, st, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { generateRandomString, getStatementsToAdd, getStatementsToDelete } from '../trustedApplications/trustedApplications.utils'

/* ---------------- User types (roles) ---------------- */

export type UserRole = 'user' | 'powerUser' | 'developer'

export interface RoleOption {
  value: UserRole
  label: string
  description: string
}

export const roleOptions: RoleOption[] = [
  { value: 'user', label: 'Regular user', description: 'The standard views of your data.' },
  { value: 'powerUser', label: 'Power user', description: 'A more complex interface with more powerful features.' },
  { value: 'developer', label: 'Developer', description: 'Extra views useful when building Solid apps, such as raw data panes.' }
]

/** The RDF class recorded in the preferences file for each role. 'user' is the default and has no class. */
export function roleClass (role: UserRole): NamedNode | null {
  if (role === 'powerUser') return ns.solid('PowerUser')
  if (role === 'developer') return ns.solid('Developer')
  return null
}

const roleClasses = (): NamedNode[] => [ns.solid('Developer'), ns.solid('PowerUser')]

/** Read the user's role from their preferences file. Developer wins if several are set. */
export function getUserRole (store: IndexedFormula, me: NamedNode, preferencesFile: NamedNode): UserRole {
  if (store.holds(me, ns.rdf('type'), ns.solid('Developer'), preferencesFile.doc())) return 'developer'
  if (store.holds(me, ns.rdf('type'), ns.solid('PowerUser'), preferencesFile.doc())) return 'powerUser'
  return 'user'
}

/** Statements to delete and insert so that the preferences file records exactly `role`. */
export function roleChange (
  store: IndexedFormula,
  me: NamedNode,
  preferencesFile: NamedNode,
  role: UserRole
): { deletions: Statement[], insertions: Statement[] } {
  const doc = preferencesFile.doc()
  const wanted = roleClass(role)
  const deletions = roleClasses()
    .filter(klass => !wanted || !klass.equals(wanted))
    .flatMap(klass => store.statementsMatching(me, ns.rdf('type'), klass, doc))
  const insertions = wanted && !store.holds(me, ns.rdf('type'), wanted, doc)
    ? [st(me, ns.rdf('type'), wanted, doc)]
    : []
  return { deletions, insertions }
}

/* ---------------- Trusted applications ---------------- */

export const accessModes = ['Read', 'Write', 'Append', 'Control'] as const
export type AccessMode = typeof accessModes[number]

export interface TrustedApp {
  origin: string
  modes: AccessMode[]
}

/** The trusted applications listed in the user's profile, sorted by origin. */
export function listTrustedApps (store: IndexedFormula, me: NamedNode): TrustedApp[] {
  return store.each(me, ns.acl('trustedApp'), null, null)
    .flatMap(app => store.each(app as NamedNode, ns.acl('origin'), null, null).map(origin => ({
      origin: origin.value,
      modes: accessModes.filter(mode =>
        store.holds(app as NamedNode, ns.acl('mode'), ns.acl(mode), null))
    })))
    .sort((a, b) => a.origin.localeCompare(b.origin))
}

/**
 * Turn what the user typed into an application origin such as https://app.example
 * Returns null when it is not a usable http(s) URL.
 */
export function normalizeOrigin (input: string): string | null {
  const text = input.trim()
  if (!text) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname) return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * Statements to delete and insert to set the modes of the app at `origin`.
 * Any existing entry for `origin` is replaced. With no modes the app is removed.
 */
export function trustedAppChange (
  store: IndexedFormula,
  me: NamedNode,
  origin: string,
  modes: AccessMode[]
): { deletions: Statement[], insertions: Statement[] } {
  const originNode = sym(origin)
  // Match on the value, so an origin stored as a literal is found too
  const storedOrigins = store.statementsMatching(null, ns.acl('origin'), null, null)
    .map(statement => statement.object)
    .filter(node => node.value === origin)
  const deletions = dedupe(storedOrigins.flatMap(node => getStatementsToDelete(node as NamedNode, me, store, ns)))
  const insertions = modes.length
    ? getStatementsToAdd(originNode, generateRandomString(), modes.map(mode => ns.acl(mode).uri), me, ns)
    : []
  return { deletions, insertions }
}

function dedupe (statements: Statement[]): Statement[] {
  const seen = new Set<string>()
  return statements.filter(statement => {
    const key = statement.toNT()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* ---------------- Account deletion ---------------- */

/**
 * Find the page where the user can delete their account on a pod server.
 *
 * There is no standard way to discover this yet
 * (https://github.com/solidos/data-interoperability-panel/issues/18), so this assumes the
 * Node Solid Server layout: /account/delete on the server, or on the parent domain in
 * multi-user mode (alice.example.net → example.net/account/delete).
 */
export async function getDeletionUrlForServer (
  server: string,
  fetchFn: typeof fetch = fetch
): Promise<string | null> {
  const singleUserUrl = new URL(server)
  singleUserUrl.pathname = '/account/delete'
  singleUserUrl.search = singleUserUrl.hash = ''

  const candidates: string[] = []
  const hostnameParts = singleUserUrl.hostname.split('.')
  if (hostnameParts.length > 2) {
    const multiUserUrl = new URL(singleUserUrl.href)
    multiUserUrl.hostname = hostnameParts.slice(1).join('.')
    candidates.push(multiUserUrl.href)
  }
  candidates.push(singleUserUrl.href)

  for (const candidate of candidates) {
    try {
      const response = await fetchFn(candidate, { method: 'HEAD' })
      if (response.ok) return candidate
    } catch {
      // Unreachable or blocked by CORS: try the next candidate
    }
  }
  return null
}
