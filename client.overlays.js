// Overlays: the keyboard quick task switcher and the wait-for-nodes picker.
//
// DSH serves this file next to client.js and materializes it when an overlay is
// first opened; both overlays share one chunk because they share the dialog
// shell, row layout and keyboard handling.
// The registration id must equal package.json "name" (see client.js).
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  chunk: 'client.overlays.js',
  factory() {
    function createOverlays(env) {
      const { React, h, t, runtime, constants, ui, hooks, format, models } = env
      const { Icon, IconButton, LoadingBlock, ErrorBlock, SearchField, Chip, Notice } = ui
      const { useStoreValue, useSessionRows } = hooks
      const { hasText, isImeComposing, localizedError, dateTimeText, countText, workspaceTitle, taskVisitScore, rememberPayload, payloadCache } = format
      const { statusOf } = models

      // ---------------------------------------------------------------------
      // Shared overlay pieces
      // ---------------------------------------------------------------------

      /**
       * Dialog shell used by both overlays: scrim, centered card, title row with
       * refresh/close actions, optional hint, search slot, body and footer.
       * Keeping one shell guarantees the two dialogs stay visually identical.
       */
      function OverlayShell({ title, hint, search, body, errorLine, footer, bodyRef, onClose, onRefresh, refreshDisabled, refreshSize = 13, onKeyDown }) {
        return h(
          'div',
          { className: 'st-quickOverlay', onKeyDown },
          h('div', { className: 'st-quickScrim', onClick: onClose }),
          h(
            'div',
            {
              className: 'st-quickCard',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': title,
            },
            h(
              'div',
              { className: 'st-dialogHead' },
              h('span', { className: 'st-dialogTitle' }, title),
              h(
                'div',
                { className: 'st-quickHeadActions' },
                onRefresh
                  ? h(IconButton, {
                      icon: 'refresh',
                      label: t('common.refresh'),
                      size: refreshSize,
                      onClick: onRefresh,
                      disabled: refreshDisabled,
                    })
                  : null,
                h(IconButton, { icon: 'close', label: t('common.close'), onClick: onClose }),
              ),
            ),
            hint ? h('div', { className: 'st-dialogHint' }, hint) : null,
            search || null,
            h('div', { className: 'st-dialogBody st-quickBody', ref: bodyRef }, body),
            errorLine || null,
            footer || null,
          ),
        )
      }

      /** Loading / error / empty / rows decision shared by both result lists. */
      function OverlayBody({ loading, error, rows, errorText, emptyText, onRetry, children }) {
        if (loading && rows.length === 0) return h(LoadingBlock, { lines: 2 })
        if (error && rows.length === 0) return h(ErrorBlock, { message: errorText, onRetry })
        if (rows.length === 0) return h('div', { className: 'st-quickEmpty' }, emptyText)
        return children
      }

      /** One task row in the quick switcher. */
      function QuickTaskRow({ task, workspace, locale, active, current, onHover, onChoose }) {
        const activityAt = Math.max(task.lastVisitedAt ?? 0, task.updatedAt ?? 0)
        return h(
          'button',
          {
            type: 'button',
            className: 'st-quickRow',
            'data-quick-active': String(active),
            onMouseEnter: onHover,
            onClick: onChoose,
          },
          h(
            'span',
            { className: 'st-quickMain' },
            h('span', { className: 'st-quickRowTitle', title: task.title }, task.title),
            h(
              'span',
              { className: 'st-quickRowMeta', title: workspace },
              workspace,
              ' · ',
              countText(t, locale, 'board.promptCount', task.promptCount ?? 0),
            ),
          ),
          current ? h(Chip, null, t('quick.current')) : null,
          h('span', { className: 'st-quickRowTime' }, activityAt > 0 ? dateTimeText(activityAt, locale) : ''),
        )
      }

      /** One selectable prompt row in the wait-for-nodes picker. */
      function WaitCandidateRow({ candidate, locale, selected, sessionTitle, onToggle }) {
        const meta = statusOf(candidate.status, t)
        const taskTitle = hasText(candidate.taskTitle) ? candidate.taskTitle : t('board.tasks')
        const workspace = workspaceTitle({ title: candidate.workspaceTitle, path: candidate.workspacePath }, t)
        return h(
          'button',
          {
            type: 'button',
            className: 'st-quickRow st-waitRow',
            'data-selected': String(selected),
            'aria-pressed': selected,
            onClick: onToggle,
          },
          h('span', { className: 'st-waitCheck', 'aria-hidden': true }, selected ? Icon('check', 11) : null),
          h(
            'span',
            { className: 'st-quickMain' },
            h('span', { className: 'st-quickRowTitle', title: candidate.text }, candidate.text),
            h(
              'span',
              { className: 'st-quickRowMeta', title: `${taskTitle} · ${workspace} · ${sessionTitle}` },
              taskTitle,
              ' · ',
              workspace,
              ' · ',
              sessionTitle,
            ),
          ),
          h(Chip, { tone: meta.tone }, meta.label),
          h('span', { className: 'st-quickRowTime' }, dateTimeText(candidate.createdAt, locale)),
        )
      }

      /** Stable commit id so a retried submit cannot create a second waiting node. */
      function createCommitId() {
        try {
          return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        } catch {
          return `${Date.now()}-${Math.random()}`
        }
      }

      // ---------------------------------------------------------------------
      // Quick task switcher
      // ---------------------------------------------------------------------

      function QuickSwitcher() {
        const locale = runtime.locale()
        const open = useStoreValue(runtime.quickOpen)
        const [tasks, setTasks] = React.useState(() => {
          const cached = payloadCache.get(constants.QUICK_TASKS_CACHE_KEY)
          return cached && Array.isArray(cached.tasks) ? cached.tasks : []
        })
        const [loading, setLoading] = React.useState(true)
        const [error, setError] = React.useState(null)
        const [query, setQuery] = React.useState('')
        const [activeIndex, setActiveIndex] = React.useState(0)
        const [reloadNonce, setReloadNonce] = React.useState(0)
        const inputRef = React.useRef(null)
        const bodyRef = React.useRef(null)

        React.useEffect(() => {
          if (!open) return undefined
          let alive = true
          const cached = payloadCache.get(constants.QUICK_TASKS_CACHE_KEY)
          const hasCached = Boolean(cached && Array.isArray(cached.tasks))
          if (hasCached) setTasks(cached.tasks)
          setLoading(!hasCached)
          setError(null)
          // Cached rows show immediately; the read retries and falls back to the
          // older workspace routes inside the runtime.
          runtime
            .fetchTaskSummaries()
            .then((payload) => {
              if (!alive) return
              const rows = Array.isArray(payload.tasks) ? payload.tasks : []
              setTasks(rows)
              rememberPayload(constants.QUICK_TASKS_CACHE_KEY, { tasks: rows })
            })
            .catch((failure) => {
              if (alive) setError(localizedError(failure, t))
            })
            .finally(() => {
              if (alive) setLoading(false)
            })
          return () => {
            alive = false
          }
        }, [open, reloadNonce, runtime, t])

        React.useEffect(() => {
          if (!open) return undefined
          setQuery('')
          setActiveIndex(0)
          const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
          return () => window.clearTimeout(timer)
        }, [open])

        const ordered = React.useMemo(() => {
          if (!open) return []
          const needle = query.trim().toLowerCase()
          const filtered = needle
            ? tasks.filter((task) => {
                const workspace = workspaceTitle({ title: task.workspaceTitle, path: task.workspacePath }, t)
                return `${task.title || ''}\n${workspace}\n${task.workspacePath || ''}`.toLowerCase().includes(needle)
              })
            : tasks
          // Score once per task instead of once per comparison.
          const now = Date.now()
          return filtered
            .map((task) => ({ task, score: taskVisitScore(task, now) }))
            .sort(
              (left, right) =>
                right.score - left.score ||
                (right.task.updatedAt ?? 0) - (left.task.updatedAt ?? 0) ||
                String(left.task.title).localeCompare(String(right.task.title)),
            )
            .map((entry) => entry.task)
        }, [open, query, tasks, t])

        React.useEffect(() => {
          setActiveIndex((index) => (ordered.length === 0 ? 0 : Math.min(index, ordered.length - 1)))
        }, [ordered.length])

        React.useEffect(() => {
          if (!open) return
          const row = bodyRef.current?.querySelector('[data-quick-active="true"]')
          row?.scrollIntoView({ block: 'nearest' })
        }, [activeIndex, open, ordered])

        if (!open) return null

        const currentTaskId =
          runtime.isPanelActive() && runtime.memory.view?.kind === 'task' ? runtime.memory.view.taskId : null
        const choose = (task) => {
          if (task) runtime.navigateToTask(task.workspaceId, task.id)
        }
        const onInputKeyDown = (event) => {
          if (isImeComposing(event)) return
          if (event.key === 'Escape') {
            event.preventDefault()
            runtime.closeQuickSwitcher()
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => (ordered.length === 0 ? 0 : Math.min(ordered.length - 1, index + 1)))
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => Math.max(0, index - 1))
            return
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            choose(ordered[activeIndex])
          }
        }
        const reload = () => setReloadNonce((value) => value + 1)

        return h(
          OverlayShell,
          {
            title: t('quick.title'),
            onClose: () => runtime.closeQuickSwitcher(),
            onRefresh: reload,
            refreshSize: 14,
            onKeyDown: (event) => {
              if (event.key !== 'Escape' || isImeComposing(event)) return
              event.preventDefault()
              runtime.closeQuickSwitcher()
            },
            search: h(SearchField, {
              value: query,
              onInput: (value) => {
                setQuery(value)
                setActiveIndex(0)
              },
              placeholder: t('quick.search'),
              label: t('quick.search'),
              inputRef,
              onKeyDown: onInputKeyDown,
            }),
            bodyRef,
            body: h(
              OverlayBody,
              {
                loading,
                error,
                rows: ordered,
                errorText: t('error.loadTasks', { message: error }),
                emptyText: query.trim() ? t('quick.noMatches') : t('quick.empty'),
                onRetry: reload,
              },
              ordered.map((task, index) =>
                h(QuickTaskRow, {
                  key: task.id,
                  task,
                  workspace: workspaceTitle({ title: task.workspaceTitle, path: task.workspacePath }, t),
                  locale,
                  active: index === activeIndex,
                  current: task.id === currentTaskId,
                  onHover: () => setActiveIndex(index),
                  onChoose: () => choose(task),
                }),
              ),
            ),
            errorLine:
              error && ordered.length > 0
                ? h(Notice, { tone: 'error' }, t('error.loadTasks', { message: error }))
                : null,
            footer: h('div', { className: 'st-quickFoot' }, t('quick.hint')),
          },
        )
      }

      // ---------------------------------------------------------------------
      // Wait-for-nodes picker
      // ---------------------------------------------------------------------

      function WaitPicker() {
        const locale = runtime.locale()
        const picker = useStoreValue(runtime.waitPicker)
        const open = Boolean(picker)
        const sessionRows = useSessionRows(runtime)
        const [candidates, setCandidates] = React.useState([])
        const [loading, setLoading] = React.useState(false)
        const [error, setError] = React.useState(null)
        const [query, setQuery] = React.useState('')
        const [selected, setSelected] = React.useState(() => new Set())
        const [submitting, setSubmitting] = React.useState(false)
        const [reloadNonce, setReloadNonce] = React.useState(0)
        const commitRef = React.useRef(null)
        const scopeRef = React.useRef(null)
        const inputRef = React.useRef(null)

        React.useEffect(() => {
          if (!open) return undefined
          let alive = true
          setLoading(true)
          setError(null)
          runtime.api
            .promptCandidates()
            .then((payload) => {
              if (!alive) return
              const prompts = Array.isArray(payload.prompts) ? payload.prompts : []
              setCandidates(prompts)
              // A node deleted since the last opening must not remain selected
              // invisibly; prune it so the footer count matches what is shown.
              const visible = new Set(prompts.map((prompt) => prompt.id))
              setSelected((current) => {
                if (current.size === 0) return current
                const next = new Set([...current].filter((id) => visible.has(id)))
                return next.size === current.size ? current : next
              })
            })
            .catch((failure) => {
              if (alive) setError(localizedError(failure, t))
            })
            .finally(() => {
              if (alive) setLoading(false)
            })
          return () => {
            alive = false
          }
        }, [open, picker?.sessionId, picker?.taskId, reloadNonce, runtime, t])

        React.useEffect(() => {
          if (!open) return undefined
          setQuery('')
          setSubmitting(false)
          const scope = `${picker?.workspaceId ?? ''}|${picker?.sessionId ?? ''}|${picker?.taskId ?? ''}`
          if (scopeRef.current !== scope) {
            scopeRef.current = scope
            setSelected(new Set())
            commitRef.current = null
          }
          const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
          return () => window.clearTimeout(timer)
        }, [open, picker?.workspaceId, picker?.sessionId, picker?.taskId])

        const titleOf = (candidate) => {
          const session = sessionRows[candidate.sessionId]
          return hasText(session?.title) ? session.title.trim() : t('group.untitled')
        }
        const filtered = React.useMemo(() => {
          const needle = query.trim().toLowerCase()
          if (!needle) return candidates
          return candidates.filter((candidate) => {
            const haystack = [
              candidate.text,
              candidate.taskTitle,
              candidate.workspaceTitle,
              candidate.workspacePath,
              titleOf(candidate),
            ]
              .filter(Boolean)
              .join('\n')
              .toLowerCase()
            return haystack.includes(needle)
          })
        }, [candidates, query, sessionRows, t])

        if (!open) return null

        const toggle = (id) => {
          commitRef.current = null
          setSelected((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
          setError(null)
        }
        const submit = async () => {
          if (selected.size === 0) {
            setError(t('wait.error.select'))
            return
          }
          setSubmitting(true)
          setError(null)
          if (!commitRef.current) commitRef.current = createCommitId()
          try {
            await runtime.submitWaitingDraft(picker, [...selected], commitRef.current)
            commitRef.current = null
            setSelected(new Set())
            runtime.closeWaitPicker()
          } catch (failure) {
            setError(localizedError(failure, t))
          } finally {
            setSubmitting(false)
          }
        }
        const reload = () => setReloadNonce((value) => value + 1)

        return h(
          OverlayShell,
          {
            title: t('wait.title'),
            hint: t('wait.hint'),
            onClose: () => runtime.closeWaitPicker(),
            onRefresh: reload,
            refreshDisabled: loading || submitting,
            onKeyDown: (event) => {
              if (event.key !== 'Escape' || isImeComposing(event)) return
              event.preventDefault()
              runtime.closeWaitPicker()
            },
            search: h(SearchField, {
              value: query,
              onInput: setQuery,
              placeholder: t('wait.search'),
              label: t('wait.search'),
              clearLabel: t('wait.clearSearch'),
              inputRef,
            }),
            body: h(
              OverlayBody,
              {
                loading,
                error,
                rows: filtered,
                errorText: t('error.loadCandidates', { message: error }),
                emptyText: query.trim() ? t('wait.noMatches') : t('wait.empty'),
                onRetry: reload,
              },
              filtered.map((candidate) =>
                h(WaitCandidateRow, {
                  key: candidate.id,
                  candidate,
                  locale,
                  selected: selected.has(candidate.id),
                  sessionTitle: titleOf(candidate),
                  onToggle: () => toggle(candidate.id),
                }),
              ),
            ),
            errorLine: error && candidates.length > 0 ? h('div', { className: 'st-waitError' }, error) : null,
            footer: h(
              'div',
              { className: 'st-waitFoot' },
              h('span', { className: 'st-waitCount' }, countText(t, locale, 'wait.selected', selected.size)),
              h(
                'button',
                {
                  type: 'button',
                  className: 'st-waitSubmit',
                  title: t(submitting ? 'wait.submitting' : 'wait.submit'),
                  'aria-label': t('wait.submit'),
                  disabled: submitting || selected.size === 0,
                  onClick: submit,
                },
                Icon('sendWait', 16),
              ),
            ),
          },
        )
      }

      return { QuickSwitcher, WaitPicker }
    }

    return { createOverlays }
  },
})
