export function configurePreviewFrame (
  frame: HTMLElement,
  modifier: 'markdown' | 'plain-text' | 'iframe'
): void {
  frame.className = ''
  frame.classList.add('human-readable-pane__frame')
  frame.classList.add(`human-readable-pane__frame--${modifier}`)
}
