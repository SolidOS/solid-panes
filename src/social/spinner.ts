import { html, TemplateResult } from 'lit-html'

export function createSpinner (): TemplateResult {
  return html`
    <span class="loading-spinner" aria-hidden="true"></span>
    <span class="sr-only">Saving...</span>
  `
}