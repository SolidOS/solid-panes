export function configurePreviewFrame (
  frame: HTMLElement,
  modifier: 'markdown' | 'plain-text' | 'json'
): void {
  frame.className = ''
  frame.classList.add('human-readable-document-frame')
  frame.classList.add(`human-readable-${modifier}-preview`)
}
