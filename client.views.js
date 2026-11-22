// Panel views: overview of workspaces, the task board and the prompt board.
//
// DSH serves this file next to client.js and materializes it on the first
// activation of the task-center panel. Components close over the environment
// (translator, runtime, UI kit, hooks) instead of reaching through React
// context, so the module needs no shared provider.
// The registration id must equal package.json "name" (see client.js).
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  chunk: 'client.views.js',
  factory() {
    function createViews(env) {
      const { React, h, t, runtime, constants, ui, hooks, format, models, cacheKeys } = env
      const { Icon, PageHeader, IconButton, RefreshButton, PrimaryButton, SecondaryButton, LoadingBlock, ErrorBlock, EmptyBlock, Notice, Chip } = ui
      const { usePolled, useStoreValue, useSessionRows } = hooks
      const {
        hasText,
        isImeComposing,
        messageOf,
        localizedError,
        dateTimeText,
        countText,
        workspaceTitle,
        payloadCache,
      } = format
      const { statusOf, groupPrompts, summarizePrompts } = models
      const { PKG, JUMP_NOTICE_TTL_MS } = constants

      // ---------------------------------------------------------------------
      // Overview
      // ---------------------------------------------------------------------

      function Overview({ active, onOpen }) {
        const locale = runtime.locale()
        const { data, error, reload } = usePolled(() => runtime.api.workspaces(), cacheKeys.workspaces, { active, interval: 4000 })
        const workspaces = data?.workspaces ?? []
        const header = h(PageHeader, {
          eyebrow: t('app.eyebrow'),
          title: t('overview.title'),
          subtitle: t('overview.subtitle'),
          actions: [
            h('span', { className: 'st-muted', key: 'count' }, countText(t, locale, 'overview.count', workspaces.length)),
            h(SecondaryButton, { key: 'quick', onClick: runtime.openQuickSwitcher, icon: 'switch' }, t('quick.open')),
            h(RefreshButton, { key: 'refresh', onClick: reload }),
          ],
        })
        let body
        if (!data && error) {
          body = h(ErrorBlock, { message: t('error.loadWorkspaces', { message: error }), onRetry: reload })
        } else if (!data) {
          body = h(LoadingBlock, { lines: 3 })
        } else if (workspaces.length === 0) {
          body = h(EmptyBlock, { title: t('overview.workspaces'), hint: t('overview.empty') })
        } else {
          body = h(
            'div',
            { className: 'st-grid' },
            ...workspaces.map((workspace) =>
              h(
                'button',
                { type: 'button', className: 'st-wsCard', key: workspace.id, onClick: () => onOpen(workspace) },
                h(
                  'span',
                  { className: 'st-wsTitleRow' },
                  Icon('folder', 15),
                  h('span', { className: 'st-wsTitle' }, workspaceTitle(workspace, t)),
                ),
                h('span', { className: 'st-wsPath', title: workspace.path || '' }, workspace.path || '—'),
                h(
                  'span',
                  { className: 'st-chips' },
                  h(Chip, null, countText(t, locale, 'overview.taskCount', workspace.taskCount ?? 0)),
                  h(Chip, null, countText(t, locale, 'overview.promptCount', workspace.promptCount ?? 0)),
                  workspace.activePromptCount > 0
                    ? h(Chip, { tone: 'run' }, t('overview.activeCount', { count: workspace.activePromptCount }))
                    : null,
                ),
                h(
                  'span',
                  { className: 'st-cardFoot' },
                  h('span', null, workspace.lastActivityAt > 0 ? t('overview.lastActivity', { time: dateTimeText(workspace.lastActivityAt, locale) }) : t('overview.noActivity')),
                  h('span', { className: 'st-cardEnter' }, t('overview.open'), '›'),
                ),
              ),
            ),
          )
        }
        return h(
          React.Fragment,
          null,
          header,
          error && data ? h(Notice, { tone: 'error' }, t('error.loadWorkspaces', { message: error })) : null,
          body,
        )
      }

      // ---------------------------------------------------------------------
      // Task board
      // ---------------------------------------------------------------------

      function Board({ active, workspaceId, onBack, onOpenTask }) {
        const locale = runtime.locale()
        const { data, error, reload } = usePolled(
          () => runtime.api.workspace(workspaceId),
          cacheKeys.board(workspaceId),
          { active, interval: 2000 },
        )
        const [creating, setCreating] = React.useState(false)
        const [busy, setBusy] = React.useState(false)
        const [notice, setNotice] = React.useState(null)
        const workspace = data?.workspace ?? null
        const tasks = data?.tasks ?? []

        const createTask = async ({ title, description }) => {
          setBusy(true)
          setNotice(null)
          try {
            await runtime.api.createTask(workspaceId, { title, description })
            setCreating(false)
            setNotice(t('board.created'))
            reload()
          } catch (failure) {
            setNotice(localizedError(failure, t))
          } finally {
            setBusy(false)
          }
        }

        const header = h(PageHeader, {
          eyebrow: t('app.eyebrow'),
          title: workspace ? workspaceTitle(workspace, t) : t('board.tasks'),
          subtitle: workspace?.path || '',
          back: { label: t('board.back'), onClick: onBack },
          actions: [
            h('span', { key: 'count', className: 'st-muted' }, countText(t, locale, 'board.taskCount', tasks.length)),
            h(PrimaryButton, { key: 'new', onClick: () => setCreating((value) => !value), disabled: busy, icon: 'plus' }, t('board.newTask')),
            h(SecondaryButton, { key: 'quick', onClick: runtime.openQuickSwitcher, icon: 'switch' }, t('quick.open')),
            h(RefreshButton, { key: 'refresh', onClick: reload }),
          ],
        })

        let body
        if (!data && error) {
          body = h(ErrorBlock, { message: t('error.loadWorkspace', { message: error }), onRetry: reload })
        } else if (!data) {
          body = h(LoadingBlock, { lines: 3 })
        } else if (tasks.length === 0) {
          body = h(EmptyBlock, {
            title: t('board.noTasks'),
            hint: t('board.noTasksHint'),
            action: h(PrimaryButton, { onClick: () => setCreating(true), icon: 'plus' }, t('board.newTask')),
          })
        } else {
          body = h(
            'div',
            { className: 'st-grid' },
            ...tasks.map((task) =>
              h(
                'button',
                { type: 'button', className: 'st-taskCard', key: task.id, onClick: () => onOpenTask(task.id) },
                h(
                  'span',
                  { className: 'st-cardTitleRow' },
                  Icon('checklist', 15),
                  h('span', { className: 'st-cardTitle', title: task.title }, task.title),
                ),
                h(
                  'span',
                  { className: 'st-cardDesc st-clamp2' },
                  hasText(task.description) ? task.description : t('board.noDescription'),
                ),
                h(
                  'span',
                  { className: 'st-chips' },
                  h(Chip, null, countText(t, locale, 'board.promptCount', task.promptCount)),
                  task.sessionCount > 0 ? h(Chip, null, countText(t, locale, 'board.sessionCount', task.sessionCount)) : null,
                  task.activePromptCount > 0
                    ? h(Chip, { tone: 'run' }, t('board.activeCount', { count: task.activePromptCount }))
                    : null,
                  task.waitingPromptCount > 0
                    ? h(Chip, { tone: 'warn' }, countText(t, locale, 'task.waitingCount', task.waitingPromptCount))
                    : null,
                ),
                h(
                  'span',
                  { className: 'st-cardFoot' },
                  h('span', null, t('board.updated', { time: dateTimeText(task.updatedAt, locale) })),
                  h('span', { className: 'st-cardEnter' }, t('overview.open'), '›'),
                ),
              ),
            ),
          )
        }

        return h(
          React.Fragment,
          null,
          header,
          error && data ? h(Notice, { tone: 'error' }, t('error.loadWorkspace', { message: error })) : null,
          notice ? h(Notice, null, notice) : null,
          creating ? h(TaskCreateForm, { busy, onCreate: createTask, onCancel: () => setCreating(false) }) : null,
          body,
        )
      }
      // ---------------------------------------------------------------------
      // Prompt preview and picker
      // ---------------------------------------------------------------------

      function PromptPreview({ preview, onEnter, onLeave }) {
        const { prompt, index, group } = preview
        const meta = statusOf(prompt.status, t)
        const width = Math.min(440, (typeof window === 'undefined' ? 440 : window.innerWidth) - 24)
        const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
        const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
        let left = preview.rect.right + 14
        if (left + width > viewportWidth - 12) left = Math.max(12, preview.rect.left - width - 14)
        const maxHeight = Math.min(520, viewportHeight * 0.62)
        const top = Math.max(12, Math.min(preview.rect.top - 6, viewportHeight - maxHeight - 12))
        return h(
          'div',
          {
            className: 'st-preview',
            role: 'tooltip',
            'aria-label': t('preview.title'),
            style: { left, top, width, maxHeight },
            onMouseEnter: onEnter,
            onMouseLeave: onLeave,
          },
          h(
            'div',
            { className: 'st-previewHead' },
            h('span', { className: 'st-previewTitle' }, group.title),
            h(Chip, { tone: meta.tone }, meta.label),
            h(Chip, null, t('node.index', { index })),
          ),
          h('div', { className: 'st-previewText' }, prompt.text),
          prompt.error ? h('div', { className: 'st-previewFoot', style: { color: 'var(--dsw-alias-state-error-primary)' } }, prompt.error) : null,
          h('div', { className: 'st-previewFoot' }, `${dateTimeText(prompt.createdAt, runtime.locale())} · ${t('node.hint')}`),
        )
      }

      function SessionPicker({ sessions, counts, busy, onPick, onNewSession, onClose }) {
        const [query, setQuery] = React.useState('')
        React.useEffect(() => {
          const onKey = (event) => {
            if (event.key === 'Escape' && !isImeComposing(event)) onClose()
          }
          document.addEventListener('keydown', onKey)
          return () => document.removeEventListener('keydown', onKey)
        }, [onClose])
        const labelOf = (session) => (hasText(session.title) ? session.title.trim() : t('group.untitled'))
        const needle = query.trim().toLowerCase()
        const filtered = needle
          ? sessions.filter((session) => labelOf(session).toLowerCase().includes(needle))
          : sessions
        const options = filtered.map((session) =>
          h(
            'button',
            {
              type: 'button',
              className: 'st-option',
              key: session.sessionId,
              disabled: busy,
              onClick: () => onPick(session),
            },
            Icon('chat', 13),
            h('span', { className: 'st-optionTitle' }, labelOf(session)),
            session.live ? h(Chip, null, t('picker.live')) : null,
            counts.get(session.sessionId) > 0
              ? h(Chip, null, t('picker.existing', { count: counts.get(session.sessionId) }))
              : null,
          ),
        )
        let list
        if (sessions.length === 0) list = h('div', { className: 'st-optionEmpty' }, t('picker.empty'))
        else if (filtered.length === 0) list = h('div', { className: 'st-optionEmpty' }, t('picker.noMatches'))
        else list = options
        return h(
          'div',
          { className: 'st-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('picker.title') },
          h('div', { className: 'st-scrim', onClick: onClose }),
          h(
            'div',
            { className: 'st-dialog' },
            h(
              'div',
              { className: 'st-dialogHead' },
              h('span', { className: 'st-dialogTitle' }, t('picker.title')),
              h(IconButton, { icon: 'close', label: t('common.close'), onClick: onClose }),
            ),
            h('div', { className: 'st-dialogHint' }, t('picker.hint')),
            h(
              'div',
              { className: 'st-search' },
              h('span', { className: 'st-searchIcon' }, Icon('search', 13)),
              h('input', {
                className: 'st-searchInput',
                value: query,
                autoFocus: true,
                'aria-label': t('picker.search'),
                placeholder: t('picker.search'),
                onChange: (event) => setQuery(event.target.value),
              }),
              query
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'st-searchClear',
                      title: t('picker.clearSearch'),
                      'aria-label': t('picker.clearSearch'),
                      onClick: () => setQuery(''),
                    },
                    Icon('close', 11),
                  )
                : null,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'st-option st-newSession',
                disabled: busy,
                onClick: onNewSession,
              },
              Icon('plus', 13),
              h('span', { className: 'st-optionTitle' }, busy ? t('picker.creating') : t('picker.newSession')),
              h('span', { className: 'st-optionHint' }, t('picker.newSessionHint')),
            ),
            h('div', { className: 'st-optionDivider' }),
            h('div', { className: 'st-dialogBody' }, list),
          ),
        )
      }

      // ---------------------------------------------------------------------
      // Prompt node
      // ---------------------------------------------------------------------

      function PromptNode({ prompt, index, group, locale, onJump, onPreview, onPreviewEnd }) {
        const meta = statusOf(prompt.status, t)
        return h(
          'div',
          { className: 'st-nodeRow', 'data-status': meta.status, style: { '--st-accent': group.color } },
          h(
            'button',
            {
              type: 'button',
              className: 'st-node',
              onClick: () => onJump(prompt),
              onMouseEnter: (event) => onPreview(prompt, index, group, event.currentTarget),
              onFocus: (event) => onPreview(prompt, index, group, event.currentTarget),
              onMouseLeave: onPreviewEnd,
              onBlur: onPreviewEnd,
            },
            h('span', { className: 'st-nodeText' }, prompt.text),
            h(
              'span',
              { className: 'st-nodeMeta' },
              prompt.status !== 'done' ? h(Chip, { tone: meta.tone }, meta.label) : null,
              prompt.status === 'waiting' && Array.isArray(prompt.dependsOn) && prompt.dependsOn.length > 0
                ? h(Chip, { tone: 'warn' }, countText(t, locale, 'node.waitingFor', prompt.dependsOn.length))
                : null,
              h('span', null, dateTimeText(prompt.createdAt, locale)),
              prompt.error ? h('span', { className: 'st-nodeError', title: prompt.error }, prompt.error) : null,
            ),
          ),
        )
      }
      // ---------------------------------------------------------------------
      // Prompt board
      // ---------------------------------------------------------------------

      /** Preview popover lifecycle: delayed dismissal while the pointer crosses the gap. */
      function usePromptPreview() {
        const [preview, setPreview] = React.useState(null)
        const hideTimer = React.useRef(null)
        const cancelHide = React.useCallback(() => {
          if (hideTimer.current === null) return
          window.clearTimeout(hideTimer.current)
          hideTimer.current = null
        }, [])
        const clearPreview = React.useCallback(() => {
          cancelHide()
          setPreview(null)
        }, [cancelHide])
        const scheduleHide = React.useCallback(() => {
          cancelHide()
          hideTimer.current = window.setTimeout(() => {
            hideTimer.current = null
            setPreview(null)
          }, 180)
        }, [cancelHide])
        const showPreview = React.useCallback(
          (prompt, index, group, element) => {
            cancelHide()
            setPreview({ prompt, index, group, rect: element.getBoundingClientRect() })
          },
          [cancelHide],
        )
        React.useEffect(
          () => () => {
            if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
          },
          [],
        )
        // The popover is anchored to a row rectangle, so scrolling or resizing
        // makes it point at the wrong place; dismiss instead of repositioning.
        React.useEffect(() => {
          if (!preview) return undefined
          const hide = (event) => {
            if (event?.target instanceof Element && event.target.closest('.st-preview')) return
            setPreview(null)
          }
          window.addEventListener('scroll', hide, true)
          window.addEventListener('resize', hide)
          return () => {
            window.removeEventListener('scroll', hide, true)
            window.removeEventListener('resize', hide)
          }
        }, [preview])
        return { preview, showPreview, scheduleHide, cancelHide, clearPreview }
      }

      /** Task title line, or its inline editor. */
      function TaskTitleField({ task, editor, busy, onEdit, onChange, onSave, onCancel }) {
        if (editor?.field !== 'title') {
          return h(
            'div',
            { className: 'st-taskTitleRow' },
            h('h1', { className: 'st-pageTitle', title: task.title }, task.title),
            h(IconButton, { icon: 'pencil', label: t('task.editTitle'), onClick: () => onEdit(task.title) }),
          )
        }
        return h(
          'div',
          { className: 'st-inlineEditor' },
          h('input', {
            className: 'st-input st-titleInput',
            value: editor.value,
            maxLength: 200,
            autoFocus: true,
            'aria-label': t('form.title'),
            onChange: (event) => onChange(event.target.value),
            onKeyDown: (event) => {
              if (isImeComposing(event)) return
              if (event.key === 'Enter') void onSave()
              if (event.key === 'Escape') onCancel()
            },
          }),
          h(
            'div',
            { className: 'st-formActions' },
            h(PrimaryButton, { onClick: onSave, disabled: busy || !editor.value.trim(), icon: 'check' }, t('common.save')),
            h(SecondaryButton, { onClick: onCancel, disabled: busy }, t('common.cancel')),
          ),
        )
      }

      /** Task description line, or its inline editor. */
      function TaskDescriptionField({ task, editor, busy, onEdit, onChange, onSave, onCancel }) {
        if (editor?.field !== 'description') {
          return h(
            'div',
            { className: 'st-taskDesc' },
            h(
              'p',
              { className: 'st-taskDescText', 'data-empty': String(!hasText(task.description)) },
              hasText(task.description) ? task.description : t('task.noDescription'),
            ),
            h(IconButton, { icon: 'pencil', label: t('task.editDescription'), onClick: () => onEdit(task.description ?? '') }),
          )
        }
        return h(
          'div',
          { className: 'st-inlineEditor' },
          h('textarea', {
            className: 'st-textarea',
            value: editor.value,
            maxLength: 600,
            rows: 3,
            autoFocus: true,
            placeholder: t('form.descriptionPlaceholder'),
            onChange: (event) => onChange(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Escape' && !isImeComposing(event)) onCancel()
            },
          }),
          h(
            'div',
            { className: 'st-formActions' },
            h(PrimaryButton, { onClick: onSave, disabled: busy, icon: 'check' }, t('common.save')),
            h(SecondaryButton, { onClick: onCancel, disabled: busy }, t('common.cancel')),
          ),
        )
      }

      /** Prompt-board header: task title/description, actions and state counters. */
      function TaskHeader({ task, groups, locale, editor, busy, onBack, onEditTitle, onEditDescription, onEditorChange, onSaveEditor, onCancelEditor, onAddPrompt, onToggleDelete, onRefresh }) {
        const { active, waiting } = summarizePrompts(task.prompts)
        return h(
          'div',
          { className: 'st-taskHead' },
          h(PageHeader, {
            eyebrow: t('app.eyebrow'),
            title: h(TaskTitleField, {
              task,
              editor,
              busy,
              onEdit: onEditTitle,
              onChange: (value) => onEditorChange('title', value),
              onSave: onSaveEditor,
              onCancel: onCancelEditor,
            }),
            subtitle: h(TaskDescriptionField, {
              task,
              editor,
              busy,
              onEdit: onEditDescription,
              onChange: (value) => onEditorChange('description', value),
              onSave: onSaveEditor,
              onCancel: onCancelEditor,
            }),
            back: { label: t('task.back'), onClick: onBack },
            actions: [
              h(PrimaryButton, { key: 'add', onClick: onAddPrompt, disabled: busy, icon: 'plus' }, t('task.addPrompt')),
              h(SecondaryButton, { key: 'quick', onClick: runtime.openQuickSwitcher, icon: 'switch' }, t('quick.open')),
              h(RefreshButton, { key: 'refresh', onClick: onRefresh }),
              h(IconButton, {
                key: 'delete',
                icon: 'trash',
                label: t('task.delete'),
                size: 14,
                danger: true,
                disabled: busy,
                onClick: onToggleDelete,
              }),
            ],
          }),
          h(
            'div',
            { className: 'st-taskMeta' },
            h(Chip, null, countText(t, locale, 'task.promptCount', task.prompts.length)),
            task.prompts.length > 0 ? h(Chip, null, countText(t, locale, 'board.sessionCount', groups.length)) : null,
            active > 0 ? h(Chip, { tone: 'run' }, t('board.activeCount', { count: active })) : null,
            waiting > 0 ? h(Chip, { tone: 'warn' }, countText(t, locale, 'task.waitingCount', waiting)) : null,
            h('span', { className: 'st-muted' }, t('task.updated', { time: dateTimeText(task.updatedAt, locale) })),
          ),
        )
      }

      /** Task-level destructive confirmation strip. */
      function ConfirmDeleteBar({ task, busy, onConfirm, onCancel }) {
        return h(
          'div',
          { className: 'st-confirm' },
          h('span', null, t('task.deleteConfirm', { title: task.title })),
          h('button', { type: 'button', className: 'st-btn', 'data-danger': 'true', disabled: busy, onClick: onConfirm }, t('common.delete')),
          h('button', { type: 'button', className: 'st-btn', disabled: busy, onClick: onCancel }, t('common.cancel')),
        )
      }

      /** Result of the last native locator attempt, scoped to this task. */
      function JumpNoticeBar({ notice, onDismiss }) {
        return h(
          'div',
          { className: 'st-jumpNotice', 'data-tone': notice.status === 'error' ? 'error' : 'info' },
          h('span', null, notice.text),
          h(IconButton, { icon: 'close', label: t('common.close'), size: 12, onClick: onDismiss }),
        )
      }

      /** One Session branch: header, inline rename editor and its prompt chain. */
      function SessionGroup({
        group,
        locale,
        sessionEditor,
        sessionBusy,
        onStartRename,
        onEditorChange,
        onSaveRename,
        onCancelRename,
        onOpenSession,
        onJump,
        onPreview,
        onPreviewEnd,
      }) {
        const editing = Boolean(!group.missing && sessionEditor && sessionEditor.sessionId === group.sessionId)
        const chain = []
        // Newest first, keeping the ascending prompt order for the index.
        for (let index = group.prompts.length - 1; index >= 0; index -= 1) {
          const prompt = group.prompts[index]
          chain.push(
            h(PromptNode, {
              key: prompt.id,
              prompt,
              index: index + 1,
              group,
              locale,
              onJump,
              onPreview,
              onPreviewEnd,
            }),
          )
        }
        return h(
          'section',
          { className: 'st-group', style: { '--st-accent': group.color } },
          h(
            'div',
            { className: 'st-groupHead' },
            h('span', { className: 'st-groupTitle', title: group.title }, group.title),
            h(Chip, null, countText(t, locale, 'group.count', group.prompts.length)),
            group.live ? h(Chip, { tone: 'run' }, t('group.live')) : null,
            h(
              'div',
              { className: 'st-groupActions' },
              group.sessionId && !group.missing
                ? h(IconButton, {
                    icon: 'pencil',
                    label: t('group.rename'),
                    disabled: sessionBusy,
                    onClick: () => onStartRename(group.sessionId),
                  })
                : null,
              group.sessionId
                ? h(IconButton, { icon: 'external', label: t('group.open'), onClick: () => onOpenSession(group.sessionId) })
                : null,
            ),
          ),
          editing
            ? h(
                'div',
                { className: 'st-sessionEditor' },
                h('input', {
                  className: 'st-input',
                  value: sessionEditor.value,
                  maxLength: 200,
                  autoFocus: true,
                  'aria-label': t('group.rename'),
                  placeholder: t('group.renamePlaceholder'),
                  disabled: sessionBusy,
                  onChange: (event) => onEditorChange(group.sessionId, event.target.value),
                  onKeyDown: (event) => {
                    if (isImeComposing(event)) return
                    if (event.key === 'Enter') void onSaveRename()
                    if (event.key === 'Escape' && !sessionBusy) onCancelRename()
                  },
                }),
                h(PrimaryButton, { onClick: onSaveRename, disabled: sessionBusy || !sessionEditor.value.trim(), icon: 'check' }, t('common.save')),
                h(SecondaryButton, { onClick: onCancelRename, disabled: sessionBusy }, t('common.cancel')),
              )
            : null,
          h('div', { className: 'st-chain' }, ...chain),
        )
      }

      function TaskDetail({ active, workspaceId, taskId, onBack }) {
        const locale = runtime.locale()
        const { data, error, reload } = usePolled(
          () => runtime.api.task(workspaceId, taskId),
          cacheKeys.task(workspaceId, taskId),
          { active, interval: 2000 },
        )
        const jumpState = useStoreValue(runtime.jumpNotice)
        const jump = React.useMemo(() => {
          if (!jumpState || jumpState.status === 'done' || jumpState.status === 'locating') return null
          if (jumpState.workspaceId !== workspaceId || jumpState.taskId !== taskId) return null
          if (!Number.isFinite(jumpState.at) || Date.now() - jumpState.at > JUMP_NOTICE_TTL_MS) return null
          return jumpState
        }, [jumpState, workspaceId, taskId])
        const [editor, setEditor] = React.useState(null)
        const [busy, setBusy] = React.useState(false)
        const [notice, setNotice] = React.useState(null)
        const [confirmDelete, setConfirmDelete] = React.useState(false)
        const [picker, setPicker] = React.useState(false)
        const [sessionEditor, setSessionEditor] = React.useState(null)
        const [sessionBusy, setSessionBusy] = React.useState(false)
        const { preview, showPreview, scheduleHide, cancelHide, clearPreview } = usePromptPreview()

        const task = data?.task ?? null
        const workspace = data?.workspace ?? null
        // The Client Session list carries canonical titles. Subscribing (rather
        // than reading once per poll) mirrors a sidebar rename immediately and
        // lets the plugin's own rename update both surfaces.
        const sessionRows = useSessionRows(runtime)
        const sessions = React.useMemo(() => {
          if (!workspace) return []
          return (workspace.sessionIds ?? []).map((sessionId) => {
            const summary = sessionRows[sessionId]
            return { sessionId, title: summary?.title ?? null, live: Boolean(summary?.running) }
          })
        }, [workspace, sessionRows])
        const groups = React.useMemo(
          () => groupPrompts(task?.prompts ?? [], sessions, t),
          [task?.prompts, sessions, t],
        )
        const counts = React.useMemo(() => {
          const bySession = new Map()
          for (const prompt of task?.prompts ?? []) {
            if (!prompt.sessionId) continue
            bySession.set(prompt.sessionId, (bySession.get(prompt.sessionId) ?? 0) + 1)
          }
          return bySession
        }, [task?.prompts])

        React.useEffect(() => {
          setSessionEditor(null)
          setSessionBusy(false)
          setNotice(null)
        }, [taskId])

        // Drop a notice the moment it stops describing this board: a previous
        // task's failure, a finished locator left behind by an aborted jump, or
        // an old result from an earlier visit.
        React.useEffect(() => {
          const current = runtime.jumpNotice.get()
          if (!current) return
          const foreign = current.workspaceId !== workspaceId || current.taskId !== taskId
          const stale = !Number.isFinite(current.at) || Date.now() - current.at > JUMP_NOTICE_TTL_MS
          if (foreign || stale || current.status === 'done' || current.status === 'locating') {
            runtime.jumpNotice.set(null)
          }
        }, [runtime, workspaceId, taskId])

        React.useEffect(() => {
          if (active) runtime.recordTaskVisit(workspaceId, taskId)
        }, [active, taskId, workspaceId, runtime])

        const goBack = () => {
          const current = runtime.jumpNotice.get()
          if (current && current.workspaceId === workspaceId && current.taskId === taskId) {
            runtime.jumpNotice.set(null)
          }
          clearPreview()
          onBack()
        }

        const changeEditor = (field, value) => setEditor({ field, value })
        const cancelEditor = () => setEditor(null)

        const saveEditor = async () => {
          if (!editor || !task) return
          const title = editor.field === 'title' ? editor.value.trim() : task.title
          if (!title) {
            setNotice(t('errors.titleRequired'))
            return
          }
          const description = editor.field === 'description' ? editor.value : task.description ?? ''
          setBusy(true)
          setNotice(null)
          try {
            await runtime.api.updateTask(workspaceId, taskId, { title, description })
            setEditor(null)
            setNotice(t('task.saved'))
            reload()
          } catch (failure) {
            setNotice(localizedError(failure, t))
          } finally {
            setBusy(false)
          }
        }

        const deleteTask = async () => {
          if (!task) return
          setBusy(true)
          try {
            await runtime.api.deleteTask(workspaceId, taskId)
            payloadCache.delete(cacheKeys.task(workspaceId, taskId))
            payloadCache.delete(cacheKeys.board(workspaceId))
            onBack()
          } catch (failure) {
            setNotice(localizedError(failure, t))
            setBusy(false)
          }
        }

        const saveSessionTitle = async () => {
          if (!sessionEditor || sessionBusy) return
          const title = sessionEditor.value.trim()
          if (!title) {
            setNotice(t('errors.sessionTitleRequired'))
            return
          }
          setSessionBusy(true)
          setNotice(null)
          try {
            await runtime.renameSession(sessionEditor.sessionId, title)
            setSessionEditor(null)
            setNotice(t('task.sessionRenamed'))
          } catch (failure) {
            setNotice(localizedError(failure, t))
          } finally {
            setSessionBusy(false)
          }
        }

        const taskContext = () => ({ workspaceId, taskId, taskTitle: task?.title ?? '' })

        const openSessionOnly = (sessionId) => {
          try {
            runtime.serviceOf('uiWorkspace')?.openSession?.(sessionId)
          } catch (failure) {
            setNotice(t('error.request', { message: messageOf(failure) }))
          }
        }

        // Every entry from this prompt board attributes the session to this task.
        // The binding lasts until the user returns to the board or uses the
        // sidebar, so the picker, a node jump, and the group link all agree.
        const enterSession = (sessionId) => {
          if (!task) return
          runtime.bindTaskSession(sessionId, taskContext()).catch((failure) => {
            console.warn(`[${PKG}] could not attribute the session to task ${taskId}`, failure)
          })
          openSessionOnly(sessionId)
        }

        const finishCapture = (sessionId) => {
          if (!task) return
          setPicker(false)
          setNotice(null)
          openSessionOnly(sessionId)
        }

        const armCapture = async (session) => {
          if (!task) return
          setBusy(true)
          setNotice(null)
          try {
            await runtime.bindTaskSession(session.sessionId, taskContext())
            finishCapture(session.sessionId)
          } catch (failure) {
            setPicker(false)
            setNotice(localizedError(failure, t))
          } finally {
            setBusy(false)
          }
        }

        const createSession = async () => {
          if (!task || busy) return
          setBusy(true)
          setNotice(null)
          try {
            const uiWorkspace = runtime.serviceOf('uiWorkspace')
            if (!uiWorkspace?.connectWorkspace) throw new Error('workspace navigation is unavailable')
            const sessionId = await uiWorkspace.connectWorkspace(workspaceId)
            // The workspace registry may not expose the fresh session yet; the
            // arm call is idempotent, so retry the documented race a few times.
            let lastError = null
            for (let attempt = 0; attempt < 3; attempt += 1) {
              try {
                await runtime.bindTaskSession(sessionId, taskContext(), { newSession: true })
                lastError = null
                break
              } catch (failure) {
                lastError = failure
                if (failure?.code !== 'session_not_in_workspace') break
                await new Promise((resolve) => window.setTimeout(resolve, 250))
              }
            }
            if (lastError) throw lastError
            finishCapture(sessionId)
          } catch (failure) {
            setPicker(false)
            setNotice(localizedError(failure, t))
          } finally {
            setBusy(false)
          }
        }

        const jumpTo = (prompt) => {
          clearPreview()
          void runtime.jumpToPrompt(prompt, taskContext())
        }

        const openPicker = () => setPicker(true)

        if (!data && error) {
          return h(
            React.Fragment,
            null,
            h(PageHeader, {
              eyebrow: t('app.eyebrow'),
              title: t('task.back'),
              back: { label: t('task.back'), onClick: goBack },
              actions: [],
            }),
            h(ErrorBlock, { message: t('error.loadTask', { message: error }), onRetry: reload }),
          )
        }

        if (!data || !task) {
          return h(
            React.Fragment,
            null,
            h(PageHeader, {
              eyebrow: t('app.eyebrow'),
              title: t('board.tasks'),
              back: { label: t('task.back'), onClick: goBack },
              actions: [],
            }),
            h(LoadingBlock, { lines: 3 }),
          )
        }

        return h(
          React.Fragment,
          null,
          h(TaskHeader, {
            task,
            groups,
            locale,
            editor,
            busy,
            onBack: goBack,
            onEditTitle: (value) => setEditor({ field: 'title', value }),
            onEditDescription: (value) => setEditor({ field: 'description', value }),
            onEditorChange: changeEditor,
            onSaveEditor: saveEditor,
            onCancelEditor: cancelEditor,
            onAddPrompt: openPicker,
            onToggleDelete: () => setConfirmDelete((value) => !value),
            onRefresh: reload,
          }),
          error ? h(Notice, { tone: 'error' }, t('error.loadTask', { message: error })) : null,
          notice ? h(Notice, null, notice) : null,
          jump ? h(JumpNoticeBar, { notice: jump, onDismiss: () => runtime.jumpNotice.set(null) }) : null,
          confirmDelete ? h(ConfirmDeleteBar, { task, busy, onConfirm: deleteTask, onCancel: () => setConfirmDelete(false) }) : null,
          groups.length === 0
            ? h(EmptyBlock, {
                title: t('task.noPrompts'),
                hint: t('task.noPromptsHint'),
                action: h(PrimaryButton, { onClick: openPicker, icon: 'plus' }, t('task.addPrompt')),
              })
            : h(
                'div',
                { className: 'st-groups' },
                ...groups.map((group) =>
                  h(SessionGroup, {
                    key: group.id,
                    group,
                    locale,
                    sessionEditor,
                    sessionBusy,
                    onStartRename: (sessionId) => setSessionEditor({ sessionId, value: sessionRows[sessionId]?.title ?? '' }),
                    onEditorChange: (sessionId, value) => setSessionEditor({ sessionId, value }),
                    onSaveRename: saveSessionTitle,
                    onCancelRename: () => setSessionEditor(null),
                    onOpenSession: enterSession,
                    onJump: jumpTo,
                    onPreview: showPreview,
                    onPreviewEnd: scheduleHide,
                  }),
                ),
              ),
          picker
            ? h(SessionPicker, {
                sessions,
                counts,
                busy,
                onPick: armCapture,
                onNewSession: createSession,
                onClose: () => setPicker(false),
              })
            : null,
          preview
            ? h(PromptPreview, {
                preview,
                onEnter: cancelHide,
                onLeave: scheduleHide,
              })
            : null,
        )
      }

      // ---------------------------------------------------------------------
      // Root
      // ---------------------------------------------------------------------

      function TaskCenter({ active }) {
        const rootRef = React.useRef(null)
        const [view, setView] = React.useState(() => ({ ...runtime.memory.view }))
        React.useEffect(() => {
          runtime.memory.view = view
          if (rootRef.current) rootRef.current.scrollTop = 0
        }, [runtime, view])
        React.useEffect(() => {
          // The quick switcher can navigate while this panel is already mounted
          // (or before it mounts), so a store carries the requested view.
          const sync = () => {
            const request = runtime.viewRequest.get()
            if (!request) return
            runtime.viewRequest.set(null)
            setView({ ...request })
          }
          const dispose = runtime.viewRequest.subscribe(sync)
          sync()
          return dispose
        }, [runtime])
        let content
        if (view.kind === 'board') {
          content = h(Board, {
            // Remount on identity change: a board must never paint the previous
            // workspace/task payload while the next read is in flight, and local
            // editor/confirm state must not leak across boards.
            key: `board:${view.workspaceId}`,
            active,
            workspaceId: view.workspaceId,
            onBack: () => setView({ kind: 'overview' }),
            onOpenTask: (taskId) => setView({ kind: 'task', workspaceId: view.workspaceId, taskId }),
          })
        } else if (view.kind === 'task') {
          content = h(TaskDetail, {
            key: `task:${view.workspaceId}:${view.taskId}`,
            active,
            workspaceId: view.workspaceId,
            taskId: view.taskId,
            onBack: () => setView({ kind: 'board', workspaceId: view.workspaceId }),
          })
        } else {
          content = h(Overview, {
            active,
            onOpen: (workspace) => setView({ kind: 'board', workspaceId: workspace.id }),
          })
        }
        return h('div', { className: 'st-root', ref: rootRef }, h('div', { className: 'st-shell' }, content))
      }

      class TaskCenterBoundary extends React.Component {
        constructor(props) {
          super(props)
          this.state = { error: null, token: 0 }
          this.reset = this.reset.bind(this)
        }
        static getDerivedStateFromError(error) {
          return { error }
        }
        componentDidCatch(error) {
          console.error(`[${PKG}] task center render failed`, error)
        }
        reset() {
          this.props.resetView()
          this.setState((current) => ({ error: null, token: current.token + 1 }))
        }
        render() {
          const { t } = this.props.runtime
          if (this.state.error) {
            return h(
              'div',
              { className: 'st-root' },
              h(
                'div',
                { className: 'st-shell' },
                h('div', { className: 'st-error' }, t('error.render', { message: messageOf(this.state.error) })),
                h(PrimaryButton, { onClick: this.reset }, t('common.retry')),
              ),
            )
          }
          return h(TaskCenter, { active: this.props.active, key: this.state.token })
        }
      }

      // ---------------------------------------------------------------------
      // New-task form
      // ---------------------------------------------------------------------

      function TaskCreateForm({ busy, onCreate, onCancel }) {
        const [title, setTitle] = React.useState('')
        const [description, setDescription] = React.useState('')
        const submit = () => {
          if (busy || !title.trim()) return
          onCreate({ title: title.trim(), description })
        }
        return h(
          'div',
          { className: 'st-form' },
          h(
            'div',
            { className: 'st-fields' },
            h(
              'label',
              { className: 'st-field' },
              h('span', { className: 'st-label' }, t('form.title')),
              h('input', {
                className: 'st-input',
                value: title,
                maxLength: 200,
                autoFocus: true,
                placeholder: t('form.titlePlaceholder'),
                onChange: (event) => setTitle(event.target.value),
                onKeyDown: (event) => {
                  if (isImeComposing(event)) return
                  if (event.key === 'Enter') submit()
                  if (event.key === 'Escape') onCancel()
                },
              }),
            ),
            h(
              'label',
              { className: 'st-field' },
              h('span', { className: 'st-label' }, t('form.description')),
              h('textarea', {
                className: 'st-textarea',
                value: description,
                maxLength: 600,
                rows: 2,
                placeholder: t('form.descriptionPlaceholder'),
                onChange: (event) => setDescription(event.target.value),
              }),
            ),
          ),
          h(
            'div',
            { className: 'st-formActions' },
            h(PrimaryButton, { onClick: submit, disabled: busy || !title.trim(), icon: 'plus' }, t('form.create')),
            h(SecondaryButton, { onClick: onCancel, disabled: busy }, t('common.cancel')),
          ),
        )
      }

      // ---------------------------------------------------------------------
      // Panel root
      // ---------------------------------------------------------------------

      /**
       * Slot entry point. The render boundary lives in this chunk so a view bug
       * cannot take down the plugin entry or the other slots.
       * @param {{active: boolean}} props - layout activity, forwarded by the entry.
       */
      function Panel({ active }) {
        return h(TaskCenterBoundary, {
          active,
          runtime,
          resetView: () => {
            runtime.memory.view = { kind: 'overview' }
          },
        })
      }

      return { Panel }

    }

    return { createViews }
  },
})
