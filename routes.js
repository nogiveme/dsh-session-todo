/**
 * HTTP bridge for the task center.
 *
 * Routes are local-only and split by view: the overview lists workspace
 * summaries, the task board reads one workspace, and the prompt board reads
 * one task. The capture routes arm, inspect, and release a session's task
 * binding; the waiting routes list dependency candidates and create one
 * waiting node. Prompt request ids stay on the Host; the browser never needs
 * them.
 *
 * @module @local/dsh-session-todo/routes
 */
import {
  MAX_DEPENDENCIES,
  MAX_DESCRIPTION_CHARS,
  MAX_PROMPT_CHARS,
  MAX_TITLE_CHARS,
  SESSION_ID_RE,
  describe,
  newId,
  trimText,
} from './store.js'

const ROUTE = '/plugin-todo'
const MAX_BODY_BYTES = 1024 * 1024

/**
 * Build the request handler.
 * @param {{ctx: object, store: object, tracker: object, logger?: object}} options - Host dependencies.
 * @returns {{handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}}
 */
export function createRoutes({ ctx, store, tracker, logger }) {
  const routes = new Map([
    ['GET /workspaces', listWorkspaces],
    ['GET /workspace', getWorkspace],
    ['GET /tasks', listTasks],
    ['GET /prompt-candidates', listPromptCandidates],
    ['GET /task', getTask],
    ['POST /task', postTask],
    ['GET /capture', getCapture],
    ['POST /capture', postCapture],
  ])
  const routePaths = new Set([...routes.keys()].map((key) => key.slice(key.indexOf(' ') + 1)))

  function findWorkspace(workspaceId) {
    return ctx.workspaceRegistry.list().find((workspace) => workspace.id === workspaceId)
  }

  function bucketOf(workspaceId) {
    return store.data?.workspaces?.[workspaceId]
  }

  function tasksOf(workspaceId) {
    return Object.values(bucketOf(workspaceId)?.tasks ?? {})
  }

  function taskOf(workspaceId, taskId) {
    const tasks = bucketOf(workspaceId)?.tasks
    // Own-key lookup: a request id such as "__proto__" must not resolve to
    // Object.prototype and be mutated as if it were a task.
    return tasks && Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined
  }

  async function listWorkspaces(req, res) {
    await store.ensure()
    const workspaces = ctx.workspaceRegistry.list().map((workspace) => {
      const tasks = tasksOf(workspace.id)
      let promptCount = 0
      let activePromptCount = 0
      let lastActivityAt = 0
      for (const task of tasks) {
        lastActivityAt = Math.max(lastActivityAt, task.updatedAt ?? 0)
        for (const prompt of task.prompts ?? []) {
          promptCount += 1
          if (isActive(prompt)) activePromptCount += 1
        }
      }
      return {
        ...publicWorkspace(workspace),
        taskCount: tasks.length,
        promptCount,
        activePromptCount,
        lastActivityAt,
      }
    })
    send(res, 200, { ok: true, workspaces })
  }

  async function getWorkspace(req, res, url) {
    const workspace = requireWorkspace(url.searchParams.get('workspaceId'))
    await store.ensure()
    const tasks = tasksOf(workspace.id)
      .map(taskSummary)
      .sort((left, right) => right.updatedAt - left.updatedAt)
    send(res, 200, { ok: true, workspace: publicWorkspace(workspace), tasks })
  }

  async function getTask(req, res, url) {
    const workspace = requireWorkspace(url.searchParams.get('workspaceId'))
    await store.ensure()
    const task = taskOf(workspace.id, url.searchParams.get('taskId') ?? '')
    if (!task) throw fail(404, 'task_not_found', 'task not found')
    send(res, 200, { ok: true, workspace: publicWorkspace(workspace), task: publicTask(task) })
  }

  /**
   * Every current workspace's tasks, for the client-side quick switcher.
   *
   * The quick switcher is an overlay that can open at any moment, including
   * while the workspace registry is reloading after a project change. A
   * momentarily unreadable registry must not turn the whole list into an
   * error: fall back to the task buckets already in the store, and skip a
   * single malformed task instead of failing every other row.
   */
  async function listTasks(req, res) {
    await store.ensure()
    let workspaces
    try {
      workspaces = ctx.workspaceRegistry.list()
    } catch (error) {
      logger?.warn?.(`[session-todo] workspace registry unavailable for /tasks: ${describe(error)}`)
      workspaces = Object.keys(store.data?.workspaces ?? {}).map((id) => ({ id, title: '', path: '' }))
    }
    const tasks = []
    for (const workspace of workspaces) {
      const workspaceId = typeof workspace?.id === 'string' ? workspace.id : ''
      if (!workspaceId) continue
      let rows
      try {
        rows = tasksOf(workspaceId)
      } catch (error) {
        logger?.warn?.(`[session-todo] skipped unreadable workspace ${workspaceId}: ${describe(error)}`)
        continue
      }
      for (const task of rows) {
        try {
          tasks.push({
            ...taskSummary(task),
            workspaceId,
            workspaceTitle: typeof workspace.title === 'string' ? workspace.title : '',
            workspacePath: typeof workspace.path === 'string' ? workspace.path : '',
          })
        } catch (error) {
          logger?.warn?.(`[session-todo] skipped unreadable task ${String(task?.id ?? 'unknown')}: ${describe(error)}`)
        }
      }
    }
    tasks.sort(
      (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0)
        || String(left.title ?? '').localeCompare(String(right.title ?? '')),
    )
    send(res, 200, { ok: true, tasks })
  }

  /** Recent prompt nodes a waiting prompt can depend on. */
  async function listPromptCandidates(req, res, url) {
    await store.ensure()
    const rawLimit = Number(url.searchParams.get('limit'))
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 100
    let workspaces
    try {
      workspaces = ctx.workspaceRegistry.list()
    } catch (error) {
      logger?.warn?.(`[session-todo] workspace registry unavailable for /prompt-candidates: ${describe(error)}`)
      workspaces = Object.keys(store.data?.workspaces ?? {}).map((id) => ({ id, title: '' }))
    }
    const candidates = []
    for (const workspace of workspaces) {
      const workspaceId = typeof workspace?.id === 'string' ? workspace.id : ''
      if (!workspaceId) continue
      let tasks
      try {
        tasks = tasksOf(workspaceId)
      } catch {
        continue
      }
      for (const task of tasks) {
        for (const prompt of Array.isArray(task?.prompts) ? task.prompts : []) {
          if (!prompt || typeof prompt.sessionId !== 'string' || !prompt.sessionId) continue
          if (!['queued', 'running', 'waiting', 'done', 'failed', 'cancelled'].includes(prompt.status)) continue
          candidates.push({
            id: prompt.id,
            text: trimText(prompt.text, 500),
            sessionId: prompt.sessionId,
            status: prompt.status,
            createdAt: Number.isFinite(prompt.createdAt) ? prompt.createdAt : 0,
            taskId: task.id,
            taskTitle: typeof task.title === 'string' ? task.title : '',
            workspaceId,
            workspaceTitle: typeof workspace.title === 'string' ? workspace.title : '',
            workspacePath: typeof workspace.path === 'string' ? workspace.path : '',
          })
        }
      }
    }
    candidates.sort(
      (left, right) => right.createdAt - left.createdAt
        || String(left.id).localeCompare(String(right.id)),
    )
    send(res, 200, { ok: true, prompts: candidates.slice(0, limit) })
  }

  async function postTask(req, res) {
    const body = await readJson(req)
    const workspace = requireWorkspace(body?.workspaceId)
    await store.ensure()
    const bucket = store.workspace(workspace.id)
    const action = typeof body?.action === 'string' ? body.action : ''

    if (action === 'createTask') {
      const title = cleanTitle(body.title)
      const now = Date.now()
      const task = {
        id: newId('task'),
        title,
        description: cleanDescription(body.description),
        prompts: [],
        createdAt: now,
        updatedAt: now,
        lastVisitedAt: null,
        visitCount: 0,
      }
      bucket.tasks[task.id] = task
      bucket.updatedAt = now
      await store.save()
      send(res, 200, { ok: true, taskId: task.id })
      return
    }

    const task = taskOf(workspace.id, typeof body?.taskId === 'string' ? body.taskId : '')
    if (!task) throw fail(404, 'task_not_found', 'task not found')

    if (action === 'updateTask') {
      if (typeof body.title === 'string') task.title = cleanTitle(body.title)
      if (typeof body.description === 'string') task.description = cleanDescription(body.description)
      touch(bucket, task)
      await store.save()
      send(res, 200, { ok: true })
      return
    }

    if (action === 'deleteTask') {
      delete bucket.tasks[task.id]
      tracker.cancelForTask(task.id)
      tracker.promptsRemoved()
      bucket.updatedAt = Date.now()
      await store.save()
      send(res, 200, { ok: true })
      return
    }

    if (action === 'deferPrompt') {
      const sessionId = requireSessionId(body.sessionId)
      if (!(workspace.sessionIds ?? []).includes(sessionId)) {
        throw fail(400, 'session_not_in_workspace', 'session does not belong to this workspace')
      }
      const commitId = typeof body.commitId === 'string' && body.commitId ? body.commitId.slice(0, 100) : null
      if (commitId) {
        const existing = tracker.findPromptByCommitId(commitId)
        if (existing) {
          send(res, 200, {
            ok: true,
            prompt: { id: existing.prompt.id, status: existing.prompt.status, dependsOn: existing.prompt.dependsOn },
            replayed: true,
          })
          return
        }
      }
      const text = trimText(body.text, MAX_PROMPT_CHARS)
      if (!text.trim()) throw fail(400, 'text_required', 'prompt text cannot be empty')
      const rawDependencies = Array.isArray(body.dependsOn) ? body.dependsOn : []
      const archivedSessions = new Set(
        Array.isArray(ctx.workspaceRegistry?.archivedSessionIds) ? ctx.workspaceRegistry.archivedSessionIds : [],
      )
      const dependsOn = []
      for (const dependency of rawDependencies) {
        if (typeof dependency !== 'string' || !dependency || dependency.length > 100) {
          throw fail(400, 'dependency_required', 'dependency prompt id is required')
        }
        if (dependsOn.includes(dependency)) continue
        if (dependsOn.length >= MAX_DEPENDENCIES) {
          throw fail(400, 'too_many_dependencies', 'too many dependency prompts')
        }
        const found = tracker.findPromptById(dependency)
        if (!found) throw fail(404, 'dependency_not_found', 'dependency prompt not found')
        const dependencyWorkspace = findWorkspace(found.workspaceId)
        if (!found.prompt.sessionId
          || !dependencyWorkspace
          || !(dependencyWorkspace.sessionIds ?? []).includes(found.prompt.sessionId)
          || archivedSessions.has(found.prompt.sessionId)
          || found.prompt.status === 'draft'
          || found.prompt.status === 'unknown') {
          throw fail(400, 'dependency_not_executable', 'dependency prompt has no executable session')
        }
        dependsOn.push(dependency)
      }
      if (dependsOn.length === 0) {
        throw fail(400, 'dependency_required', 'select at least one dependency prompt')
      }
      const prompt = await tracker.deferPrompt({
        workspaceId: workspace.id,
        taskId: task.id,
        sessionId,
        text,
        dependsOn,
        commitId,
      })
      if (!prompt) throw fail(404, 'task_not_found', 'task not found')
      // The waiting node is durable before release: dispatch may resume a
      // cold Session, and a crash must not leave a native prompt without its
      // task record.
      tracker.releaseReady()
      send(res, 200, { ok: true, prompt: { id: prompt.id, status: prompt.status, dependsOn: prompt.dependsOn } })
      return
    }

    if (action === 'recordVisit') {
      // Quick-switcher recency/frequency metadata. This is not a content
      // change, so updatedAt stays untouched.
      task.visitCount = (Number.isFinite(task.visitCount) ? task.visitCount : 0) + 1
      task.lastVisitedAt = Date.now()
      await store.save()
      send(res, 200, {
        ok: true,
        visit: { taskId: task.id, lastVisitedAt: task.lastVisitedAt, visitCount: task.visitCount },
      })
      return
    }

    throw fail(400, 'unknown_action', 'unknown task action')
  }

  async function getCapture(req, res, url) {
    const sessionId = requireSessionId(url.searchParams.get('sessionId'))
    await store.ensure()
    // The banner polls this on every entry into a Session. The mapping is
    // durable, so this survives a Host restart or a Web UI reconnect.
    send(res, 200, { ok: true, capture: tracker.get(sessionId) })
  }

  async function postCapture(req, res) {
    const body = await readJson(req)
    const action = typeof body?.action === 'string' ? body.action : ''

    if (action === 'releaseAll') {
      tracker.releaseAll()
      send(res, 200, { ok: true, capture: null })
      return
    }

    const sessionId = requireSessionId(body?.sessionId)

    if (action === 'cancel' || action === 'release') {
      if (tracker.cancel(sessionId)) await store.save()
      send(res, 200, { ok: true, capture: null })
      return
    }

    if (action !== 'arm') throw fail(400, 'unknown_action', 'unknown capture action')

    const workspace = requireWorkspace(body?.workspaceId)
    if (!(workspace.sessionIds ?? []).includes(sessionId)) {
      // A session created from the browser may not be in the cached workspace
      // membership yet. A brand-new session path is accepted only when the
      // Host's own header places it in this workspace.
      if (body?.newSession !== true) {
        throw fail(400, 'session_not_in_workspace', 'session does not belong to this workspace')
      }
      let header = null
      try {
        header = (await ctx.sessionQuery.readTitleSnapshot(sessionId))?.session ?? null
      } catch {
        header = null
      }
      if (!header || header.cwd !== workspace.path) {
        throw fail(400, 'session_not_in_workspace', 'session does not belong to this workspace')
      }
    }
    await store.ensure()
    const task = taskOf(workspace.id, body?.taskId ?? '')
    if (!task) throw fail(404, 'task_not_found', 'task not found')
    const capture = tracker.arm(sessionId, workspace.id, task.id)
    if (!capture) throw fail(404, 'task_not_found', 'task not found')
    await store.save()
    send(res, 200, { ok: true, capture })
  }

  function requireWorkspace(workspaceId) {
    if (typeof workspaceId !== 'string' || !workspaceId) throw fail(400, 'workspace_required', 'workspace id required')
    const workspace = findWorkspace(workspaceId)
    if (!workspace) throw fail(404, 'workspace_not_found', 'workspace not found')
    return workspace
  }

  async function handler(req, res) {
    try {
      if (!isTrustedRequest(req)) throw fail(403, 'forbidden', 'forbidden')
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (!url.pathname.startsWith(ROUTE)) throw fail(404, 'not_found', 'not found')
      const path = url.pathname.slice(ROUTE.length) || '/'
      const route = routes.get(`${req.method} ${path}`)
      if (!route) {
        if (routePaths.has(path)) throw fail(405, 'method_not_allowed', 'method not allowed')
        throw fail(404, 'not_found', 'not found')
      }
      await route(req, res, url)
    } catch (error) {
      if (res.headersSent) {
        res.destroy()
        return
      }
      const status = Number(error?.status) || 500
      const code = typeof error?.code === 'string' ? error.code : 'internal_error'
      if (status >= 500) logger?.warn?.(`[session-todo] ${req.method} ${req.url} failed: ${describe(error)}`)
      send(res, status, { ok: false, code, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { handler }
}

/** One workspace as the browser sees it. */
function publicWorkspace(workspace) {
  return {
    id: workspace.id,
    title: workspace.title,
    path: workspace.path,
    sessionIds: Array.isArray(workspace.sessionIds) ? workspace.sessionIds : [],
  }
}

/** Task board row: no prompt bodies. */
function taskSummary(task) {
  const prompts = Array.isArray(task?.prompts) ? task.prompts : []
  const sessions = new Set()
  let activePromptCount = 0
  let waitingPromptCount = 0
  for (const prompt of prompts) {
    if (prompt?.sessionId) sessions.add(prompt.sessionId)
    if (isActive(prompt)) activePromptCount += 1
    if (prompt?.status === 'waiting') waitingPromptCount += 1
  }
  return {
    id: typeof task?.id === 'string' ? task.id : '',
    title: typeof task?.title === 'string' ? task.title : '',
    description: typeof task?.description === 'string' ? task.description : '',
    promptCount: prompts.length,
    sessionCount: sessions.size,
    activePromptCount,
    waitingPromptCount,
    createdAt: Number.isFinite(task?.createdAt) ? task.createdAt : 0,
    updatedAt: Number.isFinite(task?.updatedAt) ? task.updatedAt : 0,
    lastVisitedAt: Number.isFinite(task?.lastVisitedAt) ? task.lastVisitedAt : null,
    visitCount: Number.isFinite(task?.visitCount) ? task.visitCount : 0,
  }
}

/** Prompt board payload: prompt bodies without native request ids. */
function publicTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    prompts: (task.prompts ?? []).map((prompt) => ({
      id: prompt.id,
      text: prompt.text,
      sessionId: prompt.sessionId ?? null,
      eventSeq: Number.isFinite(prompt.eventSeq) ? prompt.eventSeq : null,
      turn: Number.isFinite(prompt.turn) ? prompt.turn : null,
      status: prompt.status,
      dependsOn: Array.isArray(prompt.dependsOn) ? [...prompt.dependsOn] : [],
      createdAt: prompt.createdAt,
      startedAt: Number.isFinite(prompt.startedAt) ? prompt.startedAt : null,
      finishedAt: Number.isFinite(prompt.finishedAt) ? prompt.finishedAt : null,
      error: prompt.error ?? null,
    })),
  }
}

function isActive(prompt) {
  return prompt?.status === 'queued' || prompt?.status === 'running'
}

function touch(bucket, task) {
  task.updatedAt = Date.now()
  bucket.updatedAt = task.updatedAt
}

function cleanTitle(value) {
  const title = trimText(value, MAX_TITLE_CHARS).trim()
  if (!title) throw fail(400, 'title_required', 'task title cannot be empty')
  return title
}

function cleanDescription(value) {
  return trimText(value, MAX_DESCRIPTION_CHARS).trim()
}

function requireSessionId(value) {
  if (typeof value !== 'string' || !SESSION_ID_RE.test(value)) {
    throw fail(400, 'invalid_session', 'invalid session id')
  }
  return value
}

function fail(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

/** @param {import('node:http').IncomingMessage} req */
function isTrustedRequest(req) {
  if (!isLoopback(req.socket?.remoteAddress)) return false
  if (!isLoopbackHost(req.headers.host)) return false
  if (req.headers['x-dsh-todo'] !== '1') return false
  const origin = req.headers.origin
  if (typeof origin !== 'string') return true
  if (origin === 'null') return false
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function isLoopback(address) {
  if (typeof address !== 'string' || address.length === 0) return false
  const value = address.startsWith('::ffff:') ? address.slice(7) : address
  return value === '::1' || value === '127.0.0.1' || value.startsWith('127.')
}

function isLoopbackHost(host) {
  if (typeof host !== 'string' || host.length === 0) return false
  const lower = host.toLowerCase()
  if (lower.startsWith('[')) {
    const end = lower.indexOf(']')
    return end > 1 && lower.slice(1, end) === '::1'
  }
  const name = lower.split(':')[0]
  return name === 'localhost' || name === '::1' || /^127(?:\.\d{1,3}){3}$/.test(name)
}

/** @param {import('node:http').IncomingMessage} req */
async function readJson(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw fail(413, 'body_too_large', 'request body too large')
    chunks.push(chunk)
  }
  if (total === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw fail(400, 'invalid_json', 'invalid JSON body')
  }
}

/** @param {import('node:http').ServerResponse} res */
function send(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

export { ROUTE }
