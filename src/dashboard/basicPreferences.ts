/*
 * Preferences view: the "Preferences" item in the logged-in user's menu.
 *
 * Design: https://github.com/SolidOS/solid-panes/issues/710
 * Sections: User types, Manage your trusted applications, Delete your Solid account,
 * and a Help & Support sidebar. "Customize Theme" is not implemented yet (see the issue).
 */
import { html, nothing, render, type TemplateResult } from 'lit-html'
import { PaneDefinition } from 'pane-registry'
import { NamedNode, parse, Statement, Store } from 'rdflib'
import { icons, login, ns } from 'solid-ui'
import '~icons/lucide/info'
import '~icons/lucide/trash-2'
import '~icons/lucide/triangle-alert'
import '~icons/lucide/external-link'
import './basicPreferences.css'
import ontologyData from './ontologyData.ttl'
import {
  accessModes,
  type AccessMode,
  getDeletionUrlForServer,
  getUserRole,
  listTrustedApps,
  normalizeOrigin,
  roleChange,
  roleOptions,
  trustedAppChange,
  type TrustedApp,
  type UserRole
} from './preferencesData'

const USER_GUIDE_URL = 'https://solidos.github.io/userguide/'
const USER_TYPES_GUIDE_URL = 'https://github.com/solidos/userguide/#role'

type Status = { kind: 'info' | 'error' | 'success', text: string } | null

interface PreferencesState {
  me: NamedNode | null
  loading: boolean
  loadError: string | null

  preferencesFile: NamedNode | null
  role: UserRole
  roleStatus: Status

  profileEditable: boolean
  trustedApps: TrustedApp[]
  newAppUrl: string
  newAppModes: AccessMode[]
  appsStatus: Status
  busyOrigins: Set<string>

  deletion: { checking: boolean, links: Array<{ server: string, url: string }>, servers: string[] }
}

export const basicPreferencesPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_Sliders_341315_000000.svg',
  name: 'basicPreferences',
  label: _subject => null,

  // The subject should be the logged in user.
  render: (_subject, context) => {
    const dom = context.dom
    // @ts-ignore
    const store = context.session.store as Store
    const container = dom.createElement('div')
    container.classList.add('preferences-pane')

    // Labels for the user type classes, used elsewhere in the data browser
    const ontologyDoc = store.sym('urn:uuid:93774ba1-d3b6-41f2-85b6-4ae27ffd2597-ONT')
    if (!store.holds(undefined, undefined, undefined, ontologyDoc)) {
      ;(parse as any)(ontologyData, store, ontologyDoc.uri, 'text/turtle', null)
    }

    const state: PreferencesState = {
      me: null,
      loading: true,
      loadError: null,
      preferencesFile: null,
      role: 'user',
      roleStatus: null,
      profileEditable: false,
      trustedApps: [],
      newAppUrl: '',
      newAppModes: [],
      appsStatus: null,
      busyOrigins: new Set(),
      deletion: { checking: true, links: [], servers: [] }
    }

    const update = () => render(view(state, actions), container)

    async function save (deletions: Statement[], insertions: Statement[]) {
      if (!store.updater) throw new Error('Store has no updater')
      if (!deletions.length && !insertions.length) return
      await store.updater.update(deletions, insertions)
    }

    const actions: Actions = {
      async setRole (role) {
        if (!state.me || !state.preferencesFile || role === state.role) return
        const previous = state.role
        state.role = role
        state.roleStatus = { kind: 'info', text: 'Saving…' }
        update()
        try {
          const { deletions, insertions } = roleChange(store, state.me, state.preferencesFile, role)
          await save(deletions, insertions)
          state.roleStatus = { kind: 'success', text: 'Saved.' }
        } catch (err) {
          state.role = previous
          state.roleStatus = { kind: 'error', text: `Could not save your user type: ${messageOf(err)}` }
        }
        update()
      },

      async setAppModes (origin, modes) {
        if (!state.me) return
        state.busyOrigins.add(origin)
        state.appsStatus = null
        update()
        try {
          const { deletions, insertions } = trustedAppChange(store, state.me, origin, modes)
          await save(deletions, insertions)
          state.appsStatus = {
            kind: 'success',
            text: modes.length ? `Updated ${origin}.` : `Removed ${origin}.`
          }
        } catch (err) {
          state.appsStatus = { kind: 'error', text: `Could not update ${origin}: ${messageOf(err)}` }
        }
        state.busyOrigins.delete(origin)
        state.trustedApps = listTrustedApps(store, state.me)
        update()
      },

      setNewAppUrl (value) {
        state.newAppUrl = value
      },

      toggleNewAppMode (mode, checked) {
        state.newAppModes = accessModes.filter(m =>
          m === mode ? checked : state.newAppModes.includes(m))
        update()
      },

      async addApp () {
        if (!state.me) return
        if (!state.newAppUrl.trim()) return
        const origin = normalizeOrigin(state.newAppUrl)
        if (!origin) {
          state.appsStatus = {
            kind: 'error',
            text: 'Please enter a valid application URL, for example https://trusted.app or http://localhost:3000.'
          }
          update()
          return
        }
        if (state.trustedApps.some(app => app.origin === origin)) {
          state.appsStatus = { kind: 'error', text: `${origin} is already in the list.` }
          update()
          return
        }
        const modes = state.newAppModes.length ? state.newAppModes : ['Read' as AccessMode]
        state.newAppUrl = ''
        state.newAppModes = []
        await actions.setAppModes(origin, modes)
      }
    }

    async function load () {
      update()
      try {
        const authContext = await login.ensureLoadedPreferences({ dom, div: container })
        const me = authContext.me as NamedNode | undefined
        if (!me) throw new Error('You need to be logged in to see your preferences.')
        state.me = me

        if (authContext.preferencesFile) {
          state.preferencesFile = authContext.preferencesFile as NamedNode
          state.role = getUserRole(store, me, state.preferencesFile)
        } else {
          // Could be CORS
          console.log('No access to preferences file. ' + (authContext as any).preferencesFileError)
          state.roleStatus = {
            kind: 'error',
            text: 'Your preferences file could not be loaded, so your user type cannot be changed right now.'
          }
        }

        state.profileEditable = !!store.updater?.editable(me.doc().uri, store)
        state.trustedApps = listTrustedApps(store, me)
      } catch (err) {
        state.loadError = messageOf(err)
      }
      state.loading = false
      update()

      if (state.me) {
        await findDeletionLinks(store, state.me, state.deletion)
        update()
      }
    }

    load()
    return container
  }
}

export default basicPreferencesPane

/* ---------------- Rendering ---------------- */

interface Actions {
  setRole: (role: UserRole) => Promise<void>
  setAppModes: (origin: string, modes: AccessMode[]) => Promise<void>
  setNewAppUrl: (value: string) => void
  toggleNewAppMode: (mode: AccessMode, checked: boolean) => void
  addApp: () => Promise<void>
}

function view (state: PreferencesState, actions: Actions): TemplateResult {
  return html`
    <div class="preferences-layout">
      <div class="preferences-main">
        ${state.loading
          ? html`<section class="preferences-card"><p class="preferences-muted" role="status">Loading your preferences…</p></section>`
          : state.loadError
            ? html`<section class="preferences-card"><p class="preferences-status preferences-status--error" role="alert">${state.loadError}</p></section>`
            : html`
              ${userTypesSection(state, actions)}
              ${trustedAppsSection(state, actions)}
              ${deleteAccountSection(state)}
            `}
      </div>
      <aside class="preferences-aside" aria-label="Help and support">
        ${helpSection()}
      </aside>
    </div>
  `
}

function infoIcon (text: string): TemplateResult {
  return html`<span class="preferences-info" tabindex="0" role="img" aria-label=${text} title=${text}
    ><icon-lucide-info aria-hidden="true"></icon-lucide-info></span>`
}

function statusLine (status: Status): TemplateResult | typeof nothing {
  if (!status) return nothing
  return html`<p class="preferences-status preferences-status--${status.kind}"
    role=${status.kind === 'error' ? 'alert' : 'status'}>${status.text}</p>`
}

function userTypesSection (state: PreferencesState, actions: Actions): TemplateResult {
  const selected = roleOptions.find(option => option.value === state.role)
  return html`
    <section class="preferences-card" aria-labelledby="preferences-user-types">
      <h2 id="preferences-user-types" class="preferences-card__title">User types</h2>
      <p class="preferences-card__description">
        The options presented to you when viewing data can be customised based on your role.
      </p>
      <div class="preferences-field">
        <label class="preferences-label" for="preferences-role">
          Role
          ${infoIcon('Power users and developers are offered extra views of their data. This is private and stored in your preferences file.')}
        </label>
        <select id="preferences-role" class="preferences-select"
          ?disabled=${!state.preferencesFile}
          aria-describedby="preferences-role-description"
          @change=${(event: Event) => actions.setRole((event.target as HTMLSelectElement).value as UserRole)}>
          ${roleOptions.map(option => html`
            <option value=${option.value} ?selected=${option.value === state.role}>${option.label}</option>
          `)}
        </select>
        <p id="preferences-role-description" class="preferences-muted">
          ${selected?.description}
          <a href=${USER_TYPES_GUIDE_URL} target="_blank" rel="noopener noreferrer">Read more</a>
        </p>
      </div>
      ${statusLine(state.roleStatus)}
    </section>
  `
}

function trustedAppsSection (state: PreferencesState, actions: Actions): TemplateResult {
  const header = html`
    <h2 id="preferences-trusted-apps" class="preferences-card__title">
      Manage your trusted applications
      ${infoIcon('Trusted applications get access to everything you have access to, limited to the modes you tick. They never get more access than you have.')}
    </h2>
    <p class="preferences-card__description">
      Before you can use third-party applications, you need to add them to the allowlist via the Trusted Application table.
    </p>`

  if (!state.profileEditable) {
    return html`
      <section class="preferences-card" aria-labelledby="preferences-trusted-apps">
        ${header}
        <p class="preferences-status preferences-status--error" role="alert">
          Your profile ${state.me?.doc().uri} is not editable, so trusted applications cannot be changed here.
        </p>
      </section>`
  }

  const modeCell = (label: string, checked: boolean, disabled: boolean, onChange: (checked: boolean) => void) => html`
    <td class="preferences-table__mode">
      <input type="checkbox" .checked=${checked} ?disabled=${disabled} aria-label=${label}
        @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}>
    </td>`

  return html`
    <section class="preferences-card" aria-labelledby="preferences-trusted-apps">
      ${header}
      <div class="preferences-table-wrapper">
        <table class="preferences-table">
          <thead>
            <tr>
              <th scope="col">Application URL</th>
              ${accessModes.map(mode => html`<th scope="col">${mode}</th>`)}
              <th scope="col"><span class="preferences-visually-hidden">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            ${state.trustedApps.map(app => {
              const busy = state.busyOrigins.has(app.origin)
              return html`
                <tr aria-busy=${busy ? 'true' : 'false'}>
                  <th scope="row" class="preferences-table__url">${app.origin}</th>
                  ${accessModes.map(mode => modeCell(
                    `${mode} access for ${app.origin}`,
                    app.modes.includes(mode),
                    busy,
                    checked => actions.setAppModes(app.origin,
                      accessModes.filter(m => m === mode ? checked : app.modes.includes(m)))
                  ))}
                  <td class="preferences-table__action">
                    <button type="button" class="preferences-icon-button" ?disabled=${busy}
                      aria-label=${`Remove ${app.origin}`} title="Remove"
                      @click=${() => actions.setAppModes(app.origin, [])}>
                      <icon-lucide-trash-2 aria-hidden="true"></icon-lucide-trash-2>
                    </button>
                  </td>
                </tr>`
            })}
            <tr class="preferences-table__new">
              <td class="preferences-table__url">
                <input type="url" class="preferences-input" placeholder="Write new URL here"
                  aria-label="New application URL" aria-describedby="preferences-new-app-hint"
                  .value=${state.newAppUrl}
                  @input=${(event: Event) => actions.setNewAppUrl((event.target as HTMLInputElement).value)}
                  @keydown=${(event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      actions.addApp()
                    }
                  }}
                  @change=${() => actions.addApp()}>
              </td>
              ${accessModes.map(mode => modeCell(
                `${mode} access for the new application`,
                state.newAppModes.includes(mode),
                false,
                checked => actions.toggleNewAppMode(mode, checked)
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p id="preferences-new-app-hint" class="preferences-muted">
        To add an application, tick its access modes, then type its URL and press Enter,
        for example https://trusted.app or http://localhost:3000. With no modes ticked it gets Read access.
      </p>
      ${statusLine(state.appsStatus)}
    </section>
  `
}

function deleteAccountSection (state: PreferencesState): TemplateResult {
  const { checking, links, servers } = state.deletion
  let actionsArea: TemplateResult
  if (checking) {
    actionsArea = html`<p class="preferences-muted" role="status">Looking for your Pod provider's account deletion page…</p>`
  } else if (links.length) {
    actionsArea = html`${links.map(link => html`
      <a class="preferences-danger-button" href=${link.url} target="_blank" rel="noopener noreferrer">
        <icon-lucide-trash-2 aria-hidden="true"></icon-lucide-trash-2>
        ${links.length > 1 ? `Delete your account at ${link.server}` : 'Delete your account'}
        <span class="preferences-visually-hidden">(opens your Pod provider's site in a new tab)</span>
      </a>`)}`
  } else {
    actionsArea = html`
      <p class="preferences-muted">
        We could not find an account deletion page for ${servers.length ? servers.join(', ') : 'your Pod'}.
        Please contact your Pod provider to delete your account.
      </p>`
  }

  return html`
    <section class="preferences-card" aria-labelledby="preferences-delete-account">
      <h2 id="preferences-delete-account" class="preferences-card__title">
        Delete your Solid account
        ${infoIcon('Account deletion is handled by your Pod provider. You will be taken to their site to confirm.')}
      </h2>
      <p class="preferences-card__description">If you no longer want your Solid Pod, you can delete your account.</p>
      <div class="preferences-warning" role="note">
        <icon-lucide-triangle-alert aria-hidden="true"></icon-lucide-triangle-alert>
        <div>
          <strong>Warning:</strong>
          <p>When your account is deleted, all of the data is deleted and cannot be restored.</p>
        </div>
      </div>
      <div class="preferences-delete-actions">${actionsArea}</div>
    </section>
  `
}

function helpSection (): TemplateResult {
  return html`
    <section class="preferences-card preferences-card--compact" aria-labelledby="preferences-help">
      <h2 id="preferences-help" class="preferences-card__subtitle">Help &amp; Support</h2>
      <p class="preferences-muted">
        Your preferences are stored privately in your Pod. Trusted applications are listed in your
        profile, and are used by your Pod to decide which apps may act on your behalf.
      </p>
      <p>
        <a href=${USER_GUIDE_URL} target="_blank" rel="noopener noreferrer">
          SolidOS user guide <icon-lucide-external-link aria-hidden="true"></icon-lucide-external-link>
        </a>
      </p>
    </section>
  `
}

/* ---------------- Helpers ---------------- */

async function findDeletionLinks (
  store: Store,
  me: NamedNode,
  deletion: PreferencesState['deletion']
): Promise<void> {
  const servers = store.each(me, ns.space('storage'), null, me.doc()).map(node => node.value)
  deletion.servers = servers
  const results = await Promise.all(servers.map(async server => {
    try {
      const url = await getDeletionUrlForServer(server)
      return url ? { server, url } : null
    } catch {
      return null
    }
  }))
  deletion.links = results.filter((link): link is { server: string, url: string } => !!link)
  deletion.checking = false
}

function messageOf (err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
