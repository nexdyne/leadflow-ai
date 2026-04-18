import React, { useRef, useEffect, useState } from 'react';

/**
 * SignaturePad Component
 *
 * Canvas-based signature capture for inspectors and property owners
 * Supports mouse and touch input with undo functionality
 *
 * Props:
 * - signatureType: 'inspector' | 'owner' | 'occupant'
 * - signerName: string (pre-filled name)
 * - onSave: callback(signatureData)
 * - onClear: callback when signature cleared
 * - existingSignature: optional previously saved signature dataUrl
 */
const SignaturePad = ({
  signatureType = 'inspector',
  signerName = '',
  onSave,
  onClear,
  existingSignature = null
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [useTypedSignature, setUseTypedSignature] = useState(false);
  const [typedName, setTypedName] = useState(signerName);
  const [showExisting, setShowExisting] = useState(!!existingSignature);
  const [signatureTimestamp, setSignatureTimestamp] = useState(null);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 200;
  const LINE_WIDTH = 2;
  const STROKE_COLOR = '#1a365d'; // dark blue

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = STROKE_COLOR;

    // Draw empty signature line and placeholder text
    if (canvasEmpty && !useTypedSignature && !showExisting) {
      drawEmptyCanvas(ctx);
    } else if (showExisting && existingSignature) {
      drawExistingSignature(ctx);
    } else if (useTypedSignature && typedName) {
      drawTypedSignature(ctx, typedName);
    } else if (strokes.length > 0) {
      redrawCanvas(ctx, strokes);
    }
  }, [canvasEmpty, useTypedSignature, showExisting, strokes, typedName]);

  const drawEmptyCanvas = (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Signature line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, (CANVAS_HEIGHT * 0.75));
    ctx.lineTo(CANVAS_WIDTH - 20, (CANVAS_HEIGHT * 0.75));
    ctx.stroke();

    // Placeholder text
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

    // Load and draw the image
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

    // Draw signature line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, (CANVAS_HEIGHT * 0.75));
    ctx.lineTo(CANVAS_WIDTH - 20, (CANVAS_HEIGHT * 0.75));
    ctx.stroke();

    // Draw typed name in cursive
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

    if (e.touches) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
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
    if (onClear) {
      onClear();
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    if (newStrokes.length === 0) {
      setCanvasEmpty(true);
    }
  };

  const isCanvasPainted = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 200) return true; // Check alpha channel for non-white pixels
    }
    return false;
  };

  const handleSave = () => {
    if (!signerName && !typedName) {
      alert('Please enter a signer name');
      return;
    }

    const canvas = canvasRef.current;

    // For typed signatures or existing, we can save directly
    // For drawn signatures, verify canvas has content
    if (!useTypedSignature && !showExisting) {
      if (!isCanvasPainted()) {
        alert('Please draw a signature before saving');
        return;
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const finalSignerName = typedName || signerName;
    const timestamp = new Date().toISOString();

    if (onSave) {
      onSave({
        dataUrl,
        signerName: finalSignerName,
        signatureType,
        timestamp,
        ipAddress: null
      });
    }
  };

  const handleToggleTyped = () => {
    if (useTypedSignature) {
      setUseTypedSignature(false);
      setTypedName('');
      setCanvasEmpty(true);
    } else {
      setUseTypedSignature(true);
      setShowExisting(false);
      setStrokes([]);
      setCurrentStroke([]);
      setCanvasEmpty(false);
    }
  };

  const handleReSign = () => {
    setShowExisting(false);
    setStrokes([]);
    setCurrentStroke([]);
    setCanvasEmpty(true);
    setUseTypedSignature(false);
    setSignatureTimestamp(null);
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

      {/* Signer Name Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Printed Name
        </label>
        <input
          type="text"
          value={typedName || signerName}
          onChange={(e) => {
            const newVal = e.target.value;
            if (useTypedSignature) {
              setTypedName(newVal);
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
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
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
              alt="Existing signature"
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
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
