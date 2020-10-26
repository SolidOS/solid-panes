import { authn, icons, ns, widgets } from 'solid-ui'
import { IndexedFormula, NamedNode, parse, Store } from 'rdflib'

import preferencesFormText from './preferencesFormText.ttl'
import ontologyData from './ontologyData.ttl'
import { PaneDefinition } from 'pane-registry'

export const basicPreferencesPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_Sliders_341315_000000.svg',
  name: 'basicPreferences',
  label: _subject => {
    return null
  },

  // Render the pane
  // The subject should be the logged in user.
  render: (subject, context) => {
    const dom = context.dom
    const store = context.session.store as Store

    function complainIfBad (ok: Boolean, mess: any) {
      if (ok) return
      container.appendChild(widgets.errorMessageBlock(dom, mess, '#fee'))
    }

    const container = dom.createElement('div')

    const formArea = setupUserTypesSection(container, dom)

    function loadData (doc: NamedNode, turtle: String) {
      doc = doc.doc() // remove # from URI if nec
      if (!store.holds(undefined, undefined, undefined, doc)) {
        // If not loaded already
        ;(parse as any)(turtle, store, doc.uri, 'text/turtle', null) // Load form directly
      }
    }

    const preferencesForm = store.sym(
      'urn:uuid:93774ba1-d3b6-41f2-85b6-4ae27ffd2597#this'
    )
    loadData(preferencesForm, preferencesFormText)

    const ontologyExtra = store.sym(
      'urn:uuid:93774ba1-d3b6-41f2-85b6-4ae27ffd2597-ONT'
    )
    loadData(ontologyExtra, ontologyData)

    async function doRender () {
      const renderContext = await authn.logInLoadPreferences({
        dom,
        div: container
      })
      if (!renderContext.preferencesFile) {
        // Could be CORS
        console.log(
          'Not doing private class preferences as no access to preferences file. ' +
          renderContext.preferencesFileError
        )
        return
      }
      const appendedForm = widgets.appendForm(
        dom,
        formArea,
        {},
        renderContext.me,
        preferencesForm,
        renderContext.preferencesFile,
        complainIfBad
      )
      appendedForm.style.borderStyle = 'none'

      const trustedApplicationsView = context.session.paneRegistry.byName('trustedApplications')
      if (trustedApplicationsView) {
        container.appendChild(trustedApplicationsView.render(null, context))
      }

      // @@ TODO Remove need for casting as any and bang (!) syntax
      addDeleteSection(container, store, renderContext.me!, dom)
    }

    doRender()

    return container
  }
}

function setupUserTypesSection (
  container: Element,
  dom: HTMLDocument
): Element {
  const formContainer = createSection(container, dom, 'User types')

  const description = formContainer.appendChild(dom.createElement('p'))
  description.innerText = 'Here you can self-assign user types to help the data browser know which views you would like to access.'

  const userTypesLink = formContainer.appendChild(dom.createElement('a'))
  userTypesLink.href = 'https://github.com/solid/userguide/#role'
  userTypesLink.innerText = 'Read more'

  const formArea = formContainer.appendChild(dom.createElement('div'))

  return formArea
}

export default basicPreferencesPane

// ends

function addDeleteSection (
  container: HTMLElement,
  store: IndexedFormula,
  profile: NamedNode,
  dom: HTMLDocument
): void {
  const section = createSection(container, dom, 'Delete account')

  const podServerNodes = store.each(profile, ns.space('storage'), null, profile.doc())
  const podServers = podServerNodes.map(node => node.value)

  const list = section.appendChild(dom.createElement('ul'))

  podServers.forEach(async server => {
    const deletionLink = await generateDeletionLink(server, dom)
    if (deletionLink) {
      const listItem = list.appendChild(dom.createElement('li'))
      listItem.appendChild(deletionLink)
    }
  })
}

async function generateDeletionLink (
  podServer: string,
  dom: HTMLDocument
): Promise<HTMLElement | null> {
  const link = dom.createElement('a')
  link.textContent = `Delete your account at ${podServer}`
  const deletionUrl = await getDeletionUrlForServer(podServer)
  if (typeof deletionUrl !== 'string') {
    return null
  }
  link.href = deletionUrl
  return link
}

/**
 * Hacky way to get the deletion link to a Pod
 *
 * This function infers the deletion link by assuming the URL structure of Node Solid server.
 * In the future, Solid will hopefully provide a standardised way of discovering the deletion link:
 * https://github.com/solid/data-interoperability-panel/issues/18
 *
 * If NSS is in multi-user mode (the case on inrupt.net and solid.community), the deletion URL for
 * vincent.dev.inrupt.net would be at dev.inrupt.net/account/delete. In single-user mode, the
 * deletion URL would be at vincent.dev.inrupt.net/account/delete.
 *
 * @param server Pod server containing the user's account.
 * @returns URL of the page that Node Solid Server would offer to delete the account, or null if
 *          the URLs we tried give invalid responses.
 */
async function getDeletionUrlForServer (
  server: string
): Promise<string | null> {
  const singleUserUrl = new URL(server)
  const multiUserUrl = new URL(server)
  multiUserUrl.pathname = singleUserUrl.pathname = '/account/delete'

  const hostnameParts = multiUserUrl.hostname.split('.')
  // Remove `vincent.` from `vincent.dev.inrupt.net`, for example:
  multiUserUrl.hostname = hostnameParts.slice(1).join('.')

  const multiUserNssResponse = await fetch(multiUserUrl.href, {
    method: 'HEAD'
  })
  if (multiUserNssResponse.ok) {
    return multiUserUrl.href
  }

  const singleUserNssResponse = await fetch(singleUserUrl.href, {
    method: 'HEAD'
  })
  if (singleUserNssResponse.ok) {
    return singleUserUrl.href
  }
  return null
}

function createSection (
  container: Element,
  dom: HTMLDocument,
  title: string
): Element {
  const section = container.appendChild(dom.createElement('div'))
  section.style.border = '0.3em solid #418d99'
  section.style.borderRadius = '0.5em'
  section.style.padding = '0.7em'
  section.style.marginTop = '0.7em'

  const titleElement = section.appendChild(dom.createElement('h3'))
  titleElement.innerText = title

  return section
}
