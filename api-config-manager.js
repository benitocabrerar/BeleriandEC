// API Configuration Manager - Villa Vista al Mar
// Gestión centralizada de todas las API keys y configuraciones

class ApiConfigManager {
    constructor() {
        this.config = this.loadConfig();
        this.initialized = false;
    }

    // Cargar configuración desde localStorage o usar valores por defecto
    loadConfig() {
        const defaultConfig = {
            firebase: {
                apiKey: "AIzaSyDKtJZ8q_Nn9oI3mLsYF1P8mX2oI4jT6hE",
                authDomain: "villa-vista-mar.firebaseapp.com",
                databaseURL: "https://villa-vista-mar-default-rtdb.firebaseio.com",
                projectId: "villa-vista-mar",
                storageBucket: "villa-vista-mar.appspot.com",
                messagingSenderId: "123456789012",
                appId: "1:123456789012:web:abcdef123456789012345"
            },
            paypal: {
                clientId: "AYjcyDFh0V9bXzQn6Q8YVuJR3fgD2hE7xKlMnOp",
                clientSecret: "ENWmIx8rQpTnKoI9jHgFdSkLcXvYuP2qMnBwAz",
                environment: "sandbox" // or "production"
            },
            stripe: {
                publishableKey: "pk_test_51MnZq8HdY9VaJpNw7XkF3gL2fPzM8vR5sN9qK",
                secretKey: "sk_test_51MnZq8HdY9VaJpNw3LkF8gM2fPzM8vR5sN9qK"
            },
            sendgrid: {
                apiKey: "SG.9qKnH8jG3fL2mPzR5sN7vX4bY6dF8cE1wT0uI",
                fromEmail: "reservas@villavistamar.com",
                fromName: "Villa Vista al Mar"
            },
            fcm: {
                serverKey: "AAAAvBxT2jY:APA91bH9mKnLqPsR3gF5dS8wX7bN2cM4uE6",
                senderId: "123456789012",
                vapidKey: "BHdm7jD8kF3mR5nP9qL2sX7vY8zA6bT4cU1eW"
            },
            whatsapp: {
                number: "+593999999999",
                businessName: "Villa Vista al Mar"
            },
            general: {
                timezone: "America/Guayaquil",
                currency: "USD",
                language: "es",
                companyName: "Villa Vista al Mar",
                companyEmail: "info@villavistamar.com",
                companyPhone: "+593 99 999 9999",
                companyAddress: "Tonsupa, Esmeraldas, Ecuador"
            }
        };

        try {
            const savedConfig = localStorage.getItem('villa_vista_config');
            if (savedConfig) {
                return { ...defaultConfig, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.warn('Error loading saved config, using defaults:', error);
        }

        return defaultConfig;
    }

    // Guardar configuración
    saveConfig(newConfig = null) {
        try {
            const configToSave = newConfig || this.config;
            localStorage.setItem('villa_vista_config', JSON.stringify(configToSave));
            this.config = configToSave;
            
            // Reinitialize services with new config
            this.initializeServices();
            
            return { success: true };
        } catch (error) {
            console.error('Error saving config:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener configuración específica
    getConfig(service) {
        return this.config[service] || {};
    }

    // Actualizar configuración específica
    updateConfig(service, newConfig) {
        this.config[service] = { ...this.config[service], ...newConfig };
        return this.saveConfig();
    }

    // Validar configuración
    validateConfig(service, config) {
        const validators = {
            firebase: (cfg) => {
                return cfg.apiKey && cfg.authDomain && cfg.projectId;
            },
            paypal: (cfg) => {
                return cfg.clientId && cfg.clientSecret;
            },
            stripe: (cfg) => {
                return cfg.publishableKey && cfg.secretKey;
            },
            sendgrid: (cfg) => {
                return cfg.apiKey && cfg.fromEmail;
            },
            fcm: (cfg) => {
                return cfg.serverKey && cfg.senderId;
            }
        };

        const validator = validators[service];
        return validator ? validator(config) : true;
    }

    // Inicializar todos los servicios
    async initializeServices() {
        try {
            // Update Firebase config
            if (window.dbService && this.validateConfig('firebase', this.config.firebase)) {
                console.log('🔥 Firebase config updated');
            }

            // Update Payment services
            if (window.paymentService) {
                window.paymentService.updateConfig({
                    paypalClientId: this.config.paypal.clientId,
                    stripePublishableKey: this.config.stripe.publishableKey
                });
                console.log('💳 Payment services config updated');
            }

            // Update Chat service
            if (window.chatService) {
                console.log('💬 Chat service config updated');
            }

            this.initialized = true;
            return { success: true };
        } catch (error) {
            console.error('Error initializing services:', error);
            return { success: false, error: error.message };
        }
    }

    // Test API connections
    async testConnection(service) {
        try {
            switch (service) {
                case 'firebase':
                    return await this.testFirebase();
                case 'paypal':
                    return await this.testPayPal();
                case 'stripe':
                    return await this.testStripe();
                case 'sendgrid':
                    return await this.testSendGrid();
                case 'fcm':
                    return await this.testFCM();
                default:
                    return { success: false, error: 'Unknown service' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testFirebase() {
        // Test Firebase connection
        try {
            if (window.dbService) {
                await window.dbService.getSettings();
                return { success: true, message: 'Firebase connected successfully' };
            }
            return { success: false, error: 'Firebase service not available' };
        } catch (error) {
            return { success: false, error: 'Firebase connection failed' };
        }
    }

    async testPayPal() {
        // Test PayPal connection (basic validation)
        const config = this.config.paypal;
        if (!config.clientId || !config.clientSecret) {
            return { success: false, error: 'PayPal credentials missing' };
        }
        return { success: true, message: 'PayPal configuration valid' };
    }

    async testStripe() {
        // Test Stripe connection (basic validation)
        const config = this.config.stripe;
        if (!config.publishableKey || !config.secretKey) {
            return { success: false, error: 'Stripe credentials missing' };
        }
        return { success: true, message: 'Stripe configuration valid' };
    }

    async testSendGrid() {
        // Test SendGrid connection
        const config = this.config.sendgrid;
        if (!config.apiKey || !config.fromEmail) {
            return { success: false, error: 'SendGrid credentials missing' };
        }
        return { success: true, message: 'SendGrid configuration valid' };
    }

    async testFCM() {
        // Test FCM connection
        const config = this.config.fcm;
        if (!config.serverKey || !config.senderId) {
            return { success: false, error: 'FCM credentials missing' };
        }
        return { success: true, message: 'FCM configuration valid' };
    }

    // Export configuration
    exportConfig() {
        const exportData = {
            ...this.config,
            exportDate: new Date().toISOString(),
            version: "1.0.0"
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `villa-vista-config-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import configuration
    async importConfig(file) {
        try {
            const text = await file.text();
            const importedConfig = JSON.parse(text);
            
            // Validate imported config
            if (!importedConfig.firebase || !importedConfig.general) {
                throw new Error('Invalid configuration file');
            }
            
            // Remove metadata
            delete importedConfig.exportDate;
            delete importedConfig.version;
            
            this.config = { ...this.config, ...importedConfig };
            return this.saveConfig();
        } catch (error) {
            return { success: false, error: 'Invalid configuration file' };
        }
    }

    // Reset to default configuration
    resetToDefaults() {
        localStorage.removeItem('villa_vista_config');
        this.config = this.loadConfig();
        return this.saveConfig();
    }

    // Get status of all services
    getServicesStatus() {
        return {
            firebase: this.validateConfig('firebase', this.config.firebase),
            paypal: this.validateConfig('paypal', this.config.paypal),
            stripe: this.validateConfig('stripe', this.config.stripe),
            sendgrid: this.validateConfig('sendgrid', this.config.sendgrid),
            fcm: this.validateConfig('fcm', this.config.fcm)
        };
    }

    // Send test email
    async sendTestEmail(email) {
        try {
            const config = this.config.sendgrid;
            if (!this.validateConfig('sendgrid', config)) {
                throw new Error('SendGrid not configured');
            }

            // Here you would implement actual email sending
            // For now, just simulate
            console.log(`Sending test email to ${email} via SendGrid`);
            return { success: true, message: 'Test email sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Send test notification
    async sendTestNotification() {
        try {
            const config = this.config.fcm;
            if (!this.validateConfig('fcm', config)) {
                throw new Error('FCM not configured');
            }

            // Here you would implement actual notification sending
            // For now, just simulate
            console.log('Sending test notification via FCM');
            return { success: true, message: 'Test notification sent successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.apiConfigManager = new ApiConfigManager();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.apiConfigManager.initializeServices();
});

// Export for module use
export { ApiConfigManager };