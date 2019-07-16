import React from 'react'
import { DataBrowserContext } from '../context'

/**
 * API-compatible with @solid/react's `useWebId`, but fetches it from the context object
 */
export function useWebId () {
  const { webId } = React.useContext(DataBrowserContext)

  return webId
}
