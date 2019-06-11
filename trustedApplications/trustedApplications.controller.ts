import { S } from 'surplus'
import { DataSignal } from 's-js/src/S'

import solidUi from 'solid-ui'
import $rdf, { NamedNode } from 'rdflib'
import { TrustedApplication } from './trustedApplications.models'
import { getStatementsToAdd, getStatementsToDelete } from './trustedApplications.service'

const { authn, ns, store } = solidUi

export class TrustedApplicationsController {
  public isLoading: DataSignal<boolean>
  public isLoggedIn: DataSignal<boolean>
  public isEditable: DataSignal<boolean>
  public applications: DataSignal<TrustedApplication[]>
  public newApplication: DataSignal<TrustedApplication>

  constructor (public subject: NamedNode) {
    this.isLoading = S.value(true)
    this.isLoggedIn = S.value(false)
    this.isEditable = S.value(false)
    this.applications = S.data([])
    this.newApplication = S.value(TrustedApplication.createNew(subject))

    authn.solidAuthClient.currentSession()
      .then((session: any) => {
        this.isLoggedIn(!!session)
        this.isEditable(!!store.updater.editable(subject.doc().uri, store))
        this.isLoading(false)

        const applications = store.each(subject, ns.acl('trustedApp'), undefined, undefined)
          .flatMap((app: any) => {
            return store.each(app, ns.acl('origin'), undefined, undefined)
              .map((origin: any) => ({ appModes: store.each(app, ns.acl('mode'), undefined, undefined), origin }))
          })
          .map(({ appModes, origin }: {appModes: NamedNode[], origin: NamedNode}) => TrustedApplication.fromNamedNodes(subject, origin, appModes))
          .sort(this.sortApplications)
        this.applications(applications)
      })
      .catch((err: any) => {
        this.isLoggedIn(false)
        this.isLoading(false)
        console.error('Error fetching currentSession:', err)
      })
  }

  addOrEditApplication (appToAddOrEdit: TrustedApplication): void {
    let origin
    try {
      origin = $rdf.sym(appToAddOrEdit.origin())
    } catch (err) {
      return alert('Please provide an application URL you want to trust')
    }

    const modes = appToAddOrEdit.modes
      .filter(checkbox => checkbox.isChecked())
      .map(checkbox => checkbox.value)

    const deletions = getStatementsToDelete(origin, this.subject, store, ns)
    const additions = getStatementsToAdd(origin, this.generateRandomString(), modes, this.subject, ns)
    store.updater.update(deletions, additions, () => {
      let applications = this.applications()
      const addedOrUpdatedApp = TrustedApplication.copy(appToAddOrEdit)
      const index = applications.findIndex(app => app.origin() === appToAddOrEdit.origin())
      if (index === -1) {
        applications.push(addedOrUpdatedApp)
      } else {
        applications.splice(index, 1, addedOrUpdatedApp)
      }
      this.applications(applications.sort(this.sortApplications))
      this.newApplication(TrustedApplication.createNew(this.subject))
    })
  }

  removeApplication (appToRemove: TrustedApplication): void {
    let originToRemove
    try {
      originToRemove = $rdf.sym(appToRemove.origin())
    } catch (err) {
      return alert('Please provide an application URL you want to remove trust from')
    }

    const deletions = getStatementsToDelete(originToRemove, this.subject, store, ns)
    store.updater.update(deletions, null, () => {
      const applications = this.applications().filter(app => app.origin() !== appToRemove.origin())
      this.applications(applications)
    })
  }

  private generateRandomString (): string {
    return Math.random().toString(36).substring(7)
  }

  private sortApplications (a: TrustedApplication, b: TrustedApplication): number {
    return a.origin() > b.origin() ? 1 : -1
  }
}
