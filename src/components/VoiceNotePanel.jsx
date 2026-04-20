import { useState, useRef, useEffect } from 'react';

export default function VoiceNotePanel({ state, dispatch, tabName = 'General' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const recognitionRef = useRef(null);

  const notes = (state.voiceNotes && Array.isArray(state.voiceNotes)) ? state.voiceNotes : [];

  useEffect(() => {
    // Initialize speech recognition with browser compatibility
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      setLiveTranscript('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (interim || final) {
        setLiveTranscript((prev) => {
          const combined = prev + final;
          return combined.trim();
        });
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech detected.');
      } else if (event.error === 'network') {
        setError('Network error. Check your connection.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied');
      } else if (event.error === 'service-not-allowed') {
        setError('Voice input not supported');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported');
      return;
    }

    try {
      setLiveTranscript('');
      setError(null);
      recognitionRef.current.start();
    } catch (e) {
      // Already recording or other error
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();

      // Create note entry after transcription is complete
      if (liveTranscript.trim()) {
        const note = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          transcript: liveTranscript.trim(),
          tab: tabName,
          fieldContext: undefined,
        };

        dispatch({
          type: 'ADD_VOICE_NOTE',
          payload: note,
        });

        setLiveTranscript('');
      }
    }
  };

  const handleDeleteNote = (id) => {
    dispatch({
      type: 'DELETE_VOICE_NOTE',
      payload: id,
    });
  };

  const handleClearTranscript = () => {
    setLiveTranscript('');
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
        <div className="text-sm text-gray-600">
          Voice input is not supported in this browser.
        </div>
      </div>
    );
  }

  const filteredNotes = notes.filter((note) => note.tab === tabName);

  return (
    <div className="rounded-lg border-2 border-blue-600 bg-blue-50">
      {/* Header / Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 8c3.314 0 6 1.343 6 3v2H4v-2c0-1.657 2.686-3 6-3z" />
          </svg>
          <h3 className="font-semibold text-blue-900">Voice Notes</h3>
          {filteredNotes.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
              {filteredNotes.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t-2 border-blue-600 px-4 py-4 space-y-4">
          {/* Recording Section */}
          <div className="space-y-3 pb-4 border-b-2 border-blue-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 8c3.314 0 6 1.343 6 3v2H4v-2c0-1.657 2.686-3 6-3z" />
                </svg>
                {isRecording ? 'Stop Recording' : 'Start Recording Note'}
              </button>
            </div>

            {isRecording && (
              <button
                type="button"
                onClick={handleClearTranscript}
                className="w-full px-3 py-1.5 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
              >
                Clear
              </button>
            )}

            {liveTranscript && (
              <div className="bg-white border-2 border-blue-300 rounded-lg p-3">
                <p className="text-sm text-gray-800">{liveTranscript}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="space-y-2">
            {filteredNotes.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No voice notes yet for this tab.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border-l-4 border-blue-600 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 mb-1">
                          {note.timestamp}
                        </div>
                        <p className="text-sm text-gray-800 break-words">
                          {note.transcript.length > 120
                            ? `${note.transcript.substring(0, 120)}...`
                            : note.transcript}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete note"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
