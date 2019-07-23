import React from 'react'
import $rdf from 'rdflib'
import { ResourceLink } from '../components/ResourceLink'
import { DataBrowserContext } from '../context'
import { IsOwner } from '../components/IsOwner'

export const FolderWidget: React.FC = () => {
  const { podOrigin } = React.useContext(DataBrowserContext)

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Raw data</h2>
        <p className="buttons">
          <ResourceLink
            className="ids-link-filled ids-link-filled--primary"
            resource={$rdf.sym(`${podOrigin}/public/`)}
          >Public data</ResourceLink>
          <IsOwner>
            <ResourceLink
              className="ids-link-stroke ids-link-stroke--primary"
              resource={$rdf.sym(`${podOrigin}/private/`)}
            >Private data</ResourceLink>
          </IsOwner>
        </p>
      </section>
    </div>
  )
}
