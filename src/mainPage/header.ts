import { authn } from 'solid-logic'
import { html, render } from 'lit-html'
import type { AccountMenuItem } from 'solid-ui/components/account'
import type { OutlineManager } from '../outline/manager'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '~icons/lucide/layout-dashboard'
import '~icons/lucide/settings-2'
import '../components/header'
import { getProfilePaneFromURI, getSocialPaneFromURI, getFolderPanesFromURI } from '../utils/paneUtils'
import { sym } from 'rdflib'

export async function createHeader (outliner: OutlineManager) {
  const existingHeader = document.querySelector('solid-panes-header')

  if (existingHeader) {
    return existingHeader
  }

  const me = authn.currentUser()

  const main = document.getElementById('MainContent')
  const outlineView = document.getElementById('OutlineView')
  const tmpContainer = document.createElement('div')

  function hideNavbar () {
    const navbar = document.querySelector<HTMLElement>('solid-panes-navbar')
    if (navbar) {
      navbar.classList.add('navbar--hidden')
    }
  }

  const storagePanes = me ? await getFolderPanesFromURI(me) : []
  const storageMenuItems: AccountMenuItem[] = storagePanes.map(pane => ({
    label: html`<icon-lucide-folder-open slot="left-icon"></icon-lucide-folder-open> ${pane.label()}`,
    async onSelected () {
      hideNavbar()
      if (me) {
        outliner.GotoSubject(sym(window.location.href), true, pane, true, undefined, outlineView, false)
      }
    }
  }))
  const menuItems: AccountMenuItem[] = [
    {
      label: html`<icon-lucide-user slot="left-icon"></icon-lucide-user> Profile`,
      async onSelected () {
        hideNavbar()
        if (me) {
          const profilePane = await getProfilePaneFromURI(me)
          outliner.GotoSubject(sym(window.location.href), true, profilePane, true, undefined, outlineView, false)
        }
      }
    },
    {
      label: html`<icon-lucide-users slot="left-icon"></icon-lucide-users> Friends`,
      async onSelected () {
        hideNavbar()
        if (me) {
          const socialPane = await getSocialPaneFromURI(me)
          outliner.GotoSubject(sym(window.location.href), true, socialPane, true, undefined, outlineView, false)
        }
      }
    },
    ...storageMenuItems,
    {
      label: html`<icon-lucide-layout-dashboard slot="left-icon"></icon-lucide-layout-dashboard> Dashboard`,
      onSelected () {
        hideNavbar()
        if (me) {
          const pane = outliner.context.session.paneRegistry.byName('home')
          if (pane) {
            outliner.GotoSubject(sym(window.location.href), true, pane, true, undefined, outlineView, false)
          }
        }
      }
    },
    {
      label: html`<icon-lucide-settings-2 slot="left-icon"></icon-lucide-settings-2> Preferences`,
      onSelected () {
        hideNavbar()
        if (me) {
          const pane = outliner.context.session.paneRegistry.byName('basicPreferences')
          if (pane) {
            outliner.GotoSubject(sym(window.location.href), true, pane, true, undefined, outlineView, false)
          }
        }
      }
    },
  ]

  render(
    html`<solid-panes-header .menuItems=${menuItems}></solid-panes-header>`,
    tmpContainer
  )

  const header = tmpContainer.firstElementChild

  if (!header) {
    throw new Error('Failed to create header')
  }

  // ensure it is in DOM (before MainContent for consistency)
  if (main && main.parentNode) {
    main.parentNode.insertBefore(header, main)
  } else {
    document.body.prepend(header)
  }

  return header
}
