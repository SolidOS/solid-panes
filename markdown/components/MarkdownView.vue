<template>
    <div>
        <div v-html="text"></div>
        <button @click="edit">Edit</button>
    </div>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import marked from 'marked'

  @Component
  export default class MarkdownView extends Vue {
    @Prop() markdown!: string;

    get text (): string {
      return marked(this.markdown)
    }

    edit (): void {
      this.$emit('edit')
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
