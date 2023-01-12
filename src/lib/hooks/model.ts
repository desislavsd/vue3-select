import { Item, UpdateHandler } from '@/types'
import {
  reactive,
  unref,
  ref,
  computed,
  toRefs,
  PropType,
  watchEffect,
} from 'vue'
import { defineHook, isset } from '../utils'
import { useVModel } from '@/capi'

const definition = defineHook(
  {
    multiple: {
      type: Boolean,
      default: undefined,
    },
    modelValue: {},
    'onUpdate:modelValue': [Function] as PropType<UpdateHandler>,
  },
  function (props, context, { items, item }) {
    const isMultiple = computed(
      () => props.multiple === true || Array.isArray(props.modelValue)
    )

    const { proxy, busy } = useVModel(props, 'modelValue')

    // no need for this to be reactive
    // its onl
    let oldValue: Item[] = []

    const index = computed(() => items.parsed.concat(unref(oldValue)))

    const model = computed<Item[]>({
      get(): Item[] {
        const v = proxy.value
        // model value is normalized to array for unified internal usage
        return [v].flat().filter(isset).map(resolve)
      },
      set(v?: Item | Item[]) {
        const newValue = ([v].flat().filter(isset) as Item[]).map(
          (e) => e.value
        )

        proxy.value = unref(isMultiple) ? newValue : newValue[0]
      },
    })

    watchEffect(() => (oldValue = model.value))

    // appends selected option to model value
    // no matters if it was already selected
    function append(item: Item | Item[]) {
      // normalize to array
      item = [item].flat()

      if (!unref(isMultiple)) return (model.value = item)

      model.value = model.value.concat(item)
    }

    function resolve(value: unknown) {
      const newItem = unref(item).ofValue(value)
      return unref(index).find((e) => e.equals(newItem)) || newItem
    }

    // remove/appends option to model value
    // depending on whether it is selected
    function toggle(item: Item | Item[]) {
      if (!item) return

      // normalize to array
      item = [item].flat()

      const [add, remove] = item.reduce(
        (m, item) => {
          const type = Number(model.value.some((e) => item.equals(e)))
          m[type].push(item)
          return m
        },
        [[], []] as Item[][]
      )

      const newValue = model.value
        .filter((e) => !remove.some((item) => e.equals(item)))
        .concat(add)

      model.value = newValue
    }

    function pop() {
      model.value = model.value.slice(0, -1)
    }

    function clear() {
      model.value = []
    }

    function remove(index: number) {
      const newValue = model.value.slice()
      newValue.splice(index, 1)
      model.value = newValue
    }

    return reactive({
      value: model,
      busy,
      isMultiple,
      append,
      toggle,
      pop,
      remove,
      clear,
    })
  }
)

export default definition
