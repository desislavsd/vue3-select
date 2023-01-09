import { Ref } from 'vue'

export interface SelectService {}

export type MaybeRef<T> = T | Ref<T>

export type MaybeArray<T> = T | T[]

export type WithoutFirst<T extends unknown[]> = T extends [any, ...infer L]
  ? L
  : never

export type WithoutFirstParameter<F extends Fn> = WithoutFirst<Parameters<F>>

export type Fn<R = unknown> = (...args: any[]) => R

export type Item = SelectService['items']['parsed'][number]

export type UpdateHandler = (
  value: unknown,
  context: { service: SelectService }
) => void
