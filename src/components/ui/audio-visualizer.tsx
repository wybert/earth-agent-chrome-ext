import React from 'react'
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// Configuration constants for the audio analyzer
const FFT_SIZE = 512
const SMOOTHING_TIME_CONSTANT = 0.5

interface AudioVisualizerProps {
  mediaRecorder?: MediaRecorder | null
  width?: number
  height?: number
  barWidth?: number
  gap?: number
  backgroundColor?: string
  barColor?: string
  barPlayedColor?: string
}

export function AudioVisualizer({
  mediaRecorder,
  width = 200,
  height = 40,
  barWidth = 2,
  gap = 2,
  backgroundColor = "transparent",
  barColor = "#f1f5f9", // Default to a light gray
  barPlayedColor = "#3b82f6", // Default to a blue
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (mediaRecorder && mediaRecorder.stream) {
      // Initialize AudioContext
      try {
         audioContextRef.current = new window.AudioContext(); // Keep empty call
         analyserRef.current = audioContextRef.current.createAnalyser()
         analyserRef.current.fftSize = FFT_SIZE
         analyserRef.current.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT

         // Connect the MediaStream to the analyser
         sourceRef.current = audioContextRef.current.createMediaStreamSource(
           mediaRecorder.stream
         )
         sourceRef.current.connect(analyserRef.current)

         // Prepare data array
         dataArrayRef.current = new Uint8Array(
           analyserRef.current.frequencyBinCount
         )

         // Start visualization
         draw() 
       } catch (error) {
          console.error("Failed to create AudioContext or start visualization:", error);
          // Handle the error, maybe disable visualization further
       }
    } else {
      // Cleanup if mediaRecorder is null or stream is inactive
      cleanup()
    }

    return () => {
      // Cleanup on unmount
      cleanup()
    }
  }, [mediaRecorder])

  const cleanup = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    // Disconnect audio nodes
    sourceRef.current?.disconnect()
    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
    }
    // Clear refs
    audioContextRef.current = null
    analyserRef.current = null
    dataArrayRef.current = null
    sourceRef.current = null
  }

  const draw = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    if (!canvas || !analyser || !dataArray) return

    const canvasCtx = canvas.getContext("2d")
    if (!canvasCtx) return

    // Get frequency data
    analyser.getByteFrequencyData(dataArray) 

    // Clear canvas
    canvasCtx.fillStyle = backgroundColor
    canvasCtx.fillRect(0, 0, width, height)

    // Calculate bar dimensions
    const numBars = Math.floor(width / (barWidth + gap))
    const step = Math.floor(dataArray.length / numBars)

    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const barHeight = (dataArray[i * step] / 255) * height

      // Determine bar color
      canvasCtx.fillStyle = barPlayedColor || barColor;

      // Draw bar
      canvasCtx.fillRect(
        i * (barWidth + gap),
        height - barHeight,
        barWidth,
        barHeight
      )
    }

    // Request next animation frame
    animationFrameRef.current = requestAnimationFrame(draw)
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("rounded-lg", backgroundColor !== "transparent" && `bg-${backgroundColor}`)}
    />
  )
}

AudioVisualizer.displayName = "AudioVisualizer"
