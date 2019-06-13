import $rdf, { NamedNode, IndexedFormula, Statement } from 'rdflib'
import { Namespaces } from 'solid-namespace'
import { Mode, TrustedApplication } from './model'

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
  modes: Mode[],
  person: NamedNode,
  ns: Namespaces
) {
  var application = new $rdf.BlankNode(`bn_${nodeName}`)
  return [
    $rdf.st(person, ns.acl('trustedApp'), application, person.doc()),
    $rdf.st(application, ns.acl('origin'), origin, person.doc()),
    ...modes
      .map(mode => {
        return ns.acl(mode)
      })
      .map(mode => $rdf.st(application, ns.acl('mode'), mode, person.doc()))
  ]
}

/* istanbul ignore next [This executes the actual HTTP requests, which is too much effort to test.] */
export function fetchTrustedApps (
  store: $rdf.IndexedFormula,
  subject: $rdf.NamedNode,
  ns: Namespaces
): TrustedApplication[] {
  return (store.each(subject, ns.acl('trustedApp'), undefined, undefined) as any)
    .flatMap((app: $rdf.NamedNode) => {
      return store.each(app, ns.acl('origin'), undefined, undefined)
        .map((origin) => {
          const modes = store.each(app, ns.acl('mode'), undefined, undefined)
          const trustedApp: TrustedApplication = {
            origin: origin.value,
            subject: subject.value,
            modes: modes.map((mode) => deserialiseMode(mode as $rdf.NamedNode, ns))
          }
          return trustedApp
        })
    })
    .sort((appA: TrustedApplication, appB: TrustedApplication) => (appA.origin > appB.origin) ? 1 : -1)
}

/**
 * @param serialisedMode The full IRI of a mode
 * @returns A plain text string representing that mode, i.e. 'read', 'append', 'write' or 'control'
 */
export function deserialiseMode (serialisedMode: $rdf.NamedNode, ns: Namespaces): Mode {
  const deserialisedMode = serialisedMode.value
    .replace(ns.acl('read').value, 'read')
    .replace(ns.acl('append').value, 'append')
    .replace(ns.acl('write').value, 'write')
    .replace(ns.acl('control').value, 'control')

  return deserialisedMode as Mode
}
