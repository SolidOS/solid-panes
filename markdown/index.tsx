import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { PaneDefinition, NewPaneOptions } from '../types'
import $rdf from 'rdflib'
import solidUi from 'solid-ui'
import { saveMarkdown } from './service'
import { Container } from './container'

const { icons, store } = solidUi

export const Pane: PaneDefinition = {
  icon: `${icons.iconBase}noun_79217.svg`,
  name: 'MarkdownPane',
  label: (subject) => subject.uri.endsWith('.md') ? 'Handle markdown file' : null,
  mintNew: function (options) {
    const newInstance = createFileName(options)
    return saveMarkdown(store, newInstance.uri, '# This is your markdown file\n\nHere be stuff!')
      .then(() => ({
        ...options,
        newInstance
      }))
      .catch((err: any) => {
        console.error('Error creating new instance of markdown file', err)
        return options
      })
  },
  render: (subject) => {
    const container = document.createElement('div')
    ReactDOM.render(<Container store={store} subject={subject}/>, container)

    return container
  }
}

function createFileName (options: NewPaneOptions): $rdf.NamedNode {
  let uri = options.newBase
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1) + '.md'
  }
  return $rdf.sym(uri)
}
