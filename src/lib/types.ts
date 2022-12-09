import { Ref } from 'vue'

export interface Config {}

export interface Select {}

export type MaybeRef<T> = T | Ref<T>

export type WithoutFirst<T extends unknown[]> = T extends [any, ...infer L]
  ? L
  : never

export type WithoutFirstParameter<F extends Fn> = WithoutFirst<Parameters<F>>

export type Fn<R = unknown> = (...args: any[]) => R
