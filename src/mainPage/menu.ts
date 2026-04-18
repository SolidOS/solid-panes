import './menu.css'
import { OutlineManager } from '../outline/manager'
import { authSession } from 'solid-logic'

type MenuItem = {
  id?: string
  icon?: string
  paneName?: string
  label: string
  onclick: () => void | Promise<void>
}

const ensureMenuSkeleton = () => {
  const root = document.querySelector('[role="main"]') || document.body

  let navMenu = document.getElementById('NavMenu') as HTMLElement | null
  if (!navMenu) {
    navMenu = document.createElement('nav')
    navMenu.id = 'NavMenu'
    navMenu.className = 'app-nav'
    navMenu.setAttribute('aria-label', 'App navigation')

    const authStateEl = document.createElement('div')
    authStateEl.id = 'AuthState'
    authStateEl.className = 'menu-auth-state'
    navMenu.appendChild(authStateEl)

    const contentEl = document.createElement('div')
    contentEl.id = 'NavMenuContent'
    contentEl.className = 'menu-content'
    navMenu.appendChild(contentEl)

    root.insertBefore(navMenu, root.firstChild)
  }

  let toggle = document.getElementById('MenuToggleBtn') as HTMLButtonElement | null
  if (!toggle) {
    toggle = document.createElement('button')
    toggle.id = 'MenuToggleBtn'
    toggle.className = 'menu-toggle'
    toggle.type = 'button'
    toggle.setAttribute('aria-label', 'Toggle navigation menu')
    toggle.textContent = '\u2630'
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
}

const getMenuItems = async (outliner: any): Promise<MenuItem[]> => {
  try {
    const items = await outliner.getDashboardItems()
    return items.map((element) => {
      return {
        icon: element.icon,
        paneName: element.tabName || element.paneName,
        label: element.label,
        onclick: () => openDashboardPane(outliner, element.tabName || element.paneName)
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

  if (!activeItem && menuItems[0]) {
    menuItems[0].classList.add('menu-item-active')
    menuItems[0].setAttribute('aria-current', 'page')
    container.dataset.activePaneName = menuItems[0].dataset.paneName || ''
    return
  }

  if (paneName) {
    container.dataset.activePaneName = paneName
  }
}

const renderMenuItems = async (outliner: OutlineManager, container: HTMLElement) => {
  const menuItems = await getMenuItems(outliner)

  container.replaceChildren(...menuItems.map(createMenuButton))
  setActiveMenuItem(container, container.dataset.activePaneName)
}

export const refreshMenu = (layout: 'mobile' | 'desktop') => {
  const navMenu = document.getElementById('NavMenu') as HTMLElement | null
  const toggle = document.getElementById('MenuToggleBtn') as HTMLButtonElement | null
  const overlay = document.getElementById('MenuOverlay') as HTMLElement | null

  if (!navMenu || !toggle || !overlay) return

  if (layout === 'mobile') {
    navMenu.classList.add('mobile-hidden')
    navMenu.classList.remove('mobile-visible')
    toggle.hidden = false
    overlay.hidden = true
    navMenu.hidden = false
    toggle.setAttribute('aria-expanded', 'false')
  } else {
    navMenu.classList.remove('mobile-hidden', 'mobile-visible')
    toggle.hidden = true
    overlay.hidden = true
    navMenu.hidden = false
    toggle.setAttribute('aria-expanded', 'false')
  }
}

export const createLeftSideMenu = async (outliner: OutlineManager) => {
  ensureMenuSkeleton()
  const navMenu = document.getElementById('NavMenu') as HTMLElement | null
  const menuToggle = document.getElementById('MenuToggleBtn') as HTMLElement | null
  const menuOverlay = document.getElementById('MenuOverlay') as HTMLElement | null
  const navMenuContent = document.getElementById('NavMenuContent') as HTMLElement | null

  const closeMobileMenu = () => {
    if (!navMenu || !menuToggle || !menuOverlay) return
    navMenu.classList.remove('mobile-visible')
    navMenu.classList.add('mobile-hidden')
    menuToggle.setAttribute('aria-expanded', 'false')
    menuOverlay.hidden = true
  }

  const openMobileMenu = () => {
    if (!navMenu || !menuToggle || !menuOverlay) return
    navMenu.classList.remove('mobile-hidden')
    navMenu.classList.add('mobile-visible')
    menuToggle.setAttribute('aria-expanded', 'true')
    menuOverlay.hidden = false
  }

  if (menuToggle) {
    menuToggle.hidden = false
    menuToggle.addEventListener('click', () => {
      if (navMenu?.classList.contains('mobile-visible')) {
        closeMobileMenu()
      } else {
        openMobileMenu()
      }
    })
  }

  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMobileMenu)
  }

  if (navMenuContent) {
    await renderMenuItems(outliner, navMenuContent)

    if (!navMenuContent.dataset.authEventsBound) {
      const refreshMenuItems = async () => {
        await renderMenuItems(outliner, navMenuContent)
      }

      authSession.events.on('login', refreshMenuItems)
      authSession.events.on('logout', refreshMenuItems)
      authSession.events.on('sessionRestore', refreshMenuItems)
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

async function openDashboardPane (outliner: any, pane: string): Promise<void> {
  outliner.showDashboard({
    pane
  })
}