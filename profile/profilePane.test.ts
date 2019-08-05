/* eslint-env jest */
import * as $rdf from 'rdflib'
import * as namespaces from 'solid-namespace'
import { getLabel } from './profilePaneUtils'

const ns = (namespaces as any)($rdf)

describe('getLabel', () => {
  it('should return "Edit your profile" by default', () => {
    const mockStore = $rdf.graph()
    const mockProfile = $rdf.sym('https://profile.example')
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Edit your profile')
  })

  it('should return "Your profile" when viewing a Person', () => {
    const mockStore = $rdf.graph()
    const mockProfile = $rdf.sym('https://profile.example')
    mockStore.add(mockProfile, ns.rdf('type'), ns.foaf('Person'), mockProfile.doc())
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile')
  })

  it('should return "Your profile" when viewing an Individual', () => {
    const mockStore = $rdf.graph()
    const mockProfile = $rdf.sym('https://profile.example')
    mockStore.add(mockProfile, ns.rdf('type'), ns.vcard('Individual'), mockProfile.doc())
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile')
  })
})
