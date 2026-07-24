declare module '*.css';
declare module '*.svg' {
  const content: string
  export default content
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
