import { describe, expect, it } from "vitest"
import { groupEntries } from "./changelogGroups"

type Entry = {
  id: number
  groupId: string | null
  changedFields: string[] | null
}
const entry = (
  id: number,
  groupId: string | null,
  changedFields: string[] = ["name"],
): Entry => ({ id, groupId, changedFields })

describe("groupEntries", () => {
  it("leaves entries without a group as they are, in order", () => {
    const [a, b] = [entry(2, null), entry(1, null)]
    expect(groupEntries([a, b])).toEqual([
      { main: a, others: [] },
      { main: b, others: [] },
    ])
  })

  it("shows a group where its first entry is, even with others in between", () => {
    const [a, other, b] = [entry(3, "g"), entry(2, null), entry(1, "g")]
    expect(groupEntries([a, other, b])).toEqual([
      { main: a, others: [b] },
      { main: other, others: [] },
    ])
  })

  it("leads with the image change, the reason for the group", () => {
    const marker = entry(3, "g", ["parentLocationMarker"])
    const image = entry(1, "g", ["imagePath"])
    expect(groupEntries([marker, image])).toEqual([
      { main: image, others: [marker] },
    ])
  })
})
