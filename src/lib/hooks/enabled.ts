import { ref, reactive, watchEffect, unref } from 'vue'
import { defineHook } from '@/utils'

export default defineHook({}, (props, ctx, { service }) => {
  const enabled = ref(false)

  watchEffect(() => {
    if (!service.ready) return (enabled.value = false)

    const { src, ui, model, phrase } = service

    const { valid, typing } = phrase

    if (typing) return (enabled.value = false)

    // if model value needs to be resolved & there is no resolver
    // try to load options to resolve from them
    if (model.poor && !service.props.resolve) return (enabled.value = valid)

    if (ui.flags.active) return (enabled.value = valid)

    return false
  })

  return reactive({
    value: enabled,
  })
})
