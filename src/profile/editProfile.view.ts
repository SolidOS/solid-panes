/**
 * Profile Editing App Pane
 *
 * Unlike view panes, this is available any place whatever the real subject,
 * and allows the user to edit their own profile.
 *
 * Usage: paneRegistry.register('profile/profilePane')
 * or standalone script adding onto existing mashlib.
 */

import { authn, icons, ns, style, widgets } from 'solid-ui'

import { NamedNode, parse, sym, Store } from 'rdflib'

import preferencesFormText from './preferencesFormText.ttl'
import { PaneDefinition } from 'pane-registry'
import { paneDiv } from './profile.dom'

const highlightColor = style.highlightColor || '#7C4DFF'

const editProfileView: PaneDefinition = {
  global: true,

  icon: icons.iconBase + 'noun_492246.svg',

  name: 'editProfile',

  label: () => null,

  render: function (subject, context) {
    const dom = context.dom
    const store = context.session.store as Store

    function complainIfBad (ok: Boolean, mess: any) {
      if (ok) return
      div.appendChild(widgets.errorMessageBlock(dom, mess, '#fee'))
    }

    function renderProfileForm (div: HTMLElement, subject: NamedNode) {
      const preferencesForm = sym('https://solid.github.io/solid-panes/dashboard/profileStyle.ttl#this')
      const preferencesFormDoc = preferencesForm.doc()
      if (!store.holds(undefined, undefined, undefined, preferencesFormDoc)) {
        // If not loaded already
        parse(preferencesFormText, store, preferencesFormDoc.uri, 'text/turtle', () => null) // Load form directly
      }

      widgets.appendForm(
        dom,
        div,
        {},
        subject,
        preferencesForm,
        editableProfile,
        complainIfBad
      )
    } // renderProfileForm

    const div = dom.createElement('div')
    let editableProfile: NamedNode | null
    div.setAttribute('style', `border: 0.3em solid ${highlightColor}; border-radius: 0.5em; padding: 0.7em; margin-top:0.7em;`)

    const table = div.appendChild(dom.createElement('table'))
    // const top = table.appendChild(dom.createElement('tr'))
    const main = table.appendChild(dom.createElement('tr'))
    const bottom = table.appendChild(dom.createElement('tr'))
    const statusArea = bottom.appendChild(dom.createElement('div'))
    statusArea.setAttribute('style', 'padding: 0.7em;')

    function comment (str: string) {
      const p = main.appendChild(dom.createElement('p'))
      p.setAttribute('style', 'padding: 1em;')
      p.textContent = str
      return p
    }

    function heading (str: string) {
      const h = main.appendChild(dom.createElement('h3'))
      h.setAttribute('style', 'color:' + highlightColor + ';')
      h.textContent = str
      return h
    }

    const profileContext = {
      dom: dom,
      div: main,
      statusArea: statusArea,
      me: null
    }
    authn.logInLoadProfile(profileContext)
      .then(loggedInContext => {
        const me = loggedInContext.me!

        heading('Edit your public profile')

        const profile = me.doc()
        if (!store.updater) {
          throw new Error('Store has no updater')
        }
        if (store.any(me, ns.solid('editableProfile'))) {
          editableProfile = store.any(me as any, ns.solid('editableProfile')) as NamedNode
        } else if (store.updater.editable(profile.uri, store)) {
          editableProfile = profile
        } else {
          statusArea.appendChild(widgets.errorMessageBlock(dom, `⚠️ Your profile ${profile} is not editable, so we cannot do much here.`, 'straw'))
          return
        }

        comment(`Everything you put here will be public.
        There will be other places to record private things.`)

        heading('Your contact information')

        main.appendChild(paneDiv(context, me, 'contact'))

        heading('People you know who have WebIDs')

        comment(`This is your public social network.
        Only put people here to whom you are happy to be publicly connected.
        (You can always keep private track of friends and family in your contacts.)`)

        // TODO: would be useful to explain what it means to "drag people"
        //       what is it that is being dragged?
        //       is there a way to search for people (or things to drag) on this page?
        if (editableProfile) {
          comment('Drag people onto the target below to add people.')
        }

        widgets.attachmentList(dom, me, main, {
          doc: profile,
          modify: !!editableProfile,
          predicate: ns.foaf('knows'),
          noun: 'friend'
        })

        heading('The style of your public profile')
        renderProfileForm(main, me)

        heading('Thank you for filling your profile.')
      })
      .catch(error => {
        statusArea.appendChild(widgets.errorMessageBlock(dom, error, '#fee'))
      })
    return div
  }
}

export default editProfileView
