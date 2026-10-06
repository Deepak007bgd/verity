/**
 * useFaceVerification hook
 * Manages camera stream lifecycle and face model loading state.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { loadFaceModels, registerFace, verifyFace, hasRegisteredFace } from '../services/faceVerification';

export function useFaceVerification(userId) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  // Load ML models on mount
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch((err) => console.error('Face model load error:', err));
  }, []);

  // Check if user already has a registered face
  useEffect(() => {
    if (!userId) return;
    setCheckingRegistration(true);
    hasRegisteredFace(userId)
      .then(setIsRegistered)
      .finally(() => setCheckingRegistration(false));
  }, [userId]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permission in your browser and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  // Stop camera when component unmounts
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const enroll = useCallback(async () => {
    if (!videoRef.current) return { ok: false, error: 'Camera not active.' };
    const result = await registerFace(userId, videoRef.current);
    if (result.ok) setIsRegistered(true);
    return result;
  }, [userId]);

  const verify = useCallback(async () => {
    if (!videoRef.current) return { ok: false, error: 'Camera not active.' };
    return verifyFace(userId, videoRef.current);
  }, [userId]);

  return {
    videoRef,
    modelsReady,
    cameraActive,
    cameraError,
    isRegistered,
    checkingRegistration,
    startCamera,
    stopCamera,
    enroll,
    verify,
  };
}
