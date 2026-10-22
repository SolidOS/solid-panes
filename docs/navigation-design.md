# Navigation in the databrowser

This document describes how navigation works in `solid-panes` as implemented: what decides what the
page shows, where that logic lives, the rules it follows, and its known limits.

## What decides what is shown

What the user sees depends on several things at once:

- the page URL
- the pane that was last opened, and whether the account menu or the navbar opened it
- who is logged in
- whose pod the URL is in

Each of these is read in one place (below), and the rules that combine them are pure functions, so
the heading, the navbar, the outline and the file explorer header all apply the same decision.

## Where the logic lives

| Concern | Where |
|---|---|
| Reading and writing what a history entry displayed (`paneName`, `paneUri`, `viaAccountMenu`) | `navigation/state.ts`; the one write is in `GotoSubject` (`outline/manager.js`) |
| Rules for the heading, navbar and file explorer header | `navigation/chrome.ts` (pure functions) |
| Whose pod the page is in, the viewer's storages | `navigation/podContext.ts` (cached lookups) |
| Displaying a view and the follow-up effects | `navigation/controller.ts`, wired to the real navbar and heading in `mainPage/navigation.ts` |
| Telling the page that a view was displayed | `navigation/events.ts` (`solid-panes:navigated`, dispatched by `GotoSubject`) |
| Who asked for a view (`GotoSubject`'s seventh argument) | `navigation/options.ts` |
| Showing or hiding the navbar | `navigation/navbarVisibility.ts` |
| Page load and reload | `initMainPage` (`mainPage/index.ts`) |
| Layout and theme changes | `refreshUI` (`mainPage/index.ts`), called by mashlib |
| Enter on the current URL, back and forward | `navigation/browserEvents.ts` |
| Account menu | `mainPage/header.ts` (maps a choice to an intent) |
| Navbar | `mainPage/navbar.ts` (builds items from the pod context, maps a choice to an intent) |
| Profile heading | `mainPage/profileHeading.ts` (applies `deriveHeading` to the pod context) |
| What is displayed for a pane | `GotoSubject` (displayed subject, open-inside-storage), `FileExplorerProvider` (applies the header rule) |
| Other callers of `GotoSubject` | links in the outline, `solid-ui` buttons, `tabbedPane`, mashlib |

## Paths into the page

Every way of changing what is displayed ends in `GotoSubject`. Most of them go through the
navigation controller, which always applies the same follow-up effects.

| Path | Resolves the pane | Navbar | Heading |
|---|---|---|---|
| Page load (`initMainPage`) | controller (`restore`) | built once from the pod context | refreshed by the controller |
| Account menu (`header.ts`) | controller | hidden | refreshed by the controller |
| Navbar click (`navbar.ts`) | controller | selection kept by the navbar, then `selectNavbarPane` | refreshed by the controller |
| Enter, back and forward | controller (`restore`, after clearing the saved pane) | `selectNavbarPane` | refreshed by the controller |
| Layout or theme change | controller (`restore`, keeps the saved pane and the account-menu marker) | `selectNavbarPane`, or hidden | refreshed by the controller |
| Links and buttons in `solid-ui`, `GotoSubject` calls from mashlib | none (default pane); not through the controller | selection updated within the same pod; rebuilt on a pod change, via the `navigated` event | refreshed via the `navigated` event |

`GotoSubject` is called directly, with `solo` true, by `solid-ui` (`buttons.ts`, `forms.js`) and
mashlib. Those callers rely on it to push the history entry and the URL, so it is the one place that
writes history, and it announces what it did.

Storage is an explicit browser view, not a resource's default pane. Its pane item
renders the storage root with `solo` and `fullView` disabled, so the storage
header, sidebar and listing remain visible even if the root has an index document.
Selecting resources inside Storage replaces only its content area.

Direct resource URLs use `getRelevantPanes` to choose the full-page resource
view. With no explicitly requested pane, a container containing `index.ttl`
resolves to `index.ttl#this` before selecting its pane. Indexed subjects have no
file-explorer header. Ordinary containers retain their contents view, without
the Storage shell during solo resource navigation.

## Rules

### URL and history
- The page URL is never changed by the account menu or the navbar. They display something else while
  the URL keeps pointing at what the user opened.
- A history entry records the displayed pane (`paneName`, `paneUri`) and whether the account menu
  opened it (`viaAccountMenu`). Pane details are never copied into the entry of a different URL.

### What loads
- **Reload, Enter and back/forward all show what the URL is.** Whatever the entry last displayed
  through the navbar or the account menu is discarded first.
  - A WebID (ends in `#me`): the profile pane, with Profile selected in the navbar.
  - Any other URL, including the document that holds a WebID such as `/timea2/profile/card`: the
    resource or container as it is, with its file explorer header (unless it is a root resource) and
    its content. Only `#me` URLs count as profile pages.
- **Enter on the current URL** does this without reloading the page. It is only handled when the
  browser has the Navigation API; otherwise Enter reloads the page, which is the same result for a
  URL without a fragment.
- **Layout or theme change** (`refreshUI`) re-renders the current entry in place, keeping the URL
  and the account-menu marker.

### Displayed subject
- A pane with its own subject (profile, friends, or the storage of a person) is displayed for that
  subject, not for the URL.
- For a storage, the container or resource from the URL is opened inside it, level by level.

### Navbar
- Hidden for the logged-in viewer's own profile (WebID or its document) and URLs inside any of
  their storages, including resources opened through storage links. Also hidden by the account
  menu. Shown for other URLs, including when logged out.
- Built from the pod the page is in. Profile and Friends are only offered when the owner of the pod
  is known. When a navigation lands in another pod, the items are built again. Within the same pod,
  navigation events update the selection from the displayed view without rebuilding the menu.
- On a container or resource URL nothing is selected; on a WebID, Profile is.
- Choosing an item displays it for the URL the page has at that moment, not the one it had when the
  items were built.

### Profile heading
- Full on the profile pane, compact on friends and on other panes.
- On other panes it shows the pod owner, unless the owner is the viewer, the view came from the
  account menu, or the owner is unknown.
- It reads the owner from the pod context, so it does not depend on the navbar existing.

### File explorer header
- Never shown for the profile and friends panes.
- Never shown for root resources or WebIDs.
- For account-menu views and for panes with their own subject: shown only when the URL is inside the
  viewer's own pod.

## Modules

### Navigation state (`navigation/state.ts`)
The only place that knows how a history entry records what was displayed.

```ts
type ViewKind = 'default' | 'profile' | 'friends' | 'storage' | 'pane'

interface NavigationView {
  kind: ViewKind
  pane?: string       // registry name of the pane; set unless the kind is 'default'
  subject?: string    // what the pane displays when that is not the page URL
}

interface NavigationState { view: NavigationView, viaAccountMenu: boolean }
```

- `readNavigationState()` and `parseNavigationState(raw)` read an entry.
- `nextHistoryState(current, change)` is the rule for what to store after displaying something: pane
  details never leak into another URL's entry, a subject does not outlive its pane, and the
  account-menu marker is set or cleared.
- `clearPaneState()` and `withoutPaneState()` forget what an entry displayed.
- The stored shape is `paneName`, `paneUri`, `viaAccountMenu`. The kind is derived from the pane
  name. There is no stored record of whether the URL or the navbar opened a view; the account-menu
  marker is the only source any rule uses.

### Chrome rules (`navigation/chrome.ts`)
Pure functions that read no history, DOM or session:

| Function | Decides | Used by |
|---|---|---|
| `deriveHeading` | whether the profile heading shows, full or compact, and for which profile; takes the pod `owner` and the pod's `storageUris` | `profileHeading.ts` |
| `deriveNavbarSelection`, `isNavbarItemSelected`, `pickNavbarItem` | which navbar item is selected | `navbar.ts` |
| `isNavbarHidden` (with `setNavbarHidden` in `navbarVisibility.ts`) | whether the navbar is shown | `navbar.ts`, `controller.ts`, `outline/manager.js` |
| `deriveExplorerHeader`, `explorerHeaderForPane`, `isPersonPane` | whether the file explorer header shows | `outline/manager.js`, `FileExplorerProvider` |

There is no single "derive everything" function: each consumer needs different inputs (the explorer
header is decided per provider, the heading needs the pod), so the controller composes the effects.

### Pod context (`navigation/podContext.ts`)
Whose pod the page is in, loaded once and cached.

```ts
interface PodContext { viewer?: string, owner?: string, storagePanes: PaneItem[], viewerStorages: string[] }
```

- `getPodContext(url)` assembles it from the parts below. `isInViewerPod`, `isSamePod` and
  `isPageInViewerPod` answer questions about a context.
- The parts are cached separately because they depend on different things:
  - the **owner**, per document: the profile lookup can end with that document's own
    `foaf:primaryTopic`, so two pages of one pod need not share an owner;
  - the **storages**, per pod (origin and first path segment);
  - the **viewer's storages**, per viewer.
- A failed lookup is not kept, so the next request asks again. At most 500 documents are remembered.
- The owner is unknown when the lookup falls back to the page URL itself, so an unrelated resource
  does not get a "pod owner" heading. Tests call `resetPodContexts()` between cases.

### Event (`navigation/events.ts`)
When `solo`, `GotoSubject` dispatches `solid-panes:navigated` on the document after writing the
history entry, with the URL and the stored state. This is how calls that bypass the controller
(`solid-ui`, mashlib) still reach the chrome: the navbar listens, to rebuild itself when a
navigation lands in another pod, and the heading listens, to refresh itself. The heading does not
watch the DOM.

### Options (`navigation/options.ts`)
`GotoSubject`'s seventh argument takes `{ source: 'accountMenu' | 'default' }`. The older boolean form
(`false` for the account menu) is still accepted with the same meaning.

### Controller (`navigation/controller.ts`)
`navigation.show(intent)` is the one way to display a view and bring the chrome in line with it:

```ts
type NavigationIntent =
  | { kind: 'restore', subject?, forceHeading? }           // what the URL (or current entry) displays
  | { kind: 'profile' | 'friends', subject, source? }      // a person, by WebID
  | { kind: 'storage', pane, source? }
  | { kind: 'app', pane, source? }                         // by registry name: home, basicPreferences
```

- It resolves the pane, renders through `GotoSubject`, then sets navbar visibility and selection and
  refreshes the heading, in that order.
- For an account-menu source it hides the navbar before resolving the pane.
- A newer intent wins over one still resolving its pane. This latest-wins token covers the
  controller's renders only; the heading's own request counter and the manager's open-inside-storage
  guard protect different async work, which callers that bypass the controller also use.
- If a pane cannot be built for anything but `restore`, it warns and displays nothing, rather than
  falling back to the page URL's default view.
- `restore` without a pane shows the profile on a WebID, and the default view elsewhere.
- `mainPage/navigation.ts` wires the controller to the real navbar and heading, one per outliner.
  The controller is internal; it is not exported from the package.

`header.ts`, `navbar.ts`, `initMainPage` and `refreshUI` are thin callers that map a choice to an
intent. `createHeader` and `createNavbar` take the controller. Header and navbar clicks pass no table
to `GotoSubject`, so the outline's current container is used. The account menu does nothing at all
when nobody is logged in.

### Browser events (`navigation/browserEvents.ts`)
`registerBrowserNavigation(controller)` handles two things; both clear the saved pane and call
`show({ kind: 'restore', forceHeading: true })`.

- **Enter on the current URL.** The Navigation API `navigate` event is intercepted when
  `canIntercept`, `userInitiated`, `navigationType === 'replace'` and the destination is the
  current URL.
- **Back and forward.** `currententrychange` with `navigationType === 'traverse'`, or `popstate` in
  browsers without the Navigation API.

The listeners are added once; a later call only changes which controller they use.
`isHandlingBrowserNavigation()` (exported from the package) is true once they are registered.
mashlib's `window.onpopstate` returns early when it is true, so only the main page reacts to back
and forward. mashlib keeps its handler for pages that load it without running the main page, and
reads the flag when the event fires, because it registers the handler at load, before the main page
starts. mashlib pins `solid-panes` to an exact version, so the two release together; a mashlib built
against a `solid-panes` without this export must not be paired with this version.

### Profile heading placement
The navbar is inserted at the top of the page after the heading's mount point exists, so
`initMainPage` calls `placeProfileHeading()` once the navbar is created, which keeps the heading
above it.

## Tests

- `test/unit/navigation/`: `state`, `chrome`, `podContext`, `controller`, `events`, `options` and
  `browserEvents` tests, one per module.
- `test/unit/mainPage/`: `header`, `navbar`, `index` and `profileHeading` tests against the
  controller and pod context. `reload.test.ts` wires the real navbar, heading and outline manager
  together, including a direct `GotoSubject` call into another pod (as `solid-ui` makes) and a
  back navigation to the first pod.
- `test/unit/outline/manager.test.ts` covers the header rule; `test/unit/components/fileExplorerProvider.test.ts`
  covers the provider.

The tests run in jsdom with the network mocked, and the setup answers every fetch with an empty
Turtle response, so tests that render real file explorer headers need a partial `podUtils` mock.

## Browser support

The controller relies on the Navigation API for two things: handling Enter on the current URL, and
telling back/forward apart from in-page `#` links. Everything else works without it.

### Navigation API support

Source: MDN browser-compat-data (last updated 2026-01-14). Every member we use (`navigate`,
`currententrychange`, `userInitiated`, `canIntercept`, `navigationType`, `intercept`) is supported
from the same version.

| Browser | Supported from |
|---|---|
| Chrome, Edge, Opera, Samsung Internet, Android WebView | Chrome 102 (`intercept()` and `canIntercept` from 105) |
| Firefox | 147 |
| Safari (macOS and iOS) | 26.2 |

Every iPhone and iPad browser uses Safari's engine, so it follows the Safari row.

### What our build targets

| Layer | Setting | Effect |
|---|---|---|
| TypeScript (`tsconfig.json`, also in mashlib) | `target: ES2019`, `lib: ["DOM", "ES2019"]` | Type checking only; both packages run `tsc --noEmit`. The `lib` setting makes newer built-ins fail the type check. |
| `solid-panes` build (`vite.config.mts`) | no explicit target, so Vite 8's default `baseline-widely-available` | Syntax lowered to Chrome and Edge 111, Firefox 114, Safari and iOS 16.4 |
| solidos-toolkit's Babel step | `preset-env` only when `transpileTargets` is passed; we don't pass it | Only TypeScript, decorators and class fields are transformed |
| mashlib (`babel.config.mjs`) | `> 1%, last 3 versions, not dead` | Syntax lowered for the final bundle |

Nothing in this setup polyfills runtime APIs (no `core-js`, no `useBuiltIns`). The Navigation API
is therefore always feature-detected, and TypeScript does not know `window.navigation`, so the code
casts it.

mashlib's webpack config skips Babel for `node_modules` except `solid-panes/src`. A published
`solid-panes` package is not re-transpiled for mashlib's list and keeps Vite's baseline floor. In
the workspace, the symlinked source most likely does go through Babel.

### Gap between targets and the Navigation API

Browsers inside our build targets that lack the Navigation API:

- Safari and iOS 16.4 to 26.1, including iOS 18.5 to 18.7, which is in mashlib's resolved set.
- Firefox 114 to 146, including the ESR line.
- From mashlib's resolved set: Opera Mini, Opera Mobile 80 and KaiOS. UC and QQ are probably in the
  same position, but their engine versions have not been confirmed.

The gap includes browsers a few months old, so it is not an edge case. The `popstate` fallback has
its own test.

### Behaviour without the Navigation API

| Behaviour | With | Without |
|---|---|---|
| Back and forward | `currententrychange` with `traverse`, not fired for `#` links | `popstate`, which may also fire for in-page `#` links and re-render the page |
| Enter on the current URL | Handled: shows the URL's own view | Not handled: content opened through the account menu stays in place |
| Reload | Handled on page load | Handled on page load |

## Known limits

- **Back and forward render in the event itself.** Nothing else is expected to re-render on
  `popstate`. A package that does would race with the main page.
- **Calls that bypass the controller** (`solid-ui` links and buttons, mashlib's own `GotoSubject`
  calls) reach the navbar and heading through the `navigated` event. They are not recorded as an
  intent. The event is only dispatched when `solo`, after the history entry is written, so a call
  that fails before that point announces nothing.
- **The heading does not watch the DOM.** A change to what it should show that happens without a
  `GotoSubject` call, a login or logout, or a profile save is missed. Today the only such change is
  the main page's own `clearPaneState()`, which the controller always follows.
- **Pod discovery is heuristic.** The owner comes from `loadProfileFromURI`, which assumes
  `profile/card#me` at the origin or under the first path segment, and falls back to the document's
  `foaf:primaryTopic`. The pod for the storages is keyed on the origin and first path segment, so a
  storage nested deeper, or two storages under one first segment, share one lookup.
- **Pods without a `pim:Storage` triple in the profile** cannot be recognised as "the viewer's pod",
  so the file explorer header stays hidden there. The pod context could fall back to a path derived
  from the WebID.
- **Not covered by automated tests:** a real browser, the Navigation API itself, and mashlib's own
  test suite. Worth checking by hand: a refresh on a WebID and on a container, the account menu on
  someone else's container, back and forward across entries opened through the navbar or the account
  menu, and a `solid-ui` link into another pod (the navbar and heading should follow).
- **A stale `dist/` looks like a bug.** mashlib consumes `solid-panes/dist` through a symlink; if
  `vite build --watch` stalls, the browser runs old code. The watcher also skips type declarations,
  so mashlib's `tsc` needs a full `npm run build` in `solid-panes` first.
