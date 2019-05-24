import $rdf, { NamedNode, IndexedFormula, Statement } from 'rdflib'
import { Namespaces } from 'solid-namespace'

/**
 * Get a list of all current ACL statements in a given store.
 * @param origin
 * @param person
 * @param kb The store that holds the ACL statements.
 * @param ns
 * @returns List of RDF statements.
 */
export function getStatementsToDelete (
  origin: NamedNode,
  person: NamedNode,
  kb: IndexedFormula,
  ns: Namespaces
) {
  // `as any` is used because the rdflib typings incorrectly require a Node to be passed,
  // even though null is also valid:
  const applicationStatements = kb.statementsMatching(null as any, ns.acl('origin'), origin, null as any, null as any)
  const statementsToDelete = applicationStatements.reduce(
    (memo, st) => {
      return memo
        .concat(kb.statementsMatching(person, ns.acl('trustedApp'), st.subject, null as any, false))
        .concat(kb.statementsMatching(st.subject, null as any, null as any, null as any, false))
    },
    [] as Statement[]
  )
  return statementsToDelete
}

/**
 * Generate a list of ACL statements to represent a given set of permissions given to an origin.
 *
 * @param origin Origin of the app to add ACL statements for.
 * @param nodeName Identifier used to refer to the app internally.
 * @param modes Modes to enable for that origin, e.g. `read`, `write`, `append`, ...
 * @param person
 * @param ns
 * @returns List of RDF statements that should be added to the RDF store to represent this app's permissions.
 */
export function getStatementsToAdd (
  origin: NamedNode,
  nodeName: string,
  modes: string[],
  person: NamedNode,
  ns: Namespaces
) {
  var application = new $rdf.BlankNode(`bn_${nodeName}`)
  return [
    $rdf.st(person, ns.acl('trustedApp'), application, person.doc()),
    $rdf.st(application, ns.acl('origin'), origin, person.doc()),
    ...modes
      .map(mode => $rdf.sym(mode))
      .map(mode => $rdf.st(application, ns.acl('mode'), mode, person.doc()))
  ]
}
