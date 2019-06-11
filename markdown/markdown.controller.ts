import solidUi from 'solid-ui'
import { S } from 'surplus'
import { DataSignal } from 's-js/src/S'

const { store } = solidUi

export enum STATE {
  'LOADING',
  'RENDERING',
  'EDITING'
}

export class MarkdownController {
  public state: DataSignal<STATE>
  public rawText: DataSignal<string>

  // public renderedText: DataSignal<string>

  constructor (private subjectUri: string) {
    this.state = S.value(STATE.LOADING)
    this.rawText = S.value('')
    // this.renderedText = S.value('')

    store.fetcher.webOperation('GET', subjectUri)
      .then((response: any) => {
        this.rawText(response.responseText)
        // this.renderedText(marked(response.responseText))
        this.state(STATE.RENDERING)
      })
  }

  toggle () {
    const wasEditing = this.state() === STATE.EDITING
    if (wasEditing) {
      this.state(STATE.LOADING)
      return MarkdownController.save(this.subjectUri, this.rawText())
        .then(() => this.state(STATE.RENDERING))
    }
    this.state(STATE.EDITING)
  }

  update (fieldName: string): void {
    console.log(fieldName, this)
  }

  static save (uri: string, content: string): Promise<any> {
    return store.fetcher.webOperation('PUT', uri, {
      data: content,
      contentType: 'text/markdown; charset=UTF-8'
    })
  }
}
