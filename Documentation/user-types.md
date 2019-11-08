## User types

There are many views (aka panes) available through solid-panes, and some do not present a very good UX.
We wanted to limit some of these views in order to improve the onboarding experience for new users,
and to help us with this we've introduced user types.
These are opt-in and as a new user you aren't assigned any.
You can self-assign these through Preferences in the Dashboard,
and they will be stored in your settings (which are private by default).

The data browser will use these user types to reason which views are applicable for you.
For instance, if a view lists Developer as audience,
the data browser will avoid serving you that view unless you've self-assigned Developer as a user type.
An exception to this is if the view is the most relevant for a given resource, which makes sharing resources easier.

For now we've introduced the user types "Developer" and "Power User".
The former are assigned to views that deal with various data views (e.g., N3, RDF/XML, etc.),
while the latter are a catch-all for views that are either difficult to use or needs a bit of
attention before they are reintroduced to non-technical users.

Below is a table that documents the existing views and the user types that are associated with them.
If you want access to some of these views, make sure to self-assign the proper user-type.

| Name                 | User types |
| -------------------- | ---------- |
| Access Control       |            |
| Basic Preferences    |            |
| Chat - Long          |            |
| Chat - Short         | Power User |
| Class Instance       | Power User |
| Contact              |            |
| Dashboard            |            |
| Data Contents        | Developer  |
| Default              |            |
| Dokieli              |            |
| Folder               |            |
| Form                 | Power User |
| Home                 |            |
| Human Readable       |            |
| Internal             | Developer  |
| Issue                | Power User |
| Meeting              | Power User |
| N3                   | Developer  |
| Pad                  | Power User |
| Playlist             | Power User |
| Profile - Edit       |            |
| Profile - View       |            |
| RDF/XML              | Developer  |
| Schedule             | Power User |
| Slideshow            | Power User |
| Social               |            |
| Source               |            |
| Tabbed               | Power User |
| Table of Class       | Developer  |
| Transaction          | Power User |
| Transaction Period   | Power User |
| Trip                 | Power User |
| Trusted Applications |            |
| UI                   | Power User |
| Video                |            |
