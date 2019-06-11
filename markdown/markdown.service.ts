import solidUi from 'solid-ui'

const { store } = solidUi

export function loadMarkdown (uri: string): Promise<string> {
  return store.fetcher.webOperation('GET', uri)
    .then((response: any) => response.responseText)
}

export function saveMarkdown (uri: string, data: string): Promise<any> {
  return store.fetcher.webOperation('PUT', uri, {
    data,
    contentType: 'text/markdown; charset=UTF-8'
  })
}
