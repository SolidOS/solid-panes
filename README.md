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

To get started, make sure you have Node.js installed (for instance through [nvm](https://github.com/nvm-sh/nvm)), then:

1. Clone, install, and start the dev server:

```sh
git clone https://github.com/solidos/solid-panes
cd solid-panes
npm install
npm start
```
2. Open http://localhost:5173 in your browser. You should see the pane development sandbox.

3. You can change the `subject` in the sandbox to determine which pane gets rendered. For example, the default subject loads the `profile-pane`.

## Contributing panes
When you created a pane, you can either add it as an npm dependency
of this repo (for instance meeting-pane, issue-pane, chat-pane are all
imported in src/registerPanes.js), or add it under the src/ tree of this repo.


## Eg. some RDF CLasses

Here, just to show how it works, are how some RDF Classes map onto panes. Anything to do with
contacts (A VCARD Address Book, Group, Individual, Organization) can be handled by the one contact
pane. Any other pane which wants to deal with contacts can just use the pane within its own user interface.

![Mapping many classes on the L to panes on the R](https://solidos.github.io/solid-panes/doc/images/panes-for-classes.svg)


## Generative AI usage
The SolidOS team is using GitHub Copilot integrated in Visual Studio Code.
We have added comments in the code to make it explicit which parts are 100% written by AI.

### Prompt usage hitory:
* Model Claude Opus 4.6: Initially solid-panes is loaded into an HTML shell form mashlib that looks like ... Also, an iFrame is rendered inside the `<div class="TabulatorOutline" id="DummyUUID">` for “isolated pane rendering”. Analyze the solid-panes code for what it uses from this HTML and suggest a new HTML structure which is mobile and accessibility friendly. Let's go ahead and make changes in this code as suggested to accommodate the new databrowser HTML.

* Raptor mini: take a look at how I wired the environment from mashlib into solid-panes. It is not quite right, can you suggest fixes?

* Raptor mini: Update the code to use the new solid-ui-header component. Keep in mind the log in and sign up are wired in specific ways.

* Auto: change the menu to fill up the menu items like in the code: async function getMenuItems (outliner: any) {
const items = await outliner.getDashboardItems()
return items.map((element) => {
return {
label: element.label,
onclick: () => openDashboardPane(outliner, element.tabName || element.paneName)
}
})
}

* Auto: each #sym:MenuItem has an icon which i want displayed on the left side of each menu item when rendered

* Auto: don't add each menu item in a button looking border. Simply list them.
Upon hover apply background color e6dcff and selected or active to be background color: cbb9ff

* Raptor mini: the menu dissapears when on mobile. That is great.
I want the menu to have a tiny button on the bottom margin left with an arrow to the left or right for expanding the menu or for making it small. This is only for web. When we make it small it folds and only displays the icons of teh menu items, when it is expanded it should also add the labels to the menu items.

* Raptor mini: i want to imporve the left side menu on mobile. When the menu is visible it should be higher, the top part should be on top of the header, folding out and in with the rest of the menu. It should have an x close button and it should say menu. The locor of that top line of the header should be the color of the header 332746

* Raptor mini: the menu, on desktop, has a button to fold in or out. I want the same behavior to occur also when i simply click the folded in menu: it should expend. Not just when i click the dedicated button

* Raprot mini: instead of this code (index.ts of footer), I want to make use of a new footer web component with the readme: # solid-ui-footer component

* Raptor mini: The footer created should actually be part of the left side menu only. Should be displayed inside it and should collaps and expand as the menu.

* Raptor mini: the footer should completely dissapear when menu folded up.

* Raptor mini: Please always keep the footer at the bottom of the menu

* GPT-5.4 Model: Add a compatibility shim in the form pane for mixed `ui:Group` plus field typing.
