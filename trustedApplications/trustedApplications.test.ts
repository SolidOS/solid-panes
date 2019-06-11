/* eslint-env jest */
const $rdf = require('rdflib')
const ns = require('solid-namespace')($rdf)
const { getStatementsToDelete, getStatementsToAdd } = require('./trustedApplications.service')

describe('getStatementsToDelete', () => {
  it('should return an empty array when there are no statements', () => {
    const mockStore = $rdf.graph()
    const mockOrigin = $rdf.sym('https://fake.origin')
    const mockProfile = $rdf.sym('https://fake.profile#me')
    expect(getStatementsToDelete(mockOrigin, mockProfile, mockStore, ns)).toEqual([])
  })

  it('should return all statements for the given origin', () => {
    const mockStore = $rdf.graph()
    const mockApplication = $rdf.sym('https://fake.app')
    const mockOrigin = $rdf.sym('https://fake.origin')
    const mockProfile = $rdf.sym('https://fake.profile#me')
    mockStore.add(mockApplication, ns.acl('origin'), mockOrigin)
    mockStore.add(mockApplication, ns.acl('mode'), ns.acl('Read'))
    mockStore.add(mockProfile, ns.acl('trustedApp'), mockApplication)
    const statementsToDelete = getStatementsToDelete(mockOrigin, mockProfile, mockStore, ns)
    expect(statementsToDelete.length).toBe(3)
    expect(statementsToDelete).toMatchSnapshot()
  })

  it('should not return statements for a different origin', () => {
    const mockStore = $rdf.graph()
    const mockApplication = $rdf.sym('https://fake.app')
    const mockOrigin = $rdf.sym('https://fake.origin')
    const mockProfile = $rdf.sym('https://fake.profile#me')
    mockStore.add(mockApplication, ns.acl('origin'), mockOrigin)
    mockStore.add(mockApplication, ns.acl('mode'), ns.acl('Read'))
    mockStore.add(mockProfile, ns.acl('trustedApp'), mockApplication)

    const statementsToDelete = getStatementsToDelete($rdf.lit('A different origin'), mockProfile, mockStore, ns)
    expect(statementsToDelete.length).toBe(0)
    expect(statementsToDelete).toEqual([])
  })
})

describe('getStatementsToAdd', () => {
  it('should return all required statements to add the given permissions for a given origin', () => {
    const mockOrigin = $rdf.sym('https://fake.origin')
    const mockProfile = $rdf.sym('https://fake.profile#me')
    const modes = [ns.acl('Read'), ns.acl('Write')]

    const statementsToAdd = getStatementsToAdd(mockOrigin, 'mock_app_id', modes, mockProfile, ns)
    expect(statementsToAdd.length).toBe(4)
    expect(statementsToAdd).toMatchSnapshot()
  })
})
