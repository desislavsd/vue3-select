<script lang="tsx">
import { defineComponent, getCurrentInstance } from 'vue'
import { set } from '@/utils'
import { useVModel } from '@/capi'
export const test = defineComponent({
  props: {
    modelValue: {
      // default: useVModel.default,
    },
    'onUpdate:modelValue': {},
  },
  setup(props, ctx) {
    // console.log(props['onUpdate:modelValue'])
    const { proxy: model, set } = useVModel(props, 'modelValue')

    return () => (
      <button onClick={() => set((model.value || 0) + 1)}>
        {model.value || 0}
      </button>
    )
  },
})
</script>
<script setup lang="tsx">
import { computed, ref, reactive, unref, markRaw } from 'vue'
import { useService } from '@/service'
import VueSelect from '@/components/Select.vue'
// import * from '../dist/vue3-select.cjs'

const spam = reactive({
  number: 1,
  string: 'string',
  count: 200,
})

const items = computed(
  () =>
    Array.from({ length: spam.count }, (e, i) => ({
      id: i + 1,
      name: { first: `Item ${i + 1}` },
    })) || [
      { id: 1, name: { first: 'Deso', last: 'Stiliyanov' } },
      { id: 2, name: { first: 'Ili', last: 'Nikolaeva' } },
      { id: 3, name: { first: 'Steli', last: 'Desislav' } },
      { id: 4, name: { first: 'Adi', last: 'Damyanova' } },
      { id: 5, name: { first: 'Megi', last: 'Damyanova' } },
      { id: 6, name: { first: 'Yoli', last: 'Damyanova' } },
      { id: 7, name: { first: 'Niki', last: 'Pavlov' } },
      { id: 8, name: { first: 'Toni', last: 'Pavlova' } },
      { id: 9, name: { first: 'Kiki', last: 'Pavlov' } },
    ]
)
const modes = ['skip', 'append', 'toggle', 'disable'] as const

const common = reactive({
  mode: modes[2],
  typeahead: false,
  tagging: true,
  accessible: false,
  readonly: false,
  disabled: false,
  autopoint: false,
  autoscroll: true,
})

const opts = {
  'Dynamic src': {
    modelValue: ref([]),
    as: 'name.first::id',
    src: dynamicSrc,
    minlength: 3,
  },
  'Static src': {
    modelValue: ref([2]),
    as: 'name.first:id:id',
    src: computed(() => spam.items),
    filter: 'name',
    // disable: (e) => !Boolean(e.index % 3),
  },
  GitHub: {
    modelValue: ref(['vuejs/vue']),
    src: 'https://api.github.com/search/repositories?q={phrase}',
    as: ['name', githubModel, githubModel],
    phrase: '',
    valid: 'min:3',
    resolve(ids) {
      return Promise.all(
        ids.map((e) =>
          fetch(`https://api.github.com/repos/${e}`).then((res) => res.json())
        )
      )
    },
  },
}

function githubModel(raw, value) {
  // console.log({ raw, value }, arguments.length)
  if (arguments.length < 2) return `${raw.owner?.login}/${raw.name}`

  const [login, name] = (value?.toString() || '').split('/')
  return Object.assign(raw, {
    name,
    owner: {
      login,
    },
  })
}

const opt = ref(Object.values(opts).at(1))
defineExpose({ opt })
const model = ref([
  /* 11730342 */
])
const phrase = ref('')

// const srv = useService(
//   reactive({
//     phrase,
//   })
// )

async function lazyUpdate(v: any, { value, service }) {
  // console.log(this, ...arguments)
  // await new Promise((rs) => setTimeout(rs, 1000))

  let tag = value.find((e) => e.new)

  if (!tag) return (opt.value.modelValue = v)

  tag = {
    id: 555,
    name: {
      first: tag.label,
    },
  }

  service.src.pushTags(tag)

  opt.value.modelValue = tag.id
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
        v-bind="{ ...common, ...opt }"
        @update:model-value="lazyUpdate"
        :model-value="opt.modelValue"
        :src="items"
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

      <template v-if="opt?.src?.includes?.('github')">
        <button @click="opt?.modelValue.push('vuejs/vue')">Add Vue</button>
        <button @click="opt?.modelValue.push('facebook/react')">
          Add React
        </button>
        <button @click="opt?.modelValue.push('nuxt/nuxt')">Add Nuxt</button>
      </template>
      <pre>{{ opt?.modelValue }}</pre>
    </div>
    <div>
      <test v-model="spam.number" />
      <input type="number" v-model="spam.count" />
      <br />
      <br />
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
          disabled <input type="checkbox" v-model="common.disabled" />
        </label>
        <label class="capitalize cursor-pointer">
          readonly <input type="checkbox" v-model="common.readonly" />
        </label>
        <label class="capitalize cursor-pointer">
          accessible <input type="checkbox" v-model="common.accessible" />
        </label>
        <label class="capitalize cursor-pointer">
          autopoint <input type="checkbox" v-model="common.autopoint" />
        </label>
        <label class="capitalize cursor-pointer">
          autoscroll <input type="checkbox" v-model="common.autoscroll" />
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
