import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Clock, Image, MapPin, Package, Search } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  fetchInventoryStats,
  type InventoryStats,
} from "@/src/actions/statsActions"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Startseite | MSB Inventar" }],
  }),
  loader: async () => {
    const stats = await fetchInventoryStats()
    return { stats }
  },
  component: RouteComponent,
})

interface StatCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
        <CardTitle className="text-[11px] uppercase tracking-wide text-muted-foreground md:text-sm md:normal-case md:tracking-normal md:text-foreground font-medium">
          {title}
        </CardTitle>
        <div className="text-primary/70 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        <div className="text-2xl md:text-3xl font-bold tracking-tight">
          {value.toLocaleString("de-DE")}
        </div>
        <CardDescription className="mt-0.5 text-[10px] md:text-sm text-muted-foreground/80">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

function StatsGrid({ stats }: { stats: InventoryStats }) {
  const lastUpdated = new Date(stats.lastUpdated)
  const formattedDate = lastUpdated.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          title="Gesamte Items"
          value={stats.totalItems}
          description="Items im Inventar"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Standorte"
          value={stats.totalLocations}
          description="Erfasste Orte"
          icon={<MapPin className="h-5 w-5" />}
        />
        <StatCard
          title="Mit Bildern"
          value={stats.itemsWithImages}
          description="Items mit Fotos"
          icon={<Image className="h-5 w-5" />}
        />
        <StatCard
          title="Neu (30 Tage)"
          value={stats.recentItems}
          description="Kürzlich hinzugefügt"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Stand: {formattedDate}
      </p>
    </div>
  )
}

function HomeSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  return (
    <search className="block w-full max-w-2xl mx-auto mb-8">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = query.trim()
          // Hand the term to the items page, which reads ?q= and searches.
          navigate({ to: "/items", search: trimmed ? { q: trimmed } : {} })
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zeug durchsuchen…"
            aria-label="Zeug durchsuchen"
            className="h-14 rounded-full pl-12 pr-28 text-lg shadow-sm"
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full px-6"
          >
            Suchen
          </Button>
        </div>
      </form>
    </search>
  )
}

function RouteComponent() {
  const { stats } = Route.useLoaderData()

  return (
    <div className="text-center content-center py-8">
      <h1 className="text-4xl font-extrabold mb-4">
        Zeug beim MakerSpace Bonn e.V.
      </h1>
      <div className="mb-8">
        <p>Willkommen bei unserem MakerSpace Zeug System.</p>
      </div>

      <HomeSearch />

      <StatsGrid stats={stats} />

      <ButtonGroup className="mx-auto mt-8">
        <Button variant="outline">
          <Link to="/items">Items</Link>
        </Button>
      </ButtonGroup>
    </div>
  )
}
