import { authn } from 'solid-logic'
import { html, render } from 'lit-html'
import type { AccountMenuItem } from 'solid-ui/components/account'

import { setActiveMenuPane } from './menu'
import type { OutlineManager } from '../outline/manager'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '~icons/lucide/layout-dashboard'
import '~icons/lucide/settings-2'
import '../components/header'

export async function createHeader (outliner: OutlineManager) {
  const existingHeader = document.querySelector('solid-panes-header')

  if (existingHeader) {
    return existingHeader
  }

  const main = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  const menuItems: AccountMenuItem[] = [
    {
      label: html`<icon-lucide-user slot="left-icon"></icon-lucide-user> Profile`,
      onSelected () {
        const currentUser = authn.currentUser()

        if (currentUser) {
          outliner.showDashboard(currentUser, { pane: 'profile' })
          setActiveMenuPane('profile')
        }
      }
    },
    {
      label: html`<icon-lucide-users slot="left-icon"></icon-lucide-users> Friends`,
      onSelected () {
        const currentUser = authn.currentUser()

        if (currentUser) {
          outliner.showDashboard(currentUser, { pane: 'social' })
          setActiveMenuPane('social')
        }
      }
    },
    {
      label: html`<icon-lucide-folder-open slot="left-icon"></icon-lucide-folder-open> Storage`,
      onSelected () {
        const currentUser = authn.currentUser()

        if (currentUser) {
          outliner.showDashboard(currentUser, { pane: 'folder' })
          setActiveMenuPane('folder')
        }
      }
    },
    {
      label: html`<icon-lucide-layout-dashboard slot="left-icon"></icon-lucide-layout-dashboard> Dashboard`,
      onSelected () {
        const currentUser = authn.currentUser()

        if (currentUser) {
          outliner.showDashboard(currentUser, { pane: 'home' })
          setActiveMenuPane('home')
        }
      }
    },
    {
      label: html`<icon-lucide-settings-2 slot="left-icon"></icon-lucide-settings-2> Preferences`,
      onSelected () {
        const currentUser = authn.currentUser()

        if (currentUser) {
          outliner.showDashboard(currentUser, { pane: 'basicPreferences' })
          setActiveMenuPane('basicPreferences')
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
