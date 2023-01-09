import type { Config, SelectService, UpdateHandler } from '@/types'
import { ref, provide, inject, InjectionKey } from 'vue'
import { defineHook, isset } from '../utils'

import item from '@/hooks/item'
import src from '@/hooks/src'
import items from '@/hooks/items'
import model from '@/hooks/model'
import ui from '@/hooks/ui'
import { useVModel } from '@/capi'
import { MaybeRef } from '@vueuse/core'

const phrase = defineHook(
  {
    phrase: '' as MaybeRef<string>,
    'onUpdate:phrase': undefined as undefined | UpdateHandler,
  } as const,
  (props) => useVModel(props, 'phrase', { defaultValue: '' }).proxy
)

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

export default Object.assign(
  defineHook(config as Config, function (props, ctx) {
    return Object.entries(map).reduce(
      (m, [name, def]) => ({
        ...m,
        [name]: def.hook(props, ctx, m as SelectService),
      }),
      {}
    ) as unknown as SelectService
  }),
  { props }
)
