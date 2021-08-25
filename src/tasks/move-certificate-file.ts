import * as fs from '../utils/fs'
import * as path from 'path'

/**
 *  Copies the certificate file to the given destination.
 * @param destination The destenation to which the cert file will be copied to. Needs to be "<decode-dir>/res/raw"
 * @param certificateSource Path to the certificate file to copy.
 */
export default async function copyCertificateToApk(
  destination: string,
  certificateSource: string,
) {
  await fs.copyFile(
    certificateSource,
    path.join(destination, path.basename(certificateSource)),
  )
}
