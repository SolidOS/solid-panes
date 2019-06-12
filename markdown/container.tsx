import * as React from 'react'
import { loadMarkdown, saveMarkdown } from './service'
import { View } from './view'
import { ContainerProps } from '../types'

export const Container: React.FC<ContainerProps> = (props) => {
  const [markdown, setMarkdown] = React.useState<undefined | null | string>()

  React.useEffect(() => {
    loadMarkdown(props.store, props.subject.uri)
      .then((markdown) => setMarkdown(markdown))
      .catch(() => setMarkdown(null))
  })

  if (typeof markdown === 'undefined') {
    return <section aria-busy={true}>Loading&hellip;</section>
  }
  if (markdown === null) {
    return <section>Error loading markdown :(</section>
  }

  const saveHandler = (newMarkdown: string) => saveMarkdown(props.store, props.subject.uri, newMarkdown)

  return (
    <section>
      <View
        markdown={markdown}
        onSave={saveHandler}
      />
    </section>
  )
}
