// =============================================
// TypeBadge.jsx — Colored Type Badge
// =============================================
// Shows a colored badge for a Pokemon type.
//
// USAGE:
//   <TypeBadge type="Fire" />
//   <TypeBadge type="Water" small />

import { getTypeColor } from '../utils/typeColors'

export default function TypeBadge({ type, small = false }) {
  if (!type) return null

  return (
    <span
      className="type-badge"
      style={{
        backgroundColor: getTypeColor(type),
        fontSize: small ? '10px' : '12px',
        padding: small ? '2px 7px' : '3px 10px',
      }}
    >
      {type}
    </span>
  )
}
