// إدارة صفحة تسجيل الدخول

class AuthManager {
    constructor() {
        this.db = userDB; // استخدام قاعدة البيانات
        this.initializeEventListeners();
        this.initializeFormValidation();
        this.checkExistingSession();
    }

    initializeEventListeners() {
        // إدارة التبديل بين تسجيل الدخول وإنشاء الحساب
        const tabButtons = document.querySelectorAll('.tab-btn');
        const formContainers = document.querySelectorAll('.form-container');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                this.switchTab(targetTab, tabButtons, formContainers);
            });
        });

        // إدارة إظهار/إخفاء كلمة المرور
        const toggleButtons = document.querySelectorAll('.toggle-password');
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.togglePasswordVisibility(button);
            });
        });

        // إدارة إرسال النماذج
        const loginForm = document.querySelector('#login-form .auth-form');
        const registerForm = document.querySelector('#register-form .auth-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // إدارة تسجيل الدخول عبر وسائل التواصل الاجتماعي
        const socialButtons = document.querySelectorAll('.social-btn');
        socialButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleSocialLogin(button);
            });
        });

        // إدارة رابط نسيان كلمة المرور
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }

    switchTab(targetTab, tabButtons, formContainers) {
        // إزالة الفئة النشطة من جميع الأزرار والنماذج
        tabButtons.forEach(btn => btn.classList.remove('active'));
        formContainers.forEach(container => container.classList.remove('active'));

        // إضافة الفئة النشطة للزر والنموذج المحدد
        const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const activeContainer = document.getElementById(`${targetTab}-form`);

        if (activeButton && activeContainer) {
            activeButton.classList.add('active');
            activeContainer.classList.add('active');
        }
    }

    togglePasswordVisibility(button) {
        const targetId = button.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput) {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            button.textContent = isPassword ? '🙈' : '👁️';
        }
    }

    initializeFormValidation() {
        // التحقق من صحة البريد الإلكتروني في الوقت الفعلي
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateEmail(input));
            input.addEventListener('input', () => this.clearValidationError(input));
        });

        // التحقق من قوة كلمة المرور
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.id.includes('register')) {
                input.addEventListener('input', () => this.validatePasswordStrength(input));
            }
        });

        // التحقق من تطابق كلمات المرور
        const confirmPasswordInput = document.getElementById('confirm-password');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('blur', () => this.validatePasswordMatch());
        }
    }

    validateEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(input.value);
        
        this.setInputValidation(input, isValid, isValid ? '' : 'يرجى إدخال بريد إلكتروني صحيح');
        return isValid;
    }

    validatePasswordStrength(input) {
        const password = input.value;
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const isStrong = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
        
        let message = '';
        if (password.length < minLength) {
            message = `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`;
        } else if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            message = 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام';
        }

        this.setInputValidation(input, isStrong, message);
        return isStrong;
    }

    validatePasswordMatch() {
        const password = document.getElementById('register-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        if (password && confirmPassword) {
            const isMatch = password.value === confirmPassword.value;
            this.setInputValidation(confirmPassword, isMatch, isMatch ? '' : 'كلمات المرور غير متطابقة');
            return isMatch;
        }
        return false;
    }

    setInputValidation(input, isValid, message) {
        const inputGroup = input.closest('.input-group');
        
        // إزالة رسائل الخطأ السابقة
        const existingError = inputGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // تحديث حالة الإدخال
        if (isValid) {
            input.style.borderColor = '#28a745';
        } else {
            input.style.borderColor = '#dc3545';
            
            if (message) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = message;
                errorElement.style.color = '#dc3545';
                errorElement.style.fontSize = '0.8rem';
                errorElement.style.marginTop = '5px';
                inputGroup.appendChild(errorElement);
            }
        }
    }

    clearValidationError(input) {
        const inputGroup = input.closest('.input-group');
        const errorMessage = inputGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
        input.style.borderColor = '#e1e5e9';
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // التحقق من صحة البيانات
        if (!this.validateEmail(document.getElementById('login-email'))) {
            return;
        }

        if (!email || !password) {
            this.showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        // إظهار مؤشر التحميل
        const submitButton = event.target.querySelector('.auth-btn');
        this.setButtonLoading(submitButton, true);

        try {
            // تسجيل الدخول باستخدام قاعدة البيانات
            const user = this.db.loginUser(email, password);
            
            this.showMessage('تم تسجيل الدخول بنجاح!', 'success');
            
            // حفظ بيانات المستخدم
            this.saveUserSession(email, rememberMe);
            
            // إعادة توجيه إلى الصفحة الرئيسية
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const agreeTerms = document.getElementById('agree-terms').checked;

        // التحقق من صحة البيانات
        if (!name || !email || !password || !confirmPassword) {
            this.showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        if (!this.validateEmail(document.getElementById('register-email'))) {
            return;
        }

        if (!this.validatePasswordStrength(document.getElementById('register-password'))) {
            return;
        }

        if (!this.validatePasswordMatch()) {
            return;
        }

        if (!agreeTerms) {
            this.showMessage('يرجى الموافقة على الشروط والأحكام', 'error');
            return;
        }

        // إظهار مؤشر التحميل
        const submitButton = event.target.querySelector('.auth-btn');
        this.setButtonLoading(submitButton, true);

        try {
            // إنشاء حساب جديد باستخدام قاعدة البيانات
            const user = this.db.registerUser(email, password, name);
            
            this.showMessage('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني.', 'success');
            
            // محاكاة إرسال رمز التحقق
            this.simulateEmailVerification(user.email, user.verificationCode);
            
            // التبديل إلى نموذج التحقق
            this.showEmailVerificationForm(user.email);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    // التحقق من وجود جلسة سابقة
    checkExistingSession() {
        const authStatus = this.db.getAuthStatus();
        
        if (authStatus.isAuthenticated && !authStatus.isGuest) {
            // المستخدم مسجل دخول بالفعل
            window.location.href = 'index.html';
        } else if (authStatus.isGuest) {
            // عرض خيار المتابعة كضيف
            this.showGuestSessionInfo();
        }
    }

    // عرض معلومات جلسة الضيف
    showGuestSessionInfo() {
        const guestInfo = document.createElement('div');
        guestInfo.className = 'guest-session-info';
        guestInfo.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 text-blue-700 mb-2">
                    <span class="material-symbols-outlined">info</span>
                    <span class="font-medium">جلسة ضيف نشطة</span>
                </div>
                <p class="text-blue-600 text-sm mb-3">لديك جلسة ضيف نشطة. يمكنك المتابعة أو تسجيل الدخول للحصول على ميزات إضافية.</p>
                <div class="flex gap-2">
                    <button onclick="window.location.href='index.html'" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        متابعة كضيف
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                        تسجيل دخول جديد
                    </button>
                </div>
            </div>
        `;
        
        const container = document.querySelector('.login-container main');
        container.insertBefore(guestInfo, container.firstChild);
    }

    // محاكاة إرسال رمز التحقق عبر البريد الإلكتروني
    simulateEmailVerification(email, code) {
        console.log(`رمز التحقق لـ ${email}: ${code}`);
        
        // في التطبيق الحقيقي، سيتم إرسال البريد الإلكتروني هنا
        // يمكن استخدام خدمات مثل EmailJS أو SendGrid
        
        // عرض الرمز للمستخدم (للاختبار فقط)
        setTimeout(() => {
            alert(`رمز التحقق (للاختبار): ${code}`);
        }, 1000);
    }

    // عرض نموذج التحقق من البريد الإلكتروني
    showEmailVerificationForm(email) {
        const verificationForm = document.createElement('div');
        verificationForm.className = 'verification-form';
        verificationForm.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto mt-4">
                <div class="text-center mb-4">
                    <span class="material-symbols-outlined text-green-600 text-4xl mb-2">mark_email_read</span>
                    <h3 class="text-lg font-bold text-gray-900">تحقق من بريدك الإلكتروني</h3>
                    <p class="text-gray-600 text-sm mt-2">تم إرسال رمز التحقق إلى ${email}</p>
                </div>
                
                <form id="verification-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">رمز التحقق</label>
                        <input type="text" id="verification-code" maxlength="6" 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                               placeholder="000000" required>
                    </div>
                    
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        تحقق من الرمز
                    </button>
                    
                    <div class="text-center">
                        <button type="button" id="resend-code" class="text-blue-600 text-sm hover:underline">
                            إعادة إرسال الرمز
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(verificationForm);
        
        // إضافة مستمعي الأحداث
        const form = verificationForm.querySelector('#verification-form');
        form.addEventListener('submit', (e) => this.handleEmailVerification(e, email));
        
        const resendBtn = verificationForm.querySelector('#resend-code');
        resendBtn.addEventListener('click', () => this.resendVerificationCode(email));
    }

    // معالجة التحقق من البريد الإلكتروني
    async handleEmailVerification(event, email) {
        event.preventDefault();
        
        const code = document.getElementById('verification-code').value;
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        if (code.length !== 6) {
            this.showMessage('يرجى إدخال رمز التحقق المكون من 6 أرقام', 'error');
            return;
        }
        
        this.setButtonLoading(submitButton, true);
        
        try {
            const user = this.db.verifyEmail(email, code);
            
            this.showMessage('تم التحقق من البريد الإلكتروني بنجاح!', 'success');
            
            // تسجيل الدخول التلقائي
            this.db.saveCurrentUser(user);
            
            // إزالة نموذج التحقق
            document.querySelector('.verification-form').remove();
            
            // إعادة توجيه إلى الصفحة الرئيسية
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    // إعادة إرسال رمز التحقق
    resendVerificationCode(email) {
        const user = this.db.findUserByEmail(email);
        if (user) {
            const newCode = this.db.generateVerificationCode();
            user.verificationCode = newCode;
            this.db.saveUsers();
            
            this.simulateEmailVerification(email, newCode);
            this.showMessage('تم إعادة إرسال رمز التحقق', 'success');
        }
    }

    saveUserSession(email, rememberMe) {
        const userData = {
            email: email,
            loginTime: new Date().toISOString(),
            isLoggedIn: true
        };

        if (rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(userData));
        }
    }

    handleSocialLogin(button) {
        const provider = button.classList.contains('google-btn') ? 'Google' : 'Phone';
        
        this.setButtonLoading(button, true);
        
        // محاكاة تسجيل الدخول عبر وسائل التواصل الاجتماعي
        setTimeout(() => {
            this.setButtonLoading(button, false);
            this.showMessage(`تسجيل الدخول عبر ${provider} غير متاح حالياً`, 'info');
        }, 1000);
    }

    handleForgotPassword() {
        const email = prompt('يرجى إدخال بريدك الإلكتروني لإعادة تعيين كلمة المرور:');
        
        if (email) {
            if (this.validateEmail({ value: email })) {
                this.showMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
            } else {
                this.showMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            }
        }
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            const originalText = button.querySelector('.btn-text').textContent;
            button.querySelector('.btn-text').textContent = 'جاري التحميل...';
            button.querySelector('.btn-icon').textContent = '⏳';
            button.setAttribute('data-original-text', originalText);
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.querySelector('.btn-text').textContent = originalText;
                button.querySelector('.btn-icon').textContent = button.classList.contains('login-btn') ? '🚀' : '✨';
            }
        }
    }

    showMessage(message, type = 'info') {
        // إزالة الرسائل السابقة
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // إنشاء رسالة جديدة
        const messageElement = document.createElement('div');
        messageElement.className = `auth-message ${type}`;
        messageElement.textContent = message;
        
        // تنسيق الرسالة
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;

        // تحديد لون الرسالة حسب النوع
        switch (type) {
            case 'success':
                messageElement.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                break;
            case 'error':
                messageElement.style.background = 'linear-gradient(135deg, #dc3545, #e74c3c)';
                break;
            case 'info':
                messageElement.style.background = 'linear-gradient(135deg, #17a2b8, #3498db)';
                break;
            default:
                messageElement.style.background = 'linear-gradient(135deg, #6c757d, #495057)';
        }

        document.body.appendChild(messageElement);

        // إزالة الرسالة بعد 4 ثوانٍ
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    messageElement.remove();
                }, 300);
            }
        }, 4000);
    }
}

// تهيئة مدير المصادقة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// إضافة تأثيرات CSS للرسائل
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// التحقق من حالة تسجيل الدخول السابقة
function checkExistingSession() {
    const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    
    if (sessionData) {
        try {
            const userData = JSON.parse(sessionData);
            if (userData.isLoggedIn) {
                // إعادة توجيه إلى الصفحة الرئيسية إذا كان المستخدم مسجل دخوله بالفعل
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('خطأ في قراءة بيانات الجلسة:', error);
        }
    }
}

// التحقق من الجلسة عند تحميل الصفحة
checkExistingSession();