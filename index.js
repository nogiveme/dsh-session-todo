/**
 * Host half of the workspace task center.
 *
 * Tasks belong to workspaces and are session-free. A task records real prompt
 * turns from any number of native sessions; opening a session from a prompt
 * board binds it to that task, and every message the user later sends in the
 * session's own composer is recorded until the binding is released. A prompt
 * can also be created to wait for other prompt nodes; it is submitted to its
 * native session only after every dependency reaches a terminal state.
 *
 * @module @local/dsh-session-todo
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createPromptTracker } from './prompt-tracker.js'
import { ROUTE, createRoutes } from './routes.js'
import { createStore, describe } from './store.js'

/** Host capabilities required by the task center. */
export const inject = ['webServer', 'workspaceRegistry', 'sessionQuery', 'sessionController', 'agents']

/**
 * Apply the Host half.
 * @param {object} ctx - Host context.
 */
export function apply(ctx) {
  const home = ctx.profileContext?.home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const store = createStore(join(home, 'session-todo', 'todos.json'), { logger: ctx.logger })
  const tracker = createPromptTracker({ ctx, store, logger: ctx.logger })
  const { handler } = createRoutes({ ctx, store, tracker, logger: ctx.logger })

  ctx.effect(
    () => ctx.on('session/event', tracker.onSessionEvent, { global: true }),
    'session-todo: prompt attribution observer',
  )
  ctx.effect(
    () => ctx.on('agent/inbox/discarded', (payload) => tracker.onInboxDiscarded(payload?.message)),
    'session-todo: waiting dependency cancellation observer',
  )
  ctx.effect(
    () => ctx.on('agent/status', ({ status }) => {
      // The last queued/steered turn ends before the Agent publishes idle.
      // Releasing on idle is what makes the wait cover the whole batch.
      if (status === 'idle') tracker.releaseReady()
    }),
    'session-todo: waiting dependency idle observer',
  )
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler }),
    'session-todo: HTTP bridge',
  )
  ctx.effect(() => {
    // reconcile() opens the store itself, after any early session events.
    void tracker.reconcile()
      .catch((error) => ctx.logger?.warn?.(`[session-todo] startup reconcile failed: ${describe(error)}`))
  }, 'session-todo: startup reconcile')
  ctx.effect(
    () => () => tracker.dispose(),
    'session-todo: cleanup',
  )
}
