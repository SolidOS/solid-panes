import { NewPaneOptions, PaneDefinition } from '../types'
import solidUi from 'solid-ui'
import { NamedNode, sym } from 'rdflib'
import { saveMarkdown } from './markdown.service'

import Vue from 'vue'
import App from './App.vue'

const { icons } = solidUi

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
  render: (subject: NamedNode, dom: HTMLDocument) => {
    return new Vue({
      el: '#MarkdownApp',
      render: h => h(App, {
        props: {
          subject
        }
      })
    }).$el
  }
}

function createFileName (options: NewPaneOptions): NamedNode {
  let uri = options.newBase
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1) + '.md'
  }
  return sym(uri)
}
