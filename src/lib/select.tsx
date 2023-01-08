import {
  Ref,
  ref,
  watch,
  defineComponent,
  unref,
  inject,
  InjectionKey,
  provide,
} from 'vue'
declare module '@/types' {
  export interface Config {}
  export interface Select {
    phrase: Ref<string>
  }
}
import itemDef from '@/hooks/item'
import srcDef from '@/hooks/src'
import itemsDef from '@/hooks/items'
import modelDef from '@/hooks/model'
import uiDef from '@/hooks/ui'
import type { Config, Select } from '@/types'
import SelectComponent from './Select.vue'
const defs = {
  item: itemDef,
  src: srcDef,
  items: itemsDef,
  model: modelDef,
  ui: uiDef,
}

export default defineComponent({
  props: {
    ...itemDef.props,
    ...srcDef.props,
    ...itemsDef.props,
    ...modelDef.props,
    ...uiDef.props,
  },
  setup(props, ctx) {
    const expo: Select = {
      phrase: ref(''),
    } as Select

    Object.entries(defs).reduce(
      (expo, [name, def]) =>
        Object.assign(expo, {
          [name]: def?.hook(props as unknown as Config, ctx, expo),
        }),
      expo
    )

    ctx.expose(expo)

    // watch(expo.phrase, (phrase) => expo.src.refresh(unref(phrase)))

    function select(items = expo.items.tagged) {
      expo.model.value = expo.model.isMultiple
        ? expo.model.value.concat(items)
        : items
    }

    return () => {
      return (
        <div class="max-w-md">
          <SelectComponent expo={expo} class="mb-30" placeholder="Search..." />
          {/* <div>Index: {expo.ui.pointer.index}</div>
          <button onClick={() => expo.src.refresh()}>click</button>
          <pre>Model: {JSON.stringify(expo.model?.value, null, 4)}</pre>
          <pre>Src: {JSON.stringify(expo.src, null, 4)}</pre>
          <pre>Filtered: {JSON.stringify(expo.items.tagged, null, 4)}</pre> */}
        </div>
      )
    }
  },
})
/* 
interface Service {
  foo: number
}

const serviceKey = Symbol() as InjectionKey<Service>

function useService(props: { service?: Service }) {
  let service = props.service || inject(serviceKey)

  if (service) return service

  service = {} as Service

  provide(serviceKey, service)

  Object.entries({ foo: useFoo }).reduce(
    (m, [name, hook]) => ({
      ...m,
      [name]: hook(props),
    }),
    {}
  ) as Service

  return service
}

function useFoo(props: any) {
  const service = useService(props)
  console.log('in', { service })
  return Math.random()
}
 */
