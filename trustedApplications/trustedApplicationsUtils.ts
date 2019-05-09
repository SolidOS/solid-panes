import $rdf, { NamedNode, IndexedFormula, Statement } from 'rdflib';
import { Namespaces } from 'solid-namespace';

export function getStatementsToDelete(
  origin: NamedNode,
  profile: NamedNode,
  kb: IndexedFormula,
  ns: Namespaces,
) {
  // `as any` is used because the rdflib typings incorrectly require a Node to be passed,
  // even though null is also valid:
  const applicationStatements = kb.statementsMatching(null as any, ns.acl('origin'), origin, null as any, null as any)
  const statementsToDelete = applicationStatements.reduce(
    (memo, st) => {
      return memo
        .concat(kb.statementsMatching(profile, ns.acl('trustedApp'), st.subject, null as any, false))
        .concat(kb.statementsMatching(st.subject, null as any, null as any, null as any, false))
    },
    [] as Statement[],
  )
  return statementsToDelete
}

export function getStatementsToAdd(
  origin: NamedNode,
  nodeName: string,
  modes: string[],
  profile: NamedNode,
  ns: Namespaces,
) {
  var application = new $rdf.BlankNode(`bn_${nodeName}`)
  return [
    $rdf.st(profile, ns.acl('trustedApp'), application, profile),
    $rdf.st(application, ns.acl('origin'), origin, profile),
    ...modes
      .map(mode => $rdf.sym(mode))
      .map(mode => $rdf.st(application, ns.acl('mode'), mode, profile))
  ]
}
