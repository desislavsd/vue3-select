import { Item } from '@/types'
import { reactive, unref, ref, computed } from 'vue'
import { defineHook, isset } from '../utils'

declare module '@/types' {
  export interface Config {
    multiple?: boolean
    modelValue?: unknown
    'onUpdate:modelValue': (value: unknown, select: Select) => void
  }
  // export interface Select {
  //   model: ReturnType<typeof definition['hook']>
  // }
}

// TODO:
// - add statefull support
// - local model value should consist of Items, not Items.value
const definition = defineHook(
  {
    multiple: undefined,
    modelValue: undefined,
    'onUpdate:modelValue': undefined,
  },
  function (props, context, { items, item }) {
    const isMultiple = computed(
      () => props.multiple === true || Array.isArray(props.modelValue)
    )

    const model = computed<Item[]>({
      get(): Item[] {
        const v = props.modelValue
        // model value is normalized to array for unified internal usage
        return [v]
          .flat()
          .filter(isset)
          .map(
            (v) =>
              items.parsed.find((e) => e.equals(v)) || unref(item).ofValue(v)
          )
      },
      set(v?: Item | Item[]) {
        const newValue = [v]
          .flat()
          .filter(isset)
          .map((e) => e.value)

        props['onUpdate:modelValue']?.(
          unref(isMultiple) ? newValue : newValue[0],
          arguments[1]
        )
      },
    })

    // appends selected option to model value
    // no matters if it was already selected
    function append(item: Item | Item[]) {
      // normalize to array
      item = [item].flat()

      if (!unref(isMultiple)) return (model.value = item)

      model.value = model.value.concat(item)
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
