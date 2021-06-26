/**
 * Class for custom errors that can be shown directly to users of the CLI
 * without displaying the entire stack trace.
 */
export default class UserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = UserError.name
  }
}
