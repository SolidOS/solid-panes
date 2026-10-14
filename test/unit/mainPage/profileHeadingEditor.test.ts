import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { createHeadingEditDialog, type ProfileDetails } from '../../../src/components/profile-heading/editor'
import { refreshProfileHeading } from '../../../src/mainPage/profileHeading'
import {
  getSharedDialogCancelButton,
  getSharedDialogSaveButton
} from '../../../src/components/profile-heading/editor/ui/dialog'

const attachInternalsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'attachInternals')

vi.mock('../../../src/utils/webIdUtils', () => ({
  loadProfileFromURI: async (subject: ReturnType<typeof sym>) => subject
}))

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
    configurable: true,
    value: () => ({
      setFormValue: () => undefined,
      setValidity: () => undefined,
      checkValidity: () => true,
      reportValidity: () => true,
      validity: {},
      validationMessage: '',
      willValidate: false,
      states: new Set()
    })
  })
})

afterEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  vi.restoreAllMocks()
})

afterAll(() => {
  if (attachInternalsDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'attachInternals', attachInternalsDescriptor)
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'attachInternals')
  }
})

describe('local profile heading editor', () => {
  it('opens the local dialog when the owner clicks Edit on the mounted heading', async () => {
    const subject = sym('https://local-heading-editor.example/profile/card#owner')
    store.add(subject, ns.vcard('fn'), lit('Heading Owner'), subject.doc())
    vi.spyOn(authn, 'currentUser').mockReturnValue(subject)
    vi.spyOn(store.updater, 'editable').mockReturnValue(true)
    const consoleError = vi.spyOn(console, 'error')

    const mainContent = document.createElement('main')
    mainContent.id = 'MainContent'
    document.body.appendChild(mainContent)
    window.history.replaceState({ paneName: 'profile', paneUri: subject.value }, '', '/')
    await refreshProfileHeading(true)

    const heading = document.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>('solid-panes-profile-heading')
    await heading?.updateComplete
    const editButton = heading?.shadowRoot?.querySelector<HTMLElement>('.desktop-edit-button')
    expect(editButton).not.toBeNull()
    editButton?.click()

    await vi.waitFor(() => {
      expect(document.querySelector('#profile-modal')).toHaveAttribute('open')
      expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Heading Owner')
    })
    expect(consoleError).not.toHaveBeenCalled()

    getSharedDialogCancelButton(document)?.click()
    await vi.waitFor(() => {
      expect(document.querySelector('#profile-modal')).not.toHaveAttribute('open')
    })
  })

  it('validates phone input and closes through the local dialog controls', async () => {
    const subject = sym('https://local-heading-editor.example/profile/card#me')
    const profileData: ProfileDetails = {
      entryNode: subject,
      name: 'Jane Doe'
    }
    const resultPromise = createHeadingEditDialog(
      new MouseEvent('click', { bubbles: true, composed: true }),
      store,
      subject,
      profileData,
      'owner'
    )

    await vi.waitFor(() => {
      expect(document.querySelector('input[name="phone-value"]')).not.toBeNull()
    })

    const phoneInput = document.querySelector<HTMLInputElement>('input[name="phone-value"]')!
    phoneInput.value = '555 123 4567'
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }))
    getSharedDialogSaveButton(document)?.click()

    await vi.waitFor(() => {
      expect(document.querySelector('#modal-error')?.textContent)
        .toBe('Phone Number 1 should contain only numbers.')
    })

    getSharedDialogCancelButton(document)?.click()
    await resultPromise
  })
})
