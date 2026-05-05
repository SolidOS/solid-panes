declare module '*.css';
declare module '*.svg' {
  const content: string
  export default content
}

declare module 'solid-ui/components/actions/button'

interface SolidUIButtonElement extends HTMLElement {
  type: string
  variant: string
  size: string
  label: string
  disabled: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'solid-ui-button': SolidUIButtonElement
  }
}

declare module '*.svg?raw' {
  const content: string
  export default content
}

declare module '*?raw' {
  const content: string
  export default content
}
declare module '*.ttl' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module 'contacts-pane'
