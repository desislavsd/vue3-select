import type { Config, Select } from '@/types'
import { provide, inject, InjectionKey } from 'vue'
import { defineHook, isset } from '../utils'

import item from '@/hooks/item'
import src from '@/hooks/src'
import items from '@/hooks/items'
import model from '@/hooks/model'
import ui from '@/hooks/ui'

declare module '@/types' {
  export interface Select {
    model: ReturnType<typeof model['hook']>
    item: ReturnType<typeof item['hook']>
    src: ReturnType<typeof src['hook']>
    ui: ReturnType<typeof ui['hook']>
    items: ReturnType<typeof items['hook']>
  }
}

const definition = defineHook({}, function (props, ctx) {
  return Object.entries({ item, src, items, model, ui }).reduce(
    (m, [name, def]) => ({
      ...m,
      [name]: def.hook(props, ctx, m as Select),
    }),
    {}
  ) as unknown as Select
})

// useSelect({
// no service instance makes sense to be provided here...
// })
