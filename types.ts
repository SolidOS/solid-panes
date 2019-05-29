import { NamedNode, IndexedFormula } from 'rdflib'

// Note: there might be a more appropriate project to hold this definition:
export interface PaneDefinition {
  icon: string;
  name: string;
  label: (subject: NamedNode) => string | null;
  render: (subject: NamedNode, dom: HTMLDocument, options?: unknown) => HTMLElement;
  shouldGetFocus?: (subject: NamedNode) => boolean;
  requireQueryButton?: boolean;
  mintClass?: NamedNode;
  mintNew?: (options: NewPaneOptions, store: IndexedFormula) => Promise<NewPaneOptions & { newInstance: NamedNode }>;
};
interface NewPaneOptions {
  appPathSegment: string;
  div: HTMLDivElement;
  dom: HTMLDocument;
  folder: NamedNode;
  iconEle: HTMLImageElement;
  me?: NamedNode;
  newBase: string;
  newInstance: NamedNode;
  noIndexHTML: boolean;
  noun: string;
  pane: PaneDefinition;
  refreshTarget: HTMLTableElement;
}
