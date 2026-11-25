import { NamedNode, Statement, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { store } from 'solid-logic'
import '~icons/lucide/trash-2'
import { generateRandomString, getStatementsToAdd, getStatementsToDelete } from './trustedApplications.utils'

interface FormElements {
  modes: HTMLInputElement[]
  // This appears to be used to store either a node from the store,
  // or a reference to the input (checkbox) element for a particular mode.
  // These typings were created post-hoc, so I'm not sure if that was intentional.
  // Thus, this union type should be considered as descriptive rather than prescriptive.
  origin: undefined | NamedNode | HTMLInputElement
}

export function createApplicationTable (subject: NamedNode) {
  const applicationsTable = createElement('table', {
    class: 'results',
    style: styles.table
  })

  // creating headers: one column per access mode, as in the Preferences design
  const header = createContainer('tr', [
    createText('th', 'Application URL', { style: styles.th + styles.urlCell }),
    ...modes.map(mode => createText('th', mode, { style: styles.th })),
    createText('th', '', { style: styles.th })
  ])
  applicationsTable.appendChild(header);

  // creating rows
  (store.each(subject, ns.acl('trustedApp'), undefined, undefined) as unknown as Statement[])
    .flatMap(app => store
      .each(app as any, ns.acl('origin'), undefined, undefined)
      .map(origin => ({
        appModes: store.each(app as any, ns.acl('mode'), undefined, undefined) as NamedNode[],
        origin: origin as NamedNode
      })))
    .sort((a: any, b: any) => (a.origin.value < b.origin.value ? -1 : 1))
    .forEach(
      ({ appModes, origin }: { appModes: NamedNode[]; origin: NamedNode }) =>
        applicationsTable.appendChild(
          createApplicationEntry(subject, origin, appModes, updateTable)
        )
    )

  // adding a row for new applications
  applicationsTable.appendChild(
    createApplicationEntry(subject, null, [ns.acl('Read')], updateTable)
  )

  return applicationsTable

  function updateTable () {
    applicationsTable.parentElement!.replaceChild(
      createApplicationTable(subject),
      applicationsTable
    )
  }
}

function createApplicationEntry (
  subject: NamedNode,
  origin: NamedNode | null,
  appModes: NamedNode[],
  updateTable: () => void
): HTMLTableRowElement {
  const trustedApplicationState = {
    origin,
    appModes,
    formElements: {
      modes: [],
      origin: undefined
    } as FormElements
  }
  return createContainer('tr', [
    createContainer('td', [
      createContainer(
        'form',
        [
          createElement(
            'input',
            {
              class: 'textinput',
              placeholder: 'Write new URL here',
              'aria-label': origin ? 'Application URL' : 'New application URL (press Enter to add)',
              style: styles.urlInput,
              value: origin ? origin.value : ''
            },
            {},
            element => {
              trustedApplicationState.formElements.origin = element
            }
          )
        ],
        {},
        {
          submit: addOrEditApplication
        }
      )
    ], { style: styles.td + styles.urlCell }),
    // Ticking a mode saves straight away for an existing app;
    // for the new-app row, the modes are saved when the URL is entered
    ...createModesInput(trustedApplicationState, origin ? addOrEditApplication : null)
      .map(checkbox => createContainer('td', [checkbox], { style: styles.td })),
    createContainer('td', origin
      ? [
          createContainer('button', [createIcon('icon-lucide-trash-2')], {
            type: 'button',
            class: 'controlButton',
            title: 'Remove',
            'aria-label': `Remove ${origin.value}`,
            style: styles.trashButton
          }, {
            click: removeApplication
          })
        ]
      : [], { style: styles.td + 'text-align: right;' })
  ])

  function addOrEditApplication (event: Event) {
    event.preventDefault()
    let origin
    try {
      origin = sym(trustedApplicationState.formElements.origin!.value)
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    const modes = trustedApplicationState.formElements.modes
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value)

    const deletions = getStatementsToDelete(
      trustedApplicationState.origin || origin,
      subject,
      store,
      ns
    )
    const additions = getStatementsToAdd(
      origin,
      generateRandomString(),
      modes,
      subject,
      ns
    )
    if (!store.updater) {
      throw new Error('Store has no updater')
    }
    store.updater.update(deletions, additions, handleUpdateResponse)
  }

  function removeApplication (event: Event) {
    event.preventDefault()
    let origin
    try {
      origin = sym(trustedApplicationState.formElements.origin!.value)
    } catch (err) {
      return alert(
        'Please provide an application URL you want to remove trust from'
      )
    }

    const deletions = getStatementsToDelete(origin, subject, store, ns)
    if (!store.updater) {
      throw new Error('Store has no updater')
    }
    store.updater.update(deletions, [], handleUpdateResponse)
  }

  function handleUpdateResponse (uri: any, success: boolean, errorBody: any) {
    if (success) {
      return updateTable()
    }
    // console.error(uri, errorBody)
  }
}

function createElement<K extends keyof globalThis.HTMLElementTagNameMap> (
  elementName: K,
  attributes: { [name: string]: string } = {},
  eventListeners: { [eventName: string]: globalThis.EventListener } = {},

  onCreated: null | ((createdElement: globalThis.HTMLElementTagNameMap[K]) => void) = null
) {
  const element = document.createElement(elementName)
  if (onCreated) {
    onCreated(element)
  }
  Object.keys(attributes).forEach(attName => {
    element.setAttribute(attName, attributes[attName])
  })
  Object.keys(eventListeners).forEach(eventName => {
    element.addEventListener(eventName, eventListeners[eventName])
  })
  return element
}

export function createContainer<K extends keyof globalThis.HTMLElementTagNameMap> (
  elementName: K,
  children: HTMLElement[],
  attributes = {},
  eventListeners = {},
  onCreated = null
) {
  const element = createElement(
    elementName,
    attributes,
    eventListeners,
    onCreated
  )
  children.forEach(child => element.appendChild(child))
  return element
}

export function createText<K extends keyof globalThis.HTMLElementTagNameMap> (
  elementName: K,
  textContent: string | null,
  attributes = {},
  eventListeners = {},
  onCreated = null
) {
  const element = createElement(
    elementName,
    attributes,
    eventListeners,
    onCreated
  )
  element.textContent = textContent
  return element
}

const modes = ['Read', 'Write', 'Append', 'Control']

/** A 16px decorative icon, e.g. <icon-lucide-trash-2> */
export function createIcon (tagName: string): HTMLElement {
  const icon = document.createElement(tagName)
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('style', 'width: 16px; height: 16px;')
  return icon
}

function createModesInput ({ appModes, formElements, origin }: {
  appModes: NamedNode[]
  formElements: FormElements
  origin: NamedNode | null
}, onChange: ((event: Event) => void) | null) {
  return modes.map(mode => {
    const isChecked = appModes.some(
      appMode => appMode.value === ns.acl(mode).value
    )
    return createElement(
      'input',
      {
        type: 'checkbox',
        ...(isChecked ? { checked: '' } : {}),
        value: ns.acl(mode).uri,
        'aria-label': `${mode} access for ${origin ? origin.value : 'the new application'}`,
        style: styles.checkbox
      },
      onChange ? { change: onChange } : {},
      element => formElements.modes.push(element)
    )
  })
}

/** Inline styles for the trusted applications table, as in the Preferences design (#710) */
const border = '1px solid var(--solid-ui-color-slate-200, #e2e8f0)'
const styles = {
  table: `width: 100%; border-collapse: separate; border-spacing: 0; border: ${border}; border-bottom: none; border-radius: 5px; font-size: 0.875rem;`,
  th: 'padding: 12px 16px; text-align: left; font-weight: 500; background: color-mix(in srgb, var(--solid-ui-color-primary, #7c4dff) 10%, #ffffff); ' +
    `border-bottom: ${border};`,
  td: `padding: 12px 16px; border-bottom: ${border}; vertical-align: middle;`,
  urlCell: `border-right: ${border}; min-width: 240px;`,
  urlInput: 'width: 100%; box-sizing: border-box; padding: 4px 0; border: none; background: transparent; font: inherit; color: inherit;',
  checkbox: 'width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: var(--solid-ui-color-orange-500, #f97316);',
  trashButton: 'display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; ' +
    'border: none; border-radius: 5px; background: transparent; color: var(--solid-ui-color-gray-400, #9ca3af); cursor: pointer;'
}
