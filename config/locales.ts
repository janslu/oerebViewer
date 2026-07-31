import { locales as defaultConfigLocales } from './defaults/setup.js'

// Define types for locale objects
export interface Locale {
  code: string
  language: string
  file: string
  title: string
}

export default async function getLocales(context: string): Promise<Locale[]> {
  const defaultLocales: Locale[] = defaultConfigLocales || []

  if (context === 'defaults') {
    return defaultLocales
  }

  try {
    const contextModule = await import(`./${context}/setup.js`)
    const contextSetup = contextModule.default || contextModule
    return contextSetup.locales || defaultLocales
  } catch (error) {
    console.warn(`Failed to load context '${context}': ${error instanceof Error ? error.message : String(error)}. Using default locales.`)
    return defaultLocales
  }
}
