# Data Shapes
## Prefixes used:
* @prefix ab: <http://www.w3.org/ns/pim/ab#>.
* @prefix acl: <http://www.w3.org/ns/auth/acl#>.
* @prefix dc: <http://purl.org/dc/elements/1.1/>.
* @prefix foaf: <http://xmlns.com/foaf/0.1/>.
* @prefix ldp: <http://www.w3.org/ns/ldp#>.
* @prefix pim: <http://www.w3.org/ns/pim/space#>.
* @prefix schema: <http://schema.org/>.
* @prefix solid: <http://www.w3.org/ns/solid/terms#>.
* @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
* @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

## Addressbook

You can create an addressbook containing persons and groups, by adding triples to RDF documents on your pod.
To create an addressbook, create a document for it, e.g. addressBook.ttl, and add the following triples to that document:
* <addressBook.ttl#this> a vcard:AddressBook
* <addressBook.ttl#this> dc:title "New address Book"
* <addressBook.ttl#this> acl:owner <owner.ttl#me>

You can create separate documents for the people index and for the groups index, as long as you link to those from the main addressBook.ttl document in the following ways:
* <addressBook.ttl#this> vcard:nameEmailIndex <peopleIndex.ttl>
* <addressBook.ttl#this> vcard:groupIndex <groupIndex.ttl>

To indicate that a person johnDoe.ttl with full name "John Doe" is in addressbook addressBook.ttl, add the following triples:
* <johnDoe.ttl#this> vcard:inAddressBook addressBook.ttl#this (NB: needs to be in peopleIndex.ttl)
* <johnDoe.ttl#this> a vcard:Individual
* <johnDoe.ttl#this> vcard:fn "John Doe"

To indicate that addressbook addressBook.ttl has a group called "Colleagues", add the following triples:

* <addressBook.ttl#this> vcard:includesGroup colleagues.ttl#this (NB: needs to be in groupIndex.ttl)
* <colleagues.ttl#this> a vcard:Group
* <colleagues.ttl#this> vcard:fn "Colleagues"

## Profile
### Profile document
To add information to your webid profile, you can use the following triples. Suppose your webid is https://example.com/profile/card#me, then your profile document is https://example.com/profile/card (without the '#me'). Add the following triples to it:
* <https://example.com/profile/card> a foaf:PersonalProfileDocument
* <https://example.com/profile/card> foaf:maker <https://example.com/profile/card#me>
* <https://example.com/profile/card> foaf:primaryTopic <https://example.com/profile/card#me>

### You as a person
Now say your name is "John Doe", then add these triples to your profile document to publish your identity as a person:
* <https://example.com/profile/card#me> a foaf:Person
* <https://example.com/profile/card#me> a schema:Person
* <https://example.com/profile/card#me> foaf:name "John Doe"

### Linking to your pod
Say your pod is at https://pod.example.com, with the LDN inbox at https://pod.example.com/inbox/, to link from your identity to your pod:
* <https://example.com/profile/card#me> solid:account </>
* <https://example.com/profile/card#me> pim:storage </>
* <https://example.com/profile/card#me> ldp:inbox </inbox/>

### Preferences
To publish some of your generic preferences to apps, use:
* <https://example.com/profile/card#me> pim:preferencesFile </settings/prefs.ttl>
* <https://example.com/profile/card#me> solid:publicTypeIndex </settings/publicTypeIndex.ttl>
* <https://example.com/profile/card#me> solid:privateTypeIndex </settings/privateTypeIndex.ttl>

