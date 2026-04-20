import React, { useRef, useEffect, useState } from 'react';

/**
 * SignaturePad Component
 *
 * Canvas-based signature capture for inspectors, property owners, and occupants.
 * Supports mouse, touch, and typed signatures with undo functionality.
 *
 * Regulatory basis:
 *  - ESIGN Act, 15 USC § 7001(c)(1) — consumer affirmative consent to electronic signatures
 *  - Michigan UETA, MCL 450.831 et seq. — attribution, intent, record retention
 *  - EPA 40 CFR 745.227(e)(10) — inspector/risk assessor certification (used by caller)
 *  - HUD 24 CFR 35.1300(e) — owner/occupant notice acknowledgment (used by caller)
 *
 * Props:
 *  - signatureType: 'inspector' | 'owner' | 'occupant'
 *  - signerName: string (pre-filled name from project state)
 *  - onSave: callback(signatureData) — { dataUrl, signerName, signatureType, timestamp, consented, userAgent, canvasWidth, canvasHeight }
 *  - onClear: callback when signature cleared
 *  - existingSignature: optional previously saved signature dataUrl
 *  - requireConsent: bool (default true for owner/occupant, false for inspector — inspector consent is implicit in employment)
 */
const SignaturePad = ({
  signatureType = 'inspector',
  signerName = '',
  onSave,
  onClear,
  existingSignature = null,
  requireConsent
}) => {
  const canvasRef = useRef(null);
  const hasInkRef = useRef(false); // Authoritative paint-detection flag (replaces broken alpha-scan)
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [useTypedSignature, setUseTypedSignature] = useState(false);
  const [typedName, setTypedName] = useState(signerName);
  const [printedName, setPrintedName] = useState(signerName);
  const [showExisting, setShowExisting] = useState(!!existingSignature);
  const [signatureTimestamp, setSignatureTimestamp] = useState(null);
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  // ESIGN §7001(c)(1) consent — defaults to required for non-inspector signers
  const consentRequired = typeof requireConsent === 'boolean'
    ? requireConsent
    : (signatureType !== 'inspector');
  const [consented, setConsented] = useState(!consentRequired);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 200;
  const LINE_WIDTH = 2;
  const STROKE_COLOR = '#1a365d';

  // Keep printedName in sync when parent passes a new signerName
  useEffect(() => {
    if (signerName && !printedName) setPrintedName(signerName);
    if (signerName && !typedName) setTypedName(signerName);
  }, [signerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize canvas with devicePixelRatio scaling for crisp rendering on Retina / tablet displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    // Only re-size the backing store if it hasn't already been scaled
    if (canvas.width !== CANVAS_WIDTH * dpr) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = CANVAS_WIDTH + 'px';
      canvas.style.height = CANVAS_HEIGHT + 'px';
      const ctx0 = canvas.getContext('2d');
      ctx0.scale(dpr, dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;

    if (canvasEmpty && !useTypedSignature && !showExisting) {
      drawEmptyCanvas(ctx);
    } else if (showExisting && existingSignature) {
      drawExistingSignature(ctx);
    } else if (useTypedSignature && typedName) {
      drawTypedSignature(ctx, typedName);
    } else if (strokes.length > 0) {
      redrawCanvas(ctx, strokes);
    }
  }, [canvasEmpty, useTypedSignature, showExisting, strokes, typedName]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawEmptyCanvas = (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(20, (CANVAS_HEIGHT * 0.75));
    ctx.lineTo(CANVAS_WIDTH - 20, (CANVAS_HEIGHT * 0.75));
    ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sign here', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.85);
  };

  const drawExistingSignature = (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };
    img.src = existingSignature;
  };

  const drawTypedSignature = (ctx, name) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(20, (CANVAS_HEIGHT * 0.75));
    ctx.lineTo(CANVAS_WIDTH - 20, (CANVAS_HEIGHT * 0.75));
    ctx.stroke();
    ctx.fillStyle = '#1a365d';
    ctx.font = 'italic 32px "Brush Script MT", cursive, serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.6);
  };

  const redrawCanvas = (ctx, strokesToDraw) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;
    strokesToDraw.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Use CSS size (CANVAS_WIDTH) ratio, since backing store was scaled by dpr
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    if (e.touches) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const handleMouseDown = (e) => {
    if (showExisting || useTypedSignature) return;
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    setCurrentStroke([coords]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || showExisting || useTypedSignature) return;
    const coords = getCanvasCoordinates(e);
    const newStroke = [...currentStroke, coords];
    setCurrentStroke(newStroke);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;
    if (newStroke.length === 1) {
      ctx.beginPath();
      ctx.moveTo(newStroke[0].x, newStroke[0].y);
    } else {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    hasInkRef.current = true; // Paint detection: set on first actual stroke
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke([]);
      setCanvasEmpty(false);
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (showExisting || useTypedSignature) return;
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    setCurrentStroke([coords]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawing || showExisting || useTypedSignature) return;
    const coords = getCanvasCoordinates(e);
    const newStroke = [...currentStroke, coords];
    setCurrentStroke(newStroke);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;
    if (newStroke.length === 1) {
      ctx.beginPath();
      ctx.moveTo(newStroke[0].x, newStroke[0].y);
    } else {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    hasInkRef.current = true;
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke([]);
      setCanvasEmpty(false);
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setCanvasEmpty(true);
    setShowExisting(false);
    setUseTypedSignature(false);
    hasInkRef.current = false;
    if (onClear) onClear();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    if (newStrokes.length === 0) {
      setCanvasEmpty(true);
      hasInkRef.current = false;
    }
  };

  // Replaces the old alpha-channel scan (which returned true on any white fillRect).
  // hasInkRef is set only when the user actually draws a stroke.
  const hasSignatureContent = () => {
    if (useTypedSignature) return typedName.trim().length > 0;
    if (showExisting) return !!existingSignature;
    return hasInkRef.current && strokes.length > 0;
  };

  const handleSave = () => {
    const finalSignerName = (useTypedSignature ? typedName : printedName || signerName).trim();
    if (!finalSignerName) {
      alert('Please enter the signer\'s printed name.');
      return;
    }
    if (consentRequired && !consented) {
      alert('You must acknowledge consent to sign electronically before saving.');
      return;
    }
    if (!hasSignatureContent()) {
      alert(useTypedSignature
        ? 'Please type the signer\'s name before saving.'
        : 'Please draw a signature before saving.');
      return;
    }

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = new Date().toISOString();
    setSignatureTimestamp(timestamp); // Fix: was declared but never set

    if (onSave) {
      onSave({
        dataUrl,
        signerName: finalSignerName,
        signatureType,
        timestamp,
        consented: consentRequired ? true : null,
        method: useTypedSignature ? 'typed' : 'drawn',
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        ipAddress: null // Populated server-side if needed; client cannot determine reliably
      });
    }
  };

  const handleToggleTyped = () => {
    if (useTypedSignature) {
      setUseTypedSignature(false);
      setCanvasEmpty(true);
      hasInkRef.current = false;
    } else {
      setUseTypedSignature(true);
      setShowExisting(false);
      setStrokes([]);
      setCurrentStroke([]);
      setCanvasEmpty(false);
      if (!typedName && printedName) setTypedName(printedName);
    }
  };

  const handleReSign = () => {
    setShowExisting(false);
    setStrokes([]);
    setCurrentStroke([]);
    setCanvasEmpty(true);
    setUseTypedSignature(false);
    setSignatureTimestamp(null);
    hasInkRef.current = false;
  };

  const consentLabelByRole = {
    owner: 'I am the property owner (or authorized representative) and I consent to sign this document electronically. I understand this electronic signature has the same legal effect as a handwritten signature under the federal ESIGN Act (15 USC § 7001) and the Michigan Uniform Electronic Transactions Act (MCL 450.831 et seq.).',
    occupant: 'I am an adult occupant of the property and I consent to sign this document electronically. I understand this electronic signature has the same legal effect as a handwritten signature under the federal ESIGN Act (15 USC § 7001) and the Michigan Uniform Electronic Transactions Act (MCL 450.831 et seq.).',
    inspector: 'I am the licensed inspector/risk assessor and I certify this report and consent to sign electronically under ESIGN (15 USC § 7001) and Michigan UETA (MCL 450.831 et seq.).'
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-900 capitalize">
          {signatureType} Signature
        </h3>
        {signatureTimestamp && (
          <p className="text-sm text-gray-600 mt-1">
            Signed: {new Date(signatureTimestamp).toLocaleString()}
          </p>
        )}
      </div>

      {/* Printed Name Input — fixed so it always updates */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`printed-name-${signatureType}`}>
          Printed Name
        </label>
        <input
          id={`printed-name-${signatureType}`}
          type="text"
          value={useTypedSignature ? typedName : printedName}
          onChange={(e) => {
            const newVal = e.target.value;
            if (useTypedSignature) {
              setTypedName(newVal);
            } else {
              setPrintedName(newVal);
            }
          }}
          placeholder="Enter signer's name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Mode Toggle */}
      {!showExisting && (
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useTypedSignature}
              onChange={handleToggleTyped}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Type signature instead</span>
          </label>
        </div>
      )}

      {/* Canvas Signature Pad */}
      {!showExisting || strokes.length > 0 || useTypedSignature ? (
        <div className="mb-4">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${signatureType} signature pad — draw your signature`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
          <p className="text-xs text-gray-500 mt-2">
            {useTypedSignature ? 'Typed signature preview' : 'Click or tap to draw your signature'}
          </p>
        </div>
      ) : null}

      {/* Existing Signature Display */}
      {showExisting && existingSignature && (
        <div className="mb-4">
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <img
              src={existingSignature}
              alt={`Existing ${signatureType} signature`}
              className="w-full"
              style={{ maxHeight: CANVAS_HEIGHT }}
            />
          </div>
          {signatureTimestamp && (
            <p className="text-xs text-gray-600 mt-2">
              Originally signed: {new Date(signatureTimestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* ESIGN / UETA consent (owner + occupant; optional for inspector) */}
      {consentRequired && !showExisting && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300"
              aria-describedby={`consent-text-${signatureType}`}
            />
            <span id={`consent-text-${signatureType}`} className="text-xs text-gray-800 leading-snug">
              {consentLabelByRole[signatureType] || consentLabelByRole.owner}
            </span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!showExisting && !useTypedSignature && strokes.length > 0 && (
          <button
            onClick={handleUndo}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Undo
          </button>
        )}

        {!showExisting && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear
          </button>
        )}

        {showExisting && existingSignature && (
          <button
            onClick={handleReSign}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Re-sign
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={consentRequired && !consented}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
