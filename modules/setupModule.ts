import { defineNuxtModule, addTemplate, useLogger } from '@nuxt/kit'
import fs from 'fs'
import path from 'path'

/**
 * Provides the theme css of the active config context as a build
 * template (#build/setup-context.css), falling back to the default
 * theme. The source files in config/ are never modified.
 */
export default defineNuxtModule({
  meta: {
    name: 'setup',
    configKey: 'setupModule',
  },
  setup(options, nuxt) {
    const logger = useLogger('setupModule')
    const CONFIG_CONTEXT = process.env.NUXT_ENV_CONFIG_CONTEXT || 'defaults'

    logger.info(`Loaded Config: ${CONFIG_CONTEXT}`)

    addTemplate({
      filename: 'setup-context.css',
      write: true,
      getContents: () => {
        const contextFile = path.resolve(nuxt.options.rootDir, 'config', CONFIG_CONTEXT, 'setup.css')
        const defaultFile = path.resolve(nuxt.options.rootDir, 'config', 'defaults', 'setup.css')

        if (fs.existsSync(contextFile)) {
          logger.success(`found setup.css for context ${CONFIG_CONTEXT}`)
          return fs.readFileSync(contextFile, 'utf-8')
        }

        logger.info(`no setup.css for context ${CONFIG_CONTEXT}, using defaults`)
        return fs.readFileSync(defaultFile, 'utf-8')
      },
    })
  },
})
