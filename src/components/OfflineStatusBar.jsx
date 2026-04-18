import React, { useState, useEffect } from 'react';
import {
  saveInspection,
  loadInspection,
  listInspections,
  getPendingSync,
  clearPendingSync,
  isOnline
} from '../utils/offlineStorage';

function OfflineStatusBar({ currentInspectionId, currentState, onLoadInspection }) {
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [savedInspections, setSavedInspections] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineStatus(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    getPendingSync()
      .then((items) => {
        setPendingSyncCount(items.length);
      })
      .catch((error) => {
        console.error('Failed to get pending sync count:', error);
      });
  }, []);

  useEffect(() => {
    loadSavedInspections();
  }, []);

  function loadSavedInspections() {
    listInspections()
      .then((inspections) => {
        setSavedInspections(inspections);
      })
      .catch((error) => {
        console.error('Failed to load saved inspections:', error);
      });
  }

  function handleSaveOffline() {
    if (!currentInspectionId || !currentState) {
      alert('No inspection state to save');
      return;
    }

    saveInspection(currentInspectionId, currentState)
      .then(() => {
        alert('Inspection saved offline');
        loadSavedInspections();
      })
      .catch((error) => {
        console.error('Failed to save inspection:', error);
        alert('Failed to save inspection offline');
      });
  }

  function handleLoadInspection(inspectionId) {
    loadInspection(inspectionId)
      .then((inspection) => {
        if (inspection) {
          onLoadInspection(inspection.stateData);
          setShowDropdown(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load inspection:', error);
        alert('Failed to load inspection');
      });
  }

  function triggerSync() {
    setIsSyncing(true);
    getPendingSync()
      .then((items) => {
        if (items.length === 0) {
          setIsSyncing(false);
          return;
        }

        return new Promise((resolve) => {
          setTimeout(() => {
            clearPendingSync()
              .then(() => {
                setPendingSyncCount(0);
                setIsSyncing(false);
                resolve();
              })
              .catch((error) => {
                console.error('Failed to clear pending sync:', error);
                setIsSyncing(false);
                resolve();
              });
          }, 1500);
        });
      })
      .catch((error) => {
        console.error('Failed during sync:', error);
        setIsSyncing(false);
      });
  }

  const statusDotColor = isOnlineStatus ? 'bg-green-500' : 'bg-red-500';
  const statusText = isOnlineStatus
    ? isSyncing
      ? 'Back Online — syncing...'
      : 'Online'
    : 'Working Offline — changes saved locally';

  return (
    <div className="w-full bg-blue-900 text-white px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusDotColor}`}></div>
          <span className="text-sm font-medium">{statusText}</span>
          {pendingSyncCount > 0 && (
            <span className="text-xs bg-blue-800 px-2 py-1 rounded">
              {pendingSyncCount} pending
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOffline}
            className="text-xs bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded transition-colors"
            title="Save current inspection state offline"
          >
            Save Offline
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-xs bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded transition-colors"
            >
              Load Offline ({savedInspections.length})
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-white text-gray-900 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                {savedInspections.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No saved inspections</div>
                ) : (
                  savedInspections.map((inspection) => (
                    <button
                      key={inspection.id}
                      onClick={() => handleLoadInspection(inspection.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors text-xs"
                    >
                      <div className="font-medium text-gray-900">
                        {inspection.propertyAddress}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(inspection.lastSaved).toLocaleDateString()}{' '}
                        {new Date(inspection.lastSaved).toLocaleTimeString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfflineStatusBar;
