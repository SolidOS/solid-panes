import { LiveStore } from 'rdflib'
import { createContext } from '@lit/context'
import { PaneItem } from '../../utils/paneUtils'

export interface HeaderContext {
  store: LiveStore | undefined
  subjectUri: string | undefined
  pane?: PaneItem
  paneName?: string

  onBack?: () => void
  openPane?: (paneName: string) => void
  setQueryButtonVisible?: (visible: boolean) => void

  canEdit?: boolean
  edit?: {
    onEdit?: () => void
    onSave?: () => void
    onCancel?: () => void
    isEditing?: boolean
  }
}

export const headerContext = createContext<HeaderContext>(Symbol('file-explorer-header'))
