import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

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
  const { t, language } = useLanguage();
  const [inputQuery, setInputQuery] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
  };

  // Speaks welcome message aloud in selected language, then automatically listens
  const speakWelcomeMessage = () => {
    const welcomeText = welcomeMessageByLang[language] || welcomeMessageByLang.en;
    setLiveSpokenText(welcomeText);
    setLatestAiAnswer(welcomeText);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.rate = 0.95;
      utterance.lang = langCodes[language] || 'en-IN';

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setLiveSpokenText(welcomeText);
        setLatestAiAnswer(welcomeText);
        showToast('Assistant speaking welcome message...');
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
        // Automatically start listening for farmer's speech without pressing mic button
        startListeningForFarmer();
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
        // Fallback: automatically listen if speech synthesis is interrupted or blocked
        startListeningForFarmer();
      };

      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback if browser does not support speechSynthesis
      startListeningForFarmer();
    }
  };

  // Automatic welcome speech and transition to listening on session start
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    const timer = setTimeout(() => {
      speakWelcomeMessage();
    }, 600);

    return () => {
      clearTimeout(timer);
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

  const handleSpeakAssessment = () => {
    if (isPlayingAudio) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setLiveSpokenText('');
      showToast(t.chat_listen_stop);
      return;
    }
    const textToRead = `${t.assessment_desc} ${t.assessment_step1_label} ${t.assessment_step1_text}. ${t.assessment_step2_label} ${t.assessment_step2_text}`;
    setLiveSpokenText(textToRead);
    setLatestAiAnswer(textToRead);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.92;
      utterance.lang = langCodes[language] || 'en-IN';

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setLiveSpokenText(textToRead);
        setLatestAiAnswer(textToRead);
      };

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
      showToast(`${t.chat_listen} (${language.toUpperCase()})`);
    } else {
      setIsPlayingAudio(true);
      setLiveSpokenText(textToRead);
      setLatestAiAnswer(textToRead);
      showToast(t.chat_listen);
      setTimeout(() => setIsPlayingAudio(false), 5000);
    }
  };

  // Speaks the assistant's answer aloud in the selected regional language,
  // then automatically returns to listening for the farmer's next speech turn
  const speakAssistantResponse = (textToSpeak: string) => {
    setLiveSpokenText(textToSpeak);
    setLatestAiAnswer(textToSpeak);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.lang = langCodes[language] || 'en-IN';

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setLiveSpokenText(textToSpeak);
        setLatestAiAnswer(textToSpeak);
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
        // Automatically start listening for farmer's next question without needing mic button press
        startListeningForFarmer();
      };

      utterance.onerror = (err) => {
        console.warn('Speech synthesis note:', err);
        setIsPlayingAudio(false);
        // Fallback: resume listening automatically
        startListeningForFarmer();
      };

      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
      startListeningForFarmer();
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
    setTimeout(() => {
      const responseText =
        assistantAdvisoryResponsesByLang[language] ||
        assistantAdvisoryResponsesByLang.en;

      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: responseText,
      };

      setMessages((prev) => [...prev, replyMsg]);
      setLatestAiAnswer(responseText);
      setLiveSpokenText(responseText);
      setTimeout(() => {
        moveChatToBottom();
      }, 80);

      // 3. Speak the assistant's answer aloud in the selected language
      speakAssistantResponse(responseText);
    }, 800);
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

                {/* Dialogue Chart Toggle & Move Chat Up & Down Interactive Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDialogueChart((prev) => !prev)}
                    title="Toggle Live Speech & Dialogue Chart"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-[11.5px] font-bold border-2 transition-all cursor-pointer shadow-xs ${
                      showDialogueChart || isSpeaking
                        ? 'bg-[#007432] text-white border-[#007432]'
                        : 'bg-white hover:bg-emerald-50 text-[#007432] border-[#007432]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isSpeaking ? 'graphic_eq' : 'query_stats'}
                    </span>
                    <span className="hidden sm:inline">Speech Chart</span>
                  </button>

                  <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm p-0.5 rounded-full border border-gray-200 shadow-xs">
                    <button
                      type="button"
                      onClick={moveChatUp}
                      title="Move Chat Up"
                      className="w-6 h-6 rounded-full hover:bg-emerald-50 text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      onClick={moveChatDown}
                      title="Move Chat Down"
                      className="w-6 h-6 rounded-full hover:bg-emerald-50 text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Chat Viewport: ONLY THIS INSIDE REGION SCROLLS */}
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto glass-scrollbar pr-2 py-3 space-y-4 transition-all duration-300 scroll-smooth"
              >
                {/* LIVE DIALOGUE & SPEECH TELEMETRY CHART IN THE CHAT BOX */}
                {(showDialogueChart || isSpeaking) && (
                  <div
                    className={`rounded-2xl transition-all duration-300 border-2 p-3 sm:p-4 shadow-sm ${
                      isRecording
                        ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border-amber-500 ring-2 ring-amber-400/30 shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
                        : isPlayingAudio
                        ? 'bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-purple-500/15 border-[#007432] ring-2 ring-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.2)]'
                        : 'bg-white/90 backdrop-blur-md border-[#007432]/40'
                    }`}
                  >
                    {/* Chart Header with Live Frequency Equalizer */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-black/10 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                            isRecording
                              ? 'bg-amber-600 animate-pulse'
                              : isPlayingAudio
                              ? 'bg-[#007432] animate-pulse'
                              : 'bg-[#007432]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {isSpeaking ? 'graphic_eq' : 'query_stats'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] sm:text-[13.5px] font-black text-[#111827] tracking-tight">
                              {isRecording
                                ? 'Farmer Speaking • Live Speech Waveform Chart'
                                : isPlayingAudio
                                ? 'AI Assistant Speaking • Live Response Chart'
                                : 'Live Speech & Dialogue Telemetry Chart'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isRecording
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : isPlayingAudio
                                  ? 'bg-emerald-100 text-[#006b2c] border border-emerald-300 animate-pulse'
                                  : 'bg-emerald-50 text-[#007432] border border-[#007432]/30'
                              }`}
                            >
                              {isRecording ? '● Person Mic Active' : isPlayingAudio ? '● AI Audio Active' : '● Dialogue Synchronized'}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-gray-600 font-medium truncate block">
                            Real-time voice modulation, frequency analysis & synchronized dialogue answer stream
                          </span>
                        </div>
                      </div>

                      {/* Real-time Frequency Equalizer Bars Chart */}
                      <div className="flex items-end gap-1 h-7 px-2.5 py-1 bg-black/5 rounded-xl border border-black/5 shrink-0">
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-amber-500 animate-speech-bar-1'
                              : isPlayingAudio
                              ? 'bg-emerald-500 animate-speech-bar-1'
                              : 'bg-gray-400 h-2'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '30%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-orange-500 animate-speech-bar-2'
                              : isPlayingAudio
                              ? 'bg-cyan-500 animate-speech-bar-2'
                              : 'bg-gray-400 h-3'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '50%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-yellow-500 animate-speech-bar-3'
                              : isPlayingAudio
                              ? 'bg-blue-500 animate-speech-bar-3'
                              : 'bg-gray-400 h-2'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '20%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-amber-400 animate-speech-bar-4'
                              : isPlayingAudio
                              ? 'bg-emerald-400 animate-speech-bar-4'
                              : 'bg-gray-400 h-4'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '70%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-orange-400 animate-speech-bar-5'
                              : isPlayingAudio
                              ? 'bg-cyan-400 animate-speech-bar-5'
                              : 'bg-gray-400 h-3'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '40%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-emerald-500 animate-speech-bar-6'
                              : isPlayingAudio
                              ? 'bg-purple-500 animate-speech-bar-6'
                              : 'bg-gray-400 h-2'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '30%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-teal-400 animate-speech-bar-7'
                              : isPlayingAudio
                              ? 'bg-pink-500 animate-speech-bar-7'
                              : 'bg-gray-400 h-3'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '60%' }}
                        />
                        <div
                          className={`w-1 rounded-full ${
                            isRecording
                              ? 'bg-yellow-400 animate-speech-bar-8'
                              : isPlayingAudio
                              ? 'bg-violet-400 animate-speech-bar-8'
                              : 'bg-gray-400 h-2'
                          }`}
                          style={{ height: isSpeaking ? '100%' : '35%' }}
                        />
                      </div>
                    </div>

                    {/* Dual Columns: Person's Answer/Speech & AI Assistant's Answer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
                      {/* Track 1: Person (Farmer) Speech Track */}
                      <div
                        className={`p-3 rounded-xl border-2 transition-all ${
                          isRecording
                            ? 'bg-amber-50/95 border-amber-500 shadow-xs ring-1 ring-amber-400/50'
                            : 'bg-white/80 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[12px] font-bold shadow-2xs">
                              <span className="material-symbols-outlined text-[13px]">person</span>
                            </div>
                            <span className="text-[11.5px] font-black text-[#111827]">
                              Person (Farmer) Speech / Answer
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              isRecording
                                ? 'bg-amber-200 text-amber-900 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isRecording ? '● Live Recording' : 'Voice Input'}
                          </span>
                        </div>

                        {/* Person's Answer / Spoken Words Bubble */}
                        <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 text-[12px] sm:text-[12.5px] text-[#111827] leading-relaxed font-medium min-h-[48px] shadow-2xs">
                          {isRecording && liveSpokenText
                            ? liveSpokenText
                            : latestPersonQuery || (userQueryByLang[language] || userQueryByLang.en)}
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600 font-semibold">
                          <span>{isRecording ? 'Microphone: Capturing Speech' : 'Status: Query Charted'}</span>
                          <span>Voice Pitch: 215 Hz • 99.4% Clarity</span>
                        </div>
                      </div>

                      {/* Track 2: AI Assistant Answer Track */}
                      <div
                        className={`p-3 rounded-xl border-2 transition-all ${
                          isPlayingAudio
                            ? 'bg-emerald-50/95 border-[#007432] shadow-xs ring-1 ring-emerald-500/50'
                            : 'bg-white/80 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#007432] text-white flex items-center justify-center text-[12px] font-bold shadow-2xs">
                              <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                            </div>
                            <span className="text-[11.5px] font-black text-[#111827]">
                              AI Assistant Answer
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              isPlayingAudio
                                ? 'bg-emerald-200 text-[#005a24] animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isPlayingAudio ? '● Speaking Aloud' : 'Answer Generated'}
                          </span>
                        </div>

                        {/* AI's Answer / Spoken Words Bubble */}
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[12px] sm:text-[12.5px] text-[#111827] leading-relaxed font-medium min-h-[48px] shadow-2xs">
                          {isPlayingAudio && liveSpokenText
                            ? liveSpokenText
                            : latestAiAnswer || (assistantAdvisoryResponsesByLang[language] || assistantAdvisoryResponsesByLang.en)}
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600 font-semibold">
                          <span>Language: {language.toUpperCase()} (Spoken)</span>
                          <span>TTS Rate: 0.95x • Audio Purity: 100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Dialogue Cadence & Synchronized Telemetry */}
                    <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] text-gray-600 font-semibold flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span>Dialogue Turn Balance:</span>
                        <div className="w-24 sm:w-36 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: isRecording ? '85%' : '45%' }}
                            title="Person voice turn share"
                          />
                          <div
                            className="h-full bg-[#007432] transition-all duration-300"
                            style={{ width: isPlayingAudio ? '85%' : '55%' }}
                            title="AI assistant response share"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-[#007432] font-bold">
                        {isSpeaking
                          ? activeSpeaker === 'farmer'
                            ? 'Capturing Farmer Speech into Live Chart...'
                            : 'Assistant Speaking Aloud into Live Chart...'
                          : 'Synchronized Dialogue Session Ready'}
                      </span>
                    </div>
                  </div>
                )}
                {/* Message 1: Farmer Query Bubble */}
                <div className="flex items-start justify-end gap-3 group">
                  <div className="flex flex-col items-end max-w-xl">
                    <div className="bg-[#005a24] text-white rounded-2xl rounded-tr-xs px-5 py-3.5 text-[14px] leading-relaxed shadow-md">
                      {messages[0].text}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#1f2937] mt-1 mr-1 font-semibold">
                      <span>{messages[0].time}</span>
                      <span className="text-[#006b2c] font-bold">✓✓</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/90 bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-800 shrink-0 mt-1 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                </div>

                {/* Message 2: Static Agronomic Assessment Card */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#006b2c] text-white flex items-center justify-center shrink-0 shadow-md mt-1">
                    <span className="material-symbols-outlined text-[19px]">spa</span>
                  </div>
                  <div className="flex-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 p-5 shadow-xs space-y-4">
                    {/* Header: Title & Audio Guidance Trigger */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#006b2c] text-[18px]">
                          verified
                        </span>
                        <h3 className="text-[14px] sm:text-[15px] font-bold text-[#111827]">
                          {t.assessment_title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleSpeakAssessment}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-xs ${
                          isPlayingAudio
                            ? 'bg-[#006b2c] text-white border-[#006b2c]'
                            : 'bg-white/90 hover:bg-white text-[#006b2c] border-[#cbeccf]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isPlayingAudio ? 'volume_off' : 'volume_up'}
                        </span>
                        <span>{isPlayingAudio ? t.chat_listen_stop : t.chat_listen}</span>
                      </button>
                    </div>

                    {/* Static Alerts and Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#ffebee] text-[#d32f2f] text-[11px] font-bold border border-[#ffcdd2] shadow-xs">
                        <span className="material-symbols-outlined text-[13px]">warning</span>
                        {t.assessment_alert_humidity}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-[#006b2c] text-[11px] font-bold border border-[#cbeccf] shadow-xs">
                        <span className="material-symbols-outlined text-[13px]">science</span>
                        {t.assessment_fungicide}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-[#374151] text-[11px] font-bold border border-gray-200 shadow-xs">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {t.assessment_action_time}
                      </span>
                    </div>

                    {/* Static Crop Telemetry Micro-Chart (Completely static and clear) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/70 border border-white/90 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#374151]">
                          <span>{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).humidity}</span>
                          <span className="font-bold text-red-600">85% RH</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium block">{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).humidityAlert}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#374151]">
                          <span>{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).soil}</span>
                          <span className="font-bold text-amber-600">92% VWC</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-amber-100 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium block">{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).soilAlert}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#374151]">
                          <span>{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).rust}</span>
                          <span className="font-bold text-[#b91c1c]">78 / 100</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full bg-[#dc2626] rounded-full" style={{ width: '78%' }}></div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium block">{(telemetryLabelsByLang[language] || telemetryLabelsByLang.en).rustAlert}</span>
                      </div>
                    </div>

                    {/* Static Advice Description */}
                    <p className="text-[13.5px] text-[#111827] font-medium leading-relaxed">
                      {t.assessment_desc}
                    </p>

                    {/* Numbered Steps: Perfectly clear & readable */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-white text-[#006b2c] flex items-center justify-center font-extrabold text-[11px] shrink-0 mt-0.5 border border-[#cbeccf] shadow-xs">
                          1
                        </div>
                        <p className="text-[13px] text-[#111827] leading-normal font-medium">
                          <strong className="text-[#005a24] font-bold">{t.assessment_step1_label} </strong>
                          {t.assessment_step1_text}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-white text-[#006b2c] flex items-center justify-center font-extrabold text-[11px] shrink-0 mt-0.5 border border-[#cbeccf] shadow-xs">
                          2
                        </div>
                        <p className="text-[13px] text-[#111827] leading-normal font-medium">
                          <strong className="text-[#005a24] font-bold">{t.assessment_step2_label} </strong>
                          {t.assessment_step2_text}
                        </p>
                      </div>
                    </div>

                    {/* Follow-up Action Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('schemes');
                          showToast('Viewing subsidy schemes');
                        }}
                        className="px-3 py-1 rounded-full bg-white/90 hover:bg-white text-[#006b2c] border border-white/80 text-[11.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[13px]">percent</span>
                        <span>{t.chat_action_subsidy}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('learn');
                          showToast('Loading ICAR soil moisture telemetry data');
                        }}
                        className="px-3 py-1 rounded-full bg-white/90 hover:bg-white text-[#006b2c] border border-white/80 text-[11.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>{t.chat_action_moisture}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('officer-hub');
                          showToast('Connecting to District Agricultural Officer portal');
                        }}
                        className="px-3 py-1 rounded-full bg-white/90 hover:bg-white text-[#006b2c] border border-white/80 text-[11.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>{t.chat_action_officer}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional messages */}
                {messages.slice(2).map((msg) => (
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
                      {msg.text}
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
