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

import { icons, ns, widgets, authn } from 'solid-ui'
import { NamedNode, st } from 'rdflib'
import { paneDiv } from './profile.dom'
import { PaneDefinition } from 'pane-registry'
import { longChatPane } from 'chat-pane'

const thisPane: PaneDefinition = {
  global: false,

  icon: icons.iconBase + 'noun_15059.svg',

  name: 'profile',

  label: function (subject, context) {
    const t = context.session.store.findTypeURIs(subject)
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
    const store = context.session.store

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
          await store.fetcher.load(otherProfiles)
        } catch (err) {
          container.appendChild(widgets.errorMessageBlock(err))
        }
      }

      const backgroundColor = store.anyValue(subject, ns.solid('profileBackgroundColor'), null, subject.doc()) || '#ffffff'
      // Todo: check format of color matches regexp and not too dark
      container.style.backgroundColor = backgroundColor // @@ Limit to pale?
      const highlightColor = store.anyValue(subject, ns.solid('profileHighlightColor', null, subject.doc())) || '#090' // @@ beware injection attack
      container.style.border = `0.3em solid ${highlightColor}`
      container.style.borderRadius = '0.5em'
      container.style.padding = '0.7em'
      container.style.marginTop = '0.7em'
      const table = container.appendChild(dom.createElement('table'))
      // const top = table.appendChild(dom.createElement('tr'))
      const main = table.appendChild(dom.createElement('tr'))
      const bottom = table.appendChild(dom.createElement('tr'))
      const statusArea = bottom.appendChild(dom.createElement('div'))
      statusArea.setAttribute('style', 'padding: 0.7em;')

      function heading (str: string) {
        const h = main.appendChild(dom.createElement('h3'))
        h.setAttribute('style', `font-size: 120%; color:${highlightColor};`)
        h.textContent = str
        return h
      }

      // Todo: only show this if there is vcard info
      heading('Contact')

      const button = main.appendChild(dom.createElement('button'))
      button.appendChild(dom.createTextNode('Chat with me'))
      button.onclick = async () => {
        const me = authn.currentUser()
        await store.fetcher.load(me)
        const podRoot = store.any(me, ns.space('storage'))
        if (!podRoot) {
          window.alert('Current user pod root not found!')
          return
        }
        const inviteeInbox = store.any(subject, ns.ldp('inbox'))
        if (!inviteeInbox) {
          window.alert('Invitee inbox not found!')
          return
        }

        // Create chat
        // See https://gitter.im/solid/chat-app?at=5f3c800f855be416a23ae74a
        const chatLocationStr = new URL(`IndividualChats/${new URL(subject.value).host}/`, podRoot.value).toString()
        const chatLocation = new NamedNode(chatLocationStr)
        const created = await longChatPane.mintNew(context, { me, newBase: chatLocationStr })
        console.log('Chat created', created.newInstance)

        // Send invite
        const inviteBody = `
<> a <http://www.w3.org/ns/pim/meeting#LongChatInvite> ;
  ${ns.rdf('seeAlso')} <${created.newInstance}> . 
`
        const inviteResponse = await fetch(inviteeInbox.value, {
          method: 'POST',
          body: inviteBody,
          headers: {
            'Content-Type': 'text/turtle'
          }
        })
        const locationStr = inviteResponse.headers.get('location')
        if (locationStr) {
          console.log('Invite sent', new URL(locationStr, inviteeInbox.value).toString())
        } else {
          console.log('Invite sending returned', inviteResponse.status)
        }

        // Set ACL
        console.log('Finding ACL for', chatLocation)
        await store.fetcher.load(chatLocation)
        const chatAclDoc = store.any(chatLocation, new NamedNode('http://www.iana.org/assignments/link-relations/acl'))
        if (!chatAclDoc) {
          window.alert('Chat ACL doc not found!')
          return
        }
        console.log('Setting ACl', chatLocation, chatAclDoc)
        const aclBody = `
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
<#owner>
    a acl:Authorization;
    acl:agent <${me.value}>;
    acl:accessTo <.>;
    acl:default <.>;
    acl:mode
        acl:Read, acl:Write, acl:Control.
<#invitee>
    a acl:Authorization;
    acl:agent <${subject.value}>;
    acl:accessTo <.>;
    acl:default <.>;
    acl:mode
        acl:Append.
`
        const aclResponse = await fetch(chatAclDoc.value, {
          method: 'PUT',
          body: aclBody,
          headers: {
            'Content-Type': 'text/turtle'
          }
        })
        console.log('ACL created', chatAclDoc.value, aclResponse.status)

        // Add to private type index
        const privateTypeIndex = store.any(me, ns.solid('privateTypeIndex')) as NamedNode | null
        if (!privateTypeIndex) {
          window.alert('Private type index not found!')
          return
        }
        await store.fetcher.load(privateTypeIndex)
        const reg = widgets.newThing(privateTypeIndex)
        const ins = [
          st(reg, ns.rdf('type'), ns.solid('TypeRegistration'), privateTypeIndex.doc()),
          st(reg, ns.solid('forClass'), ns.meeting('LongChat'), privateTypeIndex.doc()),
          st(reg, ns.solid('instance'), chatLocation, privateTypeIndex.doc())
        ]
        await new Promise((resolve, reject) => {
          store.updater.update([], ins, function (uri, ok, errm) {
            if (!ok) {
              reject(new Error(errm))
            } else {
              resolve()
            }
          })
        })
      }

      const contactDisplay = paneDiv(context, subject, 'contact')
      contactDisplay.style.border = '0em' // override form
      main.appendChild(contactDisplay)

      if (store.holds(subject, ns.foaf('knows'))) {
        heading('Solid Friends')
        widgets.attachmentList(dom, subject, container, {
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
