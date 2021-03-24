export default (dom) => function viewAsMbox (obj) {
  const anchor = dom.createElement('a')
  // previous implementation assumed email address was Literal. fixed.

  // FOAF mboxs must NOT be literals -- must be mailto: URIs.

  let address = obj.termType === 'NamedNode' ? obj.uri : obj.value // this way for now
  // if (!address) return viewAsBoringDefault(obj)
  const index = address.indexOf('mailto:')
  address = index >= 0 ? address.slice(index + 7) : address
  anchor.setAttribute('href', 'mailto:' + address)
  anchor.appendChild(dom.createTextNode(address))
  return anchor
}
