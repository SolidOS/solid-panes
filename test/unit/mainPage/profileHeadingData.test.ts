import { describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'
import { lit, sym } from 'rdflib'
import { ns } from 'solid-ui'
import { getViewerMode, presentProfile } from '../../../src/components/profile-heading/profileHeadingData'

describe('local profile heading presentation', () => {
  it('presents profile and contact data from the local RDF store', () => {
    const subject = sym('https://local-profile-heading.example/profile/card#me')
    const doc = subject.doc()
    const email = sym('https://local-profile-heading.example/profile/card#email')
    const address = sym('https://local-profile-heading.example/profile/card#address')
    const membership = sym('https://local-profile-heading.example/profile/card#role')

    store.add(subject, ns.vcard('fn'), lit('Local Heading'), doc)
    store.add(subject, ns.vcard('nickname'), lit('Local Nickname'), doc)
    store.add(subject, ns.vcard('bday'), lit('2000-01-02'), doc)
    store.add(subject, ns.solid('preferredSubjectPronoun'), lit('they'), doc)
    store.add(subject, ns.solid('preferredObjectPronoun'), lit('them'), doc)
    store.add(subject, ns.vcard('hasEmail'), email, doc)
    store.add(email, ns.vcard('value'), lit('person@example.com'), doc)
    store.add(email, ns.rdf('type'), ns.vcard('Work'), doc)
    store.add(subject, ns.vcard('hasAddress'), address, doc)
    store.add(address, ns.vcard('locality'), lit('Example City'), doc)
    store.add(address, ns.vcard('country-name'), lit('Example Country'), doc)
    store.add(membership, ns.org('member'), subject, doc)
    store.add(membership, ns.rdf('type'), ns.solid('CurrentRole'), doc)
    store.add(membership, ns.vcard('role'), lit('Engineer'), doc)

    const profile = presentProfile(subject, store)

    expect(profile.name).toBe('Local Heading')
    expect(profile.nickname).toBe('Local Nickname')
    expect(profile.dateOfBirth).toBe('2000-01-02')
    expect(profile.pronouns).toBe('they/them')
    expect(profile.jobTitle).toBe('Engineer')
    expect(profile.primaryEmail?.valueNode.value).toBe('person@example.com')
    expect(profile.location).toBe('Example City, Example Country')
    expect(profile.entryNode).toBe(subject)
  })

  it('determines anonymous and authenticated viewing modes locally', async () => {
    const subject = sym('https://local-viewer-mode.example/profile/card#me')
    const currentUser = vi.spyOn(authn, 'currentUser')

    try {
      currentUser.mockReturnValue(null)
      await expect(getViewerMode(subject)).resolves.toBe('anonymous')

      currentUser.mockReturnValue(sym('https://another-user.example/profile/card#me'))
      await expect(getViewerMode(subject)).resolves.toBe('authenticated')
    } finally {
      currentUser.mockRestore()
    }
  })
})
