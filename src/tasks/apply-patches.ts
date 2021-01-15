import * as path from 'path'
import Listr = require('listr')

import modifyManifest from './modify-manifest'
import createNetworkSecurityConfig from './create-netsec-config'
import disableCertificatePinning from './disable-certificate-pinning'

export default function applyPatches(decodeDir: string) {
  return new Listr([
    {
      title: 'Modifying app manifest',
      task: async context => {
        const result = await modifyManifest(
          path.join(decodeDir, 'AndroidManifest.xml'),
        )

        context.usesAppBundle = result.usesAppBundle
      },
    },
    {
      title: 'Replacing network security config',
      task: () =>
        createNetworkSecurityConfig(
          path.join(decodeDir, `res/xml/nsc_mitm.xml`),
        ),
    },
    {
      title: 'Disabling certificate pinning',
      task: (_, task) => disableCertificatePinning(decodeDir, task),
    },
  ])
}
