// =============================================
// TypeBadge.jsx — Colored pixel type badge
// =============================================
import { getTypeColor } from '../utils/typeColors'

export default function TypeBadge({ type }) {
  if (!type) return null
  return (
    <span className="type-badge" style={{ backgroundColor: getTypeColor(type) }}>
      {type}
    </span>
  )
}
