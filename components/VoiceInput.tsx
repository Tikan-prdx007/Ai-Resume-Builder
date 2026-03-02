'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';

// Extend window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// Global voice input context
let globalVoiceModal: {
  show: boolean;
  fieldLabel: string;
  onTranscription: (text: string) => void;
  language: string;
} = {
  show: false,
  fieldLabel: '',
  onTranscription: () => {},
  language: 'en-US'
};

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  language: string;
  placeholder?: string;
  className?: string;
  fieldLabel?: string;
}

export default function VoiceInput({ onTranscription, language, placeholder = "Click to speak", className = "", fieldLabel = "" }: VoiceInputProps) {
   const [isRecording, setIsRecording] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [showModal, setShowModal] = useState(false);
   const [transcribedText, setTranscribedText] = useState('');
   const [interimText, setInterimText] = useState('');
   const [retryCount, setRetryCount] = useState(0);
   const recognitionRef = useRef<SpeechRecognition | null>(null);
   const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = (isRetry: boolean = false) => {
    try {
      // Check if Web Speech API is supported
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech recognition is not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsRecording(true);
        setShowModal(true);
        if (!isRetry) {
          setTranscribedText('');
          setInterimText('');
          setRetryCount(0);
        }
        // Add network timeout handling
        setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            console.warn('Speech recognition timeout - stopping due to potential network issues');
            recognitionRef.current.stop();
          }
        }, 30000); // 30 second timeout
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscribedText(prev => prev + finalTranscript);
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);

        if (event.error === 'network' && retryCount < 3) {
          // Automatic retry for network errors with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 seconds
          console.log(`Network error detected. Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
          setRetryCount(prev => prev + 1);

          retryTimeoutRef.current = setTimeout(() => {
            startRecording(true);
          }, delay);
        } else {
          // Don't close modal on "aborted" or "no-speech" errors - let user retry
          if (event.error === 'network') {
            // After max retries, show user-friendly message
            alert('Network error occurred. Please check your internet connection and try again.');
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setShowModal(false);
            alert('Speech recognition error: ' + event.error);
          }
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };

      setIsProcessing(true);
      recognition.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied or not available');
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const confirmTranscription = () => {
    if (transcribedText.trim()) {
      onTranscription(transcribedText.trim());
    }
    setShowModal(false);
    setTranscribedText('');
    setInterimText('');
  };

  const retryRecording = () => {
    setTranscribedText('');
    setInterimText('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTimeout(() => startRecording(), 100);
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setShowModal(false);
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    setInterimText('');
    setRetryCount(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update global modal when component mounts or props change
  useEffect(() => {
    globalVoiceModal.fieldLabel = fieldLabel;
    globalVoiceModal.onTranscription = onTranscription;
    globalVoiceModal.language = language;
  }, [fieldLabel, onTranscription, language]);

  return (
    <div className="relative">
      <button
        onClick={() => startRecording()}
        disabled={isProcessing}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          isRecording
            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-lg'
            : isProcessing
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
        } ${className}`}
        aria-label={isRecording ? "Stop recording" : isProcessing ? "Processing speech" : "Start voice input"}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : isRecording ? (
          <>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            Listening...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {placeholder}
          </>
        )}
      </button>

      {/* Voice Input Modal */}
      <Dialog open={showModal} onClose={cancelRecording} className="relative z-10">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                    <svg className="size-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-base font-semibold text-gray-900">
                      Voice Input
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {fieldLabel && `Field: ${fieldLabel}`}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center justify-center mb-3">
                        <button
                          onClick={isRecording ? stopRecording : () => startRecording()}
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                            isRecording
                              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg scale-110'
                              : 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:scale-105'
                          }`}
                          aria-label={isRecording ? "Stop recording" : "Start recording"}
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isRecording ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            )}
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-center mb-3">
                        {isRecording && (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        {isRecording ? '🎤 Listening... Speak clearly into your microphone.' : '⏸️ Paused - Click the button to continue.'}
                      </p>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 min-h-24 border border-gray-200 shadow-inner">
                        <div className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed min-h-20 font-medium">
                          {transcribedText}
                          <span className="text-blue-600 italic animate-pulse font-normal">{interimText}</span>
                          {transcribedText === '' && interimText === '' && (
                            <div className="text-center py-6">
                              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                              <span className="text-gray-400 italic text-sm">Your speech will appear here...</span>
                            </div>
                          )}
                        </div>
                        {isRecording && (
                          <div className="mt-3 text-center">
                            <div className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                              Live Transcription Active
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={confirmTranscription}
                  disabled={!transcribedText.trim()}
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={retryRecording}
                  disabled={!transcribedText.trim()}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// Global Voice Modal Component
export function GlobalVoiceModal() {
   const [isRecording, setIsRecording] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [transcribedText, setTranscribedText] = useState('');
   const [interimText, setInterimText] = useState('');
   const [retryCount, setRetryCount] = useState(0);
   const recognitionRef = useRef<SpeechRecognition | null>(null);
   const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = (isRetry: boolean = false) => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech recognition is not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = globalVoiceModal.language;

      recognition.onstart = () => {
        setIsRecording(true);
        if (!isRetry) {
          setTranscribedText('');
          setInterimText('');
          setRetryCount(0);
        }
        // Add network timeout handling
        setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            console.warn('Speech recognition timeout - stopping due to potential network issues');
            recognitionRef.current.stop();
          }
        }, 30000); // 30 second timeout
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscribedText(prev => prev + finalTranscript);
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);

        if (event.error === 'network' && retryCount < 3) {
          // Automatic retry for network errors with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 seconds
          console.log(`Network error detected. Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
          setRetryCount(prev => prev + 1);

          retryTimeoutRef.current = setTimeout(() => {
            startRecording(true);
          }, delay);
        } else {
          globalVoiceModal.show = false;
          if (event.error === 'network') {
            // After max retries, show user-friendly message
            alert('Network error occurred. Please check your internet connection and try again.');
          } else if (event.error !== 'no-speech') {
            alert('Speech recognition error: ' + event.error);
          }
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };

      setIsProcessing(true);
      recognition.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied or not available');
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const confirmTranscription = () => {
    if (transcribedText.trim()) {
      globalVoiceModal.onTranscription(transcribedText.trim());
    }
    globalVoiceModal.show = false;
    setTranscribedText('');
    setInterimText('');
  };

  const retryRecording = () => {
    setTranscribedText('');
    setInterimText('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTimeout(() => startRecording(), 100);
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    globalVoiceModal.show = false;
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    setInterimText('');
    setRetryCount(0);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!globalVoiceModal.show) return null;

  return (
    <Dialog open={globalVoiceModal.show} onClose={cancelRecording} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                  <svg className="size-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-base font-semibold text-gray-900">
                    Voice Input
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {globalVoiceModal.fieldLabel && `Field: ${globalVoiceModal.fieldLabel}`}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-center mb-3">
                      <button
                        onClick={isRecording ? stopRecording : () => startRecording()}
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg scale-110'
                            : 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:scale-105'
                        }`}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isRecording ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          )}
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-center mb-3">
                      {isRecording && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {isRecording ? '🎤 Listening... Speak clearly into your microphone.' : '⏸️ Paused - Click the button to continue.'}
                    </p>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 min-h-24 border border-gray-200 shadow-inner">
                      <div className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed min-h-20 font-medium">
                        {transcribedText}
                        <span className="text-blue-600 italic animate-pulse font-normal">{interimText}</span>
                        {transcribedText === '' && interimText === '' && (
                          <div className="text-center py-6">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="text-gray-400 italic text-sm">Your speech will appear here...</span>
                          </div>
                        )}
                      </div>
                      {isRecording && (
                        <div className="mt-3 text-center">
                          <div className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                            Live Transcription Active
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={confirmTranscription}
                disabled={!transcribedText.trim()}
                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={retryRecording}
                disabled={!transcribedText.trim()}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={cancelRecording}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}