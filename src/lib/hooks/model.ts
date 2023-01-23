import {
  reactive,
  unref,
  computed,
  PropType,
  watchEffect,
  toRef,
  watch,
  ref,
} from 'vue'
import { Item, MaybeArray, UpdateHandler } from '@/types'
import { defineHook, findArray, isset } from '@/utils'
import { useVModel } from '@/capi'

const definition = defineHook(
  {
    multiple: {
      type: Boolean,
      default: undefined,
    },
    modelValue: {},
    'onUpdate:modelValue': [Function] as PropType<
      UpdateHandler<Item['value'], { value: MaybeArray<Item> }>
    >,
    /**
     * Help resolve corresponding raw options from option values;
     * Useful when model values consist only from part of the option in the list;
     * One can provide either static array with raw options or an async function that
     * receives current values and returns corresponding resolved raw options;
     */
    resolve: {} as PropType<
      unknown[] | ((values: unknown[]) => Promise<unknown[]>)
    >,
  },
  function (props, context, { src, item, service }) {
    const items = toRef(src, 'data')

    const isMultiple = computed(
      () => props.multiple === true || Array.isArray(props.modelValue)
    )

    const { proxy, busy, set: proxySet } = useVModel(props, 'modelValue')

    // no need for this to be reactive
    // its onl
    let oldValue = ref<Item[]>([])

    const index = computed(() => unref(items).concat(unref(oldValue)))

    // model value is normalized to array for unified internal usage
    const model = computed<Item[]>({
      get(): Item[] {
        const v = proxy.value
        return [v].flat().filter(isset).map(resolve)
      },
      set(v?: Item | Item[]) {
        let value: MaybeArray<Item> = [v].flat().filter(isset) as Item[]

        let rawValue: MaybeArray<unknown> = value.map((e) => e.value)

        if (!unref(isMultiple)) rawValue = (value = value[0])?.value

        proxySet.call(service, rawValue, { value, service })
      },
    })

    const poor = computed(() => model.value.some((e) => e.poor))

    const resolver = computed(() => {
      const { resolve } = props
      const resolver = async () => {
        if (Array.isArray(resolve)) return resolve
        if (typeof resolve == 'function')
          return resolve.call(
            service,
            model.value.map((e) => e.raw)
          )
        return []
      }
      return () =>
        resolver().then((items) =>
          findArray(items).map((e) => item.value.ofRaw(e))
        )
    })

    watchEffect(() => (oldValue.value = model.value))

    // watchEffect(async () => {
    //   oldValue.value = model.value
    //   if (!unref(poor)) return
    //   oldValue.value = [...(await unref(resolver)()), ...unref(oldValue)]
    // })

    watch(
      [poor, resolver],
      async () => {
        if (!unref(poor)) return
        const resolved = await unref(resolver)()
        if (!resolved?.length) return
        oldValue.value = [...resolved, ...unref(oldValue)]
      },
      { flush: 'post' }
    )

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
      poor,
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
