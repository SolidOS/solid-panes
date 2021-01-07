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
                <ion-grid>
                    <ion-row>
                        <ion-col size-xs="12" size-sm="6" size-xl="3" size-lg="4">
                            <ion-card>
                                <img src="${image}" alt="${name}" style="width:100%">
                                <ion-card-header>
                                    <ion-card-title>${name}</ion-card-title>
                                    <ion-card-subtitle>${role}</ion-card-subtitle>
                                    <ion-fab vertical="top" horizontal="end">
                                        <ion-fab-button>
                                            <ion-icon name="chatbubble-outline"></ion-icon>
                                        </ion-fab-button>
                                    </ion-fab>
                                </ion-card-header>
                                <ion-card-content>
                                    <ion-list>
                                        <ion-item>
                                            <ion-icon slot="start" name="briefcase"></ion-icon>
                                            <ion-label>${comp}</ion-label>
                                        </ion-item>
                                        <ion-item>
                                            <ion-icon slot="start" name="earth"></ion-icon>
                                            <ion-label>${country}</ion-label>
                                        </ion-item>
                                        <ion-item>
                                            <ion-icon slot="start" name="at-circle"></ion-icon>
                                            <a href="${mbox ? mbox.value : '#'}">
                                                ${mbox ? mbox.value.replace('mailto:', '') : ''}
                                            </a>
                                            </ion-label>
                                        </ion-item>
                                    </ion-list>
                                </ion-card-content>
                            </ion-card>
                        </ion-col>
                        <ion-col size-xs="12" size-sm="6">
                            <div>
                                <h2>Friends</h2>
                                ${friendList}
                            </div>
                        </ion-col>
                    </ion-row>
                </ion-grid>
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
