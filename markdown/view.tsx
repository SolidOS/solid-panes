import * as React from 'react'
import Markdown from 'react-markdown'

interface Props {
  markdown: string;
  onSave: (newMarkdown: string) => Promise<void>;
}

export const View: React.FC<Props> = (props) => {
  const [phase, setPhase] = React.useState<'loading' | 'rendering' | 'editing'>('rendering')
  const [rawText, setRawText] = React.useState(props.markdown)

  function storeMarkdown () {
    setPhase('loading')
    props.onSave(rawText).then(() => {
      setPhase('rendering')
    })
  }

  if (phase === 'loading') {
    return <section aria-busy={true}>Loading&hellip;</section>
  }

  if (phase === 'editing') {
    return (
      <section>
        <form onSubmit={(e) => { e.preventDefault(); storeMarkdown() }}>
          <textarea
            onChange={(e) => { setRawText(e.target.value) }}
            defaultValue={rawText}/>
          <button type="submit">RENDER</button>,
        </form>
      </section>
    )
  }

  return (
    <section>
      <form onSubmit={(event) => { event.preventDefault(); setPhase('editing') }}>
        <Markdown source={rawText}/>
        <button type="submit">EDIT</button>
      </form>
    </section>
  )
}
