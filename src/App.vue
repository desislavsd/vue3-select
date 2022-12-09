<script setup lang="ts">
const items = [
  { id: Math.random(), name: { first: 'Deso' } },
  { id: Math.random(), name: { first: '123' } },
  { id: Math.random(), name: { first: 'Ili' } },
]

function staticSrc() {
  return dynamicSrc('')
}

function dynamicSrc(query) {
  return new Promise((rs, rj) => {
    setTimeout(() => {
      1 || Math.round(Math.random()) > 0
        ? rs(items.filter((e) => !query || e.name.toString().includes(query)))
        : rj('Oops..')
    }, 0 * 2000)
  })
}

const opts = {
  'Dynamic src': {
    src: dynamicSrc,
  },
  'Static src': {
    src: staticSrc,
  },
}
const opt = ref(null)

const model = ref()
</script>

<template>
  <div>
    <label v-for="(o, name) in opts"
      >{{ name }} <input type="radio" v-model="opt" :value="o"
    /></label>
    <br />
    <hr />
    <br />
    <VueSelect
      v-model="model"
      v-bind="opt"
      as="name.first::id"
      tagging
    ></VueSelect>
  </div>
</template>
<style>
@media (prefers-color-scheme: dark) {
  :root {
    background: #1b1d25;
    color: #77b2c5;
  }
}
</style>
