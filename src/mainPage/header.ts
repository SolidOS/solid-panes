import { authSession, authn, store } from 'solid-logic'
import { icons, widgets, utils } from 'solid-ui'
import 'solid-ui/components/header'
import type { Header, HeaderMenuItem, HeaderAccountMenuItem, HeaderAuthState } from 'solid-ui/components/header'
import { OutlineManager } from '../outline/manager'
import { LiveStore } from 'rdflib'
/**
 * menu icons
*/
const HELP_MENU_ICON = icons.iconBase + 'noun_help.svg'
const SOLID_ICON_URL = 'https://solidproject.org/assets/img/solid-emblem.svg'
/**
 * menu elements
*/
const SIGN_IN_MENU_ITEM = 'Log In'
const SIGN_OUT_MENU_ITEM = 'Log Out'
const SIGN_UP_MENU_ITEM = 'Sign Up'
const ACCOUNT_MENU_LABEL = '▼'
const SIGN_UP__MENU_LINK = 'https://solidproject.org/get_a_pod'

// data structure extracted for solid-ui-header binding
export const HELP_MENU_LIST = [
  { label: 'User guide', url: 'https://solidos.github.io/userguide/', target: '_blank' },
  { label: 'Report a problem', url: 'https://github.com/solidos/solidos/issues', target: '_blank' }
]

const HEADER_MOBILE_STYLE_ID = 'solid-ui-header-mobile-style'

type ManagedHeader = Header & {
  __solidPanesListenersAttached?: boolean
  __solidPanesOutliner?: OutlineManager
}

function ensureMobileHeaderStyles () {
  if (document.getElementById(HEADER_MOBILE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HEADER_MOBILE_STYLE_ID
  style.textContent = `
    solid-ui-header[layout="mobile"]::part(logo) {
      display: none !important;
    }
  `
  document.head.appendChild(style)
}

export async function createHeader (store: LiveStore, outliner: OutlineManager) {
  ensureMobileHeaderStyles()

  const header = (document.querySelector('solid-ui-header') || document.createElement('solid-ui-header')) as ManagedHeader
  const isNewHeader = !header.isConnected
  if (!header.id) {
    header.id = 'mainSolidUiHeader'
  }
  header.__solidPanesOutliner = outliner

  // ensure it is in DOM (before MainContent for consistency)
  const main = document.getElementById('MainContent')
  if (!header.isConnected) {
    if (main && main.parentNode) {
      main.parentNode.insertBefore(header, main)
    } else {
      document.body.prepend(header)
    }
  }

  await refreshHeader(outliner, header)

  if (isNewHeader) {
    header.__solidPanesListenersAttached = false
  }

  attachHeaderListeners(header)

  return header
}

function attachHeaderListeners (header: ManagedHeader) {
  if (header.__solidPanesListenersAttached) return

  const refreshCurrentHeader = async () => {
    const outliner = header.__solidPanesOutliner
    if (!outliner) return
    await refreshHeader(outliner, header)
  }

  authSession.events.on('login', refreshCurrentHeader)
  authSession.events.on('logout', refreshCurrentHeader)
  authSession.events.on('sessionRestore', refreshCurrentHeader)

  header.addEventListener('auth-action-select', async (e: Event) => {
    const outliner = header.__solidPanesOutliner
    if (!outliner) return

    const detail = (e as CustomEvent).detail
    if (detail?.role === 'login') {
      await refreshCurrentHeader()
      // Do not auto-open the profile pane after login.
      // outliner.showDashboard({ pane: 'profile' })
    }
  })

  header.addEventListener('signup-success', async () => {
    // do nothing
  })

  header.addEventListener('account-menu-select', async (e: Event) => {
    const outliner = header.__solidPanesOutliner
    if (!outliner) return

    const detail = (e as CustomEvent).detail
    if (detail?.action === 'logout') {
      await refreshCurrentHeader()
      // Do not navigate to the profile after logout.
    } else if (detail?.action === 'show-profile') {
      // TODO see if this can be consolidated
      if (authn.currentUser()) {
        outliner.showDashboard({ pane: 'profile' })
      }
    }
  })

  header.__solidPanesListenersAttached = true
}

export async function refreshHeader (outliner: OutlineManager, headerElement?: Header) {
  ensureMobileHeaderStyles()
  const headerOptions = setHeaderOptions(outliner)
  const header = headerElement || document.querySelector('solid-ui-header') as Header | null
  if (!header) return null

  header.theme = headerOptions.theme
  header.layout = headerOptions.layout
  header.brandLink = headerOptions.brandLink
  header.logo = headerOptions.layout === 'desktop' ? headerOptions.logo : ''
  header.helpIcon = headerOptions.helpIcon
  header.helpMenuList = headerOptions.helpMenuList
  header.authState = headerOptions.authState
  header.loginAction = headerOptions.loginAction
  header.signUpAction = headerOptions.signUpAction
  header.accountMenu = await setUserMenu()
  header.logoutLabel = headerOptions.logoutLabel
  header.accountLabel = headerOptions.accountLabel
  header.accountAvatar = headerOptions.accountAvatar

  return header
}

function setHeaderOptions (outliner: OutlineManager) {
  const currentUser = authn.currentUser()
  const isAuthenticated = !!currentUser
  const authState: HeaderAuthState = isAuthenticated ? 'logged-in' : 'logged-out'
  const layout: Header['layout'] = outliner.context?.environment?.layout === 'mobile' ? 'mobile' : 'desktop'
  const theme: Header['theme'] = outliner.context?.environment?.theme === 'dark' ? 'dark' : 'light'

  const headerOptions = {
    logo: SOLID_ICON_URL,
    helpIcon: HELP_MENU_ICON,
    helpMenuList: HELP_MENU_LIST,
    layout,
    theme,
    brandLink: '/',
    authState,
    loginAction: {
      label: SIGN_IN_MENU_ITEM
    } as HeaderMenuItem,
    signUpAction: {
      label: SIGN_UP_MENU_ITEM,
      url: SIGN_UP__MENU_LINK,
    } as HeaderMenuItem,
    logoutLabel: SIGN_OUT_MENU_ITEM,
    accountLabel: isAuthenticated ? ACCOUNT_MENU_LABEL : '',
    accountAvatar: isAuthenticated ? widgets.findImage(currentUser) : undefined
  }

  return headerOptions
}

async function setUserMenu () {
  const me = authn.currentUser()
  if (!me) {
    return []
  }

  try {
    await store.fetcher.load(me.doc())
  } catch (err) {
    console.error('Unable to load user profile', err)
  }

  const accountMenu: HeaderAccountMenuItem[] = [
    {
      label: utils.label(me),
      avatar: widgets.findImage(me),
      webid: me.value,
      action: 'show-profile'
    },
    // TODO add all my available accounts
  ]

  return accountMenu
}
