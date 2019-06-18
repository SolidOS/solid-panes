<template>
    <div id="MarkdownApp">
        <HelloWorld msg="Welcome to Your Vue.js + TypeScript App"/>
    </div>
</template>

<script lang="ts">
  import { Component, Vue } from 'vue-property-decorator';
  import HelloWorld from './HelloWorld.vue'

  @Component({
    components: {
      HelloWorld
    }
  })
  export default class App extends Vue {
  }
</script>

<style lang="scss">
    #MarkdownApp {
        border: solid 3px red;
        padding: 3px;
    }
</style>
