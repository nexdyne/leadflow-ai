import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// AI PHOTO TAGGER - TensorFlow.js MobileNet Integration
// Automatically classifies inspection photos by building component & paint condition
// ============================================================================

// ───────────────────────────────────────────────────────────────────────────
// MAPPING: MobileNet labels → Inspection Categories
// ───────────────────────────────────────────────────────────────────────────
function mapToInspectionCategory(mobilenetPredictions) {
  if (!mobilenetPredictions || mobilenetPredictions.length === 0) {
    return 'Unknown — Manual Review';
  }

  // Get top prediction
  const topPred = mobilenetPredictions[0];
  if (topPred.probability < 0.3) {
    return 'Unknown — Manual Review';
  }

  const label = topPred.className.toLowerCase();

  // Map MobileNet labels to building components
  const categoryMap = {
    'window': 'Interior - Window (Sash/Sill/Trough)',
    'door': 'Interior - Door/Frame/Jamb',
    'wall': 'Interior - Wall Surface',
    'ceiling': 'Interior - Ceiling',
    'railing': 'Interior - Stairwell/Railing/Banister',
    'banister': 'Interior - Stairwell/Railing/Banister',
    'bannister': 'Interior - Stairwell/Railing/Banister',
    'stair': 'Interior - Stairwell/Railing/Banister',
    'handrail': 'Interior - Stairwell/Railing/Banister',
    'baseboard': 'Interior - Trim/Baseboard/Crown',
    'trim': 'Interior - Trim/Baseboard/Crown',
    'crown': 'Interior - Trim/Baseboard/Crown',
    'exterior': 'Exterior - Side A (Street/Address)',
    'building': 'Exterior - Side A (Street/Address)',
    'house': 'Exterior - Side A (Street/Address)',
    'facade': 'Exterior - Side A (Street/Address)',
    'porch': 'Exterior - Porch/Deck/Steps',
    'deck': 'Exterior - Porch/Deck/Steps',
    'steps': 'Exterior - Porch/Deck/Steps',
    'stoop': 'Exterior - Porch/Deck/Steps',
    'roof': 'Exterior - Roof/Soffit/Fascia',
    'soffit': 'Exterior - Roof/Soffit/Fascia',
    'fascia': 'Exterior - Roof/Soffit/Fascia',
    'gutter': 'Exterior - Gutters/Downspouts',
    'downspout': 'Exterior - Gutters/Downspouts',
    'kitchen': 'Interior - Room Overview',
    'bathroom': 'Interior - Room Overview',
    'closet': 'Interior - Closet/Cabinet/Shelving',
    'cabinet': 'Interior - Closet/Cabinet/Shelving',
    'shelf': 'Interior - Closet/Cabinet/Shelving',
    'floor': 'Interior - Floor/Carpet Condition',
    'carpet': 'Interior - Floor/Carpet Condition',
    'wood': 'Interior - Trim/Baseboard/Crown',
    'paint': 'Interior - Wall Surface',
    'plaster': 'Condition - Plaster/Drywall Damage',
    'drywall': 'Condition - Plaster/Drywall Damage',
    'water': 'Condition - Water Damage/Staining',
    'stain': 'Condition - Water Damage/Staining',
    'dirt': 'Hazard - Bare Soil/Play Area',
    'soil': 'Hazard - Bare Soil/Play Area',
    'playground': 'Hazard - Bare Soil/Play Area',
  };

  // Try to find matching category (exact substring match first)
  for (const [key, category] of Object.entries(categoryMap)) {
    if (label.includes(key)) {
      return category;
    }
  }

  // Fallback: check word-by-word
  const words = label.split(' ');
  for (const word of words) {
    for (const [key, category] of Object.entries(categoryMap)) {
      if (key.includes(word) && word.length > 2) {
        return category;
      }
    }
  }

  // Return most common if no specific match
  return 'Interior - Room Overview';
}

// ───────────────────────────────────────────────────────────────────────────
// HEURISTIC: Pixel analysis for paint condition assessment
// ───────────────────────────────────────────────────────────────────────────
function analyzeImageForPaintCondition(imageElement) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Resize canvas to image size
    canvas.width = imageElement.naturalWidth || imageElement.width;
    canvas.height = imageElement.naturalHeight || imageElement.height;

    // Draw image to canvas
    ctx.drawImage(imageElement, 0, 0);

    // Sample pixels across image (every 10px)
    const samples = [];
    const step = Math.max(10, Math.floor(canvas.width / 50)); // Sample ~50 points

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const imgData = ctx.getImageData(x, y, 1, 1);
        const data = imgData.data;
        // RGB brightness (0-255)
        const brightness = (data[0] + data[1] + data[2]) / 3;
        samples.push({
          x, y, brightness,
          r: data[0], g: data[1], b: data[2], a: data[3]
        });
      }
    }

    // Analyze sample patterns for paint deterioration indicators
    let indicators = [];
    let deterioScore = 0;

    // 1. High contrast edges (possible peeling/cracking)
    const contrastSamples = [];
    for (let i = 0; i < samples.length - 1; i++) {
      const diff = Math.abs(samples[i].brightness - samples[i + 1].brightness);
      contrastSamples.push(diff);
    }
    const avgContrast = contrastSamples.reduce((a, b) => a + b, 0) / contrastSamples.length;
    const highContrastEdges = contrastSamples.filter(c => c > avgContrast * 1.5).length;

    if (highContrastEdges > contrastSamples.length * 0.15) {
      indicators.push('High contrast edges (possible peeling)');
      deterioScore += 2;
    }

    // 2. Light patches (exposed substrate/bare areas)
    const brightSamples = samples.filter(s => s.brightness > 220);
    const darkSamples = samples.filter(s => s.brightness < 100);

    if (brightSamples.length > samples.length * 0.2 && darkSamples.length > samples.length * 0.1) {
      indicators.push('White/light patches with dark areas (exposed substrate)');
      deterioScore += 3;
    }

    // 3. Color variance (uneven paint coverage)
    const reds = samples.map(s => s.r);
    const greens = samples.map(s => s.g);
    const blues = samples.map(s => s.b);

    const colorVariance = [
      Math.max(...reds) - Math.min(...reds),
      Math.max(...greens) - Math.min(...greens),
      Math.max(...blues) - Math.min(...blues)
    ].reduce((a, b) => a + b, 0) / 3;

    if (colorVariance > 100) {
      indicators.push('High color variance (uneven/deteriorated paint)');
      deterioScore += 2;
    }

    // Determine condition level
    let condition = 'Intact';
    let confidence = 0.9;

    if (deterioScore >= 5) {
      condition = 'Deteriorated';
      confidence = 0.85;
    } else if (deterioScore >= 3) {
      condition = 'Poor';
      confidence = 0.80;
    } else if (deterioScore >= 1) {
      condition = 'Fair';
      confidence = 0.75;
    }

    return {
      condition,
      confidence,
      indicators,
      deterioScore
    };
  } catch (error) {
    console.error('Paint condition analysis error:', error);
    return {
      condition: 'Unknown',
      confidence: 0,
      indicators: ['Analysis failed'],
      deterioScore: 0
    };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// HAZARD FLAG LOGIC
// ───────────────────────────────────────────────────────────────────────────
function generateHazardFlags(category, condition) {
  const flags = [];

  // Friction surface hazards (EPA 40 CFR 745)
  const frictionSurfaces = ['window', 'door', 'sash', 'sill'];
  const isFrictionSurface = frictionSurfaces.some(s =>
    category.toLowerCase().includes(s)
  );

  if ((condition === 'Deteriorated' || condition === 'Poor') && isFrictionSurface) {
    flags.push('EPA Friction Surface Hazard');
  }

  // Child access area hazards
  const childAccessKeywords = ['child', 'play', 'bedroom', 'crib', 'nursery'];
  const isChildAccessArea = childAccessKeywords.some(k =>
    category.toLowerCase().includes(k)
  );

  if (condition === 'Deteriorated' && isChildAccessArea) {
    flags.push('Priority Hazard — Child Access');
  }

  // Chewable surface hazards
  const chewableSurfaces = ['sill', 'stool', 'banister', 'railing', 'sash'];
  const isChewable = chewableSurfaces.some(s =>
    category.toLowerCase().includes(s)
  );

  if ((condition === 'Deteriorated' || condition === 'Poor') && isChewable) {
    flags.push('Chewable Surface Hazard');
  }

  return flags;
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────────────
function AIPhotoTagger({ state, dispatch }) {
  const modelRef = useRef(null);
  const tfRef = useRef(null);
  const mobilenetRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Derived modelStatus for status tracking: 'loading' | 'ready' | 'error' | 'idle'
  const modelStatus = error ? 'error' : modelReady ? 'ready' : isLoading ? 'loading' : 'idle';
  const [analysisResults, setAnalysisResults] = useState({});
  const [expandedPhotoId, setExpandedPhotoId] = useState(null);
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [editingCategory, setEditingCategory] = useState('');
  const [reviewedPhotos, setReviewedPhotos] = useState(new Set());

  // ─── Load TensorFlow.js and MobileNet on mount ────────────────────────
  useEffect(() => {
    const loadModels = () => {
      setIsLoading(true);
      setError(null);

      // Load TensorFlow.js
      const tfScript = document.createElement('script');
      tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';
      tfScript.async = true;

      tfScript.onload = () => {
        tfRef.current = window.tf;

        // Load MobileNet
        const mobilenetScript = document.createElement('script');
        mobilenetScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js';
        mobilenetScript.async = true;

        mobilenetScript.onload = () => {
          mobilenetRef.current = window.mobilenet;

          // Initialize MobileNet model
          window.mobilenet.load().then(model => {
            modelRef.current = model;
            setModelReady(true);
            setIsLoading(false);
          }).catch(err => {
            console.error('MobileNet load error:', err);
            setError('Failed to initialize MobileNet model. Please refresh the page.');
            setIsLoading(false);
          });
        };

        mobilenetScript.onerror = () => {
          setError('Failed to load MobileNet library. Please check your internet connection.');
          setIsLoading(false);
        };

        document.head.appendChild(mobilenetScript);
      };

      tfScript.onerror = () => {
        setError('Failed to load TensorFlow.js library. Please check your internet connection.');
        setIsLoading(false);
      };

      document.head.appendChild(tfScript);
    };

    loadModels();
  }, []);

  // ─── Analyze single photo ──────────────────────────────────────────────
  const analyzePhoto = async (photoId, photoDataUrl) => {
    try {
      // Create image element
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Handle data URL
      img.src = photoDataUrl;

      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
      });

      let predictions = [];
      let suggestedCategory = 'Unknown — Manual Review';

      // Try MobileNet classification if model is ready
      if (modelRef.current) {
        try {
          predictions = await modelRef.current.classify(img, 5);
          suggestedCategory = mapToInspectionCategory(predictions);
        } catch (mlErr) {
          console.warn('MobileNet classification failed, using heuristic only:', mlErr);
          // Fall back to heuristic-only (predictions will be empty array)
        }
      } else if (isLoading) {
        throw new Error('AI model still loading. Please wait.');
      } else {
        console.warn('MobileNet not available, using heuristic analysis only');
      }

      // Analyze paint condition (always available)
      const paintCondition = analyzeImageForPaintCondition(img);

      // Generate hazard flags
      const flags = generateHazardFlags(suggestedCategory, paintCondition.condition);

      // Store results
      setAnalysisResults(prev => ({
        ...prev,
        [photoId]: {
          predictions,
          suggestedCategory,
          paintCondition,
          flags,
          usedHeuristicOnly: !modelRef.current || predictions.length === 0,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error(`Analysis failed for photo ${photoId}:`, err);
      setAnalysisResults(prev => ({
        ...prev,
        [photoId]: {
          error: err.message || 'Analysis failed',
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  // ─── Analyze all photos ────────────────────────────────────────────────
  const handleAnalyzeAll = async () => {
    if (state.photos.length === 0) {
      setError('No photos to analyze.');
      return;
    }

    setAnalyzing(true);
    setAnalysisResults({});

    // Analyze with 30s timeout per photo
    for (const photo of state.photos) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), 30000)
      );

      try {
        await Promise.race([
          analyzePhoto(photo.id, photo.dataUrl),
          timeoutPromise
        ]);
      } catch (err) {
        console.error(`Timeout analyzing photo ${photo.id}`);
        setAnalysisResults(prev => ({
          ...prev,
          [photo.id]: {
            error: 'Analysis timeout (exceeded 30s)',
            timestamp: new Date().toISOString()
          }
        }));
      }
    }

    setAnalyzing(false);
  };

  // ─── Accept AI suggestions and apply to photo ──────────────────────────
  const handleAccept = (photoId, result) => {
    if (!result || result.error) return;

    dispatch({
      type: 'UPDATE_PHOTO',
      payload: {
        id: photoId,
        updates: {
          category: result.suggestedCategory,
          aiCondition: result.paintCondition.condition,
          aiConfidence: Math.round(result.paintCondition.confidence * 100),
          aiFlags: result.flags,
          aiAnalyzedAt: result.timestamp
        }
      }
    });

    // Dispatch detailed analysis
    dispatch({
      type: 'ADD_AI_ANALYSIS',
      payload: {
        photoId,
        predictions: result.predictions,
        condition: result.paintCondition,
        flags: result.flags,
        timestamp: result.timestamp
      }
    });

    setReviewedPhotos(prev => new Set([...prev, photoId]));
  };

  // ─── Handle manual category edit ───────────────────────────────────────
  const handleEditCategory = (photoId, newCategory) => {
    dispatch({
      type: 'UPDATE_PHOTO',
      payload: {
        id: photoId,
        updates: {
          category: newCategory,
          aiManuallyOverridden: true
        }
      }
    });

    setReviewedPhotos(prev => new Set([...prev, photoId]));
    setEditingPhotoId(null);
  };

  // ─── Skip photo (mark as reviewed, no changes) ─────────────────────────
  const handleSkip = (photoId) => {
    setReviewedPhotos(prev => new Set([...prev, photoId]));
  };

  // ─── Category options for editing ──────────────────────────────────────
  const allCategories = [
    'Exterior - Side A (Street/Address)',
    'Exterior - Side B (Clockwise)',
    'Exterior - Side C (Rear)',
    'Exterior - Side D (Clockwise)',
    'Exterior - Foundation/Dripline',
    'Exterior - Roof/Soffit/Fascia',
    'Exterior - Gutters/Downspouts',
    'Exterior - Porch/Deck/Steps',
    'Exterior - Garage/Shed/Outbuilding',
    'Exterior - Fence/Railing',
    'Interior - Room Overview',
    'Interior - Window (Sash/Sill/Trough)',
    'Interior - Door/Frame/Jamb',
    'Interior - Wall Surface',
    'Interior - Ceiling',
    'Interior - Trim/Baseboard/Crown',
    'Interior - Closet/Cabinet/Shelving',
    'Interior - Stairwell/Railing/Banister',
    'Interior - Floor/Carpet Condition',
    'Condition - Water Damage/Staining',
    'Condition - Plaster/Drywall Damage',
    'Condition - Vinyl Mini Blinds (Pre-1997)',
    'Hazard - Deteriorated Paint Close-up',
    'Hazard - Friction Surface (Windows/Doors)',
    'Hazard - Impact Surface (Door Stops/Knobs)',
    'Hazard - Chewable Surface (Sills/Railings)',
    'Hazard - Bare Soil/Play Area',
    'Testing - XRF Reading Location',
    'Testing - Paint Chip Sample Location',
    'General - Property Overview',
    'Other'
  ];

  // ─── Color coding for conditions ───────────────────────────────────────
  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Intact': return 'bg-green-100 text-green-800 border-green-300';
      case 'Fair': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Poor': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Deteriorated': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────
  const photoCount = state.photos.length;
  const analyzedCount = Object.keys(analysisResults).length;
  const reviewedCount = reviewedPhotos.size;

  if (!modelReady && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
        <h3 className="text-lg font-bold text-blue-900 mb-2">AI Photo Tagger</h3>
        <button
          onClick={handleAnalyzeAll}
          disabled={photoCount === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyze All Photos
        </button>
        <p className="text-sm text-gray-600 mt-2">Click to initialize AI model and analyze photos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-900">AI Photo Tagger</h3>
          {/* Model Status Indicator */}
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                <span className="inline-block animate-spin">⏳</span> Loading
              </span>
            )}
            {modelReady && !error && (
              <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <span>✓</span> AI Ready
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1 text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                <span>✕</span> Error
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <span className="inline-block animate-spin mr-2">⏳</span>
              Loading TensorFlow.js + MobileNet... (first time may take 30-60 seconds)
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Model Loading Error</p>
            <p className="text-red-700 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-2">The app will fall back to heuristic analysis only.</p>
          </div>
        )}

        {/* Stats */}
        {modelReady && !isLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 text-sm">
              <span className="font-semibold">{analyzedCount}/{photoCount}</span> photos analyzed •
              <span className="font-semibold ml-1">{reviewedCount}</span> reviewed
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAnalyzeAll}
            disabled={photoCount === 0 || analyzing || !modelReady}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {analyzing ? '⏳ Analyzing...' : '🔍 Analyze All Photos'}
          </button>
          {Object.keys(analysisResults).length > 0 && (
            <button
              onClick={() => setAnalysisResults({})}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>

      {/* Analysis Results - Per Photo Cards */}
      {Object.keys(analysisResults).length > 0 && (
        <div className="space-y-4">
          {state.photos.map(photo => {
            const result = analysisResults[photo.id];
            if (!result) return null;

            const isExpanded = expandedPhotoId === photo.id;
            const isEditing = editingPhotoId === photo.id;
            const isReviewed = reviewedPhotos.has(photo.id);

            return (
              <div
                key={photo.id}
                className="bg-white rounded-lg shadow-md border-l-4 border-blue-600 overflow-hidden"
              >
                {/* Card Header - Always visible */}
                <div
                  onClick={() => setExpandedPhotoId(isExpanded ? null : photo.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-4"
                >
                  {/* Thumbnail */}
                  <img
                    src={photo.dataUrl}
                    alt="photo"
                    className="w-16 h-16 object-cover rounded border border-gray-300"
                  />

                  {/* Summary Info */}
                  <div className="flex-1 min-w-0">
                    {result.error ? (
                      <div className="text-red-600 font-medium text-sm">
                        {result.error}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          {photo.category || 'Uncategorized'}
                        </p>
                        <p className="font-semibold text-blue-900">
                          Suggested: {result.suggestedCategory}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getConditionColor(
                              result.paintCondition.condition
                            )}`}
                          >
                            {result.paintCondition.condition}
                          </span>
                          {result.flags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300"
                            >
                              ⚠ {flag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right">
                    {isReviewed && (
                      <span className="text-green-600 font-bold">✓ Reviewed</span>
                    )}
                    <p className="text-gray-500 text-sm mt-1">
                      {isExpanded ? '▼' : '▶'}
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && !result.error && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Heuristic-Only Mode Warning */}
                    {result.usedHeuristicOnly && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <span className="font-semibold">Heuristic Analysis Only:</span> AI model unavailable. Using pixel-based paint condition analysis.
                        </p>
                      </div>
                    )}

                    {/* MobileNet Predictions */}
                    {result.predictions.length > 0 ? (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3">AI Classification (MobileNet)</h4>
                        <div className="space-y-2">
                          {result.predictions.map((pred, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {pred.className}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.round(pred.probability * 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                                {Math.round(pred.probability * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-100 rounded border border-gray-300">
                        <p className="text-sm text-gray-700">
                          No AI classifications available (heuristic mode).
                        </p>
                      </div>
                    )}

                    {/* Paint Condition Analysis */}
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Paint Condition Analysis (Heuristic)</h4>
                      <div className={`p-3 rounded border ${getConditionColor(result.paintCondition.condition)}`}>
                        <p className="font-semibold">
                          {result.paintCondition.condition}
                        </p>
                        <p className="text-xs mt-1">
                          Confidence: {Math.round(result.paintCondition.confidence * 100)}% • Score: {result.paintCondition.deterioScore}
                        </p>
                      </div>
                      {result.paintCondition.indicators.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Detected Issues:</p>
                          <ul className="text-sm text-gray-700 space-y-1 ml-4">
                            {result.paintCondition.indicators.map((indicator, idx) => (
                              <li key={idx} className="list-disc">
                                {indicator}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Hazard Flags */}
                    {result.flags.length > 0 && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">Hazard Flags</h4>
                        <div className="space-y-2">
                          {result.flags.map((flag, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-red-50 border border-red-300 rounded text-red-800 text-sm font-medium"
                            >
                              ⚠ {flag}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category Edit */}
                    {isEditing ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Edit Category
                        </label>
                        <select
                          value={editingCategory}
                          onChange={e => setEditingCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                        >
                          <option value="">Select category...</option>
                          {allCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (editingCategory) {
                                handleEditCategory(photo.id, editingCategory);
                              }
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPhotoId(null)}
                            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm rounded font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAccept(photo.id, result)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => {
                            setEditingPhotoId(photo.id);
                            setEditingCategory(result.suggestedCategory);
                          }}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg font-medium"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => handleSkip(photo.id)}
                          className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg font-medium"
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {photoCount === 0 && (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-300">
          <p className="text-gray-600">No photos available for analysis.</p>
          <p className="text-sm text-gray-500 mt-1">Upload photos in the Photo Upload tab first.</p>
        </div>
      )}
    </div>
  );
}

export default AIPhotoTagger;
