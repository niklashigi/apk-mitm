import * as fs from '../utils/fs'
import xml from 'xml-js'

export default async function modifyManifest(path: string) {
  const fileXml = xml.xml2js(await fs.readFile(path, 'utf-8'), {
    compact: true,
    alwaysArray: true,
  })
  const manifest = fileXml['manifest'][0]
  const application = manifest['application'][0]

  application._attributes['android:networkSecurityConfig'] = '@xml/nsc_mitm'

  const usesAppBundle =
    application['meta-data'] &&
    application['meta-data'].some(
      (meta: any) =>
        meta._attributes['android:name'] === 'com.android.vending.splits',
    )

  await fs.writeFile(path, xml.js2xml(fileXml, { compact: true, spaces: 4 }))

  return { usesAppBundle }
}
