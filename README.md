# solid-panes

A set of core solid-compatible applets based on solid-ui

These are a set of interlinked applications, or parts of applications,
which called 'panes' -- as in parts of a window. A pane displays a data object of certain class using part of the window.
They don't tile like window panes necessarily, but one pane can involve other panes to display
objects related to the main object, in all kinds of creative ways. You can give the sub-pane a bit of
HTML DOM element to work in, and the data object, and it does the rest.

You can explicitly invoke a specific sub-pane, or you can just provide a DOM element to contain it,
and ask the pane system to pick the appropriate pane. It does this by calling each potential pane in order
with the object, and asking whether it wants to render that object. Typically the pane chosen is the most specific pane,
so typically a hand-written user interface will be chosen over a generic machine-generated one.

These panes are used in the Data Browser - see mashlib
[https://github.com/linkeddata/mashlib](https://github.com/linkeddata/mashlib)

Currently the panes available include:

- A default pane which lists the properties of any object
- An internals pane which allows the URI and the HTTP fetch history to be checked
- A pane for Address Books, Groups as well as individual Contacts
- A pane for seeing pictures in a slideshow
- A pane for a playlist of YouTube videos
- A pane for a range of issue trackers, to-do-lists, agendas, etc
- A file and directory manager for a Solid/LDP hierarchical file store
- A Sharing pane to control the Access Control Lists for any object or folder
- and so on

The solid-app-set panes are built using a set of widgets and utilities in
[https://github.com/linkeddata/solid-ui](https://github.com/linkeddata/solid-ui)

To help onboarding, we're using [roles](https://github.com/solidos/userguide/#role) to limit the number of panes presented
to new users.

## Goals

- Make the system module in terms of NPM modules; one for each pane

- Allow (signed?) panes to be advertised in turtle data in the web, and loaded automatically

- Allow a Solid user to save preferences for which panes are used for which data types.

- Create new panes for playlist and photo management and sharing, fitness, etc

Volunteers are always welcome!

## Documentation
- [Visual Language](https://solidos.github.io/solid-panes/Documentation/VisualLanguage.html)
- [Conventions](./Documentation/conventions.md)

## Development
To get started, make sure you have Node.js installed (for instance
through https://github.com/nvm-sh/nvm), and:
1. run
```sh
git clone https://github.com/solidos/solid-panes
cd solid-panes
npm install
npm run start
```
2. a browser window should automatically open at http://localhost:9000, if for some reason it doesn't go ahead and manually navigate there.
3. Once you arrive at the Solid Pane Tester page, the profile-pane will be loaded by default, Proceed to edit solid-panes/dev/loader.ts and at line 5, you should see import Pane from 'profile-pane'. Simply change 'profile-pane' to your preferred pane/directory containing the pane of choice, for example, you could choose 'source-pane' and bam, it will load that pane. For those who are new, you can go to the solid-panes/src directory and manually navigate through each individual folder. In most folders, you simply look for any file that has Pane in the title. Copy and paste the pane.js file of your choice into the solid-panes/dev/pane folder or you can simply import directly from the src directory. For example import from '../src/dokieli/dokieliPane' will work just fine. Each time you save solid-panes/dev/loader.ts while importing a different pane, your browser at http://localhost:9000/ should automatically refresh. It's a good idea to keep the developer console open in your web browser to ensure panes are loading and rendering properly. 

4. Another tip to ensure you arrive at the proper destination, is to look at line 48-53 in solid-panes/dev/loader.ts. You should see an event listener that is ready for a string. renderPane('https://solidos.solidcommunity.net/Team/SolidOs%20team%20chat/index.ttl#this') will be the default. Depending on the pane.js that you choose from the earlier import statements, this renderPane function will determine how you want to see DOMContent inside of that particular pane. If you have created an index.html in your provider pod storage area, you could use 'https://yoursolidname.solidcommunity.net/profile/index.html' inside of the renderPane() function parameters. You can either edit the string manually in solid-panes/dev/loader.ts or you can go to your developer console and type renderPane('https://yoursolidname.solidcommunity.net/profile/index.html') just point to a part of your account that is congruent to the pane that you wish to import! :)

## Contributing panes
When you created a pane, you can either add it as an npm dependency
of this repo (for instance meeting-pane, issue-pane, chat-pane are all
imported in src/registerPanes.js), or add it under the src/ tree of this repo.


## Eg. some RDF CLasses

Here, just to show how it works, are how some RDF Classes map onto panes. Anything to do with
contacts (A VCARD Address Book, Group, Individual, Organization) can be handled by the one contact
pane. Any other pane which wants to deal with contacts can just use the pane within its own user interface.

![Mapping many classes on the L to panes on the R](https://solidos.github.io/solid-panes/doc/images/panes-for-classes.svg)
