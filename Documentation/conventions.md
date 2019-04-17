# Data Shapes
## Prefixes used:
* @prefix ab: <http://www.w3.org/ns/pim/ab#>.
* @prefix acl: <http://www.w3.org/ns/auth/acl#>.
* @prefix dc: <http://purl.org/dc/elements/1.1/>.
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
