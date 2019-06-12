import { IndexedFormula } from 'rdflib'

export function loadMarkdown (store: IndexedFormula, uri: string): Promise<string> {
  return (store as any).fetcher.webOperation('GET', uri)
    .then((response: any) => response.responseText)
}

export function saveMarkdown (store: IndexedFormula, uri: string, data: string): Promise<any> {
  return (store as any).fetcher.webOperation('PUT', uri, {
    data,
    contentType: 'text/markdown; charset=UTF-8'
  })
}
