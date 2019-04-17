# Data Conventions used by the databrowser
This document describes how the databrowser stores your data as triples in RDF documents on your pod.
As most Solid pods will have at least some data on them that was edited through the databrowser,
these conventions are a good place to start when you develop third-party apps. In the future, we'll
see how this document can grow into a bigger participatory wiki of data shape conventions for Solid.

For short-hand, we will use the following namespace prefixes here:

* @prefix ab: <http://www.w3.org/ns/pim/ab#>.
* @prefix acl: <http://www.w3.org/ns/auth/acl#>.
* @prefix dc: <http://purl.org/dc/elements/1.1/>.
* @prefix dct: <http://purl.org/dc/terms/>.
* @prefix flow: <http://www.w3.org/2005/01/wf/flow#>.
* @prefix foaf: <http://xmlns.com/foaf/0.1/>.
* @prefix ical: <http://www.w3.org/2002/12/cal/ical#>. 
* @prefix ldp: <http://www.w3.org/ns/ldp#>.
* @prefix mee: <http://www.w3.org/ns/pim/meeting#>.
* @prefix pim: <http://www.w3.org/ns/pim/space#>.
* @prefix schema: <http://schema.org/>.
* @prefix sioc: <http://rdfs.org/sioc/ns#>.
* @prefix solid: <http://www.w3.org/ns/solid/terms#>.
* @prefix sioc: <http://rdfs.org/sioc/ns#>.
* @prefix stat <http://www.w3.org/ns/posix/stat#>.
* @prefix ui: <http://www.w3.org/ns/ui#>.
* @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
* @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

One of the most important RDF documents on your pod is your profile, which is the document that people get when they dereference your webid. We'll look at that first. After that, we'll look at each of the tools that can be created with the databrowser's + button: Addressbook, Notepad, Chat, LongChat, Meeting, Event, Link, Document, Folder, and Source.

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

## Notepad
To create a new notepad at /notepad.ttl, add the following triples into it:
* </notepad.ttl#this> a pim:Notepad
* </notepad.ttl#this> dc:author </profile/card#me>
* </notepad.ttl#this> dc:created "2019-04-17T08:05:19Z"^^XML:dateTime
* </notepad.ttl#this> dc:title "Shared Notes"

Now to indicate that his notepad is empty, add an empty first line to it:
* </notepad.ttl#this> pim:next </notepad.ttl#this_line0>
* </notepad.ttl#line0> dc:author </profile/card#me>
* </notepad.ttl#line0> dc:content ""

Now indicate that this is the last line, set this line's pim:next to the notepad itself:
* </notepad.ttl#line0> pim:next </notepad.ttl#this>

To add a line to the notepad, for instance 'first line', first update the content of the first line, by replacing
* </notepad.ttl#line0> dc:content ""
with
* </notepad.ttl#line0> dc:content "first line"
and then add a new participation-line below it, where the user can type their next line; pick a timestamp, for instance 1555488949899, and add the following triples:
* </notepad.ttl#this> flow:participation </notepad.ttl#id1555488949899>
* </notepad.ttl#id1555488949899> flow:participant </profile/card#me>
* </notepad.ttl#id1555488949899> ical:dtstart "2019-04-17T08:05:22Z"^^XML:dateTime
* </notepad.ttl#id1555488949899> ui:backgroundColor "#c0d2fe"

Note that the first line still is the only line in the document, apart from the participation line. To add a second line, start making proper use of the pim:next attribute, by linking the first line to the second line, and then linking the second line back up to the notepad as a whole. The participation line stays as it is. The result will then look like this:

### Main notepad
* </notepad.ttl#this> a pim:Notepad
* </notepad.ttl#this> dc:author </profile/card#me>
* </notepad.ttl#this> dc:created "2019-04-17T08:05:19Z"^^XML:dateTime
* </notepad.ttl#this> dc:title "Shared Notes"
* </notepad.ttl#this> pim:next </notepad.ttl#this_line0>
* </notepad.ttl#this> flow:participation :id1555488949899

### Participation
* </notepad.ttl#id1555488949899> flow:participant </profile/card#me>
* </notepad.ttl#id1555488949899> ical:dtstart "2019-04-17T08:05:22Z"^^XML:dateTime
* </notepad.ttl#id1555488949899> ui:backgroundColor "#c0d2fe"

### First line
* </notepad.ttl#line0> dc:author </profile/card#me>
* </notepad.ttl#line0> dc:content "first line"
* </notepad.ttl#line0> pim:next :id1555489499814 

### Second line
* </notepad.ttl#id1555489499814> dc:author </profile/card#me>
* </notepad.ttl#id1555489499814> dc:content "second line"
* </notepad.ttl#id1555489499814> pim:next :</notepad.ttl#this>

## Chat
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

## LongChat
LongChat is similar to Chat, except that it uses LDP containers to discover the triples that describe the chat conversation,
instead of having all the triples in one chat.ttl doc.
To create a chat conversation, pick a timestamp, e.g. 1555491215455, create an LDP container, for instance /long-chat/, and in there, create an index document, e.g. /long-chat/index.ttl. To the index document, add the following triples:
* </long-chat/index.ttl#this> a mee:LongChat
* </long-chat/index.ttl#this> dc:author </profile/card#me>
* </long-chat/index.ttl#this> dc:created "2018-07-06T21:36:04Z"^^XML:dateTime
* </long-chat/index.ttl#this> dc:title "Chat channel"
* </long-chat/index.ttl#this> flow:participation :id1555491215455
* </long-chat/index.ttl#this> ui:sharedPreferences :SharedPreferences
* </long-chat/index.ttl#id1555491215455> ic:dtstart "2019-04-17T08:53:35Z"^^XML:dateTime
* </long-chat/index.ttl#id1555491215455> flow:participant </profile/card#me>
* </long-chat/index.ttl#id1555491215455> ui:backgroundColor "#c0d2fe"

To add a message in the LongChat conversation, for instance where you say "hi", pick a filename, for instance /long-chat/2019/04/17/chat.ttl, generate a timestamp like 1555487418787 and add the following triples to /long-chat/2019/04/17/chat.ttl:
* </long-chat/2019/04/17/chat.ttl#Msg1555487418787> dct:created "2019-04-17T07:50:18Z"^^XML:dateTime
* </long-chat/2019/04/17/chat.ttl#Msg1555487418787> sioc:content "hi"
* </long-chat/2019/04/17/chat.ttl#Msg1555487418787> foaf:maker </profile/card#me>
* </long-chat/index.ttl#this> flow:message </long-chat/2019/04/17/chat.ttl#Msg1555487418787>

Note that there is no need to make /long-chat/2019/04/17/chat.ttl discoverable from /long-chat/index.ttl, since it can be discovered by following the LDP Container member listings for /long-chat/, /long-chat/2019/, /long-chat/2019/04/, and /2019/04/17/.
Also note that here too, for the chat conversation as a whole, we use `dc:created` and `dc:author`, whereas for the individual chat messages we use `dct:created` and `foaf:maker`.

## Meeting
// TODO

## Event
// TODO

## Link
// TODO

## Document
// TODO

## Folder
When you add a 'Folder' tool, the databrowser creates a new LDP container. As an example, here are the triples that describe an LDP container '/foo/' with subcontainer '/foo/sub/' and member document '/foo/bar.ttl':
* </foo/> a ldp:BasicContainer
* </foo/> a ldp:Container
* </foo/> a ldp:Resource
* </foo/> dct:modified "2019-04-17T08:42:16Z"^^XML:dateTime
* </foo/> stat:mtime 1555490536.16
* </foo/> stat:size 4096
* </foo/> ldp:contains </foo/sub/>
* </foo/> ldp:contains </foo/bar.ttl>

## Source
When you add a 'Source' tool to a container, it creates an empty document as an LDP resource. The content type will be guessed from the extension, for instance source.ttl will be a Turtle document, source.txt will be text/plain, etc.