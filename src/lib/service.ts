import { SetupContext, toRefs, reactive, isReactive, PropType } from 'vue'
import { SelectService } from '@/types'

import phrase from '@/hooks/phrase'
import item from '@/hooks/item'
import src from '@/hooks/src'
import items from '@/hooks/items'
import model from '@/hooks/model'
import ui from '@/hooks/ui'

const map = { phrase, item, src, items, model, ui } as const

export const config = {
  ...phrase.defaults,
  ...item.defaults,
  ...src.defaults,
  ...items.defaults,
  ...model.defaults,
  ...ui.defaults,
}

export const props = {
  ...phrase.props,
  ...item.props,
  ...src.props,
  ...items.props,
  ...model.props,
  ...ui.props,
  // special prop to detect usage of useService
  // with direct component setup() args
  __: {} as PropType<never>,
}

declare module '@/types' {
  export type Config = typeof config
  export interface SelectService {
    phrase: ReturnType<typeof phrase['hook']>
    item: ReturnType<typeof item['hook']>
    src: ReturnType<typeof src['hook']>
    items: ReturnType<typeof items['hook']>
    model: ReturnType<typeof model['hook']>
    ui: ReturnType<typeof ui['hook']>
  }
}

export function useService(
  options: Partial<typeof config>,
  context: Partial<SetupContext> = {}
) {
  // when options ae
  if (options.hasOwnProperty('__'))
    return buildService(options as typeof config, context)

  // unwrap nonprimitive default values in config
  const cfg = Object.fromEntries(
    Object.entries(config).map(([name, value]) => [
      name,
      typeof value == 'function' ? value() : value,
    ])
  ) as typeof config

  // merge config & options
  const props = reactive(
    Object.assign({}, cfg, isReactive(options) ? toRefs(options) : options)
  ) as typeof config

  return buildService(props, context)
}

export default useService

export function buildService(
  props: typeof config,
  context: Partial<SetupContext>
) {
  return Object.entries(map).reduce(
    (m, [name, def]) => ({
      ...m,
      [name]: def.hook(props, context, m as SelectService),
    }),
    {}
  ) as unknown as SelectService
}
