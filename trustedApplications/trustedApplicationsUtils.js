const $rdf = require('rdflib');

export function getStatementsToDelete(origin, profile, kb, ns) {
  const applicationStatements = kb.statementsMatching(null, ns.acl('origin'), origin)
  const statementsToDelete = applicationStatements.reduce(
    (memo, st) => {
      return memo
        .concat(kb.statementsMatching(profile, ns.acl('trustedApp'), st.subject))
        .concat(kb.statementsMatching(st.subject))
    },
    [],
  )
  return statementsToDelete
}

export function getStatementsToAdd(origin, nodeName, modes, profile, ns) {
  var application = new $rdf.BlankNode(`bn_${nodeName}`)
  return [
    $rdf.st(profile, ns.acl('trustedApp'), application, profile),
    $rdf.st(application, ns.acl('origin'), origin, profile),
    ...modes
      .map(mode => $rdf.sym(mode))
      .map(mode => $rdf.st(application, ns.acl('mode'), mode, profile))
  ]
}
