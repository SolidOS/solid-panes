import { BlankNode, IndexedFormula, NamedNode, st, Literal, sym, Statement } from 'rdflib'
import { Namespaces } from 'solid-namespace'

export function getStatementsToDelete (
  origin: NamedNode | Literal,
  person: NamedNode,
  kb: IndexedFormula,
  ns: Namespaces
) {
  const applicationStatements = kb.statementsMatching(
    null,
    ns.acl('origin'),
    origin
  )
  const statementsToDelete = applicationStatements.reduce(
    (memo, st) => {
      return memo
        .concat(
          kb.statementsMatching(
            person,
            ns.acl('trustedApp'),
            st.subject as NamedNode
          )
        )
        .concat(kb.statementsMatching(st.subject))
    },
    [] as Array<Statement>
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
  const application = new BlankNode(`bn_${nodeName}`)
  return [
    st(person, ns.acl('trustedApp'), application, person.doc()),
    st(application, ns.acl('origin'), origin, person.doc()),
    ...modes
      .map(mode => sym(mode))
      .map(mode => st(application, ns.acl('mode'), mode, person.doc()))
  ]
}

export function generateRandomString () {
  return Math.random().toString(36).substr(2, 5)
}
