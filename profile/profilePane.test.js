const $rdf = require('rdflib');
const ns = require('solid-namespace')($rdf);
const { getLabel } = require('./profilePaneUtils');

describe('getLabel', () => {
  it('should return "Edit your profile" by default', () => {
    const mockStore = $rdf.graph();
    const mockProfile = $rdf.lit('Mock profile');
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Edit your profile');
  });

  it('should return "Your profile" when viewing a Person', () => {
    const mockStore = $rdf.graph();
    const mockProfile = $rdf.lit('Mock profile');
    mockStore.add(mockProfile, ns.rdf('type'), ns.foaf('Person'));
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile');
  });

  it('should return "Your profile" when viewing an Individual', () => {
    const mockStore = $rdf.graph();
    const mockProfile = $rdf.lit('Mock profile');
    mockStore.add(mockProfile, ns.rdf('type'), ns.vcard('Individual'));
    expect(getLabel(mockProfile, mockStore, ns)).toBe('Your Profile');
  });
});
