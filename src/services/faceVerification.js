/**
 * Face Verification Service using @vladmandic/face-api
 * - Runs entirely in the browser (no API key needed)
 * - Stores face descriptors in IndexedDB (persists across sessions)
 * - Three operations: registerFace (webcam enroll), registerFaceFromImage
 *   (admin photo upload enroll), and verifyFace (webcam check at login)
 */

import * as faceapi from '@vladmandic/face-api';

const DB_NAME = 'verity_faces';
const DB_VERSION = 1;
const STORE_NAME = 'face_descriptors';

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

// ─── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'userId' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveFaceDescriptor(userId, descriptor) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ userId, descriptor: Array.from(descriptor) });
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getFaceDescriptor(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(userId);
    req.onsuccess = (e) => {
      const row = e.target.result;
      resolve(row ? new Float32Array(row.descriptor) : null);
    };
    req.onerror = (e) => reject(e.target.error);
  });
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
