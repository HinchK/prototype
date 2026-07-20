// Secondary triage-board views: the completed-visits log and settings.
import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Card, Badge, cn } from '../../shared/ui/primitives'
import { doctorById } from '../domain/catalog'

/** @param {import('../domain/board').Destination} dest */
const destinationLabel = (dest) =>
  dest.type === 'room' ? dest.room : (doctorById(dest.doctorId)?.name ?? dest.doctorId)

export function LogsView({ completedLog }) {
  return (
    <div className="p-4 lg:p-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-charcoal text-sm font-bold">Completed Visits</h2>
          <p className="mt-0.5 text-xs text-slate-500">Patients checked out during this session.</p>
        </div>
        {completedLog.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <FileText size={28} />
            <p className="text-sm">No completed visits yet — check a patient out to log it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Seen In / By</th>
                  <th className="px-4 py-3 font-semibold">Checked Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...completedLog].reverse().map((entry) => (
                  <tr key={entry.walkIn.id} className="border-t border-slate-100">
                    <td className="text-charcoal px-4 py-3 font-semibold">
                      {entry.walkIn.pet}{' '}
                      <span className="font-normal text-slate-500">· {entry.walkIn.species}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{entry.walkIn.client}</td>
                    <td className="px-4 py-3 text-slate-600">{destinationLabel(entry.dest)}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{entry.checkedOutAt}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Discharged</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function SettingsPanel() {
  const [settings, setSettings] = useState({ autoAssign: false, sounds: true, hints: true })
  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }))
  return (
    <div className="max-w-2xl p-4 lg:p-6">
      <Card className="divide-y divide-slate-100 p-4">
        <SettingRow
          label="Auto-assign walk-ins to open rooms"
          desc="Route new arrivals to the first empty exam room automatically."
          checked={settings.autoAssign}
          onChange={set('autoAssign')}
        />
        <SettingRow
          label="Sound alerts for new arrivals"
          desc="Play a soft chime when a walk-in joins the lobby."
          checked={settings.sounds}
          onChange={set('sounds')}
        />
        <SettingRow
          label="Show demo hints"
          desc="Display helper text like drop-zone prompts and the lock-screen PIN."
          checked={settings.hints}
          onChange={set('hints')}
        />
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Prototype settings are local to this session and reset on sign-out.
      </p>
    </div>
  )
}

function SettingRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-charcoal text-sm font-semibold">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-visible:ring-primary-hover relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          checked ? 'bg-primary' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
