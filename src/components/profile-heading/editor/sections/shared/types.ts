import { LiveStore, NamedNode, st } from 'rdflib'

export type RowStatus = 'existing' | 'new' | 'modified' | 'deleted'

export type MutationOps<T> = {
  create: T[]
  update: T[]
  remove: T[]
}

export type RdfStatement = ReturnType<typeof st>

export type PrefixCapable = {
  namespaces?: Record<string, string>
  setPrefixForURI?: (prefix: string, uri: string) => void
}

export type UpdateCallback = (_uri: string, ok: boolean, message?: string) => void

export type DavUpdateCallback = (_uri: string, ok: boolean, body?: string) => void

export type RdfUpdater = PrefixCapable & {
  update?: (deletions: RdfStatement[], insertions: RdfStatement[], callback: UpdateCallback) => void
  updateDav?: (doc: NamedNode, deletions: RdfStatement[], insertions: RdfStatement[], callback: DavUpdateCallback) => void
  serialize?: (docUri: string, statements: RdfStatement[], contentType: string) => string
  store?: PrefixCapable
}

export type WebOperationResponse = {
  ok?: boolean
  status?: number
  responseText?: string
}

export type RdfFetcher = {
  load?: (doc: NamedNode) => Promise<unknown>
  webOperation?: (...args: unknown[]) => Promise<WebOperationResponse>
}

export type MutationCapableStore = LiveStore
