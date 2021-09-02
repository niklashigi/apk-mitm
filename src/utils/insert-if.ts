/**
 * Helper function that makes it easier to conditionally insert an element into
 * an array (avoiding an ugly ternary operator or `.splice()` call).
 */
export default function insertIf<T>(condition: boolean, element: T) {
  return condition ? [element] : []
}
