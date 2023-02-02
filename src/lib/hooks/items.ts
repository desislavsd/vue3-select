import { Item, WithoutFirstParameter, MaybeArray, Not, Fn } from '@/types'
import { reactive, unref, computed, toRef, PropType } from 'vue'
import { defineHook, toPath, get, craw } from '@/utils'

type FilterProp = boolean | string | string[] | typeof defaultFilter

const props = {
  filter: {
    type: [Boolean, String, Function, Array] as PropType<FilterProp>,
    default: undefined,
  },
  filterBy: {} as PropType<Not<FilterProp, boolean>>,
  tagging: [Boolean, String, Array] as PropType<boolean | MaybeArray<string>>,
  tagOn: {
    type: [String, Array] as PropType<MaybeArray<string>>,
    default: 'Enter,Tab, ,',
  },
  mode: {
    type: String as PropType<'skip' | 'append' | 'toggle'>,
    default: 'skip',
  },
}

export default defineHook(
  props,
  (props, ctx, { phrase, src, item, model, service }) => {
    const items = computed(() => src.data)

    const tagging = computed(() => !!unref(props.tagging))

    const flags = reactive({
      tagging,
      tagOn: computed(
        () =>
          (
            [props.tagging, props.tagOn]
              .map(unref)
              .map((e) =>
                typeof e == 'string' ? e.split(/,/).map((e) => e || ',') : e
              )
              .find((e) => Array.isArray(e)) as undefined | string[]
          )?.filter(Boolean) || []
      ),
      mode: toRef(props, 'mode'),
    })

    const filter = computed(() => {
      if (!props.filter)
        if (src.dynamic)
          // auto decide if filter should be applied
          // dynamic items are filtered serverside
          return false

      return normalizeFilter(props.filter)
    })

    const moded = computed(() => {
      return flags.mode == 'skip'
        ? unref(items).filter((e) => !model.value.some((s) => s.equals(e)))
        : unref(items)
    })

    const filtered = computed(() => {
      if (!phrase.value || !unref(filter)) return unref(moded)

      return unref(moded).filter((item) =>
        (unref(filter) as Fn<boolean>)(item, phrase.value)
      )
    })

    const tags = computed(() => {
      // TODO: add check if tagging is enabled
      if (!props.tagging || !src.data || !phrase.value) return []

      const tag = unref(item).ofPhrase(phrase.value)

      if (unref(filtered).some((e) => e.matches(tag))) return []

      return [tag]
    })

    const value = computed(() => unref(tags).concat(unref(filtered)))

    function select(items: Item[] = [service.pointer.item].filter(Boolean)) {
      if (!items.length) return

      model.isMultiple
        ? props.mode == 'append'
          ? model.append(items)
          : model.toggle(items)
        : model.append(items)
    }

    return reactive({
      value,
      flags,
      select,
    })
  }
)

function normalizeFilter(filter?: FilterProp) {
  if (typeof filter == 'function') return filter

  if (typeof filter == 'string') filter = filter.split(/[^\w.*]+/g)

  if (Array.isArray(filter))
    return filterByProps.bind(
      null,
      filter.filter(Boolean).map((path) => `raw.${path}`)
    )

  return filterByProps.bind(null, ['label'])
}

function filterByProps(props: string[], item: Item, phrase: string) {
  phrase = phrase.toLowerCase()

  return props
    .map(toPath)
    .map((path: string[]) => {
      const prefix = path.slice(0, -1)
      const sufix = path.at(-1) || ''

      if (['*', '**'].includes(sufix))
        return craw(get(prefix, item), sufix == '**').map((e) =>
          prefix.concat(e)
        )

      const target = get(path, item)

      if (typeof target == 'object')
        return craw(target).map((e) => path.concat(e))

      return [path]
    })
    .flat()
    .some((path) => get(path, item)?.toString().toLowerCase().includes(phrase))
}

function defaultFilter(...args: WithoutFirstParameter<typeof filterByProps>) {
  return filterByProps(['label'], ...args)
}
