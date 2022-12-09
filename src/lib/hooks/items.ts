import { computed, unref, reactive } from 'vue'
import { get, toPath, me, isset } from '../utils'

export default function useItems(props, ctx, { src, phrase, item }) {
  const parse = computed(() => normalizeParse(props.parse))

  const parsed = computed(() =>
    unref(parse)(src.data).map((e) => unref(item).ofRaw(e))
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

    return unref(parsed).filter((item) => unref(filter)(item, unref(phrase)))
  })

  const tagged = computed(() => {
    // TODO: add check if tagging is enabled
    if (!props.tagging || !src.fetched || !unref(phrase)) return unref(filtered)

    return unref(filtered).concat(unref(item).ofPhrase(unref(phrase)))
  })

  return reactive({
    parsed,
    filtered,
    tagged,
  })
}

export const props = {
  parse: {},
  filter: {
    type: [Boolean, String, Array, Function],
  },
  filterBy: {
    type: [String, Array, Function],
  },
  tagging: {
    type: Boolean,
  },
}

function normalizeParse(parse: any) {
  if (typeof parse == 'function') return parse

  if (typeof parse == 'string') return get.bind(null, toPath(parse))

  return defaultParse
}

// finds array of items in api response
function defaultParse(res: any): any[] {
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
