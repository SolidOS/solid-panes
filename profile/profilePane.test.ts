/* eslint-env jest */
import namespaces from 'solid-namespace'
import { getLabel } from './profilePaneUtils'
import { graph, namedNode, sym } from 'rdflib'

const ns = namespaces({ namedNode })

describe('getLabel', () => {
  it('should return "Edit your profile" by default', () => {
    const mockStore = graph()
    const mockProfile = sym('https://profile.example')
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Edit your profile')
  })

  it('should return "Your profile" when viewing a Person', () => {
    const mockStore = graph()
    const mockProfile = sym('https://profile.example')
    mockStore.add(mockProfile, ns.rdf('type'), ns.foaf('Person'), mockProfile.doc())
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile')
  })

  it('should return "Your profile" when viewing an Individual', () => {
    const mockStore = graph()
    const mockProfile = sym('https://profile.example')
    mockStore.add(mockProfile, ns.rdf('type'), ns.vcard('Individual'), mockProfile.doc())
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile')
  })
})
