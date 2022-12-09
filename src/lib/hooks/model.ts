import { reactive, unref, ref, computed } from 'vue'
import { defineHook, isset } from '../utils'

declare module '@/types' {
  export interface Config {
    multiple?: boolean
    modelValue?: unknown
  }
  export interface Select {
    model: ReturnType<typeof definition['hook']>
  }
}

// TODO:
// - add statefull support
// - local model value should consist of Items, not Items.value
const definition = defineHook(
  {
    multiple: undefined,
    modelValue: undefined,
  },
  function (props, context, { items, item }) {
    const isMultiple = computed(
      () => props.multiple === true || Array.isArray(props.modelValue)
    )

    const model = computed({
      get() {
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
      set(v) {
        v = [v]
          .flat()
          .filter(isset)
          .map((e) => e.value)

        context.emit('update:modelValue', unref(isMultiple) ? v : v[0])
      },
    })

    return reactive({ value: model, isMultiple })
  }
)

export default definition
