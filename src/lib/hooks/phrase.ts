import { computed, PropType } from 'vue'
import { UpdateHandler } from '@/types'
import { defineHook } from '@/utils'
import { useVModel } from '@/capi'

export default defineHook(
  {
    /**
     * Phrase to be bound on input and used as query for the options
     */
    phrase: {
      default: '',
    },
    'onUpdate:phrase': {} as PropType<UpdateHandler>,
  },
  (props, ctx, { service }) => {
    const { proxy, set, busy } = useVModel(props, 'phrase', {
      defaultValue: '',
    })

    return computed({
      get() {
        return proxy.value
      },
      set(v) {
        return set.call(service, v, { service })
      },
    })
  }
)
