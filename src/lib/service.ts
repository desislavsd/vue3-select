import { SetupContext, reactive, PropType, ExtractPropTypes } from 'vue'
import { SelectService, Config } from '@/types'
import { extractDefaults, isPrimitive, toRefsSafe } from '@/utils'

// hooks
import phrase from '@/hooks/phrase'
import item from '@/hooks/item'
import src from '@/hooks/src'
import debouncePhrase from '@/hooks/debouncePhrase'
import model from '@/hooks/model'
import items from '@/hooks/items'
import pointer from '@/hooks/pointer'

import ui from '@/hooks/ui'

const map = {
  phrase,
  item,
  src,
  debouncePhrase,
  model,
  items,
  pointer,
  ui,
} as const

export const props = {
  ...phrase.props,
  ...item.props,
  ...src.props,
  ...debouncePhrase.props,
  ...model.props,
  ...items.props,
  ...pointer.props,
  ...ui.props,
}

// original defaults; they may not reflect current defaults if defineConfig is used
export const defaults = extractDefaults(props)

export default useService

export function useService(
  options: Partial<Config> | Config,
  context: Partial<SetupContext> = {}
) {
  // if(/* typeof options extends Config  */) return buildService(localProps, context)

  // extract actual config from props
  const config = extractDefaults(props, true) as Config

  // merge config & options
  const localProps = reactive({
    ...config,
    ...toRefsSafe(options),
  }) as Config

  return buildService(localProps, context)
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
  const service = {
    props,
    context,
    defaults,
  } as SelectService

  service.service = service

  return Object.entries(map).reduce(
    (m, [name, def]) =>
      Object.assign(m, {
        [name]: def.hook(props, context, m as SelectService),
      }),
    service
  )
}

declare module '@/types' {
  export type Config = typeof defaults
  // export type Config = ExtractPropTypes<typeof props>
  export interface SelectService {
    props: Config
    context: Partial<SetupContext>
    defaults: Config

    phrase: ReturnType<typeof phrase['hook']>
    item: ReturnType<typeof item['hook']>
    src: ReturnType<typeof src['hook']>
    debouncePhrase: ReturnType<typeof debouncePhrase['hook']>
    model: ReturnType<typeof model['hook']>
    items: ReturnType<typeof items['hook']>
    pointer: ReturnType<typeof pointer['hook']>
    ui: ReturnType<typeof ui['hook']>
    service: SelectService
  }
}
