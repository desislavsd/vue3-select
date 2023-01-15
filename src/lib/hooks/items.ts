import { computed, unref } from 'vue'
import { get, toPath, defineHook } from '@/utils'

const definition = defineHook(
  {
    parse: {
      default: () => defaultParse,
    },
  },
  (props, ctx, { src, item }) => {
    const parse = computed(() => normalizeParse(props.parse))

    const parsed = computed(() =>
      (unref(parse)(src.data) as unknown[]).map((e) => unref(item).ofRaw(e))
    )

    return parsed
  }
)

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
