import '@testing-library/jest-dom'
import fetchMock from 'jest-fetch-mock'
import { TextEncoder, TextDecoder } from 'util'

fetchMock.enableMocks()

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
