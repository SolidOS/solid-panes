import { afterEach, describe, expect, it } from 'vitest'
import ResourceActionDialog from '../../../src/components/resource-action-dialog/ResourceActionDialog'

afterEach(() => {
  document.body.replaceChildren()
})

async function openDialog (confirmation: boolean) {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()
  const dialog = new ResourceActionDialog()
  dialog.title = confirmation ? 'Delete resource' : 'Resource deleted'
  dialog.message = 'Test resource message'
  dialog.confirmation = confirmation
  const result = dialog.open()
  document.body.appendChild(dialog)
  await dialog.updateComplete
  const wrapper = dialog.shadowRoot!.querySelector('solid-ui-dialog')!
  await (wrapper as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
  const action = dialog.shadowRoot!.querySelector('[data-initial-action]')!
  await (action as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
  const nativeDialog = wrapper.shadowRoot!.querySelector('dialog')!
  nativeDialog.close = () => {
    nativeDialog.removeAttribute('open')
    nativeDialog.dispatchEvent(new Event('close'))
  }
  return { dialog, result, trigger, nativeDialog }
}

describe('internal pane dialog', () => {
  it('names the dialog, focuses Cancel, and resolves native cancellation without deletion', async () => {
    const { dialog, result, trigger, nativeDialog } = await openDialog(true)
    expect(nativeDialog).toHaveAttribute('aria-label', 'Delete resource')
    expect(nativeDialog).toHaveAttribute('aria-description', 'Test resource message')
    const action = dialog.shadowRoot!.querySelector('[data-initial-action]')!
    expect(action.textContent?.trim()).toBe('Cancel')
    expect(action.shadowRoot!.activeElement).toBe(action.shadowRoot!.querySelector('button'))

    nativeDialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await expect(result).resolves.toBe(false)
    expect(dialog.isConnected).toBe(false)
    expect(trigger).toHaveFocus()
  })

  it('focuses OK for informational messages and resolves when removed externally', async () => {
    const { dialog, result, trigger } = await openDialog(false)
    const action = dialog.shadowRoot!.querySelector('[data-initial-action]')!
    expect(action.textContent?.trim()).toBe('OK')
    expect(action.shadowRoot!.activeElement).toBe(action.shadowRoot!.querySelector('button'))
    dialog.remove()
    await expect(result).resolves.toBe(false)
    expect(trigger).toHaveFocus()
  })

  it('wraps keyboard focus between the first and last actions', async () => {
    const { dialog } = await openDialog(true)
    const actions = Array.from(dialog.shadowRoot!.querySelectorAll('solid-ui-button'))
    const first = actions[0].shadowRoot!.querySelector('button')!
    const last = actions.at(-1)!.shadowRoot!.querySelector('button')!
    last.focus()
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true, cancelable: true }))
    expect(actions[0].shadowRoot!.activeElement).toBe(first)
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true, cancelable: true }))
    expect(actions.at(-1)!.shadowRoot!.activeElement).toBe(last)
  })
})
