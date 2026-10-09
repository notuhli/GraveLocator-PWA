// ─────────────────────────────────────────────────────────────────────────────
// PLOT EXCEL — read an office Excel/CSV of lots, and write one back out.
//
// Expected columns (header names are flexible, any order, any sheet):
//   Block | Lot No | Classification | Status | Interments
//
//   • Block        "Block 8", "8", "block-8", "2A" or the lawn name. Optional:
//                  if missing, the sheet name (e.g. a sheet called "Block 8")
//                  or the block picked in the import dialog is used.
//   • Lot No       204 or "Lot 204". Leave blank for a coloured cell that has
//                  no lot number (a tree on a pathway, etc.).
//   • Classification  Regular, Special Regular, Deluxe, Premium, Garden,
//                  Columbary 1&2, Columbary 3&4. Blank = keep the current one.
//   • Status       Available/Vacant, Sold, With Interment, Reserve Lot,
//                  Not For Sale, Delinquent, Trees, Lamp Post, Block-Off.
//                  Blank = keep the current one (new lots become Available).
//   • Interments   0, 1, 2 … or tally marks "|" / "||".
//
// SheetJS is loaded only when an import/export actually runs, so it adds
// nothing to the dashboard's first load.
// ─────────────────────────────────────────────────────────────────────────────
import { STATUS, STATUS_ORDER, statusLabel } from '../config/status'
import { CLASSIFICATION_ORDER } from '../config/constants'

const loadXlsx = () => import('xlsx')

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// ── Header aliases ───────────────────────────────────────────────────────────
const HEADERS = {
  block: ['block', 'blockno', 'blocknumber', 'blockname', 'blk', 'lawn', 'lawnname'],
  lotNo: ['lot', 'lotno', 'lotnumber', 'lotnum', 'no', 'number', 'lotid'],
  classification: ['classification', 'class', 'type', 'lottype', 'category'],
  status: ['status', 'lotstatus', 'state'],
  interments: ['interments', 'interment', 'intermentcount', 'noofinterments', 'noofinterment', 'burials', 'graves', 'interred'],
}

// ── Status aliases → STATUS values ───────────────────────────────────────────
const STATUS_ALIASES = {
  [STATUS.AVAILABLE]: ['available', 'vacant', 'open', 'empty', 'unsold', 'free', 'a', 'v'],
  [STATUS.SOLD]: ['sold', 's', 'occupied', 'owned'],
  [STATUS.WITH_INTERMENT]: ['withinterment', 'interment', 'interred', 'buried', 'wi', 'soldwithinterment'],
  [STATUS.RESERVE_LOT]: ['reservelot', 'reserve', 'reserved', 'r'],
  [STATUS.NOT_FOR_SALE]: ['notforsale', 'nfs'],
  [STATUS.DELINQUENT]: ['delinquent', 'd'],
  [STATUS.TREES]: ['trees', 'tree', 't'],
  [STATUS.LAMP_POST]: ['lamppost', 'lamp', 'lp'],
  [STATUS.BLOCK_OFF]: ['blockoff', 'blocked', 'x'],
}
const STATUS_LOOKUP = {}
Object.entries(STATUS_ALIASES).forEach(([value, list]) => list.forEach((a) => { STATUS_LOOKUP[a] = value }))
STATUS_ORDER.forEach((s) => { STATUS_LOOKUP[norm(statusLabel(s))] = s; STATUS_LOOKUP[norm(s)] = s })

export function parseStatus(v) {
  const key = norm(v)
  if (!key) return { value: null }
  return STATUS_LOOKUP[key] ? { value: STATUS_LOOKUP[key] } : { error: `Unknown status "${v}"` }
}

const CLASS_LOOKUP = {}
CLASSIFICATION_ORDER.forEach((c) => { CLASS_LOOKUP[norm(c)] = c })
CLASS_LOOKUP.columbary12 = CLASS_LOOKUP[norm('Columbary 1&2')]
CLASS_LOOKUP.columbary34 = CLASS_LOOKUP[norm('Columbary 3&4')]
CLASS_LOOKUP.specialreg = CLASS_LOOKUP[norm('Special Regular')]

export function parseClassification(v) {
  const key = norm(v)
  if (!key) return { value: null }
  return CLASS_LOOKUP[key] ? { value: CLASS_LOOKUP[key] } : { error: `Unknown classification "${v}"` }
}

export function parseLotNo(v) {
  if (v === '' || v == null) return { value: null }
  if (typeof v === 'number') {
    return Number.isInteger(v) && v > 0 ? { value: v } : { error: `Lot No "${v}" must be a whole number` }
  }
  const m = String(v).trim().match(/^(?:lot\s*(?:no\.?)?\s*#?\s*)?(\d+)$/i)
  return m && Number(m[1]) > 0 ? { value: Number(m[1]) } : { error: `Lot No "${v}" is not a number` }
}

export function parseInterments(v) {
  if (v === '' || v == null) return { value: null }
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? { value: v } : { error: `Interments "${v}" must be 0 or more` }
  const s = String(v).trim()
  if (/^[|Il1]+$/.test(s) && !/^\d+$/.test(s)) return { value: s.length } // tally marks
  if (/^\d+$/.test(s)) return { value: Number(s) }
  return { error: `Interments "${v}" is not a number` }
}

// "Block 8" / "8" / "block-8" / "B8" / "Infinite Lawn" → block object
export function matchBlock(value, blocks) {
  const key = norm(value)
  if (!key) return null
  const short = key.replace(/^block/, '').replace(/^blk/, '').replace(/^b(?=\d)/, '')
  return blocks.find((b) => {
    const id = norm(b.id).replace(/^block/, '')
    const name = norm(b.name).replace(/^block/, '')
    return id === short || name === short || norm(b.name) === key || (b.lawnName && norm(b.lawnName) === key)
  }) || null
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map(norm)
    const col = {}
    Object.entries(HEADERS).forEach(([field, aliases]) => {
      const idx = cells.findIndex((c) => aliases.includes(c))
      if (idx !== -1) col[field] = idx
    })
    if (col.lotNo != null && (col.status != null || col.interments != null || col.classification != null)) return { index: i, col }
  }
  return null
}

// Reads every sheet and returns { rows, errors, sheets }.
//   rows:   [{ blockId, lotNo, classification, status, intermentCount, where }]
//   errors: [{ where, message }]   where = "Sheet1 row 12"
export async function readPlotFile(file, blocks, fallbackBlockId) {
  const XLSX = await loadXlsx()
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const rows = []
  const errors = []
  const sheets = []

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName]
    if (!ws || !ws['!ref']) return
    const firstRow = XLSX.utils.decode_range(ws['!ref']).s.r
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: true })
    const header = findHeader(grid)
    if (!header) return // not a lot sheet (e.g. an instructions sheet)
    sheets.push(sheetName)

    const sheetBlock = matchBlock(sheetName, blocks)
    const { col } = header
    const cell = (r, field) => (col[field] == null ? '' : r[col[field]])

    for (let i = header.index + 1; i < grid.length; i++) {
      const r = grid[i]
      if (!r || r.every((c) => String(c).trim() === '')) continue
      const where = `${sheetName} row ${firstRow + i + 1}`
      const fail = (message) => errors.push({ where, message })

      const blockCell = cell(r, 'block')
      let block = null
      if (String(blockCell).trim()) {
        block = matchBlock(blockCell, blocks)
        if (!block) { fail(`Unknown block "${blockCell}"`); continue }
      } else {
        block = sheetBlock || blocks.find((b) => b.id === fallbackBlockId) || null
        if (!block) { fail('No block — add a Block column or pick a block in the import dialog'); continue }
      }

      const lot = parseLotNo(cell(r, 'lotNo'))
      const st = parseStatus(cell(r, 'status'))
      const cls = parseClassification(cell(r, 'classification'))
      const inter = parseInterments(cell(r, 'interments'))
      const bad = [lot, st, cls, inter].find((x) => x.error)
      if (bad) { fail(bad.error); continue }
      if (lot.value == null && !st.value) continue // nothing usable on this row

      let status = st.value
      let intermentCount = inter.value
      if (intermentCount > 0 && status === STATUS.AVAILABLE) {
        fail(`Lot ${lot.value ?? '(no number)'} is Available but has ${intermentCount} interment(s) — change the status to Sold / With Interment, or set Interments to 0`)
        continue
      }
      if (intermentCount > 0 && (!status || status === STATUS.SOLD)) status = STATUS.WITH_INTERMENT
      if (status === STATUS.WITH_INTERMENT && !intermentCount) intermentCount = 1

      rows.push({ blockId: block.id, lotNo: lot.value, classification: cls.value, status, intermentCount, where })
    }
  })

  return { rows, errors, sheets }
}

// Groups parsed rows by block and compares them with the lots already saved.
//   existingByBlock: { [blockId]: lots[] }
//   reservedIds:     Set of lot ids that have a pending/confirmed reservation
export function buildImportPlan(rows, blocks, existingByBlock, reservedIds = new Set()) {
  const byBlock = new Map()
  const errors = []

  rows.forEach((row) => {
    if (!byBlock.has(row.blockId)) byBlock.set(row.blockId, { rows: [], seen: new Set(), extra: 0 })
    const g = byBlock.get(row.blockId)
    if (row.lotNo != null) {
      if (g.seen.has(row.lotNo)) { errors.push({ where: row.where, message: `Lot ${row.lotNo} appears more than once` }); return }
      g.seen.add(row.lotNo)
      g.rows.push({ ...row, id: `${row.blockId}-${row.lotNo}` })
    } else {
      g.rows.push({ ...row, id: `${row.blockId}-x${g.extra}`, extraIndex: g.extra })
      g.extra += 1
    }
  })

  const plans = [...byBlock.entries()].map(([blockId, g]) => {
    const block = blocks.find((b) => b.id === blockId)
    const existing = existingByBlock[blockId] || []
    const byId = new Map(existing.map((l) => [l.id, l]))
    const fileIds = new Set(g.rows.map((r) => r.id))
    let added = 0, changed = 0, same = 0
    const warnings = []

    const final = g.rows.map((r) => {
      const cur = byId.get(r.id)
      const next = {
        id: r.id,
        lotNo: r.lotNo,
        classification: r.classification || cur?.classification || block?.classifications?.[0] || 'Regular',
        status: r.status || cur?.status || STATUS.AVAILABLE,
        intermentCount: r.intermentCount ?? cur?.intermentCount ?? 0,
        extraIndex: r.extraIndex,
      }
      if (!cur) added += 1
      else if (cur.classification !== next.classification || cur.status !== next.status || (cur.intermentCount || 0) !== next.intermentCount) {
        changed += 1
        if (reservedIds.has(r.id) && cur.status !== next.status) {
          warnings.push(`Lot ${r.lotNo ?? '(no number)'} has an active reservation — status will change from ${statusLabel(cur.status)} to ${statusLabel(next.status)}`)
        }
      } else same += 1
      return next
    })

    const missing = existing.filter((l) => !fileIds.has(l.id))
    const removable = missing.filter((l) => !reservedIds.has(l.id)).length

    return {
      blockId,
      block,
      rows: final,
      added, changed, same,
      missing: missing.length,
      removable,
      protectedCount: missing.length - removable,
      maxLot: final.reduce((m, r) => (r.lotNo > m ? r.lotNo : m), 0),
      warnings,
    }
  }).sort((a, b) => blocks.indexOf(a.block) - blocks.indexOf(b.block))

  return { plans, errors }
}

// ── Export (current block → .xlsx) / blank template ─────────────────────────
const COLUMNS = ['Block', 'Lot No', 'Classification', 'Status', 'Interments']

function addHelpSheet(XLSX, wb) {
  const help = [
    ['Column', 'Accepted values'],
    ['Block', 'Block 1 … Block 9, Block 2A, or the lawn name. Optional if the sheet is named after the block.'],
    ['Lot No', 'A whole number (e.g. 204). Leave blank for a coloured cell with no lot number.'],
    ['Classification', CLASSIFICATION_ORDER.join(', ') + '. Blank = keep current.'],
    ['Status', STATUS_ORDER.map(statusLabel).join(', ') + '. "Vacant" = Available. Blank = keep current.'],
    ['Interments', 'Number of burials: 0, 1, 2 … (or tally marks | / ||). Any interment on a Sold lot makes it "With Interment".'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(help)
  ws['!cols'] = [{ wch: 16 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(wb, ws, 'How to fill')
}

export async function downloadPlotWorkbook(block, lots) {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  const name = block ? block.name : 'Block 8'
  const data = lots && lots.length
    ? lots.map((l) => [name, l.lotNo ?? '', l.classification, statusLabel(l.status), l.intermentCount || 0])
    : [
        [name, 1, block?.classifications?.[0] || 'Regular', 'Sold', 1],
        [name, 2, block?.classifications?.[0] || 'Regular', 'Available', 0],
        [name, 3, block?.classifications?.[0] || 'Regular', 'With Interment', 2],
        [name, '', block?.classifications?.[0] || 'Regular', 'Trees', 0],
      ]
  const ws = XLSX.utils.aoa_to_sheet([COLUMNS, ...data])
  ws['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 16 }, { wch: 16 }, { wch: 11 }]
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  addHelpSheet(XLSX, wb)
  const file = lots && lots.length ? `${name.replace(/\s+/g, '-')}-plots.xlsx` : `${name.replace(/\s+/g, '-')}-template.xlsx`
  XLSX.writeFile(wb, file)
}