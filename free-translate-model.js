// نموذج ترجمة مجاني بالكامل
// Free Translation Model - No API Keys Required

class FreeTranslationModel {
    constructor() {
        this.providers = [
            'mymemory',
            'lingva',
            'libretranslate',
            'googlefree'
        ];
        this.currentProviderIndex = 0;
        this.maxRetries = 3;
    }

    // الدالة الرئيسية للترجمة
    async translate(text, sourceLang = 'auto', targetLang = 'en') {
        if (!text || text.trim() === '') {
            throw new Error('النص المراد ترجمته فارغ');
        }

        // تنظيف النص
        text = text.trim();
        if (text.length > 5000) {
            throw new Error('النص طويل جداً. الحد الأقصى 5000 حرف');
        }

        // محاولة الترجمة مع جميع المزودين
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[this.currentProviderIndex];
            
            try {
                console.log(`محاولة الترجمة باستخدام: ${provider}`);
                const result = await this.translateWithProvider(text, sourceLang, targetLang, provider);
                
                if (result && result.translatedText) {
                    // تحديث المزود الحالي للاستخدام التالي
                    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
                    return {
                        success: true,
                        translatedText: result.translatedText,
                        sourceLang: result.sourceLang || sourceLang,
                        provider: provider,
                        confidence: result.confidence || 0.8
                    };
                }
            } catch (error) {
                console.warn(`فشل في الترجمة باستخدام ${provider}:`, error.message);
            }
            
            // الانتقال للمزود التالي
            this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
        }

        throw new Error('فشل في الترجمة باستخدام جميع المزودين المتاحين');
    }

    // ترجمة باستخدام مزود محدد
    async translateWithProvider(text, sourceLang, targetLang, provider) {
        switch (provider) {
            case 'mymemory':
                return await this.translateWithMyMemory(text, sourceLang, targetLang);
            case 'lingva':
                return await this.translateWithLingva(text, sourceLang, targetLang);
            case 'libretranslate':
                return await this.translateWithLibreTranslate(text, sourceLang, targetLang);
            case 'googlefree':
                return await this.translateWithGoogleFree(text, sourceLang, targetLang);
            default:
                throw new Error(`مزود غير مدعوم: ${provider}`);
        }
    }

    // MyMemory API (مجاني تماماً)
    async translateWithMyMemory(text, sourceLang, targetLang) {
        const langPair = sourceLang === 'auto' ? `auto|${targetLang}` : `${sourceLang}|${targetLang}`;
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}&de=translator@example.com`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FreeTranslateApp/1.0'
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`MyMemory API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
            return {
                translatedText: data.responseData.translatedText.trim(),
                sourceLang: sourceLang,
                confidence: data.responseData.match || 0.7
            };
        } else {
            throw new Error(`MyMemory API Error: ${data.responseStatus || 'Unknown error'}`);
        }
    }

    // Lingva Translate (مجاني ومفتوح المصدر)
    async translateWithLingva(text, sourceLang, targetLang) {
        // استخدام خادم Lingva العام
        const baseUrl = 'https://lingva.ml/api/v1';
        const source = sourceLang === 'auto' ? 'auto' : sourceLang;
        const apiUrl = `${baseUrl}/${source}/${targetLang}/${encodeURIComponent(text)}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FreeTranslateApp/1.0'
            },
            timeout: 8000
        });
        
        if (!response.ok) {
            throw new Error(`Lingva API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.translation) {
            return {
                translatedText: data.translation.trim(),
                sourceLang: data.info?.detectedSource || sourceLang,
                confidence: 0.8
            };
        } else {
            throw new Error('Lingva API: No translation found');
        }
    }

    // LibreTranslate (مجاني ومفتوح المصدر)
    async translateWithLibreTranslate(text, sourceLang, targetLang) {
        // استخدام خادم LibreTranslate العام
        const apiUrl = 'https://libretranslate.de/translate';
        
        const requestBody = {
            q: text,
            source: sourceLang === 'auto' ? 'auto' : sourceLang,
            target: targetLang,
            format: 'text'
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'FreeTranslateApp/1.0'
            },
            body: JSON.stringify(requestBody),
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`LibreTranslate API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.translatedText) {
            return {
                translatedText: data.translatedText.trim(),
                sourceLang: data.detectedLanguage || sourceLang,
                confidence: 0.85
            };
        } else {
            throw new Error('LibreTranslate API: No translation found');
        }
    }

    // Google Translate Free (بدون API key)
    async translateWithGoogleFree(text, sourceLang, targetLang) {
        // استخدام Google Translate بدون API key (محدود)
        const baseUrl = 'https://translate.googleapis.com/translate_a/single';
        const params = new URLSearchParams({
            client: 'gtx',
            sl: sourceLang === 'auto' ? 'auto' : sourceLang,
            tl: targetLang,
            dt: 't',
            q: text
        });
        
        const apiUrl = `${baseUrl}?${params.toString()}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        });
        
        if (!response.ok) {
            throw new Error(`Google Free API HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            let translatedText = '';
            for (let i = 0; i < data[0].length; i++) {
                if (data[0][i][0]) {
                    translatedText += data[0][i][0];
                }
            }
            
            return {
                translatedText: translatedText.trim(),
                sourceLang: data[2] || sourceLang,
                confidence: 0.9
            };
        } else {
            throw new Error('Google Free API: No translation found');
        }
    }

    // كشف اللغة
    async detectLanguage(text) {
        try {
            // استخدام MyMemory لكشف اللغة
            const result = await this.translateWithMyMemory(text, 'auto', 'en');
            return result.sourceLang || 'unknown';
        } catch (error) {
            console.warn('فشل في كشف اللغة:', error.message);
            return 'unknown';
        }
    }

    // الحصول على اللغات المدعومة
    getSupportedLanguages() {
        return {
            'ar': 'العربية',
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский',
            'ja': '日本語',
            'ko': '한국어',
            'zh': '中文',
            'hi': 'हिन्दी',
            'tr': 'Türkçe',
            'nl': 'Nederlands',
            'pl': 'Polski',
            'sv': 'Svenska',
            'da': 'Dansk',
            'no': 'Norsk',
            'fi': 'Suomi',
            'cs': 'Čeština',
            'sk': 'Slovenčina',
            'hu': 'Magyar',
            'ro': 'Română',
            'bg': 'Български',
            'hr': 'Hrvatski',
            'sr': 'Српски',
            'sl': 'Slovenščina',
            'et': 'Eesti',
            'lv': 'Latviešu',
            'lt': 'Lietuvių',
            'mt': 'Malti',
            'ga': 'Gaeilge',
            'cy': 'Cymraeg',
            'eu': 'Euskera',
            'ca': 'Català',
            'gl': 'Galego',
            'is': 'Íslenska',
            'mk': 'Македонски',
            'sq': 'Shqip',
            'bs': 'Bosanski',
            'me': 'Crnogorski',
            'auto': 'كشف تلقائي'
        };
    }

    // إحصائيات الاستخدام
    getProviderStats() {
        return {
            currentProvider: this.providers[this.currentProviderIndex],
            availableProviders: this.providers,
            totalProviders: this.providers.length
        };
    }
}

// تصدير النموذج
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeTranslationModel;
} else if (typeof window !== 'undefined') {
    window.FreeTranslationModel = FreeTranslationModel;
}