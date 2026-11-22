// Shared core of the task center: icon set, pure helpers, UI kit, polling
// hooks and the Host-facing runtime.
//
// DSH serves this file next to client.js and materializes it once, during
// plugin activation; the entry passes the environment it returns to every
// feature chunk (chunks cannot require each other synchronously).
// The registration id must equal package.json "name" (see client.js).
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  chunk: 'client.core.js',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    // Like a git graph, each Session branch keeps one vivid accent so its
    // bullets and rail stay distinguishable in both light and dark themes.
    const BRANCH_COLORS = [
      'hsl(212 90% 56%)',
      'hsl(145 62% 43%)',
      'hsl(36 92% 52%)',
      'hsl(345 78% 58%)',
      'hsl(270 70% 62%)',
      'hsl(186 72% 40%)',
    ]


    // ---------------------------------------------------------------------
    // Small pieces
    // ---------------------------------------------------------------------

    const iconPaths = {
      checklist: ['M2.8 4.4h1.4l1.1 1.1 2.4-2.4', 'M2.8 9.4h1.4l1.1 1.1 2.4-2.4', 'M9.2 5.2h4', 'M9.2 10.2h4'],
      plus: ['M8 3.2v9.6', 'M3.2 8h9.6'],
      back: ['M12.6 8H3.6', 'M7.2 4.4 3.6 8l3.6 3.6'],
      close: ['M4 4l8 8', 'M12 4l-8 8'],
      pencil: ['M11.1 2.9l2 2L6.5 11.5l-2.9 1 1-2.9z'],
      trash: ['M3 4.4h10', 'M6.2 4.4V2.9h3.6v1.5', 'M4.4 4.4l.6 8.2h6l.6-8.2', 'M6.6 6.6v4', 'M9.4 6.6v4'],
      external: ['M9 3h4v4', 'M13 3 7.5 8.5', 'M4 5.5h3', 'M4 5.5v7h7v-3'],
      refresh: ['M12.8 6.1A5 5 0 1 0 13 9.7', 'M12.9 2.9v3.4h-3.4'],
      folder: ['M2.8 4.4h4l1.1 1.6h5.3v6.6H2.8z'],
      chat: ['M3 3.5h10v7H8l-3 2v-2H3z'],
      search: ['M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z', 'M10.6 10.6 14 14'],
      info: ['M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8Z', 'M8 7.2v3.4', 'M8 4.9h.01'],
      check: ['M3.4 8.4 6.4 11.4 12.6 4.6'],
      switch: ['M2.8 5.4h9.4', 'M9.6 3.2l2.2 2.2-2.2 2.2', 'M13.2 10.6H3.8', 'M6.4 8.4l-2.2 2.2 2.2 2.2'],
      // Send arrow plus a small clock badge: submit-and-wait, deliberately
      // distinct from the native composer's plain send arrow.
      sendWait: ['M2.2 6.2h8.4', 'M8.4 3.4 11.2 6.2 8.4 9', 'M12.1 8.9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M12.1 9.9v1.5l1.1.7'],
    }

    // Path elements are constant per icon; build them once, reuse on every render.
    const iconNodes = Object.fromEntries(
      Object.entries(iconPaths).map(([name, paths]) => [name, paths.map((d, index) => h('path', { key: index, d }))]),
    )

    function Icon(name, size = 14) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        ...(iconNodes[name] || []),
      )
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error ?? 'unknown error')
    }

    function hasText(value) {
      return typeof value === 'string' && value.trim().length > 0
    }

    /**
     * Whether a key event is still part of an IME composition. Enter/Escape
     * used to confirm or cancel a candidate must not also submit a form,
     * rename a session, or move a selection.
     * @param {object} event - React synthetic or native keyboard event.
     * @returns {boolean}
     */
    function isImeComposing(event) {
      return Boolean(event?.nativeEvent?.isComposing ?? event?.isComposing)
    }

    /** Build one Intl object per locale: they are expensive to construct. */
    function intlCache(build) {
      const cache = new Map()
      return (locale) => {
        const key = locale || ''
        if (!cache.has(key)) cache.set(key, build(locale))
        return cache.get(key)
      }
    }

    const dateFormatter = intlCache((locale) => {
      try {
        return new Intl.DateTimeFormat(locale || undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      } catch {
        return null
      }
    })

    const pluralRule = intlCache((locale) => {
      try {
        return new Intl.PluralRules(locale || undefined)
      } catch {
        return null
      }
    })

    function dateTimeText(value, locale) {
      if (!Number.isFinite(value)) return ''
      const format = dateFormatter(locale)
      return format ? format.format(new Date(value)) : new Date(value).toLocaleString()
    }

    function countText(t, locale, key, count) {
      let form = 'other'
      try {
        if (pluralRule(locale)?.select(count) === 'one') form = 'one'
      } catch {
        form = 'other'
      }
      return t(`${key}.${form}`, { count })
    }

    function workspaceTitle(workspace, t) {
      if (workspace && hasText(workspace.title)) return workspace.title.trim()
      const path = workspace && typeof workspace.path === 'string' ? workspace.path : ''
      const tail = path.split(/[\\/]/).filter(Boolean).pop()
      return tail || t('overview.untitled')
    }

    function hashString(value) {
      let hash = 0
      for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0
      return Math.abs(hash)
    }

    /**
     * Quick-switcher rank: recent activity counts most, repeated visits boost
     * the same task, and an old frequent task still yields to today's work.
     * @param {object} task - task summary carrying persisted visit metadata.
     * @param {number} now - current epoch ms.
     * @returns {number} larger ranks first.
     */
    function taskVisitScore(task, now) {
      const lastVisitedAt = Number.isFinite(task?.lastVisitedAt) ? task.lastVisitedAt : 0
      const updatedAt = Number.isFinite(task?.updatedAt) ? task.updatedAt : 0
      const createdAt = Number.isFinite(task?.createdAt) ? task.createdAt : 0
      const activityAt = Math.max(lastVisitedAt, updatedAt, createdAt)
      const count = Number.isFinite(task?.visitCount) && task.visitCount > 0 ? task.visitCount : 0
      const ageDays = Math.max(0, now - activityAt) / 86_400_000
      return (count + 1) / (1 + ageDays)
    }

    const STATUS = {
      draft: ['status.draft', ''],
      queued: ['status.queued', 'warn'],
      running: ['status.running', 'run'],
      waiting: ['status.waiting', 'warn'],
      done: ['status.done', 'done'],
      failed: ['status.failed', 'error'],
      cancelled: ['status.cancelled', 'error'],
      unknown: ['status.unknown', ''],
    }

    function statusOf(status, t) {
      const [key, tone] = STATUS[status] || STATUS.unknown
      return { label: t(key), tone, status: STATUS[status] ? status : 'unknown' }
    }

    function groupPrompts(prompts, sessions, t) {
      const bySession = new Map(sessions.map((session) => [session.sessionId, session]))
      const groups = new Map()
      for (const prompt of prompts) {
        const id = prompt.sessionId || '__unbound__'
        let group = groups.get(id)
        if (!group) {
          group = { id, sessionId: prompt.sessionId || null, prompts: [], latestAt: 0 }
          groups.set(id, group)
        }
        group.prompts.push(prompt)
        group.latestAt = Math.max(group.latestAt, prompt.createdAt ?? 0)
      }
      const list = [...groups.values()].map((group) => {
        group.prompts.sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
        const session = group.sessionId ? bySession.get(group.sessionId) : null
        group.missing = Boolean(group.sessionId && !session)
        group.title = !group.sessionId
          ? t('group.noSession')
          : session
            ? hasText(session.title) ? session.title.trim() : t('group.untitled')
            : t('group.removed')
        group.live = Boolean(session?.live)
        group.color = group.sessionId
          ? BRANCH_COLORS[hashString(group.sessionId) % BRANCH_COLORS.length]
          : 'var(--dsw-alias-state-idle-primary)'
        return group
      })
      list.sort((left, right) => right.latestAt - left.latestAt || left.title.localeCompare(right.title))
      return list
    }

    /** Count the prompt states the board headers summarize (one loop, one definition). */
    function summarizePrompts(prompts) {
      let active = 0
      let waiting = 0
      for (const prompt of prompts ?? []) {
        if (prompt.status === 'queued' || prompt.status === 'running') active += 1
        else if (prompt.status === 'waiting') waiting += 1
      }
      return { active, waiting }
    }

    const ERROR_KEYS = {
      workspace_not_found: 'errors.workspaceMissing',
      task_not_found: 'errors.taskMissing',
      session_not_in_workspace: 'errors.sessionMissing',
      title_required: 'errors.titleRequired',
      dependency_required: 'errors.dependencyRequired',
      dependency_not_found: 'errors.dependencyMissing',
      dependency_not_executable: 'errors.dependencyNotExecutable',
      too_many_dependencies: 'errors.tooManyDependencies',
      text_required: 'errors.textRequired',
      body_too_large: 'errors.bodyTooLarge',
      invalid_json: 'errors.invalidJson',
    }

    function localizedError(error, t) {
      const key = error && ERROR_KEYS[error.code]
      return key ? t(key) : messageOf(error)
    }

    function createValueStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        get: () => value,
        set(next) {
          if (Object.is(next, value)) return
          value = next
          for (const listener of [...listeners]) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    }

    function useStoreValue(store) {
      const [value, setValue] = React.useState(store.get)
      React.useEffect(() => store.subscribe(() => setValue(store.get())), [store])
      return value
    }


    const payloadCache = new Map()

    function rememberPayload(key, payload) {
      payloadCache.set(key, payload)
      if (payloadCache.size <= 16) return
      const oldest = payloadCache.keys().next().value
      if (oldest !== undefined) payloadCache.delete(oldest)
    }

    /**
     * Whether the page is visible. Polled views pause while the tab is hidden
     * and refresh immediately when it becomes visible again.
     */
    function usePageVisible() {
      const [visible, setVisible] = React.useState(() => document.visibilityState !== 'hidden')
      React.useEffect(() => {
        const sync = () => setVisible(document.visibilityState !== 'hidden')
        document.addEventListener('visibilitychange', sync)
        sync()
        return () => document.removeEventListener('visibilitychange', sync)
      }, [])
      return visible
    }

    /**
     * Poll cache keys shared by the view that reads a resource and the action
     * that invalidates it. Centralizing them keeps the strings from drifting.
     */
    const cacheKeys = {
      workspaces: 'workspaces',
      board: (workspaceId) => `board:${workspaceId}`,
      task: (workspaceId, taskId) => `task:${workspaceId}:${taskId}`,
    }


    /** One compact status/metric pill; every board uses the same element. */
    function Chip({ tone, children }) {
      return h('span', { className: 'st-chip', 'data-tone': tone }, children)
    }

    /**
     * Search box shared by the prompt board picker and both overlays, so the
     * markup, clear affordance and accessibility wiring exist exactly once.
     */
    function SearchField({ value, onInput, placeholder, label, clearLabel, inputRef, autoFocus = false, onKeyDown }) {
      return h(
        'div',
        { className: 'st-search' },
        h('span', { className: 'st-searchIcon' }, Icon('search', 13)),
        h('input', {
          className: 'st-searchInput',
          ref: inputRef,
          value,
          autoFocus,
          'aria-label': label ?? placeholder,
          placeholder,
          onChange: (event) => onInput(event.target.value),
          onKeyDown,
        }),
        clearLabel && value
          ? h(
              'button',
              {
                type: 'button',
                className: 'st-searchClear',
                title: clearLabel,
                'aria-label': clearLabel,
                onClick: () => onInput(''),
              },
              Icon('close', 11),
            )
          : null,
      )
    }

    // ---------------------------------------------------------------------
    // Shared UI
    // ---------------------------------------------------------------------

    function PageHeader({ eyebrow, title, subtitle, back, actions }) {
      return h(
        'header',
        { className: 'st-pageHead' },
        h(
          'div',
          { className: 'st-pageHeadMain' },
          back
            ? h(
                'button',
                { type: 'button', className: 'st-back', onClick: back.onClick, title: back.label },
                Icon('back', 16),
                h('span', null, back.label),
              )
            : null,
          h('div', { className: 'st-eyebrow' }, eyebrow),
          typeof title === 'string' ? h('h1', { className: 'st-pageTitle' }, title) : title,
          subtitle
            ? typeof subtitle === 'string'
              ? h('p', { className: 'st-pageSubtitle' }, subtitle)
              : subtitle
            : null,
        ),
        h('div', { className: 'st-actions' }, actions),
      )
    }

    function IconButton({ icon, label, onClick, disabled, danger, size = 13, className = 'st-iconBtn' }) {
      return h(
        'button',
        {
          type: 'button',
          className,
          'data-danger': danger ? 'true' : undefined,
          title: label,
          'aria-label': label,
          disabled,
          onClick,
        },
        Icon(icon, size),
      )
    }


    function PrimaryButton({ children, onClick, disabled, icon, title }) {
      return h(
        'button',
        { type: 'button', className: 'st-btn', 'data-primary': 'true', onClick, disabled, title },
        icon ? Icon(icon, 13) : null,
        children,
      )
    }

    function SecondaryButton({ children, onClick, disabled, icon }) {
      return h(
        'button',
        { type: 'button', className: 'st-btn', onClick, disabled },
        icon ? Icon(icon, 13) : null,
        children,
      )
    }

    function LoadingBlock({ lines = 3 }) {
      return h('div', { className: 'st-loading' }, ...Array.from({ length: lines }, (_, index) => h('div', { className: 'st-skeleton', key: index })))
    }

    function EmptyBlock({ title, hint, action }) {
      return h(
        'div',
        { className: 'st-empty' },
        h('div', { className: 'st-emptyTitle' }, title),
        hint ? h('div', { className: 'st-emptyHint' }, hint) : null,
        action || null,
      )
    }

    /** One-line status/error strip; every board renders these the same way. */
    function Notice({ tone, children }) {
      return h('div', { className: 'st-notice', 'data-tone': tone }, children)
    }


    // ---------------------------------------------------------------------
    // UI kit bound to one activation's translator
    // ---------------------------------------------------------------------

    /**
     * Only two primitives need the active translator, so binding them here
     * keeps every other primitive a plain component and lets feature chunks
     * call them without threading `t` through every props object.
     */
    function createUi(t) {
      function RefreshButton({ onClick }) {
        return h(IconButton, { icon: 'refresh', label: t('common.refresh'), size: 14, onClick })
      }

      function ErrorBlock({ message, onRetry }) {
        return h(
          'div',
          { className: 'st-error' },
          h('span', null, message),
          h('button', { type: 'button', className: 'st-btn', onClick: onRetry }, t('common.retry')),
        )
      }

      return {
        Icon,
        PageHeader,
        IconButton,
        RefreshButton,
        PrimaryButton,
        SecondaryButton,
        LoadingBlock,
        ErrorBlock,
        EmptyBlock,
        Notice,
        Chip,
        SearchField,
      }
    }

    // ---------------------------------------------------------------------
    // React hooks bound to one activation
    // ---------------------------------------------------------------------

    function createHooks(t) {
      /** Open the native Session list so sidebar renames reach rendered titles. */
      function useSessionRows(runtime) {
        const sessions = runtime.serviceOf('sessions')
        const read = () => {
          try {
            return sessions?.list?.getSnapshot()?.byId ?? {}
          } catch {
            return {}
          }
        }
        const [byId, setById] = React.useState(read)
        React.useEffect(() => {
          const source = sessions?.list
          if (!source?.subscribe) return undefined
          const sync = () => setById(source.getSnapshot()?.byId ?? {})
          sync()
          return source.subscribe(sync)
        }, [sessions])
        return byId
      }

      function usePolled(load, key, options) {
        const active = options?.active !== false
        const interval = options?.interval ?? 2000
        // A hidden tab neither needs fresh boards nor should keep the Host busy.
        const visible = usePageVisible()
        const polling = active && visible
        const loadRef = React.useRef(load)
        loadRef.current = load
        const lastRef = React.useRef({ key: null, text: '' })
        const [payload, setPayload] = React.useState(() => payloadCache.get(key) ?? null)
        const [error, setError] = React.useState(null)
        const [nonce, setNonce] = React.useState(0)

        React.useEffect(() => {
          if (!polling) return undefined
          let alive = true
          let busy = false
          const run = async () => {
            if (busy) return
            busy = true
            try {
              const next = await loadRef.current()
              if (!alive) return
              rememberPayload(key, next)
              // A poll that returns the same board must not re-render the whole
              // panel; every prompt node and its Intl-formatted time would be
              // rebuilt for nothing. Compare the serialized payload instead.
              const text = JSON.stringify(next)
              if (lastRef.current.key !== key || lastRef.current.text !== text) {
                lastRef.current = { key, text }
                setPayload(next)
              }
              setError(null)
            } catch (failure) {
              if (alive) setError(localizedError(failure, t))
            } finally {
              busy = false
            }
          }
          void run()
          const timer = window.setInterval(() => { void run() }, interval)
          return () => {
            alive = false
            window.clearInterval(timer)
          }
        }, [polling, key, interval, nonce])

        return {
          data: payload,
          error,
          reload: React.useCallback(() => setNonce((value) => value + 1), []),
        }
      }

      return { useStoreValue, usePageVisible, usePolled, useSessionRows }
    }


    // ---------------------------------------------------------------------
    // Domain runtime: Host bridge, attribution, navigation and locating
    // ---------------------------------------------------------------------

    /**
     * Build the page-side runtime for one activation.
     *
     * Everything stateful lives here instead of in React context: the runtime is
     * handed to feature chunks when they materialize, so the components stay
     * plain closures and the bridge/domain logic stays React-free.
     */
    function createRuntime({ ctx, t, locale, serviceOf, constants, helpers }) {
      const { PKG, PANEL_ID, ROUTE, BINDING_STORAGE_KEY, MAX_DRAFT_CHARS } = constants
      const { createValueStore, hasText, messageOf } = helpers

      const memory = { view: { kind: 'overview' } }
      const binding = { current: null }
      const quickOpen = createValueStore(false)
      const waitPicker = createValueStore(null)
      const viewRequest = createValueStore(null)
      const jumpNotice = createValueStore(null)
      // Reactive mirror of `binding.current` for the capture banner: a slot
      // remount must not hide the task strip while the Host poll is in flight.
      const attribution = createValueStore(null)
      let jumpToken = 0
      // Bumped on every explicit attribution change. In-flight capture polls
      // carrying an older epoch must not undo a Cancel or a reassignment.
      let attributionEpoch = 0
      // Sessions the reader explicitly cancelled in this page. Keeps a failed
      // release request or an in-flight poll from resurrecting the banner.
      const releasedSessions = new Set()
      // The bridge always lives on the page origin, so resolve it once.
      const bridgeBase = `${window.location.origin}${ROUTE}`

      /**
       * Call the local Host bridge.
       *
       * The URL is built from the absolute page origin, not from a relative
       * segment, so an overlay or a panel rendered from another route still
       * reaches the same bridge. An explicitly requested retry is only used by
       * read-only callers such as the quick switcher, where a workspace
       * registry refresh can briefly fail without meaning the list is gone.
       */
      function parseBridgeBody(text) {
        if (!text) return null
        try {
          return JSON.parse(text)
        } catch {
          return null
        }
      }

      /** The Host bridge reports failures as `{ code?, error }`; keep that contract. */
      function bridgeError(payload, status) {
        const message = payload && typeof payload.error === 'string' && payload.error ? payload.error : `HTTP ${status}`
        const error = new Error(message)
        error.status = status
        if (payload && typeof payload.code === 'string') error.code = payload.code
        return error
      }

      function isRetryable(error) {
        return error?.name === 'AbortError'
          || error?.name === 'TypeError'
          || error?.status >= 500
          || error?.status === 429
      }

      async function request(path, init, options = {}) {
        const target = bridgeBase + path
        const method = (init && init.method) || 'GET'
        const retries = Number.isInteger(options.retries) && options.retries > 0 ? options.retries : 0
        const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 12_000
        for (let attempt = 0; ; attempt += 1) {
          const controller = typeof AbortController === 'function' ? new AbortController() : null
          const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null
          try {
            const headers = { 'x-dsh-todo': '1' }
            if (init && init.body !== undefined) headers['content-type'] = 'application/json'
            const response = await fetch(target, {
              method,
              headers,
              body: init && init.body,
              cache: 'no-store',
              credentials: 'same-origin',
              signal: controller ? controller.signal : undefined,
            })
            const payload = parseBridgeBody(await response.text())
            if (!response.ok) throw bridgeError(payload, response.status)
            return payload ?? {}
          } catch (error) {
            if (attempt >= retries || !isRetryable(error)) throw error
            await new Promise((resolve) => window.setTimeout(resolve, 180 + attempt * 220))
          } finally {
            if (timer !== null) window.clearTimeout(timer)
          }
        }
      }

      function isPanelActive() {
        try {
          const layout = serviceOf('layout')
          return !layout?.panelInfo || layout.panelInfo.getSnapshot().activePanelId === PANEL_ID
        } catch {
          return true
        }
      }

      // -------------------------------------------------------------------
      // Bridge endpoints
      //
      // Components describe intent ("create a task") instead of assembling
      // URLs and JSON bodies, so every request shape exists exactly once.
      // -------------------------------------------------------------------

      const taskUrl = (workspaceId, taskId) =>
        `/task?workspaceId=${encodeURIComponent(workspaceId)}&taskId=${encodeURIComponent(taskId)}`
      const workspaceUrl = (workspaceId) => `/workspace?workspaceId=${encodeURIComponent(workspaceId)}`

      const api = {
        workspaces: () => request('/workspaces'),
        workspace: (workspaceId) => request(workspaceUrl(workspaceId)),
        task: (workspaceId, taskId) => request(taskUrl(workspaceId, taskId)),
        taskSummaries: () => request('/tasks', undefined, { retries: 2, timeoutMs: 8000 }),
        promptCandidates: () => request('/prompt-candidates?limit=200', undefined, { retries: 1, timeoutMs: 8000 }),
        capture: (sessionId) => request(`/capture?sessionId=${encodeURIComponent(sessionId)}`),
        createTask: (workspaceId, { title, description }) =>
          request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'createTask', title, description }),
          }),
        updateTask: (workspaceId, taskId, { title, description }) =>
          request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'updateTask', taskId, title, description }),
          }),
        deleteTask: (workspaceId, taskId) =>
          request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'deleteTask', taskId }),
          }),
        armCapture: (workspaceId, taskId, sessionId, options) =>
          request('/capture', {
            method: 'POST',
            body: JSON.stringify({
              action: 'arm',
              workspaceId,
              taskId,
              sessionId,
              ...(options?.newSession ? { newSession: true } : {}),
            }),
          }),
        releaseCapture: (sessionId) =>
          request('/capture', { method: 'POST', body: JSON.stringify({ action: 'release', sessionId }) }),
        deferPrompt: ({ workspaceId, taskId, sessionId, text, dependsOn, commitId }) =>
          request('/task', {
            method: 'POST',
            body: JSON.stringify({
              workspaceId,
              action: 'deferPrompt',
              taskId,
              sessionId,
              text,
              dependsOn,
              ...(typeof commitId === 'string' && commitId ? { commitId } : {}),
            }),
          }),
        recordVisit: (workspaceId, taskId) =>
          request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'recordVisit', taskId }),
          }),
      }

      // -------------------------------------------------------------------
      // Task / session attribution
      //
      // Only the prompt board arms a session → task attribution. It is
      // durable: every later send in that session is recorded until the user
      // cancels the banner, the task is deleted, or the session is re-armed
      // with another task.
      // -------------------------------------------------------------------

      function readStoredBinding() {
        try {
          const raw = window.sessionStorage.getItem(BINDING_STORAGE_KEY)
          if (!raw) return null
          const value = JSON.parse(raw)
          if (!value || typeof value !== 'object') return null
          if (typeof value.sessionId !== 'string' || !value.sessionId) return null
          if (typeof value.workspaceId !== 'string' || !value.workspaceId) return null
          if (typeof value.taskId !== 'string' || !value.taskId) return null
          return {
            sessionId: value.sessionId,
            workspaceId: value.workspaceId,
            taskId: value.taskId,
            taskTitle: typeof value.taskTitle === 'string' ? value.taskTitle : '',
          }
        } catch {
          return null
        }
      }

      function storeBinding(value) {
        try {
          if (value) window.sessionStorage.setItem(BINDING_STORAGE_KEY, JSON.stringify(value))
          else window.sessionStorage.removeItem(BINDING_STORAGE_KEY)
        } catch {
          // Storage may be unavailable; attribution still works in memory.
        }
      }

      function adoptBinding(capture) {
        if (!capture || typeof capture.sessionId !== 'string' || !capture.sessionId) return null
        const value = {
          sessionId: capture.sessionId,
          workspaceId: typeof capture.workspaceId === 'string' ? capture.workspaceId : '',
          taskId: typeof capture.taskId === 'string' ? capture.taskId : '',
          taskTitle: typeof capture.taskTitle === 'string' ? capture.taskTitle : '',
          at: Date.now(),
        }
        binding.current = value
        storeBinding(value)
        attribution.set(value)
        attributionEpoch += 1
        return value
      }

      /**
       * Forget the page-local attribution. Only the session named by
       * `sessionId` is cleared when one is supplied, so a stale poll from a
       * previous session cannot erase a newer binding.
       * @param {string} [sessionId] - session whose attribution ended.
       */
      function clearAttribution(sessionId) {
        if (sessionId && binding.current && binding.current.sessionId !== sessionId) return
        binding.current = null
        storeBinding(null)
        attribution.set(null)
        attributionEpoch += 1
      }

      /**
       * Keep a Host poll result without rewriting session storage every tick.
       * @param {object|null} capture - Host binding from `/capture`.
       * @returns {object|null} current attribution.
       */
      function syncAttribution(capture, epoch) {
        if (Number.isInteger(epoch) && epoch !== attributionEpoch) return null
        if (capture && typeof capture.sessionId === 'string' && releasedSessions.has(capture.sessionId)) return null
        if (!capture || typeof capture.sessionId !== 'string' || !capture.sessionId) {
          clearAttribution()
          return null
        }
        const current = binding.current
        if (current && current.sessionId === capture.sessionId && current.taskId === capture.taskId) {
          return current
        }
        return adoptBinding(capture)
      }

      /**
       * Bind one session to the task the prompt board belongs to.
       * @param {string} sessionId - native session.
       * @param {{workspaceId: string, taskId: string, taskTitle?: string}} task - board identity.
       * @param {{newSession?: boolean}} [options] - accept a just-created session.
       * @returns {Promise<object|null>} the Host binding.
       */
      async function bindTaskSession(sessionId, task, options) {
        if (!sessionId || !task || typeof task.workspaceId !== 'string' || typeof task.taskId !== 'string') return null
        if (!task.workspaceId || !task.taskId) return null
        const payload = await api.armCapture(task.workspaceId, task.taskId, sessionId, options)
        const adopted = adoptBinding(payload && payload.capture)
        if (adopted) releasedSessions.delete(sessionId)
        return adopted
      }

      /**
       * Rename a native Session through the Session Controller, the same path
       * the sidebar rename uses. The title projection updates the sidebar and
       * this plugin's subscribed title source together.
       * @param {string} sessionId - native session.
       * @param {string} title - accepted title.
       * @returns {Promise<object>} the native rename value.
       */
      async function renameSession(sessionId, title) {
        const sessions = serviceOf('sessions')
        if (!sessions?.using) throw new Error('session rename is unavailable')
        return sessions.using(sessionId, { source: 'sessionTodo' }, async (reference) => {
          const result = await reference.binding.session.rename(title)
          if (!result || result.ok !== true) {
            const error = new Error((result && result.error && result.error.message) || 'session rename failed')
            if (result && result.error && typeof result.error.code === 'string') error.code = result.error.code
            throw error
          }
          return result.value
        })
      }

      /** End attribution without leaving the conversation (banner button). */
      function releaseSessionBinding(sessionId) {
        if (!sessionId) return
        releasedSessions.add(sessionId)
        clearAttribution(sessionId)
        void api.releaseCapture(sessionId).catch(() => {
          // Keep the local tombstone; the next successful arm clears it.
        })
      }

      /** Stop an in-flight locator without changing durable attribution. */
      function cancelPendingJump() {
        jumpToken += 1
        const pendingNotice = jumpNotice.get()
        if (pendingNotice && pendingNotice.status === 'locating') jumpNotice.set(null)
      }

      // -------------------------------------------------------------------
      // Quick task switcher
      // -------------------------------------------------------------------

      /**
       * Record one prompt-board visit on the Host, so quick-switcher ordering
       * survives restarts and works across browsers of the same profile.
       */
      function recordTaskVisit(workspaceId, taskId) {
        if (!workspaceId || !taskId) return
        void api.recordVisit(workspaceId, taskId).catch(() => {})
      }

      function openQuickSwitcher() {
        waitPicker.set(null)
        quickOpen.set(true)
      }

      function closeQuickSwitcher() {
        quickOpen.set(false)
      }

      /**
       * Open the dependency-node picker for one attributed conversation. The
       * picker captures the current composer draft only when its submit action
       * runs, so the user may type before or after choosing nodes.
       * @param {{sessionId: string, workspaceId: string, taskId: string, taskTitle?: string}} context - attribution.
       */
      function openWaitPicker(context) {
        if (!context || typeof context.sessionId !== 'string' || !context.sessionId) return
        if (typeof context.workspaceId !== 'string' || !context.workspaceId) return
        if (typeof context.taskId !== 'string' || !context.taskId) return
        quickOpen.set(false)
        waitPicker.set({
          sessionId: context.sessionId,
          workspaceId: context.workspaceId,
          taskId: context.taskId,
          taskTitle: typeof context.taskTitle === 'string' ? context.taskTitle : '',
        })
      }

      function closeWaitPicker() {
        waitPicker.set(null)
      }

      /**
       * Read the current native composer for one Session. The public
       * Conversation input facade is owned by the retained Session scope; its
       * published state is the only place the unsent draft exists.
       * @param {string} sessionId - native session.
       * @returns {{input: object, state: object}|null}
       */
      function composerState(sessionId) {
        try {
          const sessions = serviceOf('sessions')
          const binding = sessions?.binding?.(sessionId)
          if (!binding?.ctx) return null
          const conversation = serviceOf('conversation')
          const input = conversation?.input?.for?.(binding.ctx)
          if (!input?.state?.getSnapshot) return null
          return { input, state: input.state.getSnapshot() }
        } catch {
          return null
        }
      }

      /**
       * Capture the composer draft and create a waiting Prompt node. The Host
       * owns the dependency state and submits through the native Session
       * admission path after every selected node is terminal.
       * @param {{sessionId: string, workspaceId: string, taskId: string}} context - attribution.
       * @param {string[]} dependsOn - selected prompt node ids.
       * @returns {Promise<object>} bridge response.
       */
      async function submitWaitingDraft(context, dependsOn, commitId) {
        if (!context || typeof context.sessionId !== 'string' || !context.sessionId) {
          throw new Error(t('wait.error.composer'))
        }
        if (!Array.isArray(dependsOn) || dependsOn.length === 0) {
          throw new Error(t('wait.error.select'))
        }
        const composer = composerState(context.sessionId)
        if (!composer) throw new Error(t('wait.error.composer'))
        const { input, state } = composer
        if (state.phase !== 'plain' || state.claim) throw new Error(t('wait.error.busy'))
        if (!hasText(state.draft)) throw new Error(t('wait.error.noDraft'))
        if (Array.isArray(state.attachmentIds) && state.attachmentIds.length > 0) {
          throw new Error(t('wait.error.attachments'))
        }
        if (Array.isArray(state.occurrences) && state.occurrences.length > 0) {
          throw new Error(t('wait.error.quoted'))
        }
        if (state.draft.trimStart().startsWith('/')) throw new Error(t('wait.error.command'))
        if (state.draft.length > MAX_DRAFT_CHARS) throw new Error(t('wait.error.tooLong'))
        const payload = await api.deferPrompt({
          workspaceId: context.workspaceId,
          taskId: context.taskId,
          sessionId: context.sessionId,
          text: state.draft,
          dependsOn,
          commitId,
        })
        try {
          input.setDraft('')
        } catch (error) {
          console.warn(`[${PKG}] could not clear the captured draft`, error)
        }
        return payload
      }

      /**
       * Open one task's prompt board from anywhere. The panel consumes
       * `viewRequest` after it mounts, so this also works when the panel was
       * already showing another view.
       */
      function navigateToTask(workspaceId, taskId) {
        if (typeof workspaceId !== 'string' || !workspaceId) return
        if (typeof taskId !== 'string' || !taskId) return
        const view = { kind: 'task', workspaceId, taskId }
        memory.view = view
        viewRequest.set(view)
        quickOpen.set(false)
        waitPicker.set(null)
        try {
          serviceOf('layout')?.selectPanel?.(PANEL_ID)
        } catch (error) {
          console.warn(`[${PKG}] could not open the task panel`, error)
        }
      }

      /**
       * Return from an attributed conversation to its task's Prompt board.
       * This is the capture banner's 「返回」 action. Attribution remains
       * durable; only the banner's 「取消」 removes it.
       */
      function returnToTask(capture) {
        const workspaceId = typeof capture?.workspaceId === 'string' ? capture.workspaceId : ''
        const taskId = typeof capture?.taskId === 'string' ? capture.taskId : ''
        cancelPendingJump()
        if (workspaceId && taskId) {
          navigateToTask(workspaceId, taskId)
          return
        }
        try {
          serviceOf('layout')?.selectPanel?.(PANEL_ID)
        } catch (error) {
          console.warn(`[${PKG}] could not return to the task center`, error)
        }
      }

      /**
       * Restore the page-local mirror from the previous load of this tab. The
       * durable Host mapping remains authoritative and is fetched by the
       * capture banner; a fresh tab simply starts without a local mirror and
       * receives the last attribution from the Host on its first poll.
       */
      function restoreTaskSession() {
        const stored = readStoredBinding()
        if (!stored) return
        adoptBinding({ ...stored, at: Date.now() })
      }

      function sleep(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms))
      }

      function conversationOf(sessionId) {
        return document.querySelector(`[data-conversation-session="${sessionId}"]`)
      }

      function findTurnRow(sessionId, turn) {
        const root = conversationOf(sessionId) ?? document
        const rows = root.querySelectorAll(`[data-chat-turn="${turn}"]`)
        for (const row of rows) {
          if (row.getClientRects().length > 0) return row
        }
        return null
      }

      function scrollParentOf(element) {
        for (let node = element.parentElement; node; node = node.parentElement) {
          const style = window.getComputedStyle(node)
          const overflow = `${style.overflowY} ${style.overflow}`
          if (/(auto|scroll|overlay)/.test(overflow) && node.scrollHeight > node.clientHeight + 4) return node
        }
        return null
      }

      function nextFrame() {
        return new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))
      }

      /**
       * The native chat pauses follow-tail on reader intent. A synthetic wheel
       * event gives the viewport that intent without moving it.
       */
      function sendWheel(element, deltaY) {
        if (!element) return
        try {
          element.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))
        } catch {
          // Older browsers: the programmatic scroll may still stick.
        }
      }

      function revealRow(row) {
        const scroller = row.closest?.('[data-conversation-scroll]') ?? scrollParentOf(row)
        if (!scroller) {
          row.scrollIntoView({ block: 'start' })
          return
        }
        sendWheel(scroller, -1)
        const rowRect = row.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        const top = scroller.scrollTop + rowRect.top - scrollerRect.top - 24
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
      }

      function flashRow(row) {
        const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduced || typeof row.animate !== 'function') return
        row.animate(
          [
            { boxShadow: '0 0 0 2px var(--dsw-alias-brand-primary)', borderRadius: '10px' },
            { boxShadow: '0 0 0 2px transparent', borderRadius: '10px' },
          ],
          { duration: 1600, easing: 'ease-out' },
        )
      }

      function rowInPlace(row) {
        const scroller = row.closest?.('[data-conversation-scroll]') ?? scrollParentOf(row)
        if (!scroller) return true
        const rowRect = row.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        return rowRect.top >= scrollerRect.top - 4 && rowRect.top <= scrollerRect.top + 160
      }

      async function settleRow(sessionId, turn, token) {
        const startedAt = Date.now()
        let stable = 0
        let lastRevealAt = 0
        while (Date.now() - startedAt < 2400 && token === jumpToken) {
          const row = findTurnRow(sessionId, turn)
          if (!row) {
            await sleep(160)
            continue
          }
          if (!rowInPlace(row)) {
            const now = Date.now()
            if (now - lastRevealAt > 260) {
              lastRevealAt = now
              revealRow(row)
            }
            stable = 0
          } else {
            stable += 1
          }
          if (stable >= 2) return row
          await sleep(200)
        }
        const row = findTurnRow(sessionId, turn)
        return row && rowInPlace(row) ? row : null
      }

      /**
       * Publish one jump result scoped to the task that requested it. The
       * prompt board only renders notices carrying its own task identity, so a
       * failure can never follow the reader into an unrelated new task.
       * @param {{workspaceId?: string, taskId?: string}|null} task - board identity.
       * @param {'locating'|'info'|'error'|'done'} status - notice status.
       * @param {string} text - localized message.
       */
      function setJumpNotice(task, status, text) {
        jumpNotice.set({
          status,
          text,
          workspaceId: typeof task?.workspaceId === 'string' ? task.workspaceId : '',
          taskId: typeof task?.taskId === 'string' ? task.taskId : '',
          at: Date.now(),
        })
      }

      /** Bring the native conversation to its newest turn. */
      function scrollConversationToEnd(sessionId) {
        const node = conversationOf(sessionId)
        const scroller = node?.closest?.('[data-conversation-scroll]')
          ?? document.querySelector('[data-conversation-scroll]')
        if (!scroller) return
        sendWheel(scroller, 1)
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' })
      }

      /**
       * Locate one prompt in its native session.
       *
       * Opening a node is also an entry from the prompt board, so the session
       * is bound to the task for later sends. DSH exposes no public "open at
       * this turn" API: the native chat flow marks each row with
       * `data-chat-turn`; older history is paged in with native loadOlder()
       * batches until that turn is loaded, then we scroll its row into view.
       * Incremental pages avoid one long assembly task.
       */
      function bindingOf(sessionId) {
        try {
          return serviceOf('sessions')?.binding?.(sessionId) ?? null
        } catch {
          return null
        }
      }

      /**
       * Ask the native chat for one older history page. Batches stay small so
       * history assembly never blocks one long main-thread task.
       */
      function pageOlderBatch(binding) {
        sendWheel(document.querySelector('[data-conversation-scroll]'), -1)
        const loading = binding.session.loadOlder?.()
        return loading && typeof loading.catch === 'function' ? loading.catch(() => {}) : Promise.resolve()
      }

      /**
       * Wait for one turn row to appear and settle in the open conversation,
       * paging older history while it is missing. Returns null when the row
       * never stabilizes before the deadline or a newer locator cancelled us.
       */
      async function locateTurnRow(sessionId, turn, token) {
        const startedAt = Date.now()
        const deadline = startedAt + 15_000
        let paging = false
        let lastPageAt = 0
        while (Date.now() < deadline && token === jumpToken) {
          const binding = bindingOf(sessionId)
          const chatMounted = Boolean(document.querySelector('[data-chat-turn]'))
          const mayPage = Date.now() - startedAt > 300 || chatMounted
          if (binding && mayPage && !paging && Date.now() - lastPageAt > 300) {
            paging = true
            lastPageAt = Date.now()
            void pageOlderBatch(binding).finally(() => {
              paging = false
            })
          }
          if (binding) {
            const shown = conversationOf(sessionId)
            const shownId = shown?.getAttribute('data-conversation-session')
            if (shownId && shownId !== sessionId) {
              await sleep(120)
              continue
            }
            const row = findTurnRow(sessionId, turn)
            if (row) {
              await nextFrame()
              revealRow(row)
              return await settleRow(sessionId, turn, token)
            }
          }
          await sleep(120)
        }
        return null
      }

      async function jumpToPrompt(prompt, task) {
        if (!prompt?.sessionId) {
          setJumpNotice(task, 'error', t('jump.noSession'))
          return
        }
        if (prompt.status === 'waiting') {
          setJumpNotice(task, 'info', t('jump.waiting'))
          return
        }
        const sessionId = prompt.sessionId
        const token = ++jumpToken
        if (task && task.workspaceId && task.taskId) {
          void bindTaskSession(sessionId, task).catch((failure) => {
            console.warn(`[${PKG}] could not attribute the located session to its task`, failure)
          })
        }
        try {
          serviceOf('uiWorkspace')?.openSession?.(sessionId)
        } catch (failure) {
          setJumpNotice(task, 'error', t('error.request', { message: messageOf(failure) }))
          return
        }
        if (!Number.isFinite(prompt.turn)) {
          setJumpNotice(task, 'info', prompt.status === 'queued' ? t('jump.queued') : t('jump.notStarted'))
          return
        }
        setJumpNotice(task, 'locating', t('jump.locating'))
        const settled = await locateTurnRow(sessionId, prompt.turn, token)
        if (token !== jumpToken) return
        if (settled) {
          flashRow(settled)
          setJumpNotice(task, 'done', t('jump.done'))
          return
        }
        // A live turn has no stable row to point at yet; the opened session
        // already lands at its newest content, so leave no error behind.
        if (prompt.status === 'running') {
          jumpNotice.set(null)
          scrollConversationToEnd(sessionId)
          return
        }
        setJumpNotice(task, 'error', t('jump.failed'))
      }

      /**
       * Quick-switcher rows for every workspace.
       *
       * `/tasks` is newer than the core workspace routes: when a Host running
       * an older plugin half answers without it, rebuild the same rows from the
       * long-standing overview + workspace endpoints instead of failing the
       * whole list.
       */
      async function fetchTaskSummaries() {
        try {
          return await api.taskSummaries()
        } catch (failure) {
          const rows = await loadTaskSummariesFallback()
          if (rows) return { tasks: rows }
          throw failure
        }
      }

      /** @returns {Promise<object[]|null>} rows, or null when no workspace answered. */
      async function loadTaskSummariesFallback() {
        let overview
        try {
          overview = await api.workspaces()
        } catch {
          return null
        }
        const workspaces = Array.isArray(overview.workspaces) ? overview.workspaces : []
        let answered = false
        const results = await Promise.all(
          workspaces.map(async (workspace) => {
            if (!workspace || typeof workspace.id !== 'string') return []
            try {
              const payload = await api.workspace(workspace.id)
              answered = true
              const rows = Array.isArray(payload.tasks) ? payload.tasks : []
              return rows.map((task) => ({
                ...task,
                workspaceId: workspace.id,
                workspaceTitle: typeof workspace.title === 'string' ? workspace.title : '',
                workspacePath: typeof workspace.path === 'string' ? workspace.path : '',
              }))
            } catch {
              return []
            }
          }),
        )
        if (!answered) return null
        return results.flat()
      }

      const runtime = {
        locale,
        serviceOf,
        memory,
        binding,
        attribution,
        attributionEpoch: () => attributionEpoch,
        syncAttribution,
        clearAttribution,
        bindTaskSession,
        renameSession,
        releaseSessionBinding,
        quickOpen,
        waitPicker,
        viewRequest,
        openQuickSwitcher,
        closeQuickSwitcher,
        openWaitPicker,
        closeWaitPicker,
        submitWaitingDraft,
        navigateToTask,
        returnToTask,
        recordTaskVisit,
        jumpNotice,
        jumpToPrompt,
        isPanelActive,
        restoreTaskSession,
        api,
        fetchTaskSummaries,
      }

      return runtime
    }


    // ---------------------------------------------------------------------
    // Composition root shared by every client chunk
    // ---------------------------------------------------------------------

    /**
     * Create the shared environment once per activation.
     *
     * The returned object is passed by reference into each feature chunk, so a
     * chunk never has to require this module back (client chunks cannot require
     * each other synchronously).
     */
    function createCore({ ctx, constants }) {
      const t = ctx.locale.bind(constants.NS)
      const locale = () => {
        try {
          return ctx.locale.getLocale()?.active || 'en'
        } catch {
          return 'en'
        }
      }
      const serviceOf = (name) => {
        try {
          return ctx.get ? ctx.get(name) : ctx[name]
        } catch {
          return undefined
        }
      }
      const ui = createUi(t)
      const hooks = createHooks(t)
      const runtime = createRuntime({
        ctx,
        t,
        locale,
        serviceOf,
        constants,
        helpers: { createValueStore, hasText, messageOf },
      })
      return {
        React,
        h,
        t,
        locale,
        ui,
        hooks,
        runtime,
        constants,
        format: {
          messageOf,
          hasText,
          isImeComposing,
          dateTimeText,
          countText,
          workspaceTitle,
          taskVisitScore,
          hashString,
          localizedError,
          rememberPayload,
          payloadCache,
        },
        models: { STATUS, statusOf, groupPrompts, summarizePrompts },
        cacheKeys,
      }
    }

    return { createCore }
  },
})
