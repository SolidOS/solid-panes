import { describe, expect, it, vi } from 'vitest'

import '../../../src/components/navbar/Navbar'
import type { NavbarMenuItem } from '../../../src/components/navbar/Navbar'

describe('Navbar', () => {
  it('emits solid-ui-select and lets the parent handle async onSelected failures', async () => {
    const error = new Error('pane load failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const navbar = document.createElement('solid-panes-navbar') as any
    document.body.appendChild(navbar)

    navbar.navbarItems = [
      {
        label: 'Failing item',
        onSelected: async () => {
          await Promise.resolve()
          throw error
        }
      }
    ]

    const selectionChanged = vi.fn((event: Event) => {
      const selectedItem = (event as CustomEvent<NavbarMenuItem>).detail
      Promise.resolve(selectedItem.onSelected?.()).catch((error) => {
        console.error('Navbar menu item selection failed:', error)
      })
    })

    navbar.addEventListener('solid-ui-select', selectionChanged)

    if (typeof navbar.updateComplete === 'object') {
      await navbar.updateComplete
    }

    const button = navbar.shadowRoot?.querySelector('button') ?? navbar.querySelector('button')
    expect(button).toBeInstanceOf(HTMLButtonElement)

    button?.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(selectionChanged).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith('Navbar menu item selection failed:', error)

    consoleError.mockRestore()
  })

  it('dispatches solid-ui-select so the parent can own selected state', async () => {
    const navbar = document.createElement('solid-panes-navbar') as any
    document.body.appendChild(navbar)

    navbar.navbarItems = [
      { label: 'Item 1', selected: false },
      { label: 'Item 2', selected: true }
    ]

    const onSelected = vi.fn()
    const selectionChanged = vi.fn((event: Event) => {
      const selectedItem = (event as CustomEvent<NavbarMenuItem>).detail
      navbar.navbarItems = navbar.navbarItems.map((menuItem: any) => ({
        ...menuItem,
        selected: menuItem === selectedItem
      }))
      selectedItem.onSelected?.()
    })

    navbar.addEventListener('solid-ui-select', selectionChanged)

    if (typeof navbar.updateComplete === 'object') {
      await navbar.updateComplete
    }

    navbar.navbarItems = [
      { label: 'Item 1', selected: false, onSelected },
      { label: 'Item 2', selected: true }
    ]

    await new Promise((resolve) => setTimeout(resolve, 0))

    const button = navbar.shadowRoot?.querySelector('button') ?? navbar.querySelector('button')
    expect(button).toBeInstanceOf(HTMLButtonElement)

    button?.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(selectionChanged).toHaveBeenCalledTimes(1)
    expect(onSelected).toHaveBeenCalledTimes(1)
  })
})
