export function createPreviewContainer (
  document: Document,
  frame: HTMLElement
): { container: HTMLDivElement, status: HTMLDivElement } {
  const container = document.createElement('div')
  container.classList.add('human-readable-document-container')
  const status = document.createElement('div')
  status.className = 'human-readable-document-status'
  container.append(status, frame)
  return { container, status }
}

export function configurePreviewFrame (
  frame: HTMLElement,
  modifier: 'markdown' | 'plain-text' | 'json'
): void {
  frame.className = ''
  frame.classList.add('human-readable-document-frame')
  frame.classList.add(`human-readable-${modifier}-preview`)
}
