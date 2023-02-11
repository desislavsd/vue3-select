import { computed, PropType, reactive, Ref, ref, unref } from 'vue'
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
    debounce: {
      type: [Boolean, Number],
      default: undefined,
    },
    debounceDefault: {
      default: 500,
    },
  },
  (props, ctx, { service }) => {
    const { proxy, set, busy } = useVModel(props, 'phrase')

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

    const debounce = computed(() =>
      !service?.src.async && !props.debounce
        ? 0
        : typeof props.debounce == 'number'
        ? props.debounce
        : props.debounceDefault
    )

    const { type, typing } = useTypePhrase(value, reactive({ debounce }))

    return reactive({
      value,
      valid,
      typing,
      type,
    })
  }
)

function useTypePhrase(phrase: Ref<string>, opts: { debounce: number }) {
  let timeout: NodeJS.Timeout

  const _typing = ref(false)

  const typing = computed(() => unref(_typing))

  function stop() {
    _typing.value &&= false
  }

  function start() {
    _typing.value = true
    timeout = setTimeout(stop, opts.debounce)
  }

  function type(value: string) {
    clearTimeout(timeout)

    opts.debounce ? start() : stop()

    phrase.value = value
  }

  return { typing, type }
}
