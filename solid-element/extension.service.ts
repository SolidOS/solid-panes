import { Fetcher, IndexedFormula, NamedNode, namedNode } from "rdflib"
import * as panes from 'pane-registry'
import { PaneDefinition } from "../types"

const externalApplications = new Map<NamedNode, Promise<PaneDefinition>>()

export enum LoadingErrors {
  AlreadyLoading
}

export function getLoadingApplication (application: NamedNode): Promise<PaneDefinition | null> {
  return externalApplications.get(application) || Promise.resolve(null)
}

export async function loadExtension (store: IndexedFormula, fetcher: Fetcher, source: string, root: HTMLElement | ShadowRoot): Promise<PaneDefinition | null> {
  const application = namedNode(source)
  await fetcher.load(application)
  const scriptFile = (store.anyValue as any)(application, namedNode("http://www.w3.org/ns/solid/databrowser#src"), null, application.doc())
  if (!scriptFile) {
    console.warn(`Found no src for ${application.uri}`)
    return Promise.resolve(null)
  }
  const isLoading = externalApplications.get(application)
  if (isLoading) {
    return isLoading
  }
  if (!isLoading && document.getElementById(application.uri)) {
    return Promise.reject(LoadingErrors.AlreadyLoading)
  }
  const src = `${scriptFile}?v=${(new Date()).getTime()}`

  const inlineScript = document.createElement("script")
  inlineScript.id = application.uri
  inlineScript.innerHTML = `
import view from '${src}';
if (view) {
  view.name = '${application.uri}';
  panes.register(view);
} else {
  console.error('No view given in ${src} (loading for ${application.uri})');
}
  `
  inlineScript.type = "module"
  root.appendChild(inlineScript)

  // @ts-ignore
  const startLoading = panes.resolveName(application.uri)
  externalApplications.set(application, startLoading)
  return startLoading
}
