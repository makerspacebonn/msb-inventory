import { createServerFn } from "@tanstack/react-start"
import { authGuardMiddleware } from "@/src/middleware/authMiddleware"

export const fetchLabelPrinterStatus = createServerFn()
  .middleware([authGuardMiddleware])
  .handler(async () => {
    // Dynamic import keeps the MQTT client out of the client bundle
    const { getLabelPrinterSnapshot } = await import(
      "@/src/lib/labelPrinterMonitor"
    )
    return getLabelPrinterSnapshot()
  })
