import './menu.css'
import { OutlineManager } from '../outline/manager'
import { authn } from 'solid-logic'

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

export const buildMenuHtml = (isAuthenticated: boolean) => {
  if (!isAuthenticated) {
    return `
       <a class="menu-item" href="#profile">Profile</a>
    `
  }

  return `
    <a class="menu-item" href="#profile">Profile</a>
    <a class="menu-item" href="#pods">My Pods</a>
    <a class="menu-item" href="#contacts">Contacts</a>
    <a class="menu-item" href="#settings">Settings</a>
    <div class="menu-item" role="button" tabindex="0" id="MenuLogoutItem">Logout</div>
  `
}

export const updateMenuLayout = (layout: 'mobile' | 'desktop') => {
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

export const initResponsiveMenu = (outliner: OutlineManager) => {
  ensureMenuSkeleton()
  const navMenu = document.getElementById('NavMenu') as HTMLElement | null
  const menuToggle = document.getElementById('MenuToggleBtn') as HTMLElement | null
  const menuOverlay = document.getElementById('MenuOverlay') as HTMLElement | null

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

  const navMenuContent = document.getElementById('NavMenuContent')
  const me = authn.currentUser()
  if (navMenuContent) {
    navMenuContent.innerHTML = buildMenuHtml(!!me)

    navMenuContent.addEventListener('click', (event) => {
      const item = (event.target as HTMLElement).closest('.menu-item')
      const isMobile = outliner.context?.environment?.layout === 'mobile'
      if (item && isMobile) {
        closeMobileMenu()
      }
    })
  }
}
