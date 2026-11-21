/**
 * Prompt capture and lifecycle.
 *
 * Opening a session from a task's prompt board binds that session to the task.
 * Every human message later inserted into that session becomes a prompt turn of
 * the task. The attribution is durable per session: only an explicit cancel,
 * deleting the task, or re-arming the session with another task ends it. The
 * native session owns queueing and execution; this module only records the real
 * request id / event seq / turn and derives the prompt status from the session's
 * own events.
 *
 * @module @local/dsh-session-todo/prompt-tracker
 */
import { MAX_PROMPT_CHARS, describe, newId, trimText } from './store.js'

const STATUS_KEYS = new Set(['queued', 'running'])

/**
 * Create the prompt tracker.
 * @param {{ctx: object, store: object, logger?: object}} options - Host dependencies.
 * @returns capture and lifecycle operations.
 */
export function createPromptTracker({ ctx, store, logger }) {
  const lastTurn = new Map()
  let lastPrune = 0

  const warn = (message, error) => {
    logger?.warn?.(`[session-todo] ${message}${error ? `: ${describe(error)}` : ''}`)
  }

  function findTask(workspaceId, taskId) {
    const bucket = store.data?.workspaces?.[workspaceId]
    const tasks = bucket?.tasks
    if (!tasks || !Object.hasOwn(tasks, taskId)) return null
    return { bucket, task: tasks[taskId] }
  }

  /**
   * Visit every stored prompt. `visit(task, prompt, workspaceId)` may return
   * true to stop the walk; the store must already be open.
   */
  function eachPrompt(visit) {
    for (const [workspaceId, bucket] of Object.entries(store.data.workspaces)) {
      for (const task of Object.values(bucket.tasks ?? {})) {
        for (const prompt of task.prompts ?? []) {
          if (visit(task, prompt, workspaceId)) return true
        }
      }
    }
    return false
  }

  function findPromptByRequestId(requestId) {
    if (!requestId || !store.data) return null
    let found = null
    eachPrompt((task, prompt) => {
      if (prompt.requestId !== requestId) return false
      found = { task, prompt }
      return true
    })
    return found
  }

  function promptsInSession(sessionId, statuses) {
    const found = []
    eachPrompt((_task, prompt) => {
      if (prompt.sessionId === sessionId && statuses.includes(prompt.status)) found.push(prompt)
      return false
    })
    return found
  }

  function touch(task, now = Date.now()) {
    task.updatedAt = now
  }

  function persist() {
    void store.save().catch((error) => warn('saving prompt state failed', error))
  }

  /** Durable last task for one native Session. */
  function sessionTask(sessionId) {
    return store.data?.sessionTasks?.[sessionId] ?? null
  }

  function deleteSessionTask(sessionId) {
    const map = store.data?.sessionTasks
    if (!map || !map[sessionId]) return false
    delete map[sessionId]
    return true
  }

  /**
   * Read the durable last attribution for one session. Unlike the previous
   * in-memory lease, this survives a Host restart and a Web UI reconnect.
   * @param {string} sessionId - native session id.
   * @returns public binding or null.
   */
  function get(sessionId) {
    const record = sessionTask(sessionId)
    if (!record) return null
    const found = findTask(record.workspaceId, record.taskId)
    if (!found) {
      // The task was deleted or the persisted record is stale.
      deleteSessionTask(sessionId)
      persist()
      return null
    }
    return publicBinding(sessionId, record, found.task.title)
  }

  /**
   * Record (or replace) the last task attribution of one session. The write is
   * persisted by the caller; entering a session from anywhere reads it back.
   */
  function arm(sessionId, workspaceId, taskId) {
    const found = findTask(workspaceId, taskId)
    if (!found) return null
    const now = Date.now()
    store.data.sessionTasks ??= {}
    store.data.sessionTasks[sessionId] = {
      workspaceId,
      taskId,
      assignedAt: now,
      updatedAt: now,
    }
    return publicBinding(sessionId, store.data.sessionTasks[sessionId], found.task.title)
  }

  /** Cancel the attribution of one session; it stays cancelled across restarts. */
  function cancel(sessionId) {
    return deleteSessionTask(sessionId)
  }

  /** Cancel every session attributed to a deleted task. */
  function cancelForTask(taskId) {
    const map = store.data?.sessionTasks
    if (!map) return 0
    let removed = 0
    for (const [sessionId, record] of Object.entries(map)) {
      if (record.taskId !== taskId) continue
      delete map[sessionId]
      removed += 1
    }
    return removed
  }

  /**
   * Kept for the release endpoint's backward-compatible contract. Attribution
   * is durable now, so a page load or reconnect must not erase it.
   */
  function releaseAll() {}

  function publicBinding(sessionId, record, taskTitle) {
    return {
      sessionId,
      workspaceId: record.workspaceId,
      taskId: record.taskId,
      taskTitle: taskTitle ?? '',
      sticky: true,
      setAt: record.assignedAt,
      expiresAt: null,
    }
  }

  /**
   * Record every human message inserted into an attributed session as a task
   * prompt. The durable mapping stays, so later sends keep joining the task
   * regardless of whether the reader entered from the sidebar or the board.
   * @param {object} session - native session.
   * @param {object} event - `agent/inbox/spliced` event.
   * @returns {Promise<number>} how many prompt turns were created.
   */
  async function captureInsertion(session, event) {
    const record = sessionTask(session.id)
    if (!record) return 0
    const found = findTask(record.workspaceId, record.taskId)
    if (!found) {
      deleteSessionTask(session.id)
      persist()
      return 0
    }
    const inserted = Array.isArray(event.data?.inserted) ? event.data.inserted : []
    const now = Date.now()
    let added = 0
    for (const message of inserted) {
      if (!message || typeof message !== 'object' || message.source?.kind !== 'user') continue
      const requestId = typeof message.source?.rpcId === 'string' ? message.source.rpcId : null
      if (!requestId) continue
      // A repeated splice for the same native request must not add a second node.
      if (findPromptByRequestId(requestId)) continue
      found.task.prompts.push({
        id: newId('prompt'),
        text: trimText(contentText(message.content).trim() || '[附件消息]', MAX_PROMPT_CHARS),
        sessionId: session.id,
        requestId,
        eventSeq: null,
        turn: null,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        finishedAt: null,
        error: null,
      })
      added += 1
    }
    if (added === 0) return 0
    record.updatedAt = now
    touch(found.task, now)
    found.bucket.updatedAt = now
    await store.save()
    return added
  }

  /** Record where the bound message entered the log and started its turn. */
  function markStarted(session, event) {
    const requestId = typeof event.data?.source?.rpcId === 'string' ? event.data.source.rpcId : null
    const found = requestId ? findPromptByRequestId(requestId) : null
    if (!found) return false
    const { prompt } = found
    let changed = false
    if (prompt.status === 'queued' || prompt.status === 'unknown') {
      prompt.status = 'running'
      prompt.startedAt ??= Date.now()
      changed = true
    }
    if (prompt.sessionId !== session.id) {
      prompt.sessionId = session.id
      changed = true
    }
    if (!Number.isFinite(prompt.eventSeq) && Number.isFinite(event.seq)) {
      prompt.eventSeq = event.seq
      changed = true
    }
    const turn = lastTurn.get(session.id)
    if (!Number.isFinite(prompt.turn) && Number.isFinite(turn)) {
      prompt.turn = turn
      changed = true
    }
    if (changed) {
      prompt.updatedAt = Date.now()
      touch(found.task)
    }
    return changed
  }

  /** Settle every running turn that belongs to the ended native turn. */
  function settleTurn(session, event) {
    const turn = event.data?.turn
    if (!Number.isFinite(turn)) return false
    const reason = event.data?.reason
    const status = settledStatus(reason)
    const now = Date.now()
    let changed = false
    for (const prompt of promptsInSession(session.id, ['running'])) {
      if (prompt.turn !== turn) continue
      prompt.status = status
      prompt.finishedAt ??= now
      prompt.updatedAt = now
      if (status !== 'done') prompt.error = turnFailureText(reason)
      changed = true
    }
    return changed
  }

  function rememberTurn(session, event) {
    lastTurn.set(session.id, event.data?.turn ?? null)
    if (Date.now() - lastPrune < 60_000) return
    lastPrune = Date.now()
    if (lastTurn.size <= 500) return
    for (const key of lastTurn.keys()) {
      if (lastTurn.size <= 400) break
      lastTurn.delete(key)
    }
  }

  function dispatch(session, event) {
    switch (event.type) {
      case 'turn/start':
        rememberTurn(session, event)
        return
      case 'agent/inbox/spliced':
        void captureInsertion(session, event).catch((error) => warn('capture failed', error))
        return
      case 'user/message':
        if (markStarted(session, event)) persist()
        return
      case 'turn/end':
        if (settleTurn(session, event)) persist()
    }
  }

  /** Session events may arrive before the store finished opening. */
  function onSessionEvent(session, event) {
    if (!session || !event) return
    if (store.data) {
      dispatch(session, event)
      return
    }
    void store.ensure().then(() => dispatch(session, event)).catch((error) => warn('startup event replay failed', error))
  }

  /**
   * One-time migration from prompt history: before attribution was durable,
   * only prompts remembered which task a Session had belonged to. Seed the
   * newest such task for each Session that has no durable mapping yet.
   * `attributionVersion` prevents a later Cancel from being undone on restart.
   * @returns {boolean} whether the store changed.
   */
  function seedAttributions() {
    if ((store.data?.attributionVersion ?? 0) >= 1) return false
    const latest = new Map()
    eachPrompt((task, prompt, workspaceId) => {
      if (typeof prompt.sessionId !== 'string' || !prompt.sessionId) return false
      const at = Number.isFinite(prompt.createdAt) ? prompt.createdAt : 0
      const previous = latest.get(prompt.sessionId)
      if (!previous || previous.at < at) latest.set(prompt.sessionId, { workspaceId, taskId: task.id, at })
      return false
    })
    store.data.sessionTasks ??= {}
    const now = Date.now()
    for (const [sessionId, record] of latest) {
      if (store.data.sessionTasks[sessionId]) continue
      store.data.sessionTasks[sessionId] = {
        workspaceId: record.workspaceId,
        taskId: record.taskId,
        assignedAt: record.at || now,
        updatedAt: now,
      }
    }
    store.data.attributionVersion = 1
    return true
  }

  /**
   * Rebuild queued / running statuses from durable session logs after a restart.
   * @returns {Promise<void>}
   */
  async function reconcile() {
    await store.ensure()
    let changed = seedAttributions()
    const sessions = new Map()
    eachPrompt((_task, prompt) => {
      if (!STATUS_KEYS.has(prompt.status) || typeof prompt.sessionId !== 'string') return false
      const entry = sessions.get(prompt.sessionId) ?? { prompts: [] }
      entry.prompts.push(prompt)
      sessions.set(prompt.sessionId, entry)
      return false
    })
    for (const [sessionId, entry] of sessions) {
      let snapshot
      try {
        snapshot = await ctx.sessionQuery.readSession(sessionId)
      } catch (error) {
        warn(`prompt reconciliation failed for ${sessionId}`, error)
        continue
      }
      const events = Array.isArray(snapshot?.events) ? snapshot.events : []
      let currentTurn = null
      const started = new Map()
      const ended = new Map()
      for (const event of events) {
        if (event.type === 'turn/start') {
          currentTurn = event.data?.turn ?? null
          continue
        }
        if (event.type === 'user/message') {
          const rpcId = typeof event.data?.source?.rpcId === 'string' ? event.data.source.rpcId : null
          if (!rpcId) continue
          for (const prompt of entry.prompts) {
            if (prompt.requestId === rpcId) started.set(prompt, { seq: event.seq, turn: currentTurn })
          }
          continue
        }
        if (event.type === 'turn/end' && Number.isFinite(event.data?.turn)) {
          ended.set(event.data.turn, event.data?.reason ?? null)
        }
      }
      for (const prompt of entry.prompts) {
        const start = started.get(prompt)
        if (start) {
          if (!Number.isFinite(prompt.eventSeq) && Number.isFinite(start.seq)) {
            prompt.eventSeq = start.seq
            changed = true
          }
          if (!Number.isFinite(prompt.turn) && Number.isFinite(start.turn)) {
            prompt.turn = start.turn
            changed = true
          }
          if (prompt.status === 'queued') {
            prompt.status = 'running'
            prompt.startedAt ??= Date.now()
            changed = true
          }
        }
        if (!Number.isFinite(prompt.turn) || !ended.has(prompt.turn)) continue
        const reason = ended.get(prompt.turn)
        const status = settledStatus(reason)
        prompt.status = status
        prompt.finishedAt ??= Date.now()
        if (status !== 'done') prompt.error = turnFailureText(reason)
        changed = true
      }
    }
    if (changed) await store.save()
  }

  function dispose() {
    lastTurn.clear()
  }

  return {
    arm,
    cancel,
    cancelForTask,
    releaseAll,
    get,
    onSessionEvent,
    reconcile,
    dispose,
  }
}

/**
 * Extract the human-readable text of a native message.
 * @param {unknown} content - content blocks.
 * @returns {string}
 */
function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    else if (block.type === 'image') parts.push('[图片]')
    else if (block.type === 'file') parts.push(block.attachment?.name ? `[文件: ${block.attachment.name}]` : '[文件]')
  }
  return parts.join('\n')
}

/**
 * Derive a prompt status from a native turn/end reason. A missing reason or a
 * clean completion settles the prompt; an abort is cancelled, anything else
 * failed.
 * @param {unknown} reason - native turn/end reason.
 * @returns {'done' | 'failed' | 'cancelled'}
 */
function settledStatus(reason) {
  if (reason == null || reason.kind === 'completed' || reason.kind === 'max-tokens') return 'done'
  return reason.kind === 'aborted' ? 'cancelled' : 'failed'
}

/**
 * Render a turn/end failure reason.
 * @param {unknown} reason - native turn/end reason.
 * @returns {string}
 */
function turnFailureText(reason) {
  const kind = reason?.kind
  if (kind === 'aborted') return '执行被中断'
  if (kind === 'blocked') return '执行被阻止'
  if (kind === 'forked') return '执行随 fork 结束'
  if (kind === 'error') return `执行失败：${reason?.error?.message ?? 'unknown error'}`
  return `执行结束：${kind ?? 'unknown'}`
}
