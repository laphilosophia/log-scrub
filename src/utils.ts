import chalk from 'chalk'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as os from 'os'
import path from 'path'
import { CONFIG_FILES } from './constants'
import type { Config } from './types'

export const findConfigFile = async (): Promise<string | null> => {
  const searchDirs = [process.cwd(), os.homedir()]

  for (const dir of searchDirs) {
    for (const filename of CONFIG_FILES) {
      const configPath = path.join(dir, filename)
      try {
        await fsPromises.access(configPath)
        return configPath
      } catch {
        continue
      }
    }
  }
  return null
}

export const loadConfig = async (): Promise<Partial<Config>> => {
  const configPath = await findConfigFile()
  if (!configPath) {
    return {}
  }

  try {
    const content = await fsPromises.readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error(chalk.yellow(`Warning: Failed to load config from ${configPath}`))
    return {}
  }
}

export const findConfigFileSync = (): string | null => {
  const searchDirs = [process.cwd(), os.homedir()]

  for (const dir of searchDirs) {
    for (const filename of CONFIG_FILES) {
      const configPath = path.join(dir, filename)
      if (fs.existsSync(configPath)) {
        return configPath
      }
    }
  }
  return null
}

export const loadConfigSync = (): Partial<Config> => {
  const configPath = findConfigFileSync()
  if (!configPath) {
    return {}
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error(chalk.yellow(`Warning: Failed to load config from ${configPath}`))
    return {}
  }
}
