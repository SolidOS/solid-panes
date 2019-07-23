import React, { useEffect } from "react"
import $rdf, { Fetcher } from "rdflib"

type UseProfile = (webIdUrl: string, fetcher: Fetcher) => $rdf.NamedNode | undefined;
export const useProfile: UseProfile = (webIdUrl, fetcher) => {
  const [profile, setProfile] = React.useState<$rdf.NamedNode>()

  useEffect(() => {
    const webId = $rdf.sym(webIdUrl)
    fetcher.load(webId).then((_response: any) => {
      setProfile(webId)
    })
  }, [webIdUrl])

  return profile
}
