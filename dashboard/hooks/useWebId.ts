import React, { useEffect } from "react"
import UI from 'solid-ui'

type UseWebId = () => string | null | undefined;
export const useWebId: UseWebId = () => {
  const [webId, setWebId] = React.useState<string | null>()

  useEffect(() => {
    UI.authn.solidAuthClient.trackSession((session: any) => {
      setWebId(session ? session.webId : null)
    })
  }, [])

  return webId
}
