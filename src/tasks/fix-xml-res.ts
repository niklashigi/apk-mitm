import globby = require('globby')
import { ListrTaskWrapper } from 'listr'
import * as fs from '../utils/fs'

import observeAsync from '../utils/observe-async'
import buildGlob from '../utils/build-glob'

const escapeXmlTags = (value: string): string => {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const processXmlFile = async (filePath: string): Promise<void> => {
  const xml = await fs.readFile(filePath, 'utf8');
  let newXml = xml;

  const stringRegex = /<string name="(.*?)">(.*?)<\/string>/gs;
  let match: RegExpExecArray | null;
  while ((match = stringRegex.exec(xml)) !== null) {
    const [, name, value] = match;
    if (value.includes('>') || value.includes('<')) {
      const escapedValue = escapeXmlTags(value);
      newXml = newXml.replace(value, `<string name="${name}">${escapedValue}</string>`);
    }
  }

  await fs.writeFile(filePath, newXml, 'utf8');
};

export default async function fixXmlRes(
  directoryPath: string,
  task: ListrTaskWrapper,
) {
  return observeAsync(async log => {
    const resStringsGlob = buildGlob(directoryPath, 'res/*/strings.xml')

    log('Scanning strings in XML res...')
    for await (const filePathChunk of globby.stream(resStringsGlob)) {
      const filePath = filePathChunk as string
      await processXmlFile(filePath);
    }
  })
}
