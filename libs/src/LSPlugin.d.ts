import EventEmitter from 'eventemitter3'
import { LSPluginCaller } from './LSPlugin.caller'

declare global {
  interface Window {
    api: any
  }
}

type PluginLocalIdentity = string

type ThemeOptions = {
  name: string
  url: string
  description?: string
  mode?: 'dark' | 'light'

  [key: string]: any
}

type StyleString = string

type UIOptions = {
  key?: string
  replace?: boolean
  path: string // dom selector
  template: string
}

interface LSPluginPkgConfig {
  id?: PluginLocalIdentity
  mode?: 'shadow' | 'iframe'
  themes?: Array<ThemeOptions>
  icon?: string
}

interface LSPluginBaseInfo {
  id: string // should be unique
  mode: 'shadow' | 'iframe'

  settings: {
    disabled: boolean
    [key: string]: any
  },

  [key: string]: any
}

type IUserHook = (callback: (e: any) => void) => void

interface IAppProxy {
  pushState: (k: string, params?: {}) => void
  replaceState: (k: string, params?: {}) => void
  getUserState: () => Promise<any>
  showMsg: (content: string, status?: string) => void
  onThemeModeChanged: IUserHook
  onPageFileMounted: IUserHook
}

interface IEditorProxy {
  getCurrentPageBlocksTree: <T = any> () => Promise<T>
}

interface IDBProxy {
  datascriptQuery: <T = any>(query: string) => Promise<T>
}

interface ILSPluginThemeManager extends EventEmitter {
  themes: Map<PluginLocalIdentity, Array<ThemeOptions>>

  registerTheme (id: PluginLocalIdentity, opt: ThemeOptions): Promise<void>

  unregisterTheme (id: PluginLocalIdentity): Promise<void>

  selectTheme (opt?: ThemeOptions): Promise<void>
}

type LSPluginUserEvents = 'ui:visible:changed'

interface ILSPluginUser extends EventEmitter<LSPluginUserEvents> {
  /**
   * Indicate connected with host
   */
  connected: boolean

  /**
   * Duplex message caller
   */
  caller: LSPluginCaller

  /**
   * Most from packages
   */
  baseInfo: LSPluginBaseInfo

  /**
   * Ready for host connected
   */
  ready (model?: Record<string, any>): Promise<any>

  ready (callback?: (e: any) => void | {}): Promise<any>

  ready (model?: Record<string, any>, callback?: (e: any) => void | {}): Promise<any>

  /**
   * @param theme options
   */
  provideTheme (theme: ThemeOptions): void

  /**
   * @param style
   */
  provideStyle (style: StyleString): void

  /**
   * @param ui options
   */
  provideUI (ui: UIOptions): void

  /**
   * @param attrs
   */
  updateSettings (attrs: Record<string, any>): void

  /**
   * MainUI for index.html
   * @param attrs
   */
  setMainUIAttrs (attrs: Record<string, any>): void

  setMainUIInlineStyle (style: CSSStyleDeclaration): void

  showMainUI (): void

  hideMainUI (): void

  toggleMainUI (): void

  App: IAppProxy
  Editor: IEditorProxy
  DB: IDBProxy
}
