import UI from 'solid-ui'
import { NamedNode, IndexedFormula, sym } from 'rdflib'

import { Namespaces } from 'solid-namespace'

import {
  getStatementsToAdd,
  getStatementsToDelete
} from './trustedApplicationsUtils'

const kb: IndexedFormula = UI.store
const ns: Namespaces = UI.ns

const thisColor = '#418d99'

interface FormElements {
  modes: HTMLInputElement[]
  // This appears to be used to store either a node from the store,
  // or a reference to the input (checkbox) element for a particular mode.
  // These typings were created post-hoc, so I'm not sure if that was intentional.
  // Thus, this union type should be considered as descriptive rather than prescriptive.
  origin: undefined | NamedNode | HTMLInputElement
}

export function renderTrustedApplicationsOptions (dom: HTMLDocument) {
  const div = dom.createElement('div')
  div.classList.add('trusted-applications-pane')
  div.setAttribute(
    'style',
    'border: 0.3em solid ' +
      thisColor +
      '; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;'
  )
  const table = div.appendChild(dom.createElement('table'))
  const main = table.appendChild(dom.createElement('tr'))
  const bottom = table.appendChild(dom.createElement('tr'))
  const statusArea = bottom.appendChild(dom.createElement('div'))
  statusArea.setAttribute('style', 'padding: 0.7em;')

  const context = { dom: dom, div: main, statusArea: statusArea, me: null }
  UI.authn.logInLoadProfile(context).then(
    (context: any) => {
      let subject: NamedNode = context.me

      const profile = subject.doc()
      const editable = UI.store.updater.editable(profile.uri, kb)

      main.appendChild(createText('h3', 'Manage your trusted applications'))

      if (!editable) {
        main.appendChild(
          UI.widgets.errorMessageBlock(
            dom,
            `Your profile ${
              subject.doc().uri
            } is not editable, so we cannot do much here.`
          )
        )
        return
      }

      main.appendChild(
        createText('p', 'Here you can manage the applications you trust.')
      )

      const applicationsTable = createApplicationTable(subject)
      main.appendChild(applicationsTable)

      main.appendChild(createText('h4', 'Notes'))
      main.appendChild(
        createContainer('ol', [
          main.appendChild(
            createText(
              'li',
              'Trusted applications will get access to all resources that you have access to.'
            )
          ),
          main.appendChild(
            createText('li', 'You can limit which modes they have by default.')
          ),
          main.appendChild(
            createText('li', 'They will not gain more access than you have.')
          )
        ])
      )
      main.appendChild(
        createText(
          'p',
          'Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.'
        )
      )
    },
    (err: any) => {
      statusArea.appendChild(UI.widgets.errorMessageBlock(dom, err))
    }
  )
  return div
}

function createApplicationTable (subject: NamedNode) {
  const applicationsTable = createElement('table', {
    class: 'results'
  })

  // creating headers
  const header = createContainer('tr', [
    createText('th', 'Application URL'),
    createText('th', 'Access modes'),
    createText('th', 'Actions')
  ])
  applicationsTable.appendChild(header)

  // creating rows
  ;(kb.each(subject, ns.acl('trustedApp'), undefined, undefined) as any)
    .flatMap((app: any) => {
      return kb
        .each(app, ns.acl('origin'), undefined, undefined)
        .map(origin => ({
          appModes: kb.each(app, ns.acl('mode'), undefined, undefined),
          origin
        }))
    })
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
      kb,
      ns
    )
    const additions = getStatementsToAdd(
      origin,
      generateRandomString(),
      modes,
      subject,
      ns
    )
    ;(kb as any).updater.update(deletions, additions, handleUpdateResponse)
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

    const deletions = getStatementsToDelete(origin, subject, kb, ns)
    ;(kb as any).updater.update(deletions, [], handleUpdateResponse)
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

function createContainer<K extends keyof HTMLElementTagNameMap> (
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

function createText<K extends keyof HTMLElementTagNameMap> (
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

function createModesInput ({
  appModes,
  formElements
}: {
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

function generateRandomString () {
  return Math.random()
    .toString(36)
    .substring(7)
}

// ENDS
