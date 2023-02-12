import {
  computed,
  watch,
  unref,
  reactive,
  PropType,
  shallowRef,
  toRef,
} from 'vue'
import { fetch_, defineHook, get, toPath, findArray } from '@/utils'
import { useAsyncData } from '@/capi'
import { Fn, SelectService, Item, MaybeArray } from '@/types'

type TParams = { phrase: string; page?: number }
type TOpts = { enabled: boolean }
const defaultParse = findArray
const definition = defineHook(
  {
    /**
     * The source for the dropdown in the options list.
     */
    src: {} as PropType<string | unknown[] | Fn>,
    parse: {
      default: () => defaultParse,
    },
    fetch: {
      default: () => fetch_,
    },
    fetcher: {
      default: () => fetcher,
    },
    /**
     * Hook to handle src prop; The default one can handle arrays, functions and strings;
     * One may need to override it in case of integrations with SWR like libs.
     *
     * Notice: This prop is currently non reactive;
     */
    useSrc: {
      type: [Function] as PropType<
        (
          this: SelectService,
          opts: TOpts,
          params: TParams
        ) => ReturnType<typeof useAsyncData> & {
          async: boolean
          dynamic: boolean
        }
      >,
      default: () => useSrc,
    },
  },
  function (props, context, { phrase, service, item }) {
    const added = shallowRef<Item[]>([])

    watch(
      () => props.src,
      () => (added.value = []),
      { immediate: true, flush: 'pre' }
    )

    const enabled = useEnabled(service)

    const opts = reactive({
      enabled,
    })

    const params = reactive({
      phrase: computed(() => phrase.value),
    })

    const res = props.useSrc.call(service, opts, params)

    const parse = computed(() => normalizeParse(props.parse))

    const parsed = computed(() => {
      const parsed = (unref(parse)(unref(res.data) || []) as unknown[]).map(
        (e) => unref(item).ofRaw(e)
      )
      return unref(added).concat(parsed)
    })

    /**
     * Adds options to the list dynamically;
     * Skips already existing ones
     */
    function pushTags(v: MaybeArray<unknown>): void {
      if (!v) return

      if (Array.isArray(v)) return v.forEach(pushTags)

      if (!(v instanceof unref(item))) return pushTags(unref(item).ofRaw(v))

      if (unref(parsed).some((e) => e.equals(v))) return

      added.value = [
        ...unref(added),
        new item.value({ ...v, added: true }) as Item,
      ]
    }

    return reactive({
      ...res,
      data: parsed,
      enabled,
      pushTags,
    })
  }
)

export default definition

function useSrc(
  this: SelectService,
  opts: { enabled: boolean },
  params: { phrase: string }
) {
  const { props } = this

  const async = computed(() => isSrcAsync(props.src))

  const dynamic = computed(() => isSrcDynamic(props.src))

  const fetcher = computed(() => {
    // make sure this computed knows it depends on fetcher & src
    const { fetcher, src } = props

    return (k: any) => fetcher.call(this, unref(k).at(-1) || { phrase: '' })
  })

  const srcKey = computed(() => {
    return unref(fetcher), Math.random().toString(32).slice(2)
  })

  const key = computed(() => [
    unref(srcKey),
    ...(unref(dynamic) ? [params] : []),
  ])

  return {
    async,
    dynamic,
    ...useAsyncData(key, fetcher, opts),
  }
}

/**
 * flag whether options should be fetched
 */
function useEnabled(service: SelectService) {
  return computed(() => {
    if (!unref(service.ready)) return false

    const { ui, model, phrase } = service

    const { valid, typing } = phrase

    if (typing) return false

    // if model value needs to be resolved & there is no resolver
    // try to load options to resolve from them
    if (model.poor && !service.props.resolve) return valid

    if (ui.flags.active) return valid

    return false
  })
}

// check weather options depend on the query
// i.e. returns true for paginated results
function isSrcDynamic(src: any) {
  if (!isSrcAsync(src)) return false
  if (typeof src == 'string' && /%s|{\w+?}/.test(src)) return true
  return typeof src == 'function' && src.length > 0
}

// src is considered async if not provided
// as static array of options
function isSrcAsync(src: unknown) {
  // return src instanceof (async () => {}).constructor
  return !!src && !Array.isArray(src)
}

function fetcher(this: SelectService, params: { phrase: string }) {
  const config = this.props.src

  if (typeof config === 'function') return config(params)

  if (typeof config === 'string')
    return this.props.fetch(
      config
        .replace('%s', encodeURIComponent(params.phrase))
        .replace(/{(\w+?)}/g, (m, prop) => {
          return prop in params
            ? encodeURIComponent(params[prop as keyof typeof params].toString())
            : ''
        })
    )

  return config || []
}

function normalizeParse(parse: unknown) {
  if (typeof parse == 'function') return parse

  if (typeof parse == 'string') return get.bind(null, toPath(parse))

  return defaultParse
}

/* 
function useMySrc(
  this: SelectService,
  opts: { enabled: boolean },
  params: { phrase: string; page?: number }
) {
  const { props, defaults } = this

  const config = toRef(props, 'src')

  const canHandle = computed(() => typeof config == 'object')

  // @ts-ignore
  const org = defaults.useSrc.call(
    this,
    reactive({
      ...toRefs(opts),
      enabled: computed(() => opts.enabled && !unref(canHandle)),
    })
  )

  // @ts-ignore
  const res = useQuery([], () => {}, {
    enabled: computed(() => opts.enabled && unref(canHandle)),
  })

  return reactive({
    data: computed(() => (unref(canHandle) ? res.data : org.data)),
    // ...
  })
}

defineUseSrc(
  (src) => src instanceof RegExp,
  function (opts, params, orgRes) {
    const model = toRef(this.props, 'src') as any
    const key = computed(() => unref(model).list(params))
    return {
      // @ts-ignore
      ...useQuery(reactive(key), (key) => model.list(key.at(-1))),
      can: computed(() => {}),
    }
  }
)

function defineUseSrc(
  check: (this: SelectService, config: unknown) => boolean,
  fn: typeof useSrc
) {
  // @ts-ignore
  const org = useAsyncData(...[])
} */
