// Never replace manual groceries, reset checkmarks, or silently change quantities.
export function addMissingIngredients(existing, generated) {
  const names = new Set(existing.map((item) => item.name.trim().toLowerCase()))
  const result = [...existing]
  for (const item of generated) {
    const key = item.name.trim().toLowerCase()
    if (!names.has(key)) {
      result.push(item)
      names.add(key)
    }
  }
  return result
}
