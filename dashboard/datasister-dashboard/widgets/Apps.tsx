import React from 'react'
import { DataBrowserContext } from '../context'

export const AppsWidget: React.FC = () => {
  const { podOrigin } = React.useContext(DataBrowserContext)

  const appLink = (podOrigin)
    ? `https://pixolid.netlify.com/?idp=${podOrigin}`
    : 'https://pixolid.netlify.com/'

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Try this app</h2>
        <p className="has-text-centered">
          <a href={appLink} title="Open Pixolid">
            Pixolid
          </a>
        </p>
      </section>
    </div>
  )
}
