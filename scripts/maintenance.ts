/**
 * Runs the one-off data tasks that haven't run yet (src/lib/maintenance.ts).
 * Called by run.sh at every start, after the schema update
 */
import { runMaintenance } from "../src/lib/maintenance"

const ran = await runMaintenance()
console.log(
  ran.length > 0
    ? `Maintenance: ran ${ran.join(", ")}`
    : "Maintenance: nothing to do",
)
process.exit(0)
