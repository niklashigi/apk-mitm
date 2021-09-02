import * as path from 'path'
import Listr = require('listr')

import modifyManifest from './modify-manifest'
import createNetworkSecurityConfig from './create-netsec-config'
import disableCertificatePinning from './disable-certificate-pinning'
import copyCertificateFile from './copy-certificate-file'

export default function applyPatches(
  decodeDir: string,
  {
    debuggable = false,
    certificatePath,
  }: { debuggable?: boolean; certificatePath?: string } = {},
) {
  const patches: Listr.ListrTask[] = [
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
      title: 'Copying certificate file',
      skip: () =>
        certificatePath ? false : '--certificate flag not specified.',
      task: () => copyCertificateFile(decodeDir, certificatePath!),
    },
    {
      title: 'Replacing network security config',
      task: () =>
        createNetworkSecurityConfig(
          path.join(decodeDir, `res/xml/nsc_mitm.xml`),
          { certificatePath },
        ),
    },
    {
      title: 'Disabling certificate pinning',
      task: (_: any, task: Listr.ListrTaskWrapper<any>) =>
        disableCertificatePinning(decodeDir, task),
    },
  ]

  return new Listr(patches)
}
