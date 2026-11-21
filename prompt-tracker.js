/**
 * Prompt capture and lifecycle.
 *
 * Opening a session from a task's prompt board binds that session to the task.
 * Every human message later inserted into that session becomes a prompt turn of
 * the task. The attribution is durable per session: only an explicit cancel,
 * deleting the task, or re-arming the session with another task ends it. The
 * native session owns queueing and execution; this module records the real
 * request id / event seq / turn and derives the prompt status from the session's
 * own events. Waiting prompts are submitted through the same native admission
 * path only after all their dependencies reach a terminal status.
 *
 * @module @local/dsh-session-todo/prompt-tracker
 */
import { MAX_PROMPT_CHARS, describe, newId, trimText } from './store.js'

const STATUS_KEYS = new Set(['queued', 'running', 'waiting'])
const TERMINAL_STATUSES = new Set(['done', 'failed', 'cancelled'])
const DISPATCH_TIMEOUT_MS = 30_000
// A shared release walk pays off once several dependencies must be resolved;
// smaller waiting sets keep the direct lookups that stop at the dependency.
const SHARED_RELEASE_SCAN_MIN = 8

/**
 * Create the prompt tracker.
 * @param {{ctx: object, store: object, logger?: object}} options - Host dependencies.
 * @returns capture and lifecycle operations.
 */
export function createPromptTracker({ ctx, store, logger }) {
  const lastTurn = new Map()
  /** Prompts whose dependency wait is still active, by prompt id. */
  const waiting = new Map()
  /** Prompts with a submission call in flight; guards duplicate dispatch. */
  const pendingSubmissions = new Set()
  /** Waiting prompts whose creation write has not completed yet. */
  const persisting = new Set()
  let releasing = false
  let releaseAgain = false
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

  /**
   * Resolve the first stored prompt whose field equals a value.
   * @param {'requestId' | 'commitId' | 'id'} field - prompt field.
   * @param {string} value - expected value.
   * @returns {{task: object, prompt: object, workspaceId: string}|null}
   */
  function findPromptBy(field, value) {
    if (!value || !store.data) return null
    let found = null
    eachPrompt((task, prompt, workspaceId) => {
      if (prompt[field] !== value) return false
      found = { task, prompt, workspaceId }
      return true
    })
    return found
  }

  function findPromptByRequestId(requestId) {
    return findPromptBy('requestId', requestId)
  }

  /**
   * Resolve one waiting prompt by the client commit id used to create it.
   * @param {string} commitId - client idempotency key.
   * @returns {{task: object, prompt: object}|null}
   */
  function findPromptByCommitId(commitId) {
    return findPromptBy('commitId', commitId)
  }

  /**
   * Resolve one prompt by its task-local id across every task.
   * @param {string} promptId - prompt id.
   * @returns {{task: object, prompt: object, workspaceId: string}|null}
   */
  function findPromptById(promptId) {
    return findPromptBy('id', promptId)
  }

  /**
   * Resolve every dependency record and waiting-prompt membership in one walk.
   * Used when several prompts wait at once; looking each dependency up on its
   * own would walk the whole store once per dependency. Status changes during
   * the pass are visible through the live prompt records, so the result stays
   * valid until the set of stored prompts changes.
   * @param {object[]} entries - waiting entries in this pass.
   * @returns {{dependencies: Map<string, object>, present: Set<object>}}
   */
  function releaseIndex(entries) {
    const dependencies = new Map()
    const present = new Set()
    const waitingPrompts = new Set(entries.map((entry) => entry.prompt))
    const needed = new Set()
    for (const { prompt } of entries) {
      for (const dependencyId of Array.isArray(prompt.dependsOn) ? prompt.dependsOn : []) needed.add(dependencyId)
    }
    if (!store.data) return { dependencies, present }
    eachPrompt((_task, prompt) => {
      if (waitingPrompts.has(prompt)) present.add(prompt)
      if (needed.has(prompt.id)) {
        dependencies.set(prompt.id, prompt)
        needed.delete(prompt.id)
      }
      // Stop as soon as every dependency and every waiting prompt was seen.
      return needed.size === 0 && present.size === waitingPrompts.size
    })
    return { dependencies, present }
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
    const candidates = []
    const pendingRequests = new Set()
    for (const message of inserted) {
      if (!message || typeof message !== 'object' || message.source?.kind !== 'user') continue
      const requestId = typeof message.source?.rpcId === 'string' ? message.source.rpcId : null
      if (!requestId) continue
      candidates.push({ message, requestId })
      pendingRequests.add(requestId)
    }
    if (candidates.length === 0) return 0
    // One walk of the stored prompts drops every request the store already
    // records, so the common one-message splice costs one lookup and a large
    // batch still costs one walk instead of one walk per message.
    eachPrompt((_task, prompt) => {
      if (typeof prompt.requestId === 'string' && pendingRequests.has(prompt.requestId)) {
        pendingRequests.delete(prompt.requestId)
      }
      return pendingRequests.size === 0
    })
    let added = 0
    for (const { message, requestId } of candidates) {
      // A repeated splice for the same native request must not add a second node.
      if (!pendingRequests.has(requestId)) continue
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
      pendingRequests.delete(requestId)
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
    if (prompt.status === 'queued' || prompt.status === 'waiting' || prompt.status === 'unknown') {
      prompt.status = 'running'
      prompt.startedAt ??= Date.now()
      waiting.delete(prompt.id)
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

  /**
   * Settle every running turn that belongs to the ended native turn.
   * @returns {object[]} settled prompts, used to release waiting dependents.
   */
  function settleTurn(session, event) {
    const turn = event.data?.turn
    if (!Number.isFinite(turn)) return []
    const reason = event.data?.reason
    const status = settledStatus(reason)
    const now = Date.now()
    const settled = []
    for (const prompt of promptsInSession(session.id, ['running'])) {
      if (prompt.turn !== turn) continue
      prompt.status = status
      prompt.finishedAt ??= now
      prompt.updatedAt = now
      if (status !== 'done') prompt.error = turnFailureText(reason)
      settled.push(prompt)
    }
    return settled
  }

  /**
   * Rebuild the dependency-waiting index from durable state.
   */
  function refreshWaiting() {
    waiting.clear()
    eachPrompt((task, prompt) => {
      if (prompt.status === 'waiting' && !persisting.has(prompt.id)) {
        waiting.set(prompt.id, { task, prompt })
      }
      return false
    })
  }

  /**
   * A dependency session is quiescent only when its live Agent has no running
   * turn and both native inbox queues are empty. This is the lock-like barrier
   * for queue mode (next-turn backlog) and steer mode (next-step backlog): a
   * waiter wakes after the whole pending batch, not on the dependency prompt's
   * first turn/end.
   * @param {string|null} sessionId - dependency session.
   * @returns {{ready: boolean, unavailable?: boolean}}
   */
  function sessionBarrier(sessionId) {
    if (!sessionId) return { ready: true }
    const registry = ctx.agents
    if (!registry || typeof registry.get !== 'function') return { ready: false, unavailable: true }
    let agent
    try {
      agent = registry.get(sessionId)
    } catch {
      // A disposed Agent has no live work left to drain.
      return { ready: true }
    }
    if (!agent) return { ready: true }
    try {
      const pending = (agent.inbox?.nextTurn?.length ?? 0) + (agent.inbox?.nextStep?.length ?? 0)
      if (agent.status === 'running' || pending > 0) return { ready: false }
      return { ready: true }
    } catch {
      return { ready: true }
    }
  }

  /**
   * Whether every dependency prompt has ended and every dependency Session has
   * drained its native queue/steer batch.
   * @param {object} prompt - waiting prompt.
   * @param {Map<string, object>} [dependencies] - resolved dependencies for this pass.
   * @returns {{state: 'ready'|'pending'|'missing'|'blocked', reason?: string}}
   */
  function dependenciesState(prompt, dependencies) {
    for (const dependencyId of Array.isArray(prompt.dependsOn) ? prompt.dependsOn : []) {
      const dependency = dependencies
        ? dependencies.get(dependencyId)
        : findPromptById(dependencyId)?.prompt
      if (!dependency) return { state: 'missing' }
      if (!TERMINAL_STATUSES.has(dependency.status)) return { state: 'pending' }
      const barrier = sessionBarrier(dependency.sessionId)
      if (barrier.unavailable) {
        return { state: 'blocked', reason: 'agent registry is unavailable for dependency session' }
      }
      if (!barrier.ready) return { state: 'pending' }
    }
    return { state: 'ready' }
  }

  /**
   * Terminal failure for one waiting prompt. The failed status is itself
   * terminal, so anything waiting for this prompt can proceed on the next pass.
   * @param {{task: object, prompt: object}} entry - waiting entry.
   * @param {string} message - user-visible failure.
   */
  function failWaiting(entry, message) {
    const { task, prompt } = entry
    waiting.delete(prompt.id)
    if (prompt.status !== 'waiting' || !Array.isArray(task.prompts) || !task.prompts.includes(prompt)) return
    const now = Date.now()
    prompt.status = 'failed'
    prompt.error = message
    prompt.updatedAt = now
    prompt.finishedAt ??= now
    touch(task, now)
    persist()
    releaseAgain = true
  }

  /**
   * Submit one waiting prompt through the native Session admission path. The
   * requestId was generated when the waiting prompt was created, so a crash or
   * retry cannot create a second native prompt.
   * @param {{task: object, prompt: object}} entry - waiting entry.
   */
  async function submitWaiting(entry) {
    const { task, prompt } = entry
    if (pendingSubmissions.has(prompt.id)) return
    if (prompt.status !== 'waiting') {
      waiting.delete(prompt.id)
      return
    }
    if (!Array.isArray(task.prompts) || !task.prompts.includes(prompt)) {
      waiting.delete(prompt.id)
      return
    }
    if (!prompt.requestId || !prompt.sessionId) {
      failWaiting(entry, 'waiting prompt has no native target')
      releaseReady()
      return
    }
    const check = dependenciesState(prompt)
    if (check.state === 'missing') {
      failWaiting(entry, 'dependency prompt is missing')
      releaseReady()
      return
    }
    if (check.state === 'blocked') {
      failWaiting(entry, check.reason)
      releaseReady()
      return
    }
    if (check.state !== 'ready') return
    const controller = ctx.sessionController
    if (!controller || typeof controller.prompt !== 'function') {
      failWaiting(entry, 'session prompt API is unavailable')
      releaseReady()
      return
    }
    const archived = ctx.workspaceRegistry?.archivedSessionIds
    if (Array.isArray(archived) && archived.includes(prompt.sessionId)) {
      failWaiting(entry, 'target session is archived')
      releaseReady()
      return
    }
    pendingSubmissions.add(prompt.id)
    try {
      const result = await controller.prompt({
        requestId: prompt.requestId,
        sessionId: prompt.sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: prompt.text }],
      }, AbortSignal.timeout(DISPATCH_TIMEOUT_MS))
      if (!result || result.accepted !== true) throw new Error('native session did not accept the prompt')
      waiting.delete(prompt.id)
      // The user-message event can arrive before `prompt()` resolves; do not
      // downgrade a prompt the tracker already marked running or settled.
      if (prompt.status === 'waiting') {
        prompt.status = 'queued'
        prompt.updatedAt = Date.now()
        touch(task)
        persist()
      }
    } catch (error) {
      failWaiting(entry, `dispatch failed: ${describe(error)}`)
    } finally {
      pendingSubmissions.delete(prompt.id)
      if (prompt.status !== 'waiting') releaseReady()
    }
  }

  /**
   * Evaluate every waiting prompt. This is intentionally edge-triggered: a
   * dependency turn/end, a discarded queue item, a newly created waiting
   * prompt, removal, and startup reconciliation all call it. No timers and no
   * polling are involved.
   */
  function releaseReady() {
    if (releasing) {
      releaseAgain = true
      return
    }
    if (waiting.size === 0) return
    releasing = true
    try {
      const entries = [...waiting.values()]
      // A small waiting set keeps the direct lookups: they stop at the
      // dependency and cost less than one shared walk. Larger sets share it.
      const index = entries.length >= SHARED_RELEASE_SCAN_MIN ? releaseIndex(entries) : null
      do {
        releaseAgain = false
        for (const entry of entries) {
          const { task, prompt } = entry
          const present = index ? index.present.has(prompt) : Array.isArray(task.prompts) && task.prompts.includes(prompt)
          if (prompt.status !== 'waiting' || !present) {
            waiting.delete(prompt.id)
            continue
          }
          if (pendingSubmissions.has(prompt.id)) continue
          const check = dependenciesState(prompt, index?.dependencies)
          if (check.state === 'missing') {
            failWaiting(entry, 'dependency prompt is missing')
            continue
          }
          if (check.state === 'blocked') {
            failWaiting(entry, check.reason)
            continue
          }
          if (check.state !== 'ready') continue
          void submitWaiting(entry)
        }
      } while (releaseAgain)
    } finally {
      releasing = false
    }
  }

  /**
   * Create one waiting prompt in a task and persist it before it can be
   * dispatched. A dependency turn/end that arrives during the write must not
   * submit a prompt that has no durable task node.
   * @returns {Promise<object|null>} created prompt.
   */
  async function deferPrompt({ workspaceId, taskId, sessionId, text, dependsOn, commitId }) {
    const found = findTask(workspaceId, taskId)
    if (!found) return null
    const now = Date.now()
    const prompt = {
      id: newId('prompt'),
      text,
      sessionId,
      requestId: newId('wait'),
      eventSeq: null,
      turn: null,
      status: 'waiting',
      dependsOn: [...dependsOn],
      commitId: typeof commitId === 'string' && commitId ? commitId.slice(0, 100) : null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
      error: null,
    }
    persisting.add(prompt.id)
    found.task.prompts.push(prompt)
    touch(found.task, now)
    found.bucket.updatedAt = now
    try {
      await store.save()
    } catch (error) {
      persisting.delete(prompt.id)
      const index = found.task.prompts.indexOf(prompt)
      if (index >= 0) found.task.prompts.splice(index, 1)
      throw error
    }
    persisting.delete(prompt.id)
    waiting.set(prompt.id, { task: found.task, prompt })
    return prompt
  }

  /**
   * A native queue item was discarded. If it belonged to a tracked prompt, the
   * prompt is terminal (cancelled) and dependents may proceed.
   * @param {object} message - discarded native user message.
   */
  function onInboxDiscarded(message) {
    const requestId = typeof message?.source?.rpcId === 'string' ? message.source.rpcId : null
    const found = requestId ? findPromptByRequestId(requestId) : null
    if (!found) {
      // An unrecorded backlog item was removed; the Session may now be drained.
      releaseReady()
      return
    }
    const { task, prompt } = found
    if (prompt.status !== 'queued' && prompt.status !== 'waiting') return
    const now = Date.now()
    prompt.status = 'cancelled'
    prompt.error = 'removed from the native queue'
    prompt.updatedAt = now
    prompt.finishedAt ??= now
    waiting.delete(prompt.id)
    touch(task, now)
    persist()
    releaseReady()
  }

  /**
   * Prompt/task deletion invalidated the waiting index. Removed waiting
   * prompts disappear; waiting prompts whose dependency was removed fail on
   * the next release pass.
   */
  function promptsRemoved() {
    refreshWaiting()
    releaseReady()
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
        // A queue edit/removal can make a dependency Session quiescent; a new
        // insertion can make it busy again. Re-evaluate without timers.
        releaseReady()
        return
      case 'user/message':
        if (markStarted(session, event)) persist()
        return
      case 'turn/end': {
        const settled = settleTurn(session, event)
        if (settled.length > 0) {
          persist()
          releaseReady()
        }
        return
      }
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
      // Index the session log once. The previous nested walk tested every
      // open prompt against every event (events × prompts).
      const startedByRequest = new Map()
      const ended = new Map()
      for (const event of events) {
        if (event.type === 'turn/start') {
          currentTurn = event.data?.turn ?? null
          continue
        }
        if (event.type === 'user/message') {
          const rpcId = typeof event.data?.source?.rpcId === 'string' ? event.data.source.rpcId : null
          if (rpcId) startedByRequest.set(rpcId, { seq: event.seq, turn: currentTurn })
          continue
        }
        if (event.type === 'turn/end' && Number.isFinite(event.data?.turn)) {
          ended.set(event.data.turn, event.data?.reason ?? null)
        }
      }
      for (const prompt of entry.prompts) {
        const start = typeof prompt.requestId === 'string' ? startedByRequest.get(prompt.requestId) : undefined
        if (start) {
          if (!Number.isFinite(prompt.eventSeq) && Number.isFinite(start.seq)) {
            prompt.eventSeq = start.seq
            changed = true
          }
          if (!Number.isFinite(prompt.turn) && Number.isFinite(start.turn)) {
            prompt.turn = start.turn
            changed = true
          }
          if (prompt.status === 'queued' || prompt.status === 'waiting') {
            prompt.status = 'running'
            prompt.startedAt ??= Date.now()
            waiting.delete(prompt.id)
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
    refreshWaiting()
    void releaseReady()
  }

  function dispose() {
    waiting.clear()
    pendingSubmissions.clear()
    persisting.clear()
    lastTurn.clear()
  }

  return {
    arm,
    cancel,
    cancelForTask,
    releaseAll,
    get,
    findPromptById,
    findPromptByCommitId,
    deferPrompt,
    onInboxDiscarded,
    promptsRemoved,
    releaseReady,
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
