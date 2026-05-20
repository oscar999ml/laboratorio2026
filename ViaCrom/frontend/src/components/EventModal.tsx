import { useState, useCallback } from 'react'
import { X, Camera, MapPin, AlertTriangle, Crosshair, Navigation } from 'lucide-react'
import { createReport } from '../lib/api'
import { EVENT_CONFIG, EVENT_TYPES } from '../types'
import type { EventType } from '../types'

interface Props {
  onClose: () => void
  selectedPosition: { lat: number; lng: number }
  userPosition?: { lat: number; lng: number } | null
  userAccuracy?: number
  onReportCreated: () => void
}

function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function EventModal({ onClose, selectedPosition, userPosition, userAccuracy, onReportCreated }: Props) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [type, setType] = useState<EventType | ''>('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setSelectedFile(file)
        setPhoto(URL.createObjectURL(file))
      }
    }
    input.click()
  }

  const handleSubmit = async () => {
    if (!type) return
    setLoading(true)
    setError('')

    try {
      const gps = userPosition || selectedPosition
      const formData = new FormData()
      formData.append('type', type)
      formData.append('report_latitude', String(selectedPosition.lat))
      formData.append('report_longitude', String(selectedPosition.lng))
      formData.append('latitude', String(gps.lat))
      formData.append('longitude', String(gps.lng))
      if (description) formData.append('description', description)
      if (selectedFile) formData.append('photo', selectedFile)

      await createReport(formData)
      onReportCreated()
    } catch (err: any) {
      setError(err.message || 'Error al enviar reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-dark-800 z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-600">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {step === 'select' ? 'Reportar evento' : 'Detalles'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-celeste-50 dark:bg-celeste-900/20 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-celeste-100 dark:bg-celeste-800/50 flex items-center justify-center">
            <Crosshair size={16} className="text-celeste-500" />
          </div>
          <div className="text-xs flex-1">
            <p className="text-slate-600 dark:text-slate-300 font-medium">Ubicación seleccionada</p>
            <p className="text-slate-400 dark:text-slate-400 font-mono">
              {selectedPosition.lat.toFixed(5)}, {selectedPosition.lng.toFixed(5)}
              {userAccuracy !== undefined && ` · ±${Math.round(userAccuracy)}m`}
            </p>
          </div>
          {userPosition && (
            <div className="text-right text-xs">
              <div className="flex items-center gap-1 text-celeste-500 justify-end">
                <Navigation size={12} />
                <span className="font-medium">{dist(userPosition.lat, userPosition.lng, selectedPosition.lat, selectedPosition.lng)}m</span>
              </div>
              <p className="text-slate-400">de tu ubicación</p>
            </div>
          )}
        </div>

        {step === 'select' ? (
          <div className="p-4 grid grid-cols-2 gap-3">
            {EVENT_TYPES.map(et => (
              <button
                key={et}
                onClick={() => { setType(et); setStep('form') }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-100 dark:border-dark-600 hover:border-celeste-400 transition-all hover:shadow-lg group"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-transform group-hover:scale-110"
                  style={{ background: EVENT_CONFIG[et]?.color || '#6b7280' }}>
                  {EVENT_CONFIG[et]?.icon || et.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{EVENT_CONFIG[et]?.label || et.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="bg-slate-50 dark:bg-dark-700 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: EVENT_CONFIG[type as EventType]?.color || '#6b7280' }}>
                  {EVENT_CONFIG[type as EventType]?.icon || (type ? type.charAt(0).toUpperCase() : '')}
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{EVENT_CONFIG[type as EventType]?.label || (type ? type.replace('_', ' ') : '')}</span>
                <button onClick={() => setStep('select')} className="ml-auto text-xs text-celeste-500 hover:underline">Cambiar</button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700 dark:text-slate-300">Descripción (opcional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe lo que está ocurriendo..."
                className="w-full bg-slate-50 dark:bg-dark-700 border border-slate-200 dark:border-dark-600 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-celeste-400 resize-none h-24 text-slate-800 dark:text-slate-200"
                maxLength={300}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-700 dark:text-slate-300">Foto (opcional)</label>
              <button onClick={handlePhoto} className="w-full bg-slate-50 dark:bg-dark-700 border-2 border-dashed border-slate-200 dark:border-dark-600 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-celeste-400 transition-colors">
                {photo ? (
                  <img src={photo} alt="Preview" className="h-24 rounded-lg object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-400">Tomar foto o subir imagen</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-danger/10 text-danger text-sm rounded-xl p-3">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-celeste-500 to-celeste-600 hover:from-celeste-600 hover:to-celeste-700 text-white rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-celeste-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enviar reporte'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
