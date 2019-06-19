<template>
    <tr>
        <td>
            <input class="textinput" placeholder="Write new URL here" v-model="application.origin" />
        </td>
        <td>
            <label v-for="mode in application.modes">
                <input type="checkbox" v-model="mode.isChecked"/>
                <span>{{mode.name}}</span>
            </label>
        </td>
        <td v-if="application.isNew">
            <button class="controlButton"
                    style="background: LightGreen"
                    @click="addApp">
                Add
            </button>
        </td>
        <td v-else>
            <button class="controlButton"
                    style="background: LightGreen"
                    @click="updateApp">
                Update
            </button>
            <button class="controlButton"
                    style="background: LightCoral"
                    @click="deleteApp">
                Delete
            </button>
        </td>
    </tr>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import { TrustedApplication } from '../trustedApplications.models'

  @Component
  export default class TrustedApplicationRow extends Vue {
    @Prop() application!: TrustedApplication;

    addApp () {
      this.$emit('addApp', this.application)
    }

    deleteApp () {
      this.$emit('removeApp', this.application)
    }

    updateApp () {
      this.$emit('updateApp', this.application)
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

</style>
