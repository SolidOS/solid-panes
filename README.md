# solid-panes
A set of core solid-compatible applets based on solid-ui

These are a set of interlinked applications, or parts of applications, 
which called 'panes' -- as in parts of a window.  A pane displays a data object of certain class using part of the window.
They don't tile like window panes necessarily, but one pane can involve other panes to display
objects related to the main object, in all kinds of creative ways. You can give the sub-pane a bit of 
HTML DOM element to work in, and the data object, and it does the rest. 

You can explicitly invoke a specific sub-pane, or you can just provide a DOM element to contain it, 
ask the pane system to pick the appropriate pane.  It does this by calling each potential pane in order
with the object, and asking whether it want to. Typically the pane chosen is the most specific pane, 
so typically a hand-written user interface will be chosen over a generic machine-generated one.

These panes are used in the Data Browser - see mashlib https://github.com/linkeddata/mashlib

Currently the panes available include;

- A default pane which lists the properties of any object
- An internals pane which allows the URI and the HTTP fetch history to be checked
- A pane for Address Books, Groups as well as individual Contacts 
- A pane for seeing pictures in a slideshow
- A pane for a playlist of YouTube videos
- A pane for a range of issue trackers, to-do-lists, agendas, etc
- A file and directory manager for a Solid/LDP hierarchical file store
- A Sharing pane to control the Access Control Lists for any object or folder
- and so on

The solid-app-set panes are built using a set of widgets and utilities in https://github.com/linkeddata/solid-ui

## Goals

- Make the system module in terms NPM modules for each pane

- Allow (signed?) panes to be advertised in turtle data in the web, and loaded automatically

- Allow a Solid user to save preferences for which panes are used for which data types.

- Create new panes for playlist and photo management and sharing, fitness, etc

Volunteers are always welcome!




