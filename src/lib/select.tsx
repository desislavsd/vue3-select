import { Ref, ref, watch, defineComponent } from 'vue'
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
import type { Config, Select } from '@/types'

const defs = {
  item: itemDef,
  src: srcDef,
  items: itemsDef,
  model: modelDef,
}

console.log(defs)

export default defineComponent({
  props: {
    ...itemDef.props,
    ...srcDef.props,
    ...itemsDef.props,
    ...modelDef.props,
  },
  setup(props, ctx) {
    // @ts-ignore
    const expo: Select = {
      phrase: ref('1'),
    }
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
        <div style="display: flex; gap: 10px">
          <div style="flex:1">
            <input
              v-model={expo.phrase.value}
              onFocus={() =>
                expo.src.stale &&
                !expo.src.busy &&
                expo.src.refresh(unref(expo.phrase))
              }
              onKeydown={(ev) => ev.key == 'Enter' && select()}
            />
            <pre>{JSON.stringify(props.modelValue, null, 4)}</pre>
          </div>
          <div style="flex:1">
            <button onClick={() => expo.src.refresh()}>click</button>
            <pre>Model: {JSON.stringify(expo.model?.value, null, 4)}</pre>
            <pre>Src: {JSON.stringify(expo.src, null, 4)}</pre>
            <pre>Filtered: {JSON.stringify(expo.items.tagged, null, 4)}</pre>
          </div>
        </div>
      )
    }
  },
})
