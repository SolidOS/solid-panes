import '@testing-library/jest-dom'
import fetchMock from 'jest-fetch-mock'
import { TextEncoder, TextDecoder } from 'util'

fetchMock.enableMocks()

// Mock external dependencies that solid-logic expects
jest.mock('$rdf', () => require('rdflib'), { virtual: true })

// Mock SolidLogic for solid-ui webpack bundle
jest.mock('SolidLogic', () => require('solid-logic'), { virtual: true })

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
