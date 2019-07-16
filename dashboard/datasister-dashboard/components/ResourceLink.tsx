import React from 'react'
import { NamedNode } from 'rdflib'
import UI from 'solid-ui'
import { DataBrowserContext } from '../context'

interface OwnProps {
  resource: NamedNode;
};

type Props = Omit<React.HTMLAttributes<HTMLAnchorElement>, keyof OwnProps> & OwnProps;

export const ResourceLink: React.FC<Props> = (props) => {
  const { store, loadResource, podOrigin } = React.useContext(DataBrowserContext)
  const clickHandler = (event: React.MouseEvent) => {
    if (props.resource.uri.substring(0, podOrigin.length) === podOrigin) {
      event.preventDefault()
      loadResource(props.resource.uri)
    }
  }

  const children = (props.children)
    ? props.children
    : UI.label(props.resource, store, podOrigin)

  let title = props.title
  if (!title) {
    title = (typeof children === 'string')
      ? `View ${children}`
      : `View ${UI.label(props.resource, store, podOrigin)}`
  }

  const anchorProps = {
    ...props,
    title: title,
    resource: undefined
  }

  return (
    <a
      {...anchorProps}
      href={props.resource.uri}
      onClick={clickHandler}
    >
      {children}
    </a>
  )
}
