<template>
    <div id="MarkdownApp">
        <div v-if="isLoading">LOADING</div>
        <MarkdownView v-if="isRendering" v-bind:markdown="markdown" v-on:edit="toggle" />
        <MarkdownEdit v-if="isEditing" v-bind:markdown="markdown" v-on:save="toggle" />
    </div>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import MarkdownView from './components/MarkdownView.vue'
  import { NamedNode } from 'rdflib'
  import { loadMarkdown, saveMarkdown, STATE } from './markdown.service'
  import MarkdownEdit from './components/MarkdownEdit.vue'

  @Component({
    components: {
      MarkdownEdit,
      MarkdownView
    }
  })
  export default class App extends Vue {
    state: STATE = STATE.LOADING
    markdown: string = ''

    @Prop(NamedNode) subject!: NamedNode

    created (): void {
      loadMarkdown(this.subject.uri)
        .then(responseText => {
          this.markdown = responseText
          this.state = STATE.RENDERING
        })
    }

    toggle (markdown: string): void {
      const wasEditing = this.state === STATE.EDITING
      if (wasEditing) {
        this.state = STATE.LOADING
        saveMarkdown(this.subject.uri, markdown)
          .then(() => this.markdown = markdown)
          .then(() => this.state = STATE.RENDERING)
        return
      }
      this.state = STATE.EDITING
    }

    get isEditing (): boolean {
      return this.state === STATE.EDITING
    }

    get isLoading (): boolean {
      return this.state === STATE.LOADING
    }

    get isRendering (): boolean {
      return this.state === STATE.RENDERING
    }
  }
</script>

<style scoped lang="scss">
    #MarkdownApp {
        border: solid 3px red;
        padding: 3px;
    }
</style>
