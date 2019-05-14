declare module 'solid-namespace' {
  import { IndexedFormula, NamedNode } from 'rdflib'

  type toNamedNode = (label: string) => NamedNode
  export type Namespaces = {[alias: string]: toNamedNode}

  export default function vocab(store: IndexedFormula): Namespaces
}
