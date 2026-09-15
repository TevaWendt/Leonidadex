# Tests exécutés

Dernière suite : 44 tests réussis, zéro échec. Exécution avec Node 24.19.0 et jsdom 30.0.1. DOM simulé, pas de moteur de rendu réel.

- Every public page has valid local references, IDs, metadata and CSP-compatible scripts
- All public pages start without JavaScript errors or absent dynamic resources
- Data, search and sitemap only reference valid unique current entities
- Search renders hostile text literally, with no HTML node
- Global search finds model inspiration with accents
- Search keyboard selection exposes active descendant and Escape closes
- Slash does not hijack typing in an unrelated input
- Malformed filter hash cannot break the catalogue
- Category, search and sort filter the complete catalogue
- Hash changes reset old filters and restore the new state
- Garage share is imported and unknown IDs are ignored
- Garage buttons work without nesting interactive elements
- Corrupted collection JSON does not crash the hub
- Loadout deep link survives catalogue initialization
- All loadout options reference actual cards with artwork
- Duplicate long weapon is rejected and an empty loadout clears the link
- Comparator validates URL IDs, uses labels and updates empty selection URL
- Ranking accepts newly added vehicles and rejects stale options
- Ranking share deduplicates entries
- No gallery requests missing images
- 404 page supports both searches and nested URLs
- Clipboard rejection never announces success
- Newsletter does not fabricate a confirmation or use an invisible sink
- Progression shows only actual stored IDs
- Map starts despite malformed stored state
- Personal marker opens from its list without a standard map status
- Invalid persisted coordinates cannot inject HTML
- Map rejects hostile or malformed imports before changing any saved data
- Map accepts a valid full backup and restores found places and drawings
- Map modes are mutually exclusive
- Map search keyboard opens a place and photo requests all exist
- Map extreme or malformed hash does not yield NaN transforms
- Licence filter rejects NC and ND, accepts the explicit free licences
- Legacy category links keep the intended filter
- Saved ranking is unique, bounded and supports keyboard focus after moving
- Import file input restores every area and filters unknown place IDs
- Failed multi-area save rolls back prior writes and does not apply imported state
- Malformed drawing file leaves all existing map records untouched
- Map can display a second photo when the first file is absent
- Map drawing saves a real pointer stroke; undo and redo restore it
- Map zoom and ruler remain operable
- Vehicle narrative and declared inspiration keep corrected identities
- Every map category can be disabled and restored
- Image synchronisation preserves existing declarations and refuses files with no credit

Voir le rapport final pour les commandes, les limites et les étapes HTTP.
