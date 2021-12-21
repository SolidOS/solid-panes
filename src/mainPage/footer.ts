import { IndexedFormula } from 'rdflib'
import { initFooter } from 'solid-ui'

/**
 * links in the footer
*/
const SOLID_PROJECT_URL = 'https://solidproject.org'
const SOLID_PROJECT_NAME = 'solidproject.org'

export function createFooter (store: IndexedFormula) {
  initFooter(store, setFooterOptions())
}

function setFooterOptions () {
  return [
    {
      solidProjectUrl: SOLID_PROJECT_URL,
      solidProjectName: SOLID_PROJECT_NAME
    }
  ]
}
