/*   Sharing Pane
 **
 ** This outline pane allows a user to view and adjust the sharing -- access control lists
 ** for anything which has that capability.
 **
 ** I am using in places single quotes strings like 'this'
 ** where internationalization ("i18n") is not a problem, and double quoted
 ** like "this" where the string is seen by the user and so I18n is an issue.
 */

import { aclControl, ns } from 'solid-ui'
import { authn } from 'solid-logic'
import { sym } from 'rdflib'

const ACL_NS = 'http://www.w3.org/ns/auth/acl#'
const ACL_LINK = sym('http://www.iana.org/assignments/link-relations/acl')

/**
 * Best-effort synchronous check: does `userWebId` have acl:Control on
 * `subject`? Returns:
 *   true   — a loaded Authorization grants Control to this user (or to
 *            foaf:Agent for the not-logged-in case),
 *   false  — the resource's ACL doc is loaded and contains no matching
 *            Control grant for this user,
 *   null   — the ACL doc isn't loaded yet, so we can't say.
 *
 * We never trigger a network fetch from here — the pane's label() is sync
 * and runs on every render, so a synchronous answer is what we can use.
 */
function userHasControl (
  subject: any,
  store: any,
  userWebId: any
): boolean | null {
  const aclDoc = store.any(subject, ACL_LINK)
  if (!aclDoc) return null // we don't even know where the ACL lives
  // If the ACL doc has no triples loaded, we can't decide.
  if (store.statementsMatching(undefined, undefined, undefined, aclDoc).length === 0) {
    return null
  }
  const aclNs = (term: string) => sym(ACL_NS + term)
  const auths = store.each(undefined, ns.rdf('type'), aclNs('Authorization'), aclDoc)
  for (const auth of auths) {
    if (!store.holds(auth, aclNs('mode'), aclNs('Control'), aclDoc)) continue
    // Public Control grant (rare but possible)
    if (store.holds(auth, aclNs('agentClass'), ns.foaf('Agent'), aclDoc)) return true
    if (!userWebId) continue // anonymous: only public grants count
    if (store.holds(auth, aclNs('agent'), userWebId, aclDoc)) return true
    // agentClass foaf:AuthenticatedAgent — anyone signed in
    if (store.holds(auth, aclNs('agentClass'), sym('http://xmlns.com/foaf/0.1/AuthenticatedAgent'), aclDoc)) return true
  }
  return false
}

// lucide lock — https://lucide.dev/icons/lock (ISC license)
const LOCK_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>' +
      '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
      '</svg>'
  )

const sharingPane = {
  icon: LOCK_ICON,

  name: 'sharing',

  label: (subject, context) => {
    const store = context.session.store
    const t = store.findTypeURIs(subject)
    const isShareable =
      t[ns.ldp('Resource').uri] ||
      t[ns.ldp('Container').uri] ||
      t[ns.ldp('BasicContainer').uri]
    if (!isShareable) return null

    // Don't surface the lock unless the user can actually act on it. Anonymous
    // visitors can't edit ACLs, and a logged-in user without acl:Control on
    // this resource can't either — kicking them into the sharing pane would
    // just hit a 403 on save. When we genuinely don't know yet (ACL doc not
    // loaded), keep the pre-existing optimistic behaviour and show it.
    const me = authn.currentUser()
    const ctrl = userHasControl(subject, store, me)
    if (ctrl === false) return null
    if (ctrl === null && !me) return null // anonymous + ACL unknown ⇒ hide
    return 'Sharing'
  },

  render: (subject, context) => {
    const dom = context.dom
    const store = context.session.store
    const noun = getNoun()

    const div = dom.createElement('div')
    div.classList.add('sharingPane')
    aclControl.preventBrowserDropEvents(dom)
    div.appendChild(aclControl.ACLControlBox5(subject, context, noun, store))
    return div

    function getNoun () {
      const t = store.findTypeURIs(subject)
      if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
        return 'folder'
      }
      return 'file'
    }
  }
}

export default sharingPane
