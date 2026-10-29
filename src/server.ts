// Custom server entry: same as TanStack Start's default entry, but a client
// that disconnects mid-request (reload, closed tab, cancelled fetch) is not
// logged as an unhandled error.
// Since @tanstack/start-server-core 1.169.19 the handler rejects with
// request.signal.reason on disconnect, which ends up as a console.error and a
// 500. Upstream: https://github.com/TanStack/router/issues/7991 and #8521.
// Remove this file once Start classifies client disconnects itself.
import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server"

const startFetch = createStartHandler(defaultStreamHandler)

export default createServerEntry({
  async fetch(request, requestOpts) {
    try {
      return await startFetch(request, requestOpts)
    } catch (error) {
      // Only swallow the abort itself; every other error is rethrown and
      // reported as before
      if (request.signal.aborted && error === request.signal.reason) {
        // 499 Client Closed Request; nobody receives it, it only keeps logs honest
        return new Response(null, { status: 499 })
      }
      throw error
    }
  },
})
