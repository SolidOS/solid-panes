import { DialogComponent, showDialog } from 'solid-ui'
import { html } from 'lit'

import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialogs-root'

const ticketRows = [
  {
    description: 'Structure is no longer a table',
    ticket: 'No ticket link to document',
    feedback: 'Thoughts about implementation',
  },
  {
    description: '> Shift+Click opens pane in full view, Option+Click opens internal pane in full view',
    ticket: 'https://github.com/SolidOS/folder-pane/issues/238',
    feedback: 'Do you like how it opens? No nav bar, main header still present. Any suggestions?',
  },
  {
    description: 'Type Index Discovery',
    ticket: 'https://github.com/SolidOS/solidos/issues/335',
    feedback: 'Thoughts',
  },
  {
    description: 'Open a file that you have just created',
    ticket: 'https://github.com/SolidOS/folder-pane/issues/1',
    feedback: 'Think this is complete',
  },
  {
    description: 'Deleting Resources',
    ticket: 'https://github.com/SolidOS/solid-panes/issues/740 and https://github.com/SolidOS/solid-panes/issues/298',
    feedback: 'Implemented Trash and removed header for the index file',
  },
  {
    description: "Dealing with files/containers you see when looking at someones else's profile or not logged in",
    ticket: 'https://github.com/SolidOS/solid-panes/issues/728',
    feedback: 'Could not accomplish all, but when clicking on a resource that you don\'t have access to there is a message now, thoughts',
  },
  {
    description: 'Different Views',
    ticket: 'https://github.com/SolidOS/solid-panes/issues/228',
    feedback: 'Wondering if the new design accomplishes this, we have the sidebar',
  },
]

const missingInDesign = [
  'drop icon, added upload area on both the side bar and container, should we have both? If not which one..'
]

const newIdeas = [
  'Aad - Red pencil click on upload as well and opens local file explorer',
  'Drop to upload on any container shown in the container pane or the side bar',
  'Made the empty area for a container droppable/clickable for uploading',
]

const notYetDone = [
  'Copy a link https://github.com/SolidOS/folder-pane/issues/239',
]

const thingsToFix = [
  'Dokeili isn\'t working properly',
  'Some panes need a refreh to fit properly and scroll',
  'When you are viewing a resource you can\'t seem to search, but for all other cases it searches everything',
  'Human readable pane - i can fix docx (did this in my monorepo playing around) https://github.com/SolidOS/solid-panes/issues/547, maybe (Powerpoint) pptx will check if easy',
  'icons for the panes need to look into this we have new ones',
  'Sidebar collapse is not implemented',
  'Would be cool to have right click, but I couldn\'t get it to work',
  'messaging about what you are deleting, there is a ticket for this need to find',
]

export default class ItemsAndTheirTicketsDialog extends DialogComponent<void> {
  private cancel = () => this.close()

  protected render () {
    return html`
      <solid-ui-dialog title="Items and Their Tickets">
        <solid-ui-dialog-content>
          <div class="items-and-their-tickets-dialog">
            <p>This dialog is rendered from <strong>mydocs/ItemsAndTheirTickets.md</strong>.</p>

            <section>
              <h2>Items</h2>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Ticket</th>
                    <th>Check/Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows.map((row) => html`
                    <tr>
                      <td>${row.description}</td>
                      <td>
                        ${row.ticket.includes('http')
                          ? html`${row.ticket.split(' and ').map((ticket) => html`<div><a href=${ticket} target="_blank" rel="noreferrer">${ticket}</a></div>`)}`
                          : row.ticket}
                      </td>
                      <td>${row.feedback}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Things Missing In Design</h2>
              <ul>
                ${missingInDesign.map((item) => html`<li>${item}</li>`) }
              </ul>
            </section>

            <section>
              <h2>New Ideas</h2>
              <ul>
                ${newIdeas.map((item) => html`<li>${item}</li>`) }
              </ul>
            </section>

            <section>
              <h2>Not Yet Done</h2>
              <ul>
                ${notYetDone.map((item) => html`<li>${item}</li>`) }
              </ul>
            </section>

            <section>
              <h2>Things To Fix Or Do</h2>
              <ul>
                ${thingsToFix.map((item) => html`<li>${item}</li>`) }
              </ul>
            </section>
          </div>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <solid-ui-button variant="secondary" @click=${this.cancel}>Close</solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}

if (!customElements.get('items-and-their-tickets-dialog')) {
  customElements.define('items-and-their-tickets-dialog', ItemsAndTheirTicketsDialog)
}

function ensureDialogsRoot () {
  if (!document.querySelector('solid-ui-dialogs-root')) {
    const dialogsRoot = document.createElement('solid-ui-dialogs-root')
    document.body.appendChild(dialogsRoot)
  }
}

function openItemsAndTheirTicketsDialog () {
  ensureDialogsRoot()
  showDialog(ItemsAndTheirTicketsDialog)
}

if (typeof window !== 'undefined') {
  const openWhenReady = () => {
    if ((window as Window & { __itemsAndTheirTicketsDialogShown?: boolean }).__itemsAndTheirTicketsDialogShown) {
      return
    }

    ;(window as Window & { __itemsAndTheirTicketsDialogShown?: boolean }).__itemsAndTheirTicketsDialogShown = true
    openItemsAndTheirTicketsDialog()
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', openWhenReady, { once: true })
  } else {
    queueMicrotask(openWhenReady)
  }
}
