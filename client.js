// Client entry for the workspace task center.
//
// This file is the only client module DSH loads during boot; the implementation
// lives in sibling lazy chunks that DSH serves from the same directory:
//
//   client.copy.js      locale dictionaries + stylesheet   (activation)
//   client.core.js      shared UI kit, hooks, Host runtime (activation)
//   client.views.js     overview / board / prompt board    (first panel open)
//   client.overlays.js  quick switcher + wait picker       (first open)
//   client.capture.js   composer attribution banner        (first conversation)
//
// Client chunks cannot require each other synchronously, so client.core.js
// returns one shared environment object that every feature chunk receives when
// it is created. Chunks are downloaded on demand: a broken optional feature
// cannot take down the plugin entry or the panels that already loaded.
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PACKAGE_ID = '@local/dsh-session-todo'
    const NS = 'session-todo'
    const PANEL_ID = 'session-todo'
    const ROUTE = '/plugin-todo'
    // The page mirrors the session → task attribution so a reload of the same
    // tab can resume it before the Host poll answers. A fresh page starts
    // without the mirror and adopts the durable Host record instead.
    const BINDING_STORAGE_KEY = 'dsh.session-todo.binding.v1'
    // A mode's result line is useful right after a jump but must not follow the
    // reader into another task days later.
    const JUMP_NOTICE_TTL_MS = 10 * 60 * 1000
    const QUICK_TASKS_CACHE_KEY = 'tasks'
    // Mirrors the Host's MAX_PROMPT_CHARS: a longer draft cannot become a node.
    const MAX_DRAFT_CHARS = 20000

    // The whole entry is loaded at boot for every page; these constants are
    // also handed to client.core.js so only one copy of each value exists.
    const constants = {
      PKG: PACKAGE_ID,
      NS,
      PANEL_ID,
      ROUTE,
      BINDING_STORAGE_KEY,
      JUMP_NOTICE_TTL_MS,
      QUICK_TASKS_CACHE_KEY,
      MAX_DRAFT_CHARS,
    }

    // ---------------------------------------------------------------------
    // Lazy chunk plumbing
    // ---------------------------------------------------------------------

    /**
     * Build the loader for one feature chunk. The first call downloads and
     * constructs the chunk; later calls reuse the same promise. A failure is
     * not cached, so the panel's retry button can try the download again.
     * @param {string} file - chunk file name next to this bundle.
     * @param {(module: object) => object} build - turn chunk exports into feature components.
     */
    function createChunkLoader(file, build) {
      let pending = null
      return {
        load() {
          if (pending === null) {
            pending = require.async(file).then(build).catch((error) => {
              pending = null
              throw error
            })
          }
          return pending
        },
      }
    }

    /**
     * Materialize a chunk on first use and expose its ready/error state.
     *
     * `enabled` gates the download (overlays stay unloaded until they are first
     * opened). Returning a plain state object keeps the fallback in the caller's
     * hands: the panel shows a skeleton, overlays simply render nothing.
     * @param {{load: () => Promise<object>}} loader - chunk loader.
     * @param {boolean} [enabled] - whether the chunk is needed yet.
     */
    function useChunk(loader, enabled = true) {
      const [state, setState] = React.useState({ status: 'idle', module: null, error: null })
      const [attempt, setAttempt] = React.useState(0)
      React.useEffect(() => {
        if (!enabled || state.status === 'ready') return undefined
        let alive = true
        setState({ status: 'loading', module: null, error: null })
        loader.load().then(
          (module) => {
            if (alive) setState({ status: 'ready', module, error: null })
          },
          (error) => {
            if (!alive) return
            console.warn(`[${PACKAGE_ID}] failed to load a feature chunk`, error)
            setState({ status: 'error', module: null, error })
          },
        )
        return () => {
          alive = false
        }
      }, [enabled, loader, attempt])
      const retry = React.useCallback(() => setAttempt((value) => value + 1), [])
      return { ...state, retry }
    }

    /** Keep an optional slot's render failure inside the plugin. */
    class SlotBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      componentDidCatch(error) {
        console.error(`[${PACKAGE_ID}] ${this.props.name} slot failed to render`, error)
      }

      render() {
        return this.state.failed ? null : this.props.children
      }
    }

    /** Track whether this plugin's panel is the active layout panel. */
    function useActivePanel(runtime) {
      const [active, setActive] = React.useState(() => runtime.isPanelActive())
      React.useEffect(() => {
        let layout = null
        try {
          layout = runtime.serviceOf('layout')
        } catch {
          layout = null
        }
        if (!layout?.panelInfo?.subscribe) return undefined
        const sync = () => setActive(runtime.isPanelActive())
        sync()
        return layout.panelInfo.subscribe(sync)
      }, [runtime])
      return active
    }

    // ---------------------------------------------------------------------
    // Activation
    // ---------------------------------------------------------------------

    async function apply(ctx) {
      // Copy and core are needed before anything can be registered, and they
      // are independent, so one round trip serves both.
      const [copy, core] = await Promise.all([
        require.async('./client.copy.js'),
        require.async('./client.core.js'),
      ])
      // Activation became asynchronous: a plugin disabled while the chunks
      // were in flight must not register effects on its disposed fiber.
      if (ctx.fiber?.uid === null) return

      const env = core.createCore({ ctx, constants })
      const { t, runtime, ui } = env
      const loaders = {
        views: createChunkLoader('./client.views.js', (module) => module.createViews(env)),
        overlays: createChunkLoader('./client.overlays.js', (module) => module.createOverlays(env)),
        capture: createChunkLoader('./client.capture.js', (module) => module.createCapture(env)),
      }

      // A reload of the same tab resumes the local mirror immediately; a
      // fresh page receives the durable mapping from the Host on first poll.
      runtime.restoreTaskSession()

      // -------------------------------------------------------------------
      // Slot components
      // -------------------------------------------------------------------

      function TaskCenterSlot() {
        const active = useActivePanel(runtime)
        const chunk = useChunk(loaders.views)
        if (chunk.status === 'error') {
          return h(
            'div',
            { className: 'st-root' },
            h(
              'div',
              { className: 'st-shell' },
              h(ui.ErrorBlock, {
                message: t('error.render', { message: env.format.messageOf(chunk.error) }),
                onRetry: chunk.retry,
              }),
            ),
          )
        }
        if (chunk.status !== 'ready') {
          return h('div', { className: 'st-root' }, h('div', { className: 'st-shell' }, h(ui.LoadingBlock, { lines: 3 })))
        }
        return h(chunk.module.Panel, { active })
      }

      function TaskCenterIcon(props) {
        return h('span', { className: 'st-panelIcon' }, ui.Icon('checklist', typeof props.size === 'number' ? props.size : 16))
      }

      function CaptureBannerSlot(props) {
        const chunk = useChunk(loaders.capture)
        if (chunk.status !== 'ready') return null
        return h(SlotBoundary, { name: 'capture banner' }, h(chunk.module.CaptureBanner, props))
      }

      function QuickSwitcherSlot() {
        const open = env.hooks.useStoreValue(runtime.quickOpen)
        const chunk = useChunk(loaders.overlays, open)
        if (!open || chunk.status !== 'ready') return null
        return h(SlotBoundary, { name: 'quick switcher' }, h(chunk.module.QuickSwitcher))
      }

      function WaitPickerSlot() {
        const picker = env.hooks.useStoreValue(runtime.waitPicker)
        const open = Boolean(picker)
        const chunk = useChunk(loaders.overlays, open)
        if (!open || chunk.status !== 'ready') return null
        return h(SlotBoundary, { name: 'wait picker' }, h(chunk.module.WaitPicker))
      }

      // -------------------------------------------------------------------
      // DSH registrations
      // -------------------------------------------------------------------

      ctx.effect(() => ctx.locale.register(NS, { zh: copy.ZH, en: copy.EN }), `${PACKAGE_ID}: dictionaries`)
      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        const element = document.createElement('style')
        element.setAttribute('data-plugin', PACKAGE_ID)
        element.textContent = copy.CSS
        document.head.append(element)
        return () => element.remove()
      }, `${PACKAGE_ID}: styles`)

      ctx.effect(
        () => ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, TaskCenterSlot)),
        `${PACKAGE_ID}: main panel`,
      )
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 5, label: () => t('entry.label'), locale: NS }, TaskCenterIcon),
          ),
        `${PACKAGE_ID}: sidebar entry`,
      )
      // The input dock exists in both the blank hero and a running
      // conversation; the composer dock does not render in the hero, where a
      // freshly created session starts.
      // Keep this before the native QueueDock (order 20). QueueDock is
      // intentionally the last dock entry: it tucks its bottom edge 3px under
      // the composer card with a negative margin. A later entry would take the
      // composer's place and cover that seam while a prompt is queued.
      ctx.effect(
        () =>
          ctx.slots.inject('conversation.input.dock', () =>
            ctx.slots.register({ name: 'conversation.input.dock', id: 'session-todo-capture', order: 10, locale: NS }, CaptureBannerSlot),
          ),
        `${PACKAGE_ID}: capture banner`,
      )
      ctx.effect(
        () =>
          ctx.slots.inject('shell.overlay', () =>
            ctx.slots.register({ name: 'shell.overlay', id: 'session-todo-quick-switcher', order: 20, locale: NS }, QuickSwitcherSlot),
          ),
        `${PACKAGE_ID}: quick switcher overlay`,
      )
      ctx.effect(
        () =>
          ctx.slots.inject('shell.overlay', () =>
            ctx.slots.register({ name: 'shell.overlay', id: 'session-todo-wait-picker', order: 21, locale: NS }, WaitPickerSlot),
          ),
        `${PACKAGE_ID}: wait picker overlay`,
      )

      ctx.inject(['shortcuts'], (scope) => {
        scope.effect(() => {
          try {
            return scope.shortcuts.register({
              id: 'session-todo.quick-switch',
              label: () => t('quick.title'),
              aliases: ['task switcher', 'switch task', 'prompt board'],
              defaults: {
                'desktop:macos': { code: 'KeyK', modifiers: ['primary', 'shift'] },
                'desktop:windows': { code: 'KeyK', modifiers: ['primary', 'shift'] },
                'desktop:linux': { code: 'KeyK', modifiers: ['primary', 'shift'] },
                'web:macos': { code: 'KeyK', modifiers: ['primary', 'shift'] },
                'web:windows': { code: 'KeyK', modifiers: ['primary', 'shift'] },
                // Web Linux only admits the browser-safe Comma family for
                // editable commands; the binding can be changed in settings.
                'web:linux': { code: 'Comma', modifiers: ['primary', 'shift'] },
              },
              regions: ['page', 'editable'],
              modals: [],
              resolve: () => ({
                status: 'handled',
                run: () => {
                  if (runtime.quickOpen.get()) runtime.closeQuickSwitcher()
                  else runtime.openQuickSwitcher()
                },
              }),
            })
          } catch (error) {
            console.warn(`[${PACKAGE_ID}] quick switch shortcut is unavailable`, error)
            return () => {}
          }
        }, `${PACKAGE_ID}: quick switch shortcut`)
      })
    }

    return { inject: ['slots', 'locale', 'layout', 'uiWorkspace', 'sessions', 'conversation'], apply }
  },
})
