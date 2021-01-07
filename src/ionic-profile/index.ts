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
import { styleMap } from 'lit-html/directives/style-map.js'
import { grid, card, fullWidth, p, my, heading, textGray, textCenter, fontSemibold } from './baseStyles'
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

      const styles = {
        root: styleMap(grid()),
        profile: {
          card: styleMap(card()),
          image: styleMap(fullWidth()),
          info: styleMap(p(1)),
          name: styleMap(heading()),
          role: styleMap({ ...textGray(), ...textCenter() }),
          label: styleMap({ ...p(2), ...textGray(), ...fontSemibold() })
        },
        friendList: {
          card: styleMap({ ...card(), ...p(8) }),
          heading: styleMap(heading())
        },
        chat: {
          button: styleMap({ ...my(3), ...textCenter() })
        }
      }

      const chatButton = widgets.button(
        dom,
        undefined,
        'Chat with me',
        async () => {
        },
        { needsBorder: true }
      )

      const page = ({ name }) => html`
                <div style="${styles.root}">
                    <div>
                        <div style="${styles.profile.card}">
                            <div>
                                <img style="${styles.profile.image}" src="${image}" alt="${name}">
                            </div>
                            <div style="${styles.profile.info}">
                                <h3 style="${styles.profile.name}">${name}</h3>
                                <div style="${styles.profile.role}">
                                    ${role}
                                </div>
                                <table style="margin-top: 0.5rem; margin-bottom: 0.5rem">
                                    <tbody>
                                    <tr>
                                        <td style="${styles.profile.label}">Country</td>
                                        <td>${country}</td>
                                    </tr>
                                    <tr>
                                        <td style="${styles.profile.label}">Organization</td>
                                        <td>${comp}</td>
                                    </tr>
                                    <tr>
                                        <td style="${styles.profile.label}">Email</td>
                                        <td>
                                            <a href="${mbox ? mbox.value : '#'}">
                                                ${mbox ? mbox.value.replace('mailto:', '') : ''}
                                            </a>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                                <div style="${styles.chat.button}">
                                    ${chatButton}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="${styles.friendList.card}">
                        <h2 style="${styles.friendList.heading}">Friends</h2>
                        ${friendList}
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
