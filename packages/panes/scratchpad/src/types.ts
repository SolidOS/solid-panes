import { IndexedFormula, NamedNode } from 'rdflib'

export type InitialisationFunction = (store: IndexedFormula, user?: NamedNode) => Promise<NamedNode>;
