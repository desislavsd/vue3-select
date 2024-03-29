import { ItemGroup, ItemGroupStateful, ItemState, MaybeRef } from '@/types'
import { computed, unref, PropType, toRef } from 'vue'
import { getSet, toPath, defineHook, noop } from '@/utils'

const ERRORS = {
  EXPECT_NONPRIMITIVE:
    'Trying to set primitive value, but non primitive is expected. Check if `as` configuration matches your model value',
}

type AsHandler = (target: object, value?: unknown) => unknown
type AsType = undefined | string | string[] | AsHandler[]

const props = {
  as: {} as PropType<AsType>,
}

export const spec = {
  rx: ':', // /[^\w.]+/g,
  order: ['label', 'value', 'index', 'group'] as const,
  defaults: [undefined, undefined, undefined, noop],
}
class Item {
  /**
   * The calculated display value
   */
  label: unknown
  /**
   * The calculated unique id for comparisons
   */
  index: unknown
  /**
   * The calculated value
   */
  value: unknown
  /**
   * The original data
   */
  raw: unknown
  /**
   * The calculated groupName
   */
  group: string | undefined
  /**
   * If its created from insufficient data
   */
  poor?: boolean
  /**
   * If its created via tagging from phrase
   */
  new?: boolean
  /**
   * If its created via tagging and is added to the options list
   */
  added?: boolean

  constructor(data?: unknown) {
    Object.assign(this, data /* , { state: {} } */)
  }

  static as: ReturnType<typeof useAs>['value'] = useAs().value

  static ofRaw(raw: unknown, opts?: Record<string, any>) {
    const { as } = this

    const data = spec.order.reduce(
      (m, e) => ({
        ...m,
        [e]: typeof as[e] == 'function' ? as[e]?.(raw as object) : raw,
      }),
      { raw }
    ) as Item

    // if raw is insufficient, some props may be undefined
    data.label ??= data.value
    data.value ??= data.label
    data.index ??= data.label

    return Object.assign(new this(data), opts) as Item
  }

  static ofValue(value: unknown) {
    const { as } = this

    if (as.primitive) return this.ofRaw(value)

    if (!as.value && typeof value != 'object')
      throw new Error(ERRORS.EXPECT_NONPRIMITIVE)

    const raw = as.value ? {} : value

    as.value?.(raw as object, value)

    return this.ofRaw(raw, { poor: as.poor })
  }

  static ofPhrase(phrase: string) {
    const { as } = this

    if (as.primitive) return this.ofRaw(phrase)

    const raw = {}

    as.label?.(raw, phrase)

    return this.ofRaw(raw, { poor: as.poor, new: true })
  }

  static mkGroup(name: string, items?: Item[]) {
    const raw = Item.ofRaw(name)
    raw.value = items || []
    return raw as ItemGroup
  }

  // TODO: support non primitive comparisons
  /**
   * Comparison by index
   */
  equals(item: any) {
    if (!(item instanceof Item))
      item = (this.constructor as typeof Item).ofValue?.(item) || item
    return this.index == item.index
  }

  /**
   * Comparison by phrase
   */
  matches(item: Item) {
    return (
      item.label?.toString()?.toLowerCase() ===
      this.label?.toString()?.toLowerCase()
    )
  }

  isGroup(): this is this extends ItemState ? ItemGroupStateful : ItemGroup {
    return Boolean(
      (this.constructor as typeof Item).as.primitive &&
        Array.isArray(this.value)
    )
  }

  clone<T extends object>(extend?: T): this & T {
    return Object.assign(
      new (this.constructor as typeof Item)(this),
      extend
    ) as any
  }
}

function useAs(asProp: MaybeRef<AsType> = []) {
  return computed(() => {
    let as = (unref(asProp) as any) || []

    if (typeof as == 'string') as = as.split(spec.rx)

    const primitive = !unref(as)?.slice?.(0, 3).filter(Boolean).length

    let models = Object.fromEntries(
      spec.order.map((key, i) => [
        key,
        typeof as[i] == 'function'
          ? as[i]
          : as[i]
          ? // @ts-ignore
            getSet.bind(null, toPath(as[i]))
          : spec.defaults[i],
      ])
    ) as Record<
      typeof spec.order[number],
      undefined | ((target: Record<any, any>, value?: any) => any)
    >

    const poor = primitive ? false : !!models.value

    return {
      ...models,
      primitive,
      poor,
    }
  })
}

const definition = defineHook(props, (props) => {
  const as = useAs(toRef(props, 'as'))
  return computed(
    () =>
      class extends Item {
        static as: typeof Item['as'] = unref(as)
      }
  )
})

export default definition

// proxy for the declaration bellow
type TItem = Item

declare module '@/types' {
  export interface Item extends TItem {}
}

if (import.meta.vitest) {
  const { it, test, expect, describe } = import.meta.vitest

  describe('Test useItem', () => {
    const shape = { name: 'Deso', id: 123 }

    const tests = {
      'ofRaw accepts primitives': {
        shape: 123,
        as: undefined,
        res: {
          poor: false,
          primitive: true,
          item: {
            label: 123,
            index: 123,
            value: 123,
            raw: 123,
          },
        },
      },
      'ofRaw name:id:id': {
        shape,
        as: 'name:id:id',
        res: {
          poor: true,
          primitive: false,
          item: {
            label: 'Deso',
            index: 123,
            value: 123,
            raw: shape,
          },
        },
      },
      'ofRaw name::id': {
        shape,
        as: 'name::id',
        res: {
          poor: false,
          primitive: false,
          item: {
            label: 'Deso',
            index: 123,
            value: shape,
            raw: shape,
          },
        },
      },
      'ofValue name:id:id': {
        method: 'ofValue',
        shape: shape.id,
        as: 'name:id:id',
        res: {
          poor: true,
          primitive: false,
          item: {
            label: shape.id,
            index: shape.id,
            value: shape.id,
            raw: { id: shape.id },
            poor: true,
          },
        },
      },
      'ofPhrase name:id:id': {
        method: 'ofPhrase',
        shape: shape.name,
        as: 'name:id:id',
        res: {
          poor: true,
          primitive: false,
          item: {
            label: shape.name,
            index: shape.name,
            value: shape.name,
            raw: { name: shape.name },
            poor: true,
            new: true,
          },
        },
      },
      'ofPhrase name::id': {
        method: 'ofPhrase',
        shape: shape.name,
        as: 'name::id',
        res: {
          poor: false,
          primitive: false,
          item: {
            label: shape.name,
            index: shape.name,
            value: { name: shape.name },
            raw: { name: shape.name },
            poor: false,
            new: true,
          },
        },
      },
    }

    Object.entries(tests).forEach(([name, vars]) => {
      it(`Auto ${name}`, () => {
        // @ts-ignore
        const Item = unref(definition.hook({ as: vars.as }))
        // @ts-ignore
        const item = Item[vars.method || 'ofRaw'](vars.shape)
        const res = {
          poor: Item.as.poor,
          primitive: Item.as.primitive,
          item,
        }

        try {
          expect(vars.res).toEqual(res)
        } catch (ex) {
          console.log(vars.res, res)
          throw ex
        }
      })
    })
  })
}
