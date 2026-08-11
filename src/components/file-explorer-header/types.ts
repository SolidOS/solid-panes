export type PaneIcon = string | Promise<string> | null | undefined

export type FileExplorerHeaderMetadata = {
  access: {
    canEdit: boolean
    canDelete?: boolean
    isPublic: boolean
  }
  aclUri: string | undefined
  modified: string | undefined
}
