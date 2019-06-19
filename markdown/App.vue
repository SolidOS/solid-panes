<template>
    <div id="MarkdownApp">
        <div v-if="isLoading">LOADING</div>
        <div v-if="isRendering">
            <div v-html="text"></div>
            <button @click="toggle">Edit</button>
        </div>
        <label v-if="isEditing">
            <textarea v-model="markdown"></textarea>
            <button @click="toggle">Show</button>
        </label>
    </div>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';
  // import MarkdownView from './components/MarkdownView.vue'
  import { NamedNode } from 'rdflib'
  import { loadMarkdown, saveMarkdown, STATE } from './markdown.service'
  import marked from 'marked'

  @Component({
    // components: {
    //   MarkdownView
    // }
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

    toggle (): void {
      const wasEditing = this.state === STATE.EDITING
      if (wasEditing) {
        this.state = STATE.LOADING
        saveMarkdown(this.subject.uri, this.markdown)
          .then(() => this.state = STATE.RENDERING)
        return
      }
      this.state = STATE.EDITING
    }

    get text (): string {
      return marked(this.markdown)
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

    textarea {
        height: 10em;
        width: 98%;
    }
</style>
