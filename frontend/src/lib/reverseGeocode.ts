export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Lightweight client-side reverse geocoding.
  // Uses OpenStreetMap's Nominatim. This avoids changing the existing AI report workflow.
  // Note: For production, you may want to proxy this through the backend to avoid rate limits.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}`

  const res = await fetch(url, {
    headers: {
      // Nominatim asks for a valid User-Agent in production; browsers can't set it,
      // but setting Accept helps and keeps requests explicit.
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Reverse geocoding failed: ${res.status}`)
  }

  const json = await res.json().catch(() => null)
  const address = json?.address

  if (!address) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  // Try common address fields in a readable order.
  const parts: string[] = []
  if (address.road) parts.push(address.road)
  if (address.suburb) parts.push(address.suburb)
  if (address.city_district) parts.push(address.city_district)
  if (address.city) parts.push(address.city)
  if (address.town) parts.push(address.town)
  if (address.village) parts.push(address.village)
  if (address.state) parts.push(address.state)
  if (address.postcode) parts.push(address.postcode)
  if (address.country) parts.push(address.country)

  const line = parts.filter(Boolean).join(', ')
  return line || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

