<template>
    <div id="TrustedApplicationsApp">
        <div v-if="isLoading">Profile is loading...</div>
        <div v-else-if="isLoggedIn">
            <h3>Manage your trusted applications</h3>
            <div v-if="isEditable">
                <p>Here you can manage the applications you trust.</p>
                <table class="results">
                    <tr>
                        <th>Application URL</th>
                        <th>Access modes</th>
                        <th>Actions</th>
                    </tr>
                    <TrustedApplicationRow
                            v-for="application in applications"
                            v-bind:application="application"
                            v-on:updateApp="addOrUpdateApp"
                            v-on:removeApp="removeApp"/>
                    <TrustedApplicationRow
                            v-bind:application="newApplication"
                            v-on:addApp="addOrUpdateApp"/>
                </table>
                <h4>Notes</h4>
                <ol>
                    <li>Trusted applications will get access to all resources that you have access to.</li>
                    <li>You can limit which modes they have by default.</li>
                    <li>They will not gain more access than you have.</li>
                </ol>
                <p>Application URLs must be valid URL. Examples are http://localhost:3000, https://trusted.app, and
                    https://sub.trusted.app.</p>
            </div>
            <div v-else>Your profile {{ subject.doc().uri }} is not editable, so we cannot do much here.</div>
        </div>
        <div v-else>You are not logged in</div>
    </div>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import { TrustedApplication } from './trustedApplications.models'
  import { NamedNode } from 'rdflib'
  import solidUi from 'solid-ui'
  import TrustedApplicationRow from './components/TrustedApplicationRow.vue'
  import { getStatementsToAdd, getStatementsToDelete } from './trustedApplications.service'

  const { authn, ns, store } = solidUi

  @Component({
    components: {
      TrustedApplicationRow
    }
  })
  export default class App extends Vue {
    @Prop(NamedNode) subject!: NamedNode

    isLoading: boolean = true
    isLoggedIn: boolean = false
    isEditable: boolean = false
    applications: TrustedApplication[] = []
    newApplication: TrustedApplication = TrustedApplication.createNew(this.subject)

    addOrUpdateApp (application: TrustedApplication) {
      let origin
      try {
        origin = $rdf.sym(application.origin)
      } catch (err) {
        return alert('Please provide an application URL you want to trust')
      }

      const modes = application.modes
        .filter(checkbox => checkbox.isChecked)
        .map(checkbox => checkbox.value)

      const deletions = getStatementsToDelete(origin, this.subject, store, ns)
      const additions = getStatementsToAdd(origin, this.generateRandomString(), modes, this.subject, ns)
      store.updater.update(deletions, additions, () => {
        const addedOrUpdatedApp = TrustedApplication.copy(application)
        const index = this.applications.findIndex(app => app.origin === application.origin)
        if (index === -1) {
          this.applications.push(addedOrUpdatedApp)
        } else {
          this.applications.splice(index, 1, addedOrUpdatedApp)
        }
        this.applications = this.applications.sort(this.sortApplications)
        this.newApplication = TrustedApplication.createNew(this.subject)
      })
    }

    created () {
      authn.solidAuthClient.currentSession()
        .then((session: any) => {
          this.isLoggedIn = !!session
          this.isEditable = !!store.updater.editable(this.subject.doc().uri, store)
          this.isLoading = false

          this.applications = store.each(this.subject, ns.acl('trustedApp'), undefined, undefined)
            .flatMap((app: any) => {
              return store.each(app, ns.acl('origin'), undefined, undefined)
                .map((origin: any) => ({ appModes: store.each(app, ns.acl('mode'), undefined, undefined), origin }))
            })
            .map(({ appModes, origin }: {appModes: NamedNode[], origin: NamedNode}) => TrustedApplication.fromNamedNodes(this.subject, origin, appModes)).sort(this.sortApplications)
        })
        .catch((err: any) => {
          this.isLoggedIn = false
          this.isLoading = false
          console.error('Error fetching currentSession:', err)
        })
    }

    private generateRandomString (): string {
      return Math.random().toString(36).substring(7)
    }

    removeApp (application: TrustedApplication) {
      let originToRemove
      try {
        originToRemove = $rdf.sym(application.origin)
      } catch (err) {
        return alert('Please provide an application URL you want to remove trust from')
      }

      const deletions = getStatementsToDelete(originToRemove, this.subject, store, ns)
      store.updater.update(deletions, null, () => {
        this.applications = this.applications.filter(app => app.origin !== application.origin)
      })
    }

    private sortApplications (a: TrustedApplication, b: TrustedApplication): number {
      return a.origin > b.origin ? 1 : -1
    }
  }
</script>

<style scoped lang="scss">
    #MarkdownApp {
        border: 0.3em solid #418d99;
        border-radius: 0.5em;
        padding: 0.7em;
        margin-top: 0.7em;
    }
</style>
