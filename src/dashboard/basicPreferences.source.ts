import { PaneDefinition } from '../types'
import { authn, icons, ns, store, widgets } from 'solid-ui'
import { NamedNode, parse, IndexedFormula } from 'rdflib'
import { renderTrustedApplicationsOptions } from './trustedApplications/trustedApplicationsPane'

import preferencesFormText from './preferencesFormText.ttl'
import ontologyData from './ontologyData.ttl'

export const basicPreferencesPane: PaneDefinition = {
  icon: icons.iconBase + 'noun_Sliders_341315_000000.svg',
  name: 'basicPreferences',
  label: _subject => {
    return null
  },

  // Render the pane
  // The subject should be the logged in user.
  render: (subject: NamedNode, dom: HTMLDocument) => {
    function complainIfBad (ok: Boolean, mess: any) {
      if (ok) return
      container.appendChild(widgets.errorMessageBlock(dom, mess, '#fee'))
    }

    const container = dom.createElement('div')

    const formArea = container.appendChild(dom.createElement('div'))

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
      const context = await authn.logInLoadPreferences({
        dom,
        div: container
      })
      if (!context.preferencesFile) {
        // Could be CORS
        console.log(
          'Not doing private class preferences as no access to preferences file. ' +
            context.preferencesFileError
        )
        return
      }
      addDeletionLinks(container, store, context.me)
      const appendedForm = widgets.appendForm(
        dom,
        formArea,
        {},
        context.me,
        preferencesForm,
        context.preferencesFile,
        complainIfBad
      )
      appendedForm.style.borderStyle = 'none'

      const trustedApplicationSettings = renderTrustedApplicationsOptions(dom)
      container.appendChild(trustedApplicationSettings)
    }
    doRender()

    return container
  }
}

export default basicPreferencesPane
// ends

function addDeletionLinks (
  container: HTMLElement,
  kb: IndexedFormula,
  profile: NamedNode
): void {
  const podServerNodes = kb.each(
    profile,
    ns.space('storage'),
    null,
    profile.doc()
  )
  const podServers = podServerNodes.map(node => node.value)
  podServers.forEach(async server => {
    const deletionLink = await generateDeletionLink(server)
    if (deletionLink) {
      container.appendChild(deletionLink)
    }
  })
}

async function generateDeletionLink (
  podServer: string
): Promise<HTMLElement | null> {
  const link = document.createElement('a')
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
