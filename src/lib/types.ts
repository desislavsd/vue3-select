import { Ref } from 'vue'

export interface SelectService {}

export type MaybeRef<T> = T | Ref<T>

export type MaybeArray<T> = T | T[]

export type WithoutFirst<T extends unknown[]> = T extends [any, ...infer L]
  ? L
  : never

export type WithoutFirstParameter<F extends Fn> = WithoutFirst<Parameters<F>>

export type Fn<R = unknown> = (...args: any[]) => R

export interface ItemState {
  selected: boolean
  disabled: boolean
  pointed: boolean
  position: number
}

export interface ItemStateful extends Item, ItemState {}

export interface ItemGroup extends Item {
  value: Item[]
}

export interface ItemGroupStateful extends ItemGroup, ItemState {}

export type UpdateHandler<TValue = unknown, TContext extends object = {}> = (
  this: SelectService,
  value: TValue,
  context: { service: SelectService } & TContext
) => void

export type Not<T, N> = T extends N ? never : T

export type UnionToIntersection<U> = Pretty<
  (U extends U ? (arg: U) => void : never) extends (arg: infer R) => void
    ? R
    : never
>

export type Pretty<T> = {
  [K in keyof T]: T[K]
} & {}

export type PartialRecursive<T extends object> = {
  [K in keyof T]?: T[K] extends object ? PartialRecursive<T[K]> : T[K]
}

export type Require<T extends object, TRKeys extends keyof T> = Pretty<
  Required<Pick<T, TRKeys>> & Omit<T, TRKeys>
>
