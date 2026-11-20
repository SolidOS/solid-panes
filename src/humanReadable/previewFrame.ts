export function configurePreviewFrame (
  frame: HTMLElement,
  modifier: 'markdown' | 'plain-text' | 'iframe',
  lines?: number
): void {
  frame.className = ''
  frame.classList.add('human-readable-pane__frame')
  frame.classList.add(`human-readable-pane__frame--${modifier}`)
  if (lines !== undefined) {
    frame.style.setProperty('--human-readable-pane-height', `${lines * 16}px`)
  }
}
