import { authn, icons, store, widgets } from 'solid-ui'
import { NamedNode } from 'rdflib'

import { PaneDefinition } from 'pane-registry'
import { createApplicationTable, createContainer, createText } from './trustedApplications.dom'

const thisColor = '#418d99'

const trustedApplicationView: PaneDefinition = {
  global: true,
  icon: `${icons.iconBase}noun_15177.svg`,
  name: 'trustedApplications',
  label: () => null,
  render: (subject, context) => {
    const dom = context.dom
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
    render(dom, main, statusArea).catch(err => statusArea.appendChild(widgets.errorMessageBlock(dom, err)))
    return div
  }
}

async function render (dom, main, statusArea): Promise<void> {
  const authContext = await authn.logInLoadProfile({ dom: dom, div: main, statusArea: statusArea, me: null })
  const subject = authContext.me as NamedNode

  const profile = subject.doc()
  if (!store.updater) {
    throw new Error('Store has no updater')
  }
  const editable = store.updater.editable(profile.uri, store)

  main.appendChild(createText('h3', 'Manage your trusted applications'))

  if (!editable) {
    main.appendChild(
      widgets.errorMessageBlock(dom, `Your profile ${subject.doc().uri} is not editable, so we cannot do much here.`)
    )
    return
  }

  main.appendChild(createText('p', 'Here you can manage the applications you trust.'))

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
    createText('p', 'Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.')
  )
}

export default trustedApplicationView
