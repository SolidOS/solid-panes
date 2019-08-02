"use strict";
exports.__esModule = true;
/* eslint-env jest */
var rdflib_1 = require("rdflib");
var solid_namespace_1 = require("solid-namespace");
var profilePaneUtils_1 = require("./profilePaneUtils");
var ns = solid_namespace_1["default"](rdflib_1["default"]);
describe('getLabel', function () {
    it('should return "Edit your profile" by default', function () {
        var mockStore = rdflib_1["default"].graph();
        var mockProfile = rdflib_1["default"].sym('https://profile.example');
        expect(profilePaneUtils_1.getLabel(mockProfile, mockStore, ns)).toBe('Edit your profile');
    });
    it('should return "Your profile" when viewing a Person', function () {
        var mockStore = rdflib_1["default"].graph();
        var mockProfile = rdflib_1["default"].sym('https://profile.example');
        mockStore.add(mockProfile, ns.rdf('type'), ns.foaf('Person'), mockProfile.doc());
        expect(profilePaneUtils_1.getLabel(mockProfile, mockStore, ns)).toBe('Your Profile');
    });
    it('should return "Your profile" when viewing an Individual', function () {
        var mockStore = rdflib_1["default"].graph();
        var mockProfile = rdflib_1["default"].sym('https://profile.example');
        mockStore.add(mockProfile, ns.rdf('type'), ns.vcard('Individual'), mockProfile.doc());
        expect(profilePaneUtils_1.getLabel(mockProfile, mockStore, ns)).toBe('Your Profile');
    });
});
