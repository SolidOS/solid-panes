# solid-app-set
A set of core solid-compatible apps based on solid-ui

These are a set of interlinked applications, or parts of applications, 
which actually called 'panes'.  A pane dispplays a data object of certain class using part of the windw.
They don't tile like window panes necessarily, but one pane can involed other panes to display
objects related to the main object, in all kinds of creative ways. You can give the sub-pane a bit of 
HTML DOM element to work in, and the data object, and it does the rest. 

You can explicitly invokle a specific sub-pane, or you can just provide a DOM element to contain it, 
ask the pane system to pick the appropriate pane.  It does this by calling each potential pane in order
with the object, and asking whether it want to. Typically the pane chosen is the most speicific pane, 
so typically a hand-written user interface will be chosen over a generic machine-generated one.

These panes are used in the Data Bowser - see mashlib https://github.com/linkeddata/mashlib

Currently th panes available include

- A default pane which lists the peoperties of any object
- An internals pane which allows the URI and the HTTP fetch history to be checked
- A pane for Address Books, Groups as well as individuall Contacts 
- A pane for seeing pictures in a slideshow
- a pane for a plylist of yourtube videos
- A pane for a range of issue rackers, to-do-lists, agendas, etc
- A file and directory manager for a Solid/LDP hierarchical file store
- A Sharing pane to control the Access Control Lists for any object or folder
- and so on

The solid-app-set panes are built using a set of widgets and utilities in the solid-ui 
system.

Goals:

- Make the system module in terms NPM modules for each pane

- Allow (signed?) panes to be advertized in turtle data in the web, and loaded synmanically

- Alllow a Solid user to save preferences for which panes are ysed for which data types.

- Create new panes for platlist and photo management and sharing, fitness, etc

Volunteers are always welcome!




