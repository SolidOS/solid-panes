import { authn } from 'solid-logic'
import { html, render } from 'lit-html'
import type { AccountMenuItem } from 'solid-ui/components/account'

import { setActiveMenuPane } from './menu'
import type { OutlineManager } from '../outline/manager'

import '~icons/lucide/user'
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
    }
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
