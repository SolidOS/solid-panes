import './dialog.css'
import 'solid-ui/components/button'
import '~icons/lucide/x'
import { html, render } from 'lit-html'
import { createSpinner } from './spinner'
import { formatDisplayError } from '../utils/errorDisplay'

const closeIcon = html`<icon-lucide-x aria-hidden="true" focusable="false" style="width:12px;height:12px;color:#667085"></icon-lucide-x>`

/* Copied from issue-pane, minor typescript adjustments */
/* Changed modal from div to dialog element */
let modalDialog: HTMLDialogElement | null = null

const scrollLockState = new WeakMap<Document, {
  count: number,
  previousHtmlOverflow: string,
  previousBodyOverflow: string,
  removeScrollGuard: (() => void) | null
}>()

function getEventTargetElement (target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target
  if (target instanceof Node) return target.parentElement
  return null
}

function getEventPath (event: Event): EventTarget[] {
  if (typeof event.composedPath === 'function') {
    return event.composedPath()
  }

  return event.target ? [event.target] : []
}

function isDialogScrollRegionTarget (event: Event): boolean {
  const path = getEventPath(event)
  const description = modalDialog?.querySelector('#modal-desc')

  if (description && path.includes(description)) {
    return true
  }

  if (modalDialog && path.includes(modalDialog)) {
    return true
  }

  const targetElement = getEventTargetElement(event.target)
  if (!targetElement || !modalDialog || !modalDialog.contains(targetElement)) {
    return false
  }

  return Boolean(targetElement.closest('#modal-desc'))
}

function getDocumentScrollLockState (dom: Document) {
  let state = scrollLockState.get(dom)
  if (!state) {
    state = {
      count: 0,
      previousHtmlOverflow: dom.documentElement.style.overflow,
      previousBodyOverflow: dom.body.style.overflow,
      removeScrollGuard: null
    }
    scrollLockState.set(dom, state)
  }
  return state
}

function installDocumentScrollGuard (dom: Document): void {
  const state = getDocumentScrollLockState(dom)
  if (state.removeScrollGuard) return

  const preventBackgroundScroll = (event: Event) => {
    if (!isDialogScrollRegionTarget(event)) {
      event.preventDefault()
    }
  }

  dom.addEventListener('wheel', preventBackgroundScroll, { capture: true, passive: false })
  dom.addEventListener('touchmove', preventBackgroundScroll, { capture: true, passive: false })
  state.removeScrollGuard = () => {
    dom.removeEventListener('wheel', preventBackgroundScroll, true)
    dom.removeEventListener('touchmove', preventBackgroundScroll, true)
    state.removeScrollGuard = null
  }
}

function lockDocumentScroll (dom: Document): void {
  const state = getDocumentScrollLockState(dom)

  if (state.count === 0) {
    state.previousHtmlOverflow = dom.documentElement.style.overflow
    state.previousBodyOverflow = dom.body.style.overflow

    dom.documentElement.style.overflow = 'hidden'
    dom.body.style.overflow = 'hidden'
    installDocumentScrollGuard(dom)
  }

  state.count += 1
}

function unlockDocumentScroll (dom: Document): void {
  const state = getDocumentScrollLockState(dom)
  if (state.count === 0) return

  state.count -= 1
  if (state.count > 0) return

  dom.documentElement.style.overflow = state.previousHtmlOverflow
  dom.body.style.overflow = state.previousBodyOverflow
  state.removeScrollGuard?.()
  state.removeScrollGuard = null
}

function getDialogMountTarget (dom: Document): HTMLElement {
  return dom.body
}

type DialogButtonValue = boolean | 'save' | null
type DialogButton = {
  label: string,
  value: DialogButtonValue,
  primary?: boolean,
  cancel?: boolean,
  beforeClose?: () => Promise<boolean> | boolean
}

type DialogHeaderAction =
  | { type: 'close' }
  | { type: 'none' }
  | {
    type: 'button',
    label: string,
    ariaLabel?: string,
    className?: string,
    onClick?: () => Promise<void> | void
  }

type DialogElements = {
  dialog: HTMLDialogElement,
  title: HTMLHeadingElement,
  headerAction: HTMLDivElement,
  description: HTMLDivElement,
  error: HTMLElement,
  buttons: HTMLDivElement,
  savingOverlay: HTMLDivElement
}

type DialogActionControl = HTMLElement & {
  disabled?: boolean,
  label?: string,
  click: () => void,
  shadowRoot?: ShadowRoot | null
}

function isSolidUiButton (control: Element | null): control is DialogActionControl {
  return control?.tagName === 'SOLID-UI-BUTTON'
}

function setDialogActionDisabled (control: DialogActionControl | null, disabled: boolean): void {
  if (!control) return
  control.disabled = disabled
  control.toggleAttribute('disabled', disabled)
}

function setDialogActionLabel (control: DialogActionControl | null, label: string): void {
  if (!control) return

  if (isSolidUiButton(control)) {
    control.label = label
    control.setAttribute('label', label)
    control.textContent = label
    return
  }

  ;(control as HTMLElement).textContent = label
}

export function getSharedDialogSaveButton (root: ParentNode): DialogActionControl | null {
  return root.querySelector('#modal-buttons [data-dialog-primary="true"]') as DialogActionControl | null
}

export function getSharedDialogCancelButton (root: ParentNode): DialogActionControl | null {
  return root.querySelector('#modal-buttons [data-cancel="true"]') as DialogActionControl | null
}

function ensureModalDialog (dom: Document): HTMLDialogElement {
  const mountTarget = getDialogMountTarget(dom)

  // if we previously created a dialog but it was removed from the document
  // (tests clear body), rebuild it. Checking presence ensures our reference
  // doesn't point at a detached element.
  if (modalDialog && dom.body.contains(modalDialog)) {
    if (modalDialog.parentElement !== mountTarget) {
      mountTarget.appendChild(modalDialog)
    }
    return modalDialog
  }

  modalDialog = null
  modalDialog = dom.createElement('dialog')
  modalDialog.id = 'profile-modal'
  modalDialog.setAttribute('aria-modal', 'true')
  modalDialog.setAttribute('aria-labelledby', 'modal-title')
  modalDialog.setAttribute('aria-describedby', 'modal-desc')

  modalDialog.innerHTML = `
    <div class="modal">
      <div class="modal-header flex-row align-center justify-between">
        <h2 id="modal-title"></h2>
        <div id="modal-header-action" class="flex-row align-center"></div>
      </div>
      <div id="modal-desc"></div>
      <section id="modal-error" class="modal__error-section" aria-live="assertive" aria-atomic="true" aria-hidden="true" role="alert" tabindex="-1" hidden></section>
      <div id="modal-buttons" class="flex-row align-center justify-end"></div>
      <div id="modal-saving-overlay" hidden></div>
    </div>
  `

  mountTarget.appendChild(modalDialog)
  return modalDialog
}

function getDialogElements (dialog: HTMLDialogElement): DialogElements {
  return {
    dialog,
    title: dialog.querySelector('#modal-title') as HTMLHeadingElement,
    headerAction: dialog.querySelector('#modal-header-action') as HTMLDivElement,
    description: dialog.querySelector('#modal-desc') as HTMLDivElement,
    error: dialog.querySelector('#modal-error') as HTMLElement,
    buttons: dialog.querySelector('#modal-buttons') as HTMLDivElement,
    savingOverlay: dialog.querySelector('#modal-saving-overlay') as HTMLDivElement
  }
}

function syncDialogErrorDescription (elements: DialogElements): void {
  const defaultDescription = 'modal-desc'
  const describedBy = elements.error.hidden || !elements.error.textContent?.trim()
    ? defaultDescription
    : `${defaultDescription} modal-error`

  elements.dialog.setAttribute('aria-describedby', describedBy)
}

function clearModalError (elements: DialogElements): void {
  elements.error.textContent = ''
  elements.error.setAttribute('aria-hidden', 'true')
  elements.error.hidden = true
  syncDialogErrorDescription(elements)
}

function setModalError (elements: DialogElements, error: unknown, fallbackMessage?: string): void {
  elements.error.textContent = formatDisplayError(error, fallbackMessage)
  elements.error.setAttribute('aria-hidden', 'false')
  elements.error.hidden = false
  syncDialogErrorDescription(elements)
}

function openDialogElement (dialog: HTMLDialogElement): void {
  lockDocumentScroll(dialog.ownerDocument)

  if (typeof dialog.showModal === 'function') {
    try {
      if (!dialog.open) dialog.showModal()
      return
    } catch {
      // Fall back for jsdom or partial dialog implementations.
    }
  }

  dialog.setAttribute('open', '')
}

function closeDialogElement (dialog: HTMLDialogElement): void {
  try {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close()
      return
    }

    dialog.removeAttribute('open')
  } finally {
    unlockDocumentScroll(dialog.ownerDocument)
  }
}

function isMobileDialogLayout (dom: Document): boolean {
  return Boolean(dom.querySelector('[data-layout=\'mobile\']'))
}

function isFocusableElement (element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  if (element.getAttribute('hidden') !== null) return false
  if (element.tabIndex < 0) return false
  return true
}

function findPreferredInitialFocusTarget (container: ParentNode): HTMLElement | null {
  const focusableControls = container.querySelectorAll([
    'input:not([type="hidden"]):not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    'solid-ui-select:not([disabled])',
    'solid-ui-combobox:not([disabled])',
    '[contenteditable="true"]',
    'button:not([disabled])',
    'solid-ui-button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(','))

  for (const match of focusableControls) {
    if (match instanceof HTMLElement && isFocusableElement(match)) return match
  }

  return null
}

function focusInitialDialogTarget (dialog: HTMLDialogElement, description: HTMLDivElement, buttons: HTMLDivElement): void {
  if (isMobileDialogLayout(dialog.ownerDocument)) {
    const activeElement = dialog.ownerDocument.activeElement as HTMLElement | null
    if (activeElement && dialog.contains(activeElement)) {
      activeElement.blur()
    }
    return
  }

  const initialTarget = findPreferredInitialFocusTarget(description)
  if (initialTarget) {
    initialTarget.focus()
    if (initialTarget instanceof HTMLInputElement || initialTarget instanceof HTMLTextAreaElement) {
      initialTarget.select()
    }
    return
  }

  const firstButton = findPreferredInitialFocusTarget(buttons)
  if (firstButton) {
    firstButton.focus()
  }
}

function collectFormValues (form: HTMLFormElement): InputDialogValues {
  const data = new FormData(form)
  const values: InputDialogValues = {}
  data.forEach((value, key) => {
    values[key] = String(value)
  })
  return values
}

function openModal ({
  title,
  message,
  buttons,
  headerAction,
  dom
}: {
  title?: string,
  message?: string | Node,
  buttons: DialogButton[],
  headerAction?: DialogHeaderAction,
  dom: Document
}) {
  const dialog = ensureModalDialog(dom)
  const elements = getDialogElements(dialog)

  openDialogElement(dialog)

  elements.title.textContent = title || ''
  elements.description.innerHTML = ''
  if (typeof message === 'string') {
    elements.description.textContent = message
  } else if (message) {
    elements.description.appendChild(message)
  }

  elements.buttons.innerHTML = ''
  clearModalError(elements)

  return new Promise<DialogButtonValue>((resolve) => {
    const finish = (value: DialogButtonValue) => {
      closeModal(value)
      resolve(value)
    }

    const requestCancel = () => {
      const cancelBtn = getSharedDialogCancelButton(dialog)
      if (cancelBtn) {
        cancelBtn.click()
        return
      }

      finish(false)
    }

    dialog.oncancel = (event: Event) => {
      event.preventDefault()
      requestCancel()
    }

    elements.headerAction.innerHTML = ''
    const resolvedHeaderAction = headerAction || { type: 'close' as const }
    if (resolvedHeaderAction.type === 'close') {
      const closeButton = dom.createElement('solid-ui-button') as DialogActionControl
      closeButton.setAttribute('variant', 'ghost')
      closeButton.setAttribute('aria-label', 'Close dialog')
      const iconSlot = dom.createElement('span')
      iconSlot.setAttribute('slot', 'icon')
      render(closeIcon, iconSlot)
      closeButton.appendChild(iconSlot)
      closeButton.onclick = () => requestCancel()
      elements.headerAction.appendChild(closeButton)
    } else if (resolvedHeaderAction.type === 'button') {
      const actionButton = dom.createElement('solid-ui-button') as DialogActionControl
      actionButton.setAttribute('variant', 'tertiary')
      actionButton.className = resolvedHeaderAction.className || ''
      actionButton.textContent = resolvedHeaderAction.label
      actionButton.setAttribute('label', resolvedHeaderAction.label)
      actionButton.setAttribute('aria-label', resolvedHeaderAction.ariaLabel || resolvedHeaderAction.label)
      actionButton.onclick = async () => {
        if (resolvedHeaderAction.onClick) {
          await resolvedHeaderAction.onClick()
        }
      }
      elements.headerAction.appendChild(actionButton)
    }

    buttons.forEach((btn) => {
      const b = dom.createElement('solid-ui-button') as DialogActionControl
      b.setAttribute('label', btn.label)
      b.setAttribute('variant', btn.primary ? 'primary' : 'secondary')
      b.textContent = btn.label
      if (btn.primary) {
        b.setAttribute('data-dialog-primary', 'true')
      }
      if (btn.cancel) {
        b.setAttribute('data-cancel', 'true')
      }
      b.addEventListener('click', async () => {
        if (btn.beforeClose) {
          const shouldClose = await btn.beforeClose()
          if (!shouldClose) return
        }
        finish(btn.value)
      })
      elements.buttons.appendChild(b)
    })

    const scheduleInitialFocus = dom.defaultView?.requestAnimationFrame
      ? (callback: () => void) => dom.defaultView?.requestAnimationFrame(() => callback())
      : (callback: () => void) => setTimeout(callback, 0)

    scheduleInitialFocus(() => {
      focusInitialDialogTarget(dialog, elements.description, elements.buttons)
    })
  })
}

function closeModal (_result: DialogButtonValue): void {
  if (modalDialog) {
    const elements = getDialogElements(modalDialog)
    clearModalError(elements)
    closeDialogElement(modalDialog)
    modalDialog.oncancel = null
    const headerActionButton = modalDialog.querySelector('#modal-header-action button') as HTMLButtonElement | null
    if (headerActionButton) headerActionButton.onclick = null
  }
}

export function closeSharedDialog (): void {
  closeModal(null)
}

export function alertDialog (message: string, title = 'Information', dom: Document) {
  return openModal({
    title,
    message,
    buttons: [{ label: 'OK', value: true, primary: true }],
    dom
  })
}

function updateSavingUI (dialog: HTMLDialogElement, submitLabel: string, isSaving: boolean) {
  const elements = getDialogElements(dialog)
  const saveButton = getSharedDialogSaveButton(dialog)
  const cancelButton = getSharedDialogCancelButton(dialog)

  dialog.classList.toggle('modal--saving', isSaving)
  dialog.setAttribute('aria-busy', String(isSaving))
  elements.description.toggleAttribute('inert', isSaving)

  if (isSaving) {
    const activeElement = dialog.ownerDocument.activeElement as HTMLElement | null
    if (activeElement && dialog.contains(activeElement)) {
      activeElement.blur()
    }
  }

  if (saveButton) {
    setDialogActionDisabled(saveButton, isSaving)
    saveButton.setAttribute('aria-busy', String(isSaving))
    setDialogActionLabel(saveButton, submitLabel)
  }

  if (cancelButton) {
    setDialogActionDisabled(cancelButton, isSaving)
  }

  elements.savingOverlay.hidden = !isSaving
  if (isSaving) {
    render(html`
      <div class="modal__saving-indicator inline-flex-row justify-center" aria-live="polite" aria-label="Saving changes">
        ${createSpinner()}
      </div>
    `, elements.savingOverlay)
  } else {
    render(html``, elements.savingOverlay)
  }
}

export function setSharedDialogSavingState (dom: Document, isSaving: boolean, submitLabel = 'Saving Changes'): void {
  const dialog = ensureModalDialog(dom)
  updateSavingUI(dialog, submitLabel, isSaving)
}

type OpenInputDialogCustom = {
  title: string,
  dom: Document,
  form: HTMLFormElement,
  submitLabel?: string,
  cancelLabel?: string,
  headerAction?: DialogHeaderAction,
  hideFooterButtons?: boolean,
  onOpen?: () => void,
  shouldCloseWithoutSave?: () => Promise<boolean> | boolean,
  validate?: () => Promise<string | null> | string | null,
  onSave?: () => Promise<void> | void,
  formatSaveError?: (error: unknown) => string
}

type InputDialogValues = Record<string, string>
/* Function below generated by AI Model: GPT-5.3-Codex */
/* Prompt: write me a reusable function to open a dialog with a form and return the form values on submit.
The function should also support validation and display error messages in the dialog.
It should reuse the OpenModal function for consistency. Done in 2 passes */
export function openInputDialog (options: OpenInputDialogCustom): Promise<InputDialogValues | null> {
  const submitLabel = options.submitLabel || 'Save Changes'
  const cancelLabel = options.cancelLabel || 'Cancel'
  const dialog = ensureModalDialog(options.dom)
  const elements = getDialogElements(dialog)

  const deriveDefaultFieldLabel = (value: string): string => value
    .replace(/^\s*edit\s+/i, '')
    .replace(/^\s*add\s+/i, '')
    .replace(/^\s*create\s+/i, '')
    .trim()

  const ensureFormControlsHaveAccessibleNames = () => {
    const titleLabel = deriveDefaultFieldLabel(options.title)
    if (!titleLabel) return

    const controls = Array.from(options.form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>([
      'input:not([type="hidden"])',
      'textarea',
      'select'
    ].join(',')))

    if (controls.length !== 1) return

    const [control] = controls
    const hasExplicitLabel = control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')
    const hasNativeLabel = Boolean(control.closest('label'))
    if (hasExplicitLabel || hasNativeLabel || control.getAttribute('type') === 'hidden') {
      return
    }

    if (!control.getAttribute('aria-label')) {
      control.setAttribute('aria-label', titleLabel)
    }
  }

  ensureFormControlsHaveAccessibleNames()

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const saveButton = getSharedDialogSaveButton(dialog)
    saveButton?.click()
  }

  options.form.addEventListener('submit', handleSubmit)

  const dialogPromise = openModal({
    title: options.title,
    message: options.form,
    headerAction: options.headerAction,
    buttons: [
      { label: cancelLabel, value: null, cancel: true },
      {
        label: submitLabel,
        value: 'save',
        primary: true,
        beforeClose: async () => {
          clearModalError(elements)

          if (options.shouldCloseWithoutSave && await options.shouldCloseWithoutSave()) {
            return true
          }

          if (options.validate) {
            const validationMessage = await options.validate()
            if (validationMessage) {
              setModalError(elements, validationMessage)
              return false
            }
          }

          if (!options.onSave) return true

          try {
            updateSavingUI(dialog, submitLabel, true)

            await options.onSave()
            return true
          } catch (error) {
            updateSavingUI(dialog, submitLabel, false)
            const fallback = options.formatSaveError ? options.formatSaveError(error) : undefined
            setModalError(elements, error, fallback)
            return false
          }
        }
      }
    ],
    dom: options.dom
  })

  const scheduleOpenCallback = options.dom.defaultView?.requestAnimationFrame
    ? (callback: () => void) => options.dom.defaultView?.requestAnimationFrame(() => callback())
    : (callback: () => void) => setTimeout(callback, 0)

  if (options.onOpen) {
    scheduleOpenCallback(options.onOpen)
  }

  elements.buttons.hidden = Boolean(options.hideFooterButtons)

  return dialogPromise
    .then((result) => {
      if (result !== 'save') return null
      return collectFormValues(options.form)
    })
    .finally(() => {
      elements.buttons.hidden = false
      updateSavingUI(dialog, submitLabel, false)
      options.form.removeEventListener('submit', handleSubmit)
    })
}
