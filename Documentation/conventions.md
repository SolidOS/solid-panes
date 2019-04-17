# Data Shapes
## Prefixes used:
* @prefix ab: <http://www.w3.org/ns/pim/ab#>.
* @prefix acl: <http://www.w3.org/ns/auth/acl#>.
* @prefix dc: <http://purl.org/dc/elements/1.1/>.
* @prefix dct: <http://purl.org/dc/terms/>.
* @prefix foaf: <http://xmlns.com/foaf/0.1/>.
* @prefix ldp: <http://www.w3.org/ns/ldp#>.
* @prefix mee: <http://www.w3.org/ns/pim/meeting#>.
* @prefix pim: <http://www.w3.org/ns/pim/space#>.
* @prefix schema: <http://schema.org/>.
* @prefix sioc: <http://rdfs.org/sioc/ns#>.
* @prefix solid: <http://www.w3.org/ns/solid/terms#>.
* @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
* @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

## Addressbook

You can create an addressbook containing persons and groups, by adding triples to RDF documents on your pod.
To create an addressbook, create a document for it, e.g. /address-book/index.ttl, and add the following triples to that document:
* </address-book/index.ttl#this> a vcard:AddressBook
* </address-book/index.ttl#this> dc:title "New address Book"
* </address-book/index.ttl#this> acl:owner </profile/card#me>

You can create separate documents for the people index and for the groups index, as long as you link to those from the main /address-book/index.ttl document in the following ways:
* </address-book/index.ttl#this> vcard:nameEmailIndex </address-book/peopleIndex.ttl>
* </address-book/index.ttl#this> vcard:groupIndex </address-book/groupIndex.ttl>

To indicate that a person /johnDoe.ttl with full name "John Doe" is in addressbook /address-book/index.ttl, add the following triples:
* </johnDoe.ttl#this> vcard:inAddressBook /address-book/index.ttl#this (NB: needs to be in /address-book/peopleIndex.ttl)
* </johnDoe.ttl#this> a vcard:Individual
* </johnDoe.ttl#this> vcard:fn "John Doe"

To indicate that addressbook /address-book/index.ttl has a group called "Colleagues", add the following triples:

* </address-book/index.ttl#this> vcard:includesGroup /address-book/colleagues.ttl#this (NB: needs to be in /address-book/groupIndex.ttl)
* </address-book/colleagues.ttl#this> a vcard:Group
* </address-book/colleagues.ttl#this> vcard:fn "Colleagues"

## Profile
### Profile document
To add information to your webid profile, you can use the following triples. Suppose your webid is /profile/card#me, then your profile document is /profile/card (without the '#me'). Add the following triples to it:
* </profile/card> a foaf:PersonalProfileDocument
* </profile/card> foaf:maker </profile/card#me>
* </profile/card> foaf:primaryTopic </profile/card#me>

### You as a person
Now say your name is "John Doe", then add these triples to your profile document to publish your identity as a person:
* </profile/card#me> a foaf:Person
* </profile/card#me> a schema:Person
* </profile/card#me> foaf:name "John Doe"

### Linking to your pod
Say your pod is at /pod, with the LDN inbox at /pod/inbox/, to link from your identity to your pod:
* </profile/card#me> solid:account </pod>
* </profile/card#me> pim:storage </pod>
* </profile/card#me> ldp:inbox </pod/inbox/>

### Preferences
To publish some of your generic preferences to apps, use:
* </profile/card#me> pim:preferencesFile </settings/prefs.ttl>
* </profile/card#me> solid:publicTypeIndex </settings/publicTypeIndex.ttl>
* </profile/card#me> solid:privateTypeIndex </settings/privateTypeIndex.ttl>

# Chat
To create a chat conversation, create a document, e.g. /chat.ttl, and add the following triples to it:
* </chat.ttl#this> a mee:LongChat
* </chat.ttl#this> dc:author </profile/card#me>
* </chat.ttl#this> dc:created "2018-07-06T21:36:04Z"^^XML:dateTime
* </chat.ttl#this> dc:title "Chat channel"

To add a message in the chat conversation, for instance where you say "hi", generate a timestamp like 1555487418787 and add the following triples to /chat.ttl:
* </chat.ttl#Msg1555487418787> dct:created "2019-04-17T07:50:18Z"^^XML:dateTime
* </chat.ttl#Msg1555487418787> sioc:content "hi"
* </chat.ttl#Msg1555487418787> foaf:maker </profile/card#me>

Note that for historical reasons, for the chat conversation as a whole, we use `dc:created` and `dc:author`, whereas for the individual chat messages we use `dct:created` and `foaf:maker`.