import { NewPaneOptions, PaneDefinition } from '../types'
import solidUi from 'solid-ui'
import { NamedNode, sym } from 'rdflib'
import { MarkdownController } from './markdown.controller'
import { MarkdownView } from './markdown.view'
import { saveMarkdown } from './markdown.service'

const { icons, store } = solidUi

export const Pane: PaneDefinition = {
  icon: `${icons.iconBase}noun_79217.svg`,
  name: 'MarkdownPane',
  label: (subject: NamedNode) => subject.uri.endsWith('.md') ? 'Handle markdown file' : null,
  mintNew: function (options: NewPaneOptions) {
    const newInstance = createFileName(options)
    return saveMarkdown(newInstance.uri, '# This is your markdown file\n\nHere be stuff!')
      .then((): NewPaneOptions => ({
        newInstance,
        ...options
      }))
      .catch((err: any) => {
        console.error('Error creating new instance of markdown file', err)
        return options
      })
  },
  render: (subject: NamedNode) => {
    const controller = new MarkdownController(subject.uri)
    return MarkdownView(controller)
  }
}

function createFileName (options: NewPaneOptions): NamedNode {
  let uri = options.newBase
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1) + '.md'
  }
  return sym(uri)
}
