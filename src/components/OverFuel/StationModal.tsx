'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Station {
  position: number
  name: string
  type: string
  category?: string
}

interface StationModalProps {
  station: Station | null
  onClose: () => void
}

export const StationModal: React.FC<StationModalProps> = ({ station, onClose }) => {
  const [zoomed, setZoomed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  if (!station) return null

  const imgSrc = `/OverFuelMaps/gas${station.position}.png`

  // Focus management for accessibility
  useEffect(() => {
    if (!zoomed && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [zoomed])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (zoomed) {
          setZoomed(false)
        } else {
          onClose()
        }
      }
      
      // Tab trapping for modal
      if (event.key === 'Tab' && !zoomed) {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
          
          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [zoomed, onClose])

  // Optimized zoom handler
  const handleZoomToggle = useCallback(() => {
    setZoomed(prev => !prev)
  }, [])

  // Handle image load events
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(false)
  }, [])

  return (
    <>
      {/* ZOOM OVERLAY */}
      {zoomed && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={handleZoomToggle}
          role="dialog"
          aria-modal="true"
          aria-label={`Zoomed view of ${station.name} map`}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button for zoomed view */}
            <button
              onClick={handleZoomToggle}
              className="absolute top-2 right-2 text-white text-3xl z-60 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Close zoomed view"
            >
              ×
            </button>

            {/* Zoomed image */}
            {!imageError ? (
              <Image
                src={imgSrc}
                alt={`Detailed map of ${station.name}`}
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                priority
                sizes="95vw"
              />
            ) : (
              <div className="bg-white/10 rounded-lg p-8 text-center min-w-[300px] min-h-[200px] flex items-center justify-center">
                <div>
                  <div className="text-6xl mb-4">{station.type}</div>
                  <p className="text-white/70">Map image not available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATION MODAL (when not zoomed) */}
      {!zoomed && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div
            ref={modalRef}
            className="bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 
                id="modal-title"
                className="text-2xl font-bold text-[#00c6ff] pr-4"
              >
                {station.name}
              </h3>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="text-white/70 hover:text-white text-2xl transition-colors flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                aria-label="Close station details"
              >
                ×
              </button>
            </div>

            {/* Details */}
            <div className="mb-4" id="modal-description">
              <div className="text-4xl text-center my-4" aria-label={`Station type: ${station.category || 'Station'}`}>
                {station.type}
              </div>
              <div className="space-y-2 text-white/80">
                <p><span className="font-semibold text-[#00c6ff]">Position:</span> {station.position}</p>
                {station.category && (
                  <p><span className="font-semibold text-[#00c6ff]">Category:</span> {station.category}</p>
                )}
              </div>
            </div>

            {/* Image Preview */}
            <div
              className="relative h-[200px] w-full rounded-lg overflow-hidden mb-4 bg-white/5 cursor-zoom-in group"
              onClick={handleZoomToggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleZoomToggle()
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Click to zoom map of ${station.name}`}
            >
              {/* Loading state */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00c6ff]"></div>
                </div>
              )}

              {/* Image or error state */}
              {!imageError ? (
                <Image
                  src={imgSrc}
                  alt={`Map preview of ${station.name}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 600px"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{station.type}</div>
                    <p className="text-white/50 text-sm">Map preview unavailable</p>
                  </div>
                </div>
              )}

              {/* Zoom indicator */}
              <div className="absolute top-2 right-2 bg-black/50 text-white/70 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Click to zoom
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleZoomToggle}
                disabled={imageError}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#00c6ff]/20 to-[#0072ff]/20 text-[#00c6ff] border border-[#00c6ff]/30 font-semibold rounded-lg hover:from-[#00c6ff]/30 hover:to-[#0072ff]/30 hover:border-[#00c6ff]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="View full size map"
              >
                {imageError ? 'Map Unavailable' : 'View Full Map'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00c6ff]/25 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}