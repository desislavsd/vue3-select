import {
  SetupContext,
  reactive,
  shallowReactive,
  ShallowReactive,
  InjectionKey,
  inject,
  provide,
} from 'vue'
import { SelectService, Config, UnionToIntersection, Fn } from '@/types'
import { extractDefaults, isPrimitive, toRefsSafe } from '@/utils'

// hooks
import phrase from '@/hooks/phrase'
import item from '@/hooks/item'
import src from '@/hooks/src'
import model from '@/hooks/model'
import items from '@/hooks/items'
import ui from '@/hooks/ui'

const symbol: InjectionKey<SelectService> = Symbol('selectService')

const map = {
  phrase,
  item,
  src,
  model,
  items,
  ui,
} as const

export const props = Object.assign(
  {},
  ...Object.values(map).map((e) => e.props)
) as UnionToIntersection<typeof map[keyof typeof map]['props']>

// original defaults; they may not reflect current defaults if defineConfig is used
export const defaults = extractDefaults(props)

declare module '@/types' {
  export type Config = typeof defaults
  export interface SelectService {
    ready: boolean
    props: Config
    context: Partial<SetupContext>
    defaults: Config

    phrase: ReturnType<typeof phrase['hook']>
    item: ReturnType<typeof item['hook']>
    src: ReturnType<typeof src['hook']>
    model: ReturnType<typeof model['hook']>
    items: ReturnType<typeof items['hook']>
    ui: ReturnType<typeof ui['hook']>
    service: ShallowReactive<SelectService>
  }
}

export default useService

export function useService(
  options: (Partial<Config> | Config) & { service?: SelectService } = {},
  context: Partial<SetupContext> = {},
  forceNew: boolean = false
) {
  let service = forceNew ? null : options.service || inject(symbol, null)

  if (!service) {
    // if(/* typeof options extends Config  */) return buildService(localProps, context)

    // extract actual config from props
    const config = extractDefaults(props, true) as Config

    // merge config & options
    const localProps = reactive({
      ...config,
      ...toRefsSafe(options),
    }) as Config

    service = buildService(localProps, context)
  }

  provide(symbol, service)

  return service
}

export function defineConfig<T extends Partial<Config>>(config: T): T {
  Object.entries(config).forEach(
    ([name, value]) =>
      // @ts-ignore
      (props[name].default = isPrimitive(value) ? value : () => value)
  )

  return config
}

function buildService(props: Config, context: Partial<SetupContext>) {
  const service = shallowReactive({
    ready: false,
    props,
    context,
    defaults,
  }) as SelectService

  service.service = service

  Object.entries(map).reduce(
    (m, [name, def]) =>
      Object.assign(m, {
        [name]: def.hook(props, context, m as SelectService),
      }),
    service
  )

  service.ready = true

  return service
}
