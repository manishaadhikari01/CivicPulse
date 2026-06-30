import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MascotBubble from '../components/MascotBubble'

function UploadFromGalleryButton({ onFile }: { onFile: (f: File) => void }) {
  const galleryRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-white p-5 text-on-surface/60 transition hover:opacity-95"
      >
        <span className="text-4xl" aria-hidden="true">🖼</span>
        <span className="text-base font-semibold">Upload From Gallery</span>
        <span className="text-xs">Choose a photo</span>
      </button>
    </>
  )
}

export default function ReportIssue() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const onFile = async (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))

    if (!token) {
      navigate('/login', { replace: true, state: { redirectTo: '/report' } })
      return
    }

    // Navigate immediately to the AI analysis screen.
    navigate('/ai-analysis', { state: { file: f } })
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="w-full">
        <MascotBubble
          expression="helping"
          title="Need help?"
          message="A clear photo helps me identify the issue much more accurately. Good lighting also improves AI detection."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-white p-5 text-on-surface/60 transition hover:opacity-95"
        >
          <span className="text-4xl" aria-hidden="true">📸</span>
          <span className="text-base font-semibold">Take Photo</span>
          <span className="text-xs">Camera-ready</span>
        </button>

        <UploadFromGalleryButton onFile={onFile} />
      </div>

      {preview && (
        <div className="overflow-hidden rounded-2xl border border-outline/15 bg-white">
          <img src={preview} alt="Preview" className="max-h-48 w-full object-cover" />
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="truncate text-on-surface/60">{file?.name}</span>
            <button
              type="button"
              className="text-error"
              onClick={() => {
                setFile(null)
                setPreview(null)
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Keep UI minimal: AI analysis + review submission happen on subsequent screens. */}
      <div className="rounded-2xl border border-outline/15 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-on-surface/60">
          <Crosshair size={18} className="text-primary" />
          <span>Select or capture a photo to start AI analysis.</span>
        </div>
      </div>
    </div>
  )
}

