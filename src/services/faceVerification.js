/**
 * Face Verification Service using @vladmandic/face-api
 * - Runs entirely in the browser (no API key needed)
 * - Stores face descriptors in IndexedDB (persists across sessions)
 * - Three operations: registerFace (webcam enroll), registerFaceFromImage
 *   (admin photo upload enroll), and verifyFace (webcam check at login)
 */

import * as faceapi from '@vladmandic/face-api';

// Path to model files served from /public/models/
const MODELS_URL = '/models';

let modelsLoaded = false;
let loadingPromise = null;

// ─── Model Loading ─────────────────────────────────────────────────────────────

export async function loadFaceModels() {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function saveFaceDescriptor(userId, descriptor) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase must be configured to store face data globally.');
  }
  
  const { error } = await supabase
    .from('face_data')
    .upsert({ user_id: userId, descriptor: Array.from(descriptor) });
    
  if (error) {
    console.error('Error saving face data:', error);
    throw new Error('Failed to save face descriptor to cloud database.');
  }
}

async function getFaceDescriptor(userId) {
  if (!isSupabaseConfigured || !supabase) return null;
  
  const { data, error } = await supabase
    .from('face_data')
    .select('descriptor')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (error) {
    console.error('Error fetching face data:', error);
    return null;
  }
  
  return data && data.descriptor ? new Float32Array(data.descriptor) : null;
}

export async function hasRegisteredFace(userId) {
  try {
    const desc = await getFaceDescriptor(userId);
    return desc !== null;
  } catch {
    return false;
  }
}

// ─── Detection helper ──────────────────────────────────────────────────────────

const TINY_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

async function detectSingleFace(videoOrImageEl) {
  return faceapi
    .detectSingleFace(videoOrImageEl, TINY_OPTIONS)
    .withFaceLandmarks(true)
    .withFaceDescriptor();
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Register (enroll) a face for a student via webcam.
 * Captures from the given video element and stores the descriptor.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function registerFace(userId, videoEl) {
  await loadFaceModels();

  const detection = await detectSingleFace(videoEl);
  if (!detection) {
    return { ok: false, error: 'No face detected. Please look directly at the camera and try again.' };
  }

  await saveFaceDescriptor(userId, detection.descriptor);
  return { ok: true };
}

/**
 * Register (enroll) a face from an image File/Blob uploaded by the admin.
 * Converts the file to an HTMLImageElement, detects the face, and stores
 * the descriptor in IndexedDB — identical storage to webcam enrolment so
 * the student skips the FaceEnrollModal entirely at login.
 *
 * @param {string}      userId    - The student's unique ID
 * @param {File|Blob}   imageFile - Photo file selected by the admin
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function registerFaceFromImage(userId, imageFile) {
  await loadFaceModels();

  // Convert File/Blob → object URL → HTMLImageElement
  const objectUrl = URL.createObjectURL(imageFile);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load the uploaded image.'));
      el.src = objectUrl;
    });

    const detection = await detectSingleFace(img);
    if (!detection) {
      return {
        ok: false,
        error:
          'No face detected in the uploaded photo. Please use a clear, front-facing portrait with good lighting.',
      };
    }

    await saveFaceDescriptor(userId, detection.descriptor);
    return { ok: true };
  } finally {
    // Always revoke the temporary URL to free memory
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Verify a face against the stored descriptor (called at student login).
 * @param {string} userId
 * @param {HTMLVideoElement} videoEl
 * @param {number} threshold - Euclidean distance threshold (default 0.55, lower = stricter)
 * @returns {Promise<{ok: boolean, distance?: number, error?: string}>}
 */
export async function verifyFace(userId, videoEl, threshold = 0.55) {
  await loadFaceModels();

  const stored = await getFaceDescriptor(userId);
  if (!stored) {
    return { ok: false, error: 'No registered face found. Please register your face first.' };
  }

  const detection = await detectSingleFace(videoEl);
  if (!detection) {
    return { ok: false, error: 'No face detected. Please look directly at the camera.' };
  }

  const distance = faceapi.euclideanDistance(stored, detection.descriptor);
  const match = distance <= threshold;

  return { ok: match, distance: parseFloat(distance.toFixed(3)) };
}
