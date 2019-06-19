<template>
    <form @submit="save">
        <label>
            <textarea v-model="raw"></textarea>
        </label>
        <button>Save</button>
    </form>
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class MarkdownEdit extends Vue {
    @Prop() markdown!: string;
    raw!: string

    created () {
      this.raw = this.markdown
    }

    save (): void {
      this.$emit('save', this.raw)
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    textarea {
        height: 10em;
        width: 98%;
    }
</style>
