import * as React from 'react'
import Markdown from 'react-markdown'

interface Props {
  markdown: string;
  onSave: (newMarkdown: string) => Promise<void>;
}

export const View: React.FC<Props> = (props) => {
  const [phase, setPhase] = React.useState<'saving' | 'rendering' | 'editing'>('rendering')
  const [rawText, setRawText] = React.useState(props.markdown)

  function storeMarkdown () {
    setPhase('saving')
    props.onSave(rawText).then(() => {
      setPhase('rendering')
    })
  }

  if (phase === 'saving') {
    return <span aria-busy={true}>Loading&hellip;</span>
  }

  if (phase === 'editing') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); storeMarkdown() }}>
        <textarea
          onChange={(e) => { setRawText(e.target.value) }}
          defaultValue={rawText}/>
        <button type="submit">RENDER</button>,
      </form>
    )
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); setPhase('editing') }}>
      <Markdown source={rawText}/>
      <button type="submit">EDIT</button>
    </form>
  )
}
