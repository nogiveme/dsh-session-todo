window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PKG = '@local/dsh-session-todo'
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
    // Copy
    // ---------------------------------------------------------------------

    const ZH = {
      'entry.label': '待办',
      'app.eyebrow': 'TASKS',
      'overview.title': '总控',
      'overview.subtitle': '任务按工作区组织。点开一个项目，查看它的任务看板。',
      'overview.workspaces': '项目',
      'overview.count.one': '{count} 个项目',
      'overview.count.other': '{count} 个项目',
      'overview.empty': '还没有工作区。先在 DSH 左侧栏添加或打开一个项目。',
      'overview.taskCount.one': '{count} 个任务',
      'overview.taskCount.other': '{count} 个任务',
      'overview.promptCount.one': '{count} 条 Prompt',
      'overview.promptCount.other': '{count} 条 Prompt',
      'overview.activeCount': '{count} 个进行中',
      'overview.lastActivity': '最近活动 {time}',
      'overview.noActivity': '暂无活动',
      'overview.open': '打开',
      'overview.untitled': '未命名工作区',
      'common.refresh': '刷新',
      'common.retry': '重试',
      'common.cancel': '取消',
      'common.save': '保存',
      'common.close': '关闭',
      'common.delete': '删除',
      'error.loadWorkspaces': '读取项目失败：{message}',
      'error.loadWorkspace': '读取任务看板失败：{message}',
      'error.loadTask': '读取 Prompt 看板失败：{message}',
      'error.request': '请求失败：{message}',
      'error.render': '任务中心渲染失败：{message}',
      'errors.workspaceMissing': '这个工作区已经不存在了。',
      'errors.taskMissing': '这个任务已经不存在了。',
      'errors.promptMissing': '这条 Prompt 已经不存在了。',
      'errors.sessionMissing': '所选会话不属于这个工作区。',
      'errors.titleRequired': '任务标题不能为空。',
      'errors.sessionTitleRequired': '会话标题不能为空。',
      'errors.bodyTooLarge': '请求内容过大。',
      'errors.invalidJson': '请求格式无效。',
      'board.back': '总控',
      'board.newTask': '新建任务',
      'board.tasks': '任务看板',
      'board.taskCount.one': '{count} 个任务',
      'board.taskCount.other': '{count} 个任务',
      'board.noTasks': '还没有任务',
      'board.noTasksHint': '新建一个任务，点进任务后添加 Prompt。',
      'board.noDescription': '暂无描述',
      'board.promptCount.one': '{count} 条 Prompt',
      'board.promptCount.other': '{count} 条 Prompt',
      'board.sessionCount.one': '{count} 个会话',
      'board.sessionCount.other': '{count} 个会话',
      'board.activeCount': '{count} 个进行中',
      'board.updated': '更新 {time}',
      'board.created': '任务已创建。',
      'form.title': '任务标题',
      'form.titlePlaceholder': '例如：重构任务中心',
      'form.description': '简短描述（可选）',
      'form.descriptionPlaceholder': '一句话说明这个任务要做什么',
      'form.create': '创建任务',
      'task.back': '任务看板',
      'task.editTitle': '重命名任务',
      'task.editDescription': '编辑描述',
      'task.delete': '删除任务',
      'task.deleteConfirm': '删除任务「{title}」？只会删除插件内的任务与 Prompt 记录，不会删除原生会话消息。',
      'task.addPrompt': '添加 Prompt',
      'task.promptCount.one': '{count} 条 Prompt',
      'task.promptCount.other': '{count} 条 Prompt',
      'task.noDescription': '暂无描述。补一句任务目标，看板会更清楚。',
      'task.noPrompts': '还没有 Prompt',
      'task.noPromptsHint': '添加 Prompt 会打开所选会话；本会话后续发送都会成为这个任务的节点。归属会持久保留（刷新或重连后仍显示），点「取消」才会取消。',
      'task.updated': '更新 {time}',
      'task.removePrompt': '从任务中移除',
      'task.removePromptConfirm': '移除这条 Prompt 记录？原生会话中的消息不会被删除。',
      'task.removed': '已从任务中移除。',
      'task.saved': '已保存。',
      'task.sessionRenamed': '会话标题已更新。',
      'group.noSession': '未绑定会话',
      'group.removed': '已移除的会话',
      'group.untitled': '未命名会话',
      'group.count.one': '{count} 条',
      'group.count.other': '{count} 条',
      'group.live': '运行中',
      'group.open': '打开原生会话',
      'group.rename': '重命名会话',
      'group.renamePlaceholder': '输入会话标题',
      'node.index': '第 {index} 条',
      'node.hint': '点击定位到原生会话',
      'preview.title': 'Prompt 预览',
      'status.draft': '待发送',
      'status.queued': '排队中',
      'status.running': '执行中',
      'status.done': '完成',
      'status.failed': '失败',
      'status.cancelled': '已取消',
      'status.unknown': '状态未知',
      'picker.title': '添加 Prompt',
      'picker.hint': '选择后会打开该会话；本会话后续发送都会成为这个任务的节点。归属会持久保留，点「取消」才会取消。',
      'picker.search': '按 Session 标题检索',
      'picker.clearSearch': '清除检索',
      'picker.newSession': '新建会话',
      'picker.newSessionHint': '空白会话',
      'picker.creating': '正在创建会话…',
      'picker.empty': '这个工作区还没有会话。',
      'picker.noMatches': '没有标题匹配的 Session。',
      'picker.existing': '已有 {count} 条',
      'picker.live': '运行中',
      'capture.back': '返回',
      'capture.cancel': '取消',
      'capture.armed': '本会话已归属该任务，后续发送都会记录；刷新或重连后仍会保留。点「返回」打开任务看板，点「取消」取消归属并停止记录。',
      'jump.locating': '正在打开原生会话并定位…',
      'jump.done': '已定位到原生会话。',
      'jump.failed': '没有在原生会话中找到这条 Prompt。可能历史尚未加载，或这条消息已不在当前会话窗口内。',
      'jump.noSession': '这条 Prompt 没有绑定会话，无法定位。',
      'jump.queued': '这条 Prompt 还在排队，尚未进入原生对话。已为你打开会话。',
      'jump.notStarted': '这条 Prompt 还没有被执行。已为你打开会话。',
      'quick.open': '快速切换',
      'quick.title': '快速切换任务',
      'quick.search': '搜索任务或项目',
      'quick.empty': '还没有任务。',
      'quick.noMatches': '没有匹配的任务。',
      'quick.current': '当前',
      'quick.hint': '↑↓ 选择 · Enter 打开 · Esc 关闭',
      'error.loadTasks': '读取任务列表失败：{message}',
    }

    const EN = {
      'entry.label': 'Tasks',
      'app.eyebrow': 'TASKS',
      'overview.title': 'Task control',
      'overview.subtitle': 'Tasks are organized by workspace. Open a project to see its task board.',
      'overview.workspaces': 'Projects',
      'overview.count.one': '{count} project',
      'overview.count.other': '{count} projects',
      'overview.empty': 'No workspaces yet. Add or open a project from the DSH sidebar first.',
      'overview.taskCount.one': '{count} task',
      'overview.taskCount.other': '{count} tasks',
      'overview.promptCount.one': '{count} prompt',
      'overview.promptCount.other': '{count} prompts',
      'overview.activeCount': '{count} active',
      'overview.lastActivity': 'Last activity {time}',
      'overview.noActivity': 'No activity yet',
      'overview.open': 'Open',
      'overview.untitled': 'Untitled workspace',
      'common.refresh': 'Refresh',
      'common.retry': 'Retry',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.close': 'Close',
      'common.delete': 'Delete',
      'error.loadWorkspaces': 'Failed to load projects: {message}',
      'error.loadWorkspace': 'Failed to load the task board: {message}',
      'error.loadTask': 'Failed to load the prompt board: {message}',
      'error.request': 'Request failed: {message}',
      'error.render': 'Task center failed to render: {message}',
      'errors.workspaceMissing': 'This workspace no longer exists.',
      'errors.taskMissing': 'This task no longer exists.',
      'errors.promptMissing': 'This prompt no longer exists.',
      'errors.sessionMissing': 'The selected session does not belong to this workspace.',
      'errors.titleRequired': 'A task title is required.',
      'errors.sessionTitleRequired': 'A session title is required.',
      'errors.bodyTooLarge': 'The request body is too large.',
      'errors.invalidJson': 'The request body is not valid JSON.',
      'board.back': 'Control',
      'board.newTask': 'New task',
      'board.tasks': 'Task board',
      'board.taskCount.one': '{count} task',
      'board.taskCount.other': '{count} tasks',
      'board.noTasks': 'No tasks yet',
      'board.noTasksHint': 'Create a task, then open it to add prompts.',
      'board.noDescription': 'No description',
      'board.promptCount.one': '{count} prompt',
      'board.promptCount.other': '{count} prompts',
      'board.sessionCount.one': '{count} session',
      'board.sessionCount.other': '{count} sessions',
      'board.activeCount': '{count} active',
      'board.updated': 'Updated {time}',
      'board.created': 'Task created.',
      'form.title': 'Task title',
      'form.titlePlaceholder': 'For example: rebuild the task center',
      'form.description': 'Short description (optional)',
      'form.descriptionPlaceholder': 'One sentence about what this task is for',
      'form.create': 'Create task',
      'task.back': 'Task board',
      'task.editTitle': 'Rename task',
      'task.editDescription': 'Edit description',
      'task.delete': 'Delete task',
      'task.deleteConfirm': 'Delete “{title}”? This removes the task and its prompt records from the plugin; native session messages are untouched.',
      'task.addPrompt': 'Add prompt',
      'task.promptCount.one': '{count} prompt',
      'task.promptCount.other': '{count} prompts',
      'task.noDescription': 'No description yet. Add one sentence so the board stays clear.',
      'task.noPrompts': 'No prompts yet',
      'task.noPromptsHint': 'Add prompt opens the chosen session; later sends in it become nodes of this task. The attribution stays durable across refreshes and reconnects; only Cancel removes it.',
      'task.updated': 'Updated {time}',
      'task.removePrompt': 'Remove from task',
      'task.removePromptConfirm': 'Remove this prompt record? The native session message is not deleted.',
      'task.removed': 'Removed from the task.',
      'task.saved': 'Saved.',
      'task.sessionRenamed': 'Session title updated.',
      'group.noSession': 'No session bound',
      'group.removed': 'Removed session',
      'group.untitled': 'Untitled session',
      'group.count.one': '{count} prompt',
      'group.count.other': '{count} prompts',
      'group.live': 'Running',
      'group.open': 'Open native session',
      'group.rename': 'Rename session',
      'group.renamePlaceholder': 'Session title',
      'node.index': 'Prompt {index}',
      'node.hint': 'Click to locate in the native session',
      'preview.title': 'Prompt preview',
      'status.draft': 'Draft',
      'status.queued': 'Queued',
      'status.running': 'Running',
      'status.done': 'Done',
      'status.failed': 'Failed',
      'status.cancelled': 'Cancelled',
      'status.unknown': 'Unknown',
      'picker.title': 'Add a prompt',
      'picker.hint': 'The chosen session opens; later sends in it become nodes of this task. The attribution stays durable; only Cancel removes it.',
      'picker.search': 'Search session titles',
      'picker.clearSearch': 'Clear search',
      'picker.newSession': 'New session',
      'picker.newSessionHint': 'Blank session',
      'picker.creating': 'Creating a session…',
      'picker.empty': 'This workspace has no sessions yet.',
      'picker.noMatches': 'No sessions match this title.',
      'picker.existing': '{count} in task',
      'picker.live': 'Running',
      'capture.back': 'Back',
      'capture.cancel': 'Cancel',
      'capture.armed': 'This session is assigned to this task, and later sends are recorded. The assignment survives refreshes and reconnects. Back opens the task board; Cancel removes the assignment and stops recording.',
      'jump.locating': 'Opening the native session and locating…',
      'jump.done': 'Located in the native session.',
      'jump.failed': 'Could not find this prompt in the native session. Its history may not be loaded, or the message is no longer in the current window.',
      'jump.noSession': 'This prompt has no session bound, so it cannot be located.',
      'jump.queued': 'This prompt is still queued and has not entered the conversation yet. The session was opened.',
      'jump.notStarted': 'This prompt has not run yet. The session was opened.',
      'quick.open': 'Switch task',
      'quick.title': 'Quick task switch',
      'quick.search': 'Search tasks or projects',
      'quick.empty': 'No tasks yet.',
      'quick.noMatches': 'No tasks match.',
      'quick.current': 'Current',
      'quick.hint': '↑↓ select · Enter open · Esc close',
      'error.loadTasks': 'Failed to load tasks: {message}',
    }

    // ---------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------

    const CSS = `
.st-root{--st-radius:var(--dsw-radius-panel,28px);height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-sizing:border-box}
.st-panelIcon{display:inline-flex;align-items:center;justify-content:center}
.st-shell{max-width:1120px;min-height:100%;margin:0 auto;padding:28px 28px 56px;display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
.st-pageHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.st-pageHeadMain{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}
.st-back{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;height:24px;padding:0 7px 0 5px;margin-bottom:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.st-back:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.st-eyebrow{font-size:10px;line-height:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.st-pageTitle{font-size:23px;line-height:31px;margin:0;font-weight:650;overflow:hidden;text-overflow:ellipsis}
.st-pageSubtitle{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);max-width:72ch;word-break:break-word}
.st-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:18px}
.st-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:29px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.st-btn:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.st-btn[data-primary="true"]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.st-btn[data-primary="true"]:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 88%,var(--dsw-alias-label-primary))}
.st-btn[data-danger="true"]{color:var(--dsw-alias-state-error-primary)}
.st-btn:disabled{opacity:.45;cursor:default}
.st-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:1px solid transparent;border-radius:var(--st-radius);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;flex:none}
.st-iconBtn:hover{border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.st-iconBtn[data-danger="true"]:hover{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent)}
.st-iconBtn:disabled{opacity:.4;cursor:default}
.st-chip{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:var(--st-radius);background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1;white-space:nowrap}
.st-chip[data-tone="warn"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent);color:var(--dsw-alias-state-warn-primary)}
.st-chip[data-tone="run"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);color:var(--dsw-alias-brand-primary)}
.st-chip[data-tone="error"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary)}
.st-chip[data-tone="done"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}
.st-chips{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(292px,1fr));gap:10px}
.st-wsCard,.st-taskCard{display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1);text-align:start;color:inherit;font:inherit;cursor:pointer;transition:border-color .12s ease,transform .12s ease,box-shadow .12s ease;min-width:0}
.st-wsCard:hover,.st-taskCard:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px);box-shadow:0 10px 26px color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.st-wsTitleRow,.st-cardTitleRow{display:flex;align-items:center;gap:6px;min-width:0;color:var(--dsw-alias-label-primary)}
.st-wsTitle,.st-cardTitle{font-size:13.5px;line-height:20px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-wsPath{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-cardDesc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);min-height:18px;word-break:break-word}
.st-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.st-cardFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.st-cardEnter{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
.st-empty{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:28px;border:1px dashed var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1)}
.st-emptyTitle{font-size:13.5px;font-weight:600}
.st-emptyHint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);max-width:60ch}
.st-error{padding:10px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 60%,var(--dsw-alias-border-l1));border-radius:var(--st-radius);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);font-size:12px;line-height:18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.st-notice{padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:18px}
.st-notice[data-tone="error"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary)}
.st-notice[data-tone="info"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l1))}
.st-jumpNotice{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l1));border-radius:var(--st-radius);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);font-size:11.5px;line-height:17px}
.st-jumpNotice[data-tone="error"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent);color:var(--dsw-alias-state-error-primary)}
.st-loading{display:flex;flex-direction:column;gap:8px}
.st-skeleton{height:64px;border-radius:var(--st-radius);background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1) 25%,var(--dsw-alias-bg-layer-2) 37%,var(--dsw-alias-bg-layer-1) 63%);background-size:400% 100%;animation:stShimmer 1.4s ease infinite}
@keyframes stShimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
.st-form{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1)}
.st-fields{display:flex;flex-direction:column;gap:8px}
.st-field{display:flex;flex-direction:column;gap:4px}
.st-label{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-secondary);letter-spacing:.02em}
.st-input,.st-textarea{box-sizing:border-box;width:100%;padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:18px;outline:none}
.st-input{height:31px}
.st-textarea{resize:vertical;min-height:54px;max-height:180px}
.st-input:focus,.st-textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.st-formActions{display:flex;align-items:center;gap:6px}
.st-taskHead{display:flex;flex-direction:column;gap:9px}
.st-taskTitleRow{display:flex;align-items:center;gap:6px;min-width:0}
.st-taskDesc{display:flex;align-items:flex-start;gap:6px;min-width:0}
.st-taskDescText{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;max-width:76ch}
.st-taskDescText[data-empty="true"]{color:var(--dsw-alias-label-secondary);opacity:.75}
.st-taskMeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:2px}
.st-inlineEditor{display:flex;flex-direction:column;gap:7px;width:min(620px,100%)}
.st-titleInput{font-size:17px;font-weight:600;height:36px}
.st-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;margin:4px 0 2px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-2);font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.st-groups{display:flex;flex-direction:column;gap:12px}
.st-group{padding:12px 14px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1);--st-accent:var(--dsw-alias-brand-primary)}
.st-groupHead{display:flex;align-items:center;gap:7px;min-width:0;padding:0 2px 7px}
.st-groupTitle{font-size:13px;line-height:19px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.st-groupActions{display:flex;align-items:center;gap:4px;margin-left:auto}
.st-sessionEditor{display:flex;align-items:center;gap:6px;padding:0 2px 8px}
.st-sessionEditor .st-input{flex:1;min-width:0}
.st-chain{position:relative;margin-left:6px;padding-left:23px;display:flex;flex-direction:column;gap:1px}
.st-chain::before{content:"";position:absolute;left:4px;top:6px;bottom:6px;width:1px;background:color-mix(in srgb,var(--st-accent) 55%,transparent)}
.st-nodeRow{position:relative;display:flex;align-items:flex-start;gap:2px;border-radius:var(--st-radius);min-width:0}
.st-nodeRow::before{content:"";position:absolute;left:-23px;top:13px;width:8px;height:8px;border-radius:50%;background:var(--st-accent);border:2px solid var(--dsw-alias-bg-layer-1);box-sizing:content-box}
.st-nodeRow[data-status="running"]::before{animation:stNodePulse 1.8s ease-in-out infinite}
@keyframes stNodePulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--st-accent) 42%,transparent)}55%{box-shadow:0 0 0 4px transparent}}
.st-nodeRow:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.st-node{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:8px 6px;border:none;border-radius:var(--st-radius);background:transparent;color:inherit;font:inherit;text-align:start;cursor:pointer}
.st-nodeText{font-size:12.5px;line-height:19px;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.st-nodeMeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.st-nodeError{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34ch;color:var(--dsw-alias-state-error-primary)}
.st-nodeRemove{opacity:0;margin-top:4px;transition:opacity .12s ease}
@media (hover:none){.st-nodeRemove{opacity:1}}
.st-nodeRow:hover .st-nodeRemove,.st-nodeRow:focus-within .st-nodeRemove{opacity:1}
.st-preview{position:fixed;z-index:140;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;max-height:min(62vh,520px);overflow:auto;padding:13px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:var(--dsw-alias-bg-overlay);box-shadow:0 20px 52px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.st-previewHead{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.st-previewTitle{font-size:11px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-primary)}
.st-previewText{font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.st-previewFoot{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.st-overlay{position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.st-scrim{position:absolute;inset:0;background:color-mix(in srgb,var(--dsw-alias-bg-base) 32%,transparent);backdrop-filter:blur(2px)}
.st-dialog{position:relative;z-index:1;width:min(480px,100%);max-height:min(74vh,580px);display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1);box-shadow:0 26px 70px color-mix(in srgb,var(--dsw-alias-label-primary) 24%,transparent);overflow:hidden}
.st-dialogHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 9px}
.st-dialogTitle{font-size:13.5px;font-weight:600}
.st-dialogHint{padding:0 18px 11px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.st-search{display:flex;align-items:center;gap:8px;height:44px;margin:0 10px 10px;padding:0 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-base);flex:none}
.st-search:focus-within{border-color:var(--dsw-alias-brand-primary)}
.st-searchIcon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary)}
.st-searchInput{flex:1;min-width:0;border:none;background:transparent;color:inherit;font:inherit;font-size:13.5px;outline:none}
.st-searchClear{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:var(--st-radius);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.st-searchClear:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.st-newSession{margin:0 8px;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent)}
.st-newSession .st-optionTitle{font-weight:600}
.st-optionHint{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.st-optionDivider{height:1px;margin:4px 8px 7px;background:var(--dsw-alias-border-l1);flex:none}
.st-dialogBody{overflow:auto;padding:2px 10px 12px;display:flex;flex-direction:column;gap:3px}
.st-option{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:1px solid transparent;border-radius:var(--st-radius);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:start;cursor:pointer}
.st-option:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);border-color:var(--dsw-alias-border-l1)}
.st-optionTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-optionEmpty{padding:14px 6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.st-quickOverlay{--st-radius:var(--dsw-radius-panel,28px);position:absolute;inset:0;z-index:30;box-sizing:border-box;display:flex;align-items:flex-start;justify-content:center;padding:min(12vh,104px) 16px 24px}
.st-quickScrim{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.32));backdrop-filter:var(--dsw-mask-blur)}
.st-quickCard{position:relative;z-index:1;width:min(680px,100%);max-height:min(72vh,660px);display:flex;flex-direction:column;border:0;border-radius:var(--st-radius);background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);overflow:hidden}
.st-quickHeadActions{display:flex;align-items:center;gap:4px}
.st-quickBody{flex:1;min-height:0}
.st-quickRow{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border:1px solid transparent;border-radius:var(--st-radius);background:transparent;color:inherit;font:inherit;text-align:start;cursor:pointer}
.st-quickRow:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);border-color:var(--dsw-alias-border-l1)}
.st-quickRow[data-quick-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 38%,var(--dsw-alias-border-l1))}
.st-quickMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.st-quickRowTitle{font-size:12.5px;line-height:18px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.st-quickRowMeta{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-quickRowTime{flex:none;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.st-quickEmpty{padding:24px 12px;text-align:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.st-quickFoot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 18px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.st-capture{--st-radius:var(--dsw-radius-panel,28px);box-sizing:border-box;display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,100%);min-height:52px;padding:12px 18px;margin:4px auto;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--st-radius);background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.st-captureDot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:none}
.st-captureTitle{flex:0 1 auto;max-width:min(58%,520px);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-primary)}
.st-captureInfo{position:relative;display:inline-flex;align-items:center;flex:none}
.st-captureInfoBtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);cursor:help;flex:none}
.st-captureInfoBtn:hover,.st-captureInfoBtn:focus-visible{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.st-captureTip{position:absolute;z-index:40;box-sizing:border-box;width:max-content;max-width:min(380px,72vw);padding:8px 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 32px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);color:var(--dsw-alias-label-primary);font-size:11.5px;line-height:17px;font-weight:400;white-space:normal;text-align:start;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease,visibility .12s ease}
.st-captureTip[data-open="true"]{opacity:1;visibility:visible}
.st-captureActions{display:flex;align-items:center;gap:10px;flex:none;margin-left:auto}
.st-captureBtn{border:none;background:transparent;padding:0;color:var(--dsw-alias-brand-primary);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:2px;flex:none}
.st-muted{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.st-btn:focus-visible,.st-iconBtn:focus-visible,.st-back:focus-visible,.st-wsCard:focus-visible,.st-taskCard:focus-visible,.st-node:focus-visible,.st-option:focus-visible,.st-input:focus-visible,.st-textarea:focus-visible,.st-captureBtn:focus-visible,.st-captureInfoBtn:focus-visible,.st-quickRow:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
@media (max-width:720px){.st-shell{padding:18px 14px 36px}.st-actions{padding-top:0;width:100%}.st-pageHead{gap:10px}.st-grid{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.st-wsCard,.st-taskCard,.st-nodeRow::before{transition:none;animation:none}.st-skeleton{animation:none}}
`

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

    const ERROR_KEYS = {
      workspace_not_found: 'errors.workspaceMissing',
      task_not_found: 'errors.taskMissing',
      prompt_not_found: 'errors.promptMissing',
      session_not_in_workspace: 'errors.sessionMissing',
      title_required: 'errors.titleRequired',
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

    const RuntimeContext = React.createContext(null)

    function useRuntime() {
      const runtime = React.useContext(RuntimeContext)
      if (!runtime) throw new Error('task center runtime is not available')
      return runtime
    }

    /**
     * Subscribe to the native Session list so a rename made in the sidebar (or
     * by this plugin) reaches every session title the prompt board renders.
     * @returns session rows keyed by id.
     */
    function useSessionRows() {
      const runtime = useRuntime()
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

    function usePolled(load, key, options) {
      const { t } = useRuntime()
      const active = options?.active !== false
      const interval = options?.interval ?? 2000
      // A hidden tab neither needs fresh boards nor should keep the Host busy.
      const visible = usePageVisible()
      const polling = active && visible
      const loadRef = React.useRef(load)
      loadRef.current = load
      const lastRef = React.useRef({ key: null, text: '' })
      const [data, setData] = React.useState(() => payloadCache.get(key) ?? null)
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
            const payload = await loadRef.current()
            if (!alive) return
            rememberPayload(key, payload)
            // A poll that returns the same board must not re-render the whole
            // panel; every prompt node and its Intl-formatted time would be
            // rebuilt for nothing. Compare the serialized payload instead.
            const text = JSON.stringify(payload)
            if (lastRef.current.key !== key || lastRef.current.text !== text) {
              lastRef.current = { key, text }
              setData(payload)
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
      }, [polling, key, interval, t, nonce])

      return {
        data,
        error,
        reload: React.useCallback(() => setNonce((value) => value + 1), []),
      }
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
                Icon('back', 12),
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

    function RefreshButton({ onClick }) {
      const { t } = useRuntime()
      return h(IconButton, { icon: 'refresh', label: t('common.refresh'), size: 14, onClick })
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

    function ErrorBlock({ message, onRetry }) {
      const { t } = useRuntime()
      return h(
        'div',
        { className: 'st-error' },
        h('span', null, message),
        h('button', { type: 'button', className: 'st-btn', onClick: onRetry }, t('common.retry')),
      )
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

    function TaskCreateForm({ busy, onCreate, onCancel }) {
      const { t } = useRuntime()
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
    // Overview
    // ---------------------------------------------------------------------

    function Overview({ active, onOpen }) {
      const runtime = useRuntime()
      const { t } = runtime
      const locale = runtime.locale()
      const { data, error, reload } = usePolled(() => runtime.request('/workspaces'), 'workspaces', { active, interval: 4000 })
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
                h('span', { className: 'st-chip' }, countText(t, locale, 'overview.taskCount', workspace.taskCount ?? 0)),
                h('span', { className: 'st-chip' }, countText(t, locale, 'overview.promptCount', workspace.promptCount ?? 0)),
                workspace.activePromptCount > 0
                  ? h('span', { className: 'st-chip', 'data-tone': 'run' }, t('overview.activeCount', { count: workspace.activePromptCount }))
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
        error && data ? h('div', { className: 'st-notice', 'data-tone': 'error' }, t('error.loadWorkspaces', { message: error })) : null,
        body,
      )
    }

    // ---------------------------------------------------------------------
    // Task board
    // ---------------------------------------------------------------------

    function Board({ active, workspaceId, onBack, onOpenTask }) {
      const runtime = useRuntime()
      const { t } = runtime
      const locale = runtime.locale()
      const { data, error, reload } = usePolled(
        () => runtime.request(`/workspace?workspaceId=${encodeURIComponent(workspaceId)}`),
        `board:${workspaceId}`,
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
          await runtime.request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'createTask', title, description }),
          })
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
                h('span', { className: 'st-chip' }, countText(t, locale, 'board.promptCount', task.promptCount)),
                task.sessionCount > 0 ? h('span', { className: 'st-chip' }, countText(t, locale, 'board.sessionCount', task.sessionCount)) : null,
                task.activePromptCount > 0
                  ? h('span', { className: 'st-chip', 'data-tone': 'run' }, t('board.activeCount', { count: task.activePromptCount }))
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
        error && data ? h('div', { className: 'st-notice', 'data-tone': 'error' }, t('error.loadWorkspace', { message: error })) : null,
        notice ? h('div', { className: 'st-notice' }, notice) : null,
        creating ? h(TaskCreateForm, { busy, onCreate: createTask, onCancel: () => setCreating(false) }) : null,
        body,
      )
    }

    // ---------------------------------------------------------------------
    // Prompt preview and picker
    // ---------------------------------------------------------------------

    function PromptPreview({ preview, onEnter, onLeave }) {
      const runtime = useRuntime()
      const { t } = runtime
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
          h('span', { className: 'st-chip', 'data-tone': meta.tone }, meta.label),
          h('span', { className: 'st-chip' }, t('node.index', { index })),
        ),
        h('div', { className: 'st-previewText' }, prompt.text),
        prompt.error ? h('div', { className: 'st-previewFoot', style: { color: 'var(--dsw-alias-state-error-primary)' } }, prompt.error) : null,
        h('div', { className: 'st-previewFoot' }, `${dateTimeText(prompt.createdAt, runtime.locale())} · ${t('node.hint')}`),
      )
    }

    function SessionPicker({ sessions, counts, busy, onPick, onNewSession, onClose }) {
      const { t } = useRuntime()
      const [query, setQuery] = React.useState('')
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
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
          session.live ? h('span', { className: 'st-chip' }, t('picker.live')) : null,
          counts.get(session.sessionId) > 0
            ? h('span', { className: 'st-chip' }, t('picker.existing', { count: counts.get(session.sessionId) }))
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
    // Quick task switcher
    // ---------------------------------------------------------------------

    /**
     * Rebuild quick-switcher rows through the core workspace routes when the
     * aggregate `/tasks` read is unavailable. Returns null unless at least one
     * workspace answered, so a genuinely offline bridge still reports errors.
     */
    async function loadTasksFallback(runtime) {
      let overview
      try {
        overview = await runtime.request('/workspaces')
      } catch {
        return null
      }
      const workspaces = Array.isArray(overview.workspaces) ? overview.workspaces : []
      let answered = false
      const results = await Promise.all(
        workspaces.map(async (workspace) => {
          if (!workspace || typeof workspace.id !== 'string') return []
          try {
            const payload = await runtime.request(`/workspace?workspaceId=${encodeURIComponent(workspace.id)}`)
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

    function QuickSwitcher() {
      const runtime = useRuntime()
      const { t } = runtime
      const locale = runtime.locale()
      const open = useStoreValue(runtime.quickOpen)
      const [tasks, setTasks] = React.useState(() => {
        const cached = payloadCache.get(QUICK_TASKS_CACHE_KEY)
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
        const cached = payloadCache.get(QUICK_TASKS_CACHE_KEY)
        const hasCached = Boolean(cached && Array.isArray(cached.tasks))
        if (hasCached) setTasks(cached.tasks)
        setLoading(!hasCached)
        setError(null)
        // A workspace registry refresh can briefly reject one read. Show the
        // cached rows immediately and retry the read before reporting failure.
        const load = async () => {
          try {
            return await runtime.request('/tasks', undefined, { retries: 2, timeoutMs: 8000 })
          } catch (failure) {
            // `/tasks` is newer than the core workspace routes. If a Host
            // running an older plugin half answers 404, rebuild the same rows
            // from the long-standing overview + workspace endpoints instead
            // of turning the quick switcher into an error screen.
            const rows = await loadTasksFallback(runtime)
            if (rows) return { tasks: rows }
            throw failure
          }
        }
        load()
          .then((payload) => {
            if (!alive) return
            const rows = Array.isArray(payload.tasks) ? payload.tasks : []
            setTasks(rows)
            rememberPayload(QUICK_TASKS_CACHE_KEY, { tasks: rows })
          })
          .catch((failure) => {
            if (alive) setError(localizedError(failure, t))
          })
          .finally(() => {
            if (alive) setLoading(false)
          })
        return () => { alive = false }
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
          .sort((left, right) => (
            right.score - left.score
            || (right.task.updatedAt ?? 0) - (left.task.updatedAt ?? 0)
            || String(left.task.title).localeCompare(String(right.task.title))
          ))
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

      const panelActive = (() => {
        try {
          return runtime.serviceOf('layout')?.panelInfo?.getSnapshot()?.activePanelId === PANEL_ID
        } catch {
          return false
        }
      })()
      const currentTaskId = panelActive && runtime.memory.view?.kind === 'task' ? runtime.memory.view.taskId : null
      const choose = (task) => {
        if (task) runtime.navigateToTask(task.workspaceId, task.id)
      }
      const onInputKeyDown = (event) => {
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

      let body
      if (loading && ordered.length === 0) {
        body = h(LoadingBlock, { lines: 2 })
      } else if (error && ordered.length === 0) {
        body = h(ErrorBlock, {
          message: t('error.loadTasks', { message: error }),
          onRetry: () => setReloadNonce((value) => value + 1),
        })
      } else if (ordered.length === 0) {
        body = h('div', { className: 'st-quickEmpty' }, query.trim() ? t('quick.noMatches') : t('quick.empty'))
      } else {
        body = [
          error
            ? h(
                'div',
                { className: 'st-notice', 'data-tone': 'error', key: 'load-error' },
                t('error.loadTasks', { message: error }),
              )
            : null,
          ...ordered.map((task, index) => {
            const workspace = workspaceTitle({ title: task.workspaceTitle, path: task.workspacePath }, t)
            const activityAt = Math.max(task.lastVisitedAt ?? 0, task.updatedAt ?? 0)
            return h(
              'button',
              {
                type: 'button',
                key: task.id,
                className: 'st-quickRow',
                'data-quick-active': String(index === activeIndex),
                onMouseEnter: () => setActiveIndex(index),
                onClick: () => choose(task),
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
              task.id === currentTaskId ? h('span', { className: 'st-chip' }, t('quick.current')) : null,
              h('span', { className: 'st-quickRowTime' }, activityAt > 0 ? dateTimeText(activityAt, locale) : ''),
            )
          }),
        ]
      }

      return h(
        'div',
        { className: 'st-quickOverlay' },
        h('div', { className: 'st-quickScrim', onClick: () => runtime.closeQuickSwitcher() }),
        h(
          'div',
          {
            className: 'st-quickCard',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('quick.title'),
            onKeyDown: (event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              runtime.closeQuickSwitcher()
            },
          },
          h(
            'div',
            { className: 'st-dialogHead' },
            h('span', { className: 'st-dialogTitle' }, t('quick.title')),
            h(
              'div',
              { className: 'st-quickHeadActions' },
              h(IconButton, {
                icon: 'refresh',
                label: t('common.refresh'),
                size: 14,
                onClick: () => setReloadNonce((value) => value + 1),
              }),
              h(IconButton, { icon: 'close', label: t('common.close'), onClick: () => runtime.closeQuickSwitcher() }),
            ),
          ),
          h(
            'div',
            { className: 'st-search' },
            h('span', { className: 'st-searchIcon' }, Icon('search', 13)),
            h('input', {
              className: 'st-searchInput',
              ref: inputRef,
              value: query,
              'aria-label': t('quick.search'),
              placeholder: t('quick.search'),
              onChange: (event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              },
              onKeyDown: onInputKeyDown,
            }),
          ),
          h('div', { className: 'st-dialogBody st-quickBody', ref: bodyRef }, body),
          h('div', { className: 'st-quickFoot' }, t('quick.hint')),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Prompt node
    // ---------------------------------------------------------------------

    function PromptNode({ prompt, index, group, confirming, busy, onJump, onPreview, onPreviewEnd, onAskRemove, onRemove, onCancelRemove }) {
      const runtime = useRuntime()
      const { t } = runtime
      const meta = statusOf(prompt.status, t)
      return h(
        React.Fragment,
        null,
        h(
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
              prompt.status !== 'done' ? h('span', { className: 'st-chip', 'data-tone': meta.tone }, meta.label) : null,
              h('span', null, dateTimeText(prompt.createdAt, runtime.locale())),
              prompt.error ? h('span', { className: 'st-nodeError', title: prompt.error }, prompt.error) : null,
            ),
          ),
          h(IconButton, {
            icon: 'trash',
            label: t('task.removePrompt'),
            size: 12,
            className: 'st-iconBtn st-nodeRemove',
            disabled: busy,
            onClick: () => onAskRemove(prompt),
          }),
        ),
        confirming
          ? h(
              'div',
              { className: 'st-confirm' },
              h('span', null, t('task.removePromptConfirm')),
              h('button', { type: 'button', className: 'st-btn', 'data-danger': 'true', disabled: busy, onClick: () => onRemove(prompt) }, t('common.delete')),
              h('button', { type: 'button', className: 'st-btn', disabled: busy, onClick: onCancelRemove }, t('common.cancel')),
            )
          : null,
      )
    }

    // ---------------------------------------------------------------------
    // Prompt board
    // ---------------------------------------------------------------------

    function TaskDetail({ active, workspaceId, taskId, onBack }) {
      const runtime = useRuntime()
      const { t } = runtime
      const locale = runtime.locale()
      const key = `task:${workspaceId}:${taskId}`
      const { data, error, reload } = usePolled(
        () => runtime.request(`/task?workspaceId=${encodeURIComponent(workspaceId)}&taskId=${encodeURIComponent(taskId)}`),
        key,
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
      const [removePromptId, setRemovePromptId] = React.useState(null)
      const [picker, setPicker] = React.useState(false)
      const [preview, setPreview] = React.useState(null)
      const [sessionEditor, setSessionEditor] = React.useState(null)
      const [sessionBusy, setSessionBusy] = React.useState(false)
      const hideTimer = React.useRef(null)

      const task = data?.task ?? null
      const workspace = data?.workspace ?? null
      // The Client Session list carries canonical titles. Subscribing (rather
      // than reading once per poll) mirrors a sidebar rename immediately and
      // lets the plugin's own rename update both surfaces.
      const sessionRows = useSessionRows()
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
      const titleOfSession = (sessionId) => {
        const summary = sessionRows[sessionId]
        return summary?.title ?? null
      }

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

      React.useEffect(() => () => {
        if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
      }, [])

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

      const cancelHide = () => {
        if (hideTimer.current !== null) {
          window.clearTimeout(hideTimer.current)
          hideTimer.current = null
        }
      }
      const scheduleHide = () => {
        cancelHide()
        hideTimer.current = window.setTimeout(() => {
          hideTimer.current = null
          setPreview(null)
        }, 180)
      }
      const showPreview = (prompt, index, group, element) => {
        cancelHide()
        const rect = element.getBoundingClientRect()
        setPreview({ prompt, index, group, rect })
      }

      const goBack = () => {
        const current = runtime.jumpNotice.get()
        if (current && current.workspaceId === workspaceId && current.taskId === taskId) {
          runtime.jumpNotice.set(null)
        }
        setPreview(null)
        onBack()
      }

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
          await runtime.request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'updateTask', taskId, title, description }),
          })
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
          await runtime.request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'deleteTask', taskId }),
          })
          payloadCache.delete(key)
          payloadCache.delete(`board:${workspaceId}`)
          onBack()
        } catch (failure) {
          setNotice(localizedError(failure, t))
          setBusy(false)
        }
      }

      const removePrompt = async (prompt) => {
        setBusy(true)
        setNotice(null)
        try {
          await runtime.request('/task', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, action: 'deletePrompt', taskId, promptId: prompt.id }),
          })
          setRemovePromptId(null)
          setNotice(t('task.removed'))
          reload()
        } catch (failure) {
          setNotice(localizedError(failure, t))
        } finally {
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

      const activeCount = task.prompts.reduce(
        (count, prompt) => count + (prompt.status === 'queued' || prompt.status === 'running' ? 1 : 0),
        0,
      )
      const titleNode = editor?.field === 'title'
        ? h(
            'div',
            { className: 'st-inlineEditor' },
            h('input', {
              className: 'st-input st-titleInput',
              value: editor.value,
              maxLength: 200,
              autoFocus: true,
              'aria-label': t('form.title'),
              onChange: (event) => setEditor({ field: 'title', value: event.target.value }),
              onKeyDown: (event) => {
                if (event.key === 'Enter') void saveEditor()
                if (event.key === 'Escape') setEditor(null)
              },
            }),
            h(
              'div',
              { className: 'st-formActions' },
              h(PrimaryButton, { onClick: saveEditor, disabled: busy || !editor.value.trim(), icon: 'check' }, t('common.save')),
              h(SecondaryButton, { onClick: () => setEditor(null), disabled: busy }, t('common.cancel')),
            ),
          )
        : h(
            'div',
            { className: 'st-taskTitleRow' },
            h('h1', { className: 'st-pageTitle', title: task.title }, task.title),
            h(IconButton, {
              icon: 'pencil',
              label: t('task.editTitle'),
              onClick: () => setEditor({ field: 'title', value: task.title }),
            }),
          )

      const descriptionNode = editor?.field === 'description'
        ? h(
            'div',
            { className: 'st-inlineEditor' },
            h('textarea', {
              className: 'st-textarea',
              value: editor.value,
              maxLength: 600,
              rows: 3,
              autoFocus: true,
              placeholder: t('form.descriptionPlaceholder'),
              onChange: (event) => setEditor({ field: 'description', value: event.target.value }),
              onKeyDown: (event) => {
                if (event.key === 'Escape') setEditor(null)
              },
            }),
            h(
              'div',
              { className: 'st-formActions' },
              h(PrimaryButton, { onClick: saveEditor, disabled: busy, icon: 'check' }, t('common.save')),
              h(SecondaryButton, { onClick: () => setEditor(null), disabled: busy }, t('common.cancel')),
            ),
          )
        : h(
            'div',
            { className: 'st-taskDesc' },
            h(
              'p',
              { className: 'st-taskDescText', 'data-empty': String(!hasText(task.description)) },
              hasText(task.description) ? task.description : t('task.noDescription'),
            ),
            h(IconButton, {
              icon: 'pencil',
              label: t('task.editDescription'),
              onClick: () => setEditor({ field: 'description', value: task.description ?? '' }),
            }),
          )

      const header = h(
        'div',
        { className: 'st-taskHead' },
        h(PageHeader, {
          eyebrow: t('app.eyebrow'),
          title: titleNode,
          subtitle: descriptionNode,
          back: { label: t('task.back'), onClick: goBack },
          actions: [
            h(PrimaryButton, { key: 'add', onClick: () => setPicker(true), disabled: busy, icon: 'plus' }, t('task.addPrompt')),
            h(SecondaryButton, { key: 'quick', onClick: runtime.openQuickSwitcher, icon: 'switch' }, t('quick.open')),
            h(RefreshButton, { key: 'refresh', onClick: reload }),
            h(IconButton, {
              key: 'delete',
              icon: 'trash',
              label: t('task.delete'),
              size: 14,
              danger: true,
              disabled: busy,
              onClick: () => setConfirmDelete((value) => !value),
            }),
          ],
        }),
        h(
          'div',
          { className: 'st-taskMeta' },
          h('span', { className: 'st-chip' }, countText(t, locale, 'task.promptCount', task.prompts.length)),
          task.prompts.length > 0 ? h('span', { className: 'st-chip' }, countText(t, locale, 'board.sessionCount', groups.length)) : null,
          activeCount > 0 ? h('span', { className: 'st-chip', 'data-tone': 'run' }, t('board.activeCount', { count: activeCount })) : null,
          h('span', { className: 'st-muted' }, t('task.updated', { time: dateTimeText(task.updatedAt, locale) })),
        ),
      )

      const confirmNode = confirmDelete
        ? h(
            'div',
            { className: 'st-confirm' },
            h('span', null, t('task.deleteConfirm', { title: task.title })),
            h('button', { type: 'button', className: 'st-btn', 'data-danger': 'true', disabled: busy, onClick: deleteTask }, t('common.delete')),
            h('button', { type: 'button', className: 'st-btn', disabled: busy, onClick: () => setConfirmDelete(false) }, t('common.cancel')),
          )
        : null

      const jumpNode = jump
        ? h(
            'div',
            { className: 'st-jumpNotice', 'data-tone': jump.status === 'error' ? 'error' : 'info' },
            h('span', null, jump.text),
            h(IconButton, { icon: 'close', label: t('common.close'), size: 12, onClick: () => runtime.jumpNotice.set(null) }),
          )
        : null

      let groupsNode
      if (groups.length === 0) {
        groupsNode = h(EmptyBlock, {
          title: t('task.noPrompts'),
          hint: t('task.noPromptsHint'),
          action: h(PrimaryButton, { onClick: () => setPicker(true), icon: 'plus' }, t('task.addPrompt')),
        })
      } else {
        groupsNode = h(
          'div',
          { className: 'st-groups' },
          ...groups.map((group) => {
            const editing = Boolean(!group.missing && sessionEditor && sessionEditor.sessionId === group.sessionId)
            const chain = []
            // Newest first, keeping the ascending prompt order for the index.
            for (let index = group.prompts.length - 1; index >= 0; index -= 1) {
              const prompt = group.prompts[index]
              chain.push(h(PromptNode, {
                key: prompt.id,
                prompt,
                index: index + 1,
                group,
                busy,
                confirming: removePromptId === prompt.id,
                onJump: (item) => {
                  setPreview(null)
                  void runtime.jumpToPrompt(item, taskContext())
                },
                onPreview: showPreview,
                onPreviewEnd: scheduleHide,
                onAskRemove: (item) => setRemovePromptId(item.id),
                onRemove: removePrompt,
                onCancelRemove: () => setRemovePromptId(null),
              }))
            }
            return h(
              'section',
              { className: 'st-group', key: group.id, style: { '--st-accent': group.color } },
              h(
                'div',
                { className: 'st-groupHead' },
                h('span', { className: 'st-groupTitle', title: group.title }, group.title),
                h('span', { className: 'st-chip' }, countText(t, locale, 'group.count', group.prompts.length)),
                group.live ? h('span', { className: 'st-chip', 'data-tone': 'run' }, t('group.live')) : null,
                h(
                  'div',
                  { className: 'st-groupActions' },
                  group.sessionId && !group.missing
                    ? h(IconButton, {
                        icon: 'pencil',
                        label: t('group.rename'),
                        disabled: sessionBusy,
                        onClick: () => setSessionEditor({ sessionId: group.sessionId, value: titleOfSession(group.sessionId) ?? '' }),
                      })
                    : null,
                  group.sessionId
                    ? h(IconButton, {
                        icon: 'external',
                        label: t('group.open'),
                        onClick: () => enterSession(group.sessionId),
                      })
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
                      onChange: (event) => setSessionEditor({ sessionId: group.sessionId, value: event.target.value }),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter') void saveSessionTitle()
                        if (event.key === 'Escape' && !sessionBusy) setSessionEditor(null)
                      },
                    }),
                    h(PrimaryButton, { onClick: saveSessionTitle, disabled: sessionBusy || !sessionEditor.value.trim(), icon: 'check' }, t('common.save')),
                    h(SecondaryButton, { onClick: () => setSessionEditor(null), disabled: sessionBusy }, t('common.cancel')),
                  )
                : null,
              h('div', { className: 'st-chain' }, ...chain),
            )
          }),
        )
      }

      return h(
        React.Fragment,
        null,
        header,
        error ? h('div', { className: 'st-notice', 'data-tone': 'error' }, t('error.loadTask', { message: error })) : null,
        notice ? h('div', { className: 'st-notice' }, notice) : null,
        jumpNode,
        confirmNode,
        groupsNode,
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
      const runtime = useRuntime()
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
          active,
          workspaceId: view.workspaceId,
          onBack: () => setView({ kind: 'overview' }),
          onOpenTask: (taskId) => setView({ kind: 'task', workspaceId: view.workspaceId, taskId }),
        })
      } else if (view.kind === 'task') {
        content = h(TaskDetail, {
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

    /** Compare the banner-relevant fields of two attribution records. */
    function sameCapture(left, right) {
      if (left === right) return true
      if (!left || !right) return false
      return left.sessionId === right.sessionId
        && left.workspaceId === right.workspaceId
        && left.taskId === right.taskId
        && left.taskTitle === right.taskTitle
    }

    function CaptureBanner(props) {
      const runtime = useRuntime()
      const { t } = runtime
      const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : ''
      const visible = usePageVisible()
      const live = useStoreValue(runtime.attribution)
      const [capture, setCapture] = React.useState(() => {
        // The page-local binding is the immediate source of truth. Showing it
        // before the first Host poll completes keeps the strip from blinking
        // out when the composer remounts after the first message.
        const current = runtime.binding.current ?? runtime.attribution.get()
        return current && current.sessionId === sessionId ? { ...current } : null
      })
      const misses = React.useRef(0)
      const tipId = React.useId()
      const infoRef = React.useRef(null)
      const tipRef = React.useRef(null)
      const [tipOpen, setTipOpen] = React.useState(false)
      const [tipPos, setTipPos] = React.useState(null)
      React.useLayoutEffect(() => {
        if (!tipOpen) {
          setTipPos(null)
          return
        }
        const anchor = infoRef.current
        const tip = tipRef.current
        const info = anchor?.parentElement
        if (!anchor || !tip || !info) return
        const anchorRect = anchor.getBoundingClientRect()
        const infoRect = info.getBoundingClientRect()
        const tipRect = tip.getBoundingClientRect()
        const bannerRect = info.closest('.st-capture')?.getBoundingClientRect()
        const margin = 12
        // Keep the tooltip inside the composer column as well as the viewport:
        // the conversation scrollport clips anything that escapes to its left.
        const minLeft = (bannerRect?.left ?? margin) + margin
        const maxLeft = (bannerRect?.right ?? window.innerWidth - margin) - margin - tipRect.width
        const centered = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
        const viewportLeft = Math.max(Math.min(minLeft, maxLeft), Math.min(centered, Math.max(minLeft, maxLeft)))
        const scrollRect = info.closest('[data-conversation-scroll]')?.getBoundingClientRect()
        const minTop = Math.max(margin, (scrollRect?.top ?? 0) + 8)
        const viewportTop = Math.max(
          minTop,
          Math.min(anchorRect.top - tipRect.height - 10, window.innerHeight - tipRect.height - margin),
        )
        setTipPos({ left: viewportLeft - infoRect.left, top: viewportTop - infoRect.top })
      }, [tipOpen])
      React.useEffect(() => {
        if (!tipOpen) return undefined
        const hide = () => setTipOpen(false)
        window.addEventListener('scroll', hide, true)
        window.addEventListener('resize', hide)
        return () => {
          window.removeEventListener('scroll', hide, true)
          window.removeEventListener('resize', hide)
        }
      }, [tipOpen])
      React.useEffect(() => {
        if (!sessionId || !visible) return undefined
        let alive = true
        let inFlight = false
        misses.current = 0
        const load = async () => {
          if (inFlight) return
          inFlight = true
          const epoch = runtime.attributionEpoch()
          try {
            const payload = await runtime.request(`/capture?sessionId=${encodeURIComponent(sessionId)}`)
            if (!alive) return
            if (payload.capture) {
              // A poll started before Cancel or a reassignment must not
              // resurrect the attribution it replaced.
              const synced = runtime.syncAttribution(payload.capture, epoch)
              if (!synced || synced.sessionId !== sessionId) return
              misses.current = 0
              setCapture((current) => (sameCapture(current, payload.capture) ? current : payload.capture))
              return
            }
            if (epoch !== runtime.attributionEpoch()) return
            // A release can race the first paint after a send. Keep the strip
            // for one more poll and only then accept that attribution ended.
            misses.current += 1
            if (misses.current >= 2) {
              setCapture(null)
              runtime.clearAttribution(sessionId)
            }
          } catch {
            // A capture poll failure is not actionable for the user.
          } finally {
            inFlight = false
          }
        }
        void load()
        const timer = window.setInterval(() => { void load() }, 2000)
        return () => {
          alive = false
          window.clearInterval(timer)
        }
      }, [runtime, sessionId, visible])
      const effective = capture && capture.sessionId === sessionId
        ? capture
        : live && live.sessionId === sessionId ? live : null
      if (!effective) return null
      const back = () => {
        setCapture(null)
        runtime.returnToTask(effective)
      }
      const cancel = () => {
        setCapture(null)
        runtime.releaseSessionBinding(sessionId)
      }
      return h(
        'div',
        { className: 'st-capture' },
        h('span', { className: 'st-captureDot', 'aria-hidden': true }),
        h('strong', { className: 'st-captureTitle', title: effective.taskTitle || '' }, effective.taskTitle || ''),
        h(
          'span',
          {
            className: 'st-captureInfo',
            onMouseEnter: () => setTipOpen(true),
            onMouseLeave: () => setTipOpen(false),
            onFocus: () => setTipOpen(true),
            onBlur: () => setTipOpen(false),
          },
          h(
            'button',
            {
              ref: infoRef,
              type: 'button',
              className: 'st-captureInfoBtn',
              'aria-label': t('capture.armed'),
              'aria-describedby': tipId,
            },
            Icon('info', 14),
          ),
          h(
            'span',
            {
              ref: tipRef,
              className: 'st-captureTip',
              id: tipId,
              role: 'tooltip',
              'data-open': String(tipOpen),
              style: tipPos ? { left: tipPos.left, top: tipPos.top } : { left: -9999, top: 0 },
            },
            t('capture.armed'),
          ),
        ),
        h(
          'div',
          { className: 'st-captureActions' },
          h('button', { type: 'button', className: 'st-captureBtn', onClick: back }, t('capture.back')),
          h('button', { type: 'button', className: 'st-captureBtn', onClick: cancel }, t('capture.cancel')),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Apply
    // ---------------------------------------------------------------------

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
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
      const memory = { view: { kind: 'overview' } }
      const binding = { current: null }
      const quickOpen = createValueStore(false)
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
            const text = await response.text()
            let payload = null
            if (text) {
              try {
                payload = JSON.parse(text)
              } catch {
                payload = null
              }
            }
            if (!response.ok) {
              const error = new Error((payload && typeof payload.error === 'string' && payload.error) || `HTTP ${response.status}`)
              error.status = response.status
              if (payload && typeof payload.code === 'string') error.code = payload.code
              throw error
            }
            return payload ?? {}
          } catch (error) {
            const retryable = error?.name === 'AbortError'
              || error?.name === 'TypeError'
              || error?.status >= 500
              || error?.status === 429
            if (attempt >= retries || !retryable) throw error
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
        const payload = await request('/capture', {
          method: 'POST',
          body: JSON.stringify({
            action: 'arm',
            workspaceId: task.workspaceId,
            taskId: task.taskId,
            sessionId,
            ...(options && options.newSession ? { newSession: true } : {}),
          }),
        })
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
        void request('/capture', {
          method: 'POST',
          body: JSON.stringify({ action: 'release', sessionId }),
        }).catch(() => {
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
        void request('/task', {
          method: 'POST',
          body: JSON.stringify({ workspaceId, action: 'recordVisit', taskId }),
        }).catch(() => {})
      }

      function openQuickSwitcher() {
        quickOpen.set(true)
      }

      function closeQuickSwitcher() {
        quickOpen.set(false)
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

      function revealRow(row) {
        const scroller = row.closest?.('[data-conversation-scroll]') ?? scrollParentOf(row)
        if (!scroller) {
          row.scrollIntoView({ block: 'start' })
          return
        }
        // The chat pauses follow-tail on reader intent. A synthetic wheel
        // event gives the native viewport that intent without moving it.
        try {
          scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }))
        } catch {
          // Older browsers: the programmatic scroll may still stick.
        }
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
        try {
          scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }))
        } catch {
          // Optional intent signal.
        }
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
      async function jumpToPrompt(prompt, task) {
        if (!prompt?.sessionId) {
          setJumpNotice(task, 'error', t('jump.noSession'))
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
        const sessions = serviceOf('sessions')
        const startedAt = Date.now()
        const deadline = startedAt + 15_000
        let paging = false
        let lastPageAt = 0
        while (Date.now() < deadline && token === jumpToken) {
          let binding = null
          try {
            binding = sessions?.binding?.(sessionId) ?? null
          } catch {
            binding = null
          }
          const chatMounted = Boolean(document.querySelector('[data-chat-turn]'))
          const mayPage = Date.now() - startedAt > 300 || chatMounted
          if (binding && mayPage && !paging && Date.now() - lastPageAt > 300) {
            paging = true
            lastPageAt = Date.now()
            // Page in smaller native batches instead of one jump-loader
            // publish, so history assembly does not block one long task.
            const scroller = document.querySelector('[data-conversation-scroll]')
            if (scroller) {
              try {
                scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true }))
              } catch {
                // Optional intent signal.
              }
            }
            void binding.session.loadOlder?.()
              ?.catch?.(() => {})
              ?.finally?.(() => { paging = false })
          }
          if (binding) {
            const shown = conversationOf(sessionId)
            const shownId = shown?.getAttribute('data-conversation-session')
            if (shownId && shownId !== sessionId) {
              await sleep(120)
              continue
            }
            const row = findTurnRow(sessionId, prompt.turn)
            if (row) {
              await nextFrame()
              revealRow(row)
              const settled = await settleRow(sessionId, prompt.turn, token)
              if (token !== jumpToken) return
              if (settled) {
                flashRow(settled)
                setJumpNotice(task, 'done', t('jump.done'))
                return
              }
              if (prompt.status === 'running') {
                // A live turn has no stable row to point at yet; the opened
                // session already lands at its newest content. No error line.
                jumpNotice.set(null)
                scrollConversationToEnd(sessionId)
              } else {
                setJumpNotice(task, 'error', t('jump.failed'))
              }
              return
            }
          }
          await sleep(120)
        }
        if (token !== jumpToken) return
        if (prompt.status === 'running') {
          jumpNotice.set(null)
          scrollConversationToEnd(sessionId)
          return
        }
        setJumpNotice(task, 'error', t('jump.failed'))
      }

      const runtime = {
        t,
        locale,
        request,
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
        cancelPendingJump,
        quickOpen,
        viewRequest,
        openQuickSwitcher,
        closeQuickSwitcher,
        navigateToTask,
        returnToTask,
        recordTaskVisit,
        jumpNotice,
        jumpToPrompt,
      }

      function App() {
        const [active, setActive] = React.useState(isPanelActive)
        React.useEffect(() => {
          let layout = null
          try {
            layout = serviceOf('layout')
          } catch {
            layout = null
          }
          if (!layout?.panelInfo?.subscribe) return undefined
          const sync = () => setActive(isPanelActive())
          sync()
          return layout.panelInfo.subscribe(sync)
        }, [])
        return h(RuntimeContext.Provider, { value: runtime }, h(TaskCenterBoundary, {
          active,
          runtime,
          resetView: () => {
            memory.view = { kind: 'overview' }
          },
        }))
      }

      function BoundCaptureBanner(props) {
        return h(RuntimeContext.Provider, { value: runtime }, h(CaptureBanner, props))
      }

      function BoundQuickSwitcher() {
        return h(RuntimeContext.Provider, { value: runtime }, h(QuickSwitcher))
      }

      function TaskCenterIcon(props) {
        return h('span', { className: 'st-panelIcon' }, Icon('checklist', typeof props.size === 'number' ? props.size : 16))
      }

      // A reload of the same tab resumes the local mirror immediately; a
      // fresh page receives the durable mapping from the Host on first poll.
      restoreTaskSession()

      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), `${PKG}: dictionaries`)
      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        const element = document.createElement('style')
        element.setAttribute('data-plugin', PKG)
        element.textContent = CSS
        document.head.append(element)
        return () => element.remove()
      }, `${PKG}: styles`)

      ctx.effect(
        () => ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, App)),
        `${PKG}: main panel`,
      )
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 5, label: () => t('entry.label'), locale: NS }, TaskCenterIcon),
          ),
        `${PKG}: sidebar entry`,
      )
      // The input dock exists in both the blank hero and a running
      // conversation; the composer dock does not render in the hero, where a
      // freshly created session starts.
      ctx.effect(
        () =>
          ctx.slots.inject('conversation.input.dock', () =>
            ctx.slots.register({ name: 'conversation.input.dock', id: 'session-todo-capture', order: 30, locale: NS }, BoundCaptureBanner),
          ),
        `${PKG}: capture banner`,
      )
      ctx.effect(
        () =>
          ctx.slots.inject('shell.overlay', () =>
            ctx.slots.register({ name: 'shell.overlay', id: 'session-todo-quick-switcher', order: 20, locale: NS }, BoundQuickSwitcher),
          ),
        `${PKG}: quick switcher overlay`,
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
                  if (quickOpen.get()) closeQuickSwitcher()
                  else openQuickSwitcher()
                },
              }),
            })
          } catch (error) {
            console.warn(`[${PKG}] quick switch shortcut is unavailable`, error)
            return () => {}
          }
        }, `${PKG}: quick switch shortcut`)
      })

    }

    return { inject: ['slots', 'locale', 'layout', 'uiWorkspace', 'sessions'], apply }
  },
})
