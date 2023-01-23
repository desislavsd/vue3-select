import { debounce, defineHook } from '@/utils'
import { computed, ref, unref, watch, watchEffect } from 'vue'

const props = {
  debounce: {
    type: [Boolean, Number],
    default: undefined,
  },
  debounceDefault: {
    default: 500,
  },
}

export default defineHook(
  props,
  /**
   * Creates proxy for the phrase with realtime sync down
   * but debounced sync up to the original phrase, since
   * binding phrase directly to input in combination with
   * debounced updates results in wrong phrase update
   * when component RErenders because of something else (i.e async search results)
   */
  function (props, ctx, { phrase, src }) {
    // local phrase value
    const value = ref('')

    const debouncedSyncUp = computed(() => {
      if (!src.async && !props.debounce) return syncUp

      const t =
        typeof props.debounce == 'number'
          ? props.debounce
          : props.debounceDefault

      return debounce(t, syncUp)
    })

    // update local value whenever global phrase changes
    watchEffect(syncDown)

    // add potentially debounced watcher to update
    // global phrase with the local one
    watch(value, () => unref(debouncedSyncUp)())

    function syncDown() {
      value.value = phrase.value
    }

    function syncUp() {
      phrase.value = value.value.trim()
    }

    return value
  }
)
