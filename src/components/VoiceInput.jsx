import { useState, useRef, useEffect } from 'react';

export function VoiceInput({
  onResult,
  fieldName = 'Field',
  continuous = false,
  language = 'en-US',
}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition with browser compatibility
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.language = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimTranscript('');
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

      setInterimTranscript(interim);

      if (final) {
        onResult(final.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
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
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language, onResult]);

  const handleStartListening = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already listening or other error
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  if (!isSupported) {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          disabled
          className="p-2 rounded-lg bg-gray-200 text-gray-400 cursor-not-allowed"
          title="Voice input not supported in this browser"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 8c3.314 0 6 1.343 6 3v2H4v-2c0-1.657 2.686-3 6-3z" />
          </svg>
        </button>
        <span className="text-xs text-gray-500">Not supported</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isListening ? handleStopListening : handleStartListening}
          className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
            isListening
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
          title={isListening ? 'Stop listening' : `Voice input for ${fieldName}`}
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 8c3.314 0 6 1.343 6 3v2H4v-2c0-1.657 2.686-3 6-3z" />
          </svg>
        </button>

        {isListening && (
          <span className="text-sm font-medium text-red-600">Listening...</span>
        )}
      </div>

      {interimTranscript && (
        <div className="text-sm text-gray-600 italic bg-blue-50 p-2 rounded border-l-2 border-blue-600">
          {interimTranscript}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

export function VoiceTextArea({
  value = '',
  onChange,
  placeholder = 'Enter text or use voice input...',
  rows = 4,
  label,
  fieldName = 'field',
}) {
  const handleVoiceResult = (text) => {
    const newValue = value ? `${value} ${text}` : text;
    onChange({ target: { value: newValue } });
  };

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-0 resize-none text-gray-800"
        />

        <div className="flex-shrink-0 pt-2">
          <VoiceInput
            onResult={handleVoiceResult}
            fieldName={fieldName}
            continuous={false}
            language="en-US"
          />
        </div>
      </div>
    </div>
  );
}
