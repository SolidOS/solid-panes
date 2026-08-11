import { describe, expect, it } from 'vitest'

import '../../../src/components/resource-actions-menu/DeleteResourceDialog'

describe('DeleteResourceDialog', () => {
  it('renders a generic delete prompt when resourceNode has no value', async () => {
    const dialog = document.createElement('resource-delete-dialog') as any
    dialog.resourceNode = {} as any
    document.body.appendChild(dialog)

    await dialog.updateComplete

    expect(dialog.shadowRoot?.textContent).toContain('Are you sure you want to permanently delete this resource?')
  })
})
