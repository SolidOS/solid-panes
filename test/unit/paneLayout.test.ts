import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function stylesheet (path: string): string {
  return readFileSync(resolve(process.cwd(), 'src', path), 'utf8')
}

describe('pane content spacing', () => {
  it('gives the Notepad pad pane a small top inset', () => {
    expect(stylesheet('pad/padPane.css')).toMatch(
      /\.pad-layout \{[\s\S]*padding-top: 0\.5rem;/
    )
  })

  it('keeps a 40px desktop gutter on the About and Data panes', () => {
    expect(stylesheet('defaultPane.css')).toMatch(
      /\.paneDiv\.defaultPane \{[\s\S]*padding-inline: 40px;/
    )
    expect(stylesheet('dataContentPane.css')).toMatch(
      /div\.data-content-pane \{[\s\S]*padding: var\(--spacing-base, 0\.5rem\) 40px;/
    )
    expect(stylesheet('dataContentPane.css')).not.toMatch(
      /\.data-content-pane__nested-formula[^{]*\{[\s\S]*40px/
    )
  })

  it('keeps the Under the Hood pane within its host while adding desktop gutters', () => {
    expect(stylesheet('internal/internalPane.css')).toMatch(
      /\.internalPaneContent \{[\s\S]*padding: var\(--spacing-xs, 0\.5em\) 40px;[\s\S]*box-sizing: border-box;/
    )
    expect(stylesheet('internal/internalPane.css')).toMatch(
      /\.internalPaneControls \{[\s\S]*width: 100%;[\s\S]*margin: var\(--spacing-sm, 1em\) 0;[\s\S]*box-sizing: border-box;/
    )
  })
})
