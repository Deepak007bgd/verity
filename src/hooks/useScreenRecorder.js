import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to record the student's screen during an exam.
 * Uses the Web Screen Capture API (navigator.mediaDevices.getDisplayMedia)
 * and MediaRecorder API.
 */
export function useScreenRecorder({ onIntegrityViolation, onRecordingComplete } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const durationRef = useRef(0);

  // Keep durationRef in sync with recordingSeconds
  useEffect(() => {
    durationRef.current = recordingSeconds;
  }, [recordingSeconds]);

  // Clean up timer and media tracks on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    chunksRef.current = [];
    isManuallyStoppedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const err = 'Screen capture is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.';
      setRecordingError(err);
      return false;
    }

    try {
      // Request screen stream from browser
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);

      // Handle student clicking the native browser "Stop sharing" button
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (!isManuallyStoppedRef.current) {
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (onIntegrityViolation) {
              onIntegrityViolation('Screen sharing was stopped during the active exam.');
            }
          }
        };
      }

      // Check supported recording MIME types
      const candidateTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const mimeType = candidateTypes.find(
        (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
      ) || '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordingUrl(url);
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (onRecordingComplete) {
          onRecordingComplete({ blob, url, duration: durationRef.current });
        }
      };

      // Collect data slices every 1s
      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      console.warn('Screen recording start failed:', err);
      let message = 'Could not start screen recording. Please permit screen access.';
      if (err.name === 'NotAllowedError') {
        message = 'Screen share permission was cancelled or denied. Proctoring requires screen recording.';
      }
      setRecordingError(message);
      return false;
    }
  }, [onIntegrityViolation, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const stream = mediaStreamRef.current;
      const currentDuration = durationRef.current;

      const finish = (blob, url) => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        setIsRecording(false);
        const result = { blob, url, duration: currentDuration };
        if (onRecordingComplete) {
          onRecordingComplete(result);
        }
        resolve(result);
      };

      if (!recorder || recorder.state === 'inactive') {
        finish(recordedBlob, recordingUrl);
        return;
      }

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordingUrl(url);
        finish(blob, url);
      };

      try {
        recorder.stop();
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
        finish(recordedBlob, recordingUrl);
      }
    });
  }, [recordedBlob, recordingUrl, onRecordingComplete]);

  return {
    isRecording,
    hasPermission,
    recordingSeconds,
    formattedDuration: formatTime(recordingSeconds),
    recordingError,
    recordingUrl,
    recordedBlob,
    stream: mediaStreamRef.current,
    startRecording,
    stopRecording,
  };
}
