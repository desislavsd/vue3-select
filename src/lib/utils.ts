import { Config, Select } from '@/types'
import { PropType, SetupContext } from 'vue'

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

export async function fetch_<T = any>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) throw res

  return await res.json()
}

export function isset(x: unknown) {
  return ![undefined, '', null, NaN].includes(x)
}

export function isPrimitive(x: any) {
  return x !== Object(x)
}

export function debounce(t: number, f: (...args: any) => any, defaults: any) {
  var timeout: any

  function handler(...args: any) {
    clearTimeout(timeout)

    timeout = setTimeout(() => f.apply(this, args), t)

    return defaults
  }

  return t ? handler : f
}

export function me() {
  return arguments[0]
}

export function defaultsToProps<T extends Record<any, unknown>>(defaults: T) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, val]) => [
      key,
      { default: isPrimitive(val) ? val : () => val },
    ])
  ) as unknown as {
    [key in keyof T]: PropType<T[key]>
  }
}

class _defaultsToPropsHack<T extends Parameters<typeof defaultsToProps>[0]> {
  // wrapped has no explicit return type so we can infer it
  wrapped(e: T) {
    return defaultsToProps<T>(e)
  }
}

export type defaultsToPropsReturnType<
  T extends Parameters<typeof defaultsToProps>[0]
> = ReturnType<_defaultsToPropsHack<T>['wrapped']>

/* export function defineHook<
  T extends Config,
  U extends (
    defaults: T,
    context: SetupContext,
    select: Partial<Select>
  ) => unknown
>(defaults: Partial<T>, hook: U) {
  return { hook, defaults, props: defaultsToProps(defaults) }
}

export function defineHookFor<
  KS extends (keyof Config)[],
  K extends KS[number]
>(keys: KS) {
  return function defineHook<
    T extends Pick<Config, K>,
    U extends (
      defaults: Pick<Config, K>,
      context: SetupContext,
      select: Partial<Select>
    ) => unknown
  >(defaults: T, hook: U) {
    return { hook, defaults, props: defaultsToProps(defaults) }
  }
} */
export function defineHook<
  T extends Partial<Config>,
  U extends (
    // @ts-ignore
    defaults: keyof T extends never ? Config : Pick<Config, keyof T>,
    context: SetupContext,
    select: Select
  ) => unknown
>(defaults: T, hook: U) {
  return { hook, defaults, props: defaultsToProps(defaults) }
}
