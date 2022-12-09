import { ref, watch } from 'vue'

let hooks = import.meta.glob('./hooks/*.ts', { eager: true })
hooks = Object.fromEntries(
  Object.entries(hooks).map(([name, val]) => [name.split(/[\/.]/g).at(-2), val])
)
console.log(hooks)
export default defineComponent({
  props: {
    ...Object.assign({}, ...Object.values(hooks).map((e) => e.props)),
  },
  setup(props, ctx) {
    const expo = {
      phrase: ref('1'),
    }
    ;['item', 'src', 'items', 'model'].reduce((expo, name) => {
      expo[name] = hooks[name]?.default(props, ctx, expo)
      return expo
    }, expo)

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
