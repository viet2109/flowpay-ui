type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many'
type PluralForm<K> = K extends `${string}_${PluralSuffix}` ? K : never

/**
 * A translation of the English messages `T`: every key, any string. Plural forms
 * other than `_other` are optional, because Vietnamese has a single form.
 * A missing or misspelled key is a type error.
 */
export type Messages<T> = {
  [K in keyof T as K extends PluralForm<K> ? never : K]: T[K] extends string ? string : Messages<T[K]>
} & {
  [K in keyof T as PluralForm<K>]?: string
}
