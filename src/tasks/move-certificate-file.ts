import * as fs from '../utils/fs'
import * as path from 'path'

export default async function copyCertificateToApk(
  destination: string,
  certificateSource: string,
) {
  await fs.copyFile(
    certificateSource,
    path.join(destination, path.basename(certificateSource)),
  )
}
