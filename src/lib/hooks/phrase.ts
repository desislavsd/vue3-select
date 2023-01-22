import { computed, PropType, reactive } from 'vue'
import { Fn, UpdateHandler } from '@/types'
import { defineHook } from '@/utils'
import { useVModel } from '@/capi'

const validators = {
  min(phrase: string, min = 0) {
    return phrase.length >= +min
  },
}

export default defineHook(
  {
    /**
     * Phrase to be bound on input and used as query for the options
     */
    phrase: {
      default: '',
    },
    'onUpdate:phrase': {} as PropType<UpdateHandler<string>>,
    /**
     * Validation for the phrase; Options will be fetched
     * only if the phrase passes the test; Pass boolean to
     * force state; Function to handle it manually or
     * string in the format: '[validator]:[args]|...'
     * where validator is one of props.validators
     * i.e: 'min:3' to require minimum of 3 symbols
     */
    valid: {
      type: [Boolean, String, Function] as PropType<
        boolean | string | Fn<boolean>
      >,
      default: undefined,
    },
    validators: {
      default: () => validators,
    },
  },
  (props, ctx, { service }) => {
    const { proxy, set, busy } = useVModel(props, 'phrase', {
      defaultValue: '',
    })

    const value = computed({
      get() {
        return proxy.value
      },
      set(v) {
        return set.call(service, v, { service })
      },
    })

    const valid = computed(() => {
      if (typeof props.valid == 'boolean') return props.valid

      if (typeof props.valid == 'function')
        return props.valid.call(service, value.value)

      return ((props.valid as string)?.split('|', 1) || [])
        .map((v) => v.split(':'))
        .every(([v, ...args]) =>
          (props.validators[v as keyof typeof props.validators] as any)?.call(
            service,
            value.value,
            ...args
          )
        )
    })

    return reactive({
      value,
      valid,
    })
  }
)
