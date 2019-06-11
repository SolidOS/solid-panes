import { S } from 'surplus'
import { DataSignal } from 's-js/src/S'
import { loadMarkdown, saveMarkdown } from './markdown.service'

export enum STATE {
  'LOADING',
  'RENDERING',
  'EDITING'
}

export class MarkdownController {
  public state: DataSignal<STATE>
  public rawText: DataSignal<string>

  constructor (private subjectUri: string) {
    this.state = S.value(STATE.LOADING)
    this.rawText = S.value('')

    loadMarkdown(subjectUri)
      .then((responseText) => {
        this.rawText(responseText)
        this.state(STATE.RENDERING)
      })
  }

  toggle () {
    const wasEditing = this.state() === STATE.EDITING
    if (wasEditing) {
      this.state(STATE.LOADING)
      return saveMarkdown(this.subjectUri, this.rawText())
        .then(() => this.state(STATE.RENDERING))
    }
    this.state(STATE.EDITING)
  }
}
