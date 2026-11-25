import { PaneDefinition } from 'pane-registry'
import { NamedNode } from 'rdflib'
import { icons, login, widgets } from 'solid-ui'
import { store } from 'solid-logic'
import '~icons/lucide/info'
import { createApplicationTable, createIcon, createText } from './trustedApplications.dom'

const cardStyle = 'background: var(--solid-ui-color-white, #ffffff); border: 1px solid var(--solid-ui-color-slate-200, #e2e8f0); ' +
  'border-radius: 5px; padding: 24px; box-sizing: border-box;'
const descriptionStyle = 'margin: 0 0 16px; color: var(--color-text-secondary, #4a5565); font-size: 0.875rem; line-height: 1.5;'

const trustedApplicationView: PaneDefinition = {
  global: true,
  icon: `${icons.iconBase}noun_15177.svg`,
  name: 'trustedApplications',
  label: () => null,
  render: (subject, context) => {
    const dom = context.dom
    const div = dom.createElement('div')
    div.classList.add('trusted-applications-pane')
    div.setAttribute('style', cardStyle)
    const table = div.appendChild(dom.createElement('table'))
    table.setAttribute('style', 'width: 100%;')
    const main = table.appendChild(dom.createElement('tr'))
    const bottom = table.appendChild(dom.createElement('tr'))
    const statusArea = bottom.appendChild(dom.createElement('div'))
    statusArea.setAttribute('style', 'padding: 0;')
    render(dom, main, statusArea).catch(err => statusArea.appendChild(widgets.errorMessageBlock(dom, err)))
    return div
  }
}

async function render (dom, main, statusArea): Promise<void> {
  const authContext = await login.ensureLoadedProfile({ dom, div: main, statusArea, me: null })
  const subject = authContext.me as NamedNode

  const profile = subject.doc()
  if (!store.updater) {
    throw new Error('Store has no updater')
  }
  const editable = store.updater.editable(profile.uri, store)

  const notes = 'Trusted applications will get access to all resources that you have access to. ' +
    'You can limit which modes they have by default. They will not gain more access than you have.'
  const heading = main.appendChild(createText('h3', 'Manage your trusted applications', {
    style: 'display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 1.125rem; font-weight: 500;'
  }))
  const info = heading.appendChild(createText('span', null, {
    role: 'img',
    'aria-label': notes,
    title: notes,
    tabindex: '0',
    style: 'display: inline-flex; width: 16px; height: 16px; color: var(--color-text-secondary, #4a5565); cursor: help;'
  }))
  info.appendChild(createIcon('icon-lucide-info'))

  if (!editable) {
    main.appendChild(
      widgets.errorMessageBlock(dom, `Your profile ${subject.doc().uri} is not editable, so we cannot do much here.`)
    )
    return
  }

  main.appendChild(createText('p', 'Before you can use third-party applications, you need to add them to the allowlist via the Trusted Application table.', {
    style: descriptionStyle
  }))

  const applicationsTable = createApplicationTable(subject)
  main.appendChild(applicationsTable)

  main.appendChild(
    createText('p', 'To add an application, type its URL in the last row and press Enter. Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.', {
      style: descriptionStyle + ' margin: 12px 0 0;'
    })
  )
}

export default trustedApplicationView
