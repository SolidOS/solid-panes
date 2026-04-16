const { TextEncoder, TextDecoder } = require('util')

// Some transitive deps (solid-logic) use TextEncoder at module-load time.
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

const rdf = require('rdflib')
const solidLogic = require('solid-logic')

// solid-ui's UMD bundle expects a browser-style global named $rdf.
global.$rdf = rdf
globalThis.$rdf = rdf
if (typeof window !== 'undefined') {
  window.$rdf = rdf
}

// solid-ui's UMD bundle also expects a browser-style global named SolidLogic.
global.SolidLogic = solidLogic
globalThis.SolidLogic = solidLogic
if (typeof window !== 'undefined') {
  window.SolidLogic = solidLogic
}
