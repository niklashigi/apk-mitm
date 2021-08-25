import * as path from 'path'
import Listr = require('listr')

import modifyManifest from './modify-manifest'
import createNetworkSecurityConfig from './create-netsec-config'
import disableCertificatePinning from './disable-certificate-pinning'
import copyCertificateToApk from './move-certificate-file'

export default function applyPatches(
  decodeDir: string,
  debuggable = false,
  certificatePath: string,
) {
  const patches = [
    {
      title: 'Modifying app manifest',
      task: async (context: { usesAppBundle: boolean }) => {
        const result = await modifyManifest(
          path.join(decodeDir, 'AndroidManifest.xml'),
          debuggable,
        )

        context.usesAppBundle = result.usesAppBundle
      },
    },
    {
      title: 'Replacing network security config',
      task: () =>
        createNetworkSecurityConfig(
          path.join(decodeDir, `res/xml/nsc_mitm.xml`),
          certificatePath,
        ),
    },
    {
      title: 'Disabling certificate pinning',
      task: (_: any, task: Listr.ListrTaskWrapper<any>) =>
        disableCertificatePinning(decodeDir, task),
    },
  ]

  // If given a certificate path a task is added to copy the file.
  if (certificatePath) {
    patches.splice(1, 0, {
      title: 'Copying certificate file',
      task: () =>
        copyCertificateToApk(path.join(decodeDir, `res/raw/`), certificatePath),
    })
  }
  return new Listr(patches)
}
