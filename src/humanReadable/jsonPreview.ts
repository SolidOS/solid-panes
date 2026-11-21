import type { LiveStore, NamedNode } from 'rdflib'
import { html, render } from 'lit-html'
import { configurePreviewFrame } from './previewFrame'

type JsonToken = {
  text: string
  kind: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation'
}

const TOKEN = /"(?:\\u[0-9a-fA-F]{4}|\\["\\/bfnrt]|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|\{|\}|\[|\]|,|:/y

function tokenize (source: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let position = 0

  while (position < source.length) {
    while (position < source.length) {
      const code = source.charCodeAt(position)
      if (code !== 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) break
      position++
    }
    if (position === source.length) break

    TOKEN.lastIndex = position
    const match = TOKEN.exec(source)
    if (!match) throw new SyntaxError('Unexpected token in JSON')
    const text = match[0]
    let kind: JsonToken['kind']
    if (text[0] === '"') {
      kind = 'string'
    } else if (/^[0-9-]/.test(text)) {
      kind = 'number'
    } else if ('{}[],:'.includes(text)) {
      kind = 'punctuation'
    } else if (text === 'true' || text === 'false') {
      kind = 'boolean'
    } else {
      kind = 'null'
    }
    tokens.push({ text, kind })
    position = TOKEN.lastIndex
  }

  return tokens
}

function prettyTokens (tokens: JsonToken[]): Array<JsonToken | string> {
  const output: Array<JsonToken | string> = []
  let depth = 0

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const next = tokens[index + 1]
    const previous = tokens[index - 1]

    if (token.text === '{' || token.text === '[') {
      output.push(token)
      if (next?.text !== (token.text === '{' ? '}' : ']')) {
        depth++
        output.push(`\n${'  '.repeat(depth)}`)
      }
    } else if (token.text === '}' || token.text === ']') {
      if (previous?.text !== (token.text === '}' ? '{' : '[')) {
        depth--
        output.push(`\n${'  '.repeat(depth)}`)
      }
      output.push(token)
    } else if (token.text === ',') {
      output.push(token, `\n${'  '.repeat(depth)}`)
    } else if (token.text === ':') {
      output.push(token, ' ')
    } else {
      output.push(token)
    }
  }

  return output
}

function showOriginalWithError (
  frame: HTMLPreElement,
  source: string,
  errorMessage: string
): void {
  const message = frame.ownerDocument.createElement('div')
  message.className = 'human-readable-json-error'
  message.setAttribute('role', 'alert')
  message.textContent = errorMessage
  frame.parentElement?.insertBefore(message, frame)
  render(html`${source}`, frame)
}

function renderJson (frame: HTMLPreElement, source: string): void {
  try {
    // Validate without serializing: JSON.parse/stringify would round large numeric values.
    JSON.parse(source)
  } catch (error) {
    if (error instanceof SyntaxError) {
      showOriginalWithError(frame, source, 'Invalid JSON — showing the original content.')
    } else {
      console.error('Error validating JSON content:', error)
      showOriginalWithError(frame, source, 'Unable to validate JSON — showing the original content.')
    }
    return
  }

  try {
    const tokens = tokenize(source)
    const markedTokens = tokens.map((token, index) =>
      token.kind === 'string' && tokens[index + 1]?.text === ':'
        ? { ...token, kind: 'key' as const }
        : token
    )
    const parts = prettyTokens(markedTokens)
    const highlightedParts = parts.map(part => {
      if (typeof part === 'string') return part
      return html`<span class=${`human-readable-json-${part.kind}`}>${part.text}</span>`
    })
    render(html`${highlightedParts}`, frame)
  } catch (error) {
    console.error('Error formatting JSON content:', error)
    showOriginalWithError(frame, source, 'Unable to format JSON content — showing the original content.')
  }
}

export function renderJsonContent (
  store: LiveStore,
  subject: NamedNode,
  frame: HTMLPreElement
): void {
  store.fetcher.webOperation('GET', subject.uri).then(response => {
    configurePreviewFrame(frame, 'json')
    renderJson(frame, response.responseText ?? '')
  }).catch(error => {
    console.error('Error fetching JSON content:', error)
    const message = frame.ownerDocument.createElement('div')
    message.className = 'human-readable-json-error'
    message.setAttribute('role', 'alert')
    message.textContent = 'Unable to load JSON content.'
    frame.parentElement?.insertBefore(message, frame)
    configurePreviewFrame(frame, 'json')
    render(html``, frame)
  })
}
