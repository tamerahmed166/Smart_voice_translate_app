// إعداد اكتشاف الأخطاء للهاتف المحمول
window.onerror = function(msg, url, line, col, error) {
    console.error('خطأ JavaScript:', msg, 'في السطر:', line);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:9999;border-radius:5px;font-size:12px;max-width:300px;';
    errorDiv.textContent = `خطأ: ${msg} (السطر: ${line})`;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
    return false;
};

// إظهار أخطاء Promise
window.addEventListener('unhandledrejection', function(event) {
    console.error('خطأ Promise:', event.reason);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:orange;color:white;padding:10px;z-index:9999;border-radius:5px;font-size:12px;max-width:300px;';
    errorDiv.textContent = `خطأ Promise: ${event.reason}`;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
});

// مراقبة حالة الاتصال
window.addEventListener('online', function() {
    console.log('تم الاتصال بالإنترنت');
    document.getElementById('connection-indicator').textContent = '🟢';
    document.querySelector('.connection-status span:last-child').textContent = 'متصل';
});

window.addEventListener('offline', function() {
    console.log('انقطع الاتصال بالإنترنت');
    document.getElementById('connection-indicator').textContent = '🔴';
    document.querySelector('.connection-status span:last-child').textContent = 'غير متصل';
});

class VoiceTranslateApp {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.favorites = this.loadFavorites();
        this.debounceTimer = null;
        this.conversationMode = false;
        this.conversationHistory = [];
        this.checkMobileSupport();
        this.init();
    }

    // التحقق من دعم الميزات على الهاتف المحمول
    checkMobileSupport() {
        // التحقق من دعم الميكروفون
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('المتصفح لا يدعم الميكروفون');
            return;
        }

        // اختبار الوصول للميكروفون
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                console.log('الميكروفون يعمل بشكل صحيح');
                stream.getTracks().forEach(track => track.stop());
            })
            .catch((error) => {
                console.error('خطأ في الوصول للميكروفون:', error);
                this.showError(`خطأ في الوصول للميكروفون: ${error.message}`);
            });

        // التحقق من دعم Speech Recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('المتصفح لا يدعم التعرف على الصوت');
        }

        // التحقق من دعم Speech Synthesis
        if (!('speechSynthesis' in window)) {
            this.showError('المتصفح لا يدعم تحويل النص إلى صوت');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:#dc3545;color:white;padding:15px;z-index:9999;border-radius:8px;font-size:14px;max-width:300px;box-shadow:0 4px 8px rgba(0,0,0,0.2);';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 8000);
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.loadFavoritesToDOM();
        this.loadConversationHistory();
        this.loadTranslationHistory();
        this.initSmartTranslation();
        this.updateStatus('جاهز للاستخدام');
    }

    setupElements() {
        this.elements = {
            micBtn: document.getElementById('mic-btn'),
            clearBtn: document.getElementById('clear-btn'),
            speakBtn: document.getElementById('speak-btn'),
            copyBtn: document.getElementById('copy-btn'),
            imageCaptureBtn: document.getElementById('image-capture-btn'),
            imageCaptureContainer: document.querySelector('.image-capture-container'),
            imageCaptureMenu: document.getElementById('image-capture-menu'),
            imageInput: document.getElementById('image-input'),
            sourceText: document.getElementById('source-text'),
            translatedText: document.getElementById('translated-text'),
            sourceLang: document.getElementById('source-lang'),
            targetLang: document.getElementById('target-lang'),
            swapBtn: document.getElementById('swap-languages'),
            status: document.getElementById('status'),
            addFavoriteBtn: document.getElementById('add-favorite'),
            favoritesList: document.getElementById('favorites-list'),
            conversationModeToggle: document.getElementById('conversation-mode'),
            conversationHistory: document.getElementById('conversation-history'),
            conversationItems: document.getElementById('conversation-items'),
            clearConversationBtn: document.getElementById('clear-conversation')
        };
    }

    setupEventListeners() {
        // أزرار التحكم الرئيسية
        this.elements.micBtn.addEventListener('click', () => this.toggleRecording());
        this.elements.clearBtn.addEventListener('click', () => this.clearText());
        this.elements.speakBtn.addEventListener('click', () => this.speakTranslation());
        this.elements.copyBtn.addEventListener('click', () => this.copyTranslation());
        
        // القائمة المنسدلة للصور والكاميرا
        this.elements.imageCaptureBtn.addEventListener('click', (e) => this.toggleImageCaptureMenu(e));
        this.elements.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // إغلاق القائمة عند النقر خارجها
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // عناصر القائمة المنسدلة
        this.elements.imageCaptureMenu.addEventListener('click', (e) => this.handleMenuItemClick(e));
        
        // تبديل اللغات
        this.elements.swapBtn.addEventListener('click', () => this.swapLanguages());
        
        // تحديث لغة التعرف على الصوت عند تغيير اللغة المصدر
        this.elements.sourceLang.addEventListener('change', () => {
            this.updateRecognitionLanguage();
            if (this.elements.sourceText.value.trim()) {
                this.debouncedTranslate();
            }
        });
        
        this.elements.targetLang.addEventListener('change', () => {
            if (this.elements.sourceText.value.trim()) {
                this.debouncedTranslate();
            }
        });
        
        // ترجمة تلقائية عند الكتابة مع نظام debounce محسن
        this.elements.sourceText.addEventListener('input', () => {
            this.updateCharCounter();
            const text = this.elements.sourceText.value.trim();
            if (!text) {
                this.elements.translatedText.textContent = 'الترجمة ستظهر هنا...';
                this.elements.translatedText.classList.remove('has-content');
                return;
            }
            this.debouncedTranslate();
        });
        
        // ترجمة فورية عند الضغط على Enter
        this.elements.sourceText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.elements.sourceText.value.trim()) {
                    this.translateText();
                }
            }
        });
        
        // إضافة للمفضلة
        this.elements.addFavoriteBtn.addEventListener('click', () => this.addToFavorites());
        
        // وضع المحادثة الثنائية
        this.elements.conversationModeToggle.addEventListener('change', () => this.toggleConversationMode());
        this.elements.clearConversationBtn.addEventListener('click', () => this.clearConversationHistory());
        
        // إعداد نظام debounce
        this.setupDebounce();
        
        // استخدام العبارات المفضلة
        this.elements.favoritesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('use-favorite')) {
                const favoriteItem = e.target.closest('.favorite-item');
                const text = favoriteItem.dataset.text;
                this.elements.sourceText.value = text;
                this.translateText();
            }
        });
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 3;
            
            // إعدادات زمنية أطول للتسجيل
            this.recordingTimeout = null;
            this.maxRecordingTime = 180000; // 180 ثانية (3 دقائق)
            
            // تحديد لغة التعرف على الصوت بناءً على اللغة المصدر
            this.updateRecognitionLanguage();
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.elements.micBtn.classList.add('recording');
                this.updateStatus('جاري الاستماع...');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    // اختيار أفضل نتيجة من البدائل المتاحة
                    let bestTranscript = event.results[i][0].transcript;
                    let bestConfidence = event.results[i][0].confidence || 0;
                    
                    // البحث عن أفضل بديل بناءً على الثقة
                    for (let j = 1; j < event.results[i].length; j++) {
                        const alternative = event.results[i][j];
                        if (alternative.confidence > bestConfidence) {
                            bestTranscript = alternative.transcript;
                            bestConfidence = alternative.confidence;
                        }
                    }
                    
                    // تنظيف النص
                    bestTranscript = this.cleanTranscript(bestTranscript);
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += bestTranscript;
                    } else {
                        interimTranscript += bestTranscript;
                    }
                }
                
                this.elements.sourceText.value = finalTranscript + interimTranscript;
                
                if (finalTranscript.trim()) {
                    // إذا كان الاكتشاف التلقائي مفعل، حاول اكتشاف اللغة وتحديث واجهة المستخدم
                    if (this.elements.sourceLang.value === 'auto') {
                        try {
                            const detectedLang = this.detectLanguage(finalTranscript);
                            // تحديث عرض اللغة المكتشفة للمستخدم
                            this.updateStatus(`تم اكتشاف اللغة: ${this.getLanguageName(detectedLang)}`);
                            
                            // تحديث لغة التعرف على الصوت للمرة القادمة إذا كانت مختلفة
                            const currentRecognitionLang = this.recognition.lang;
                            const newRecognitionLang = {
                                'ar': 'ar-SA',
                                'en': 'en-US',
                                'fr': 'fr-FR',
                                'es': 'es-ES',
                                'de': 'de-DE',
                                'it': 'it-IT',
                                'ja': 'ja-JP',
                                'ko': 'ko-KR',
                                'zh': 'zh-CN'
                            }[detectedLang] || 'ar-SA';
                            
                            if (currentRecognitionLang !== newRecognitionLang) {
                                this.recognition.lang = newRecognitionLang;
                            }
                        } catch (error) {
                            console.error('خطأ في اكتشاف اللغة:', error);
                            this.updateStatus('خطأ في اكتشاف اللغة، سيتم استخدام الإنجليزية', 'error');
                            // استخدام الإنجليزية كافتراضي في حالة الخطأ
                            this.recognition.lang = 'en-US';
                        }
                    }
                    
                    this.translateText();
                }
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.elements.micBtn.classList.remove('recording');
                this.updateStatus('جاهز للاستخدام');
            };
            
            this.recognition.onerror = (event) => {
                this.updateStatus('خطأ في التعرف على الصوت: ' + event.error, 'error');
                this.isRecording = false;
                this.elements.micBtn.classList.remove('recording');
            };
        } else {
            this.elements.micBtn.disabled = true;
            this.updateStatus('المتصفح لا يدعم التعرف على الصوت', 'error');
        }
    }

    updateRecognitionLanguage() {
        if (!this.recognition) return;
        
        const sourceLang = this.elements.sourceLang.value;
        const langMap = {
            'ar': 'ar-SA',
            'en': 'en-US',
            'fr': 'fr-FR',
            'es': 'es-ES',
            'de': 'de-DE',
            'it': 'it-IT',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN'
        };
        
        // للاكتشاف التلقائي، نبدأ بالعربية كلغة افتراضية
        if (sourceLang === 'auto') {
            this.recognition.lang = 'ar-SA';
        } else {
            this.recognition.lang = langMap[sourceLang] || 'en-US';
        }
    }

    cleanTranscript(text) {
        if (!text) return '';
        
        // إزالة المسافات الزائدة
        text = text.trim().replace(/\s+/g, ' ');
        
        // تصحيح بعض الأخطاء الشائعة في التعرف على الصوت العربي
        const corrections = {
            'ترانسليت': 'ترجم',
            'ترانزليت': 'ترجم',
            'translate': 'ترجم',
            'هاي': 'مرحبا',
            'باي': 'وداعا',
            'اوكي': 'حسنا',
            'اوك': 'حسنا',
            'يس': 'نعم',
            'نو': 'لا'
        };
        
        // تطبيق التصحيحات
        for (const [wrong, correct] of Object.entries(corrections)) {
            const regex = new RegExp('\\b' + wrong + '\\b', 'gi');
            text = text.replace(regex, correct);
        }
        
        return text;
    }

    toggleRecording() {
        if (!this.recognition) return;
        
        if (this.isRecording) {
            this.recognition.stop();
            // إلغاء مؤقت الإيقاف التلقائي
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
                this.recordingTimeout = null;
            }
        } else {
            // تحديد لغة التعرف
            const sourceLang = this.elements.sourceLang.value;
            if (sourceLang !== 'auto') {
                const langMap = {
                    'ar': 'ar-SA',
                    'en': 'en-US',
                    'fr': 'fr-FR',
                    'es': 'es-ES',
                    'de': 'de-DE',
                    'it': 'it-IT',
                    'ja': 'ja-JP',
                    'ko': 'ko-KR',
                    'zh': 'zh-CN'
                };
                this.recognition.lang = langMap[sourceLang] || 'en-US';
            } else {
                // للاكتشاف التلقائي، نبدأ بالعربية ثم نحاول اكتشاف اللغة من النص
                this.recognition.lang = 'ar-SA';
            }
            
            // بدء التسجيل مع مؤقت إيقاف تلقائي
            this.recognition.start();
            
            // إعداد مؤقت الإيقاف التلقائي
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    this.recognition.stop();
                    this.updateStatus('تم إيقاف التسجيل تلقائياً بعد 3 دقائق');
                }
            }, this.maxRecordingTime);
        }
    }

    // إعداد نظام debounce للترجمة
    setupDebounce() {
        this.debouncedTranslate = this.debounce(this.translateText.bind(this), 500);
    }

    // وظيفة debounce لتقليل عدد استدعاءات API
    debounce(func, delay) {
        return (...args) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // تحديث عداد الأحرف
    updateCharCounter() {
        const text = this.elements.sourceText.value;
        const charCount = text.length;
        const maxChars = 5000; // الحد الأقصى للأحرف
        
        let counterElement = document.querySelector('.char-counter');
        if (!counterElement) {
            counterElement = document.createElement('div');
            counterElement.className = 'char-counter';
            this.elements.sourceText.parentElement.appendChild(counterElement);
        }
        
        counterElement.textContent = `${charCount}/${maxChars}`;
        
        if (charCount > maxChars * 0.9) {
            counterElement.style.color = '#ff6b6b';
        } else if (charCount > maxChars * 0.7) {
            counterElement.style.color = '#ffa500';
        } else {
            counterElement.style.color = '#666';
        }
    }

    async translateText() {
        const text = this.elements.sourceText.value.trim();
        if (!text) {
            this.elements.translatedText.textContent = 'الترجمة ستظهر هنا...';
            this.elements.translatedText.classList.remove('has-content');
            this.elements.speakBtn.disabled = true;
            this.elements.copyBtn.disabled = true;
            return;
        }

        this.updateStatus('جاري الترجمة...');
        this.elements.translatedText.textContent = 'جاري الترجمة...';
        this.elements.translatedText.setAttribute('placeholder', 'جاري الترجمة...');
        
        try {
            const sourceLang = this.elements.sourceLang.value;
            const targetLang = this.elements.targetLang.value;
            
            // استخدام API الترجمة الحقيقي
            let translatedText;
            try {
                translatedText = await this.useRealTranslationAPI(text, sourceLang, targetLang);
            } catch (apiError) {
                console.warn('فشل في استخدام API الحقيقي، التبديل للمحاكاة:', apiError);
                translatedText = await this.mockTranslateAPI(text, sourceLang, targetLang);
            }
            
            this.elements.translatedText.textContent = translatedText;
            this.elements.translatedText.classList.add('has-content');
            this.elements.speakBtn.disabled = false;
            this.elements.copyBtn.disabled = false;
            
            // حفظ الترجمة تلقائياً في التاريخ
            this.autoSaveTranslation(text, translatedText);
            
            this.updateStatus('تمت الترجمة بنجاح', 'success');
            
            // إضافة للمحادثة إذا كان الوضع مفعل
            if (this.conversationMode) {
                this.addConversationItem(text, 'user', translatedText);
            }
            
            // إضافة تأثير بصري
            this.elements.translatedText.classList.add('fade-in');
            setTimeout(() => {
                this.elements.translatedText.classList.remove('fade-in');
            }, 500);
            
        } catch (error) {
            this.updateStatus('خطأ في الترجمة: ' + error.message, 'error');
            this.elements.translatedText.textContent = 'حدث خطأ في الترجمة';
        } finally {
            this.elements.translatedText.setAttribute('placeholder', 'الترجمة');
        }
    }

    // استخدام خدمة ترجمة حقيقية مجانية
    async useRealTranslationAPI(text, sourceLang, targetLang) {
        // استخدام نموذج ذكي للترجمة مع تحسينات متقدمة
        try {
            // تحليل النص وتحسينه قبل الترجمة
            const analyzedText = this.analyzeAndPreprocessText(text, sourceLang);
            
            // محاولة استخدام عدة خدمات ترجمة ذكية
            const translationResults = await Promise.allSettled([
                this.translateWithMyMemory(analyzedText, sourceLang, targetLang),
                this.translateWithLibreTranslate(analyzedText, sourceLang, targetLang),
                this.translateWithMicrosoft(analyzedText, sourceLang, targetLang)
            ]);
            
            // اختيار أفضل ترجمة باستخدام خوارزمية ذكية
            const bestTranslation = this.selectBestTranslation(translationResults, text, sourceLang, targetLang);
            
            // تحسين الترجمة النهائية
            return this.postProcessTranslation(bestTranslation, targetLang);
            
        } catch (error) {
            console.warn('فشل في النموذج الذكي، استخدام الطريقة التقليدية:', error);
            return await this.fallbackTranslation(text, sourceLang, targetLang);
        }
    }

    // تحليل وتحسين النص قبل الترجمة
    analyzeAndPreprocessText(text, sourceLang) {
        let processedText = text.trim();
        
        // إزالة الأحرف غير المرغوب فيها
        processedText = processedText.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // تصحيح علامات الترقيم
        if (sourceLang === 'ar') {
            processedText = processedText.replace(/\s+([،؛؟!])/g, '$1');
            processedText = processedText.replace(/([،؛؟!])\s*/g, '$1 ');
        } else {
            processedText = processedText.replace(/\s+([,.;?!])/g, '$1');
            processedText = processedText.replace(/([,.;?!])\s*/g, '$1 ');
        }
        
        // توحيد المسافات
        processedText = processedText.replace(/\s+/g, ' ');
        
        return processedText;
    }

    // ترجمة باستخدام MyMemory مع تحسينات
    async translateWithMyMemory(text, sourceLang, targetLang) {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}&de=your-email@example.com`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'SmartTranslateApp/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error('MyMemory API failed');
        }
        
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
            return {
                text: data.responseData.translatedText,
                confidence: data.responseData.match || 0.5,
                source: 'MyMemory'
            };
        }
        
        throw new Error('No translation found');
    }

    // ترجمة باستخدام LibreTranslate
    async translateWithLibreTranslate(text, sourceLang, targetLang) {
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
            
            if (!response.ok) {
                throw new Error('LibreTranslate API failed');
            }
            
            const data = await response.json();
            return {
                text: data.translatedText,
                confidence: 0.7,
                source: 'LibreTranslate'
            };
        } catch (error) {
            throw new Error('LibreTranslate unavailable');
        }
    }

    // ترجمة باستخدام Microsoft Translator (محاكاة)
    async translateWithMicrosoft(text, sourceLang, targetLang) {
        // محاكاة خدمة Microsoft Translator
        // في التطبيق الحقيقي، يمكن استخدام Azure Translator API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    resolve({
                        text: this.generateSmartTranslation(text, sourceLang, targetLang),
                        confidence: 0.8,
                        source: 'Microsoft'
                    });
                } else {
                    reject(new Error('Microsoft API unavailable'));
                }
            }, 500);
        });
    }

    // توليد ترجمة ذكية محلية
    generateSmartTranslation(text, sourceLang, targetLang) {
        // خوارزمية ترجمة ذكية بسيطة
        const commonTranslations = {
            'ar-en': {
                'مرحبا': 'Hello',
                'شكرا': 'Thank you',
                'نعم': 'Yes',
                'لا': 'No',
                'كيف حالك': 'How are you',
                'ما اسمك': 'What is your name',
                'أين': 'Where',
                'متى': 'When',
                'كيف': 'How',
                'ماذا': 'What'
            },
            'en-ar': {
                'hello': 'مرحبا',
                'thank you': 'شكرا',
                'yes': 'نعم',
                'no': 'لا',
                'how are you': 'كيف حالك',
                'what is your name': 'ما اسمك',
                'where': 'أين',
                'when': 'متى',
                'how': 'كيف',
                'what': 'ماذا'
            }
        };
        
        const langPair = `${sourceLang}-${targetLang}`;
        const translations = commonTranslations[langPair] || {};
        
        let result = text.toLowerCase();
        for (const [source, target] of Object.entries(translations)) {
            result = result.replace(new RegExp(source, 'gi'), target);
        }
        
        return result;
    }

    // اختيار أفضل ترجمة
    selectBestTranslation(results, originalText, sourceLang, targetLang) {
        const successfulResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(translation => translation && translation.text);
        
        if (successfulResults.length === 0) {
            throw new Error('جميع خدمات الترجمة فشلت');
        }
        
        // ترتيب النتائج حسب الثقة والجودة
        successfulResults.sort((a, b) => {
            const scoreA = this.calculateTranslationScore(a, originalText, sourceLang, targetLang);
            const scoreB = this.calculateTranslationScore(b, originalText, sourceLang, targetLang);
            return scoreB - scoreA;
        });
        
        return successfulResults[0].text;
    }

    // حساب نقاط جودة الترجمة
    calculateTranslationScore(translation, originalText, sourceLang, targetLang) {
        let score = translation.confidence || 0.5;
        
        // إضافة نقاط للطول المناسب
        const lengthRatio = translation.text.length / originalText.length;
        if (lengthRatio >= 0.5 && lengthRatio <= 2.0) {
            score += 0.2;
        }
        
        // إضافة نقاط للمصدر الموثوق
        if (translation.source === 'Microsoft') {
            score += 0.1;
        } else if (translation.source === 'MyMemory') {
            score += 0.05;
        }
        
        // خصم نقاط للنصوص المكررة أو الفارغة
        if (translation.text.trim() === originalText.trim()) {
            score -= 0.3;
        }
        
        return score;
    }

    // تحسين الترجمة النهائية
    postProcessTranslation(translation, targetLang) {
        let result = translation.trim();
        
        // تصحيح علامات الترقيم حسب اللغة
        if (targetLang === 'ar') {
            result = result.replace(/[,]/g, '،');
            result = result.replace(/[;]/g, '؛');
            result = result.replace(/[?]/g, '؟');
        }
        
        // تصحيح الأحرف الكبيرة والصغيرة
        if (targetLang === 'en') {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        
        // إزالة المسافات الزائدة
        result = result.replace(/\s+/g, ' ').trim();
        
        return result;
    }

    // ترجمة احتياطية
    async fallbackTranslation(text, sourceLang, targetLang) {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('فشل في الاتصال بخدمة الترجمة');
        }
        
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        
        throw new Error('لم يتم العثور على ترجمة');
    }

    // اكتشاف اللغة التلقائي المحسن
    detectLanguage(text) {
        if (!text || text.trim().length === 0) {
            return 'en'; // افتراضي
        }
        
        text = text.trim();
        const textLength = text.length;
        
        // عدادات للغات المختلفة
        const languageScores = {
            ar: 0,
            en: 0,
            zh: 0,
            ja: 0,
            ko: 0,
            fr: 0,
            de: 0,
            es: 0,
            it: 0
        };
        
        // فحص الأحرف العربية مع وزن أعلى
        const arabicChars = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
        if (arabicChars) {
            languageScores.ar += (arabicChars.length / textLength) * 100;
        }
        
        // فحص الأحرف الصينية
        const chineseChars = text.match(/[\u4e00-\u9fff]/g);
        if (chineseChars) {
            languageScores.zh += (chineseChars.length / textLength) * 100;
        }
        
        // فحص الأحرف اليابانية
        const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
        if (japaneseChars) {
            languageScores.ja += (japaneseChars.length / textLength) * 100;
        }
        
        // فحص الأحرف الكورية
        const koreanChars = text.match(/[\uac00-\ud7af]/g);
        if (koreanChars) {
            languageScores.ko += (koreanChars.length / textLength) * 100;
        }
        
        // فحص الكلمات العربية الشائعة
        const arabicWords = ['في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'كان', 'كانت', 'يكون', 'تكون', 'مع', 'عند', 'بعد', 'قبل', 'أن', 'إن', 'لا', 'نعم'];
        arabicWords.forEach(word => {
            const regex = new RegExp('\\b' + word + '\\b', 'g');
            const matches = text.match(regex);
            if (matches) {
                languageScores.ar += matches.length * 5;
            }
        });
        
        // فحص الكلمات الإنجليزية الشائعة
        const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'on', 'are', 'you', 'this', 'be', 'at', 'have', 'hello', 'world', 'time', 'good', 'can', 'will', 'would', 'could', 'should'];
        englishWords.forEach(word => {
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            const matches = text.match(regex);
            if (matches) {
                languageScores.en += matches.length * 3;
            }
        });
        
        // فحص الكلمات الفرنسية الشائعة
        const frenchWords = ['le', 'de', 'et', 'un', 'à', 'être', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'bonjour', 'merci', 'oui', 'non'];
        frenchWords.forEach(word => {
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            const matches = text.match(regex);
            if (matches) {
                languageScores.fr += matches.length * 3;
            }
        });
        
        // إضافة نقاط للأحرف اللاتينية (للغات الأوروبية)
        const latinChars = text.match(/[a-zA-Z]/g);
        if (latinChars) {
            const latinRatio = latinChars.length / textLength;
            languageScores.en += latinRatio * 10;
            languageScores.fr += latinRatio * 8;
            languageScores.de += latinRatio * 8;
            languageScores.es += latinRatio * 8;
            languageScores.it += latinRatio * 8;
        }
        
        // العثور على اللغة ذات أعلى نقاط
        let detectedLang = 'en';
        let maxScore = 0;
        
        for (const [lang, score] of Object.entries(languageScores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
            }
        }
        
        // إذا لم يتم اكتشاف أي لغة بوضوح، استخدم الإنجليزية كافتراضي
        if (maxScore < 5) {
            detectedLang = 'en';
        }
        
        console.log('Language detection scores:', languageScores);
        console.log('Detected language:', detectedLang);
        
        return detectedLang;
    }

    // الحصول على اسم اللغة بالعربية
    getLanguageName(langCode) {
        const languageNames = {
            'ar': 'العربية',
            'en': 'الإنجليزية',
            'fr': 'الفرنسية',
            'es': 'الإسبانية',
            'de': 'الألمانية',
            'it': 'الإيطالية',
            'ja': 'اليابانية',
            'ko': 'الكورية',
            'zh': 'الصينية'
        };
        return languageNames[langCode] || langCode;
    }

    // محاكاة API الترجمة - في التطبيق الحقيقي ستستخدم خدمة ترجمة حقيقية
    async mockTranslateAPI(text, sourceLang, targetLang) {
        // اكتشاف اللغة التلقائي إذا كانت مطلوبة
        if (sourceLang === 'auto') {
            try {
                sourceLang = this.detectLanguage(text);
                console.log(`تم اكتشاف اللغة تلقائياً: ${sourceLang}`);
            } catch (error) {
                console.error('خطأ في اكتشاف اللغة أثناء الترجمة:', error);
                sourceLang = 'en'; // استخدام الإنجليزية كافتراضي
                this.updateStatus('خطأ في اكتشاف اللغة، سيتم استخدام الإنجليزية', 'error');
            }
        }
        
        // محاولة استخدام خدمة ترجمة حقيقية أولاً
        try {
            const realTranslation = await this.useRealTranslationAPI(text, sourceLang, targetLang);
            if (realTranslation && realTranslation !== text) {
                return realTranslation;
            }
        } catch (error) {
            console.log('فشل في استخدام خدمة الترجمة الحقيقية، سيتم استخدام القاموس المحلي');
        }
        
        // محاكاة تأخير الشبكة
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // قاموس ترجمة شامل ومحسن
        const translations = {
            // العربية إلى الإنجليزية
            'مرحبا': { en: 'Hello', fr: 'Bonjour', es: 'Hola', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
            'مرحباً': { en: 'Hello', fr: 'Bonjour', es: 'Hola', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
            'أهلا': { en: 'Hello', fr: 'Bonjour', es: 'Hola', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
            'كيف حالك': { en: 'How are you', fr: 'Comment allez-vous', es: 'Cómo estás', de: 'Wie geht es dir', it: 'Come stai', ja: '元気ですか', ko: '어떻게 지내세요', zh: '你好吗' },
            'شكرا': { en: 'Thank you', fr: 'Merci', es: 'Gracias', de: 'Danke', it: 'Grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢' },
            'شكراً': { en: 'Thank you', fr: 'Merci', es: 'Gracias', de: 'Danke', it: 'Grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢' },
            'شكرا لك': { en: 'Thank you', fr: 'Merci beaucoup', es: 'Muchas gracias', de: 'Vielen Dank', it: 'Grazie mille', ja: 'ありがとうございます', ko: '고맙습니다', zh: '谢谢你' },
            'بكم هذا': { en: 'How much is this', fr: 'Combien ça coûte', es: 'Cuánto cuesta esto', de: 'Wie viel kostet das', it: 'Quanto costa', ja: 'いくらですか', ko: '얼마예요', zh: '这个多少钱' },
            'أين الفندق': { en: 'Where is the hotel', fr: 'Où est l\'hôtel', es: 'Dónde está el hotel', de: 'Wo ist das Hotel', it: 'Dov\'è l\'hotel', ja: 'ホテルはどこですか', ko: '호텔이 어디에 있나요', zh: '酒店在哪里' },
            'صباح الخير': { en: 'Good morning', fr: 'Bonjour', es: 'Buenos días', de: 'Guten Morgen', it: 'Buongiorno', ja: 'おはようございます', ko: '좋은 아침', zh: '早上好' },
            'مساء الخير': { en: 'Good evening', fr: 'Bonsoir', es: 'Buenas tardes', de: 'Guten Abend', it: 'Buonasera', ja: 'こんばんは', ko: '좋은 저녁', zh: '晚上好' },
            'تصبح على خير': { en: 'Good night', fr: 'Bonne nuit', es: 'Buenas noches', de: 'Gute Nacht', it: 'Buonanotte', ja: 'おやすみなさい', ko: '잘 자요', zh: '晚安' },
            'من فضلك': { en: 'Please', fr: 'S\'il vous plaît', es: 'Por favor', de: 'Bitte', it: 'Per favore', ja: 'お願いします', ko: '부탁합니다', zh: '请' },
            'عفواً': { en: 'Excuse me', fr: 'Excusez-moi', es: 'Disculpe', de: 'Entschuldigung', it: 'Scusi', ja: 'すみません', ko: '실례합니다', zh: '不好意思' },
            'آسف': { en: 'Sorry', fr: 'Désolé', es: 'Lo siento', de: 'Es tut mir leid', it: 'Mi dispiace', ja: 'ごめんなさい', ko: '죄송합니다', zh: '对不起' },
            'نعم': { en: 'Yes', fr: 'Oui', es: 'Sí', de: 'Ja', it: 'Sì', ja: 'はい', ko: '네', zh: '是的' },
            'لا': { en: 'No', fr: 'Non', es: 'No', de: 'Nein', it: 'No', ja: 'いいえ', ko: '아니요', zh: '不' },
            'أين': { en: 'Where', fr: 'Où', es: 'Dónde', de: 'Wo', it: 'Dove', ja: 'どこ', ko: '어디', zh: '哪里' },
            'متى': { en: 'When', fr: 'Quand', es: 'Cuándo', de: 'Wann', it: 'Quando', ja: 'いつ', ko: '언제', zh: '什么时候' },
            'ماذا': { en: 'What', fr: 'Quoi', es: 'Qué', de: 'Was', it: 'Cosa', ja: '何', ko: '무엇', zh: '什么' },
            'كيف': { en: 'How', fr: 'Comment', es: 'Cómo', de: 'Wie', it: 'Come', ja: 'どのように', ko: '어떻게', zh: '怎么' },
            'لماذا': { en: 'Why', fr: 'Pourquoi', es: 'Por qué', de: 'Warum', it: 'Perché', ja: 'なぜ', ko: '왜', zh: '为什么' },
            'من': { en: 'Who', fr: 'Qui', es: 'Quién', de: 'Wer', it: 'Chi', ja: '誰', ko: '누구', zh: '谁' },
            'أريد': { en: 'I want', fr: 'Je veux', es: 'Quiero', de: 'Ich möchte', it: 'Voglio', ja: '欲しいです', ko: '원합니다', zh: '我想要' },
            'أحتاج': { en: 'I need', fr: 'J\'ai besoin', es: 'Necesito', de: 'Ich brauche', it: 'Ho bisogno', ja: '必要です', ko: '필요합니다', zh: '我需要' },
            'أحب': { en: 'I love', fr: 'J\'aime', es: 'Me gusta', de: 'Ich liebe', it: 'Amo', ja: '愛しています', ko: '사랑합니다', zh: '我爱' },
            'لا أفهم': { en: 'I don\'t understand', fr: 'Je ne comprends pas', es: 'No entiendo', de: 'Ich verstehe nicht', it: 'Non capisco', ja: '分かりません', ko: '이해하지 못합니다', zh: '我不明白' },
            'هل تتحدث العربية': { en: 'Do you speak Arabic', fr: 'Parlez-vous arabe', es: 'Hablas árabe', de: 'Sprechen Sie Arabisch', it: 'Parli arabo', ja: 'アラビア語を話しますか', ko: '아랍어를 하시나요', zh: '你会说阿拉伯语吗' },
            'أين الحمام': { en: 'Where is the bathroom', fr: 'Où sont les toilettes', es: 'Dónde está el baño', de: 'Wo ist die Toilette', it: 'Dov\'è il bagno', ja: 'トイレはどこですか', ko: '화장실이 어디에 있나요', zh: '厕所在哪里' },
            'كم الساعة': { en: 'What time is it', fr: 'Quelle heure est-il', es: 'Qué hora es', de: 'Wie spät ist es', it: 'Che ore sono', ja: '何時ですか', ko: '몇 시예요', zh: '几点了' },
            'أين المطار': { en: 'Where is the airport', fr: 'Où est l\'aéroport', es: 'Dónde está el aeropuerto', de: 'Wo ist der Flughafen', it: 'Dov\'è l\'aeroporto', ja: '空港はどこですか', ko: '공항이 어디에 있나요', zh: '机场在哪里' },
            'أين المحطة': { en: 'Where is the station', fr: 'Où est la gare', es: 'Dónde está la estación', de: 'Wo ist der Bahnhof', it: 'Dov\'è la stazione', ja: '駅はどこですか', ko: '역이 어디에 있나요', zh: '车站在哪里' },
            'أين المطعم': { en: 'Where is the restaurant', fr: 'Où est le restaurant', es: 'Dónde está el restaurante', de: 'Wo ist das Restaurant', it: 'Dov\'è il ristorante', ja: 'レストランはどこですか', ko: '레스토랑이 어디에 있나요', zh: '餐厅在哪里' },
            'الحساب من فضلك': { en: 'The bill please', fr: 'L\'addition s\'il vous plaît', es: 'La cuenta por favor', de: 'Die Rechnung bitte', it: 'Il conto per favore', ja: 'お会計をお願いします', ko: '계산서 주세요', zh: '请结账' },
            'أنا جائع': { en: 'I am hungry', fr: 'J\'ai faim', es: 'Tengo hambre', de: 'Ich bin hungrig', it: 'Ho fame', ja: 'お腹が空いています', ko: '배고파요', zh: '我饿了' },
            'أنا عطشان': { en: 'I am thirsty', fr: 'J\'ai soif', es: 'Tengo sed', de: 'Ich bin durstig', it: 'Ho sete', ja: '喉が渇いています', ko: '목말라요', zh: '我渴了' },
            'ماء من فضلك': { en: 'Water please', fr: 'De l\'eau s\'il vous plaît', es: 'Agua por favor', de: 'Wasser bitte', it: 'Acqua per favore', ja: '水をお願いします', ko: '물 주세요', zh: '请给我水' },
            'قهوة من فضلك': { en: 'Coffee please', fr: 'Café s\'il vous plaît', es: 'Café por favor', de: 'Kaffee bitte', it: 'Caffè per favore', ja: 'コーヒーをお願いします', ko: '커피 주세요', zh: '请给我咖啡' },
            'شاي من فضلك': { en: 'Tea please', fr: 'Thé s\'il vous plaît', es: 'Té por favor', de: 'Tee bitte', it: 'Tè per favore', ja: '紅茶をお願いします', ko: '차 주세요', zh: '请给我茶' },
            
            // الإنجليزية إلى العربية
            'hello': { ar: 'مرحبا', fr: 'Bonjour', es: 'Hola', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
            'hi': { ar: 'مرحبا', fr: 'Salut', es: 'Hola', de: 'Hallo', it: 'Ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好' },
            'good morning': { ar: 'صباح الخير', fr: 'Bonjour', es: 'Buenos días', de: 'Guten Morgen', it: 'Buongiorno', ja: 'おはようございます', ko: '좋은 아침', zh: '早上好' },
            'good evening': { ar: 'مساء الخير', fr: 'Bonsoir', es: 'Buenas tardes', de: 'Guten Abend', it: 'Buonasera', ja: 'こんばんは', ko: '좋은 저녁', zh: '晚上好' },
            'good night': { ar: 'تصبح على خير', fr: 'Bonne nuit', es: 'Buenas noches', de: 'Gute Nacht', it: 'Buonanotte', ja: 'おやすみなさい', ko: '잘 자요', zh: '晚安' },
            'thank you': { ar: 'شكرا لك', fr: 'Merci', es: 'Gracias', de: 'Danke', it: 'Grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢' },
            'thanks': { ar: 'شكرا', fr: 'Merci', es: 'Gracias', de: 'Danke', it: 'Grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢' },
            'how are you': { ar: 'كيف حالك', fr: 'Comment allez-vous', es: 'Cómo estás', de: 'Wie geht es dir', it: 'Come stai', ja: '元気ですか', ko: '어떻게 지내세요', zh: '你好吗' },
            'please': { ar: 'من فضلك', fr: 'S\'il vous plaît', es: 'Por favor', de: 'Bitte', it: 'Per favore', ja: 'お願いします', ko: '부탁합니다', zh: '请' },
            'excuse me': { ar: 'عفواً', fr: 'Excusez-moi', es: 'Disculpe', de: 'Entschuldigung', it: 'Scusi', ja: 'すみません', ko: '실례합니다', zh: '不好意思' },
            'sorry': { ar: 'آسف', fr: 'Désolé', es: 'Lo siento', de: 'Es tut mir leid', it: 'Mi dispiace', ja: 'ごめんなさい', ko: '죄송합니다', zh: '对不起' },
            'yes': { ar: 'نعم', fr: 'Oui', es: 'Sí', de: 'Ja', it: 'Sì', ja: 'はい', ko: '네', zh: '是的' },
            'no': { ar: 'لا', fr: 'Non', es: 'No', de: 'Nein', it: 'No', ja: 'いいえ', ko: '아니요', zh: '不' },
            'where': { ar: 'أين', fr: 'Où', es: 'Dónde', de: 'Wo', it: 'Dove', ja: 'どこ', ko: '어디', zh: '哪里' },
            'when': { ar: 'متى', fr: 'Quand', es: 'Cuándo', de: 'Wann', it: 'Quando', ja: 'いつ', ko: '언제', zh: '什么时候' },
            'what': { ar: 'ماذا', fr: 'Quoi', es: 'Qué', de: 'Was', it: 'Cosa', ja: '何', ko: '무엇', zh: '什么' },
            'how': { ar: 'كيف', fr: 'Comment', es: 'Cómo', de: 'Wie', it: 'Come', ja: 'どのように', ko: '어떻게', zh: '怎么' },
            'why': { ar: 'لماذا', fr: 'Pourquoi', es: 'Por qué', de: 'Warum', it: 'Perché', ja: 'なぜ', ko: '왜', zh: '为什么' },
            'who': { ar: 'من', fr: 'Qui', es: 'Quién', de: 'Wer', it: 'Chi', ja: '誰', ko: '누구', zh: '谁' },
            'i want': { ar: 'أريد', fr: 'Je veux', es: 'Quiero', de: 'Ich möchte', it: 'Voglio', ja: '欲しいです', ko: '원합니다', zh: '我想要' },
            'i need': { ar: 'أحتاج', fr: 'J\'ai besoin', es: 'Necesito', de: 'Ich brauche', it: 'Ho bisogno', ja: '必要です', ko: '필요합니다', zh: '我需要' },
            'i love': { ar: 'أحب', fr: 'J\'aime', es: 'Me gusta', de: 'Ich liebe', it: 'Amo', ja: '愛しています', ko: '사랑합니다', zh: '我爱' },
            'i don\'t understand': { ar: 'لا أفهم', fr: 'Je ne comprends pas', es: 'No entiendo', de: 'Ich verstehe nicht', it: 'Non capisco', ja: '分かりません', ko: '이해하지 못합니다', zh: '我不明白' },
            'where is the hotel': { ar: 'أين الفندق', fr: 'Où est l\'hôtel', es: 'Dónde está el hotel', de: 'Wo ist das Hotel', it: 'Dov\'è l\'hotel', ja: 'ホテルはどこですか', ko: '호텔이 어디에 있나요', zh: '酒店在哪里' },
            'where is the bathroom': { ar: 'أين الحمام', fr: 'Où sont les toilettes', es: 'Dónde está el baño', de: 'Wo ist die Toilette', it: 'Dov\'è il bagno', ja: 'トイレはどこですか', ko: '화장실이 어디에 있나요', zh: '厕所在哪里' },
            'how much is this': { ar: 'بكم هذا', fr: 'Combien ça coûte', es: 'Cuánto cuesta esto', de: 'Wie viel kostet das', it: 'Quanto costa', ja: 'いくらですか', ko: '얼마예요', zh: '这个多少钱' },
            'what time is it': { ar: 'كم الساعة', fr: 'Quelle heure est-il', es: 'Qué hora es', de: 'Wie spät ist es', it: 'Che ore sono', ja: '何時ですか', ko: '몇 시예요', zh: '几点了' },
            'where is the airport': { ar: 'أين المطار', fr: 'Où est l\'aéroport', es: 'Dónde está el aeropuerto', de: 'Wo ist der Flughafen', it: 'Dov\'è l\'aeroporto', ja: '空港はどこですか', ko: '공항이 어디에 있나요', zh: '机场在哪里' },
            'where is the restaurant': { ar: 'أين المطعم', fr: 'Où est le restaurant', es: 'Dónde está el restaurante', de: 'Wo ist das Restaurant', it: 'Dov\'è il ristorante', ja: 'レストランはどこですか', ko: '레스토랑이 어디에 있나요', zh: '餐厅在哪里' },
            'the bill please': { ar: 'الحساب من فضلك', fr: 'L\'addition s\'il vous plaît', es: 'La cuenta por favor', de: 'Die Rechnung bitte', it: 'Il conto per favore', ja: 'お会計をお願いします', ko: '계산서 주세요', zh: '请结账' },
            'i am hungry': { ar: 'أنا جائع', fr: 'J\'ai faim', es: 'Tengo hambre', de: 'Ich bin hungrig', it: 'Ho fame', ja: 'お腹が空いています', ko: '배고파요', zh: '我饿了' },
            'water please': { ar: 'ماء من فضلك', fr: 'De l\'eau s\'il vous plaît', es: 'Agua por favor', de: 'Wasser bitte', it: 'Acqua per favore', ja: '水をお願いします', ko: '물 주세요', zh: '请给我水' },
            'coffee please': { ar: 'قهوة من فضلك', fr: 'Café s\'il vous plaît', es: 'Café por favor', de: 'Kaffee bitte', it: 'Caffè per favore', ja: 'コーヒーをお願いします', ko: '커피 주세요', zh: '请给我咖啡' }
        };
        
        const lowerText = text.toLowerCase().trim();
        
        // البحث عن ترجمة مباشرة
        if (translations[lowerText] && translations[lowerText][targetLang]) {
            return translations[lowerText][targetLang];
        }
        
        // البحث الجزئي المحسن
        for (const [key, value] of Object.entries(translations)) {
            if (lowerText.includes(key.toLowerCase()) && value[targetLang]) {
                return value[targetLang];
            }
        }
        
        // البحث بالكلمات المفردة
        const words = lowerText.split(' ');
        for (const word of words) {
            if (translations[word] && translations[word][targetLang]) {
                return translations[word][targetLang];
            }
        }
        
        // إذا لم توجد ترجمة، أعد النص الأصلي مع تحسين بسيط
        // محاولة ترجمة بسيطة للكلمات الشائعة
        const commonWords = {
            'hello': { ar: 'مرحبا', en: 'hello' },
            'مرحبا': { en: 'hello', ar: 'مرحبا' },
            'good': { ar: 'جيد', en: 'good' },
            'جيد': { en: 'good', ar: 'جيد' },
            'bad': { ar: 'سيء', en: 'bad' },
            'سيء': { en: 'bad', ar: 'سيء' },
            'big': { ar: 'كبير', en: 'big' },
            'كبير': { en: 'big', ar: 'كبير' },
            'small': { ar: 'صغير', en: 'small' },
            'صغير': { en: 'small', ar: 'صغير' },
            'hot': { ar: 'حار', en: 'hot' },
            'حار': { en: 'hot', ar: 'حار' },
            'cold': { ar: 'بارد', en: 'cold' },
            'بارد': { en: 'cold', ar: 'بارد' },
            'new': { ar: 'جديد', en: 'new' },
            'جديد': { en: 'new', ar: 'جديد' },
            'old': { ar: 'قديم', en: 'old' },
            'قديم': { en: 'old', ar: 'قديم' },
            'fast': { ar: 'سريع', en: 'fast' },
            'سريع': { en: 'fast', ar: 'سريع' },
            'slow': { ar: 'بطيء', en: 'slow' },
            'بطيء': { en: 'slow', ar: 'بطيء' }
        };
        
        // محاولة أخيرة مع الكلمات الشائعة
        if (commonWords[lowerText] && commonWords[lowerText][targetLang]) {
            return commonWords[lowerText][targetLang];
        }
        
        // إذا لم توجد ترجمة، أعد النص الأصلي
        return text;
    }

    // وظيفة التشغيل الصوتي المحسنة
    speakTranslation() {
        const text = this.elements.translatedText.textContent;
        if (!text || text === 'الترجمة ستظهر هنا...' || text === 'جاري الترجمة...') {
            this.updateStatus('لا يوجد نص للتشغيل', 'error');
            return;
        }
        
        // إيقاف أي تشغيل صوتي حالي
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
            this.updateStatus('تم إيقاف التشغيل الصوتي');
            return;
        }
        
        // التحقق من دعم التشغيل الصوتي
        if (!this.synthesis) {
            this.updateStatus('التشغيل الصوتي غير مدعوم في هذا المتصفح', 'error');
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = this.elements.targetLang.value;
        
        // تحديد اللغة للنطق مع دعم أفضل للهجات
        const langMap = {
            'ar': 'ar-SA',
            'en': 'en-US',
            'fr': 'fr-FR',
            'es': 'es-ES',
            'de': 'de-DE',
            'it': 'it-IT',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'zh': 'zh-CN',
            'pt': 'pt-BR',
            'ru': 'ru-RU',
            'hi': 'hi-IN',
            'tr': 'tr-TR'
        };
        
        utterance.lang = langMap[targetLang] || 'en-US';
        
        // تحسين إعدادات النطق حسب اللغة
        if (targetLang === 'ar') {
            utterance.rate = 0.7; // أبطأ للعربية
            utterance.pitch = 1.1;
        } else if (targetLang === 'zh' || targetLang === 'ja' || targetLang === 'ko') {
            utterance.rate = 0.8; // متوسط للغات الآسيوية
            utterance.pitch = 1.0;
        } else {
            utterance.rate = 0.9; // عادي للغات الأخرى
            utterance.pitch = 1.0;
        }
        
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            this.elements.speakBtn.classList.add('speaking');
            this.updateStatus('جاري نطق الترجمة...');
        };
        
        utterance.onend = () => {
            this.elements.speakBtn.classList.remove('speaking');
            this.updateStatus('انتهى التشغيل الصوتي');
        };
        
        utterance.onerror = (event) => {
            console.error('خطأ في التشغيل الصوتي:', event.error);
            this.updateStatus('خطأ في نطق النص: ' + event.error, 'error');
            this.elements.speakBtn.classList.remove('speaking');
        };
        
        utterance.onpause = () => {
            this.updateStatus('تم إيقاف التشغيل الصوتي مؤقتاً');
        };
        
        utterance.onresume = () => {
            this.updateStatus('تم استئناف التشغيل الصوتي');
        };
        
        try {
            this.synthesis.speak(utterance);
        } catch (error) {
            console.error('خطأ في بدء التشغيل الصوتي:', error);
            this.updateStatus('فشل في بدء التشغيل الصوتي', 'error');
            this.elements.speakBtn.classList.remove('speaking');
        }
    }

    // وظيفة النسخ المحسنة
    copyTranslation() {
        const text = this.elements.translatedText.textContent;
        if (!text || text === 'الترجمة ستظهر هنا...' || text === 'جاري الترجمة...') {
            this.updateStatus('لا يوجد نص للنسخ', 'error');
            return;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                this.updateStatus('تم نسخ النص بنجاح ✓', 'success');
                // تأثير بصري للزر
                this.elements.copyBtn.classList.add('copied');
                const originalText = this.elements.copyBtn.textContent;
                this.elements.copyBtn.textContent = 'تم النسخ ✓';
                setTimeout(() => {
                    this.elements.copyBtn.textContent = originalText;
                    this.elements.copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(() => {
                this.fallbackCopyText(text);
            });
        } else {
            this.fallbackCopyText(text);
        }
    }

    // وظيفة النسخ البديلة للمتصفحات القديمة
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.updateStatus('تم نسخ النص بنجاح ✓', 'success');
                this.elements.copyBtn.classList.add('copied');
                const originalText = this.elements.copyBtn.textContent;
                this.elements.copyBtn.textContent = 'تم النسخ ✓';
                setTimeout(() => {
                    this.elements.copyBtn.textContent = originalText;
                    this.elements.copyBtn.classList.remove('copied');
                }, 2000);
            } else {
                this.updateStatus('فشل في نسخ النص', 'error');
            }
        } catch (err) {
            this.updateStatus('فشل في نسخ النص', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    }

    clearText() {
        this.elements.sourceText.value = '';
        this.elements.translatedText.textContent = 'الترجمة ستظهر هنا...';
        this.elements.translatedText.classList.remove('has-content');
        this.elements.speakBtn.disabled = true;
        this.elements.copyBtn.disabled = true;
        this.updateStatus('تم مسح النص');
    }

    swapLanguages() {
        const sourceLang = this.elements.sourceLang.value;
        const targetLang = this.elements.targetLang.value;
        
        if (sourceLang === 'auto') {
            this.updateStatus('لا يمكن تبديل اللغات مع الاكتشاف التلقائي', 'error');
            return;
        }
        
        this.elements.sourceLang.value = targetLang;
        this.elements.targetLang.value = sourceLang;
        
        // تبديل النصوص أيضاً
        const sourceText = this.elements.sourceText.value;
        const translatedText = this.elements.translatedText.textContent;
        
        if (translatedText && translatedText !== 'الترجمة ستظهر هنا...' && translatedText !== 'جاري الترجمة...') {
            this.elements.sourceText.value = translatedText;
            this.translateText();
        }
        
        this.updateStatus('تم تبديل اللغات');
    }

    addToFavorites() {
        const text = this.elements.sourceText.value.trim();
        if (!text) {
            this.updateStatus('يرجى إدخال نص لإضافته للمفضلة', 'error');
            return;
        }
        
        if (this.favorites.includes(text)) {
            this.updateStatus('النص موجود بالفعل في المفضلة', 'error');
            return;
        }
        
        this.favorites.unshift(text); // إضافة في المقدمة
        
        // الحد الأقصى للمفضلة
        const maxFavorites = this.getMaxFavorites();
        if (this.favorites.length > maxFavorites) {
            this.favorites = this.favorites.slice(0, maxFavorites);
        }
        
        this.saveFavorites();
        this.loadFavoritesToDOM();
        this.updateStatus('تم إضافة النص للمفضلة', 'success');
    }
    
    // حفظ الترجمة الناجحة تلقائياً
    autoSaveTranslation(sourceText, translatedText) {
        if (!this.getAutoSaveSetting()) return;
        
        const translationPair = {
            source: sourceText.trim(),
            translation: translatedText.trim(),
            timestamp: new Date().toISOString(),
            fromLang: this.elements.sourceLang.value,
            toLang: this.elements.targetLang.value
        };
        
        let translationHistory = this.getTranslationHistory();
        
        // تجنب التكرار
        const exists = translationHistory.some(item => 
            item.source === translationPair.source && 
            item.translation === translationPair.translation
        );
        
        if (!exists) {
            translationHistory.unshift(translationPair);
            
            // الحد الأقصى لتاريخ الترجمة
            const maxHistory = 100;
            if (translationHistory.length > maxHistory) {
                translationHistory = translationHistory.slice(0, maxHistory);
            }
            
            localStorage.setItem('translationHistory', JSON.stringify(translationHistory));
        }
    }
    
    getTranslationHistory() {
        try {
            return JSON.parse(localStorage.getItem('translationHistory')) || [];
        } catch {
            return [];
        }
    }
    
    getMaxFavorites() {
        return parseInt(localStorage.getItem('maxFavorites')) || 50;
    }
    
    getAutoSaveSetting() {
        return localStorage.getItem('autoSaveTranslations') !== 'false';
    }
    
    setMaxFavorites(max) {
        localStorage.setItem('maxFavorites', max.toString());
    }
    
    setAutoSaveSetting(enabled) {
        localStorage.setItem('autoSaveTranslations', enabled.toString());
    }

    loadFavorites() {
        try {
            const saved = JSON.parse(localStorage.getItem('voiceTranslateFavorites'));
            if (saved && saved.length > 0) {
                return saved;
            }
        } catch (e) {
            console.log('Error loading favorites:', e);
        }
        
        // العبارات الافتراضية المحسنة والمصنفة
        return [
            // تحيات أساسية
            'مرحباً، كيف حالك؟',
            'أهلاً وسهلاً',
            'صباح الخير',
            'مساء الخير',
            'تصبح على خير',
            'شكراً لك',
            'عفواً',
            'آسف',
            'مع السلامة',
            
            // سفر وفنادق
            'أين الفندق؟',
            'أريد حجز غرفة',
            'كم تكلفة الليلة الواحدة؟',
            'هل يوجد واي فاي مجاني؟',
            'أين المطار؟',
            'متى يغادر القطار؟',
            'أين محطة الحافلات؟',
            'أحتاج تاكسي',
            
            // مطاعم وطعام
            'أريد طاولة لشخصين',
            'ما هو الطبق المميز اليوم؟',
            'هل يوجد طعام نباتي؟',
            'الحساب من فضلك',
            'هل يمكنني رؤية القائمة؟',
            'أريد كوب ماء',
            'هذا لذيذ جداً',
            
            // تسوق
            'بكم هذا؟',
            'هل يمكن تخفيض السعر؟',
            'أين يمكنني الدفع؟',
            'هل تقبلون البطاقة الائتمانية؟',
            'أريد إرجاع هذا',
            'ما هو المقاس المتوفر؟',
            
            // طوارئ ومساعدة
            'أحتاج مساعدة',
            'أين أقرب مستشفى؟',
            'اتصل بالشرطة',
            'فقدت جواز سفري',
            'أين السفارة؟',
            'لا أتكلم اللغة المحلية',
            
            // اتجاهات
            'أين هذا المكان؟',
            'كيف أصل إلى...؟',
            'هل هذا قريب من هنا؟',
            'يمين أم يسار؟',
            'كم يستغرق الوصول؟',
            'هل يمكنك إرشادي؟'
        ];
    }

    saveFavorites() {
        localStorage.setItem('voiceTranslateFavorites', JSON.stringify(this.favorites));
    }

    loadFavoritesToDOM() {
        this.elements.favoritesList.innerHTML = '';
        
        // إضافة شريط البحث
        const searchContainer = document.createElement('div');
        searchContainer.className = 'favorites-search-container';
        searchContainer.innerHTML = `
            <input type="text" id="favorites-search" placeholder="ابحث في العبارات المفضلة..." class="favorites-search">
            <button id="clear-search" class="clear-search-btn tooltip" data-tooltip="مسح البحث">✕</button>
        `;
        this.elements.favoritesList.appendChild(searchContainer);
        
        // إضافة أزرار التصنيف
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-filters';
        categoryContainer.innerHTML = `
            <button class="category-btn active" data-category="all">الكل</button>
            <button class="category-btn" data-category="greetings">تحيات</button>
            <button class="category-btn" data-category="travel">سفر</button>
            <button class="category-btn" data-category="food">طعام</button>
            <button class="category-btn" data-category="shopping">تسوق</button>
            <button class="category-btn" data-category="emergency">طوارئ</button>
            <button class="category-btn" data-category="directions">اتجاهات</button>
        `;
        this.elements.favoritesList.appendChild(categoryContainer);
        
        // إضافة العبارات
        const favoritesContainer = document.createElement('div');
        favoritesContainer.className = 'favorites-items-container';
        
        this.favorites.forEach((text, index) => {
            const item = document.createElement('div');
            item.className = 'favorite-item slide-in';
            item.dataset.text = text;
            item.dataset.category = this.getCategoryForText(text);
            item.innerHTML = `
                <span class="favorite-text">${text}</span>
                <div class="favorite-actions">
                    <button class="use-favorite tooltip" data-tooltip="استخدم هذه الترجمة">استخدم</button>
                    <button class="remove-favorite tooltip" data-tooltip="حذف من المفضلة" onclick="app.removeFavorite(${index})">حذف</button>
                </div>
            `;
            favoritesContainer.appendChild(item);
        });
        
        this.elements.favoritesList.appendChild(favoritesContainer);
        
        // إضافة مستمعي الأحداث للبحث والتصنيف
        this.setupFavoritesInteractions();
    }

    removeFavorite(index) {
        this.favorites.splice(index, 1);
        this.saveFavorites();
        this.loadFavoritesToDOM();
        this.updateStatus('تم حذف العبارة من المفضلة');
    }
    
    getCategoryForText(text) {
        const categories = {
            greetings: ['مرحب', 'أهلاً', 'صباح', 'مساء', 'تصبح', 'شكر', 'عفو', 'آسف', 'سلامة'],
            travel: ['فندق', 'مطار', 'قطار', 'حافلة', 'تاكسي', 'حجز', 'غرفة', 'واي فاي'],
            food: ['طاولة', 'طبق', 'نباتي', 'حساب', 'قائمة', 'ماء', 'لذيذ', 'مطعم'],
            shopping: ['بكم', 'سعر', 'دفع', 'بطاقة', 'إرجاع', 'مقاس', 'تسوق'],
            emergency: ['مساعدة', 'مستشفى', 'شرطة', 'جواز', 'سفارة', 'لغة'],
            directions: ['مكان', 'أصل', 'قريب', 'يمين', 'يسار', 'وقت', 'إرشاد']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        return 'other';
    }
    
    setupFavoritesInteractions() {
        const searchInput = document.getElementById('favorites-search');
        const clearSearchBtn = document.getElementById('clear-search');
        const categoryBtns = document.querySelectorAll('.category-btn');
        const favoriteItems = document.querySelectorAll('.favorite-item');
        
        // البحث في العبارات
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                favoriteItems.forEach(item => {
                    const text = item.dataset.text.toLowerCase();
                    if (text.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
        
        // مسح البحث
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                favoriteItems.forEach(item => {
                    item.style.display = 'flex';
                });
            });
        }
        
        // تصنيف العبارات
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // إزالة الفئة النشطة من جميع الأزرار
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                favoriteItems.forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }



    // وظيفة التصحيح الإملائي التلقائي
    autoSpellCheck() {
        const text = this.elements.sourceText.value.trim();
        if (!text) {
            return;
        }

        // قاموس التصحيح الإملائي للأخطاء الشائعة
        const corrections = {
            // أخطاء عربية شائعة
            'اهلا': 'أهلاً',
            'مرحبا': 'مرحباً',
            'شكرا': 'شكراً',
            'اسف': 'آسف',
            'انا': 'أنا',
            'انت': 'أنت',
            'هذا': 'هذا',
            'هذه': 'هذه',
            'التي': 'التي',
            'الذي': 'الذي',
            'ايضا': 'أيضاً',
            'لكن': 'لكن',
            'كيف': 'كيف',
            'ماذا': 'ماذا',
            'متى': 'متى',
            'اين': 'أين',
            'لماذا': 'لماذا',
            'كم': 'كم',
            'من': 'من',
            'الى': 'إلى',
            'على': 'على',
            'في': 'في',
            'مع': 'مع',
            'عن': 'عن',
            'بعد': 'بعد',
            'قبل': 'قبل',
            'تحت': 'تحت',
            'فوق': 'فوق',
            'امام': 'أمام',
            'خلف': 'خلف',
            'بين': 'بين',
            'داخل': 'داخل',
            'خارج': 'خارج',
            // أخطاء إنجليزية شائعة
            'teh': 'the',
            'adn': 'and',
            'taht': 'that',
            'thier': 'their',
            'recieve': 'receive',
            'seperate': 'separate',
            'definately': 'definitely',
            'occured': 'occurred',
            'begining': 'beginning',
            'beleive': 'believe',
            'acheive': 'achieve',
            'wierd': 'weird',
            'freind': 'friend',
            'neccessary': 'necessary',
            'accomodate': 'accommodate',
            'embarass': 'embarrass',
            'existance': 'existence',
            'goverment': 'government',
            'independant': 'independent',
            'maintainance': 'maintenance',
            'occassion': 'occasion',
            'priviledge': 'privilege',
            'recomend': 'recommend',
            'succesful': 'successful',
            'tommorrow': 'tomorrow',
            'untill': 'until'
        };

        let correctedText = text;
        let correctionCount = 0;

        // تطبيق التصحيحات بصمت
        Object.keys(corrections).forEach(mistake => {
            const correction = corrections[mistake];
            const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
            if (regex.test(correctedText)) {
                correctedText = correctedText.replace(regex, correction);
                correctionCount++;
            }
        });

        // تحديث النص في المربع بصمت
        if (correctionCount > 0) {
            this.elements.sourceText.value = correctedText;
        }
    }

    // وظيفة تفعيل رفع الصور
    triggerImageUpload() {
        this.elements.imageInput.click();
    }

    // وظيفة معالجة رفع الصور
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // التحقق من نوع الملف
        if (!file.type.startsWith('image/')) {
            this.updateStatus('يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF, WebP)', 'error');
            return;
        }

        // التحقق من حجم الملف (أقل من 10 ميجابايت)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.updateStatus('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 10 ميجابايت', 'error');
            return;
        }

        // التحقق من أبعاد الصورة
        try {
            const dimensions = await this.getImageDimensions(file);
            if (dimensions.width < 50 || dimensions.height < 50) {
                this.updateStatus('الصورة صغيرة جداً. يرجى اختيار صورة أكبر', 'error');
                return;
            }
        } catch (error) {
            console.error('خطأ في قراءة أبعاد الصورة:', error);
        }

        // عرض معاينة الصورة أولاً
        const shouldProcess = await this.showImagePreview(file);
        if (!shouldProcess) {
            event.target.value = '';
            return;
        }
        
        this.updateStatus('جاري معالجة الصورة...');
        
        try {
            const extractedText = await this.extractTextFromImage(file);
            if (extractedText && extractedText.trim()) {
                // عرض النص المستخرج للتحديد الذكي
                this.showSmartTextSelection(extractedText, file);
            } else {
                this.updateStatus('لم يتم العثور على نص في الصورة. تأكد من وضوح النص في الصورة', 'error');
            }
        } catch (error) {
            console.error('خطأ في استخراج النص:', error);
            this.updateStatus(error.message || 'حدث خطأ أثناء معالجة الصورة', 'error');
        }
        
        // إعادة تعيين input
        event.target.value = '';
    }

    // وظيفة للحصول على أبعاد الصورة
    getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // وظيفة استخراج النص من الصورة باستخدام Tesseract.js مع معالجة متقدمة
    async extractTextFromImage(file, processingMode = 'auto') {
        try {
            // التحقق من وجود مكتبة Tesseract
            if (typeof Tesseract === 'undefined') {
                throw new Error('مكتبة Tesseract غير محملة. يرجى التأكد من الاتصال بالإنترنت.');
            }
            
            // تحديث حالة التقدم
            this.updateStatus('جاري تحليل الصورة...', 'info');
            
            // اكتشاف نوع النص المتوقع من اللغة المحددة
            const sourceLang = document.getElementById('source-lang').value;
            const isEnglishText = sourceLang === 'en';
            
            // تحديد نمط المعالجة بناءً على حجم الصورة وجودتها
            const imageQuality = await this.analyzeImageQuality(file);
            const userMode = this.userPreferredProcessingMode || processingMode || 'auto';
            const optimalProcessingMode = this.determineOptimalProcessingMode(imageQuality, isEnglishText, userMode);
            
            // إعادة تعيين تفضيل المستخدم بعد الاستخدام
            this.userPreferredProcessingMode = null;
            
            // معالجة مسبقة للصورة لتحسين دقة OCR
            const processedImage = await this.preprocessImage(file, isEnglishText, optimalProcessingMode);
            
            // إعدادات محسنة حسب نوع النص ونمط المعالجة
            let ocrOptions = {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        this.updateStatus(`جاري استخراج النص... ${progress}%`, 'info');
                    }
                },
                preserve_interword_spaces: '1',
                tessedit_do_invert: '0'
            };
            
            // إعدادات خاصة للنصوص الإنجليزية
            if (isEnglishText) {
                ocrOptions = {
                    ...ocrOptions,
                    tessedit_pageseg_mode: imageQuality.isSmallText ? Tesseract.PSM.SINGLE_WORD : Tesseract.PSM.SINGLE_BLOCK,
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:"\'-()[]{}/@#$%^&*+=<>|\\~`',
                    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                    classify_bln_numeric_mode: '0',
                    textord_min_linesize: imageQuality.isSmallText ? '1.25' : '2.5'
                };
            } else {
                // إعدادات للنصوص العربية والمختلطة
                ocrOptions = {
                    ...ocrOptions,
                    tessedit_pageseg_mode: imageQuality.isComplexLayout ? Tesseract.PSM.AUTO : Tesseract.PSM.SINGLE_BLOCK,
                    tessedit_char_whitelist: 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئةىABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?؟،؛:"\'-()[]{}/@#$%^&*+=<>|\\~`',
                    textord_min_linesize: '2.0'
                };
            }
            
            // استخدام Tesseract.js لاستخراج النص
            const language = isEnglishText ? 'eng' : 'ara+eng';
            
            // إضافة timeout للعملية
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('انتهت مهلة معالجة الصورة')), 30000);
            });
            
            const recognitionPromise = Tesseract.recognize(
                processedImage,
                language,
                ocrOptions
            );
            
            const { data: { text } } = await Promise.race([recognitionPromise, timeoutPromise]);
            
            // تنظيف النص المستخرج
            const cleanedText = this.cleanExtractedText(text, isEnglishText);
            
            return cleanedText;
        } catch (error) {
            console.error('خطأ في Tesseract.js:', error);
            
            // رسائل خطأ مفصلة
            if (error.message.includes('timeout') || error.message.includes('انتهت مهلة')) {
                throw new Error('انتهت مهلة معالجة الصورة. يرجى المحاولة مرة أخرى.');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('خطأ في الشبكة. يرجى التحقق من الاتصال بالإنترنت.');
            } else if (error.message.includes('Tesseract')) {
                throw new Error('خطأ في تحميل مكتبة OCR. يرجى إعادة تحميل الصفحة.');
            } else {
                throw new Error('فشل في استخراج النص من الصورة: ' + error.message);
            }
        }
    }

    // وظيفة تنظيف النص المستخرج
    cleanExtractedText(text, isEnglishText) {
        if (!text) return '';
        
        let cleaned = text.trim();
        
        if (isEnglishText) {
            // تنظيف خاص للنصوص الإنجليزية
            cleaned = cleaned
                .replace(/[|\\]/g, 'I') // استبدال الخطوط العمودية بحرف I
                .replace(/0/g, 'O') // استبدال الصفر بحرف O في بعض الحالات
                .replace(/1/g, 'l') // استبدال الرقم 1 بحرف l في بعض الحالات
                .replace(/\s+/g, ' ') // توحيد المسافات
                .replace(/[^a-zA-Z0-9\s.,!?;:"'\-()\[\]{}\/@#$%^&*+=<>|\\~`]/g, '') // إزالة الرموز غير المرغوبة
                .replace(/^[^a-zA-Z]+/, '') // إزالة الرموز من بداية النص
                .replace(/[^a-zA-Z0-9.,!?;:"'\-()\[\]{}\/@#$%^&*+=<>|\\~`]+$/, ''); // إزالة الرموز من نهاية النص
        } else {
            // تنظيف للنصوص العربية والمختلطة
            cleaned = cleaned
                .replace(/\s+/g, ' ') // توحيد المسافات
                .replace(/[^\u0600-\u06FFa-zA-Z0-9\s.,!?؟،؛:"'\-()\[\]{}\/@#$%^&*+=<>|\\~`]/g, ''); // الاحتفاظ بالأحرف العربية والإنجليزية فقط
        }
        
        return cleaned.trim();
    }
    
    // وظيفة معالجة مسبقة للصور لتحسين دقة OCR
    async preprocessImage(file, isEnglishText = false, processingMode = 'auto') {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // تحديد حجم الصورة المحسن (دقة أعلى للنصوص الصغيرة)
                const minDimension = Math.min(img.width, img.height);
                let scale;
                if (minDimension < 500) {
                    scale = Math.min(3000 / img.width, 3000 / img.height, 4); // تكبير أكبر للصور الصغيرة
                } else {
                    scale = Math.min(2500 / img.width, 2500 / img.height, 2.5);
                }
                
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // رسم الصورة بحجم محسن مع تنعيم محسن
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // الحصول على بيانات الصورة
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // تطبيق معالجة متقدمة حسب النمط المحدد
                this.applyAdvancedImageProcessing(data, canvas.width, canvas.height, isEnglishText, processingMode);
                
                // إعادة رسم البيانات المحسنة
                ctx.putImageData(imageData, 0, 0);
                
                // تحويل إلى blob
                canvas.toBlob(resolve, 'image/png', 1.0);
            };
            
            img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
            img.src = URL.createObjectURL(file);
        });
    }

    // تحليل جودة الصورة لتحديد نمط المعالجة الأمثل
    async analyzeImageQuality(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // تحديد حجم عينة للتحليل
                const sampleSize = Math.min(200, img.width, img.height);
                canvas.width = sampleSize;
                canvas.height = sampleSize;
                
                ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
                const data = imageData.data;
                
                // حساب الإحصائيات
                let brightness = 0;
                let contrast = 0;
                let edgeCount = 0;
                const pixels = data.length / 4;
                
                // حساب السطوع والتباين
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    brightness += gray;
                }
                brightness /= pixels;
                
                // حساب التباين
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    contrast += Math.pow(gray - brightness, 2);
                }
                contrast = Math.sqrt(contrast / pixels);
                
                // كشف الحواف لتحديد تعقيد التخطيط
                for (let y = 1; y < sampleSize - 1; y++) {
                    for (let x = 1; x < sampleSize - 1; x++) {
                        const idx = (y * sampleSize + x) * 4;
                        const current = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                        const right = data[idx + 4] * 0.299 + data[idx + 5] * 0.587 + data[idx + 6] * 0.114;
                        const bottom = data[((y + 1) * sampleSize + x) * 4] * 0.299 + data[((y + 1) * sampleSize + x) * 4 + 1] * 0.587 + data[((y + 1) * sampleSize + x) * 4 + 2] * 0.114;
                        
                        const edgeStrength = Math.abs(current - right) + Math.abs(current - bottom);
                        if (edgeStrength > 30) edgeCount++;
                    }
                }
                
                const quality = {
                    width: img.width,
                    height: img.height,
                    brightness: brightness,
                    contrast: contrast,
                    edgeCount: edgeCount,
                    isSmallText: Math.min(img.width, img.height) < 800 || edgeCount > (sampleSize * sampleSize * 0.1),
                    isLowContrast: contrast < 40,
                    isDark: brightness < 100,
                    isBright: brightness > 200,
                    isComplexLayout: edgeCount > (sampleSize * sampleSize * 0.15)
                };
                
                resolve(quality);
            };
            
            img.onerror = () => reject(new Error('فشل في تحليل جودة الصورة'));
            img.src = URL.createObjectURL(file);
        });
    }

    // تحديد نمط المعالجة الأمثل
    determineOptimalProcessingMode(imageQuality, isEnglishText, userPreference = 'auto') {
        if (userPreference !== 'auto') {
            return userPreference;
        }
        
        // تحديد النمط بناءً على خصائص الصورة
        if (imageQuality.isLowContrast) {
            return 'high_contrast';
        }
        
        if (imageQuality.isDark || imageQuality.isBright) {
            return 'auto';
        }
        
        if (imageQuality.isSmallText || imageQuality.isComplexLayout) {
            return 'denoise';
        }
        
        return 'auto';
    }

    // عرض معاينة الصورة قبل المعالجة
    async showImagePreview(file) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'image-preview-modal';
            modal.innerHTML = `
                <div class="image-preview-content">
                    <div class="modal-header">
                        <h3>معاينة الصورة</h3>
                        <button class="close-btn" onclick="this.closest('.image-preview-modal').remove(); arguments[0].resolve(false);">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="image-container">
                            <img id="preview-image" src="" alt="معاينة الصورة" />
                        </div>
                        <div class="processing-options">
                            <h4>خيارات المعالجة:</h4>
                            <div class="option-group">
                                <label>
                                    <input type="radio" name="processing-mode" value="auto" checked>
                                    <span>تلقائي (موصى به)</span>
                                </label>
                                <label>
                                    <input type="radio" name="processing-mode" value="high_contrast">
                                    <span>تباين عالي</span>
                                </label>
                                <label>
                                    <input type="radio" name="processing-mode" value="denoise">
                                    <span>إزالة التشويش</span>
                                </label>
                                <label>
                                    <input type="radio" name="processing-mode" value="soft">
                                    <span>معالجة ناعمة</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary cancel-btn">إلغاء</button>
                        <button class="btn-primary process-btn">معالجة الصورة</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // عرض الصورة
            const img = modal.querySelector('#preview-image');
            img.src = URL.createObjectURL(file);
            
            // معالجة النقر على زر المعالجة
            modal.querySelector('.process-btn').onclick = () => {
                const selectedMode = modal.querySelector('input[name="processing-mode"]:checked').value;
                this.userPreferredProcessingMode = selectedMode;
                modal.remove();
                resolve(true);
            };
            
            // معالجة النقر على زر الإلغاء
            modal.querySelector('.cancel-btn').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            // معالجة النقر على زر الإغلاق
            modal.querySelector('.close-btn').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            // إغلاق النافذة عند النقر خارجها
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }

    // وظيفة المعالجة المتقدمة للصور
    applyAdvancedImageProcessing(data, width, height, isEnglishText, processingMode) {
        // تطبيق مرشح Gaussian blur خفيف لتقليل الضوضاء
        if (processingMode === 'auto' || processingMode === 'denoise') {
            this.applyGaussianBlur(data, width, height, 0.8);
        }

        // تحسين التباين والسطوع حسب نوع النص ونمط المعالجة
        for (let i = 0; i < data.length; i += 4) {
            // تحويل إلى رمادي مع أوزان محسنة
            const gray = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
            
            let enhanced;
            
            if (processingMode === 'high_contrast') {
                // نمط التباين العالي
                enhanced = gray > 127 ? 255 : 0;
            } else if (processingMode === 'soft') {
                // نمط ناعم مع تدرجات
                if (gray < 60) enhanced = 0;
                else if (gray > 195) enhanced = 255;
                else enhanced = Math.round((gray - 60) * 255 / 135);
            } else {
                // النمط التلقائي المحسن
                if (isEnglishText) {
                    // معالجة محسنة للنصوص الإنجليزية
                    const threshold = this.calculateAdaptiveThreshold(data, i, width, height);
                    enhanced = gray > threshold ? 255 : 0;
                    
                    // تطبيق تنعيم للحواف
                    if (Math.abs(gray - threshold) < 25) {
                        enhanced = gray > threshold ? 220 : 35;
                    }
                } else {
                    // معالجة محسنة للنصوص العربية
                    const threshold = this.calculateAdaptiveThreshold(data, i, width, height, 'arabic');
                    enhanced = gray > threshold ? 255 : 0;
                    
                    // معالجة خاصة للخطوط العربية المعقدة
                    if (Math.abs(gray - threshold) < 20) {
                        enhanced = gray > threshold ? 240 : 15;
                    }
                }
            }
            
            data[i] = enhanced;     // أحمر
            data[i + 1] = enhanced; // أخضر
            data[i + 2] = enhanced; // أزرق
            // data[i + 3] يبقى كما هو (الشفافية)
        }

        // تطبيق مرشح تنظيف إضافي
        if (processingMode === 'auto' || processingMode === 'clean') {
            this.applyMorphologicalOperations(data, width, height);
        }
    }

    // حساب العتبة التكيفية
    calculateAdaptiveThreshold(data, pixelIndex, width, height, textType = 'english') {
        const x = (pixelIndex / 4) % width;
        const y = Math.floor((pixelIndex / 4) / width);
        const windowSize = textType === 'arabic' ? 15 : 11;
        const halfWindow = Math.floor(windowSize / 2);
        
        let sum = 0;
        let count = 0;
        
        // حساب متوسط المنطقة المحيطة
        for (let dy = -halfWindow; dy <= halfWindow; dy++) {
            for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = (ny * width + nx) * 4;
                    const gray = data[idx] * 0.2126 + data[idx + 1] * 0.7152 + data[idx + 2] * 0.0722;
                    sum += gray;
                    count++;
                }
            }
        }
        
        const mean = sum / count;
        const offset = textType === 'arabic' ? 8 : 12;
        return mean - offset;
    }

    // تطبيق مرشح Gaussian blur
    applyGaussianBlur(data, width, height, sigma) {
        const kernel = this.generateGaussianKernel(sigma);
        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - halfKernel;
                        const py = y + ky - halfKernel;
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky][kx];
                        
                        r += tempData[idx] * weight;
                        g += tempData[idx + 1] * weight;
                        b += tempData[idx + 2] * weight;
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = Math.round(r);
                data[idx + 1] = Math.round(g);
                data[idx + 2] = Math.round(b);
            }
        }
    }

    // إنشاء نواة Gaussian
    generateGaussianKernel(sigma) {
        const size = Math.ceil(sigma * 3) * 2 + 1;
        const kernel = [];
        const center = Math.floor(size / 2);
        let sum = 0;
        
        for (let y = 0; y < size; y++) {
            kernel[y] = [];
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                kernel[y][x] = value;
                sum += value;
            }
        }
        
        // تطبيع النواة
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        
        return kernel;
    }

    // تطبيق العمليات المورفولوجية للتنظيف
    applyMorphologicalOperations(data, width, height) {
        // تطبيق عملية إغلاق لملء الفجوات الصغيرة
        this.morphologicalClose(data, width, height, 2);
        // تطبيق عملية فتح لإزالة الضوضاء
        this.morphologicalOpen(data, width, height, 1);
    }

    // عملية الإغلاق المورفولوجي
    morphologicalClose(data, width, height, radius) {
        this.dilate(data, width, height, radius);
        this.erode(data, width, height, radius);
    }

    // عملية الفتح المورفولوجي
    morphologicalOpen(data, width, height, radius) {
        this.erode(data, width, height, radius);
        this.dilate(data, width, height, radius);
    }

    // عملية التوسيع
    dilate(data, width, height, radius) {
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let maxVal = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        maxVal = Math.max(maxVal, tempData[idx]);
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = maxVal;
            }
        }
    }

    // عملية التآكل
    erode(data, width, height, radius) {
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let minVal = 255;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        minVal = Math.min(minVal, tempData[idx]);
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = minVal;
            }
        }
    }

    updateStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        
        // إضافة أيقونات للرسائل
        let icon = '';
        switch(type) {
            case 'success':
                icon = '✅ ';
                break;
            case 'error':
                icon = '❌ ';
                break;
            case 'warning':
                icon = '⚠️ ';
                break;
            case 'info':
            default:
                icon = 'ℹ️ ';
                break;
        }
        this.elements.status.textContent = icon + message;
        
        // إخفاء الرسالة بعد مدة مناسبة
        const hideDelay = type === 'error' ? 8000 : type === 'success' ? 4000 : 5000;
        setTimeout(() => {
            if (this.elements.status.textContent === icon + message) {
                this.elements.status.textContent = 'جاهز للاستخدام';
                this.elements.status.className = 'status';
            }
        }, hideDelay);
        
        // طباعة الرسالة في وحدة التحكم للتشخيص
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // وظيفة للتحقق من دعم الكاميرا والميكروفون
    async checkCameraSupport() {
        try {
            // التحقق من دعم getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('المتصفح لا يدعم الوصول للكاميرا والميكروفون');
            }

            // التحقق من الأذونات
            const permissions = await navigator.permissions.query({name: 'camera'});
            if (permissions.state === 'denied') {
                throw new Error('تم رفض إذن الوصول للكاميرا');
            }

            return true;
        } catch (error) {
            console.error('خطأ في فحص دعم الكاميرا:', error);
            this.updateStatus('الكاميرا غير متاحة: ' + error.message, 'warning');
            return false;
        }
    }

    // وظيفة لمعالجة أخطاء الملفات
    handleFileError(error, fileName = '') {
        let errorMessage = 'خطأ في معالجة الملف';
        
        if (fileName) {
            errorMessage += ` "${fileName}"`;
        }
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'تم رفض الإذن للوصول للملف';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'الملف غير موجود';
        } else if (error.name === 'SecurityError') {
            errorMessage = 'خطأ أمني في الوصول للملف';
        } else if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        this.updateStatus(errorMessage, 'error');
        console.error('File Error:', error);
    }

    // وظيفة لفتح الكاميرا (تحديث من النسخة الاحتياطية)
    async openCamera() {
        try {
            // التحقق من دعم الكاميرا أولاً
            const isSupported = await this.checkCameraSupport();
            if (!isSupported) {
                return;
            }

            this.updateStatus('جاري فتح الكاميرا...', 'info');
            
            // طلب الوصول للكاميرا
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // الكاميرا الخلفية للهواتف
                }
            });

            // إنشاء عنصر فيديو لعرض الكاميرا
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                max-width: 90vw;
                max-height: 90vh;
                border: 3px solid #007bff;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;

            // إنشاء أزرار التحكم
            const controls = document.createElement('div');
            controls.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1001;
                display: flex;
                gap: 10px;
            `;

            const captureBtn = document.createElement('button');
            captureBtn.textContent = '📸 التقاط صورة';
            captureBtn.style.cssText = `
                padding: 12px 24px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = '❌ إغلاق';
            closeBtn.style.cssText = `
                padding: 12px 24px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
            `;

            controls.appendChild(captureBtn);
            controls.appendChild(closeBtn);

            // إضافة العناصر للصفحة
            document.body.appendChild(video);
            document.body.appendChild(controls);

            // وظيفة التقاط الصورة
            captureBtn.onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                    
                    // إغلاق الكاميرا
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(video);
                    document.body.removeChild(controls);
                    
                    // معالجة الصورة الملتقطة
                    await this.handleImageUpload({ target: { files: [file] } });
                }, 'image/jpeg', 0.9);
            };

            // وظيفة الإغلاق
            closeBtn.onclick = () => {
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(video);
                document.body.removeChild(controls);
                this.updateStatus('تم إغلاق الكاميرا', 'info');
            };

            this.updateStatus('الكاميرا جاهزة - اضغط على زر التقاط الصورة', 'success');

        } catch (error) {
            this.handleFileError(error, 'الكاميرا');
            
            // رسائل خطأ محددة للكاميرا
            if (error.name === 'NotAllowedError') {
                this.updateStatus('يرجى السماح بالوصول للكاميرا من إعدادات المتصفح', 'error');
            } else if (error.name === 'NotFoundError') {
                this.updateStatus('لم يتم العثور على كاميرا متاحة', 'error');
            } else if (error.name === 'NotReadableError') {
                this.updateStatus('الكاميرا مستخدمة من تطبيق آخر', 'error');
            } else {
                this.updateStatus('خطأ في فتح الكاميرا: ' + error.message, 'error');
            }
        }
    }

    // وظائف القائمة المنسدلة للصور والكاميرا
    toggleImageCaptureMenu(e) {
        e.stopPropagation();
        this.elements.imageCaptureContainer.classList.toggle('active');
    }

    handleOutsideClick(e) {
        if (!this.elements.imageCaptureContainer.contains(e.target)) {
            this.elements.imageCaptureContainer.classList.remove('active');
        }
    }

    handleMenuItemClick(e) {
        e.stopPropagation();
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;

        const action = menuItem.getAttribute('data-action');
        this.elements.imageCaptureContainer.classList.remove('active');

        if (action === 'upload') {
            this.triggerImageUpload();
        } else if (action === 'camera') {
            this.openCamera();
        }
    }

    triggerImageUpload() {
        this.elements.imageInput.click();
    }

    // عرض واجهة التحديد الذكي للنص
    showSmartTextSelection(extractedText, imageFile) {
        // إنشاء نافذة التحديد الذكي
        const modal = document.createElement('div');
        modal.className = 'smart-selection-modal';
        modal.innerHTML = `
            <div class="smart-selection-content">
                <div class="modal-header">
                    <h3>تحديد النص الذكي للترجمة</h3>
                    <button class="close-btn tooltip" data-tooltip="إغلاق النافذة" onclick="this.closest('.smart-selection-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="image-preview">
                        <img id="preview-image" src="" alt="الصورة المحملة">
                        <div class="image-info">
                            <small>💡 انقر على الكلمات لتحديدها • انقر مرتين لتحديد الجملة كاملة</small>
                        </div>
                    </div>
                    <div class="text-selection-area">
                        <div class="text-tools">
                            <h4>النص المستخرج والقابل للتحديد:</h4>
                            <div class="text-search-area">
                                <div class="search-input-group">
                                    <input type="text" id="text-search-input" placeholder="البحث في النص المستخرج..." class="search-input">
                                    <button id="search-btn" class="tool-btn tooltip" data-tooltip="البحث في النص">🔍</button>
                                    <button id="clear-search-btn" class="tool-btn tooltip" data-tooltip="مسح البحث">✕</button>
                                </div>
                                <div class="search-results" id="search-results" style="display: none;">
                                    <span id="search-count">0 نتيجة</span>
                                    <button id="prev-result" class="nav-btn" disabled>⬆</button>
                                    <button id="next-result" class="nav-btn" disabled>⬇</button>
                                </div>
                            </div>
                        </div>
                        <div class="text-stats">
                            <div class="stat-item">
                                <span>الكلمات:</span>
                                <span class="stat-number" id="word-count">0</span>
                            </div>
                            <div class="stat-item">
                                <span>المحدد:</span>
                                <span class="stat-number" id="selected-count">0</span>
                            </div>
                            <div class="stat-item">
                                <span>الأحرف:</span>
                                <span class="stat-number" id="char-count">0</span>
                            </div>
                        </div>
                        <div class="text-filters">
                            <div class="filter-option">
                                <input type="checkbox" id="filter-numbers" checked>
                                <label for="filter-numbers">تضمين الأرقام</label>
                            </div>
                            <div class="filter-option">
                                <input type="checkbox" id="filter-punctuation" checked>
                                <label for="filter-punctuation">تضمين علامات الترقيم</label>
                            </div>
                            <div class="filter-option">
                                <input type="checkbox" id="filter-short-words">
                                <label for="filter-short-words">إخفاء الكلمات القصيرة</label>
                            </div>
                        </div>
                        <div class="extracted-text-container">
                            <div id="extracted-text-display"></div>
                        </div>
                        <div class="selection-controls">
                            <div class="control-group">
                                <button id="select-all-text" class="control-btn tooltip" data-tooltip="تحديد جميع النصوص المرئية">تحديد الكل</button>
                                <button id="clear-selection" class="control-btn tooltip" data-tooltip="إلغاء التحديد الحالي">إلغاء التحديد</button>
                                <button id="smart-detect" class="control-btn tooltip" data-tooltip="كشف النصوص المهمة تلقائياً">كشف ذكي</button>
                                <button id="select-sentences" class="control-btn tooltip" data-tooltip="تحديد جمل كاملة">تحديد الجمل</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="footer-info">
                        <small>💡 نصيحة: استخدم الكشف الذكي لتحديد النصوص المهمة تلقائياً</small>
                    </div>
                    <div class="footer-actions">
                        <button id="cancel-selection" class="control-btn secondary tooltip" data-tooltip="إغلاق بدون ترجمة">إلغاء</button>
                        <button id="confirm-selection" class="control-btn primary tooltip" data-tooltip="ترجمة النص المحدد">ترجمة النص المحدد</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // عرض الصورة
        const previewImg = modal.querySelector('#preview-image');
        previewImg.src = URL.createObjectURL(imageFile);

        // تقسيم النص إلى جمل وكلمات قابلة للتحديد
        this.displaySelectableText(extractedText, modal.querySelector('#extracted-text-display'));

        // إضافة مستمعي الأحداث
        this.setupSmartSelectionEvents(modal, extractedText);
        
        // تحديث الإحصائيات الأولية
        this.updateSelectedCount();
        
        // تطبيق الكشف الذكي تلقائياً بعد تحميل النافذة
        setTimeout(() => {
            this.performSmartDetection(modal, extractedText);
        }, 500);
    }

    // عرض النص القابل للتحديد
    displaySelectableText(text, container) {
        const sentences = text.split(/[.!?؟।]/).filter(s => s.trim());
        container.innerHTML = '';
        
        let totalWords = 0;
        let totalChars = text.length;

        sentences.forEach((sentence, index) => {
            const sentenceDiv = document.createElement('div');
            sentenceDiv.className = 'selectable-sentence';
            sentenceDiv.setAttribute('data-sentence-index', index);
            
            const words = sentence.trim().split(/\s+/).filter(w => w.trim());
            totalWords += words.length;
            
            words.forEach((word, wordIndex) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'selectable-word';
                wordSpan.textContent = word;
                wordSpan.setAttribute('data-word-index', wordIndex);
                wordSpan.setAttribute('data-original-word', word.toLowerCase());
                wordSpan.addEventListener('click', (e) => this.toggleWordSelection(e));
                
                // إضافة فئات للتصفية
                if (/\d/.test(word)) wordSpan.classList.add('has-number');
                if (/[.,!?؟;:]/.test(word)) wordSpan.classList.add('has-punctuation');
                if (word.length <= 2) wordSpan.classList.add('short-word');
                
                sentenceDiv.appendChild(wordSpan);
                
                if (wordIndex < words.length - 1) {
                    sentenceDiv.appendChild(document.createTextNode(' '));
                }
            });
            
            container.appendChild(sentenceDiv);
            if (index < sentences.length - 1) {
                container.appendChild(document.createElement('br'));
            }
        });
        
        // تحديث الإحصائيات
        this.updateTextStats(totalWords, 0, totalChars);
    }

    // تحديث إحصائيات النص
    updateTextStats(totalWords, selectedWords, totalChars) {
        const modal = document.querySelector('.smart-selection-modal');
        if (modal) {
            const wordCountEl = modal.querySelector('#word-count');
            const selectedCountEl = modal.querySelector('#selected-count');
            const charCountEl = modal.querySelector('#char-count');
            
            if (wordCountEl) wordCountEl.textContent = `الكلمات: ${totalWords}`;
            if (selectedCountEl) selectedCountEl.textContent = `المحدد: ${selectedWords}`;
            if (charCountEl) charCountEl.textContent = `الأحرف: ${totalChars}`;
        }
    }

    // تبديل تحديد الكلمة
    toggleWordSelection(event) {
        const word = event.target;
        word.classList.toggle('selected');
        
        // تحديد الجملة كاملة عند النقر المزدوج
        if (event.detail === 2) {
            const sentence = word.closest('.selectable-sentence');
            const words = sentence.querySelectorAll('.selectable-word');
            const isSelected = word.classList.contains('selected');
            
            words.forEach(w => {
                if (isSelected) {
                    w.classList.add('selected');
                } else {
                    w.classList.remove('selected');
                }
            });
        }
        
        // تحديث عداد الكلمات المحددة
        this.updateSelectedCount();
    }

    // تحديث عداد الكلمات المحددة
    updateSelectedCount() {
        const modal = document.querySelector('.smart-selection-modal');
        if (modal) {
            const selectedWords = modal.querySelectorAll('.selectable-word.selected').length;
            const totalWords = modal.querySelectorAll('.selectable-word').length;
            const totalChars = modal.querySelector('#extracted-text-display').textContent.length;
            this.updateTextStats(totalWords, selectedWords, totalChars);
        }
    }

    // البحث في النص
    searchInText(searchTerm, modal) {
        const words = modal.querySelectorAll('.selectable-word');
        const searchLower = searchTerm.toLowerCase();
        
        words.forEach(word => {
            word.classList.remove('search-highlight');
            if (searchTerm && word.getAttribute('data-original-word').includes(searchLower)) {
                word.classList.add('search-highlight');
            }
        });
    }

    // تطبيق التصفية المتقدمة
    applyAdvancedTextFilters(modal) {
        const includeNumbers = modal.querySelector('#filter-numbers').checked;
        const includePunctuation = modal.querySelector('#filter-punctuation').checked;
        const hideShortWords = modal.querySelector('#filter-short-words').checked;
        
        const words = modal.querySelectorAll('.selectable-word');
        let visibleCount = 0;
        
        words.forEach(word => {
            let shouldShow = true;
            const text = word.textContent.trim();
            
            // فلتر الأرقام
            if (!includeNumbers && /\d/.test(text)) {
                shouldShow = false;
            }
            
            // فلتر علامات الترقيم (الكلمات التي تحتوي فقط على علامات ترقيم)
            if (!includePunctuation && /^[^\w\u0600-\u06FF]+$/.test(text)) {
                shouldShow = false;
            }
            
            // فلتر الكلمات القصيرة (أقل من 3 أحرف)
            if (hideShortWords && text.length <= 2) {
                shouldShow = false;
            }
            
            // تطبيق الفلتر
            if (shouldShow) {
                word.style.display = 'inline';
                word.classList.remove('filtered-out');
                visibleCount++;
            } else {
                word.style.display = 'none';
                word.classList.add('filtered-out');
                // إزالة التحديد من الكلمات المخفية
                word.classList.remove('selected');
            }
        });
        
        // تحديث إحصائيات الكلمات المرئية
        const wordCountEl = modal.querySelector('#word-count');
        if (wordCountEl) {
            wordCountEl.textContent = visibleCount;
        }
    }

    // تطبيق التصفية (للتوافق مع الإصدارات السابقة)
    applyTextFilters(modal) {
        this.applyAdvancedTextFilters(modal);
    }

    // إعداد أحداث التحديد الذكي
    setupSmartSelectionEvents(modal, originalText) {
        const selectAllBtn = modal.querySelector('#select-all-text');
        const clearSelectionBtn = modal.querySelector('#clear-selection');
        const smartDetectBtn = modal.querySelector('#smart-detect');
        const selectSentencesBtn = modal.querySelector('#select-sentences');
        const confirmBtn = modal.querySelector('#confirm-selection');
        const cancelBtn = modal.querySelector('#cancel-selection');
        const searchInput = modal.querySelector('#text-search-input');
        const searchBtn = modal.querySelector('#search-btn');
        const clearSearchBtn = modal.querySelector('#clear-search-btn');
        const prevResultBtn = modal.querySelector('#prev-result');
        const nextResultBtn = modal.querySelector('#next-result');
        const searchResults = modal.querySelector('#search-results');
        const searchCount = modal.querySelector('#search-count');
        const filterCheckboxes = modal.querySelectorAll('.filter-option input[type="checkbox"]');

        // متغيرات البحث
        let currentSearchResults = [];
        let currentSearchIndex = -1;

        // تحديد جميع النصوص المرئية
        selectAllBtn.addEventListener('click', () => {
            modal.querySelectorAll('.selectable-word:not([style*="display: none"])').forEach(word => {
                word.classList.add('selected');
            });
            this.updateSelectedCount();
        });

        // إلغاء التحديد
        clearSelectionBtn.addEventListener('click', () => {
            modal.querySelectorAll('.selectable-word').forEach(word => {
                word.classList.remove('selected');
            });
            this.updateSelectedCount();
        });

        // الكشف الذكي
        smartDetectBtn.addEventListener('click', () => {
            this.performSmartDetection(modal, originalText);
        });

        // تحديد الجمل الكاملة
        if (selectSentencesBtn) {
            selectSentencesBtn.addEventListener('click', () => {
                const sentences = modal.querySelectorAll('.selectable-sentence');
                sentences.forEach(sentence => {
                    const words = sentence.querySelectorAll('.selectable-word:not([style*="display: none"])');
                    words.forEach(word => word.classList.add('selected'));
                });
                this.updateSelectedCount();
            });
        }

        // البحث المتقدم في النص
        const performAdvancedSearch = () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const words = modal.querySelectorAll('.selectable-word');
            
            // إزالة التمييز السابق
            words.forEach(word => {
                word.classList.remove('search-highlight', 'current-search-result');
            });
            
            if (searchTerm) {
                const matches = Array.from(words).filter(word => 
                    word.getAttribute('data-original-word').includes(searchTerm) &&
                    !word.style.display.includes('none')
                );
                
                matches.forEach(word => word.classList.add('search-highlight'));
                
                if (searchResults) {
                    searchResults.style.display = 'flex';
                    searchCount.textContent = `${matches.length} نتيجة`;
                }
                
                currentSearchResults = matches;
                currentSearchIndex = matches.length > 0 ? 0 : -1;
                
                if (prevResultBtn) prevResultBtn.disabled = matches.length <= 1;
                if (nextResultBtn) nextResultBtn.disabled = matches.length <= 1;
                
                if (matches.length > 0) {
                    highlightCurrentResult();
                }
            } else {
                if (searchResults) searchResults.style.display = 'none';
                currentSearchResults = [];
                currentSearchIndex = -1;
            }
        };

        // تمييز النتيجة الحالية
        const highlightCurrentResult = () => {
            currentSearchResults.forEach((word, index) => {
                word.classList.toggle('current-search-result', index === currentSearchIndex);
            });
            
            if (currentSearchResults[currentSearchIndex]) {
                currentSearchResults[currentSearchIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        };

        // مسح البحث
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                performAdvancedSearch();
            });
        }

        // التنقل في نتائج البحث
        if (prevResultBtn) {
            prevResultBtn.addEventListener('click', () => {
                if (currentSearchResults.length > 0) {
                    currentSearchIndex = (currentSearchIndex - 1 + currentSearchResults.length) % currentSearchResults.length;
                    highlightCurrentResult();
                }
            });
        }

        if (nextResultBtn) {
            nextResultBtn.addEventListener('click', () => {
                if (currentSearchResults.length > 0) {
                    currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
                    highlightCurrentResult();
                }
            });
        }

        searchInput.addEventListener('input', performAdvancedSearch);
        searchBtn.addEventListener('click', performAdvancedSearch);
        
        // مفتاح Enter للبحث
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performAdvancedSearch();
            }
        });

        // تطبيق التصفية المحسنة
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyAdvancedTextFilters(modal);
                this.updateSelectedCount();
                // إعادة تطبيق البحث بعد التصفية
                if (searchInput.value.trim()) {
                    performAdvancedSearch();
                }
            });
        });

        confirmBtn.addEventListener('click', () => {
            const selectedText = this.getSelectedText(modal);
            if (selectedText.trim()) {
                this.processSelectedText(selectedText);
                modal.remove();
            } else {
                this.updateStatus('يرجى تحديد نص للترجمة', 'error');
            }
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // إغلاق النافذة عند النقر خارجها
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // تطبيق التصفية الأولية
        this.applyAdvancedTextFilters(modal);
    }

    // الكشف الذكي المحسن للنص المهم
    performSmartDetection(modal, text) {
        // خوارزمية محسنة للكشف الذكي
        const words = modal.querySelectorAll('.selectable-word:not(.filtered-out)');
        
        // إزالة التحديد الحالي
        words.forEach(word => word.classList.remove('selected'));
        
        // قائمة الكلمات المستبعدة (أدوات الربط والكلمات الشائعة)
        const stopWords = [
            // العربية
            'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'التي', 'هو', 'هي', 'أن', 'إن', 'كان', 'كانت', 'يكون', 'تكون', 'لكن', 'لكن', 'أو', 'أم', 'بل', 'لا', 'ما', 'لم', 'لن', 'قد', 'كل', 'بعض', 'جميع',
            // English
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'this', 'that', 'these', 'those', 'a', 'an', 'some', 'any', 'all', 'no', 'not'
        ];
        
        let selectedCount = 0;
        
        words.forEach(word => {
            const wordText = word.textContent.toLowerCase().trim();
            const isVisible = !word.classList.contains('filtered-out') && word.style.display !== 'none';
            
            if (isVisible) {
                // معايير التحديد الذكي:
                // 1. الكلمات الطويلة (أكثر من 3 أحرف)
                // 2. ليست من الكلمات المستبعدة
                // 3. تحتوي على أحرف وليس فقط أرقام أو رموز
                // 4. الأسماء الكبيرة (تبدأ بحرف كبير)
                const isLongWord = wordText.length > 3;
                const isNotStopWord = !stopWords.includes(wordText);
                const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(wordText);
                const isCapitalized = /^[A-Z\u0600-\u06FF]/.test(word.textContent);
                const isImportant = /[A-Z\u0600-\u06FF]{2,}/.test(word.textContent); // كلمات بأحرف كبيرة متعددة
                
                if ((isLongWord && isNotStopWord && hasLetters) || isCapitalized || isImportant) {
                    word.classList.add('selected');
                    selectedCount++;
                }
            }
        });
        
        this.updateSelectedCount();
        this.updateStatus(`تم تطبيق الكشف الذكي - تم تحديد ${selectedCount} كلمة مهمة`, 'success');
    }

    // تمييز النتيجة الحالية في البحث
    highlightCurrentSearchResult() {
        const modal = document.querySelector('.smart-selection-modal');
        if (!modal || !this.searchResults || this.currentSearchIndex < 0) return;
        
        this.searchResults.forEach((word, index) => {
            word.classList.toggle('current-search-result', index === this.currentSearchIndex);
        });
        
        if (this.searchResults[this.currentSearchIndex]) {
            this.searchResults[this.currentSearchIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // الحصول على النص المحدد
    getSelectedText(modal) {
        const selectedWords = modal.querySelectorAll('.selectable-word.selected');
        return Array.from(selectedWords).map(word => word.textContent).join(' ');
    }

    // معالجة النص المحدد
    processSelectedText(selectedText) {
        this.elements.sourceText.value = selectedText;
        this.updateCharCounter();
        this.updateStatus('تم تحديد النص بنجاح', 'success');
        
        // تشغيل التصحيح التلقائي
        this.autoSpellCheck();
        
        // ترجمة تلقائية مع debounce
        if (this.debouncedTranslate) {
            this.debouncedTranslate();
        } else {
            setTimeout(() => this.translateText(), 1000);
        }
    }

    // تبديل وضع المحادثة الثنائية
    toggleConversationMode() {
        this.conversationMode = this.elements.conversationModeToggle.checked;
        const body = document.body;
        const translationArea = document.querySelector('.translation-area');
        
        if (this.conversationMode) {
            body.classList.add('conversation-mode');
            this.elements.conversationHistory.style.display = 'block';
            this.updateStatus('تم تفعيل وضع المحادثة الثنائية', 'success');
            
            // إضافة رسالة ترحيب
            if (this.conversationHistory.length === 0) {
                this.addConversationItem('مرحباً! أنا مساعدك للترجمة. يمكنك الآن بدء محادثة ثنائية اللغة.', 'assistant');
            }
        } else {
            body.classList.remove('conversation-mode');
            this.elements.conversationHistory.style.display = 'none';
            this.updateStatus('تم إلغاء وضع المحادثة الثنائية', 'info');
        }
    }

    // إضافة عنصر للمحادثة
    addConversationItem(text, sender = 'user', translation = '') {
        const timestamp = new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const conversationItem = {
            text,
            translation,
            sender,
            timestamp: new Date().toISOString()
        };
        
        this.conversationHistory.push(conversationItem);
        this.renderConversationHistory();
        
        // حفظ تاريخ المحادثة
        this.saveConversationHistory();
    }

    // عرض تاريخ المحادثة
    renderConversationHistory() {
        const container = this.elements.conversationItems;
        container.innerHTML = '';
        
        this.conversationHistory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = `conversation-item ${item.sender}`;
            
            const timestamp = new Date(item.timestamp).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            itemElement.innerHTML = `
                <div class="message-content">
                    <strong>${item.sender === 'user' ? 'أنت' : 'المساعد'}:</strong>
                    <p>${item.text}</p>
                    ${item.translation ? `<p class="translation"><em>الترجمة: ${item.translation}</em></p>` : ''}
                </div>
                <div class="timestamp">${timestamp}</div>
            `;
            
            container.appendChild(itemElement);
        });
        
        // التمرير إلى أسفل
        container.scrollTop = container.scrollHeight;
    }

    // حفظ تاريخ المحادثة
    saveConversationHistory() {
        try {
            localStorage.setItem('conversationHistory', JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error('خطأ في حفظ تاريخ المحادثة:', error);
        }
    }

    // تحميل تاريخ المحادثة
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('conversationHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
                this.renderConversationHistory();
            }
        } catch (error) {
            console.error('خطأ في تحميل تاريخ المحادثة:', error);
            this.conversationHistory = [];
        }
    }

    // مسح تاريخ المحادثة
    clearConversationHistory() {
        this.conversationHistory = [];
        this.elements.conversationItems.innerHTML = '';
        this.saveConversationHistory();
        this.updateStatus('تم مسح تاريخ المحادثة', 'info');
    }

    // دوال إدارة تاريخ الترجمات
    loadTranslationHistory() {
        const historyList = document.getElementById('history-list');
        const toggleBtn = document.getElementById('toggle-history-btn');
        const clearBtn = document.getElementById('clear-history-btn');
        
        if (!historyList || !toggleBtn || !clearBtn) return;
        
        const history = this.getTranslationHistory();
        
        // إعداد أزرار التحكم
        toggleBtn.addEventListener('click', () => {
            const isVisible = historyList.style.display !== 'none';
            historyList.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '📜 إظهار التاريخ' : '📜 إخفاء التاريخ';
        });
        
        clearBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من مسح جميع الترجمات المحفوظة؟')) {
                localStorage.removeItem('translationHistory');
                this.loadHistoryToDOM();
                this.updateStatus('تم مسح تاريخ الترجمات', 'info');
            }
        });
        
        this.loadHistoryToDOM();
    }
    
    loadHistoryToDOM() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const history = this.getTranslationHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">لا توجد ترجمات محفوظة</div>';
            return;
        }
        
        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item">
                <div class="history-content">
                    <div class="history-source">${item.source}</div>
                    <div class="history-translation">${item.translation}</div>
                    <div class="history-timestamp">${new Date(item.timestamp).toLocaleString('ar-SA')}</div>
                </div>
                <div class="history-actions">
                    <button onclick="app.useHistoryItem('${item.source}', '${item.translation}')" class="tooltip" data-tooltip="استخدام هذه الترجمة">
                        📝 استخدام
                    </button>
                    <button onclick="app.addToFavorites('${item.source} → ${item.translation}')" class="tooltip" data-tooltip="إضافة للمفضلة">
                        ⭐ مفضلة
                    </button>
                    <button onclick="app.removeHistoryItem(${index})" class="tooltip" data-tooltip="حذف من التاريخ">
                        🗑️ حذف
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    useHistoryItem(source, translation) {
        this.elements.sourceText.value = source;
        this.elements.translatedText.textContent = translation;
        this.elements.translatedText.classList.add('has-content');
        this.elements.speakBtn.disabled = false;
        this.elements.copyBtn.disabled = false;
        this.updateStatus('تم استخدام الترجمة من التاريخ', 'success');
    }
    
    removeHistoryItem(index) {
        const history = this.getTranslationHistory();
        history.splice(index, 1);
        localStorage.setItem('translationHistory', JSON.stringify(history));
        this.loadHistoryToDOM();
        this.updateStatus('تم حذف الترجمة من التاريخ', 'info');
    }

    // ========== Smart Translation Functions ==========
    
    // Initialize smart translation features
    initSmartTranslation() {
        this.smartTranslationHistory = JSON.parse(localStorage.getItem('smartTranslationHistory') || '[]');
        this.currentSmartTranslation = '';
        this.currentCameraStream = null;
        
        // Setup smart translation event listeners if elements exist
        this.setupSmartTranslationListeners();
    }
    
    setupSmartTranslationListeners() {
        // Text mode listeners
        const translateTextBtn = document.getElementById('translate-text-btn');
        const ttsTextBtn = document.getElementById('tts-text-btn');
        const clearTextBtn = document.getElementById('clear-text-btn');
        
        if (translateTextBtn) {
            translateTextBtn.addEventListener('click', () => this.handleSmartTextTranslation());
        }
        
        if (ttsTextBtn) {
            ttsTextBtn.addEventListener('click', () => this.speakSmartTranslation());
        }
        
        if (clearTextBtn) {
            clearTextBtn.addEventListener('click', () => this.clearSmartText());
        }
        
        // Camera mode listeners
        const openCamBtn = document.getElementById('open-cam-btn');
        const snapBtn = document.getElementById('snap-btn');
        const stopCamBtn = document.getElementById('stop-cam-btn');
        
        if (openCamBtn) {
            openCamBtn.addEventListener('click', () => this.openSmartCamera());
        }
        
        if (snapBtn) {
            snapBtn.addEventListener('click', () => this.snapSmartPhoto());
        }
        
        if (stopCamBtn) {
            stopCamBtn.addEventListener('click', () => this.stopSmartCamera());
        }
        
        // Image mode listeners
        const processImgBtn = document.getElementById('process-img-btn');
        const ttsImgBtn = document.getElementById('tts-img-btn');
        const dropZone = document.getElementById('drop-zone');
        const imgFile = document.getElementById('img-file');
        
        if (processImgBtn) {
            processImgBtn.addEventListener('click', () => this.processSmartImage());
        }
        
        if (ttsImgBtn) {
            ttsImgBtn.addEventListener('click', () => this.speakSmartTranslation());
        }
        
        if (dropZone && imgFile) {
            this.setupSmartImageUpload(dropZone, imgFile);
        }
        
        // Footer functions
        const downloadHistory = document.getElementById('download-history');
        const shareResult = document.getElementById('share-result');
        
        if (downloadHistory) {
            downloadHistory.addEventListener('click', () => this.downloadSmartHistory());
        }
        
        if (shareResult) {
            shareResult.addEventListener('click', () => this.shareSmartResult());
        }
    }
    
    async handleSmartTextTranslation() {
        const textInput = document.getElementById('text-input');
        const textResult = document.getElementById('text-result');
        const fromLang = document.getElementById('from-lang');
        const toLang = document.getElementById('to-lang');
        
        if (!textInput || !textResult || !fromLang || !toLang) return;
        
        const text = textInput.value.trim();
        if (!text) {
            this.showSmartError(textResult, 'يرجى إدخال النص المراد ترجمته');
            return;
        }
        
        this.showSmartLoading(textResult, 'جاري الترجمة...');
        
        try {
            const translatedText = await this.translateWithMyMemory(text, fromLang.value, toLang.value);
            this.showSmartResult(textResult, text, translatedText, fromLang.value, toLang.value);
        } catch (error) {
            this.showSmartError(textResult, 'خطأ في الترجمة. يرجى المحاولة مرة أخرى.');
        }
    }
    
    async openSmartCamera() {
        const video = document.getElementById('video');
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        const openCamBtn = document.getElementById('open-cam-btn');
        const snapBtn = document.getElementById('snap-btn');
        const stopCamBtn = document.getElementById('stop-cam-btn');
        const cameraResult = document.getElementById('camera-result');
        
        if (!video || !cameraPlaceholder) return;
        
        try {
            this.currentCameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            video.srcObject = this.currentCameraStream;
            video.style.display = 'block';
            if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
            if (openCamBtn) openCamBtn.style.display = 'none';
            if (snapBtn) snapBtn.style.display = 'inline-block';
            if (stopCamBtn) stopCamBtn.style.display = 'inline-block';
        } catch (error) {
            if (cameraResult) {
                this.showSmartError(cameraResult, 'لا يمكن الوصول للكاميرا. يرجى التحقق من الأذونات.');
            }
        }
    }
    
    stopSmartCamera() {
        if (this.currentCameraStream) {
            this.currentCameraStream.getTracks().forEach(track => track.stop());
            this.currentCameraStream = null;
        }
        
        const video = document.getElementById('video');
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        const openCamBtn = document.getElementById('open-cam-btn');
        const snapBtn = document.getElementById('snap-btn');
        const stopCamBtn = document.getElementById('stop-cam-btn');
        
        if (video) video.style.display = 'none';
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'flex';
        if (openCamBtn) openCamBtn.style.display = 'inline-block';
        if (snapBtn) snapBtn.style.display = 'none';
        if (stopCamBtn) stopCamBtn.style.display = 'none';
    }
    
    async snapSmartPhoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const cameraResult = document.getElementById('camera-result');
        
        if (!video || !canvas || !cameraResult) return;
        
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        await this.processSmartImageOCR(imageData, cameraResult);
    }
    
    setupSmartImageUpload(dropZone, imgFile) {
        dropZone.addEventListener('click', () => imgFile.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--brand)';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#cbd5e1';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleSmartImageFile(files[0]);
            }
        });
        
        imgFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleSmartImageFile(e.target.files[0]);
            }
        });
    }
    
    handleSmartImageFile(file) {
        const imageResult = document.getElementById('image-result');
        const previewBox = document.getElementById('preview-box');
        
        if (!file.type.startsWith('image/')) {
            if (imageResult) {
                this.showSmartError(imageResult, 'يرجى اختيار ملف صورة صحيح');
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewBox) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '8px';
                previewBox.innerHTML = '';
                previewBox.appendChild(img);
                previewBox.classList.add('has-image');
            }
        };
        reader.readAsDataURL(file);
    }
    
    async processSmartImage() {
        const previewBox = document.getElementById('preview-box');
        const imageResult = document.getElementById('image-result');
        
        if (!previewBox || !imageResult) return;
        
        const img = previewBox.querySelector('img');
        if (!img) {
            this.showSmartError(imageResult, 'يرجى اختيار صورة أولاً');
            return;
        }
        
        await this.processSmartImageOCR(img.src, imageResult);
    }
    
    async processSmartImageOCR(imageSrc, resultContainer) {
        this.showSmartLoading(resultContainer, 'جاري استخراج النص من الصورة...');
        
        try {
            // Use existing OCR functionality from the main app
            const file = await this.dataURLtoFile(imageSrc, 'image.jpg');
            const extractedText = await this.extractTextFromImage(file);
            
            if (!extractedText.trim()) {
                this.showSmartError(resultContainer, 'لم يتم العثور على نص في الصورة');
                return;
            }
            
            this.showSmartLoading(resultContainer, 'جاري ترجمة النص المستخرج...');
            
            const fromLang = document.getElementById('from-lang');
            const toLang = document.getElementById('to-lang');
            
            if (fromLang && toLang) {
                const translatedText = await this.translateWithMyMemory(extractedText.trim(), fromLang.value, toLang.value);
                this.showSmartResult(resultContainer, extractedText.trim(), translatedText, fromLang.value, toLang.value);
            }
            
        } catch (error) {
            console.error('Smart OCR Error:', error);
            this.showSmartError(resultContainer, 'خطأ في معالجة الصورة. يرجى المحاولة مرة أخرى.');
        }
    }
    
    dataURLtoFile(dataurl, filename) {
        return new Promise((resolve) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new File([u8arr], filename, { type: mime }));
        });
    }
    
    speakSmartTranslation() {
        if (this.currentSmartTranslation && 'speechSynthesis' in window) {
            const toLang = document.getElementById('to-lang');
            const lang = toLang ? toLang.value : 'ar';
            
            const utterance = new SpeechSynthesisUtterance(this.currentSmartTranslation);
            utterance.lang = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : lang;
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    }
    
    clearSmartText() {
        const textInput = document.getElementById('text-input');
        const textResult = document.getElementById('text-result');
        
        if (textInput) textInput.value = '';
        if (textResult) {
            textResult.classList.remove('show');
            textResult.innerHTML = '';
        }
        this.currentSmartTranslation = '';
    }
    
    showSmartResult(container, originalText, translatedText, from, to) {
        if (!container) return;
        
        container.innerHTML = `
            <div style="margin-bottom: 12px;">
                <strong>النص الأصلي (${from}):</strong>
                <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-top: 4px;">${originalText}</div>
            </div>
            <div>
                <strong>الترجمة (${to}):</strong>
                <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; margin-top: 4px; border-left: 3px solid var(--brand);">${translatedText}</div>
            </div>
        `;
        container.classList.add('show', 'success');
        
        // Add to smart translation history
        this.smartTranslationHistory.push({
            original: originalText,
            translated: translatedText,
            from: from,
            to: to,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 items
        if (this.smartTranslationHistory.length > 50) {
            this.smartTranslationHistory = this.smartTranslationHistory.slice(-50);
        }
        
        localStorage.setItem('smartTranslationHistory', JSON.stringify(this.smartTranslationHistory));
        this.currentSmartTranslation = translatedText;
    }
    
    showSmartError(container, message) {
        if (!container) return;
        container.innerHTML = `<div style="color: #dc2626;">❌ ${message}</div>`;
        container.classList.add('show', 'error');
    }
    
    showSmartLoading(container, message = 'جاري المعالجة...') {
        if (!container) return;
        container.innerHTML = `<div class="loading"><div class="spinner"></div> ${message}</div>`;
        container.classList.add('show');
        container.classList.remove('error', 'success');
    }
    
    downloadSmartHistory() {
        if (this.smartTranslationHistory.length === 0) {
            alert('لا يوجد سجل ترجمة للحفظ');
            return;
        }
        
        const csv = 'النص الأصلي,الترجمة,اللغة المصدر,اللغة الهدف,التاريخ\n' + 
            this.smartTranslationHistory.map(item => 
                `"${item.original}","${item.translated}","${item.from}","${item.to}","${new Date(item.timestamp).toLocaleString('ar')}"`
            ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `smart_translation_history_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
    
    shareSmartResult() {
        if (!this.currentSmartTranslation) {
            alert('لا يوجد ترجمة للمشاركة');
            return;
        }
        
        if (navigator.share) {
            navigator.share({
                title: 'ترجمة من التطبيق الذكي',
                text: this.currentSmartTranslation
            });
        } else {
            navigator.clipboard.writeText(this.currentSmartTranslation).then(() => {
                alert('تم نسخ الترجمة للحافظة');
            });
        }
    }
}

// تشغيل التطبيق عند تحميل الصفحة
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VoiceTranslateApp();
});

// إضافة CSS للأزرار الجديدة
const style = document.createElement('style');
style.textContent = `
    .remove-favorite {
        background: #dc3545;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 15px;
        cursor: pointer;
        font-size: 0.8rem;
        margin-right: 8px;
        transition: all 0.3s ease;
    }
    
    .remove-favorite:hover {
        background: #c82333;
        transform: translateY(-1px);
    }
    
    .favorite-item > div {
        display: flex;
        gap: 8px;
    }
`;
document.head.appendChild(style);