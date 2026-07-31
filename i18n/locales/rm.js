export default defineI18nLocale(async (locale) => {
  // context translations are merged over the defaults,
  // mirroring the config-context system in config/setup.ts
  const defaults = await import(`../../config/defaults/locales/${locale}.json`)
    .then(m => m.default)
    .catch(() => ({}))

  const configContext = useRuntimeConfig().public.configContext || 'defaults'
  if (configContext === 'defaults') {
    return defaults
  }

  const contextTranslations = await import(`../../config/${configContext}/locales/${locale}.json`)
    .then(m => m.default)
    .catch(() => ({}))

  return {
    ...defaults,
    ...contextTranslations,
  }
})
