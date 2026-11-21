/**
 * Durable store for workspace tasks and their prompt turns.
 *
 * A task belongs to one workspace. Each prompt turn records a real native
 * user message: its session, request id, event seq, turn, text and lifecycle
 * status. Version 3 is the only supported shape; older files are moved aside
 * instead of being silently overwritten.
 *
 * @module @local/dsh-session-todo/store
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const STORE_VERSION = 3
export const MAX_TASKS = 200
export const MAX_PROMPTS = 500
export const MAX_DEPENDENCIES = 20
export const MAX_SESSION_TASKS = 1000
export const MAX_PROMPT_CHARS = 20000
export const MAX_TITLE_CHARS = 200
export const MAX_DESCRIPTION_CHARS = 600
export const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/
export const TASK_ID_RE = /^[A-Za-z0-9_-]{8,80}$/
export const PROMPT_STATUSES = new Set(['draft', 'queued', 'running', 'waiting', 'done', 'failed', 'cancelled', 'unknown'])

/**
 * Open the JSON store lazily.
 * @param {string} file - absolute store path.
 * @param {{logger?: {warn?: (message: string) => void}}} [options] - diagnostics.
 * @returns a store with a live `data` value and durable `save()`.
 */
export function createStore(file, options = {}) {
  const logger = options.logger
  let data
  let opening
  let chain = Promise.resolve()
  let blocked = null
  // Writes are coalesced: a write flushes every save requested before it
  // started, so a burst of prompt events costs one atomic write, not one each.
  let requested = 0
  let written = 0

  function blank() {
    return {
      version: STORE_VERSION,
      workspaces: {},
      // Durable per-Session last task attribution. `attributionVersion` makes
      // the one-time seed from existing prompt history run only once.
      sessionTasks: {},
      attributionVersion: 1,
      updatedAt: Date.now(),
    }
  }

  async function quarantine(error, suffix) {
    logger?.warn?.(`[session-todo] ${describe(error)}; the original file is preserved`)
    try {
      await rename(file, `${file}.${suffix}-${Date.now()}`)
    } catch {
      // The file may be absent or already renamed.
    }
  }

  async function ensure() {
    if (data) return data
    if (!opening) {
      opening = (async () => {
        let parsed
        try {
          parsed = JSON.parse(await readFile(file, 'utf8'))
        } catch (error) {
          if (error?.code === 'ENOENT') return (data = blank())
          await quarantine(error, 'unreadable')
          return (data = blank())
        }
        if (isStore(parsed)) return (data = normalizeStore(parsed))
        const version = Number(parsed?.version)
        if (Number.isFinite(version) && version > STORE_VERSION) {
          blocked = `store version ${version} is newer than supported version ${STORE_VERSION}`
          logger?.warn?.(`[session-todo] ${blocked}; refusing to overwrite it`)
          return (data = blank())
        }
        await quarantine(new Error(`unsupported store version ${Number.isFinite(version) ? version : 'unknown'}`), 'unsupported')
        return (data = blank())
      })().finally(() => {
        opening = undefined
      })
    }
    return opening
  }

  async function writeAtomic(value) {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
    try {
      // Compact JSON: same document, but roughly a third of the bytes (and of
      // the serialization time) of pretty output for a large store.
      await writeFile(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 })
      await rename(temporary, file)
    } catch (error) {
      try {
        await unlink(temporary)
      } catch {
        // The temporary file may never have been created.
      }
      throw error
    }
  }

  function readOnlyError() {
    return new Error(`session-todo store is read-only: ${blocked}`)
  }

  async function save() {
    if (blocked) throw readOnlyError()
    const ticket = ++requested
    const operation = chain.then(async () => {
      // A write that started after this request already flushed its mutation.
      if (written >= ticket) return
      await ensure()
      if (blocked) throw readOnlyError()
      trimStore(data)
      data.updatedAt = Date.now()
      // Requests issued while this write runs are covered only if they arrived
      // before its snapshot; later ones queue another write.
      const covered = requested
      await writeAtomic(data)
      written = covered
    })
    chain = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }

  return {
    file,
    get data() {
      return data
    },
    ensure,
    save,
    /** Read or lazily create one workspace bucket. Call `ensure()` first. */
    workspace(workspaceId) {
      if (!data) throw new Error('session-todo store is not open')
      return data.workspaces[workspaceId] ??= { tasks: {}, updatedAt: Date.now() }
    },
  }
}

/** @param {unknown} value @returns {boolean} */
function isStore(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    && Number(value.version) === STORE_VERSION
    && Boolean(value.workspaces && typeof value.workspaces === 'object' && !Array.isArray(value.workspaces))
}

/**
 * Bound and validate a stored value.
 * @param {object} root - parsed store.
 * @returns validated store.
 */
function normalizeStore(root) {
  const workspaces = {}
  for (const [workspaceId, bucket] of Object.entries(root.workspaces)) {
    if (!workspaceId || !bucket || typeof bucket !== 'object') continue
    const tasks = {}
    for (const [taskId, task] of Object.entries(bucket.tasks ?? {})) {
      const normalized = normalizeTask(task, taskId)
      if (normalized) tasks[normalized.id] = normalized
    }
    workspaces[workspaceId] = { tasks, updatedAt: Number.isFinite(bucket.updatedAt) ? bucket.updatedAt : 0 }
  }
  return {
    version: STORE_VERSION,
    workspaces,
    sessionTasks: normalizeSessionTasks(root.sessionTasks, workspaces),
    attributionVersion: Number.isFinite(root.attributionVersion) ? root.attributionVersion : 0,
    updatedAt: Number.isFinite(root.updatedAt) ? root.updatedAt : Date.now(),
  }
}

/**
 * Validate the durable per-Session task map. A mapping whose task is gone is
 * dropped, so a stale record can never resurrect a deleted task.
 * @param {unknown} value - stored map.
 * @param {Record<string, {tasks: Record<string, object>}>} workspaces - normalized buckets.
 * @returns {Record<string, {workspaceId: string, taskId: string, assignedAt: number, updatedAt: number}>}
 */
function normalizeSessionTasks(value, workspaces) {
  const sessions = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return sessions
  for (const [sessionId, record] of Object.entries(value)) {
    if (!SESSION_ID_RE.test(sessionId) || !record || typeof record !== 'object') continue
    const workspaceId = typeof record.workspaceId === 'string' ? record.workspaceId : ''
    const taskId = typeof record.taskId === 'string' ? record.taskId : ''
    if (!workspaceId || !TASK_ID_RE.test(taskId)) continue
    const tasks = workspaces[workspaceId]?.tasks
    if (!tasks || !Object.hasOwn(tasks, taskId)) continue
    const now = Date.now()
    sessions[sessionId] = {
      workspaceId,
      taskId,
      assignedAt: Number.isFinite(record.assignedAt) ? record.assignedAt : now,
      updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : now,
    }
  }
  return sessions
}

/**
 * Validate one task and its prompt turns.
 * @param {object} task - stored task.
 * @param {string} fallbackId - object key.
 * @returns {object | null} normalized task.
 */
export function normalizeTask(task, fallbackId) {
  if (!task || typeof task !== 'object') return null
  const title = trimText(task.title, MAX_TITLE_CHARS).trim()
  if (!title) return null
  const id = typeof task.id === 'string' && TASK_ID_RE.test(task.id) ? task.id : fallbackId
  if (!TASK_ID_RE.test(id)) return null
  const now = Date.now()
  const prompts = []
  const seen = new Set()
  for (const [index, prompt] of (Array.isArray(task.prompts) ? task.prompts : []).slice(-MAX_PROMPTS).entries()) {
    if (!prompt || typeof prompt !== 'object') continue
    const text = trimText(prompt.text, MAX_PROMPT_CHARS)
    if (!text.trim()) continue
    let promptId = typeof prompt.id === 'string' && TASK_ID_RE.test(prompt.id) ? prompt.id : newId('prompt')
    if (seen.has(promptId)) promptId = `${promptId}-${index}`
    seen.add(promptId)
    const dependsOn = []
    for (const dependency of Array.isArray(prompt.dependsOn) ? prompt.dependsOn : []) {
      if (typeof dependency !== 'string' || !TASK_ID_RE.test(dependency)) continue
      if (dependsOn.includes(dependency)) continue
      dependsOn.push(dependency)
      if (dependsOn.length >= MAX_DEPENDENCIES) break
    }
    prompts.push({
      id: promptId,
      text,
      sessionId: typeof prompt.sessionId === 'string' && SESSION_ID_RE.test(prompt.sessionId) ? prompt.sessionId : null,
      requestId: typeof prompt.requestId === 'string' && prompt.requestId ? prompt.requestId.slice(0, 200) : null,
      eventSeq: Number.isFinite(prompt.eventSeq) ? prompt.eventSeq : null,
      turn: Number.isFinite(prompt.turn) ? prompt.turn : null,
      status: PROMPT_STATUSES.has(prompt.status) ? prompt.status : 'draft',
      dependsOn,
      commitId: typeof prompt.commitId === 'string' && prompt.commitId ? prompt.commitId.slice(0, 100) : null,
      createdAt: Number.isFinite(prompt.createdAt) ? prompt.createdAt : now,
      updatedAt: Number.isFinite(prompt.updatedAt) ? prompt.updatedAt : now,
      startedAt: Number.isFinite(prompt.startedAt) ? prompt.startedAt : null,
      finishedAt: Number.isFinite(prompt.finishedAt) ? prompt.finishedAt : null,
      error: typeof prompt.error === 'string' ? prompt.error.slice(0, 500) : null,
    })
  }
  return {
    id,
    title,
    description: trimText(task.description, MAX_DESCRIPTION_CHARS).trim(),
    prompts,
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : now,
    updatedAt: Number.isFinite(task.updatedAt) ? task.updatedAt : now,
    // Quick-switcher visit metadata. Optional in older files; visiting a task
    // deliberately does not change updatedAt (content activity).
    lastVisitedAt: Number.isFinite(task.lastVisitedAt) ? task.lastVisitedAt : null,
    visitCount: Number.isFinite(task.visitCount) && task.visitCount > 0 ? Math.floor(task.visitCount) : 0,
  }
}

/** Keep the newest tasks and prompts inside the declared bounds. */
function trimStore(data) {
  for (const bucket of Object.values(data.workspaces ?? {})) {
    const tasks = Object.values(bucket.tasks ?? {})
    if (tasks.length > MAX_TASKS) {
      tasks.sort((left, right) => (left.updatedAt ?? 0) - (right.updatedAt ?? 0))
      for (const task of tasks.slice(0, tasks.length - MAX_TASKS)) delete bucket.tasks[task.id]
    }
    for (const task of Object.values(bucket.tasks ?? {})) {
      if (task.prompts.length > MAX_PROMPTS) task.prompts = task.prompts.slice(-MAX_PROMPTS)
    }
  }
  const sessions = Object.entries(data.sessionTasks ?? {})
  if (sessions.length > MAX_SESSION_TASKS) {
    sessions.sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0))
    for (const [sessionId] of sessions.slice(0, sessions.length - MAX_SESSION_TASKS)) {
      delete data.sessionTasks[sessionId]
    }
  }
}

/**
 * New opaque identity.
 * @param {string} prefix - id prefix.
 * @returns {string} id.
 */
export function newId(prefix) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

/**
 * Trim one optional string.
 * @param {unknown} value - candidate.
 * @param {number} max - UTF-16 length cap.
 * @returns {string} bounded string.
 */
export function trimText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

/**
 * Render a diagnostic string.
 * @param {unknown} error - thrown value.
 * @returns {string} diagnostic.
 */
export function describe(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}
