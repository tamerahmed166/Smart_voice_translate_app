// Language Manager - نظام إدارة اللغات
class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('app_language') || 'ar';
        this.translations = {
            ar: {
                // صفحة التسجيل
                'welcome_title': 'مرحباً بك في تطبيق الترجمة الصوتية',
                'login_title': 'تسجيل الدخول',
                'username_label': 'اسم المستخدم',
                'password_label': 'كلمة المرور',
                'login_button': 'دخول',
                'register_button': 'إنشاء حساب جديد',
                'forgot_password': 'نسيت كلمة المرور؟',
                'remember_me': 'تذكرني',
                
                // صفحة الإعدادات
                'settings_title': 'الإعدادات',
                'language_setting': 'اللغة',
                'arabic_lang': 'العربية',
                'english_lang': 'English',
                'voice_settings': 'إعدادات الصوت',
                'microphone_test': 'اختبار الميكروفون',
                'speaker_test': 'اختبار السماعات',
                'translation_settings': 'إعدادات الترجمة',
                'auto_translate': 'الترجمة التلقائية',
                'save_settings': 'حفظ الإعدادات',
                'reset_settings': 'إعادة تعيين',
                'back_to_home': 'العودة للرئيسية',
                
                // صفحة المحادثة الثنائية
                'dual_conversation_title': 'المحادثة الثنائية',
                'person_a': 'الشخص أ',
                'person_b': 'الشخص ب',
                'start_recording': 'بدء التسجيل',
                'stop_recording': 'إيقاف التسجيل',
                'play_audio': 'تشغيل الصوت',
                'translate_text': 'ترجمة النص',
                'clear_conversation': 'مسح المحادثة',
                'switch_mode': 'تبديل الوضع',
                'face_to_face_mode': 'وضع وجهاً لوجه',
                'remote_mode': 'الوضع عن بُعد',
                'join_room': 'انضمام لغرفة',
                'create_room': 'إنشاء غرفة',
                'room_code': 'رمز الغرفة',
                'connected': 'متصل',
                'disconnected': 'غير متصل',
                'connecting': 'جاري الاتصال...',
                'reconnect': 'إعادة الاتصال',
                
                // صفحة المحادثة الذكية
                'smart_translate_title': 'الترجمة الذكية',
                'speak_now': 'تحدث الآن',
                'listening': 'جاري الاستماع...',
                'processing': 'جاري المعالجة...',
                'translation_result': 'نتيجة الترجمة',
                'detected_language': 'اللغة المكتشفة',
                'target_language': 'اللغة المستهدفة',
                'copy_text': 'نسخ النص',
                'share_translation': 'مشاركة الترجمة',
                'history': 'السجل',
                'clear_history': 'مسح السجل',
                
                // رسائل عامة
                'loading': 'جاري التحميل...',
                'error': 'خطأ',
                'success': 'نجح',
                'cancel': 'إلغاء',
                'confirm': 'تأكيد',
                'close': 'إغلاق',
                'retry': 'إعادة المحاولة',
                'microphone_permission': 'يرجى السماح بالوصول للميكروفون',
                'network_error': 'خطأ في الشبكة',
                'translation_failed': 'فشلت الترجمة',
                'audio_playback_failed': 'فشل تشغيل الصوت'
            },
            en: {
                // Login page
                'welcome_title': 'Welcome to Voice Translation App',
                'login_title': 'Login',
                'username_label': 'Username',
                'password_label': 'Password',
                'login_button': 'Login',
                'register_button': 'Create New Account',
                'forgot_password': 'Forgot Password?',
                'remember_me': 'Remember Me',
                
                // Settings page
                'settings_title': 'Settings',
                'language_setting': 'Language',
                'arabic_lang': 'العربية',
                'english_lang': 'English',
                'voice_settings': 'Voice Settings',
                'microphone_test': 'Test Microphone',
                'speaker_test': 'Test Speakers',
                'translation_settings': 'Translation Settings',
                'auto_translate': 'Auto Translate',
                'save_settings': 'Save Settings',
                'reset_settings': 'Reset Settings',
                'back_to_home': 'Back to Home',
                
                // Dual conversation page
                'dual_conversation_title': 'Dual Conversation',
                'person_a': 'Person A',
                'person_b': 'Person B',
                'start_recording': 'Start Recording',
                'stop_recording': 'Stop Recording',
                'play_audio': 'Play Audio',
                'translate_text': 'Translate Text',
                'clear_conversation': 'Clear Conversation',
                'switch_mode': 'Switch Mode',
                'face_to_face_mode': 'Face-to-Face Mode',
                'remote_mode': 'Remote Mode',
                'join_room': 'Join Room',
                'create_room': 'Create Room',
                'room_code': 'Room Code',
                'connected': 'Connected',
                'disconnected': 'Disconnected',
                'connecting': 'Connecting...',
                'reconnect': 'Reconnect',
                
                // Smart translate page
                'smart_translate_title': 'Smart Translation',
                'speak_now': 'Speak Now',
                'listening': 'Listening...',
                'processing': 'Processing...',
                'translation_result': 'Translation Result',
                'detected_language': 'Detected Language',
                'target_language': 'Target Language',
                'copy_text': 'Copy Text',
                'share_translation': 'Share Translation',
                'history': 'History',
                'clear_history': 'Clear History',
                
                // General messages
                'loading': 'Loading...',
                'error': 'Error',
                'success': 'Success',
                'cancel': 'Cancel',
                'confirm': 'Confirm',
                'close': 'Close',
                'retry': 'Retry',
                'microphone_permission': 'Please allow microphone access',
                'network_error': 'Network Error',
                'translation_failed': 'Translation Failed',
                'audio_playback_failed': 'Audio Playback Failed'
            }
        };
        
        this.init();
    }
    
    init() {
        // تطبيق اللغة المحفوظة عند تحميل الصفحة
        this.applyLanguage();
        
        // إضافة مستمع لتغيير اللغة
        document.addEventListener('languageChanged', (event) => {
            this.setLanguage(event.detail.language);
        });
    }
    
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('app_language', language);
            this.applyLanguage();
            
            // إرسال حدث تغيير اللغة
            document.dispatchEvent(new CustomEvent('languageApplied', {
                detail: { language: language }
            }));
        }
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    
    applyLanguage() {
        // تطبيق اتجاه النص
        document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLanguage;
        
        // ترجمة جميع العناصر التي تحتوي على data-translate
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        elementsToTranslate.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
                element.placeholder = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // ترجمة العناصر التي تحتوي على data-translate-title
        const elementsWithTitle = document.querySelectorAll('[data-translate-title]');
        elementsWithTitle.forEach(element => {
            const key = element.getAttribute('data-translate-title');
            element.title = this.translate(key);
        });
    }
    
    // دالة مساعدة لإضافة خيارات اللغة إلى select
    populateLanguageSelect(selectElement) {
        selectElement.innerHTML = `
            <option value="ar" ${this.currentLanguage === 'ar' ? 'selected' : ''}>${this.translate('arabic_lang')}</option>
            <option value="en" ${this.currentLanguage === 'en' ? 'selected' : ''}>${this.translate('english_lang')}</option>
        `;
        
        selectElement.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    }
}

// إنشاء مثيل عام من مدير اللغات
const languageManager = new LanguageManager();

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}