// نظام قاعدة البيانات المحلية للمستخدمين
class UserDatabase {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.guestSession = this.loadGuestSession();
    }

    // تحميل المستخدمين من localStorage
    loadUsers() {
        const users = localStorage.getItem('app_users');
        return users ? JSON.parse(users) : [];
    }

    // حفظ المستخدمين في localStorage
    saveUsers() {
        localStorage.setItem('app_users', JSON.stringify(this.users));
    }

    // تحميل المستخدم الحالي
    loadCurrentUser() {
        const user = localStorage.getItem('current_user');
        return user ? JSON.parse(user) : null;
    }

    // حفظ المستخدم الحالي
    saveCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
    }

    // تحميل جلسة الضيف
    loadGuestSession() {
        const session = localStorage.getItem('guest_session');
        return session ? JSON.parse(session) : null;
    }

    // حفظ جلسة الضيف
    saveGuestSession(session) {
        this.guestSession = session;
        localStorage.setItem('guest_session', JSON.stringify(session));
    }

    // تسجيل مستخدم جديد
    registerUser(email, password, name = '') {
        // التحقق من وجود المستخدم
        if (this.findUserByEmail(email)) {
            throw new Error('البريد الإلكتروني مستخدم بالفعل');
        }

        // التحقق من صحة البيانات
        if (!email || !password) {
            throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        if (password.length < 6) {
            throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }

        const user = {
            id: this.generateUserId(),
            email: email,
            password: this.hashPassword(password),
            name: name,
            createdAt: new Date().toISOString(),
            isVerified: false,
            verificationCode: this.generateVerificationCode(),
            conversations: [],
            messages: []
        };

        this.users.push(user);
        this.saveUsers();
        return user;
    }

    // تسجيل الدخول
    loginUser(email, password) {
        const user = this.findUserByEmail(email);
        if (!user) {
            throw new Error('البريد الإلكتروني غير موجود');
        }

        if (!this.verifyPassword(password, user.password)) {
            throw new Error('كلمة المرور غير صحيحة');
        }

        this.saveCurrentUser(user);
        return user;
    }

    // تسجيل الخروج
    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('current_user');
    }

    // البحث عن مستخدم بالبريد الإلكتروني
    findUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    // البحث عن مستخدم بالمعرف
    findUserById(id) {
        return this.users.find(user => user.id === id);
    }

    // تحديث بيانات المستخدم
    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            throw new Error('المستخدم غير موجود');
        }

        // تحديث البيانات
        this.users[userIndex] = { ...this.users[userIndex], ...updates };
        this.saveUsers();

        // تحديث المستخدم الحالي إذا كان هو نفسه
        if (this.currentUser && this.currentUser.id === userId) {
            this.saveCurrentUser(this.users[userIndex]);
        }
    }

    // التحقق من البريد الإلكتروني
    verifyEmail(email, code) {
        const user = this.findUserByEmail(email);
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }

        if (user.verificationCode !== code) {
            throw new Error('رمز التحقق غير صحيح');
        }

        this.updateUser(user.id, { isVerified: true, verificationCode: null });
        return true;
    }

    // إنشاء جلسة ضيف
    createGuestSession(duration = 30) {
        const session = {
            id: this.generateUserId(),
            startTime: new Date().toISOString(),
            duration: duration, // بالدقائق
            expiresAt: new Date(Date.now() + duration * 60 * 1000).toISOString(),
            conversations: []
        };

        this.saveGuestSession(session);
        return session;
    }

    // التحقق من صحة جلسة الضيف
    isGuestSessionValid() {
        if (!this.guestSession) return false;
        
        const now = new Date();
        const expiresAt = new Date(this.guestSession.expiresAt);
        
        return now < expiresAt;
    }

    // إنهاء جلسة الضيف
    endGuestSession() {
        this.guestSession = null;
        localStorage.removeItem('guest_session');
    }

    // الحصول على حالة المصادقة
    getAuthStatus() {
        if (this.currentUser) {
            return {
                isAuthenticated: true,
                user: this.currentUser,
                type: 'user'
            };
        }
        
        if (this.isGuestSessionValid()) {
            return {
                isAuthenticated: true,
                session: this.guestSession,
                type: 'guest'
            };
        }
        
        return {
            isAuthenticated: false,
            type: 'none'
        };
    }

    // إضافة محادثة للمستخدم
    addConversation(userId, conversation) {
        const user = this.findUserById(userId);
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }

        if (!user.conversations) {
            user.conversations = [];
        }

        conversation.id = this.generateConversationId();
        conversation.createdAt = new Date().toISOString();
        user.conversations.push(conversation);
        
        this.updateUser(userId, { conversations: user.conversations });
        return conversation;
    }

    // الحصول على محادثات المستخدم
    getUserConversations(userId) {
        const user = this.findUserById(userId);
        return user ? user.conversations || [] : [];
    }

    // إرسال رسالة عبر البريد الإلكتروني
    sendEmailMessage(fromUserId, toEmail, message) {
        const fromUser = this.findUserById(fromUserId);
        const toUser = this.findUserByEmail(toEmail);
        
        if (!fromUser) {
            throw new Error('المرسل غير موجود');
        }
        
        if (!toUser) {
            throw new Error('المستقبل غير موجود');
        }
        
        const messageObj = {
            id: this.generateMessageId(),
            fromUserId: fromUserId,
            fromUserEmail: fromUser.email,
            fromUserName: fromUser.name || fromUser.email,
            toUserId: toUser.id,
            toUserEmail: toEmail,
            message: message,
            sentAt: new Date().toISOString(),
            isRead: false
        };
        
        // إضافة الرسالة لصندوق الوارد للمستقبل
        if (!toUser.messages) {
            toUser.messages = [];
        }
        toUser.messages.push(messageObj);
        
        // إضافة الرسالة لصندوق الصادر للمرسل
        if (!fromUser.sentMessages) {
            fromUser.sentMessages = [];
        }
        fromUser.sentMessages.push(messageObj);
        
        this.updateUser(toUser.id, { messages: toUser.messages });
        this.updateUser(fromUser.id, { sentMessages: fromUser.sentMessages });
        
        return messageObj;
    }

    // الحصول على رسائل المستخدم
    getUserMessages(userId) {
        const user = this.findUserById(userId);
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }
        
        return {
            inbox: user.messages || [],
            sent: user.sentMessages || []
        };
    }

    // تحديد الرسالة كمقروءة
    markMessageAsRead(userId, messageId) {
        const user = this.findUserById(userId);
        if (!user || !user.messages) {
            return false;
        }
        
        const message = user.messages.find(msg => msg.id === messageId);
        if (message) {
            message.isRead = true;
            this.updateUser(userId, { messages: user.messages });
            return true;
        }
        
        return false;
    }

    // توليد معرف مستخدم فريد
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // توليد معرف محادثة فريد
    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // توليد معرف رسالة فريد
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // توليد رمز تحقق
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // تشفير كلمة المرور (تشفير بسيط للتطوير)
    hashPassword(password) {
        // في التطبيق الحقيقي، استخدم مكتبة تشفير قوية
        return btoa(password + 'salt_key_2024');
    }

    // التحقق من كلمة المرور
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    // إعادة تعيين كلمة المرور
    resetPassword(email) {
        const user = this.findUserByEmail(email);
        if (!user) {
            throw new Error('البريد الإلكتروني غير موجود');
        }

        const resetCode = this.generateVerificationCode();
        this.updateUser(user.id, { 
            resetCode: resetCode,
            resetCodeExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 دقيقة
        });

        // في التطبيق الحقيقي، أرسل الرمز عبر البريد الإلكتروني
        console.log(`رمز إعادة تعيين كلمة المرور لـ ${email}: ${resetCode}`);
        
        return resetCode;
    }

    // تأكيد إعادة تعيين كلمة المرور
    confirmPasswordReset(email, code, newPassword) {
        const user = this.findUserByEmail(email);
        if (!user) {
            throw new Error('البريد الإلكتروني غير موجود');
        }

        if (!user.resetCode || user.resetCode !== code) {
            throw new Error('رمز إعادة التعيين غير صحيح');
        }

        const now = new Date();
        const expiry = new Date(user.resetCodeExpiry);
        if (now > expiry) {
            throw new Error('رمز إعادة التعيين منتهي الصلاحية');
        }

        if (newPassword.length < 6) {
            throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }

        this.updateUser(user.id, {
            password: this.hashPassword(newPassword),
            resetCode: null,
            resetCodeExpiry: null
        });

        return true;
    }
}

// إنشاء مثيل عام من قاعدة البيانات
const userDB = new UserDatabase();

// تصدير الكلاس للاستخدام في Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDatabase;
}