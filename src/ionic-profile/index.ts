/**
 * Display A Public Profile Pane
 *
 * This is the subject's primary representation in the world.
 * When anyone scans the QR code of their WebID on their card, it takes them
 * to here and here alone.  This had better be good.  This had better be
 * worth the subject joining solid for
 * - informative
 *
 * Usage: paneRegistry.register('profile/profilePane')
 * or standalone script adding onto existing mashlib.
 */

import { icons, ns, widgets } from 'solid-ui'
import { NamedNode, Store } from 'rdflib'
import { PaneDefinition } from 'pane-registry'
import { html, render } from 'lit-html'
import { findImage } from 'solid-ui/lib/widgets/buttons'

import 'tailwindcss/tailwind.css'

const thisPane: PaneDefinition = {
  global: false,

  icon: icons.iconBase + 'noun_15059.svg',

  name: 'profile',

  label: function (subject, context) {
    const t = (context.session.store as Store).findTypeURIs(subject)
    if (
      t[ns.vcard('Individual').uri] ||
            t[ns.vcard('Organization').uri] ||
            t[ns.foaf('Person').uri] ||
            t[ns.schema('Person').uri]
    ) {
      return 'Profile'
    }
    return null
  },

  render: function (subject, context) {
    const store = context.session.store as Store

    async function doRender (
      container: HTMLElement,
      subject: NamedNode | null,
      dom: HTMLDocument
    ) {
      if (!subject) throw new Error('subject missing')
      const profile = subject.doc()
      const otherProfiles = store.each(subject, ns.rdfs('seeAlso'), null, profile) as Array<NamedNode>
      if (otherProfiles.length > 0) {
        try {
          if (!store.fetcher) {
            throw new Error('Store has no fetcher')
          }
          await store.fetcher.load(otherProfiles)
        } catch (err) {
          container.appendChild(widgets.errorMessageBlock(err))
        }
      }

      const role = store.any(subject, ns.vcard('role'), null, profile)
      const comp = store.any(subject, ns.vcard('organization-name'), null, profile)
      const address = store.any(subject, ns.vcard('hasAddress'), null, profile)
      const country = address != null ? store.any(address as NamedNode, ns.vcard('country-name'), null, profile) : null
      const email = store.any(subject, ns.vcard('hasEmail'), null, profile)
      const mbox = email ? store.any(email as NamedNode, ns.vcard('value'), null, profile) : null

      const friendList = document.createElement('div')
      const image = findImage(subject)

      const page = ({ name }) => html`
                <div class="flex items-start h-full w-full bg-gray-50">
                    <div class="grid grid md:grid-cols-2 grid-cols-1 gap-4 p-4">
                        <div class="max-w-s">
                            <div class="bg-white shadow-xl rounded-lg">
                                <div class="photo-wrapper p-2">
                                    <img class="w-64 h-64 rounded-full mx-auto" src="${image}" alt="${name}">
                                </div>
                                <div class="p-2">
                                    <h3 class="text-center text-xl text-gray-900 font-medium leading-8">${name}</h3>
                                    <div class="text-center text-gray-400 text-xs font-semibold">
                                        <p>${role}</p>
                                    </div>
                                    <table class="text-md my-3">
                                        <tbody>
                                        <tr>
                                            <td class="px-2 py-2 text-gray-500 font-semibold">Country</td>
                                            <td class="px-2 py-2">${country}</td>
                                        </tr>
                                        <tr>
                                            <td class="px-2 py-2 text-gray-500 font-semibold">Organization</td>
                                            <td class="px-2 py-2">${comp}</td>
                                        </tr>
                                        <tr>
                                            <td class="px-2 py-2 text-gray-500 font-semibold">Email</td>
                                            <td class="px-2 py-2">
                                                <a href="${mbox ? mbox.value : '#'}">
                                                    ${mbox ? mbox.value.replace('mailto:', '') : ''}
                                                </a>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>

                                    <div class="text-center my-3">
                                        <a class="uppercase m-4 px-10 py-2 bg-white border border-solid text-purple-500 border-purple-500 hover:bg-purple-500 hover:text-white rounded-md"
                                           href="#">Chat with me</a>
                                    </div>

                                </div>
                            </div>
                        </div>
                        <div class="bg-white shadow-xl rounded-xs p-2">
                            <h2 class="text-lg text-gray-800 font-light">Friends</h2>
                            ${friendList}
                        </div>
                    </div>
                </div>
            `

      render(page({ name: store.any(subject, ns.vcard('fn')) }), container)

      if (store.holds(subject, ns.foaf('knows'))) {
        widgets.attachmentList(dom, subject, friendList, {
          doc: profile,
          modify: false,
          predicate: ns.foaf('knows'),
          noun: 'friend'
        })
      }
    }

    const dom = context.dom

    const container = dom.createElement('div')

    doRender(container, subject, dom) // async
    return container // initially unpopulated
  } // render()
} //

export default thisPane
// ENDS
