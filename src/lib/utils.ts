import { Config, Fn, SelectService } from '@/types'
import {
  PropType,
  SetupContext,
  ExtractPropTypes,
  ComponentPropsOptions,
  isReactive,
  toRefs,
  ShallowRef,
  ShallowReactive,
} from 'vue'

export function get(
  path: Parameters<typeof toPath>[0],
  target: Record<any, any>
): any {
  path = toPath(path)
  return path.reduce((target, prop) => target?.[prop], target)
}

export function set(
  path: Parameters<typeof toPath>[0],
  target: Record<any, any>,
  value?: any
): any {
  path = toPath(path)
  if (path.length > 1)
    return set(path.slice(1), (target[path[0]] ??= {}), value)
  if (path.length == 1) return (target[path[0]] = value)
}

export function getSet(
  ...args: Parameters<typeof set> | Parameters<typeof get>
) {
  return args.length > 2
    ? set(...(args as Parameters<typeof set>))
    : get(...(args as Parameters<typeof get>))
}

export function toPath(path: string | string[]) {
  return typeof path == 'string' ? path.split('.').filter(Boolean) : path || []
}

export async function fetch_<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) throw res

  return await res.json()
}

export function isset(x: any) {
  return ![undefined, '', null, NaN].includes(x)
}

export function isPrimitive(x: any) {
  return x !== Object(x)
}

const AsyncFunction = (async () => {}).constructor

export function isAsync(fn: (...args: any[]) => any) {
  return fn instanceof AsyncFunction
}

export function debounce<F extends (...args: any) => any>(
  t: number,
  f: F,
  defaults?: unknown
) {
  var timeout: NodeJS.Timeout

  function handler(this: unknown, ...args: any) {
    clearTimeout(timeout)

    timeout = setTimeout(() => f.apply(this, args), t)

    return defaults
  }

  return t ? (handler as F) : f
}

export function me() {
  return arguments[0]
}

export function noop() {}

export function defaultsToProps<T extends object>(defaults: T) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, val]) => [
      key,
      { default: isPrimitive(val) ? val : () => val },
    ])
  ) as unknown as {
    [key in keyof T]: PropType<T[key]>
  }
}

export function extractDefaults<T extends object>(
  props: T,
  unwrap: boolean = false
): ExtractPropTypes<T> {
  return Object.fromEntries(
    Object.entries(props)
      .map(([name, prop]) => {
        if (!prop) debugger
        return 'default' in prop
          ? [
              name,
              unwrap && typeof prop.default == 'function'
                ? prop.default()
                : prop.default,
            ]
          : false
      })
      .filter(Boolean) as [[]]
  )
}

export function defineHook<
  T extends ComponentPropsOptions,
  P extends ExtractPropTypes<T>,
  U extends (
    props: P,
    context: Partial<SetupContext>,
    service: ShallowReactive<SelectService>
  ) => unknown
>(props: T, hook: U): { props: T; hook: U; defaults: P } {
  return {
    props,
    hook,
    defaults: extractDefaults(props) as P,
  }
}

export function toRefsSafe(target: object) {
  return isReactive(target) ? toRefs(target) : target
}

export function mapObj<
  TObj extends object,
  TKeys extends keyof TObj,
  TMap extends (name: TKeys, value: TObj[TKeys]) => any
>(obj: TObj, fn: TMap): Record<TKeys, ReturnType<TMap>> {
  const entries = Object.entries(obj) as [TKeys, TObj[TKeys]][]

  return Object.fromEntries(
    entries.map(([name, value]) => [name, fn(name, value)] as const)
  ) as any
}

/**
 * Get array of paths to all non object values of an object;
 */
export function craw(object: object, recursive: boolean = false): string[][] {
  return Object.entries(object)
    .map(([path, val]) =>
      typeof val != 'object'
        ? [[path]]
        : recursive
        ? craw(val, recursive).map((e) => [path, ...e])
        : []
    )
    .flat()
}

/**
 * Finds the first array in an object/array
 */
export function findArray(thing) {
  if (!thing || typeof thing != 'object') return []

  if (Array.isArray(thing)) return thing

  return Object.values(thing).find(Array.isArray) || []
}

export function sleep(t = 0) {
  return new Promise((rs) => setTimeout(rs, t))
}

export function ns(s: string | TemplateStringsArray) {
  return `v3s-${s}`
}
