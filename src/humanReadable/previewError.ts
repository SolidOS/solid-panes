import { html, nothing, render } from 'lit'
import 'solid-ui/components/error-state'

export function renderPreviewError (
  status: HTMLElement,
  title: string,
  message: string
): void {
  status.dataset.visible = 'true'
  const clearError = () => {
    status.dataset.visible = 'false'
    render(nothing, status)
  }
  render(html`
    <solid-ui-error-state
      .title=${title}
      .message=${message}
      @close=${clearError}
    ></solid-ui-error-state>
  `, status)
}
