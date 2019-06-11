import * as Surplus from 'surplus'
import { TrustedApplicationsController } from './trustedApplications.controller'
import solidUi from 'solid-ui'
import data from 'surplus-mixin-data'
import { TrustedApplication } from './trustedApplications.models'

const { S } = Surplus
const { widgets } = solidUi

export const TrustedApplicationsView = (controller: TrustedApplicationsController) =>
  <section class={'trusted-applications-pane'}
    style={{ border: '0.3em solid #418d99', borderRadius: '0.5em', padding: '0.7em', marginTop: '0.7em' }}>
    {controller.isLoading()
      ? <div>Profile is loading...</div>
      : controller.isLoggedIn()
        ? <div>
          <h3>Manage your trusted applications</h3>
          {controller.isEditable()
            ? [
              <p>Here you can manage the applications you trust.</p>,
              <table class={'results'}>
                <tr>
                  <th>Application URL</th>
                  <th>Access modes</th>
                  <th>Actions</th>
                </tr>
                {controller.applications().map(app => applicationRow(controller, app))}
                {applicationRow(controller, controller.newApplication())}
              </table>,
              <h4>Notes</h4>,
              <ol>
                <li>Trusted applications will get access to all resources that you have access to.</li>
                <li>You can limit which modes they have by default.</li>
                <li>They will not gain more access than you have.</li>
              </ol>,
              <p>Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and
                https://sub.trusted.app.</p>
            ]
            : widgets.errorMessageBlock(document, `Your profile ${controller.subject.doc().uri} is not editable, so we cannot do much here.`)}
        </div>
        : <div>You are not logged in</div>}
  </section>

function applicationRow (controller: TrustedApplicationsController, app: TrustedApplication) {
  return <tr>
    <td>
      <input class={'textinput'} placeholder={'Write new URL here'} fn={data(app.origin)}/>
    </td>
    <td>
      {app.modes.map(mode => {
        return <label>
          <input type={'checkbox'} fn={data(mode.isChecked)}/>
          <span>{mode.name}</span>
        </label>
      })}
    </td>
    <td>
      {
        app.isNew
          ? <button class={'controlButton'}
            style={{ background: 'LightGreen' }}
            onClick={() => controller.addOrEditApplication(app)}>Add</button>
          : [
            <button class={'controlButton'}
              style={{ background: 'LightGreen' }}
              onClick={() => controller.addOrEditApplication(app)}>Update</button>,
            <button class={'controlButton'}
              style={{ background: 'LightCoral' }}
              onClick={() => controller.removeApplication(app)}>Delete</button>
          ]
      }
    </td>
  </tr>
}
