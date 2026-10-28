import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { postChat } from '../api/client';

interface HomeScreenProps {
  onNavigate: (path: string) => void;
  showToast: (msg: string) => void;
  isSessionActive?: boolean;
  sessionSeconds?: number;
  sessionStatus?: 'active' | 'warning' | 'expired';
  formatSessionTime?: (totalSeconds: number) => string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text?: string;
  time: string;
  isAssessment?: boolean;
  type?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  showToast,
  isSessionActive = true,
  sessionSeconds = 600,
  sessionStatus = 'active',
  formatSessionTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [inputQuery, setInputQuery] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // Language-selection tracking: set once the farmer has chosen a language
  const [languageSelected, setLanguageSelected] = useState(false);

  // Camera-assisted session state: active state and person detection state
  // Ready to receive real camera/detection events from FastAPI/backend in VS Code:
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [personDetectionState, setPersonDetectionState] = useState<'detected' | 'not_detected'>('detected');

  // Speaking-state variable: active when farmer is speaking (isRecording) or AI assistant is speaking (isPlayingAudio)
  // Ready to connect to real audio/VAD events in VS Code:
  const isSpeaking = isPlayingAudio || isRecording;
  const activeSpeaker: 'farmer' | 'ai' | null = isRecording ? 'farmer' : isPlayingAudio ? 'ai' : null;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionStartedRef = useRef(false);

  // Live spoken text & dialogue chart state (visualizes Person answer and AI answer while speaking)
  const [liveSpokenText, setLiveSpokenText] = useState<string>('');
  const [showDialogueChart, setShowDialogueChart] = useState<boolean>(true);
  const [latestPersonQuery, setLatestPersonQuery] = useState<string>('');
  const [latestAiAnswer, setLatestAiAnswer] = useState<string>('');

  // Regional language voice tags for Web Speech API
  const langCodes: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
  };

  // Automatic spoken welcome messages across 9 regional languages
  const welcomeMessageByLang: Record<string, string> = {
    en: 'Welcome to Krishi Sahayak. I am your agronomy assistant. Please speak your crop or farming question.',
    te: 'కృషి సహాయక్ కు స్వాగతం. నేను మీ వ్యవసాయ సహాయకుడిని. దయచేసి మీ పంట లేదా వ్యవసాయ ప్రశ్నను మాట్లాడండి.',
    hi: 'कृषि सहायक में आपका स्वागत है। मैं आपका कृषि सहायक हूँ। कृपया अपनी फसल या खेती से संबंधित प्रश्न बोलें।',
    ta: 'கிருஷி சகாயக்கிற்கு வரவேற்கிறோம். நான் உங்கள் விவசாய உதவியாளர். உங்கள் பயிர் அல்லது விவசாயக் கேள்வியைப் பேசுங்கள்.',
    kn: 'ಕೃಷಿ ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬೆಳೆ ಅಥವಾ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಮಾತನಾಡಿ.',
    mr: 'कृषी सहाय्यकमध्ये आपले स्वागत आहे. मी तुमचा कृषी सल्लागार आहे. कृपया आपला पिकाचा प्रश्न बोला.',
    bn: 'কৃষি সহায়কে স্বাগতম। আমি আপনার কৃষি সহকারী। দয়া করে আপনার ফসল বা কৃষি সম্পর্কিত প্রশ্ন বলুন।',
    gu: 'કૃષિ સહાયકમાં આપનું સ્વાગત છે. હું તમારો કૃષિ સહાયક છું. કૃપા કરીને તમારો પાક અથવા ખેતીનો પ્રશ્ન બોલો.',
    pa: 'ਕ੍ਰਿਸ਼ੀ ਸਹਾਇਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਮੈਂ ਤੁਹਾਡਾ ਖੇਤੀ ਸਹਾਇਕ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਫ਼ਸਲ ਜਾਂ ਖੇਤੀ ਬਾਰੇ ਸਵਾਲ ਬੋਲੋ।',
  };

  // Regional agronomic spoken responses across 9 Indian languages
  const assistantAdvisoryResponsesByLang: Record<string, string> = {
    en: 'For wheat rust and damp soil conditions, ensure furrow drainage immediately. Apply Propiconazole 25% EC at 1ml per liter during clear weather intervals.',
    te: 'గోధుమ కాండం తుప్పు తెగులు మరియు అధిక తేమ నివారణకు వెంటనే పొలంలో నీటి పారుదల కాలువలు తెరవండి. ఎండ వచ్చినప్పుడు లీటరు నీటికి 1 మి.లీ ప్రొపికొనజోల్ 25% ఈసీ పిచికారీ చేయండి.',
    hi: 'गेहूं में रतुआ और अत्यधिक नमी से बचाव के लिए खेतों से जल निकासी तुरंत करें। मौसम साफ होने पर प्रोपिकोनाजोल 25% ईसी 1 मिली प्रति लीटर की दर से छिड़काव करें।',
    ta: 'கோதுமை துரு நோய் மற்றும் அதிக ஈரப்பதத்தைத் தவிர்க்க வயலில் வடிகால் வசதி செய்யுங்கள். தெளிவான வானிலையில் 1 லிட்டர் தண்ணீருக்கு 1 மி.லி புரோபிகோனசோல் தெளிக்கவும்.',
    kn: 'ಗೋಧಿ ತುಕ್ಕು ರೋಗ ಮತ್ತು ತೇವಾಂಶ ನಿಯಂತ್ರಣಕ್ಕೆ ತಕ್ಷಣ ಹೊಲದಿಂದ ನೀರು ಹೊರಹಾಕಿ. ಬಿಸಿಲು ಬಂದಾಗ ಪ್ರತಿ ಲೀಟರ್ ನೀರಿಗೆ 1 ಮಿ.ಲೀ ಪ್ರೊಪಿಕೊನಜೋಲ್ ಸಿಂಪಡಿಸಿ.',
    mr: 'गव्हावरील तांबेरा आणि जास्त ओलावा नियंत्रणासाठी शेतातून पाण्याचा निचरा करा. हवामान स्वच्छ झाल्यावर प्रति लिटर पाण्यात १ मिली प्रोपिकोनाझोल फवारा.',
    bn: 'গমের মরিচা রোগ ও অতিরিক্ত আর্দ্রতা রোধে অবিলম্বে জমি থেকে জল নিষ্কাশন করুন। আবহাওয়া পরিষ্কার হলে প্রতি লিটার জলে ১ মিলি প্রপিকোনাজোল স্প্রে করুন।',
    gu: 'ઘઉંમાં ગેરુ રોગ અને વધુ ભેજથી બચવા માટે ખેતરમાંથી પાણીનો નિકાલ કરો. વાતાવરણ ચોખ્ખું થાય ત્યારે લીટર દીઠ ૧ મિલી પ્રોપીકોનાઝોલ છાંટો.',
    pa: 'ਕਣਕ ਦੀ ਕੁੰਗੀ ਅਤੇ ਵਾਧੂ ਨਮੀ ਤੋਂ ਬਚਾਅ ਲਈ ਖੇਤ ਵਿੱਚੋਂ ਪਾਣੀ ਤੁਰੰਤ ਕੱਢੋ। ਮੌਸਮ ਸਾਫ਼ ਹੋਣ ਤੇ 1 ਮਿਲੀ ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ ਪ੍ਰਤੀ ਲੀਟਰ ਪਾਣੀ ਵਿੱਚ ਛਿੜਕੋ।',
  };

  // Dynamic user and assistant initial message according to selected language
  const userQueryByLang: Record<string, string> = {
    en: 'How do I protect Rabi wheat from sudden unseasonal rainfall and stem rust?',
    te: 'రబీ గోధుమను అకాల వర్షాలు మరియు కాండం తుప్పు తెగులు నుండి ఎలా కాపాడాలి?',
    hi: 'रबी गेहूं को बेमौसम बारिश और तना रतुआ रोग से कैसे बचाएं?',
    ta: 'ரபி கோதுமையை திடீர் மழை மற்றும் தண்டு துரு நோயிலிருந்து எவ்வாறு பாதுகாப்பது?',
    kn: 'ರಬಿ ಗೋಧಿಯನ್ನು ಅಕಾಲಿಕ ಮಳೆ ಮತ್ತು ಕಾಂಡದ ತುಕ್ಕು ರೋಗದಿಂದ ಹೇಗೆ ರಕ್ಷಿಸುವುದು?',
    mr: 'रब्बी गव्हाचे अवकाळी पाऊस आणि तांबेरा रोगापासून संरक्षण कसे करावे?',
    bn: 'রবি গমকে অসময়ের বৃষ্টি এবং কাণ্ড মরিচা রোগ থেকে কীভাবে রক্ষা করব?',
    gu: 'રવિ ઘઉંને કમોસમી વરસાદ અને ગેરુ રોગથી કેવી રીતે બચાવવા?',
    pa: 'ਹਾੜੀ ਦੀ ਕਣਕ ਨੂੰ ਬੇਮੌਸਮੀ ਬਾਰਸ਼ ਅਤੇ ਪੀਲੀ ਕੁੰਗੀ ਤੋਂ ਕਿਵੇਂ ਬਚਾਇਆ ਜਾਵੇ?',
  };

  const telemetryLabelsByLang: Record<string, {
    humidity: string;
    humidityAlert: string;
    soil: string;
    soilAlert: string;
    rust: string;
    rustAlert: string;
  }> = {
    en: {
      humidity: 'Air Humidity',
      humidityAlert: 'Alert: Elevated risk',
      soil: 'Soil Moisture',
      soilAlert: 'Waterlogged furrows',
      rust: 'Rust Risk Index',
      rustAlert: 'Drainage priority',
    },
    te: {
      humidity: 'గాలి తేమ',
      humidityAlert: 'హెచ్చరిక: అధిక ముప్పు',
      soil: 'నేల తేమ',
      soilAlert: 'నీరు నిలిచిన కాలువలు',
      rust: 'తుప్పు తెగులు సూచిక',
      rustAlert: 'నీటి పారుదల ప్రాధాన్యత',
    },
    hi: {
      humidity: 'वायु आर्द्रता',
      humidityAlert: 'चेतावनी: बढ़ा जोखिम',
      soil: 'मृदा नमी',
      soilAlert: 'जलभराव क्यारियां',
      rust: 'रस्ट जोखिम सूचकांक',
      rustAlert: 'जल निकासी प्राथमिकता',
    },
    ta: {
      humidity: 'காற்று ஈரப்பதம்',
      humidityAlert: 'எச்சரிக்கை: அதிக ஆபத்து',
      soil: 'மண் ஈரப்பதம்',
      soilAlert: 'தேங்கிய நீர்',
      rust: 'துரு நோய் குறியீடு',
      rustAlert: 'வடிகால் முன்னுரிமை',
    },
    kn: {
      humidity: 'ಗಾಳಿಯ ತೇವಾಂಶ',
      humidityAlert: 'ಎಚ್ಚರಿಕೆ: ಹೆಚ್ಚಿನ ಅಪಾಯ',
      soil: 'ಮಣ್ಣಿನ ತೇವಾಂಶ',
      soilAlert: 'ನೀರು ನಿಂತ ಸಾಲುಗಳು',
      rust: 'ತುಕ್ಕು ರೋಗ ಸೂಚ್ಯಂಕ',
      rustAlert: 'ಚರಂಡಿ ಆದ್ಯತೆ',
    },
    mr: {
      humidity: 'हवेतील आर्द्रता',
      humidityAlert: 'इशारा: वाढता धोका',
      soil: 'मातीचा ओलावा',
      soilAlert: 'पाणी साचलेले पट्टे',
      rust: 'तांबेरा धोका निर्देशांक',
      rustAlert: 'पाणी निचरा प्राधान्य',
    },
    bn: {
      humidity: 'বাতাসের আর্দ্রতা',
      humidityAlert: 'সতর্কতা: উচ্চ ঝুঁকি',
      soil: 'মাটির আর্দ্রতা',
      soilAlert: 'জলাবদ্ধ জমি',
      rust: 'মরিচা ঝুঁকি সূচক',
      rustAlert: 'নিষ্কাশন অগ্রাধিকার',
    },
    gu: {
      humidity: 'હવામાં ભેજ',
      humidityAlert: 'ચેતવણી: ઊંચું જોખમ',
      soil: 'જમીનમાં ભેજ',
      soilAlert: 'પાણી ભરાયેલ પાળા',
      rust: 'ગેરુ જોખમ સૂચકાંક',
      rustAlert: 'પાણી નિકાલ પ્રાથમિકતા',
    },
    pa: {
      humidity: 'ਹਵਾ ਵਿਚ ਨਮੀ',
      humidityAlert: 'ਚੇਤਾਵਨੀ: ਵੱਧ ਖਤਰਾ',
      soil: 'ਮਿੱਟੀ ਵਿਚ ਨਮੀ',
      soilAlert: 'ਪਾਣੀ ਭਰੀਆਂ ਖਾਲਾਂ',
      rust: 'ਕੁੰਗੀ ਖਤਰਾ ਸੂਚਕਾਂਕ',
      rustAlert: 'ਨਿਕਾਸੀ ਪਹਿਲ',
    },
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      text: userQueryByLang[language] || userQueryByLang.en,
      time: '10:39 AM',
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      time: '10:40 AM',
      isAssessment: true,
    },
  ]);

  // Auto-scroll chat to the bottom whenever a new message arrives
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Sync the kiosk Q&A log from GET /hardware/chat-log into the chat box.
  // Polling starts immediately on mount (no languageSelected guard) so backend
  // STT answers appear in the chat panel even before language selection.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/hardware/chat-log');
        if (!res.ok) return;
        const data = await res.json();
        for (const item of data.log || []) {
          const timeStr = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `chatlog-${Date.now()}-${item.role}-${item.text.slice(0, 8)}`,
              sender: item.role === 'user' ? 'user' : 'assistant',
              text: item.text,
              time: timeStr,
            },
          ]);
        }
      } catch {
        // Server not reachable yet (e.g. kiosk not started) — retry next tick.
      }
    };

    const id = setInterval(poll, 2000);
    poll(); // immediate first pull (starts on mount)
    return () => clearInterval(id);
  }, []);

  // On mount: clear any message from a previous session before adding the
  // new welcome bubbles, so no old messages appear on startup.
  useEffect(() => {
    setMessages([]);
  }, []);

  // On mount: stream the trilingual welcome messages into the chat, then a
  // language-selection bubble (Telugu / Hindi / English) 6s after mount.
  useEffect(() => {
    const nowTime = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const timers = [
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: `welcome-1-${Date.now()}`,
          sender: 'assistant',
          text: 'Hello, Namaste, and a warm Welcome! Aapka swagat hai.',
          time: nowTime(),
        }]);
        // Speak welcome bubble 1 aloud (Web Speech API)
        if ('speechSynthesis' in window) {
          const utter1 = new SpeechSynthesisUtterance('Hello, Namaste, and a warm Welcome! Aapka swagat hai.');
          window.speechSynthesis.speak(utter1);
        }
      }, 0),
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: `welcome-2-${Date.now()}`,
          sender: 'assistant',
          text: 'Please select your preferred language — Apni bhasha chunein — మీ భాషను ఎంచుకోండి.',
          time: nowTime(),
        }]);
        // Speak welcome bubble 2 aloud (Web Speech API)
        if ('speechSynthesis' in window) {
          const utter2 = new SpeechSynthesisUtterance('Please select your preferred language — Apni bhasha chunein — మీ భాషను ఎంచుకోండి.');
          window.speechSynthesis.speak(utter2);
        }
      }, 4000),
    ];
    // After bubble 2 has spoken (at 4000ms): show the language-selection
    // message so the farmer can pick a language.
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: `lang-select-${Date.now()}`,
        sender: 'assistant',
        type: 'lang-select',
        text: '',
        time: nowTime(),
      }]);
    }, 4000);

    return () => timers.forEach(clearTimeout);
  }, []);

  // Update initial message and dialogue chart values when language changes
  useEffect(() => {
    setLatestPersonQuery(userQueryByLang[language] || userQueryByLang.en);
    setLatestAiAnswer(assistantAdvisoryResponsesByLang[language] || assistantAdvisoryResponsesByLang.en);
    setMessages((prev) => {
      if (prev.length === 2 && prev[0].id === 'msg-1') {
        return [
          {
            ...prev[0],
            text: userQueryByLang[language] || userQueryByLang.en,
          },
          prev[1],
        ];
      }
      return prev;
    });
  }, [language]);

  // Real Speech Recognition handler for farmer's voice input
  const startListeningForFarmer = () => {
    setIsRecording(true);
    showToast('Listening for your voice query...');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        const recognition = new SpeechRecognition();
        recognition.lang = langCodes[language] || 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
              setInputQuery(event.results[i][0].transcript);
            }
          }
          const currentVoiceText = (finalTranscript || interimTranscript).trim();
          if (currentVoiceText) {
            setLiveSpokenText(currentVoiceText);
            setLatestPersonQuery(currentVoiceText);
          }
          if (finalTranscript.trim()) {
            const spokenWords = finalTranscript.trim();
            setInputQuery('');
            setIsRecording(false);
            setLiveSpokenText(spokenWords);
            setLatestPersonQuery(spokenWords);
            showToast('Voice query captured');
            handleProcessQuery(spokenWords);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition status:', err?.error || err);
          if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
            setIsRecording(false);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Speech recognition start note:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };                  // Automatic welcome speech and transition to listening on session start
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Camera toggle handler: operates only during active session
  const toggleCamera = () => {
    if (!isSessionActive) {
      showToast('Camera assistance operates only during an active backend session.');
      return;
    }
    if (!isCameraActive) {
      setIsCameraActive(true);
      showToast('Camera active. Ready for backend hardware video stream.');
    } else {
      setIsCameraActive(false);
      showToast('Camera assistance deactivated.');
    }
  };

  // Switch visual detection state preview (Prepared for real computer vision/FastAPI events in VS Code)
  const toggleDetectionState = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonDetectionState((prev) => (prev === 'detected' ? 'not_detected' : 'detected'));
    showToast(
      personDetectionState === 'detected'
        ? 'State: No person detected'
        : 'State: Person detected'
    );
  };

  // Ensure camera shuts off automatically if session expires
  useEffect(() => {
    if (!isSessionActive && isCameraActive) {
      setIsCameraActive(false);
      showToast('Camera deactivated: session time concluded.');
    }
  }, [isSessionActive, isCameraActive]);

  const moveChatUp = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollBy({ top: -280, behavior: 'smooth' });
      showToast('Moved chat view up');
    }
  };

  const moveChatDown = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollBy({ top: 280, behavior: 'smooth' });
      showToast('Moved chat view down');
    }
  };

  const moveChatToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Unified conversational processor: displays both farmer query and assistant answer in chat box,
  // speaks response aloud in regional language, and automatically resumes listening
  const handleProcessQuery = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // 1. Add farmer's spoken/entered words to chat box
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLatestPersonQuery(trimmed);
    setLiveSpokenText(trimmed);
    setInputQuery('');
    showToast('Analyzing crop query with Agronomy Model...');
    setTimeout(() => {
      moveChatToBottom();
    }, 80);

    // Stop listening during processing and speaking
    stopListening();

    // 2. Generate and display assistant's response inside the chat box
    postChat(trimmed).then((res) => {
      const responseText = res?.answer || '';
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: responseText,
      };
      setMessages((prev) => [...prev, replyMsg]);
      setLatestAiAnswer(responseText);
      setLiveSpokenText(responseText);
      setTimeout(() => { moveChatToBottom(); }, 80);
    }).catch(() => {
      showToast('Could not reach server. Please try again.');
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;
    handleProcessQuery(inputQuery);
  };



  const toggleMic = () => {
    if (isRecording) {
      stopListening();
      showToast('Microphone paused.');
    } else {
      if (isPlayingAudio && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }
      startListeningForFarmer();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-1.5 pb-1 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {/* Main Centered Conversational Container Card - Positioned near top bar */}
      <div className="w-full flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/*
            THE DUAL ORBITING TRACKS CHAT BOX CONTAINER:
            - Stays completely stationary, never scrolls.
            - Features two distinct high-visibility color lines orbiting its curved perimeter when Farmer or AI speaks:
              * Line 1 (Outer track): Clockwise (Amber-Gold/Orange/Yellow for Farmer, Emerald/Cyan/Sky-Blue for AI).
              * Line 2 (Inner track): Counter-Clockwise (Electric Cyan/Aqua/Spring Green for Farmer, Fuchsia-Magenta/Violet/Topaz for AI).
            - Stops smoothly when speaking ends.
          */}
          <div
            className={`flex-1 min-h-0 bg-white/35 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex flex-col relative overflow-hidden transition-all duration-500 border ${
              isSpeaking
                ? activeSpeaker === 'farmer'
                  ? 'border-amber-400/40 shadow-[0_0_28px_rgba(245,158,11,0.2),0_12px_36px_-8px_rgba(0,0,0,0.12)]'
                  : 'border-emerald-400/40 shadow-[0_0_28px_rgba(16,185,129,0.2),0_12px_36px_-8px_rgba(0,0,0,0.12)]'
                : 'border-white/60 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.12)]'
            }`}
          >
            {/* DUAL ORBITING COLOR LINES AROUND CURVED PERIMETER */}
            {isSpeaking && activeSpeaker && (
              <>
                {/* Subtle static guides indicating the dual concentric tracks */}
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border border-white/20 pointer-events-none z-10" />
                <div className="absolute inset-[5px] sm:inset-[6px] rounded-[11px] sm:rounded-[18px] border border-white/15 pointer-events-none z-10" />

                {/* OUTER COLOR LINE (Line 1): Smooth Clockwise Orbit */}
                <div className="orbit-track-outer">
                  {/* Soft luminous aura */}
                  <div
                    className="orbit-disc animate-orbit-cw blur-[4px] opacity-75"
                    style={{
                      background:
                        activeSpeaker === 'farmer'
                          ? 'conic-gradient(from 0deg, transparent 0deg 260deg, #f59e0b 295deg, #f97316 325deg, #facc15 355deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg 260deg, #10b981 295deg, #06b6d4 325deg, #38bdf8 355deg, transparent 360deg)',
                    }}
                  />
                  {/* Crisp high-visibility line */}
                  <div
                    className="orbit-disc animate-orbit-cw"
                    style={{
                      background:
                        activeSpeaker === 'farmer'
                          ? 'conic-gradient(from 0deg, transparent 0deg 260deg, #f59e0b 295deg, #f97316 325deg, #facc15 355deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg 260deg, #10b981 295deg, #06b6d4 325deg, #38bdf8 355deg, transparent 360deg)',
                    }}
                  />
                </div>

                {/* INNER COLOR LINE (Line 2): Smooth Counter-Clockwise Orbit on Concentric Track */}
                <div className="orbit-track-inner">
                  {/* Soft luminous aura */}
                  <div
                    className="orbit-disc animate-orbit-ccw blur-[3px] opacity-75"
                    style={{
                      background:
                        activeSpeaker === 'farmer'
                          ? 'conic-gradient(from 0deg, transparent 0deg 260deg, #06b6d4 295deg, #22d3ee 325deg, #4ade80 355deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg 260deg, #ec4899 295deg, #8b5cf6 325deg, #fbbf24 355deg, transparent 360deg)',
                    }}
                  />
                  {/* Crisp high-visibility line */}
                  <div
                    className="orbit-disc animate-orbit-ccw"
                    style={{
                      background:
                        activeSpeaker === 'farmer'
                          ? 'conic-gradient(from 0deg, transparent 0deg 260deg, #06b6d4 295deg, #22d3ee 325deg, #4ade80 355deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg 260deg, #ec4899 295deg, #8b5cf6 325deg, #fbbf24 355deg, transparent 360deg)',
                    }}
                  />
                </div>
              </>
            )}

            {/* Audio Voice Feedback Loop Status Ribbon (Outer Frame Indicator) */}
            {isPlayingAudio && (
              <div className="absolute top-2 right-14 sm:right-16 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md animate-fade-in pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>{t.chat_speaking_active}</span>
                <span className="material-symbols-outlined text-[15px]">graphic_eq</span>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-2 right-14 sm:right-16 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-amber-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md animate-fade-in pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>Farmer Speaking</span>
                <span className="material-symbols-outlined text-[15px]">mic</span>
              </div>
            )}

            {/*
              THE INNER CONTENT LAYOUT:
              - Outer frame and header remain strictly STATIC.
              - ONLY the inside chat/chart viewport below scrolls.
            */}
            <div className="w-full flex-1 min-h-0 flex flex-col select-text relative z-10 isolate">
              {/* Header inside Chat Box: Empowering Indian Farmers Heading & Controls */}
              <div className="shrink-0 flex items-center justify-between pb-2 border-b border-black/10 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 py-1 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-white shadow-xs border border-emerald-100">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[15px]">eco</span>
                    </div>
                    <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#111827] tracking-tight">
                      {t.motto_empowering}
                    </span>
                  </div>

                  {/* Compact Session Countdown Timer beside Empowering Indian Farmers */}
                  <div
                    className="flex items-center gap-1 sm:gap-1.5 bg-white/95 hover:bg-white backdrop-blur-md rounded-lg sm:rounded-xl px-2.5 py-1 transition-colors border border-emerald-100 shadow-xs text-[11.5px] sm:text-[12px] font-semibold text-[#111827] select-none"
                    title={`Session remaining: ${formatSessionTime(sessionSeconds)} (${sessionStatus.toUpperCase()})`}
                  >
                    <span className="material-symbols-outlined text-[#006b2c] text-[15px]">
                      schedule
                    </span>
                    <span className="font-mono text-[11.5px] sm:text-[12px] text-[#111827] font-bold tracking-tight">
                      {formatSessionTime(sessionSeconds)}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sessionStatus === 'active'
                          ? 'bg-emerald-500 animate-pulse'
                          : sessionStatus === 'warning'
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-rose-500'
                      }`}
                      title={`Session status: ${sessionStatus}`}
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Chat Viewport: ONLY THIS INSIDE REGION SCROLLS */}
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto glass-scrollbar pr-2 py-3 space-y-4 transition-all duration-300 scroll-smooth"
              >
                {/* Additional messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[#006b2c] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">spa</span>
                      </div>
                    )}
                    <div
                      className={`max-w-xl rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-[#005a24] text-white rounded-tr-xs'
                          : 'bg-white/90 text-[#111827] rounded-tl-xs border border-white'
                      }`}
                    >
                      {msg.type === 'lang-select' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLanguage('te');
                              setLanguageSelected(true);
                              // After the farmer picks a language and bubble 3 is
                              // spoken, start the microphone so the backend STT
                              // (and any live speech) can be captured.
                              startListeningForFarmer();
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#006b2c] text-white text-[13px] font-bold hover:bg-[#005a24] transition-colors cursor-pointer shadow-xs"
                          >
                            తెలుగు
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLanguage('hi');
                              setLanguageSelected(true);
                              startListeningForFarmer();
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#006b2c] text-white text-[13px] font-bold hover:bg-[#005a24] transition-colors cursor-pointer shadow-xs"
                          >
                            हिंదీ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLanguage('en');
                              setLanguageSelected(true);
                              startListeningForFarmer();
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#006b2c] text-white text-[13px] font-bold hover:bg-[#005a24] transition-colors cursor-pointer shadow-xs"
                          >
                            English
                          </button>
                        </div>
                      ) : (
                        msg.text
                      )}
                      <div
                        className={`text-[10px] mt-1 ${
                          msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-gray-500'
                        }`}
                      >
                        {msg.time}
                      </div>
                    </div>
                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full border border-white/90 bg-white/90 flex items-center justify-center text-gray-800 shrink-0 mt-1 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. STATIONARY LOCKED TYPING BOX */}
          <div className="shrink-0 w-full bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-[0_8px_25px_rgba(0,0,0,0.1)] border border-white/90 p-2 sm:p-2.5 transition-all">
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <div className="flex-1 bg-white backdrop-blur-md rounded-full border border-gray-200/90 focus-within:border-[#006b2c] focus-within:ring-2 focus-within:ring-[#006b2c]/20 shadow-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 sm:gap-2">
                {/* Camera-Assisted Session: Visual states for Camera Active, Person Detected, and No Person Detected */}
                <div className="relative flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    title={
                      !isSessionActive
                        ? 'Camera operates only during an active backend session'
                        : isCameraActive
                        ? `Camera Active • ${personDetectionState === 'detected' ? 'Person Detected' : 'No Person Detected'}`
                        : 'Start Camera-Assisted Session'
                    }
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 relative ${
                      isCameraActive
                        ? personDetectionState === 'detected'
                          ? 'bg-emerald-100 text-[#006b2c] ring-2 ring-emerald-500 shadow-xs'
                          : 'bg-amber-100 text-amber-800 ring-2 ring-amber-400 shadow-xs'
                        : 'text-gray-600 hover:text-[#006b2c] hover:bg-gray-100/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                    {/* Live hardware active dot */}
                    {isCameraActive && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          personDetectionState === 'detected'
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-amber-500'
                        }`}
                      />
                    )}
                  </button>

                  {/* Visual Detection Status Badge */}
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={toggleDetectionState}
                      title="Toggle detection state preview (Ready for real backend hardware stream)"
                      className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-semibold border transition-all cursor-pointer select-none whitespace-nowrap shadow-2xs ${
                        personDetectionState === 'detected'
                          ? 'bg-emerald-50 text-[#006b2c] border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {personDetectionState === 'detected' ? 'person' : 'person_off'}
                      </span>
                      <span>
                        {personDetectionState === 'detected'
                          ? 'Person Detected'
                          : 'No Person Detected'}
                      </span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleMic}
                  title="Voice Query"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-[#4ade80] text-[#004d20] hover:bg-[#34d399]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                </button>
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={t.chat_placeholder}
                  className="flex-1 bg-transparent text-[13.5px] text-[#111827] placeholder:text-gray-500 font-medium focus:outline-none min-w-0"
                />
                <button
                  type="submit"
                  title={t.chat_send}
                  className="w-8 h-8 rounded-full bg-[#006b2c] hover:bg-[#005a24] text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
};
