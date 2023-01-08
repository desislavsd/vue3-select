import { WithoutFirstParameter, Fn, MaybeRef, Select } from '@/types'
import { computed, unref, reactive, ref, watch } from 'vue'
import { get, toPath, defineHook, isset } from '../utils'

declare module '@/types' {
  export interface Config {
    parse?: string | typeof defaultParse
    filter?: boolean | string | string[] | typeof defaultFilter
    filterBy?: string | string[] | typeof defaultFilter
    tagging?: boolean
  }
  export interface Select {
    items: ReturnType<typeof definition['hook']>
  }
}

const definition = defineHook(
  {
    parse: defaultParse,
    filter: undefined,
    filterBy: undefined,
    tagging: undefined,
  },
  (props, ctx, { src, phrase, item }) => {
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

      return normalizeFilter(props)
    })

    const filtered = computed(() => {
      if (!unref(phrase) || !unref(filter)) return unref(parsed)

      return unref(parsed).filter((item) =>
        (unref(filter) as Fn<boolean>)(item, unref(phrase))
      )
    })

    const tags = computed(() => {
      // TODO: add check if tagging is enabled
      if (!props.tagging || !src.fetched || !unref(phrase)) return []

      return [unref(item).ofPhrase(unref(phrase))]
    })

    const done = computed(() => unref(filtered).concat(unref(tags)))

    return reactive({
      parsed,
      filtered,
      tags,
      done,
    })
  }
)

// @ts-ignore
definition.props.tagging.type = Boolean

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

function normalizeFilter(filter: string | string[]) {
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
    .map((path: string[]) =>
      path.at(-1) == '*'
        ? Object.keys(get(path.slice(0, -1), item)).map((key) =>
            path.concat(key)
          )
        : path
    )
    .flat()
    .some((prop) => get(prop, item)?.toString().toLowerCase().includes(phrase))
}

function defaultFilter(...args: WithoutFirstParameter<typeof filterByProps>) {
  return filterByProps(['label'], ...args)
}
