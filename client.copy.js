// Locale dictionaries and the stylesheet for the task center.
//
// Split out of client.js so the plugin entry stays small: DSH serves this file
// next to client.js and materializes it once, on the first require.async().
// The registration id must equal package.json "name" (see client.js).
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  chunk: 'client.copy.js',
  factory() {
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
      'status.waiting': '等待依赖',
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
      'capture.wait': '等待',
      'capture.waiting': '正在读取节点…',
      'wait.title': '等待节点',
      'wait.hint': '选择一个或多个节点；全部结束后发送当前输入。',
      'wait.search': '搜索 Prompt、任务或项目',
      'wait.clearSearch': '清除检索',
      'wait.empty': '没有可等待的节点。',
      'wait.noMatches': '没有匹配的节点。',
      'wait.selected.one': '已选 {count} 个节点',
      'wait.selected.other': '已选 {count} 个节点',
      'wait.submit': '提交并等待',
      'wait.submitting': '正在提交…',
      'wait.error.select': '至少选择一个节点。',
      'wait.error.noDraft': '当前输入框没有可发送的内容。',
      'wait.error.busy': '输入框正在提交，请稍后再试。',
      'wait.error.attachments': '带附件或文件引用的草稿暂不支持等待发送。',
      'wait.error.command': '命令草稿暂不支持等待发送。',
      'wait.error.composer': '找不到当前输入框。',
      'wait.error.quoted': '带引用或链接引用的草稿暂不支持等待发送。',
      'wait.error.tooLong': 'Prompt 超过 20000 字符，无法等待发送。',
      'error.loadCandidates': '读取节点列表失败：{message}',
      'node.waitingFor.one': '等待 {count} 个节点',
      'node.waitingFor.other': '等待 {count} 个节点',
      'task.waitingCount.one': '{count} 个等待依赖',
      'task.waitingCount.other': '{count} 个等待依赖',
      'jump.waiting': '这条 Prompt 还在等待依赖节点结束。',
      'errors.dependencyRequired': '至少选择一个依赖节点。',
      'errors.dependencyMissing': '依赖节点不存在。',
      'errors.dependencyNotExecutable': '依赖节点不可执行。',
      'errors.tooManyDependencies': '依赖节点过多。',
      'errors.textRequired': 'Prompt 内容不能为空。',
      'capture.back': '返回',
      'capture.cancel': '取消',
      'capture.armed': '本会话已归属该任务，后续发送都会记录；刷新或重连后仍会保留。点「等待」选择多个节点并提交等待；点「返回」打开任务看板，点「取消」取消归属并停止记录。',
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
      'status.waiting': 'Waiting',
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
      'capture.wait': 'Wait',
      'capture.waiting': 'Loading nodes…',
      'wait.title': 'Wait for nodes',
      'wait.hint': 'Select one or more nodes; the current input sends after all of them finish.',
      'wait.search': 'Search prompts, tasks or projects',
      'wait.clearSearch': 'Clear search',
      'wait.empty': 'No nodes to wait for.',
      'wait.noMatches': 'No nodes match.',
      'wait.selected.one': '{count} node selected',
      'wait.selected.other': '{count} nodes selected',
      'wait.submit': 'Submit and wait',
      'wait.submitting': 'Submitting…',
      'wait.error.select': 'Select at least one node.',
      'wait.error.noDraft': 'The composer has no content to send.',
      'wait.error.busy': 'The composer is busy; try again.',
      'wait.error.attachments': 'Drafts with attachments or file references cannot wait yet.',
      'wait.error.command': 'Command drafts cannot wait yet.',
      'wait.error.composer': 'The composer is unavailable.',
      'wait.error.quoted': 'Drafts with quotes or linked references cannot wait yet.',
      'wait.error.tooLong': 'The prompt exceeds 20,000 characters.',
      'error.loadCandidates': 'Failed to load nodes: {message}',
      'node.waitingFor.one': 'Waiting for {count} node',
      'node.waitingFor.other': 'Waiting for {count} nodes',
      'task.waitingCount.one': '{count} waiting',
      'task.waitingCount.other': '{count} waiting',
      'jump.waiting': 'This prompt is still waiting for its dependency nodes.',
      'errors.dependencyRequired': 'Select at least one dependency node.',
      'errors.dependencyMissing': 'A dependency node no longer exists.',
      'errors.dependencyNotExecutable': 'A dependency node is not executable.',
      'errors.tooManyDependencies': 'Too many dependency nodes.',
      'errors.textRequired': 'Prompt content cannot be empty.',
      'capture.back': 'Back',
      'capture.cancel': 'Cancel',
      'capture.armed': 'This session is assigned to this task, and later sends are recorded. The assignment survives refreshes and reconnects. Wait opens the dependency picker and submits the current draft after the selected nodes finish; Back opens the task board; Cancel removes the assignment and stops recording.',
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
.st-back{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;height:32px;padding:0 13px 0 10px;margin-bottom:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--st-radius);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;font-weight:500;cursor:pointer}
.st-back:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
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
.st-nodeText{font-size:12.5px;line-height:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-nodeMeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.st-nodeError{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34ch;color:var(--dsw-alias-state-error-primary)}
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
.st-waitRow[data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 38%,var(--dsw-alias-border-l1))}
.st-waitCheck{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:transparent;flex:none}
.st-waitRow[data-selected="true"] .st-waitCheck{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:#fff}
.st-waitFoot{display:flex;align-items:center;gap:12px;padding:9px 18px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.st-waitCount{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-waitSubmit{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:50%;background:var(--dsw-alias-brand-primary);color:#fff;cursor:pointer;flex:none}
.st-waitSubmit:hover:not(:disabled){filter:brightness(1.06)}
.st-waitSubmit:disabled{opacity:.42;cursor:default}
.st-waitError{padding:0 18px 8px;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px}
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
.st-btn:focus-visible,.st-iconBtn:focus-visible,.st-back:focus-visible,.st-wsCard:focus-visible,.st-taskCard:focus-visible,.st-node:focus-visible,.st-option:focus-visible,.st-input:focus-visible,.st-textarea:focus-visible,.st-captureBtn:focus-visible,.st-captureInfoBtn:focus-visible,.st-quickRow:focus-visible,.st-waitRow:focus-visible,.st-waitSubmit:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
@media (max-width:720px){.st-shell{padding:18px 14px 36px}.st-actions{padding-top:0;width:100%}.st-pageHead{gap:10px}.st-grid{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.st-wsCard,.st-taskCard,.st-nodeRow::before{transition:none;animation:none}.st-skeleton{animation:none}}
`
    return { ZH, EN, CSS }
  },
})
