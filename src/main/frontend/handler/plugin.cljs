(ns frontend.handler.plugin
  (:require [promesa.core :as p]
            [rum.core :as rum]
            [frontend.util :as util]
            [frontend.handler.notification :as notifications]
            [frontend.state :as state]
            [electron.ipc :as ipc]
            [cljs-bean.core :as bean]))

(defonce lsp-enabled? (util/electron?))

;; state handlers
(defn register-plugin
  [pl]
  (swap! state/state update-in [:plugin/installed-plugins] assoc (keyword (:id pl)) pl))

(defn unregister-plugin
  [id]
  (js/LSPluginCore.unregister id))

(defn update-plugin-settings
  [id settings]
  (swap! state/state update-in [:plugin/installed-plugins id] assoc :settings settings))

(defn open-readme!
  [url display]
  (when url
    (-> (p/let [content (js/api.load_plugin_readme url)]
          (state/set-state! :plugin/active-readme content)
          (state/set-modal! display))
        (p/catch #(notifications/show! "No README file." :warn)))))

(defn load-unpacked-plugin
  []
  (if util/electron?
    (p/let [path (ipc/ipc "openDialogSync")]
      (when-not (:plugin/selected-unpacked-pkg @state/state)
        (state/set-state! :plugin/selected-unpacked-pkg path)))))

(defn reset-unpacked-state
  []
  (state/set-state! :plugin/selected-unpacked-pkg nil))

(defn- hook-plugin-app
  [type payload]
  (when lsp-enabled?
    (js/LSPluginCore.hookApp (name type) (bean/->js payload))))

(defn hook-event
  [ns type payload]
  (case ns
    :plugin (hook-plugin-app type payload)
    :default))

;; components
(rum/defc lsp-indicator < rum/reactive
  []
  (let [text (state/sub :plugin/indicator-text)]
    (if (= text "END")
      [:span]
      [:div
       {:style
        {:width           "100%"
         :height          "100vh"
         :display         "flex"
         :align-items     "center"
         :justify-content "center"}}
       [:span
        {:style
         {:color     "#aaa"
          :font-size "58px"}} (or text "Loading ...")]])))

;; demo plugin configures

(defonce
  a-themes-provider
  {:url "/Users/charlie/Desktop/examples-0-themes"})

(defn init-plugins
  [callback]

  (let [el (js/document.createElement "div")]
    (.appendChild js/document.body el)
    (rum/mount
     (lsp-indicator) el))

  (state/set-state! :plugin/indicator-text "⏳")

  (p/then
   (p/let [root (ipc/ipc "getLogseqUserRoot")
           _ (.setupPluginCore js/LSPlugin (bean/->js {:localUserConfigRoot root}))
           _ (doto js/LSPluginCore
               (.on "registered"
                    (fn [^js pl]
                      (register-plugin
                       (bean/->clj (.parse js/JSON (.stringify js/JSON pl))))))
               (.on "unregistered" #(when % (swap! state/state util/dissoc-in [:plugin/installed-plugins (keyword %)])))
               (.on "theme-changed" (fn [^js themes]
                                      (swap! state/state assoc :plugin/installed-themes
                                             (vec (mapcat (fn [[_ vs]] (bean/->clj vs)) (bean/->clj themes))))))
               (.on "theme-selected" (fn [^js opts]
                                       (let [opts (bean/->clj opts)
                                             url (:url opts)
                                             mode (:mode opts)]
                                         (when mode (state/set-theme! mode))
                                         (state/set-state! :plugin/selected-theme url))))
               (.on "settings-changed" (fn [id ^js settings]
                                         (let [id (keyword id)]
                                           (when (and settings
                                                      (contains? (:plugin/installed-plugins @state/state) id))
                                             (update-plugin-settings id (bean/->clj settings)))))))
           _ (.register js/LSPluginCore
                        (bean/->js
                         [;a-themes-provider
])
                        true)
           _ (p/delay 1000)])
   #(do
      (state/set-state! :plugin/indicator-text "END")
      (callback))))

(defn setup!
  "setup plugin core handler"
  [callback]
  (if (not lsp-enabled?)
    (callback)
    (init-plugins callback)))
