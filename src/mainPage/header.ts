import { authSession, authn } from 'solid-logic'
import { icons, initHeader } from 'solid-ui'
/**
 * menu icons
*/
const HELP_MENU_ICON = icons.iconBase + 'noun_help.svg'
const SOLID_ICON_URL = 'https://solidproject.org/assets/img/solid-emblem.svg'

/**
 * menu elements
*/
const USER_GUIDE_MENU_ITEM = 'User guide'
const REPORT_A_PROBLEM_MENU_ITEM = 'Report a problem'
const SHOW_YOUR_PROFILE_MENU_ITEM = 'Show your profile'
const LOG_OUT_MENU_ITEM = 'Log out'
/**
 * URLS
 */
const USER_GUIDE_MENU_URL = 'https://solidos.github.io/userguide/'
const REPORT_A_PROBLEM_MENU_URL = 'https://github.com/solidos/solidos/issues'

export async function createHeader (store, outliner) {
  initHeader(store, await setUserMenu(outliner), setHeaderOptions())
}

function setHeaderOptions () {
  const helpMenuList = [
    { label: USER_GUIDE_MENU_ITEM, url: USER_GUIDE_MENU_URL, target: '_blank' },
    { label: REPORT_A_PROBLEM_MENU_ITEM, url: REPORT_A_PROBLEM_MENU_URL, target: '_blank' }
  ]
  const headerOptions = { logo: SOLID_ICON_URL, helpIcon: HELP_MENU_ICON, helpMenuList: helpMenuList }

  return headerOptions
}

async function setUserMenu (outliner: any) {
  const showProfile = {
    label: SHOW_YOUR_PROFILE_MENU_ITEM,
    onclick: () => openUserProfile(outliner)
  }

  const logOut = {
    label: LOG_OUT_MENU_ITEM,
    onclick: () => {
      authSession.logout()
    }
  }

  // the order of the menu is important here, show profile first and logout last
  let userMenuList = [] // was [showProfile] 
  userMenuList = userMenuList.concat(await getMenuItems(outliner))
  userMenuList.push(logOut)

  return userMenuList
}

// Does not work to jump to user profile, 
function openUserProfile (outliner: any) {
  outliner.GotoSubject(authn.currentUser(), true, undefined, true, undefined)
  location.reload()
}

async function getMenuItems (outliner: any) {
  const items = await outliner.getDashboardItems()
  return items.map((element) => {
    return {
      label: element.label,
      onclick: () => openDashboardPane(outliner, element.tabName || element.paneName)
    }
  })
}

async function openDashboardPane (outliner: any, pane: string): Promise<void> {
  outliner.showDashboard({
    pane
  })
}
