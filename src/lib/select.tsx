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
    ;['item', 'src', 'items'].reduce((expo, name) => {
      expo[name] = hooks[name]?.default(props, ctx, expo)
      return expo
    }, expo)

    ctx.expose(expo)

    // watch(expo.phrase, (phrase) => expo.src.refresh(unref(phrase)))

    console.log(expo)

    return () => {
      return (
        <div>
          <input
            v-model={expo.phrase.value}
            onFocus={() =>
              expo.src.stale &&
              !expo.src.busy &&
              expo.src.refresh(unref(expo.phrase))
            }
          />
          <pre>{JSON.stringify(expo.src, null, 4)}</pre>
          <pre>{JSON.stringify(expo.items.filtered, null, 4)}</pre>
          <button onClick={() => expo.src.refresh()}>click</button>
        </div>
      )
    }
  },
})
