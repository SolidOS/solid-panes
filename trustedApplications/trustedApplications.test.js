/* eslint-env jest */
var $rdf = require('rdflib');
var ns = require('solid-namespace')($rdf);
var _a = require('./trustedApplicationsUtils'), getStatementsToDelete = _a.getStatementsToDelete, getStatementsToAdd = _a.getStatementsToAdd;
describe('getStatementsToDelete', function () {
    it('should return an empty array when there are no statements', function () {
        var mockStore = $rdf.graph();
        var mockOrigin = $rdf.sym('https://origin.example');
        var mockProfile = $rdf.sym('https://profile.example#me');
        expect(getStatementsToDelete(mockOrigin, mockProfile, mockStore, ns)).toEqual([]);
    });
    it('should return all statements for the given origin', function () {
        var mockStore = $rdf.graph();
        var mockApplication = $rdf.sym('https://app.example');
        var mockOrigin = $rdf.sym('https://origin.example');
        var mockProfile = $rdf.sym('https://profile.example#me');
        mockStore.add(mockApplication, ns.acl('origin'), mockOrigin);
        mockStore.add(mockApplication, ns.acl('mode'), ns.acl('Read'));
        mockStore.add(mockProfile, ns.acl('trustedApp'), mockApplication);
        var statementsToDelete = getStatementsToDelete(mockOrigin, mockProfile, mockStore, ns);
        expect(statementsToDelete.length).toBe(3);
        expect(statementsToDelete).toMatchSnapshot();
    });
    it('should not return statements for a different origin', function () {
        var mockStore = $rdf.graph();
        var mockApplication = $rdf.sym('https://app.example');
        var mockOrigin = $rdf.sym('https://origin.example');
        var mockProfile = $rdf.sym('https://profile.example#me');
        mockStore.add(mockApplication, ns.acl('origin'), mockOrigin);
        mockStore.add(mockApplication, ns.acl('mode'), ns.acl('Read'));
        mockStore.add(mockProfile, ns.acl('trustedApp'), mockApplication);
        var statementsToDelete = getStatementsToDelete($rdf.lit('A different origin'), mockProfile, mockStore, ns);
        expect(statementsToDelete.length).toBe(0);
        expect(statementsToDelete).toEqual([]);
    });
});
describe('getStatementsToAdd', function () {
    it('should return all required statements to add the given permissions for a given origin', function () {
        var mockOrigin = $rdf.sym('https://origin.example');
        var mockProfile = $rdf.sym('https://profile.example#me');
        var modes = [ns.acl('Read'), ns.acl('Write')];
        var statementsToAdd = getStatementsToAdd(mockOrigin, 'mock_app_id', modes, mockProfile, ns);
        expect(statementsToAdd.length).toBe(4);
        expect(statementsToAdd).toMatchSnapshot();
    });
});
