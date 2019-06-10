import * as Surplus from 'surplus'
import { NewPaneOptions, PaneDefinition } from '../types'
import solidUi from 'solid-ui'
import { NamedNode, sym } from 'rdflib'

const { S } = Surplus
const { icons, store } = solidUi

export const Pane: PaneDefinition = {
  icon: `${icons.iconBase}noun_15177.svg`,
  name: 'MarkdownPane',
  label: (subject: NamedNode) => subject.uri.endsWith('.md') ? 'Handle markdown file' : null,
  mintNew: function (options: NewPaneOptions) {
    const newInstance = createFileName(options)
    return store.fetcher.webOperation('PUT', newInstance, {
      data: '# This is your markdown file\n\nHere be stuff!',
      contentType: 'text/markdown; charset=UTF-8'
    })
      .then(() => ({
        newInstance,
        ...options
      }))
      .catch((err: any) => {
        console.error('Error creating new instance of markdown file', err)
      })
  },
  render: () => {
    let counter = 0
    let counterData = S.data(counter)
    const incr = () => {
      counter++
      counterData(counter)
      console.log(counter, counterData())
    }
    return <div>
      test --- <span>{counterData}</span>
      <button onClick={incr}>Increment counter</button>
    </div>
  }
}

function createFileName (options: NewPaneOptions): NamedNode {
  let uri = options.newBase
  if (uri.endsWith('/')) {
    uri = uri.slice(0, -1) + '.md'
  }
  return sym(uri)
}
