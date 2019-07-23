import React from 'react'
import { DataBrowserContext } from '../context'

export const IsNotOwner: React.FC = (props) => {
  const { webId } = React.useContext(DataBrowserContext)

  // TODO: Remove assumption that the WebID is on the same host:
  if (!webId || webId.indexOf(document.location.host) === -1) {
    return <>{props.children}</>
  }

  return null
}
