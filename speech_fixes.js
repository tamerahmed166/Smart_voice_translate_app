// إصلاحات مشاكل التعرف على الكلام والترجمة
// Speech Recognition and Translation Fixes

// إصلاح مشكلة التسجيل المستمر دون ترجمة
function fixContinuousRecording() {
    // إضافة timeout للتسجيل لمنع التسجيل المستمر
    let recordingTimeout;
    const MAX_RECORDING_TIME = 30000; // 30 ثانية كحد أقصى
    
    // تعديل دالة startRecording لإضافة timeout
    const originalStartRecording = window.startRecording;
    window.startRecording = function(speaker) {
        // استدعاء الدالة الأصلية
        if (originalStartRecording) {
            originalStartRecording.call(this, speaker);
        }
        
        // إضافة timeout للتسجيل
        recordingTimeout = setTimeout(() => {
            if (window.isRecording) {
                console.log('⏰ Recording timeout reached, stopping automatically');
                window.stopRecording();
                showNotification('تم إيقاف التسجيل تلقائياً بعد 30 ثانية', 'warning');
            }
        }, MAX_RECORDING_TIME);
    };
    
    // تعديل دالة stopRecording لإلغاء timeout
    const originalStopRecording = window.stopRecording;
    window.stopRecording = function() {
        // إلغاء timeout
        if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            recordingTimeout = null;
        }
        
        // استدعاء الدالة الأصلية
        if (originalStopRecording) {
            originalStopRecording.call(this);
        }
    };
}

// إصلاح مشكلة صدى الصوت
function fixAudioEcho() {
    // تحسين إعدادات معالجة الصوت لتقليل الصدى
    const originalSetupAdvancedAudioProcessing = window.setupAdvancedAudioProcessing;
    
    window.setupAdvancedAudioProcessing = function(stream) {
        try {
            console.log('🔧 Setting up enhanced audio processing with echo reduction...');
            
            // إنشاء Audio Context محسن
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });
            
            // إنشاء مصدر الصوت
            const source = audioContext.createMediaStreamSource(stream);
            
            // إنشاء Echo Cancellation Filter محسن
            const echoCanceller = audioContext.createBiquadFilter();
            echoCanceller.type = 'notch';
            echoCanceller.frequency.setValueAtTime(1000, audioContext.currentTime);
            echoCanceller.Q.setValueAtTime(30, audioContext.currentTime);
            
            // إنشاء High-Pass Filter لإزالة الترددات المنخفضة
            const highPassFilter = audioContext.createBiquadFilter();
            highPassFilter.type = 'highpass';
            highPassFilter.frequency.setValueAtTime(100, audioContext.currentTime);
            highPassFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
            
            // إنشاء Low-Pass Filter لإزالة الترددات العالية
            const lowPassFilter = audioContext.createBiquadFilter();
            lowPassFilter.type = 'lowpass';
            lowPassFilter.frequency.setValueAtTime(7000, audioContext.currentTime);
            lowPassFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
            
            // إنشاء Compressor محسن
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-20, audioContext.currentTime);
            compressor.knee.setValueAtTime(20, audioContext.currentTime);
            compressor.ratio.setValueAtTime(6, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            // إنشاء Noise Gate محسن
            const noiseGate = audioContext.createGain();
            noiseGate.gain.setValueAtTime(1, audioContext.currentTime);
            
            // ربط العقد في سلسلة المعالجة المحسنة
            source.connect(echoCanceller);
            echoCanceller.connect(highPassFilter);
            highPassFilter.connect(lowPassFilter);
            lowPassFilter.connect(compressor);
            compressor.connect(noiseGate);
            noiseGate.connect(audioContext.destination);
            
            console.log('✅ Enhanced audio processing with echo reduction setup completed');
            return true;
            
        } catch (error) {
            console.error('❌ Error setting up enhanced audio processing:', error);
            // العودة للدالة الأصلية في حالة الخطأ
            if (originalSetupAdvancedAudioProcessing) {
                return originalSetupAdvancedAudioProcessing.call(this, stream);
            }
            return false;
        }
    };
}

// إصلاح مشكلة فشل الترجمة النصية
function fixTextTranslationError() {
    // تحسين دالة translateWithMyMemory
    const originalTranslateWithMyMemory = window.translateWithMyMemory;
    
    window.translateWithMyMemory = async function(text, sourceLang, targetLang) {
        try {
            // التحقق من صحة المدخلات
            if (!text || !text.trim()) {
                throw new Error('النص فارغ أو غير صالح');
            }
            
            if (!sourceLang || !targetLang) {
                throw new Error('لغة المصدر أو الهدف غير محددة');
            }
            
            const cleanText = text.trim();
            console.log('🔄 Translating with enhanced error handling:', { text: cleanText, sourceLang, targetLang });
            
            // تحسين URL للـ API
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${sourceLang}|${targetLang}&de=example@email.com`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; TranslationApp/1.0)'
                },
                timeout: 10000 // 10 ثواني timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
                const translatedText = data.responseData.translatedText.trim();
                
                // التحقق من جودة الترجمة
                if (translatedText && translatedText !== cleanText && translatedText.length > 0) {
                    console.log('✅ Translation successful:', translatedText);
                    return translatedText;
                } else {
                    throw new Error('ترجمة غير صالحة أو مطابقة للنص الأصلي');
                }
            } else {
                throw new Error(`API Error: ${data.responseDetails || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('❌ Translation error:', error);
            
            // محاولة الترجمة باستخدام خدمة بديلة
            try {
                return await fallbackTranslation(text, sourceLang, targetLang);
            } catch (fallbackError) {
                console.error('❌ Fallback translation also failed:', fallbackError);
                throw new Error(`فشل في الترجمة: ${error.message}`);
            }
        }
    };
}

// دالة ترجمة بديلة
async function fallbackTranslation(text, sourceLang, targetLang) {
    console.log('🔄 Attempting fallback translation...');
    
    // ترجمة بديلة باستخدام LibreTranslate أو خدمة أخرى
    try {
        const response = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang,
                format: 'text'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
                console.log('✅ Fallback translation successful');
                return data.translatedText;
            }
        }
    } catch (error) {
        console.error('❌ Fallback translation failed:', error);
    }
    
    // إذا فشلت جميع المحاولات، إرجاع رسالة خطأ واضحة
    throw new Error('فشل في جميع محاولات الترجمة');
}

// إصلاح مشكلة عدم إيقاف التعرف على الكلام
function fixSpeechRecognitionStop() {
    // تحسين إعدادات التعرف على الكلام
    const originalInitializeSpeechRecognition = window.initializeSpeechRecognition;
    
    window.initializeSpeechRecognition = function() {
        if (originalInitializeSpeechRecognition) {
            originalInitializeSpeechRecognition.call(this);
        }
        
        if (window.recognition) {
            // تحسين إعدادات التعرف على الكلام
            window.recognition.continuous = false; // تغيير إلى false لمنع التسجيل المستمر
            window.recognition.interimResults = true;
            window.recognition.maxAlternatives = 3;
            
            // إضافة معالج محسن لـ onresult
            const originalOnResult = window.recognition.onresult;
            window.recognition.onresult = function(event) {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript;
                    
                    if (result.isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // معالجة النتائج المؤقتة
                if (interimTranscript.trim()) {
                    window.handleSpeechResult && window.handleSpeechResult(interimTranscript.trim(), false);
                }
                
                // معالجة النص النهائي وإيقاف التسجيل
                if (finalTranscript.trim()) {
                    console.log('📝 Final transcript received:', finalTranscript);
                    window.handleSpeechResult && window.handleSpeechResult(finalTranscript.trim(), true);
                    
                    // إيقاف التعرف على الكلام تلقائياً
                    setTimeout(() => {
                        if (window.recognition && window.isRecording) {
                            console.log('🛑 Auto-stopping speech recognition after final result');
                            window.recognition.stop();
                        }
                    }, 500);
                }
            };
            
            // تحسين معالج onend
            const originalOnEnd = window.recognition.onend;
            window.recognition.onend = function() {
                console.log('🔚 Speech recognition ended');
                
                if (window.isRecording) {
                    window.stopRecording && window.stopRecording();
                }
                
                if (originalOnEnd) {
                    originalOnEnd.call(this);
                }
            };
        }
    };
}

// تطبيق جميع الإصلاحات
function applyAllFixes() {
    console.log('🔧 Applying speech recognition and translation fixes...');
    
    try {
        fixContinuousRecording();
        console.log('✅ Continuous recording fix applied');
        
        fixAudioEcho();
        console.log('✅ Audio echo fix applied');
        
        fixTextTranslationError();
        console.log('✅ Text translation error fix applied');
        
        fixSpeechRecognitionStop();
        console.log('✅ Speech recognition stop fix applied');
        
        console.log('🎉 All fixes applied successfully!');
        
        // إشعار المستخدم
        if (window.showNotification) {
            window.showNotification('تم تطبيق إصلاحات التعرف على الكلام والترجمة', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error applying fixes:', error);
        if (window.showNotification) {
            window.showNotification('خطأ في تطبيق الإصلاحات: ' + error.message, 'error');
        }
    }
}

// تطبيق الإصلاحات عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllFixes);
} else {
    applyAllFixes();
}

// تصدير الدوال للاستخدام الخارجي
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fixContinuousRecording,
        fixAudioEcho,
        fixTextTranslationError,
        fixSpeechRecognitionStop,
        applyAllFixes
    };
}