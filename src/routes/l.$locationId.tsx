import { createFileRoute, redirect } from "@tanstack/react-router"

// Short link for location labels (/l/12), like /i/12 for items: a shorter
// URL makes a QR code with fewer, larger modules that scans more reliably
export const Route = createFileRoute("/l/$locationId")({
  beforeLoad: ({ params }) => {
    const id = Number(params.locationId)
    throw redirect({
      to: "/locations",
      search: Number.isInteger(id) && id > 0 ? { id } : {},
      replace: true,
    })
  },
})
