import { defineHook } from '@/utils'
import { ref, computed, unref, watch, reactive, toRef } from 'vue'

const props = {}

export default defineHook(props, (props, ctx, { items: allItems }) => {
  const _index = ref(-1)

  const items = toRef(allItems, 'value')

  const index = computed({
    get() {
      return unref(_index)
    },
    set(value: number) {
      const { min, max } = Math
      const last = unref(items).length - 1
      _index.value = max(min(last, value), -1)
    },
  })

  const item = computed(() => unref(items)[unref(index)])

  function next(prev?: boolean | number) {
    const { min, max } = Math

    const last = unref(items).length - 1

    if (typeof prev == 'undefined') prev = false

    if (typeof prev == 'boolean') prev = unref(index) + (prev ? -1 : 1)

    index.value = prev
  }

  watch(items, (items) => (index.value = unref(items)[0]?.new ? 0 : -1))

  return reactive({
    index,
    item,
    next,
  })
})
