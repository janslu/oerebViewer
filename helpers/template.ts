/**
 * Renders a string template by replacing key value pairs
 *
 * @param {String} string
 * @param {Object} values
 * @returns
 */
export function stringTemplate(string: string, values: Record<string, string>): string {
  if (typeof string !== 'string')
    throw new Error(
      `expected first argument (string) to be of type String but ${typeof string} given`,
    )

  const replacer = (match: string, key: string): string => values[key] || match
  return string.replace(/\{\{([^{}]*)\}\}/g, replacer)
}
