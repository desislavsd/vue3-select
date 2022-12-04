<script setup lang="ts">
function src() {
  let query
  return new Promise((rs, rj) => {
    setTimeout(() => {
      1 || Math.round(Math.random()) > 0
        ? rs([1, 2, 3].filter((e) => !query || e.toString().includes(query)))
        : rj('Oops..')
    }, 2000)
  })
}
</script>

<template>
  <div>
    <VueSelect :src="src"></VueSelect>
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
