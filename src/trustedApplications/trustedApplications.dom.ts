import { NamedNode, Statement, sym } from 'rdflib'
import { ns, store } from 'solid-ui'
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
    class: 'results'
  })

  // creating headers
  const header = createContainer('tr', [
    createText('th', 'Application URL'),
    createText('th', 'Access modes'),
    createText('th', 'Actions')
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
    ]),
    createContainer('td', [
      createContainer(
        'form',
        createModesInput(trustedApplicationState),
        {},
        {
          submit: addOrEditApplication
        }
      )
    ]),
    createContainer('td', [
      createContainer(
        'form',
        origin
          ? [
              createText('button', 'Update', {
                class: 'controlButton',
                style: 'background: LightGreen;'
              }),
              createText(
                'button',
                'Delete',
                {
                  class: 'controlButton',
                  style: 'background: LightCoral;'
                },
                {
                  click: removeApplication
                }
              )
            ]
          : [
              createText('button', 'Add', {
                class: 'controlButton',
                style: 'background: LightGreen;'
              })
            ],
        {},
        {
          submit: addOrEditApplication
        }
      )
    ])
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
    console.error(uri, errorBody)
  }
}

function createElement<K extends keyof HTMLElementTagNameMap> (
  elementName: K,
  attributes: { [name: string]: string } = {},
  eventListeners: { [eventName: string]: EventListener } = {},
  onCreated: null | ((createdElement: HTMLElementTagNameMap[K]) => void) = null
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

export function createContainer<K extends keyof HTMLElementTagNameMap> (
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

export function createText<K extends keyof HTMLElementTagNameMap> (
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

function createModesInput ({ appModes, formElements }: {
  appModes: NamedNode[]
  formElements: FormElements
}) {
  return ['Read', 'Write', 'Append', 'Control'].map(mode => {
    const isChecked = appModes.some(
      appMode => appMode.value === ns.acl(mode).value
    )
    return createContainer('label', [
      createElement(
        'input',
        {
          type: 'checkbox',
          ...(isChecked ? { checked: '' } : {}),
          value: ns.acl(mode).uri
        },
        {},
        element => formElements.modes.push(element)
      ),
      createText('span', mode)
    ])
  })
}
