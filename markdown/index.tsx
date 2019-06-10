import * as Surplus from 'surplus'
import { PaneDefinition } from '../types'
// import data from 'surplus-mixin-data'

const { S } = Surplus

export const Pane: PaneDefinition = {
  icon: 'crazy/url/icon.svg',
  name: 'MarkdownPane',
  label: () => 'Handle markdown file',
  render: (_subject: any, dom: HTMLDocument) => {
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
