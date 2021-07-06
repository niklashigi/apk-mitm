import * as path from 'path'

/** Build a glob pattern that works on POSIX and Windows. */
export default function buildGlob(...components: string[]) {
  // Convert Windows path (using backslashes) to POSIX path (using slashes)
  const unixComponents = components.map(component =>
    component.split(path.sep).join(path.posix.sep),
  )

  return path.posix.join(...unixComponents)
}
