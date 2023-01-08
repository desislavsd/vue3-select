import Select from './select.vue'

declare module 'vue' {
  export interface GlobalComponents {
    VueSelect: typeof Select
  }
}

export default {
  install(app) {
    app.component('VueSelect', Select)
  },
}
