// Composer attribution banner: shows the task the current session is bound
// to and offers wait / back / cancel actions.
//
// DSH serves this file next to client.js and materializes it when the first
// conversation page mounts. The registration id must equal package.json
// "name" (see client.js).
window.__ModuleLoader__.load({
  id: '@local/dsh-session-todo',
  chunk: 'client.capture.js',
  factory() {
    function createCapture(env) {
      const { React, h, t, runtime, ui, hooks } = env
      const { Icon } = ui
      const { useStoreValue, usePageVisible } = hooks

      /** Compare the banner-relevant fields of two attribution records. */
      function sameCapture(left, right) {
        if (left === right) return true
        if (!left || !right) return false
        return left.sessionId === right.sessionId
          && left.workspaceId === right.workspaceId
          && left.taskId === right.taskId
          && left.taskTitle === right.taskTitle
      }

      /**
       * Keep the Host poll out of the component body: it owns the miss counter
       * that absorbs one release race without blinking the strip.
       * @param {string} sessionId - native session the banner belongs to.
       * @param {boolean} visible - whether the page is visible (polls pause otherwise).
       */
      function useHostCapture(sessionId, visible) {
        const [capture, setCapture] = React.useState(() => {
          // The page-local binding is the immediate source of truth. Showing it
          // before the first Host poll completes keeps the strip from blinking
          // out when the composer remounts after the first message.
          const current = runtime.binding.current ?? runtime.attribution.get()
          return current && current.sessionId === sessionId ? { ...current } : null
        })
        const misses = React.useRef(0)
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
              const payload = await runtime.api.capture(sessionId)
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
        }, [sessionId, visible])
        return [capture, setCapture]
      }

      /**
       * Position the ⓘ tooltip inside the composer column (the conversation
       * scrollport clips anything escaping to its left) and close it when the
       * anchor moves. Returns the shared open state and both element refs.
       */
      function useBannerTooltip() {
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
        return { tipId, infoRef, tipRef, tipOpen, setTipOpen, tipPos }
      }

      /** Hover/focus target for the tooltip, kept out of the banner layout rules. */
      function BannerInfo({ tip }) {
        return h(
          'span',
          {
            className: 'st-captureInfo',
            onMouseEnter: () => tip.setTipOpen(true),
            onMouseLeave: () => tip.setTipOpen(false),
            onFocus: () => tip.setTipOpen(true),
            onBlur: () => tip.setTipOpen(false),
          },
          h(
            'button',
            {
              ref: tip.infoRef,
              type: 'button',
              className: 'st-captureInfoBtn',
              'aria-label': t('capture.armed'),
              'aria-describedby': tip.tipId,
            },
            Icon('info', 14),
          ),
          h(
            'span',
            {
              ref: tip.tipRef,
              className: 'st-captureTip',
              id: tip.tipId,
              role: 'tooltip',
              'data-open': String(tip.tipOpen),
              style: tip.tipPos ? { left: tip.tipPos.left, top: tip.tipPos.top } : { left: -9999, top: 0 },
            },
            t('capture.armed'),
          ),
        )
      }

      /** Actions on the attribution strip: wait, return or cancel. */
      function BannerActions({ onWait, onBack, onCancel }) {
        return h(
          'div',
          { className: 'st-captureActions' },
          h(
            'button',
            { type: 'button', className: 'st-captureBtn', title: t('wait.title'), onClick: onWait },
            t('capture.wait'),
          ),
          h('button', { type: 'button', className: 'st-captureBtn', onClick: onBack }, t('capture.back')),
          h('button', { type: 'button', className: 'st-captureBtn', onClick: onCancel }, t('capture.cancel')),
        )
      }

      function CaptureBanner(props) {
        const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : ''
        const visible = usePageVisible()
        const live = useStoreValue(runtime.attribution)
        const [capture, setCapture] = useHostCapture(sessionId, visible)
        const tip = useBannerTooltip()
        const effective = capture && capture.sessionId === sessionId
          ? capture
          : live && live.sessionId === sessionId
            ? live
            : null
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
          h(BannerInfo, { tip }),
          h(BannerActions, {
            onWait: () => runtime.openWaitPicker(effective),
            onBack: back,
            onCancel: cancel,
          }),
        )
      }

      return { CaptureBanner }
    }

    return { createCapture }
  },
})
