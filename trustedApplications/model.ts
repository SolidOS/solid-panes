export type Mode = 'read' | 'append' | 'write' | 'control'

export interface TrustedApplication {
  origin: string
  subject: string
  modes: Mode[]
}
