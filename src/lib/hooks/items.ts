import { WithoutFirstParameter, Fn, MaybeArray, Not } from '@/types'
import { computed, unref, reactive, ref, watch, PropType } from 'vue'
import { get, toPath, defineHook, isset } from '../utils'

type FilterProp = boolean | string | string[] | typeof defaultFilter

const definition = defineHook(
  {
    parse: {
      default: () => defaultParse,
    },
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
  },
  (props, ctx, { src, phrase, item }) => {
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
    })

    const parse = computed(() => normalizeParse(props.parse))

    const parsed = computed(() =>
      (unref(parse)(src.data) as unknown[]).map((e) => unref(item).ofRaw(e))
    )

    const filter = computed(() => {
      if (!props.filter)
        if (src.dynamic)
          // auto decide if filter should be applied
          // dynamic items are filtered serverside
          return false

      return normalizeFilter(props.filter)
    })

    const filtered = computed(() => {
      if (!unref(phrase) || !unref(filter)) return unref(parsed)

      return unref(parsed).filter((item) =>
        (unref(filter) as Fn<boolean>)(item, unref(phrase))
      )
    })

    const tags = computed(() => {
      // TODO: add check if tagging is enabled
      if (!props.tagging || !src.data || !unref(phrase)) return []

      const tag = unref(item).ofPhrase(unref(phrase))

      if (unref(filtered).some((e) => e.matches(tag))) return []

      return [tag]
    })

    const value = computed(() => unref(tags).concat(unref(filtered)))

    return reactive({
      flags,
      parsed,
      filtered,
      tags,
      value,
    })
  }
)

// @ts-ignore
definition.props.tagging.type = [Boolean, String, Array]

export default definition

function normalizeParse(parse: unknown) {
  if (typeof parse == 'function') return parse

  if (typeof parse == 'string') return get.bind(null, toPath(parse))

  return defaultParse
}

// finds array of items in api response
function defaultParse(res: any): unknown[] {
  return (
    [res]
      .concat(Object.values(res || []))
      .find((item) => Array.isArray(item)) || []
  )
}

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

function filterByProps(props: string[], item: any, phrase: string) {
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

function craw(item: object, recursive: boolean = false): string[][] {
  return Object.entries(item)
    .map(([path, val]) =>
      typeof val != 'object'
        ? [[path]]
        : recursive
        ? craw(val, recursive).map((e) => [path, ...e])
        : []
    )
    .flat()
}
