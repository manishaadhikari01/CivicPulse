import { useMemo } from 'react'


export type MascotExpression =
  | 'greeting'
  | 'helping'
  | 'analyzing'
  | 'searching'
  | 'thinking'
  | 'announcement'
  | 'celebrating'
  | 'loving'

export interface MascotBubbleProps {
  expression: MascotExpression
  message: string
  title?: string
  buttonText?: string
  onButtonClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}


// Vite: bundle all mascot assets at build time and pick the right one at runtime.
const mascotModules = import.meta.glob('../assets/mascot/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function getMascotSrc(expression: MascotExpression): string {
  // expression.png lives in ../assets/mascot/<expression>.png
  const key = Object.keys(mascotModules).find((k) => k.endsWith(`/assets/mascot/${expression}.png`))
  if (key && mascotModules[key]) return mascotModules[key]

  // Fallback: try endsWith for windows/posix path variations
  const key2 = Object.keys(mascotModules).find((k) => k.endsWith(`/${expression}.png`))
  return (key2 && mascotModules[key2]) || ''
}

export default function MascotBubble({
  expression,
  message,
  title,
  buttonText,
  onButtonClick,
  size = 'md',
}: MascotBubbleProps) {

  const mascotSrc = useMemo(() => {
    const src = getMascotSrc(expression)
    if (src) return src
    // Fallback to greeting.png if the requested asset is missing.
    return getMascotSrc('greeting')
  }, [expression])

  const showButton = Boolean(buttonText) && typeof onButtonClick === 'function'

  const mascotHeightClass =

    size === 'sm'
      ? 'h-[100px]'
      : size === 'lg'
        ? 'h-[190px]'
        : 'h-[150px]'



  return (
    <div className="relative w-full">
      <div className="flex w-full items-start gap-0">
        {/* Mascot overlaps bubble left by ~20–25px */}
        <div className="shrink-0">
          {mascotSrc ? (
            <img
              src={mascotSrc}
              alt="Pulse mascot"
              className={`-ml-[20px] ${mascotHeightClass} w-auto select-none drop-shadow-sm`}
            />
          ) : (
            <div className={`-ml-[20px] ${mascotHeightClass} w-[160px] rounded-3xl bg-surface-container`} />
          )}
        </div>


        <div className="min-w-0 flex-1">
          {/* Speech bubble */}
          <div className="mascot-bubble-in relative w-full max-w-xl rounded-[28px] bg-white/90 p-6 shadow-[0_8px_26px_rgba(0,0,0,0.10)] ring-1 ring-outline/10 backdrop-blur">

            {/* subtle speech bubble pointer toward mascot */}

            <div
              className="absolute left-[0px] top-[60px] h-4 w-4 -translate-x-1/2 rotate-45 rounded-[2px] bg-white/90 ring-1 ring-outline/10 backdrop-blur"
              aria-hidden="true"
            />

            {/* three visual levels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-primary">Pulse</h4>
              </div>

              {title ? (
                <div className="text-sm font-semibold text-on-surface">{title}</div>
              ) : null}

              <div className="leading-relaxed text-sm text-on-surface/70">{message}</div>
            </div>


            {showButton ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary-container px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity sm:w-auto"
                >
                  {buttonText}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  )
}



