import { computed, toRefs, watch, unref, reactive, PropType, toRef } from 'vue'
import { fetch_, defineHook } from '../utils'
import { useAsyncData } from '../capi'
import { Fn, SelectService } from '@/types'

const definition = defineHook(
  {
    /**
     * The source for the dropdown in the options list.
     */
    src: {} as PropType<string | unknown[] | Fn>,
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
      type: [Function],
      default: () => useSrc,
    },
  },
  function (props, context, { phrase, service }) {
    const opts = reactive({
      enabled: true,
    })
    const params = reactive({
      phrase: computed(() => unref(phrase).trim()),
    })

    return props.useSrc.call(service, opts, params)
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

  const key = computed(() => (unref(dynamic) ? [params] : []))

  const fetcher = computed(() => {
    // make sure this computed knows it depends on fetcher & src
    const { fetcher, src } = props

    return (k: typeof key) =>
      fetcher.call(this, unref(k).at(-1) || { phrase: '' })
  })

  return reactive({
    async,
    dynamic,
    ...toRefs(useAsyncData(key, fetcher, opts)),
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
