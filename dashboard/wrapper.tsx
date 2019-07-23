import React from 'react'
import { DataBrowserContextData, DataBrowserContext } from './datasister-dashboard/context';
import { IndexedFormula, Fetcher, UpdateManager } from 'rdflib';
import { Dashboard } from './datasister-dashboard/Dashboard';

interface Props {
  store: IndexedFormula,
  fetcher: Fetcher,
  updater: UpdateManager,
  loadResource: (resourcePath: string) => void
  webId?: string,
}
export const Wrapper: React.FC<Props> = (props) => {
  const dataBrowserContext: DataBrowserContextData = {
    store: props.store,
    fetcher: props.fetcher,
    updater: props.updater,
    webId: props.webId,
    podOrigin: document.location.origin,
    loadResource: props.loadResource
  }

  return (
    <DataBrowserContext.Provider value={dataBrowserContext}>
      <Dashboard/>
    </DataBrowserContext.Provider>
  )
}
