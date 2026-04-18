import React, { useState, useRef, useEffect } from 'react';

export default function FloorPlanSketcherTab({ state, dispatch }) {
  // Tool constants
  const TOOLS = {
    WALL: 'wall',
    LABEL: 'label',
    DOOR: 'door',
    WINDOW: 'window',
    MARKER: 'marker',
    ERASER: 'eraser',
    SELECT: 'select'
  };

  const FLOORS = ['Basement', 'First Floor', 'Second Floor', 'Third Floor', 'Attic', 'Exterior'];

  const WINDOW_TYPES = {
    WD: 'Wood Double-Hung',
    V: 'Vinyl',
    AL: 'Aluminum',
    CS: 'Casement',
    SL: 'Sliding',
    FX: 'Fixed'
  };

  const ROOM_TEMPLATES = [
    { name: 'Small Room (10x10)', walls: [{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:0,y:200},{x:0,y:0}] },
    { name: 'Medium Room (12x14)', walls: [{x:0,y:0},{x:240,y:0},{x:240,y:280},{x:0,y:280},{x:0,y:0}] },
    { name: 'Large Room (16x20)', walls: [{x:0,y:0},{x:320,y:0},{x:320,y:400},{x:0,y:400},{x:0,y:0}] },
    { name: 'Hallway (4x12)', walls: [{x:0,y:0},{x:80,y:0},{x:80,y:240},{x:0,y:240},{x:0,y:0}] },
    { name: 'Bathroom (8x10)', walls: [{x:0,y:0},{x:160,y:0},{x:160,y:200},{x:0,y:200},{x:0,y:0}] }
  ];

  // State
  const [activeTool, setActiveTool] = useState(TOOLS.WALL);
  const [currentFloor, setCurrentFloor] = useState('First Floor');
  const [floorPlans, setFloorPlans] = useState({
    floors: {
      'First Floor': { elements: [], compassAngle: 0 }
    }
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWallPoints, setCurrentWallPoints] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [markerSampleMap, setMarkerSampleMap] = useState({});
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [nextMarkerId, setNextMarkerId] = useState(1);
  const [nextElementId, setNextElementId] = useState(1);
  const [customFloorName, setCustomFloorName] = useState('');
  const [pendingWindowType, setPendingWindowType] = useState(null);
  const [showWindowTypeModal, setShowWindowTypeModal] = useState(false);
  const [pendingWindowPos, setPendingWindowPos] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize floor if not exists
  useEffect(() => {
    if (!floorPlans.floors[currentFloor]) {
      setFloorPlans(prev => ({
        ...prev,
        floors: {
          ...prev.floors,
          [currentFloor]: { elements: [], compassAngle: 0 }
        }
      }));
    }
  }, [currentFloor, floorPlans.floors]);

  // Draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    const gridSize = 20 * zoom;
    for (let x = pan.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = pan.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw current floor elements
    const currentFloorData = floorPlans.floors[currentFloor];
    if (currentFloorData && currentFloorData.elements) {
      currentFloorData.elements.forEach(element => {
        drawElement(ctx, element);
      });
    }

    // Draw current wall being drawn
    if (currentWallPoints.length > 0 && activeTool === TOOLS.WALL) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const start = screenToWorld(currentWallPoints[0], pan, zoom);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < currentWallPoints.length; i++) {
        const point = screenToWorld(currentWallPoints[i], pan, zoom);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    // Draw compass rose
    drawCompassRose(ctx, width, height, floorPlans.floors[currentFloor]?.compassAngle || 0);

  }, [floorPlans, currentFloor, currentWallPoints, zoom, pan, activeTool]);

  const screenToWorld = (point, panOffset, zoomLevel) => {
    return {
      x: (point.x - panOffset.x) / zoomLevel,
      y: (point.y - panOffset.y) / zoomLevel
    };
  };

  const worldToScreen = (point, panOffset, zoomLevel) => {
    return {
      x: point.x * zoomLevel + panOffset.x,
      y: point.y * zoomLevel + panOffset.y
    };
  };

  const drawElement = (ctx, element) => {
    const screenPos = worldToScreen({ x: element.x || 0, y: element.y || 0 }, pan, zoom);

    switch (element.type) {
      case TOOLS.WALL:
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3 * zoom;
        ctx.beginPath();
        if (element.points && element.points.length > 0) {
          const start = worldToScreen(element.points[0], pan, zoom);
          ctx.moveTo(start.x, start.y);
          for (let i = 1; i < element.points.length; i++) {
            const point = worldToScreen(element.points[i], pan, zoom);
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
        break;

      case TOOLS.LABEL:
        ctx.fillStyle = '#2563eb';
        ctx.font = `${12 * zoom}px Arial`;
        ctx.fillText(element.text || '', screenPos.x, screenPos.y);
        break;

      case TOOLS.DOOR:
        drawDoor(ctx, screenPos.x, screenPos.y, 8 * zoom);
        break;

      case TOOLS.WINDOW:
        drawWindow(ctx, screenPos.x, screenPos.y, 10 * zoom, element.windowType);
        break;

      case TOOLS.MARKER:
        const markerColor = getMarkerColor(element.result);
        ctx.fillStyle = markerColor;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 8 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw marker number
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${10 * zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.markerNumber || '', screenPos.x, screenPos.y);

        // Draw linked sample info
        if (element.sampleId) {
          const sampleData = state.xrfData?.find(s => s.id === element.sampleId);
          if (sampleData) {
            ctx.fillStyle = '#000000';
            ctx.font = `${10 * zoom}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`${sampleData.room || 'Sample'}: ${sampleData.reading?.toFixed(2) || 'N/A'} mg/cm²`, screenPos.x + 12 * zoom, screenPos.y);
          }
        }
        break;
    }
  };

  const drawDoor = (ctx, x, y, size) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI / 2);
    ctx.stroke();
  };

  const drawWindow = (ctx, x, y, size, windowType) => {
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y + 4);
    ctx.lineTo(x + size / 2, y + 4);
    ctx.stroke();

    // Draw window type code label
    if (windowType) {
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(windowType, x + size / 2 + 4, y);
    }
  };

  const drawCompassRose = (ctx, width, height, angle) => {
    const x = width - 40;
    const y = 30;
    const size = 20;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    // Compass circle
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.stroke();

    // N arrow
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-4, -size + 8);
    ctx.lineTo(4, -size + 8);
    ctx.closePath();
    ctx.fill();

    // S arrow
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(-4, size - 8);
    ctx.lineTo(4, size - 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const getMarkerColor = (result) => {
    if (result === 'positive') return '#dc2626'; // red
    if (result === 'negative') return '#16a34a'; // green
    if (result === 'pending') return '#2563eb'; // blue
    return '#6b7280'; // gray for unknown
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const worldPos = screenToWorld({ x, y }, pan, zoom);

    if (activeTool === TOOLS.WALL) {
      setCurrentWallPoints(prev => [...prev, { x, y }]);
      if (currentWallPoints.length > 0 && e.detail === 2) {
        // Double click to finish wall
        finishWall(worldPos);
      }
    } else if (activeTool === TOOLS.LABEL) {
      const roomName = prompt('Enter room name:');
      if (roomName) {
        addElement({
          type: TOOLS.LABEL,
          x: worldPos.x,
          y: worldPos.y,
          text: roomName
        });
      }
    } else if (activeTool === TOOLS.DOOR) {
      addElement({
        type: TOOLS.DOOR,
        x: worldPos.x,
        y: worldPos.y
      });
    } else if (activeTool === TOOLS.WINDOW) {
      setPendingWindowPos({ x: worldPos.x, y: worldPos.y });
      setShowWindowTypeModal(true);
    } else if (activeTool === TOOLS.MARKER) {
      setSelectedMarkerId(nextMarkerId);
      setShowSampleModal(true);
      setMarkerSampleMap(prev => ({
        ...prev,
        [nextMarkerId]: { x: worldPos.x, y: worldPos.y }
      }));
    } else if (activeTool === TOOLS.ERASER) {
      eraseElementAtPoint(worldPos);
    }
  };

  const handleCanvasDoubleClick = (e) => {
    if (activeTool === TOOLS.WALL && currentWallPoints.length > 0) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldPos = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, pan, zoom);
      finishWall(worldPos);
    }
  };

  const finishWall = (lastPoint) => {
    if (currentWallPoints.length > 1) {
      const points = currentWallPoints.map(p => screenToWorld(p, pan, zoom));
      addElement({
        type: TOOLS.WALL,
        points: points
      });
    }
    setCurrentWallPoints([]);
  };

  const eraseElementAtPoint = (worldPos) => {
    setFloorPlans(prev => {
      const currentFloorData = prev.floors[currentFloor];
      if (!currentFloorData) return prev;

      const filteredElements = currentFloorData.elements.filter(element => {
        const dx = (element.x || 0) - worldPos.x;
        const dy = (element.y || 0) - worldPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance > 15; // 15px tolerance
      });

      return {
        ...prev,
        floors: {
          ...prev.floors,
          [currentFloor]: {
            ...currentFloorData,
            elements: filteredElements
          }
        }
      };
    });
  };

  const addElement = (element) => {
    const id = nextElementId;
    setNextElementId(prev => prev + 1);

    setFloorPlans(prev => {
      const currentFloorData = prev.floors[currentFloor] || { elements: [], compassAngle: 0 };
      return {
        ...prev,
        floors: {
          ...prev.floors,
          [currentFloor]: {
            ...currentFloorData,
            elements: [...currentFloorData.elements, { id, ...element }]
          }
        }
      };
    });
  };

  const handleAddMarker = (sampleId) => {
    if (selectedMarkerId !== null && markerSampleMap[selectedMarkerId]) {
      const pos = markerSampleMap[selectedMarkerId];
      const sampleData = state.xrfData?.find(s => s.id === sampleId);
      const result = sampleData?.reading >= 1.0 ? 'positive' : sampleData?.reading >= 0 ? 'negative' : 'pending';

      addElement({
        type: TOOLS.MARKER,
        x: pos.x,
        y: pos.y,
        sampleId: sampleId,
        markerNumber: nextMarkerId,
        result: result
      });

      setNextMarkerId(prev => prev + 1);
      setShowSampleModal(false);
      setSelectedMarkerId(null);
      setMarkerSampleMap(prev => {
        const newMap = { ...prev };
        delete newMap[selectedMarkerId];
        return newMap;
      });
    }
  };

  const handleZoom = (factor) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev * factor)));
  };

  const handlePan = (e) => {
    if (e.button === 1) { // Middle click
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePanMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      handleZoom(factor);
    }
  };

  const handleRotateCompass = () => {
    setFloorPlans(prev => ({
      ...prev,
      floors: {
        ...prev.floors,
        [currentFloor]: {
          ...prev.floors[currentFloor],
          compassAngle: (prev.floors[currentFloor]?.compassAngle || 0) + 45
        }
      }
    }));
  };

  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `floor-plan-${currentFloor}-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  const handleAddCustomFloor = () => {
    if (customFloorName.trim()) {
      setFloorPlans(prev => ({
        ...prev,
        floors: {
          ...prev.floors,
          [customFloorName]: { elements: [], compassAngle: 0 }
        }
      }));
      setCurrentFloor(customFloorName);
      setCustomFloorName('');
    }
  };

  const insertRoomTemplate = (template) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate center position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldCenter = screenToWorld({ x: centerX, y: centerY }, pan, zoom);

    // Calculate offset from template bounds to center
    const minX = Math.min(...template.walls.map(w => w.x));
    const minY = Math.min(...template.walls.map(w => w.y));
    const templateCenterX = minX + (Math.max(...template.walls.map(w => w.x)) - minX) / 2;
    const templateCenterY = minY + (Math.max(...template.walls.map(w => w.y)) - minY) / 2;

    // Adjust points to center on world center
    const offsetX = worldCenter.x - templateCenterX;
    const offsetY = worldCenter.y - templateCenterY;

    const adjustedWalls = template.walls.map(w => ({
      x: w.x + offsetX,
      y: w.y + offsetY
    }));

    addElement({
      type: TOOLS.WALL,
      points: adjustedWalls
    });
  };

  const handleSaveToState = () => {
    if (dispatch) {
      dispatch({
        type: 'UPDATE_FLOOR_PLANS',
        payload: floorPlans
      });
    }
  };

  const getPlacedMarkers = () => {
    const currentFloorData = floorPlans.floors[currentFloor];
    if (!currentFloorData) return [];
    return currentFloorData.elements.filter(e => e.type === TOOLS.MARKER);
  };

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = 600;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allFloors = Object.keys(floorPlans.floors);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-900 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-bold">Floor Plan Sketcher</h2>
      </div>

      {/* Controls */}
      <div className="bg-gray-100 p-3 border-b border-gray-300 space-y-3">
        {/* Floor selector */}
        <div className="flex gap-2 items-center">
          <label className="text-sm font-semibold text-gray-700">Floor:</label>
          <select
            value={currentFloor}
            onChange={(e) => setCurrentFloor(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded bg-white text-sm"
          >
            {FLOORS.concat(allFloors.filter(f => !FLOORS.includes(f))).map(floor => (
              <option key={floor} value={floor}>{floor}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Custom floor name"
            value={customFloorName}
            onChange={(e) => setCustomFloorName(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          />
          <button
            onClick={handleAddCustomFloor}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Add Floor
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-1 flex-wrap items-center bg-white p-2 rounded border border-gray-300">
          <button
            onClick={() => setActiveTool(TOOLS.WALL)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.WALL ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Draw walls (click to place points, double-click to finish)"
          >
            ━ Wall
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.LABEL)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.LABEL ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Place room label"
          >
            🏷 Label
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.DOOR)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.DOOR ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Place door"
          >
            ⌙ Door
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.WINDOW)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.WINDOW ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Place window"
          >
            ▨ Window
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.MARKER)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.MARKER ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Place sample marker"
          >
            ● Marker
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.ERASER)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.ERASER ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Erase elements"
          >
            ✕ Erase
          </button>
          <button
            onClick={() => setActiveTool(TOOLS.SELECT)}
            className={`px-3 py-2 rounded text-sm font-medium transition ${
              activeTool === TOOLS.SELECT ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Select and move elements"
          >
            ◆ Select
          </button>

          <div className="border-l border-gray-300 h-6 mx-1"></div>

          <div className="relative group">
            <button
              className="px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
              title="Insert room template"
            >
              ⬜ Templates
            </button>
            <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
              {ROOM_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => insertRoomTemplate(template)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-blue-50 first:rounded-t last:rounded-b"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRotateCompass}
            className="px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            title="Rotate compass rose"
          >
            ⟳ Compass
          </button>

          <button
            onClick={() => handleZoom(1.2)}
            className="px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            title="Zoom in (Ctrl+scroll)"
          >
            🔍+ Zoom
          </button>
          <button
            onClick={() => handleZoom(0.83)}
            className="px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            title="Zoom out"
          >
            🔍- Zoom
          </button>

          <div className="border-l border-gray-300 h-6 mx-1"></div>

          <button
            onClick={handleExportImage}
            className="px-3 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition"
            title="Export floor plan as PNG image"
          >
            ⬇ Export
          </button>
          <button
            onClick={handleSaveToState}
            className="px-3 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
            title="Save to app state"
          >
            💾 Save
          </button>
        </div>
      </div>

      {/* Canvas and Side Panel */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          <div ref={containerRef} className="flex-1 border-2 border-gray-300 rounded overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseDown={handlePan}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              onWheel={handleWheel}
              className="block cursor-crosshair w-full h-full"
            />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Zoom: {(zoom * 100).toFixed(0)}% | Pan: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)}) |
            Double-click walls to finish | Ctrl+Scroll to zoom | Middle-click+drag to pan
          </div>
        </div>

        {/* Side Panel - Placed Markers */}
        <div className="w-64 border-2 border-gray-300 rounded flex flex-col bg-gray-50">
          <div className="bg-blue-900 text-white p-3 font-semibold rounded-t">
            Sample Markers ({getPlacedMarkers().length})
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {getPlacedMarkers().length === 0 ? (
              <p className="text-sm text-gray-600">No sample markers placed yet</p>
            ) : (
              getPlacedMarkers().map((marker, idx) => {
                const sampleData = state.xrfData?.find(s => s.id === marker.sampleId);
                return (
                  <div
                    key={idx}
                    className="p-2 bg-white border border-gray-300 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getMarkerColor(marker.result) }}
                      ></div>
                      <span className="font-semibold">Marker {marker.markerNumber}</span>
                    </div>
                    {sampleData && (
                      <div className="mt-1 text-xs text-gray-700">
                        <div>{sampleData.room || 'Sample'}</div>
                        <div className="font-mono">
                          {sampleData.reading?.toFixed(2) || 'N/A'} mg/cm²
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sample Selection Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Link Sample to Marker</h3>
            {state.xrfData && state.xrfData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {state.xrfData.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleAddMarker(sample.id)}
                    className="w-full p-3 text-left border border-gray-300 rounded hover:bg-blue-50 transition"
                  >
                    <div className="font-semibold text-gray-800">{sample.room || 'Sample'}</div>
                    <div className="text-sm text-gray-600">
                      Reading: {sample.reading?.toFixed(2) || 'N/A'} mg/cm²
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setShowSampleModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">No XRF samples available in state</p>
                <button
                  onClick={() => setShowSampleModal(false)}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Window Type Selection Modal */}
      {showWindowTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Select Window Type</h3>
            <div className="space-y-2">
              {Object.entries(WINDOW_TYPES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => {
                    if (pendingWindowPos) {
                      addElement({
                        type: TOOLS.WINDOW,
                        x: pendingWindowPos.x,
                        y: pendingWindowPos.y,
                        windowType: code
                      });
                    }
                    setShowWindowTypeModal(false);
                    setPendingWindowPos(null);
                    setPendingWindowType(null);
                  }}
                  className="w-full p-3 text-left border border-gray-300 rounded hover:bg-blue-50 transition"
                >
                  <div className="font-semibold text-gray-800">{code}</div>
                  <div className="text-sm text-gray-600">{name}</div>
                </button>
              ))}
              <button
                onClick={() => {
                  setShowWindowTypeModal(false);
                  setPendingWindowPos(null);
                  setPendingWindowType(null);
                }}
                className="w-full mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
