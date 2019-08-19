import { NamedNode, IndexedFormula, Statement, BlankNode, st, sym } from 'rdflib'
import { Namespaces } from 'solid-namespace'

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

export function getStatementsToAdd (
  origin: NamedNode,
  nodeName: string,
  modes: string[],
  person: NamedNode,
  ns: Namespaces
) {
  var application = new BlankNode(`bn_${nodeName}`)
  return [
    st(person, ns.acl('trustedApp'), application, person.doc()),
    st(application, ns.acl('origin'), origin, person.doc()),
    ...modes
      .map(mode => sym(mode))
      .map(mode => st(application, ns.acl('mode'), mode, person.doc()))
  ]
}
