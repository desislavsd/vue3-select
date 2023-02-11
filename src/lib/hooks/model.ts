import {
  reactive,
  unref,
  computed,
  PropType,
  watchEffect,
  toRef,
  watch,
  shallowRef,
  ComputedRef,
} from 'vue'
import { Item, MaybeArray, UpdateHandler } from '@/types'
import { defineHook, findArray, isset } from '@/utils'
import { useBusy, useVModel } from '@/capi'

const definition = defineHook(
  {
    multiple: {
      type: Boolean,
      default: undefined,
    },
    modelValue: {},
    'onUpdate:modelValue': {} as PropType<
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
    let oldValue = shallowRef<Item[]>([])

    const index = computed(() => unref(items).concat(unref(oldValue)))
    const resolving = useBusy()

    // model value is normalized to array for unified internal usage
    const model = computed<Item[]>({
      get(): Item[] {
        const v = proxy.value
        return [v].flat().filter(isset).map(resolve)
      },
      set,
    })

    const poorItems = computed(() => model.value.filter((e) => e.poor))

    const resolver = computed(() => {
      const { resolve } = props
      const resolver = async () => {
        if (Array.isArray(resolve)) return resolve
        if (typeof resolve == 'function')
          return resolve.call(
            service,
            unref(poorItems).map((e) => e.value)
          )
        return []
      }
      return () =>
        resolver().then((items) =>
          findArray(items).map((e) => item.value.ofRaw(e))
        )
    })

    // store model.value to use for resolve later
    watchEffect(() => {
      // update oldValue without triggering reactivity
      // to avoid reactivity ripples with `model`
      oldValue.value.splice(0, Infinity, ...model.value)
    })

    // resolve value when poor items are present
    watch(
      [
        // changes should be tracked via primitive medium
        // therefore use stringified representation of the poor items
        computed(() =>
          unref(poorItems)
            .map((e) => e.value?.toString())
            .sort() // ensure [1,2] & [2,1] are one and the same thing to avoid unnecessary triggers
            .join(',')
        ),
        resolver,
      ],
      async () => {
        if (!unref(poorItems).length) return
        const resolved = await (resolving.value = unref(resolver)())
        if (!resolved?.length) return
        oldValue.value = [...resolved, ...unref(oldValue)]
      },
      { flush: 'post', immediate: true }
    )

    /**
     * Replace selection
     */
    function set(v?: Item | Item[]) {
      let value: MaybeArray<Item> = [v].flat().filter(isset) as Item[]

      let rawValue: MaybeArray<unknown> = value.map((e) => e.value)

      if (!unref(isMultiple)) rawValue = (value = value[0])?.value

      return proxySet.call(service, rawValue, { value, service })
    }

    /**
     * Appends items to selection
     * no matter if they were already selected
     */
    function append(item: Item | Item[]) {
      // normalize to array
      item = [item].flat()

      if (!unref(isMultiple)) return (model.value = item)

      model.value = model.value.concat(item)
    }

    /**
     * Toggle item from selection
     */
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

    /**
     * Remove last item from selection
     */
    function pop() {
      model.value = model.value.slice(0, -1)
    }

    /**
     * Clear selection
     */
    function clear() {
      model.value = []
    }

    /**
     * Remove item at given position in selection
     */
    function remove(index: number) {
      const newValue = model.value.slice()
      newValue.splice(index, 1)
      model.value = newValue
    }

    function resolve(value: unknown) {
      const newItem = unref(item).ofValue(value)
      return unref(index).find((e) => e.equals(newItem)) || newItem
    }

    return reactive({
      value: model,
      resolving: resolving as ComputedRef<boolean>,
      poor: computed(() => !!unref(poorItems).length),
      busy,
      isMultiple,
      set,
      append,
      toggle,
      pop,
      remove,
      clear,
    })
  }
)

export default definition
