import * as fs from '../utils/fs'
import xml = require('xml-js')

export default async function modifyManifest(path: string, debuggable = false) {
  const document = xml.xml2js(await fs.readFile(path, 'utf-8')) as xml.Element

  const manifest = document.elements?.find(el => el.name === 'manifest')!
  const application = manifest.elements?.find(el => el.name === 'application')!

  application.attributes = {
    ...application.attributes,

    // Configure app to use custom Network Security Config
    'android:networkSecurityConfig': '@xml/nsc_mitm',

    // Make app debuggable when `--debuggable` flag is used
    ...(debuggable && { 'android:debuggable': 'true' }),
  }

  const usesAppBundle =
    application.elements?.some(
      el =>
        el.name === 'meta-data' &&
        el.attributes?.['android:name'] === 'com.android.vending.splits',
    ) ?? false

  await fs.writeFile(path, xml.js2xml(document, { spaces: 4 }))

  return { usesAppBundle }
}
