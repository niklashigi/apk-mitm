import * as crossZip from 'cross-zip'

export function zip(inputPath: String, outputPath: String): Promise<void> {
  return new Promise((resolve, reject) => {
    crossZip.zip(inputPath, outputPath, error => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export function unzip(inputPath: String, outputPath: String): Promise<void> {
  return new Promise((resolve, reject) => {
    crossZip.unzip(inputPath, outputPath, (error?: Error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
