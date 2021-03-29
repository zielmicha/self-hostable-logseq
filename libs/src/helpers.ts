import { StyleString, UIOptions } from './LSPlugin'
import { PluginLocal } from './LSPlugin.core'

interface IIsObject {
  (item: any): boolean;
}

interface IObject {
  [key: string]: any;
}

interface IDeepMerge {
  (target: IObject, ...sources: Array<IObject>): IObject;
}

/**
 * @description Method to check if an item is an object. Date and Function are considered
 * an object, so if you need to exclude those, please update the method accordingly.
 * @param item - The item that needs to be checked
 * @return {Boolean} Whether or not @item is an object
 */
export const isObject: IIsObject = (item: any): boolean => {
  return (item === Object(item) && !Array.isArray(item))
}

/**
 * @description Method to perform a deep merge of objects
 * @param {Object} target - The targeted object that needs to be merged with the supplied @sources
 * @param {Array<Object>} sources - The source(s) that will be used to update the @target object
 * @return {Object} The final merged object
 */
export const deepMerge: IDeepMerge = (target: IObject, ...sources: Array<IObject>): IObject => {
  // return the target if no sources passed
  if (!sources.length) {
    return target
  }

  const result: IObject = target

  if (isObject(result)) {
    const len: number = sources.length

    for (let i = 0; i < len; i += 1) {
      const elm: any = sources[i]

      if (isObject(elm)) {
        for (const key in elm) {
          if (elm.hasOwnProperty(key)) {
            if (isObject(elm[key])) {
              if (!result[key] || !isObject(result[key])) {
                result[key] = {}
              }
              deepMerge(result[key], elm[key])
            } else {
              if (Array.isArray(result[key]) && Array.isArray(elm[key])) {
                // concatenate the two arrays and remove any duplicate primitive values
                result[key] = Array.from(new Set(result[key].concat(elm[key])))
              } else {
                result[key] = elm[key]
              }
            }
          }
        }
      }
    }
  }

  return result
}

/**
 * generate an random string
 */
export function genID () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * @param timeout milliseconds
 * @param tag string
 */
export function deferred<T = any> (timeout?: number, tag?: string) {
  let resolve: any, reject: any
  let settled: boolean = false
  const timeFn = (r: Function) => {
    return (v: T) => {
      timeout && clearTimeout(timeout)
      r(v)
      settled = true
    }
  }

  const promise = new Promise<T>((resolve1, reject1) => {
    resolve = timeFn(resolve1)
    reject = timeFn(reject1)

    if (timeout) {
      setTimeout(() => reject(new Error(`[deferred timeout] ${tag}`)), timeout)
    }
  })

  return {
    created: Date.now(),
    setTag: (t: string) => tag = t,
    resolve, reject, promise,
    get settled () {
      return settled
    }
  }
}

/**
 * @param str
 */
export function ucFirst (str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * @param props
 * @param target
 */
export const setupIframeSandbox = (
  props: Record<string, any>,
  target: HTMLElement) => {

  const iframe = document.createElement('iframe')

  iframe.classList.add('lsp-iframe-sandbox')

  Object.entries(props).forEach(([k, v]) => {
    iframe.setAttribute(k, v)
  })

  target.appendChild(iframe)

  return async () => {
    target.removeChild(iframe)
  }
}

/**
 * @param style
 * @param attrs
 */
export const setupInjectedStyle = (
  style: StyleString,
  attrs: Record<string, any>) => {
  const el = document.createElement('style')
  el.textContent = style

  attrs && Object.entries(attrs).forEach(([k, v]) => {
    el.setAttribute(k, v)
  })

  document.head.append(el)

  return () => {
    document.head.removeChild(el)
  }
}

/**
 * @param ui
 * @param attrs
 */
export function setupInjectedUI (
  this: PluginLocal,
  ui: UIOptions,
  attrs: Record<string, any>
) {
  const pl = this
  const target = ui.path && document.querySelector(ui.path)
  if (!target) {
    console.error(`${this.debugTag} can not resolve path target ${ui.path}`)
    return
  }

  const key = `${ui.key}_${pl.id}`

  let el = document.querySelector(`div[data-injected-ui="${key}"]`) as HTMLElement

  if (el) {
    el.innerHTML = ui.template
    return
  }

  el = document.createElement('div')
  el.dataset.injectedUi = key || ''

  // TODO: Support more
  el.innerHTML = ui.template

  attrs && Object.entries(attrs).forEach(([k, v]) => {
    el.setAttribute(k, v)
  })

  target.appendChild(el);

  // TODO: How handle events
  ['click', 'focus', 'focusin', 'focusout', 'blur', 'dblclick',
    'keyup', 'keypress', 'keydown', 'change', 'input'].forEach((type) => {
    el.addEventListener(type, (e) => {
      const target = e.target! as HTMLElement
      const trigger = target.closest(`[data-on-${type}]`) as HTMLElement
      if (!trigger) return

      const msgType = trigger.dataset[`on${ucFirst(type)}`]
      msgType && pl.caller?.callUserModel(msgType, transformableEvent(e))
    }, false)
  })

  return () => {
    target!.removeChild(el)
  }
}

/**
 * @param e
 */
export function transformableEvent (e: Event) {
  const target = e.target as any
  const obj: any = {}

  if (target) {
    ['value', 'id', 'className',
      'dataset'
    ].forEach((k) => {
      let v: any = target[k]
      if (typeof v === 'object') {
        v = { ...v }
      }

      obj[k] = v
    })
  }

  return obj
}

let injectedThemeEffect: any = null

/**
 * @param url
 */
export const setupInjectedTheme = (url?: string) => {
  injectedThemeEffect?.call()

  if (!url) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)

  return (injectedThemeEffect = () => {
    document.head.removeChild(link)
    injectedThemeEffect = null
  })
}