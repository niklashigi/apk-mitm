import * as fs from '../utils/fs'
import * as path from 'path'

/**
 * Copies the certificate file at `sourcePath` to the correct location within
 * the APK's `decodeDir`, so it can then be referenced in the Network Security
 * Config.
 */
export default async function copyCertificateFile(
  decodeDir: string,
  sourcePath: string,
) {
  const rawDir = path.join(decodeDir, `res/raw/`)
  await fs.mkdir(rawDir, { recursive: true })

  const destinationPath = path.join(rawDir, path.basename(sourcePath))
  await fs.copyFile(sourcePath, destinationPath)
}
