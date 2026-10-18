import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceModels } from '../services/faceVerification';

/**
 * useExamFaceProctor
 * Comprehensive AI proctoring hook for exams:
 * 1. Live webcam stream & continuous recording of the student (video + audio).
 * 2. Laptop microphone audio monitoring for abnormal noise, talking, or loud sounds.
 * 3. AI Face Visibility detection (alerts when face is missing or multiple people enter frame).
 * 4. AI Mouth & Face Occlusion detection (alerts when student covers mouth/lips or face).
 */
export function useExamFaceProctor({ onIntegrityViolation } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Audio analysis refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCheckIntervalRef = useRef(null);
  const lastNoiseAlertTimeRef = useRef(0);

  // Vision analysis refs
  const visionIntervalRef = useRef(null);
  const missingFaceCountRef = useRef(0);
  const mouthCoveredCountRef = useRef(0);
  const lastVisionAlertTimeRef = useRef(0);

  // State
  const [isActive, setIsActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for live UI meter
  const [activeAlert, setActiveAlert] = useState(null); // { type, message, level: 'warning' | 'danger' }
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);

  // Alert dismiss timer
  const alertTimerRef = useRef(null);
  const triggerAlert = useCallback((type, message, level = 'danger') => {
    setActiveAlert({ type, message, level });
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 4000);
  }, []);

  // 1. Preload Face-API ML models
  useEffect(() => {
    let active = true;
    loadFaceModels()
      .then(() => {
        if (active) setModelsReady(true);
      })
      .catch((err) => {
        console.warn('Face models loading failed in proctor:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Setup Audio Monitor (Laptop Mic anomaly / speech detection)
  const setupAudioMonitor = useCallback((stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Check audio every 200ms
      audioCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average energy / RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        // Sound anomaly threshold: normalized level > 45 indicates talking or loud noise
        const now = Date.now();
        if (normalized > 48 && now - lastNoiseAlertTimeRef.current > 5000) {
          lastNoiseAlertTimeRef.current = now;
          const msg = 'Abnormal sound or talking detected! Please remain completely silent.';
          triggerAlert('noise', msg, 'warning');
          if (onIntegrityViolation) {
            onIntegrityViolation({
              type: 'abnormal_sound_detected',
              details: `Laptop mic detected abnormal voice/sound level: ${normalized}%`,
              time: new Date().toLocaleTimeString(),
            });
          }
        }
      }, 200);
    } catch (err) {
      console.warn('Microphone audio monitor setup failed:', err);
    }
  }, [triggerAlert, onIntegrityViolation]);

  // 3. Setup Face & Mouth Occlusion Analysis
  const setupVisionAnalysis = useCallback(() => {
    const TINY_PROCTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.35,
    });

    // Run computer vision check every 1.5 seconds
    visionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, TINY_PROCTOR_OPTIONS)
          .withFaceLandmarks(true);

        const now = Date.now();

        // Check A: Face Visibility
        if (!detections || detections.length === 0) {
          missingFaceCountRef.current += 1;
          // If face is missing for 2 consecutive checks (~3 seconds)
          if (missingFaceCountRef.current >= 2 && now - lastVisionAlertTimeRef.current > 4000) {
            lastVisionAlertTimeRef.current = now;
            const msg = 'Face not visible in camera! Please stay facing the screen.';
            triggerAlert('face_missing', msg, 'danger');
            if (onIntegrityViolation) {
              onIntegrityViolation({
                type: 'face_not_visible',
                details: 'Student face disappeared from webcam frame during active exam',
                time: new Date().toLocaleTimeString(),
              });
            }
          }
          return;
        }

        // Face is visible: reset missing counter
        missingFaceCountRef.current = 0;

        // Check B: Multiple people in frame
        if (detections.length > 1) {
          if (now - lastVisionAlertTimeRef.current > 4000) {
            lastVisionAlertTimeRef.current = now;
            const msg = `Multiple people detected (${detections.length}) in camera frame!`;
            triggerAlert('multiple_faces', msg, 'danger');
            if (onIntegrityViolation) {
              onIntegrityViolation({
                type: 'multiple_faces_detected',
                details: `${detections.length} faces visible in camera`,
                time: new Date().toLocaleTimeString(),
              });
            }
          }
          return;
        }

        // Check C: Mouth / Face Occlusion (Covering lips, mouth or face with hand)
        const primary = detections[0];
        if (primary && primary.landmarks) {
          const landmarks = primary.landmarks;
          const positions = landmarks.positions;

          // Points 48 to 67: Outer & Inner Lips
          const mouthPoints = positions.slice(48, 68);
          // Point 33: Base of nose
          const noseBase = positions[33];
          // Point 8: Chin tip
          const chin = positions[8];
          // Point 0 to 16: Jaw
          // Point 36 to 41: Right Eye, 42 to 47: Left eye
          const leftEyeCenter = positions[36];
          const rightEyeCenter = positions[45];
          const eyeDistance = Math.hypot(
            rightEyeCenter.x - leftEyeCenter.x,
            rightEyeCenter.y - leftEyeCenter.y
          );

          // Calculate mouth bounding dimensions
          let minMouthY = Infinity;
          let maxMouthY = -Infinity;
          let minMouthX = Infinity;
          let maxMouthX = -Infinity;

          mouthPoints.forEach((p) => {
            if (p.y < minMouthY) minMouthY = p.y;
            if (p.y > maxMouthY) maxMouthY = p.y;
            if (p.x < minMouthX) minMouthX = p.x;
            if (p.x > maxMouthX) maxMouthX = p.x;
          });

          const mouthHeight = maxMouthY - minMouthY;
          const mouthWidth = maxMouthX - minMouthX;
          const noseToChinDist = Math.hypot(chin.x - noseBase.x, chin.y - noseBase.y);

          // Relative ratio check:
          // In a normal uncovered face, noseToChinDist is at least 0.7x eyeDistance,
          // and mouthWidth is at least 0.35x eyeDistance.
          // When a hand covers the mouth/face, landmark fitting severely collapses
          // the mouth geometry or the mouth region is occluded.
          const isMouthDistorted =
            mouthWidth < eyeDistance * 0.28 ||
            mouthHeight < 2 ||
            noseToChinDist < eyeDistance * 0.45;

          if (isMouthDistorted) {
            mouthCoveredCountRef.current += 1;
            if (mouthCoveredCountRef.current >= 2 && now - lastVisionAlertTimeRef.current > 4000) {
              lastVisionAlertTimeRef.current = now;
              const msg = 'Mouth or face is covered! Keep your mouth and face uncovered.';
              triggerAlert('mouth_covered', msg, 'danger');
              if (onIntegrityViolation) {
                onIntegrityViolation({
                  type: 'mouth_face_covered',
                  details: 'Student mouth or lower face was covered or obstructed',
                  time: new Date().toLocaleTimeString(),
                });
              }
            }
          } else {
            mouthCoveredCountRef.current = 0;
          }
        }
      } catch (err) {
        // Ignore single frame parsing glitches
      }
    }, 1500);
  }, [triggerAlert, onIntegrityViolation]);

  // 4. Start Proctoring (Webcam + Mic + Recording + AI)
  const startProctoring = useCallback(async () => {
    setCameraError(null);
    recordedChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = 'Camera and microphone are not supported on this browser.';
      setCameraError(err);
      return false;
    }

    try {
      // Request camera AND microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // keep noise suppression off so abnormal room noise is heard
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
      setIsActive(true);

      // Setup audio analyzer
      setupAudioMonitor(stream);

      // Setup vision analysis
      setupVisionAnalysis();

      // Start video recording of the student session
      try {
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
          }
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000); // 1-second chunks
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (recErr) {
        console.warn('Webcam recording initialization note:', recErr);
      }

      return true;
    } catch (err) {
      console.error('getUserMedia error:', err);
      let msg = 'Camera or microphone access denied.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera & Microphone permission is required to write this exam.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera or microphone device found on your laptop.';
      }
      setCameraError(msg);
      return false;
    }
  }, [setupAudioMonitor, setupVisionAnalysis]);

  // 5. Stop Proctoring & finalize video recording
  const stopProctoring = useCallback(async () => {
    // Clear intervals
    if (audioCheckIntervalRef.current) {
      clearInterval(audioCheckIntervalRef.current);
      audioCheckIntervalRef.current = null;
    }
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }

    // Stop recorder and create final video blob
    let result = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      result = await new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordedBlob(blob);
          setRecordedUrl(url);
          resolve({ blob, url });
        };
        recorder.stop();
      });
      setIsRecording(false);
    }

    // Stop hardware tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsActive(false);
    setActiveAlert(null);

    return result;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioCheckIntervalRef.current) clearInterval(audioCheckIntervalRef.current);
      if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    isActive,
    cameraActive,
    modelsReady,
    cameraError,
    audioLevel,
    activeAlert,
    isRecording,
    recordedBlob,
    recordedUrl,
    startProctoring,
    stopProctoring,
  };
}
