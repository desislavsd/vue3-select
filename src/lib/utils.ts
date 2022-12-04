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

export function isset(x: any) {
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
