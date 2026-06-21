import './menu.css'
import { OutlineManager } from '../outline/manager'
import { authSession, authn } from 'solid-logic'
import { NamedNode, sym } from 'rdflib'
import { loadProfileFromURI } from '../profileUtils/ownerProfile'
import menuIcon from '../icons/menu.svg?raw'
import { createUiIcon } from '../icons/iconHelper'

type MenuItem = {
  id?: string
  icon?: string
  paneName?: string
  subject?: NamedNode
  label: string
  onclick: () => void | Promise<void>
}

const MENU_ICON = createUiIcon(menuIcon, 'Menu Icon', '#ffffff')
const MENU_COLLAPSED_KEY = 'solid-panes-menu-collapsed'
let menuCollapsed = false

const loadMenuCollapsedState = (): boolean => {
  try {
    return localStorage.getItem(MENU_COLLAPSED_KEY) === 'true'
  } catch (error) {
    return false
  }
}

const saveMenuCollapsedState = (collapsed: boolean): void => {
  try {
    localStorage.setItem(MENU_COLLAPSED_KEY, String(collapsed))
  } catch (error) {
    // ignore storage errors
  }
}

const updateMenuCollapseButton = (): void => {
  const collapseBtn = document.getElementById('MenuCollapseBtn') as HTMLButtonElement | null
  if (!collapseBtn) return
  collapseBtn.textContent = menuCollapsed ? '\u203A' : '\u2039'
  collapseBtn.setAttribute('aria-label', menuCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu')
}

const updateCollapseButtonPosition = (navMenu: HTMLElement | null, collapseBtn: HTMLButtonElement | null): void => {
  if (!navMenu || !collapseBtn) return
  const navRect = navMenu.getBoundingClientRect()
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const buttonWidth = parseFloat(getComputedStyle(collapseBtn).width) || 1.25 * rootFontSize
  const offsetRem = (navRect.width - buttonWidth / 2) / rootFontSize
  collapseBtn.style.setProperty('left', `${offsetRem.toFixed(3)}rem`, 'important')
}

const applyMenuCollapsedState = (navMenu: HTMLElement | null): void => {
  if (!navMenu) return
  navMenu.classList.toggle('collapsed', menuCollapsed)
  updateMenuCollapseButton()
  const collapseBtn = document.getElementById('MenuCollapseBtn') as HTMLButtonElement | null
  updateCollapseButtonPosition(navMenu, collapseBtn)
}

const refreshAuthStateFromSession = async (): Promise<boolean> => {
  try {
    const webId = await authn.checkUser()
    return Boolean(webId || authn.currentUser())
  } catch {
    // Keep the menu responsive even if auth refresh is transiently unavailable.
    return Boolean(authn.currentUser())
  }
}

const isLoggedIn = (): boolean => Boolean(authn.currentUser())

const setFooterVisibility = (loggedIn: boolean): void => {
  const footer = document.querySelector('solid-ui-footer') as HTMLElement | null
  if (!footer) return
  footer.style.display = loggedIn ? 'none' : ''
}

const isViewingOwnProfile = (subject: NamedNode): boolean => {
  const currentUser = authn.currentUser()
  return Boolean(currentUser && subject && currentUser.sameTerm(subject))
}

const ensureMenuSkeleton = () => {
  menuCollapsed = loadMenuCollapsedState()
  const root = document.querySelector('[role="main"]') || document.body

  let navMenu = document.getElementById('NavMenu') as HTMLElement | null
  if (!navMenu) {
    navMenu = document.createElement('nav')
    navMenu.id = 'NavMenu'
    navMenu.className = 'app-nav'
    navMenu.setAttribute('aria-label', 'App navigation')
    navMenu.hidden = true

    const headerEl = document.createElement('div')
    headerEl.className = 'menu-header'

    const closeBtn = document.createElement('button')
    closeBtn.id = 'MenuCloseBtn'
    closeBtn.className = 'menu-close'
    closeBtn.type = 'button'
    closeBtn.setAttribute('aria-label', 'Close menu')
    closeBtn.textContent = '✕'
    headerEl.appendChild(closeBtn)

    const title = document.createElement('span')
    title.className = 'menu-header-title'
    title.textContent = 'Menu'
    headerEl.appendChild(title)

    navMenu.appendChild(headerEl)

    const authStateEl = document.createElement('div')
    authStateEl.id = 'AuthState'
    authStateEl.className = 'menu-auth-state'
    navMenu.appendChild(authStateEl)

    const contentEl = document.createElement('div')
    contentEl.id = 'NavMenuContent'
    contentEl.className = 'menu-content'
    navMenu.appendChild(contentEl)

    root.insertBefore(navMenu, root.firstChild)
  } else if (!navMenu.querySelector('.menu-header')) {
    const headerEl = document.createElement('div')
    headerEl.className = 'menu-header'

    const closeBtn = document.createElement('button')
    closeBtn.id = 'MenuCloseBtn'
    closeBtn.className = 'menu-close'
    closeBtn.type = 'button'
    closeBtn.setAttribute('aria-label', 'Close menu')
    closeBtn.textContent = '✕'
    headerEl.appendChild(closeBtn)

    const title = document.createElement('span')
    title.className = 'menu-header-title'
    title.textContent = 'Menu'
    headerEl.appendChild(title)

    navMenu.insertBefore(headerEl, navMenu.firstChild)
  }

  let toggle = document.getElementById('MenuToggleBtn') as HTMLButtonElement | null
  if (!toggle) {
    toggle = document.createElement('button')
    toggle.id = 'MenuToggleBtn'
    toggle.className = 'menu-toggle'
    toggle.type = 'button'
    toggle.setAttribute('aria-label', 'Toggle navigation menu')
    toggle.hidden = true
    const toggleImg = document.createElement('img')
    toggleImg.src = MENU_ICON
    toggleImg.alt = ''
    toggleImg.className = 'menu-toggle-icon'
    toggleImg.setAttribute('aria-hidden', 'true')
    toggle.appendChild(toggleImg)
    const toggleLabel = document.createElement('span')
    toggleLabel.id = 'MenuToggleLabel'
    toggleLabel.className = 'menu-toggle-label'
    toggle.appendChild(toggleLabel)
    root.insertBefore(toggle, root.firstChild)
  }

  let overlay = document.getElementById('MenuOverlay') as HTMLElement | null
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'MenuOverlay'
    overlay.className = 'menu-overlay'
    overlay.hidden = true
    document.body.appendChild(overlay)
  }

  let collapseBtn = document.getElementById('MenuCollapseBtn') as HTMLButtonElement | null
  if (!collapseBtn) {
    collapseBtn = document.createElement('button')
    collapseBtn.id = 'MenuCollapseBtn'
    collapseBtn.className = 'menu-collapse'
    collapseBtn.type = 'button'
    collapseBtn.setAttribute('aria-label', 'Collapse navigation menu')
    collapseBtn.textContent = '\u2039'
    collapseBtn.hidden = true
    document.body.appendChild(collapseBtn)
  }
}

const getMenuItems = async (subject: NamedNode, outliner: any): Promise<MenuItem[]> => {
  try {
    const items = await outliner.getDashboardItems(subject)
    return items.map((element) => {
      const targetSubject = element.subject || (authn.currentUser() || subject)
      return {
        icon: element.icon,
        subject: targetSubject,
        paneName: element.tabName || element.paneName,
        label: element.label,
        onclick: () => openDashboardPane(targetSubject, outliner, element.tabName || element.paneName)
      }
    })
  } catch (error) {
    console.error('Unable to load navigation menu items', error)
    return []
  }
}

const createMenuButton = (item: MenuItem) => {
  const button = document.createElement('button')
  button.className = 'menu-item'
  button.type = 'button'
  if (item.paneName) {
    button.dataset.paneName = item.paneName
  }

  if (item.icon) {
    const icon = document.createElement('img')
    icon.className = 'menu-item-icon'
    icon.src = item.icon
    icon.alt = ''
    icon.setAttribute('aria-hidden', 'true')
    button.appendChild(icon)
  }

  const label = document.createElement('span')
  label.className = 'menu-item-label'
  label.textContent = item.label
  button.appendChild(label)

  if (item.id) {
    button.id = item.id
  }

  button.addEventListener('click', async () => {
    await item.onclick()
  })

  return button
}

const setActiveMenuItem = (container: HTMLElement, paneName?: string) => {
  const menuItems = Array.from(container.querySelectorAll<HTMLButtonElement>('.menu-item'))
  let activeItem: HTMLButtonElement | undefined

  menuItems.forEach((item) => {
    const isActive = Boolean(paneName) && item.dataset.paneName === paneName
    item.classList.toggle('menu-item-active', isActive)
    if (isActive) {
      item.setAttribute('aria-current', 'page')
      activeItem = item
    } else {
      item.removeAttribute('aria-current')
    }
  })

  if (paneName) {
    if (!activeItem && menuItems[0]) {
      // If an explicit pane name is provided but does not match any menu
      // item, fall back to clearing selection rather than selecting the first item.
      container.dataset.activePaneName = ''
    } else {
      container.dataset.activePaneName = paneName
    }
  } else {
    // If there is no active pane, do not auto-select the first menu item.
    container.dataset.activePaneName = ''
  }

  updateToggleLabel(activeItem)
}

export const setActiveMenuPane = (paneName?: string): void => {
  const navMenuContent = document.getElementById('NavMenuContent') as HTMLElement | null
  if (!navMenuContent) return
  setActiveMenuItem(navMenuContent, paneName)
}

const updateToggleLabel = (activeItem?: HTMLButtonElement): void => {
  const toggleLabel = document.getElementById('MenuToggleLabel')
  if (!toggleLabel) return
  toggleLabel.textContent = activeItem?.querySelector('.menu-item-label')?.textContent || ''
}

const renderMenuItems = async (subject: NamedNode, outliner: OutlineManager, container: HTMLElement) => {
  const menuItems = await getMenuItems(subject, outliner)

  container.replaceChildren(...menuItems.map(createMenuButton))
  // If the user is logged in and viewing their own profile, select "Your profile"
  // by default. This also surfaces "Your profile" at the top of the mobile view
  // via the menu toggle label, which mirrors the active menu item.
  const activePane = isViewingOwnProfile(subject)
    ? 'profile'
    : container.dataset.activePaneName
  setActiveMenuItem(container, activePane)
}

export const refreshMenu = (layout: 'mobile' | 'desktop') => {
  const navMenu = document.getElementById('NavMenu') as HTMLElement | null
  const toggle = document.getElementById('MenuToggleBtn') as HTMLButtonElement | null
  const collapseBtn = document.getElementById('MenuCollapseBtn') as HTMLButtonElement | null
  const overlay = document.getElementById('MenuOverlay') as HTMLElement | null

  if (!navMenu || !toggle || !overlay || !collapseBtn) return

  const loggedIn = isLoggedIn()
  if (!loggedIn) {
    navMenu.hidden = true
    navMenu.style.display = 'none'
    toggle.hidden = true
    toggle.style.display = 'none'
    collapseBtn.hidden = true
    collapseBtn.style.display = 'none'
    overlay.hidden = true
    overlay.style.display = 'none'
    setFooterVisibility(false)
    return
  }

  setFooterVisibility(true)

  if (layout === 'mobile') {
    navMenu.classList.add('mobile-hidden')
    navMenu.classList.remove('mobile-visible')
    toggle.hidden = false
    toggle.style.display = ''
    collapseBtn.hidden = true
    collapseBtn.style.display = 'none'
    overlay.hidden = true
    overlay.style.display = 'none'
    navMenu.hidden = false
    navMenu.style.display = ''
    navMenu.classList.remove('collapsed')
    toggle.setAttribute('aria-expanded', 'false')
  } else {
    navMenu.classList.remove('mobile-hidden', 'mobile-visible')
    toggle.hidden = true
    toggle.style.display = 'none'
    collapseBtn.hidden = false
    collapseBtn.style.display = ''
    overlay.hidden = true
    overlay.style.display = 'none'
    navMenu.hidden = false
    navMenu.style.display = ''
    applyMenuCollapsedState(navMenu)
    updateCollapseButtonPosition(navMenu, collapseBtn)
    toggle.setAttribute('aria-expanded', 'false')
  }
}

export const createLeftSideMenu = async (subject: NamedNode, outliner: OutlineManager) => {
  ensureMenuSkeleton()
  const navMenu = document.getElementById('NavMenu') as HTMLElement | null
  const menuToggle = document.getElementById('MenuToggleBtn') as HTMLElement | null
  const menuOverlay = document.getElementById('MenuOverlay') as HTMLElement | null
  const navMenuContent = document.getElementById('NavMenuContent') as HTMLElement | null
  await refreshAuthStateFromSession()

  const closeMobileMenu = () => {
    if (!navMenu || !menuToggle || !menuOverlay) return
    navMenu.classList.remove('mobile-visible')
    navMenu.classList.add('mobile-hidden')
    navMenu.style.display = ''
    menuToggle.setAttribute('aria-expanded', 'false')
    menuOverlay.hidden = true
    menuOverlay.style.display = 'none'
  }

  const openMobileMenu = () => {
    if (!navMenu || !menuToggle || !menuOverlay) return
    navMenu.classList.remove('mobile-hidden')
    navMenu.classList.add('mobile-visible')
    navMenu.style.display = ''
    menuToggle.setAttribute('aria-expanded', 'true')
    menuOverlay.hidden = false
    menuOverlay.style.display = ''
  }

  const collapseBtn = document.getElementById('MenuCollapseBtn') as HTMLButtonElement | null

  const expandDesktopMenu = () => {
    if (!navMenu || !collapseBtn) return
    if (!menuCollapsed) return
    menuCollapsed = false
    saveMenuCollapsedState(menuCollapsed)
    applyMenuCollapsedState(navMenu)
  }

  if (navMenu) {
    navMenu.addEventListener('click', (event) => {
      const isMobile = outliner.context?.environment?.layout === 'mobile'
      const clickedCollapseButton = (event.target as HTMLElement).closest('#MenuCollapseBtn')
      if (!isMobile && menuCollapsed && !clickedCollapseButton) {
        expandDesktopMenu()
      }
    })
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (navMenu?.classList.contains('mobile-visible')) {
        closeMobileMenu()
      } else {
        openMobileMenu()
      }
    })
  }
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      menuCollapsed = !menuCollapsed
      saveMenuCollapsedState(menuCollapsed)
      applyMenuCollapsedState(navMenu)
    })
  }

  const updateMenuVisibility = () => {
    const loggedIn = isLoggedIn()
    if (navMenu) {
      navMenu.hidden = !loggedIn
      navMenu.style.display = loggedIn ? '' : 'none'
    }
    if (menuToggle) {
      menuToggle.hidden = !loggedIn
      menuToggle.style.display = loggedIn ? '' : 'none'
    }
    if (collapseBtn) {
      collapseBtn.hidden = !loggedIn
      collapseBtn.style.display = loggedIn ? '' : 'none'
    }
    if (menuOverlay) {
      menuOverlay.hidden = !loggedIn
      menuOverlay.style.display = loggedIn ? '' : 'none'
    }
    setFooterVisibility(loggedIn)
  }

  updateMenuVisibility()

  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMobileMenu)
  }

  const closeBtn = document.getElementById('MenuCloseBtn') as HTMLButtonElement | null
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileMenu)
  }

  if (navMenuContent) {
    updateMenuVisibility()
    const loggedIn = isLoggedIn()
    if (loggedIn) {
      await renderMenuItems(subject, outliner, navMenuContent)
    }

    if (!navMenuContent.dataset.authEventsBound) {
      const refreshMenuItems = async () => {
        await renderMenuItems(subject, outliner, navMenuContent)
      }

      authSession.events.on('login', async () => {
        await refreshAuthStateFromSession()
        updateMenuVisibility()
        refreshMenu(outliner.context?.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
        await refreshMenuItems()
      })
      authSession.events.on('logout', async () => {
        await refreshAuthStateFromSession()
        updateMenuVisibility()
        refreshMenu(outliner.context?.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
        await refreshMenuItems()
      })
      authSession.events.on('sessionRestore', async () => {
        await refreshAuthStateFromSession()
        updateMenuVisibility()
        refreshMenu(outliner.context?.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
        await refreshMenuItems()
      })
      navMenuContent.dataset.authEventsBound = 'true'
    }

    navMenuContent.addEventListener('click', (event) => {
      const item = (event.target as HTMLElement).closest('.menu-item')
      if (item instanceof HTMLButtonElement) {
        setActiveMenuItem(navMenuContent, item.dataset.paneName)
      }
      const isMobile = outliner.context?.environment?.layout === 'mobile'
      if (item && isMobile) {
        closeMobileMenu()
      }
    })
  }

  refreshMenu(outliner.context?.environment?.layout === 'mobile' ? 'mobile' : 'desktop')
}

async function openDashboardPane (subject, outliner: any, pane: string): Promise<void> {
  const me = authn.currentUser()
  if (!subject) {
    if (me) {
      subject = me
    } else {
      const store = outliner?.context?.store || outliner?.context?.session?.store || outliner?.kb
      const fetcher = outliner?.context?.fetcher || store?.fetcher
      if (!store || !fetcher) {
        throw new Error('Unable to load profile: missing RDF store or fetcher')
      }
      const fallbackUri = sym(window.location.href)
      subject = await loadProfileFromURI(subject || fallbackUri, store, fetcher)
    }
  }
  outliner.showDashboard(subject, {
    pane
  })
}
