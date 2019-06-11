import { MarkdownController, STATE } from './markdown.controller'
import * as Surplus from 'surplus'
import data from 'surplus-mixin-data'
import marked from 'marked'

const { S } = Surplus

export const MarkdownView = (controller: MarkdownController) =>
  <section>
    {controller.state() === STATE.LOADING ? 'LOADING' : null}
    {controller.state() === STATE.RENDERING
      ? <div>
        <button onClick={() => controller.toggle()}>EDIT</button>
        <div fn={(el: HTMLElement) => {
          el.innerHTML = marked(controller.rawText())
        }}/>
      </div>
      : null}
    {controller.state() === STATE.EDITING
      ? <div>
        <button onClick={() => controller.toggle()}>RENDER</button>
        <textarea width='100%' rows={20} fn={data(controller.rawText)}>{controller.rawText}</textarea>
      </div>
      : null}
  </section>
