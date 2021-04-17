const CLASS_PATTERN = /\.class(?<keywords>.+)? L(?<name>[^\s]+);/
const IMPLEMENTS_PATTERN = /\.implements L(?<name>[^\s]+);/g

/**
 * General information about a class extracted from the first few lines of a
 * Smali file and used to find applicable Smali patches.
 */
export interface SmaliHead {
  /** The name of the class. */
  name: string

  /** The interfaces implemented by this class. */
  implements: string[]

  /** Whether the "class" actually represents an interface. */
  isInterface: boolean
}

/**
 * Extracts general information like the class name, the implemented interfaces,
 * and whether the class actually represents an interface from a Smali file.
 */
export default function parseSmaliHead(contents: string): SmaliHead {
  const { keywords, name } = contents.match(CLASS_PATTERN)?.groups!

  return {
    name,
    implements: Array.from(contents.matchAll(IMPLEMENTS_PATTERN)).map(
      match => match.groups!.name,
    ),
    isInterface: keywords?.trim().split(' ').includes('interface') ?? false,
  }
}
