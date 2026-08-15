import { html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { WebComponent, type CodeEditor } from 'solid-ui'
import styles from './EditorCard.styles.css'

@customElement('solid-panes-editor-card')
export default class EditorCard extends WebComponent {
  static styles = styles

  private _editor?: CodeEditor
  private _initializing = false

  @query('.editor')
  accessor _editorMount: HTMLDivElement | null = null

  @property()
  accessor contentType: string | undefined

  @property()
  accessor content: string | undefined

  getEditor () {
    return this._editor
  }

  setReadOnly (readOnly: boolean) {
    this._editor?.setReadOnly(readOnly)
  }

  private async _initializeEditor () {
    if (this._editor || this._initializing) return
    this._initializing = true
    const editorDiv = this._editorMount

    if (!editorDiv) {
      this._initializing = false
      return
    }

    try {
      const { CodeEditor } = await import('solid-ui')
      this._editor = new CodeEditor()
      try {
        await this._editor.initialize(editorDiv, this.content ?? '', this.contentType ?? '', 'dark')
      } catch (err) {
        throw new Error(`Error initializing code editor: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._editor?.setReadOnly(true)
    } catch (err) {
      console.log('Error loading CodeEditor module:', err)
    } finally {
      this._initializing = false
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    if (this._editor) {
      this._editor.destroy()
      this._editor = undefined
    }

    this._initializing = false
  }

  render () {
    return html`
      <section class="editor-card">
        <div class="editor"></div>
      </section>
    `
  }
}
