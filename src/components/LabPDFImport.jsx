import React, { useState, useRef, useEffect } from 'react';

const LabPDFImport = ({ state, dispatch }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [extractedResults, setExtractedResults] = useState([]);
  const [rawOcrText, setRawOcrText] = useState('');
  const [pageImages, setPageImages] = useState([]);
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [showRawText, setShowRawText] = useState(false);
  const [error, setError] = useState('');
  const [libraries, setLibraries] = useState({ pdfjs: null, tesseract: null });
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const fileInputRef = useRef(null);

  // Load external libraries
  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    try {
      // Load pdf.js
      const pdfScript = document.createElement('script');
      pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      pdfScript.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setLibraries(prev => ({ ...prev, pdfjs: window.pdfjsLib }));
        }
      };
      document.head.appendChild(pdfScript);

      // Load Tesseract.js
      const tesseractScript = document.createElement('script');
      tesseractScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js';
      tesseractScript.onload = () => {
        if (window.Tesseract) {
          setLibraries(prev => ({ ...prev, tesseract: window.Tesseract }));
        }
      };
      tesseractScript.onerror = () => {
        setError('OCR library could not be loaded. Please check your internet connection.');
      };
      document.head.appendChild(tesseractScript);
    } catch (err) {
      setError('Failed to load required libraries');
    }
  };

  const parsePDF = async (file) => {
    if (!libraries.pdfjs) {
      setError('PDF library not loaded yet. Please wait and try again.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await libraries.pdfjs.getDocument({ data: arrayBuffer }).promise;

      const images = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;

        images.push({
          dataUrl: canvas.toDataURL('image/png'),
          pageNum: i,
          canvas
        });
      }

      return images;
    } catch (err) {
      setError(`Failed to parse PDF: ${err.message}`);
      return null;
    }
  };

  const runOCR = async (images) => {
    if (!libraries.tesseract) {
      setError('OCR library could not be loaded. Please check your internet connection.');
      return null;
    }

    try {
      let allText = '';
      const confidenceScores = [];

      for (let i = 0; i < images.length; i++) {
        setProgress(`Running OCR on page ${i + 1}/${images.length}...`);

        const result = await window.Tesseract.recognize(
          images[i].dataUrl,
          'eng',
          { logger: () => {} }
        );

        const pageText = result.data.text;
        const pageConfidence = result.data.confidence || 0;

        allText += `\n--- PAGE ${i + 1} ---\n${pageText}`;
        confidenceScores.push(pageConfidence);
      }

      const avgConfidence = confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
        : 0;

      return { text: allText, confidence: avgConfidence };
    } catch (err) {
      setError(`OCR processing failed: ${err.message}`);
      return null;
    }
  };

  const parseLabResults = (ocrText, confidence = null) => {
    const results = [];
    const lines = ocrText.split('\n').filter(line => line.trim());

    // Patterns for common lab report formats
    const sampleIdPatterns = [
      /sample\s*id\s*[:=]?\s*([^\s,\n]+)/i,
      /sample\s*(?:number|no\.?)\s*[:=]?\s*([^\s,\n]+)/i,
      /id\s*[:=]?\s*([^\s,\n]+)/i,
      /^([A-Z]{1,3}-?\d{2,4})(?:\s|$)/
    ];

    const locationPatterns = [
      /location\s*[:=]?\s*([^,\n]+)/i,
      /room\s*[:=]?\s*([^,\n]+)/i,
      /area\s*[:=]?\s*([^,\n]+)/i
    ];

    const resultPatterns = [
      /result\s*[:=]?\s*([\d.]+)\s*([µμ]g\/ft²|µμg\/g|mg\/cm²|ppm|%|mg\/kg)?/i,
      /([\d.]+)\s*(µμg\/ft²|µμg\/g|mg\/cm²|ppm|%|mg\/kg)/i
    ];

    const methodPatterns = [
      /method\s*[:=]?\s*([^,\n]+)/i,
      /(xrf|icpms|sed|gravimetric|visual)/i
    ];

    const datePatterns = [
      /date\s*[:=]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
    ];

    // Simple heuristic: treat each non-empty line as potential result
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip header-like lines
      if (line.includes('Page') || line.includes('Report') || line.length < 5) {
        continue;
      }

      let sampleId = '';
      let location = '';
      let result = '';
      let unit = '';
      let method = '';
      let sampleType = 'dust';

      // Try to extract sample ID
      const sampleIdMatch = line.match(sampleIdPatterns[3]);
      if (sampleIdMatch) {
        sampleId = sampleIdMatch[1];
      }

      // Try to extract location
      const locationMatch = line.match(locationPatterns[0]);
      if (locationMatch) {
        location = locationMatch[1].trim();
      }

      // Try to extract result and unit
      const resultMatch = line.match(resultPatterns[1]);
      if (resultMatch) {
        result = resultMatch[1];
        unit = resultMatch[2] || '';

        // Determine sample type based on unit
        if (unit.includes('ft²') || unit.includes('ft2')) {
          sampleType = 'dust';
        } else if (unit.includes('g') || unit.includes('ppm')) {
          sampleType = 'soil';
        } else if (unit.includes('%') || unit.includes('kg')) {
          sampleType = 'paint';
        }
      }

      // Try to extract method
      const methodMatch = line.match(methodPatterns[1]);
      if (methodMatch) {
        method = methodMatch[1];
      }

      // Only add if we found at least a result or sample ID
      if ((result && unit) || sampleId) {
        results.push({
          sampleId: sampleId || `Sample-${results.length + 1}`,
          location: location || 'Not specified',
          sampleType,
          result: result || '',
          unit: unit || '',
          method: method || 'Not specified',
          confidence: confidence,
          original: line
        });
      }
    }

    // Handle common OCR errors
    return results.map(r => ({
      ...r,
      sampleId: r.sampleId.replace(/[lI]/g, '1').replace(/O/g, '0'),
      result: r.result.replace(/[lI]/g, '1').replace(/O/g, '0'),
      unit: r.unit
        .replace(/[lI]/g, '1')
        .replace(/O/g, '0')
        .replace('u', 'µ')
        .replace(/micrograms?/i, 'µg')
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    setError('');
    setIsLoading(true);
    setProgress('Converting PDF pages to images...');
    setExtractedResults([]);
    setPageImages([]);

    try {
      // Parse PDF
      const images = await parsePDF(file);
      if (!images) {
        throw new Error('Failed to parse PDF');
      }

      setPageImages(images);
      setProgress(`Converting page images... (${images.length} pages)`);

      // Run OCR
      const ocrResult = await runOCR(images);
      if (!ocrResult) {
        throw new Error('OCR processing failed');
      }

      const { text: ocrText, confidence: avgConfidence } = ocrResult;
      setRawOcrText(ocrText);
      setOcrConfidence(avgConfidence);
      setProgress('Parsing results...');

      // Parse results
      const parsed = parseLabResults(ocrText, avgConfidence);

      if (parsed.length === 0) {
        setProgress('No results detected in OCR text. You can manually enter results below or review the raw text.');
      } else {
        setProgress(`Successfully extracted ${parsed.length} results`);
      }

      setExtractedResults(parsed);
      setSelectedResults(new Set(parsed.map((_, i) => i)));
      setProgress('');
    } catch (err) {
      setError(err.message || 'An error occurred during PDF processing');
      setProgress('');
    } finally {
      setIsLoading(false);
    }
  };

  const updateResult = (index, field, value) => {
    const updated = [...extractedResults];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedResults(updated);
  };

  const toggleResultSelection = (index) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedResults(newSelected);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-700 bg-green-50';
    if (confidence >= 50) return 'text-yellow-700 bg-yellow-50';
    return 'text-red-700 bg-red-50';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
  };

  const handleImportSelected = () => {
    const toImport = Array.from(selectedResults)
      .map(i => extractedResults[i])
      .filter(r => r.result && r.unit);

    if (toImport.length === 0) {
      setError('Please select results with both value and unit to import');
      return;
    }

    toImport.forEach(result => {
      const dispatchAction = result.sampleType === 'soil' ? 'ADD_SOIL_SAMPLE' : 'ADD_DUST_SAMPLE';

      dispatch({
        type: dispatchAction,
        payload: {
          id: Date.now() + Math.random(),
          sampleId: result.sampleId,
          location: result.location,
          sampleType: result.sampleType,
          result: parseFloat(result.result) || 0,
          unit: result.unit,
          method: result.method,
          date: new Date().toISOString().split('T')[0]
        }
      });
    });

    setProgress(`Imported ${toImport.length} results`);
    setTimeout(() => {
      setExtractedResults([]);
      setPageImages([]);
      setRawOcrText('');
      setSelectedResults(new Set());
      setProgress('');
      setOcrConfidence(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 2000);
  };

  return (
    <div className="w-full">
      {/* Upload Section */}
      <div className="mb-6 p-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg">
        <label
          className="block text-center cursor-pointer hover:bg-blue-100 transition-colors p-4 rounded"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files[0]?.type === 'application/pdf') {
              const event = { target: { files } };
              handleFileUpload(event);
            } else {
              setError('Please drop a PDF file');
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="hidden"
          />
          <div className="text-blue-900 font-semibold mb-2">
            {isLoading ? 'Processing...' : 'Drop PDF here or click to upload'}
          </div>
          <p className="text-sm text-blue-700">
            Supports lab reports in PDF format (dust wipe, soil, paint chip)
          </p>
        </label>
      </div>

      {/* Progress Bar */}
      {isLoading && (
        <div className="mb-6 space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: '75%' }}
            ></div>
          </div>
          <p className="text-sm text-blue-600 font-medium">{progress}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Page Thumbnails */}
      {pageImages.length > 0 && !isLoading && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">PDF Pages</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pageImages.map((img, idx) => (
              <img
                key={idx}
                src={img.dataUrl}
                alt={`Page ${img.pageNum}`}
                className="h-24 w-auto border border-blue-300 rounded shadow-sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      {extractedResults.length > 0 && !isLoading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-900">Extracted Results</h3>
            {ocrConfidence !== null && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getConfidenceColor(ocrConfidence)}`}>
                OCR Confidence: {ocrConfidence}% ({getConfidenceLabel(ocrConfidence)})
              </div>
            )}
          </div>
          <div className="overflow-x-auto border border-blue-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-blue-100 border-b border-blue-200">
                <tr>
                  <th className="p-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedResults.size === extractedResults.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResults(new Set(extractedResults.map((_, i) => i)));
                        } else {
                          setSelectedResults(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="p-2 text-left">Sample ID</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Result</th>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-left">Method</th>
                </tr>
              </thead>
              <tbody>
                {extractedResults.map((result, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(idx)}
                        onChange={() => toggleResultSelection(idx)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={result.sampleId}
                        onChange={(e) => updateResult(idx, 'sampleId', e.target.value)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={result.location}
                        onChange={(e) => updateResult(idx, 'location', e.target.value)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={result.sampleType}
                        onChange={(e) => updateResult(idx, 'sampleType', e.target.value)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="dust">Dust Wipe</option>
                        <option value="soil">Soil</option>
                        <option value="paint">Paint Chip</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={result.result}
                        onChange={(e) => updateResult(idx, 'result', e.target.value)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={result.unit}
                        onChange={(e) => updateResult(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2 text-xs text-gray-600">
                      {result.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Raw Text Section */}
          <div className="mt-4">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
            >
              {showRawText ? '▼' : '▶'} Raw OCR Text ({rawOcrText.length} characters)
            </button>
            {showRawText && (
              <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap break-words text-gray-700">
                  {rawOcrText}
                </pre>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleImportSelected}
              disabled={selectedResults.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Import {selectedResults.size > 0 ? `(${selectedResults.size})` : 'Selected'}
            </button>
            <button
              onClick={() => {
                setExtractedResults([]);
                setPageImages([]);
                setRawOcrText('');
                setSelectedResults(new Set());
                setProgress('');
                setOcrConfidence(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress && extractedResults.length === 0 && !isLoading && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-800">
          {progress}
        </div>
      )}
    </div>
  );
};

export default LabPDFImport;
