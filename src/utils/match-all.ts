/**
 * [Ponyfill](https://ponyfill.com/) for `String.prototype.matchAll`
 * that can be removed once support for Node.js 10 is dropped.
 */
export default function matchAll(
  input: string,
  pattern: RegExp,
): RegExpMatchArray[] {
  const matches = []

  let currentMatch = null
  while ((currentMatch = pattern.exec(input))) {
    matches.push(currentMatch)
  }

  return matches
}
