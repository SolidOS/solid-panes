import '@testing-library/jest-dom/vitest'

import * as rdf from 'rdflib'
import * as solidLogic from 'solid-logic'
import { enableFetchMocks, mockFetchIf } from 'solidos-toolkit/testing'

Object.assign(globalThis, {
  $rdf: rdf,
  SolidLogic: solidLogic,
})

enableFetchMocks()
mockFetchIf(/^https?:\/\//, async () => new Response('', {
  status: 200,
  headers: {
    'Content-Type': 'text/turtle',
    'WAC-Allow': 'user="write", public="read"',
  },
}))
