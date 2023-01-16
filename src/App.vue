<script setup lang="ts">
import { computed, ref, reactive, unref } from 'vue'
import { useService } from '@/service'
import VueSelect from '@/components/Select.vue'
const items = [
  { id: 1, name: { first: 'Deso', last: 'Stiliyanov' } },
  { id: 2, name: { first: 'Ili', last: 'Nikolaeva' } },
  { id: 3, name: { first: 'Steli', last: 'Desislav' } },
]
const modes = ['skip', 'append', 'toggle'] as const

const common = reactive({
  mode: modes[0],
  typeahead: false,
  tagging: false,
})

const opts = {
  'Dynamic src': {
    modelValue: ref([1]),
    as: 'name.first:id:id',
    src: dynamicSrc,
    minlength: 3,
  },
  'Static src': {
    modelValue: ref([1]),
    as: 'name.first:id:id',
    src: items,
    filter: 'name',
  },
  GitHub: {
    modelValue: ref([11730342]),
    src: 'https://api.github.com/search/repositories?q={phrase}',
    as: 'name:id:id',
    phrase: 'vue',
  },
}
const opt = ref(Object.values(opts).at(0))

const model = ref([
  /* 11730342 */
])
const phrase = ref('')

// const srv = useService(
//   reactive({
//     phrase,
//   })
// )

function lazyUpdate(v: any) {
  // console.log(this, ...arguments)
  opt.value.modelValue = v
  model.value = v
  // return new Promise((rs) => setTimeout(rs, 300)).then(() => (model.value = v))
}

async function dynamicSrc({ phrase: query }: { phrase: string }) {
  return new Promise((rs, rj) => {
    setTimeout(() => {
      1 || Math.round(Math.random()) > 0
        ? rs(
            items.filter(
              (e) =>
                !query ||
                JSON.stringify(e.name)
                  .toLowerCase()
                  .includes(query.toString().toLowerCase())
            )
          )
        : rj('Oops..')
    }, 1 * 1000)
  })
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4 p-4">
    <div>
      <!-- {{ srv.phrase.value }} {{ srv.ui.attrs.input.placeholder }} -->
      <VueSelect
        @update:model-value="lazyUpdate"
        v-bind="{ ...common, ...opt }"
      >
        <template v-if="opt?.src?.includes?.('github')" #both="{ item }">
          <img
            v-if="item.raw.owner"
            class="aspect-square w-6 mr-1 -ml-1"
            :src="item.raw.owner.avatar_url"
            alt=""
          />
          <span class="capitalize">{{ item.label }}</span>
        </template>
      </VueSelect>
      <pre>{{ model }}</pre>
      <pre>{{ items[0] }}</pre>
    </div>
    <div>
      <label
        v-for="(o, name) in opts"
        class="bg-gray-300 hover:bg-gray-400 text-dark-800 cursor-pointer rounded-sm px-2 py-1 mr-2"
        >{{ name }} <input type="radio" name="opts" v-model="opt" :value="o"
      /></label>
      <div class="p-2 rounded-sm grid gap-2 my-4">
        Settings
        <label class="capitalize cursor-pointer">
          typeahead <input type="checkbox" v-model="common.typeahead" />
        </label>
        <label class="capitalize cursor-pointer">
          tagging <input type="checkbox" v-model="common.tagging" />
        </label>
        <label class="capitalize cursor-pointer">
          mode
          <select v-model="common.mode">
            <option v-for="mode in modes" :value="mode">{{ mode }}</option>
          </select>
        </label>
      </div>
      <input v-model="phrase" class="block my-10" />
    </div>
  </div>
</template>
<style>
:root {
  font-family: sans-serif;
  background: #eee;
}
@media (prefers-color-scheme: dark) {
  :root {
    background: #18191b;
    color: silver;
  }
}
</style>
