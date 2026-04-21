import React, { useState, useRef, useMemo } from 'react';

// ============================================================================
// SAFETY LIMITS — prevent browser OOM on phone uploads
// ----------------------------------------------------------------------------
// Modern phones routinely produce 8-15 MB photos; 50+ MP images pushed through
// canvas.toDataURL() + stored in Redux state will crash tabs on older devices.
// Hard-reject over 15 MB so the inspector sees an error instead of a freeze.
// Warn between 5-15 MB so large batches don't silently exhaust storage.
// ============================================================================
var MAX_FILE_BYTES = 15 * 1024 * 1024;   // 15 MB per file — hard reject
var WARN_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB per file — soft warn
var MAX_TOTAL_PHOTOS = 500;              // project-wide hard cap (Appendix D sanity)
var WARN_TOTAL_PHOTOS = 150;             // soft warn

// ============================================================================
// REQUIRED PHOTO CATEGORIES
// Per Michigan LIRA-EBL Report Checklist (Form 633775, V.3), HUD Chapters 5/7,
// EPA 40 CFR 745, and HUD 24 CFR Part 35
// ============================================================================

// Categories that apply to ALL inspection types
// ── EXTERIOR: Required for ALL inspection types per Michigan LIRA-EBL Protocol ──
// Side A = address/street side, then B/C/D clockwise per HUD Chapter 7
var BASE_CATEGORIES = [
  { id: 'ext_side_a', label: 'Exterior - Side A (Street/Address)', group: 'Exterior', required: true },
  { id: 'ext_side_b', label: 'Exterior - Side B (Clockwise)', group: 'Exterior', required: true },
  { id: 'ext_side_c', label: 'Exterior - Side C (Rear)', group: 'Exterior', required: true },
  { id: 'ext_side_d', label: 'Exterior - Side D (Clockwise)', group: 'Exterior', required: true },
  { id: 'ext_foundation', label: 'Exterior - Foundation/Dripline', group: 'Exterior', required: false },
  { id: 'ext_roof', label: 'Exterior - Roof/Soffit/Fascia', group: 'Exterior', required: false },
  { id: 'ext_gutters', label: 'Exterior - Gutters/Downspouts', group: 'Exterior', required: false },
  { id: 'ext_porch', label: 'Exterior - Porch/Deck/Steps', group: 'Exterior', required: false },
  { id: 'ext_outbuilding', label: 'Exterior - Garage/Shed/Outbuilding', group: 'Exterior', required: false },
  { id: 'ext_fence', label: 'Exterior - Fence/Railing', group: 'Exterior', required: false },

  // ── INTERIOR: Per HUD Chapters 5/7 & Michigan Building Condition Survey ──
  { id: 'interior_room', label: 'Interior - Room Overview', group: 'Interior', required: true },
  { id: 'interior_window', label: 'Interior - Window (Sash/Sill/Trough)', group: 'Interior', required: false },
  { id: 'interior_door', label: 'Interior - Door/Frame/Jamb', group: 'Interior', required: false },
  { id: 'interior_wall', label: 'Interior - Wall Surface', group: 'Interior', required: false },
  { id: 'interior_ceiling', label: 'Interior - Ceiling', group: 'Interior', required: false },
  { id: 'interior_trim', label: 'Interior - Trim/Baseboard/Crown', group: 'Interior', required: false },
  { id: 'interior_closet', label: 'Interior - Closet/Cabinet/Shelving', group: 'Interior', required: false },
  { id: 'interior_stairwell', label: 'Interior - Stairwell/Railing/Banister', group: 'Interior', required: false },
  { id: 'interior_floor', label: 'Interior - Floor/Carpet Condition', group: 'Interior', required: false },

  // ── BUILDING CONDITION: Per HUD 2012 Building Condition Survey ──
  { id: 'condition_water', label: 'Condition - Water Damage/Staining', group: 'Condition', required: false },
  { id: 'condition_plaster', label: 'Condition - Plaster/Drywall Damage', group: 'Condition', required: false },
  { id: 'condition_mini_blinds', label: 'Condition - Vinyl Mini Blinds (Pre-1997)', group: 'Condition', required: false },

  // ── HAZARDS: Per Michigan LIRA-EBL Report Checklist ──
  { id: 'hazard_closeup', label: 'Hazard - Deteriorated Paint Close-up', group: 'Hazards', required: true },
  { id: 'hazard_friction', label: 'Hazard - Friction Surface (Windows/Doors)', group: 'Hazards', required: false },
  { id: 'hazard_impact', label: 'Hazard - Impact Surface (Door Stops/Knobs)', group: 'Hazards', required: false },
  { id: 'hazard_chewable', label: 'Hazard - Chewable Surface (Sills/Railings)', group: 'Hazards', required: false },
  { id: 'hazard_bare_soil', label: 'Hazard - Bare Soil/Play Area', group: 'Hazards', required: false },

  // ── TESTING LOCATIONS: Per 40 CFR 745 & HUD Protocols ──
  { id: 'xrf_location', label: 'Testing - XRF Reading Location', group: 'Testing', required: false },
  { id: 'paint_chip', label: 'Testing - Paint Chip Sample Location', group: 'Testing', required: false },

  // ── GENERAL ──
  { id: 'general_property', label: 'General - Property Overview', group: 'General', required: false },
  { id: 'other', label: 'Other', group: 'General', required: false },
];

// ── Additional for Risk Assessment: dust and soil sampling (per HUD Ch.5) ──
var RISK_ASSESSMENT_CATEGORIES = [
  { id: 'dust_sample_floor', label: 'Testing - Dust Wipe: Floor', group: 'Testing', required: true },
  { id: 'dust_sample_sill', label: 'Testing - Dust Wipe: Window Sill/Stool', group: 'Testing', required: true },
  { id: 'dust_sample_trough', label: 'Testing - Dust Wipe: Window Trough', group: 'Testing', required: false },
  { id: 'soil_sample_play', label: 'Testing - Soil: Play Area', group: 'Testing', required: true },
  { id: 'soil_sample_dripline', label: 'Testing - Soil: Foundation Dripline', group: 'Testing', required: false },
  { id: 'soil_sample_yard', label: 'Testing - Soil: Bare Yard Area', group: 'Testing', required: false },
];

// ── Additional for EBL/Medicaid: child-specific + household items ──
// Per Michigan EBL Environmental Investigation Protocol
var EBL_CATEGORIES = [
  { id: 'child_sleep', label: 'Child - Sleeping Area/Crib/Bed', group: 'EBL', required: true },
  { id: 'child_play', label: 'Child - Play Area (Indoor)', group: 'EBL', required: true },
  { id: 'child_eat', label: 'Child - Eating Area/High Chair', group: 'EBL', required: true },
  { id: 'child_chewable', label: 'Child - Chewable Surfaces (Sills/Rails)', group: 'EBL', required: true },
  { id: 'child_outdoor_play', label: 'Child - Outdoor Play Area', group: 'EBL', required: true },
  { id: 'household_items', label: 'Household - Lead-Containing Items (Toys/Ceramics)', group: 'EBL', required: true },
  { id: 'household_mini_blinds', label: 'Household - Vinyl Mini Blinds', group: 'EBL', required: false },
  { id: 'household_spices', label: 'Household - Imported Spices/Cosmetics/Pottery', group: 'EBL', required: false },
  { id: 'secondary_location', label: 'Secondary Location (Daycare/Relative)', group: 'EBL', required: false },
];

// ── Additional for Clearance/Abatement (HUD Ch.12/15) ──
var CLEARANCE_CATEGORIES = [
  { id: 'clearance_before', label: 'Clearance - Before (Pre-Abatement)', group: 'Clearance', required: false },
  { id: 'clearance_after', label: 'Clearance - After (Post-Abatement)', group: 'Clearance', required: false },
  { id: 'clearance_dust', label: 'Clearance - Dust Clearance Sample Location', group: 'Clearance', required: false },
];

var CONDITIONS = ['Intact', 'Fair', 'Deteriorated', 'N/A'];

// ============================================================================
// HELPERS
// ============================================================================
function getUniqueRooms(xrfData) {
  var rooms = {};
  xrfData.forEach(function(d) { if (d.room) rooms[d.room] = true; });
  return Object.keys(rooms).sort();
}

function getComponentsForRoom(xrfData, room) {
  var components = {};
  xrfData.forEach(function(d) { if (d.room === room && d.component) components[d.component] = true; });
  return Object.keys(components).sort();
}

function generateId() {
  return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function PhotoUploadTab({ state, dispatch }) {
  var fileInputRef = useRef(null);
  var cameraInputRef = useRef(null);

  // Upload form defaults
  var [selectedRoom, setSelectedRoom] = useState('');
  var [selectedComponent, setSelectedComponent] = useState('');
  var [selectedSide, setSelectedSide] = useState('');
  var [selectedCondition, setSelectedCondition] = useState('N/A');
  var [selectedCategory, setSelectedCategory] = useState('interior_room');
  var [caption, setCaption] = useState('');
  var [selectedDirection, setSelectedDirection] = useState('');

  // UI state
  var [viewMode, setViewMode] = useState('gallery');
  var [filterRoom, setFilterRoom] = useState('All');
  var [editingPhoto, setEditingPhoto] = useState(null);
  var [expandedPhoto, setExpandedPhoto] = useState(null);
  var [showChecklist, setShowChecklist] = useState(true);
  // Deletion confirmation — photos are evidence; HUD 24 CFR 35.915 and
  // Michigan R 325.99207 require 3-yr retention of inspection records,
  // which includes the supporting photo documentation. A stray click on
  // a small trashcan icon shouldn't silently remove a piece of the record.
  var [deleteTarget, setDeleteTarget] = useState(null); // photo object or null

  var photos = state.photos || [];
  var rooms = getUniqueRooms(state.xrfData);
  var componentsForRoom = selectedRoom ? getComponentsForRoom(state.xrfData, selectedRoom) : [];
  var inspectionType = state.projectInfo.inspectionType || 'Risk Assessment';
  var programType = state.projectInfo.programType || 'HUD';

  // Property context — used to dim the checklist when photo categories don't apply
  // (e.g., a post-1978 non-target-housing property has no EPA lead hazards, so
  // hazard_closeup isn't actually a blocker, just a "nice to have" for records).
  var yearBuilt = parseInt(state.projectInfo.yearBuilt, 10);
  var isPre1978 = !isNaN(yearBuilt) && yearBuilt < 1978;
  var isPost1978Only = !isNaN(yearBuilt) && yearBuilt >= 1978;
  var isClearance = /clearance/i.test(inspectionType || '');

  // Build the full categories list based on program and inspection type
  var allCategories = useMemo(function() {
    var cats = BASE_CATEGORIES.slice();
    if (inspectionType !== 'LBP Inspection Only') {
      cats = cats.concat(RISK_ASSESSMENT_CATEGORIES);
    }
    if (programType === 'EBL' || programType === 'Medicaid') {
      cats = cats.concat(EBL_CATEGORIES);
    }
    // Clearance categories become REQUIRED when the inspection is a clearance —
    // HUD 24 CFR 35.1340(b) requires documentation before & after abatement.
    var clearanceCats = CLEARANCE_CATEGORIES.map(function(c) {
      if (isClearance && (c.id === 'clearance_before' || c.id === 'clearance_after')) {
        return Object.assign({}, c, { required: true });
      }
      return c;
    });
    cats = cats.concat(clearanceCats);
    return cats;
  }, [inspectionType, programType, isClearance]);

  // Compute completeness checklist
  var requiredCategories = allCategories.filter(function(c) { return c.required; });
  var categoryPhotoCounts = useMemo(function() {
    var counts = {};
    photos.forEach(function(p) {
      var cat = p.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [photos]);

  var completedRequired = requiredCategories.filter(function(c) { return (categoryPhotoCounts[c.id] || 0) > 0; }).length;
  var totalRequired = requiredCategories.length;

  // Group photos by room for display
  var photoRooms = {};
  photos.forEach(function(p) { if (p.room) photoRooms[p.room] = true; });
  var photoRoomList = Object.keys(photoRooms).sort();

  var filteredPhotos = filterRoom === 'All'
    ? photos
    : photos.filter(function(p) { return p.room === filterRoom; });

  var photosByRoom = {};
  filteredPhotos.forEach(function(p) {
    var key = p.room || 'Unassigned';
    if (!photosByRoom[key]) photosByRoom[key] = [];
    photosByRoom[key].push(p);
  });
  var roomKeys = Object.keys(photosByRoom).sort();

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Get GPS position (non-blocking)
  function getGPSPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: null, longitude: null }),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  }

  function processFiles(files) {
    var fileArray = Array.from(files);

    // ── 1. Filter to image files only ──
    var imageFiles = fileArray.filter(function(f) { return f.type.startsWith('image/'); });
    var skippedNonImage = fileArray.length - imageFiles.length;

    // ── 2. Enforce per-file size cap (MAX_FILE_BYTES) and collect soft warnings ──
    var acceptedFiles = [];
    var oversizedNames = [];
    var largeWarnNames = [];
    imageFiles.forEach(function(f) {
      if (f.size > MAX_FILE_BYTES) {
        oversizedNames.push(f.name + ' (' + (f.size / 1048576).toFixed(1) + ' MB)');
        return;
      }
      if (f.size > WARN_FILE_BYTES) {
        largeWarnNames.push(f.name);
      }
      acceptedFiles.push(f);
    });

    // ── 3. Enforce project-wide photo cap ──
    var currentCount = photos.length;
    var roomForMore = MAX_TOTAL_PHOTOS - currentCount;
    var overflowCount = 0;
    if (acceptedFiles.length > roomForMore) {
      overflowCount = acceptedFiles.length - roomForMore;
      acceptedFiles = acceptedFiles.slice(0, roomForMore);
    }

    // ── 4. Surface all warnings in one message ──
    var msgs = [];
    if (skippedNonImage > 0) msgs.push(skippedNonImage + ' non-image file' + (skippedNonImage === 1 ? '' : 's') + ' skipped.');
    if (oversizedNames.length > 0) {
      msgs.push('Skipped ' + oversizedNames.length + ' photo' + (oversizedNames.length === 1 ? '' : 's') +
        ' over ' + (MAX_FILE_BYTES / 1048576) + ' MB:\n  - ' + oversizedNames.slice(0, 5).join('\n  - ') +
        (oversizedNames.length > 5 ? '\n  - ...and ' + (oversizedNames.length - 5) + ' more' : ''));
    }
    if (overflowCount > 0) {
      msgs.push('Project cap is ' + MAX_TOTAL_PHOTOS + ' photos. ' + overflowCount + ' photo' +
        (overflowCount === 1 ? '' : 's') + ' skipped.');
    }
    if (largeWarnNames.length > 0 && oversizedNames.length === 0) {
      // Only soft-warn if nothing was hard-rejected (avoid stacking dialogs)
      console.warn('[PhotoUpload] Large photos (>5MB) accepted:', largeWarnNames);
    }
    if (msgs.length > 0) {
      alert(msgs.join('\n\n'));
    }

    if (acceptedFiles.length === 0) return;
    var total = acceptedFiles.length;
    var newPhotos = [];
    var processed = 0;

    // Request device GPS once per batch (used only when file.lastModified GPS
    // is unavailable — device location at upload time is a FALLBACK, not a
    // substitute for EXIF GPS, which true chain-of-custody would require).
    getGPSPosition().then(function(gpsData) {
      acceptedFiles.forEach(function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var maxDim = 1200;
            var w = img.width;
            var h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
              else { w = Math.round(w * maxDim / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            // Chain-of-custody timestamp resolution:
            // 1. file.lastModified (photo capture time per OS filesystem)
            // 2. new Date() (upload time — fallback only)
            // timestampSource lets the report note which was used.
            var capturedAt = file.lastModified ? new Date(file.lastModified).toISOString() : null;
            var uploadedAt = new Date().toISOString();

            newPhotos.push({
              id: generateId(),
              dataUrl: dataUrl,
              fileName: file.name,
              fileSizeBytes: file.size,
              room: selectedRoom || '',
              component: selectedComponent || '',
              side: selectedSide || '',
              condition: selectedCondition || 'N/A',
              category: selectedCategory || 'interior_room',
              caption: caption || '',
              compassDirection: selectedDirection || '',
              timestamp: capturedAt || uploadedAt,
              timestampSource: capturedAt ? 'file-lastModified' : 'upload-time',
              uploadedAt: uploadedAt,
              width: w,
              height: h,
              latitude: gpsData.latitude,
              longitude: gpsData.longitude
            });

            processed++;
            if (processed === total) {
              dispatch({ type: 'ADD_PHOTOS', payload: newPhotos });
              setSelectedDirection('');
            }
          };
          img.onerror = function() {
            // Corrupt or unreadable image — don't block the batch, count as processed
            console.error('[PhotoUpload] Failed to decode', file.name);
            processed++;
            if (processed === total && newPhotos.length > 0) {
              dispatch({ type: 'ADD_PHOTOS', payload: newPhotos });
              setSelectedDirection('');
            }
          };
          img.src = e.target.result;
        };
        reader.onerror = function() {
          console.error('[PhotoUpload] FileReader failed for', file.name);
          processed++;
          if (processed === total && newPhotos.length > 0) {
            dispatch({ type: 'ADD_PHOTOS', payload: newPhotos });
            setSelectedDirection('');
          }
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function handleFileUpload(e) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDeletePhoto(photoId) {
    // Open the confirmation modal instead of the browser's native confirm().
    // Finding the full photo object so the modal can show a thumbnail +
    // category preview — a blind "Delete this photo?" hides exactly the
    // information needed to decide whether to proceed.
    var target = photos.find(function(p) { return p.id === photoId; });
    if (target) setDeleteTarget(target);
  }

  function confirmDeletePhoto() {
    if (!deleteTarget) return;
    var photoId = deleteTarget.id;
    dispatch({ type: 'DELETE_PHOTO', payload: photoId });
    if (editingPhoto === photoId) setEditingPhoto(null);
    if (expandedPhoto === photoId) setExpandedPhoto(null);
    setDeleteTarget(null);
  }

  function handleUpdatePhoto(photoId, updates) {
    dispatch({ type: 'UPDATE_PHOTO', payload: { id: photoId, updates: updates } });
  }

  // Get the label for a category id
  function getCategoryLabel(catId) {
    var found = allCategories.find(function(c) { return c.id === catId; });
    return found ? found.label : catId;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-6">

      {/* ── COMPLIANCE CHECKLIST ── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={function() { setShowChecklist(!showChecklist); }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-800 to-blue-600 text-white font-semibold"
        >
          <span>Photo Documentation Checklist ({completedRequired}/{totalRequired} required)</span>
          <span className="text-sm">{showChecklist ? '\u25B2 Hide' : '\u25BC Show'}</span>
        </button>

        {showChecklist && (
          <div className="p-4">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Required Photos Progress</span>
                <span className={'font-bold ' + (completedRequired === totalRequired ? 'text-green-600' : 'text-orange-600')}>
                  {completedRequired}/{totalRequired}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={'h-2.5 rounded-full transition-all ' + (completedRequired === totalRequired ? 'bg-green-500' : 'bg-orange-500')}
                  style={{ width: (totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0) + '%' }}
                />
              </div>
            </div>

            {/* Program context */}
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3 text-sm">
              <strong>Inspection Type:</strong> {inspectionType} | <strong>Program:</strong> {programType}
              {inspectionType !== 'LBP Inspection Only' && <span> | Dust & soil sample location photos required</span>}
              {(programType === 'EBL' || programType === 'Medicaid') && <span> | Child-specific area photos required</span>}
              {isClearance && <span> | Clearance before/after photos required (24 CFR 35.1340(b))</span>}
            </div>

            {/* Property / age context — affects whether lead-hazard photo types apply */}
            {isPost1978Only && (
              <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-3 text-xs text-yellow-900">
                <strong>Post-1978 property ({yearBuilt}):</strong> EPA 40 CFR 745.103 presumption of lead-based paint
                does not apply. Hazard photo categories are optional for documentation only.
              </div>
            )}
            {isPre1978 && (
              <div className="bg-red-50 border border-red-300 rounded px-3 py-2 mb-3 text-xs text-red-900">
                <strong>Pre-1978 target housing ({yearBuilt}):</strong> Deteriorated-paint close-up
                photos (40 CFR 745.227(b)(2)) and each sampling location must be documented.
              </div>
            )}

            {/* Photo count warning — prevents silent Redux state bloat */}
            {photos.length >= WARN_TOTAL_PHOTOS && photos.length < MAX_TOTAL_PHOTOS && (
              <div className="bg-amber-50 border border-amber-300 rounded px-3 py-2 mb-3 text-xs text-amber-900">
                {photos.length} photos stored — browsers may slow when state grows past
                {' '}{MAX_TOTAL_PHOTOS} (hard cap). Consider splitting very large projects.
              </div>
            )}
            {photos.length >= MAX_TOTAL_PHOTOS && (
              <div className="bg-red-100 border border-red-400 rounded px-3 py-2 mb-3 text-xs text-red-900">
                Project photo cap ({MAX_TOTAL_PHOTOS}) reached — new uploads will be blocked.
              </div>
            )}

            {/* Checklist grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {['Exterior', 'Interior', 'Condition', 'Hazards', 'Testing', 'EBL', 'Clearance', 'General'].map(function(group) {
                var groupCats = allCategories.filter(function(c) { return c.group === group; });
                if (groupCats.length === 0) return null;

                return (
                  <div key={group} className="mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{group}</h4>
                    {groupCats.map(function(cat) {
                      var count = categoryPhotoCounts[cat.id] || 0;
                      var hasPhoto = count > 0;
                      return (
                        <div key={cat.id} className="flex items-center gap-2 py-0.5">
                          {hasPhoto ? (
                            <span className="text-green-600 text-sm">{'\u2713'}</span>
                          ) : cat.required ? (
                            <span className="text-red-500 text-sm">{'\u2717'}</span>
                          ) : (
                            <span className="text-gray-300 text-sm">{'\u25CB'}</span>
                          )}
                          <span className={'text-sm ' + (hasPhoto ? 'text-green-700' : cat.required ? 'text-red-700' : 'text-gray-500')}>
                            {cat.label}
                            {cat.required && <span className="text-red-400 text-xs ml-1">*</span>}
                            {count > 0 && <span className="text-gray-400 text-xs ml-1">({count})</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              * Required per Michigan LIRA-EBL Report Checklist, HUD Chapters 5/7, and EPA 40 CFR 745.
              All photos will appear in Appendix D: Photo Log of your generated report.
            </p>
          </div>
        )}
      </div>

      {/* ── UPLOAD SECTION ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 text-lg mb-4">Upload Photos</h3>

        {/* Auto-label context selectors */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Room / Location</label>
            <select
              value={selectedRoom}
              onChange={function(e) { setSelectedRoom(e.target.value); setSelectedComponent(''); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select Room --</option>
              <optgroup label="── Interior Rooms ──">
                <option value="Kitchen">Kitchen</option>
                <option value="Living Room">Living Room</option>
                <option value="Dining Room">Dining Room</option>
                <option value="Master Bedroom">Master Bedroom</option>
                <option value="Bedroom 2">Bedroom 2</option>
                <option value="Bedroom 3">Bedroom 3</option>
                <option value="Bedroom 4">Bedroom 4</option>
                <option value="Bathroom 1">Bathroom 1</option>
                <option value="Bathroom 2">Bathroom 2</option>
                <option value="Hallway">Hallway</option>
                <option value="Stairwell">Stairwell</option>
                <option value="Laundry Room">Laundry Room</option>
                <option value="Utility Room">Utility Room</option>
                <option value="Closet">Closet</option>
                <option value="Pantry">Pantry</option>
                <option value="Mudroom">Mudroom</option>
                <option value="Sunroom">Sunroom</option>
                <option value="Office/Den">Office/Den</option>
                <option value="Family Room">Family Room</option>
                <option value="Nursery/Child Room">Nursery/Child Room</option>
              </optgroup>
              <optgroup label="── Basement / Attic ──">
                <option value="Basement">Basement</option>
                <option value="Basement - Finished">Basement - Finished</option>
                <option value="Basement - Unfinished">Basement - Unfinished</option>
                <option value="Attic">Attic</option>
                <option value="Crawl Space">Crawl Space</option>
              </optgroup>
              <optgroup label="── Exterior ──">
                <option value="Exterior - Side A">Exterior - Side A (Street)</option>
                <option value="Exterior - Side B">Exterior - Side B</option>
                <option value="Exterior - Side C">Exterior - Side C</option>
                <option value="Exterior - Side D">Exterior - Side D</option>
                <option value="Exterior">Exterior - General</option>
              </optgroup>
              <optgroup label="── Outdoor / Other ──">
                <option value="Porch">Porch/Deck</option>
                <option value="Garage">Garage</option>
                <option value="Shed/Outbuilding">Shed/Outbuilding</option>
                <option value="Yard - Front">Yard - Front</option>
                <option value="Yard - Back">Yard - Back</option>
                <option value="Yard - Play Area">Yard - Play Area</option>
                <option value="Driveway/Walkway">Driveway/Walkway</option>
                <option value="Fence/Gate">Fence/Gate</option>
              </optgroup>
              {rooms.length > 0 && <optgroup label="── From XRF Data ──">
                {rooms.filter(function(r) {
                  // Only show XRF rooms not already in the hardcoded list
                  var hardcoded = ['Kitchen','Living Room','Dining Room','Master Bedroom','Bedroom 2','Bedroom 3','Bedroom 4','Bathroom 1','Bathroom 2','Hallway','Stairwell','Laundry Room','Utility Room','Closet','Pantry','Mudroom','Sunroom','Office/Den','Family Room','Nursery/Child Room','Basement','Basement - Finished','Basement - Unfinished','Attic','Crawl Space','Exterior - Side A','Exterior - Side B','Exterior - Side C','Exterior - Side D','Exterior','Porch','Garage','Shed/Outbuilding','Yard - Front','Yard - Back','Yard - Play Area','Driveway/Walkway','Fence/Gate'];
                  return hardcoded.indexOf(r) === -1;
                }).map(function(r) { return <option key={r} value={r}>{r}</option>; })}
              </optgroup>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Component</label>
            <select
              value={selectedComponent}
              onChange={function(e) { setSelectedComponent(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select Component --</option>
              {componentsForRoom.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
              <option value="Window">Window</option>
              <option value="Window Sash">Window Sash</option>
              <option value="Window Sill">Window Sill/Stool</option>
              <option value="Window Trough">Window Trough</option>
              <option value="Door">Door</option>
              <option value="Door Frame">Door Frame</option>
              <option value="Wall">Wall</option>
              <option value="Ceiling">Ceiling</option>
              <option value="Trim/Baseboard">Trim/Baseboard</option>
              <option value="Crown Molding">Crown Molding</option>
              <option value="Railing">Railing</option>
              <option value="Siding">Siding</option>
              <option value="Foundation">Foundation</option>
              <option value="Soffit/Fascia">Soffit/Fascia</option>
              <option value="Gutter/Downspout">Gutter/Downspout</option>
              <option value="Cabinet">Cabinet</option>
              <option value="Closet">Closet</option>
              <option value="General View">General View</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Side</label>
            <select
              value={selectedSide}
              onChange={function(e) { setSelectedSide(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">--</option>
              <option value="A">A (Street)</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Condition</label>
            <select
              value={selectedCondition}
              onChange={function(e) { setSelectedCondition(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {CONDITIONS.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Photo Category</label>
            <select
              value={selectedCategory}
              onChange={function(e) { setSelectedCategory(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {['Exterior', 'Interior', 'Condition', 'Hazards', 'Testing', 'EBL', 'Clearance', 'General'].map(function(group) {
                var groupCats = allCategories.filter(function(c) { return c.group === group; });
                if (groupCats.length === 0) return null;
                return (
                  <optgroup key={group} label={group}>
                    {groupCats.map(function(cat) {
                      return <option key={cat.id} value={cat.id}>{cat.label}{cat.required ? ' *' : ''}</option>;
                    })}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Caption</label>
            <input
              type="text"
              value={caption}
              onChange={function(e) { setCaption(e.target.value); }}
              placeholder="e.g. Peeling paint on window frame"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Compass Direction</label>
            <select
              value={selectedDirection}
              onChange={function(e) { setSelectedDirection(e.target.value); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select Direction --</option>
              <option value="N">N (North)</option>
              <option value="NE">NE (Northeast)</option>
              <option value="E">E (East)</option>
              <option value="SE">SE (Southeast)</option>
              <option value="S">S (South)</option>
              <option value="SW">SW (Southwest)</option>
              <option value="W">W (West)</option>
              <option value="NW">NW (Northwest)</option>
            </select>
          </div>
        </div>

        {/* Upload buttons */}
        <div className="flex gap-3 flex-wrap items-center">
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />

          <button
            onClick={function() { fileInputRef.current.click(); }}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span className="text-xl">{'\uD83D\uDCC1'}</span>
            Upload Files
          </button>

          <button
            onClick={function() { cameraInputRef.current.click(); }}
            className="px-5 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
          >
            <span className="text-xl">{'\uD83D\uDCF7'}</span>
            Take Photo
          </button>

          <span className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded</span>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Select room, component, and category before uploading to auto-label. Edit labels anytime after upload. JPG, PNG, HEIC supported.
        </p>
      </div>

      {/* ── GALLERY CONTROLS ── */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-600">Filter by Room:</label>
            <select
              value={filterRoom}
              onChange={function(e) { setFilterRoom(e.target.value); }}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="All">All Rooms ({photos.length})</option>
              {photoRoomList.map(function(r) {
                var count = photos.filter(function(p) { return p.room === r; }).length;
                return <option key={r} value={r}>{r} ({count})</option>;
              })}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={function() { setViewMode('gallery'); }}
              className={'px-3 py-1 rounded text-sm font-medium ' + (viewMode === 'gallery' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')}
            >Gallery</button>
            <button
              onClick={function() { setViewMode('list'); }}
              className={'px-3 py-1 rounded text-sm font-medium ' + (viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700')}
            >List</button>
          </div>
        </div>
      )}

      {/* ── PHOTO GALLERY (grouped by room) ── */}
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-5xl mb-4">{'\uD83D\uDCF7'}</div>
          <p className="text-gray-500 text-lg">No photos uploaded yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Upload inspection photos to include in Appendix D: Photo Log.
            Check the checklist above for required photo types.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {roomKeys.map(function(roomName) {
            var roomPhotos = photosByRoom[roomName];
            return (
              <div key={roomName} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-4 py-3 flex justify-between items-center">
                  <h4 className="font-semibold text-base">{roomName}</h4>
                  <span className="text-sm text-blue-200">{roomPhotos.length} photo{roomPhotos.length !== 1 ? 's' : ''}</span>
                </div>

                {viewMode === 'gallery' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                    {roomPhotos.map(function(photo) {
                      var isExpanded = expandedPhoto === photo.id;
                      var isEditing = editingPhoto === photo.id;

                      return (
                        <div key={photo.id} className="relative group">
                          <div
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-400 transition"
                            onClick={function() { setExpandedPhoto(isExpanded ? null : photo.id); }}
                          >
                            <img src={photo.dataUrl} alt={photo.caption || photo.component || 'Photo'} className="w-full h-full object-cover" />
                          </div>

                          <div className="mt-1 px-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {photo.component || 'No component'}{photo.side ? ' (Side ' + photo.side + ')' : ''}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{getCategoryLabel(photo.category)}</p>
                            {photo.caption && <p className="text-xs text-gray-400 truncate italic">{photo.caption}</p>}
                            {photo.condition && photo.condition !== 'N/A' && (
                              <span className={
                                'inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded font-medium ' +
                                (photo.condition === 'Deteriorated' ? 'bg-red-100 text-red-700' :
                                 photo.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-green-100 text-green-700')
                              }>{photo.condition}</span>
                            )}
                            {photo.compassDirection && (
                              <p className="text-xs text-gray-600 mt-0.5">Direction: {photo.compassDirection}</p>
                            )}
                            {/* GPS Badge */}
                            <div className="mt-1 flex items-center gap-1">
                              <span className={'w-2 h-2 rounded-full ' + (photo.latitude && photo.longitude ? 'bg-green-500' : 'bg-gray-300')}></span>
                              <span className="text-xs text-gray-500">
                                {photo.latitude && photo.longitude
                                  ? photo.latitude.toFixed(5) + ', ' + photo.longitude.toFixed(5)
                                  : 'No GPS'}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={function(e) { e.stopPropagation(); setEditingPhoto(isEditing ? null : photo.id); }}
                              className="bg-white bg-opacity-90 rounded p-1 text-xs hover:bg-blue-100" title="Edit labels"
                            >{'\u270F\uFE0F'}</button>
                            <button
                              onClick={function(e) { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                              className="bg-white bg-opacity-90 rounded p-1 text-xs hover:bg-red-100" title="Delete"
                            >{'\u274C'}</button>
                          </div>

                          {/* Expanded view */}
                          {isExpanded && (
                            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
                              onClick={function() { setExpandedPhoto(null); }}
                            >
                              <div className="max-w-4xl max-h-full" onClick={function(e) { e.stopPropagation(); }}>
                                <img src={photo.dataUrl} alt={photo.caption} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                                <div className="bg-white rounded-b-lg p-3 mt-1">
                                  <p className="font-semibold">{photo.room} - {photo.component}{photo.side ? ' (Side ' + photo.side + ')' : ''}</p>
                                  <p className="text-sm text-gray-600">{photo.caption || 'No caption'}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Category: {getCategoryLabel(photo.category)} | Condition: {photo.condition} | {photo.timestamp ? new Date(photo.timestamp).toLocaleString() : ''}
                                  </p>
                                  {photo.compassDirection && (
                                    <p className="text-xs text-gray-600 mt-1">Compass Direction: {photo.compassDirection}</p>
                                  )}
                                  {/* GPS Info */}
                                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                                    <span className={'w-2 h-2 rounded-full ' + (photo.latitude && photo.longitude ? 'bg-green-500' : 'bg-gray-300')}></span>
                                    <span className="text-xs text-gray-600">
                                      GPS: {photo.latitude && photo.longitude
                                        ? photo.latitude.toFixed(6) + ', ' + photo.longitude.toFixed(6)
                                        : 'Not captured'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Edit panel */}
                          {isEditing && (
                            <div className="absolute left-0 right-0 top-full z-40 bg-white border border-blue-300 rounded-lg shadow-lg p-3 mt-1"
                              onClick={function(e) { e.stopPropagation(); }}
                            >
                              <EditPhotoForm
                                photo={photo}
                                rooms={rooms}
                                xrfData={state.xrfData}
                                allCategories={allCategories}
                                onUpdate={handleUpdatePhoto}
                                onClose={function() { setEditingPhoto(null); }}
                                dispatch={dispatch}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {roomPhotos.map(function(photo) {
                      var isEditing = editingPhoto === photo.id;
                      return (
                        <div key={photo.id} className={'flex items-center gap-4 p-3 hover:bg-gray-50' + (isEditing ? ' flex-wrap' : '')}>
                          <img src={photo.dataUrl} alt={photo.caption} className="w-16 h-16 object-cover rounded cursor-pointer"
                            onClick={function() { setExpandedPhoto(photo.id); }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {photo.component || 'No component'}{photo.side ? ' (Side ' + photo.side + ')' : ''}
                            </p>
                            <p className="text-xs text-gray-500">{photo.caption || getCategoryLabel(photo.category)}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{getCategoryLabel(photo.category)}</span>
                              {photo.condition && photo.condition !== 'N/A' && (
                                <span className={
                                  'text-xs px-1.5 py-0.5 rounded ' +
                                  (photo.condition === 'Deteriorated' ? 'bg-red-100 text-red-700' :
                                   photo.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                   'bg-green-100 text-green-700')
                                }>{photo.condition}</span>
                              )}
                              {photo.timestamp && (
                                <span className="text-xs text-gray-400">{new Date(photo.timestamp).toLocaleString()}</span>
                              )}
                              {photo.compassDirection && (
                                <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Direction: {photo.compassDirection}</span>
                              )}
                              {/* GPS Badge */}
                              <span className={'text-xs px-1.5 py-0.5 rounded ' + (photo.latitude && photo.longitude ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500')}>
                                <span className={'w-1.5 h-1.5 inline-block rounded-full mr-1 ' + (photo.latitude && photo.longitude ? 'bg-green-500' : 'bg-gray-300')}></span>
                                {photo.latitude && photo.longitude
                                  ? photo.latitude.toFixed(5) + ', ' + photo.longitude.toFixed(5)
                                  : 'No GPS'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={function() { setEditingPhoto(isEditing ? null : photo.id); }}
                              className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 text-gray-700">Edit</button>
                            <button onClick={function() { handleDeletePhoto(photo.id); }}
                              className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-red-100 text-red-600">Delete</button>
                          </div>
                          {isEditing && (
                            <div className="w-full mt-2 p-3 bg-gray-50 rounded border">
                              <EditPhotoForm photo={photo} rooms={rooms} xrfData={state.xrfData}
                                allCategories={allCategories} onUpdate={handleUpdatePhoto}
                                onClose={function() { setEditingPhoto(null); }}
                                dispatch={dispatch}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── REPORT INFO ── */}
      {photos.length > 0 && (
        <div className={'border rounded-lg p-4 ' + (completedRequired === totalRequired ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200')}>
          <p className={'text-sm ' + (completedRequired === totalRequired ? 'text-green-800' : 'text-yellow-800')}>
            <strong>{photos.length} photo{photos.length !== 1 ? 's' : ''}</strong> will appear in <strong>Appendix D: Photo Log</strong>.
            {completedRequired < totalRequired && (
              <span> <strong>{totalRequired - completedRequired} required photo type{totalRequired - completedRequired !== 1 ? 's' : ''} still missing</strong> — check the checklist above.</span>
            )}
            {completedRequired === totalRequired && (
              <span> All required photo types are captured.</span>
            )}
          </p>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <DeletePhotoModal
          photo={deleteTarget}
          onConfirm={confirmDeletePhoto}
          onCancel={function() { setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// EDIT FORM SUB-COMPONENT
// ============================================================================
function EditPhotoForm({ photo, rooms, xrfData, allCategories, onUpdate, onClose, dispatch }) {
  var [room, setRoom] = useState(photo.room || '');
  var [component, setComponent] = useState(photo.component || '');
  var [side, setSide] = useState(photo.side || '');
  var [condition, setCondition] = useState(photo.condition || 'N/A');
  var [category, setCategory] = useState(photo.category || 'interior_room');
  var [editCaption, setEditCaption] = useState(photo.caption || '');
  var [editDirection, setEditDirection] = useState(photo.compassDirection || '');
  var [isTaggingGPS, setIsTaggingGPS] = useState(false);

  var componentsForRoom = room ? getComponentsForRoom(xrfData, room) : [];

  var CONDITIONS = ['Intact', 'Fair', 'Deteriorated', 'N/A'];

  function handleSave() {
    onUpdate(photo.id, { room: room, component: component, side: side, condition: condition, category: category, caption: editCaption, compassDirection: editDirection });
    onClose();
  }

  function handleTagGPS() {
    setIsTaggingGPS(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      setIsTaggingGPS(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        // Dispatch via the generic UPDATE_PHOTO action — the reducer already
        // handles arbitrary patches on a photo's updates. The previous code
        // dispatched UPDATE_PHOTO_GPS which has no reducer handler, so the
        // GPS pin was silently dropped on the floor. (Verified against the
        // initialState.js reducer on 2026-04-20.)
        dispatch({
          type: 'UPDATE_PHOTO',
          payload: {
            id: photo.id,
            updates: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              gpsTaggedAt: new Date().toISOString(),
            }
          }
        });
        setIsTaggingGPS(false);
        alert('GPS location captured: ' + pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6));
      },
      function() {
        setIsTaggingGPS(false);
        alert('Unable to retrieve GPS location. Please check permissions.');
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500">Room</label>
          <select value={room} onChange={function(e) { setRoom(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">--</option>
            <optgroup label="Interior Rooms">
              <option value="Kitchen">Kitchen</option>
              <option value="Living Room">Living Room</option>
              <option value="Dining Room">Dining Room</option>
              <option value="Master Bedroom">Master Bedroom</option>
              <option value="Bedroom 2">Bedroom 2</option>
              <option value="Bedroom 3">Bedroom 3</option>
              <option value="Bedroom 4">Bedroom 4</option>
              <option value="Bathroom 1">Bathroom 1</option>
              <option value="Bathroom 2">Bathroom 2</option>
              <option value="Hallway">Hallway</option>
              <option value="Stairwell">Stairwell</option>
              <option value="Laundry Room">Laundry Room</option>
              <option value="Utility Room">Utility Room</option>
              <option value="Closet">Closet</option>
              <option value="Office/Den">Office/Den</option>
              <option value="Family Room">Family Room</option>
              <option value="Nursery/Child Room">Nursery/Child Room</option>
            </optgroup>
            <optgroup label="Basement / Attic">
              <option value="Basement">Basement</option>
              <option value="Basement - Finished">Basement - Finished</option>
              <option value="Basement - Unfinished">Basement - Unfinished</option>
              <option value="Attic">Attic</option>
              <option value="Crawl Space">Crawl Space</option>
            </optgroup>
            <optgroup label="Exterior">
              <option value="Exterior - Side A">Exterior - Side A (Street)</option>
              <option value="Exterior - Side B">Exterior - Side B</option>
              <option value="Exterior - Side C">Exterior - Side C</option>
              <option value="Exterior - Side D">Exterior - Side D</option>
              <option value="Exterior">Exterior - General</option>
            </optgroup>
            <optgroup label="Outdoor / Other">
              <option value="Porch">Porch/Deck</option>
              <option value="Garage">Garage</option>
              <option value="Shed/Outbuilding">Shed/Outbuilding</option>
              <option value="Yard - Front">Yard - Front</option>
              <option value="Yard - Back">Yard - Back</option>
              <option value="Yard - Play Area">Yard - Play Area</option>
              <option value="Fence/Gate">Fence/Gate</option>
            </optgroup>
            {rooms.length > 0 && <optgroup label="From XRF Data">
              {rooms.map(function(r) { return <option key={r} value={r}>{r}</option>; })}
            </optgroup>}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Component</label>
          <select value={component} onChange={function(e) { setComponent(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">--</option>
            {componentsForRoom.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
            <option value="Window">Window</option>
            <option value="Window Sash">Window Sash</option>
            <option value="Window Sill">Window Sill/Stool</option>
            <option value="Window Trough">Window Trough</option>
            <option value="Door">Door</option>
            <option value="Door Frame">Door Frame</option>
            <option value="Wall">Wall</option>
            <option value="Ceiling">Ceiling</option>
            <option value="Trim/Baseboard">Trim/Baseboard</option>
            <option value="Crown Molding">Crown Molding</option>
            <option value="Railing">Railing</option>
            <option value="Siding">Siding</option>
            <option value="Foundation">Foundation</option>
            <option value="Soffit/Fascia">Soffit/Fascia</option>
            <option value="Gutter/Downspout">Gutter/Downspout</option>
            <option value="Cabinet">Cabinet</option>
            <option value="Closet">Closet</option>
            <option value="General View">General View</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Side</label>
          <select value={side} onChange={function(e) { setSide(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">--</option>
            <option value="A">A (Street)</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Condition</label>
          <select value={condition} onChange={function(e) { setCondition(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
            {CONDITIONS.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Compass Direction</label>
          <select value={editDirection} onChange={function(e) { setEditDirection(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">-- None --</option>
            <option value="N">N (North)</option>
            <option value="NE">NE (Northeast)</option>
            <option value="E">E (East)</option>
            <option value="SE">SE (Southeast)</option>
            <option value="S">S (South)</option>
            <option value="SW">SW (Southwest)</option>
            <option value="W">W (West)</option>
            <option value="NW">NW (Northwest)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500">Category</label>
        <select value={category} onChange={function(e) { setCategory(e.target.value); }} className="w-full border rounded px-2 py-1 text-sm">
          {['Exterior', 'Interior', 'Condition', 'Hazards', 'Testing', 'EBL', 'Clearance', 'General'].map(function(group) {
            var groupCats = allCategories.filter(function(c) { return c.group === group; });
            if (groupCats.length === 0) return null;
            return (
              <optgroup key={group} label={group}>
                {groupCats.map(function(cat) {
                  return <option key={cat.id} value={cat.id}>{cat.label}{cat.required ? ' *' : ''}</option>;
                })}
              </optgroup>
            );
          })}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500">Caption</label>
        <input type="text" value={editCaption} onChange={function(e) { setEditCaption(e.target.value); }}
          className="w-full border rounded px-2 py-1 text-sm" placeholder="Describe what this photo shows..."
        />
      </div>
      {/* GPS Section */}
      <div className="border-t pt-2 mt-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-600">GPS Coordinates</label>
          <span className={'text-xs px-2 py-0.5 rounded ' + (photo.latitude && photo.longitude ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
            <span className={'w-1.5 h-1.5 inline-block rounded-full mr-1 ' + (photo.latitude && photo.longitude ? 'bg-green-500' : 'bg-gray-400')}></span>
            {photo.latitude && photo.longitude
              ? photo.latitude.toFixed(5) + ', ' + photo.longitude.toFixed(5)
              : 'No GPS'}
          </span>
        </div>
        {(!photo.latitude || !photo.longitude) && (
          <button
            onClick={handleTagGPS}
            disabled={isTaggingGPS}
            className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 font-medium disabled:bg-gray-400"
          >
            {isTaggingGPS ? 'Requesting location...' : 'Tag GPS Location'}
          </button>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Save</button>
        <button onClick={onClose} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// DELETE PHOTO MODAL — replaces window.confirm()
// Photos are documentary evidence for the inspection. 24 CFR 35.915 and
// Michigan R 325.99207 both require inspection records (including supporting
// photographs) to be retained 3 years. A stray click on a small trashcan
// should not irreversibly discard evidence, so this modal shows:
//   1. The photo thumbnail + caption so the inspector verifies intent
//   2. An explicit "Delete permanently" button with red framing
//   3. The retention rule so the inspector pauses if the photo predates a
//      finalized report (where the original is preserved in the signed PDF)
// ============================================================================
function DeletePhotoModal({ photo, onConfirm, onCancel }) {
  if (!photo) return null;
  var catLabel = photo.category || 'uncategorized';
  var when = photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'unknown time';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-5"
        onClick={function(e) { e.stopPropagation(); }}
      >
        <h3 className="text-lg font-bold text-red-700 mb-3">Delete this photo?</h3>

        <div className="flex gap-3 mb-3">
          <img
            src={photo.dataUrl}
            alt={photo.caption || 'Photo to delete'}
            className="w-24 h-24 object-cover rounded border border-gray-300 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold text-gray-800 truncate">
              {photo.room || 'Unassigned'}
              {photo.component ? ' — ' + photo.component : ''}
              {photo.side ? ' (Side ' + photo.side + ')' : ''}
            </p>
            <p className="text-gray-600 truncate">{catLabel}</p>
            {photo.caption && (
              <p className="text-xs text-gray-500 italic truncate">{photo.caption}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Captured {when}</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 text-xs text-red-800 leading-relaxed">
          <strong>This cannot be undone.</strong> Inspection records (including
          photo documentation) must be retained for 3 years under
          <strong> 24 CFR 35.915</strong> and <strong>Michigan R 325.99207</strong>.
          If this photo has already been included in a signed report, the PDF
          retains the copy — but the live project state will no longer show it.
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhotoUploadTab;
