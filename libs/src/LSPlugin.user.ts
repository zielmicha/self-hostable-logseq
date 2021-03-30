import { deepMerge } from './helpers'
import { LSPluginCaller } from './LSPlugin.caller'
import {
  IAppProxy, IDBProxy,
  IEditorProxy,
  ILSPluginUser,
  LSPluginBaseInfo,
  StyleString,
  ThemeOptions,
  UIOptions
} from './LSPlugin'
import Debug from 'debug'
import { snakeCase } from 'snake-case'

declare global {
  interface Window {
    __LSP__HOST__: boolean
    logseq: ILSPluginUser
  }
}

const debug = Debug('LSPlugin:user')

const app: Partial<IAppProxy> = {}
const editor: Partial<IEditorProxy> = {}
const db: Partial<IDBProxy> = {}

/**
 * User plugin instance
 */
export class LSPluginUser implements ILSPluginUser {
  /**
   * Indicate connected with host
   * @private
   */
  private _connected: boolean = false

  /**
   * @param _baseInfo
   * @param _caller
   */
  constructor (
    private _baseInfo: LSPluginBaseInfo,
    private _caller: LSPluginCaller
  ) {

  }

  async ready (callback: (e: LSPluginBaseInfo) => any) {
    if (this._connected) return

    try {
      const isFn = typeof callback === 'function'
      const model = isFn ? {} : callback
      let baseInfo = await this._caller.connectToParent(model)

      baseInfo = deepMerge(this._baseInfo, baseInfo)

      this._connected = true

      isFn && callback.call(this, baseInfo)
    } catch (e) {
      console.error('[LSPlugin Ready Error]', e)
    }
  }

  provideTheme (theme: ThemeOptions): void {
    this.caller.call('provider:theme', theme)
  }

  provideStyle (style: StyleString) {
    this.caller.call('provider:style', style)
  }

  provideUI (ui: UIOptions) {
    this.caller.call('provider:ui', ui)
  }

  updateSettings (attrs: Record<string, any>) {
    this.caller.call('settings:update', attrs)
    // TODO: update associated baseInfo settings
  }

  setMainUIAttrs (attrs: Record<string, any>): void {
    this.caller.call('main-ui:attrs', attrs)
  }

  setMainUIStyle (style: Record<string, any> | null): void {
    this.caller.call('main-ui:style', style)
  }

  hideMainUI (): void {
    this.caller.call('main-ui:visible', { visible: false })
  }

  showMainUI (): void {
    this.caller.call('main-ui:visible', { visible: true })
  }

  toggleMainUI (): void {
    this.caller.call('main-ui:visible', { toggle: true })
  }

  get connected (): boolean {
    return this._connected
  }

  get baseInfo (): LSPluginBaseInfo {
    return this._baseInfo
  }

  get caller (): LSPluginCaller {
    return this._caller
  }

  get App (): IAppProxy {
    const caller = this.caller

    return new Proxy(app, {
      get (target: any, propKey, receiver) {
        const origMethod = target[propKey]

        return function (this: any, ...args: any) {
          if (origMethod) {
            origMethod.apply(this, args)
          }

          // Handle hook
          const hookMatcher = propKey.toString().match(/^(once|off|on)/i)

          if (hookMatcher != null) {
            const f = hookMatcher[0]
            const s = hookMatcher.input!
            const e = s.slice(f.length)

            caller[f.toLowerCase()](`hook:app:${snakeCase(e)}`, args[0])
            return
          }

          // Call host
          return caller.callAsync(`app:call`, {
            method: propKey,
            args: args
          })
        }
      }
    })
  }

  get Editor () {
    return {}
  }

  get DB () {
    return {}
  }
}

export function setupPluginUserInstance (
  pluginBaseInfo: LSPluginBaseInfo,
  pluginCaller: LSPluginCaller
) {
  return new LSPluginUser(pluginBaseInfo, pluginCaller)
}

if (window.__LSP__HOST__ == null) { // Entry of iframe mode
  debug('Entry of iframe mode.')

  const caller = new LSPluginCaller(null)
  window.logseq = setupPluginUserInstance({} as any, caller)
}
