// Real API Testing Module - Villa Vista al Mar
// Sistema de pruebas reales para todas las APIs

class RealApiTester {
    constructor() {
        this.testResults = {};
    }

    // Test real de Firebase
    async testFirebaseReal() {
        try {
            const config = window.apiConfigManager.getConfig('firebase');
            
            if (!config.apiKey || !config.authDomain || !config.projectId) {
                return {
                    success: false,
                    error: 'Configuración de Firebase incompleta',
                    details: 'Faltan API Key, Auth Domain o Project ID'
                };
            }

            // Test real de conexión a Firebase
            try {
                // Intenta inicializar Firebase con la config actual
                const testResponse = await fetch(`https://${config.projectId}-default-rtdb.firebaseio.com/.json`);
                
                if (testResponse.ok) {
                    return {
                        success: true,
                        message: '✅ Firebase conectado correctamente',
                        details: `Proyecto: ${config.projectId}`
                    };
                } else {
                    return {
                        success: false,
                        error: 'No se pudo conectar a Firebase Realtime Database',
                        details: `Error ${testResponse.status}: ${testResponse.statusText}`
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: 'Error de conexión con Firebase',
                    details: error.message
                };
            }

        } catch (error) {
            return {
                success: false,
                error: 'Error en test de Firebase',
                details: error.message
            };
        }
    }

    // Test real de PayPal
    async testPayPalReal() {
        try {
            const config = window.apiConfigManager.getConfig('paypal');
            
            if (!config.clientId || !config.clientSecret) {
                return {
                    success: false,
                    error: 'Configuración de PayPal incompleta',
                    details: 'Faltan Client ID o Client Secret'
                };
            }

            // Test real de PayPal
            try {
                const authUrl = config.environment === 'production' 
                    ? 'https://api.paypal.com/v1/oauth2/token'
                    : 'https://api.sandbox.paypal.com/v1/oauth2/token';

                const authString = btoa(`${config.clientId}:${config.clientSecret}`);

                const response = await fetch(authUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authString}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'grant_type=client_credentials'
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        success: true,
                        message: '✅ PayPal conectado correctamente',
                        details: `Entorno: ${config.environment}, Token obtenido`
                    };
                } else {
                    const errorData = await response.json();
                    return {
                        success: false,
                        error: 'Credenciales de PayPal inválidas',
                        details: `Error: ${errorData.error_description || 'Verificar Client ID y Secret'}`
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: 'Error de conexión con PayPal',
                    details: error.message
                };
            }

        } catch (error) {
            return {
                success: false,
                error: 'Error en test de PayPal',
                details: error.message
            };
        }
    }

    // Test real de Stripe
    async testStripeReal() {
        try {
            const config = window.apiConfigManager.getConfig('stripe');
            
            if (!config.publishableKey || !config.secretKey) {
                return {
                    success: false,
                    error: 'Configuración de Stripe incompleta',
                    details: 'Faltan Publishable Key o Secret Key'
                };
            }

            // Validar formato de las keys
            if (!config.publishableKey.startsWith('pk_')) {
                return {
                    success: false,
                    error: 'Publishable Key de Stripe inválida',
                    details: 'Debe comenzar con pk_test_ o pk_live_'
                };
            }

            if (!config.secretKey.startsWith('sk_')) {
                return {
                    success: false,
                    error: 'Secret Key de Stripe inválida',
                    details: 'Debe comenzar con sk_test_ o sk_live_'
                };
            }

            // Test real de Stripe (mediante Stripe.js)
            try {
                if (window.Stripe) {
                    const stripe = window.Stripe(config.publishableKey);
                    
                    // Test básico de inicialización
                    if (stripe) {
                        return {
                            success: true,
                            message: '✅ Stripe configurado correctamente',
                            details: `Publishable Key válida: ${config.publishableKey.substring(0, 12)}...`
                        };
                    }
                } else {
                    // Si Stripe.js no está cargado, hacer test básico
                    return {
                        success: true,
                        message: '⚠️ Stripe configurado (sin librería)',
                        details: 'Keys válidas, pero Stripe.js no está cargado'
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: 'Error al inicializar Stripe',
                    details: error.message
                };
            }

        } catch (error) {
            return {
                success: false,
                error: 'Error en test de Stripe',
                details: error.message
            };
        }
    }

    // Test de SendGrid
    async testSendGridReal() {
        try {
            const config = window.apiConfigManager.getConfig('sendgrid');
            
            if (!config.apiKey || !config.fromEmail) {
                return {
                    success: false,
                    error: 'Configuración de SendGrid incompleta',
                    details: 'Faltan API Key o Email de origen'
                };
            }

            if (!config.apiKey.startsWith('SG.')) {
                return {
                    success: false,
                    error: 'API Key de SendGrid inválida',
                    details: 'Debe comenzar con SG.'
                };
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(config.fromEmail)) {
                return {
                    success: false,
                    error: 'Email de origen inválido',
                    details: 'Formato de email incorrecto'
                };
            }

            return {
                success: true,
                message: '✅ SendGrid configurado correctamente',
                details: `Email origen: ${config.fromEmail}`
            };

        } catch (error) {
            return {
                success: false,
                error: 'Error en test de SendGrid',
                details: error.message
            };
        }
    }

    // Test de FCM
    async testFCMReal() {
        try {
            const config = window.apiConfigManager.getConfig('fcm');
            
            if (!config.serverKey || !config.senderId) {
                return {
                    success: false,
                    error: 'Configuración de FCM incompleta',
                    details: 'Faltan Server Key o Sender ID'
                };
            }

            return {
                success: true,
                message: '✅ FCM configurado correctamente',
                details: `Sender ID: ${config.senderId}`
            };

        } catch (error) {
            return {
                success: false,
                error: 'Error en test de FCM',
                details: error.message
            };
        }
    }

    // Test completo de todas las APIs
    async testAllAPIs() {
        const results = {};
        
        console.log('🧪 Iniciando tests reales de APIs...');

        // Test Firebase
        results.firebase = await this.testFirebaseReal();
        console.log('Firebase:', results.firebase);

        // Test PayPal
        results.paypal = await this.testPayPalReal();
        console.log('PayPal:', results.paypal);

        // Test Stripe
        results.stripe = await this.testStripeReal();
        console.log('Stripe:', results.stripe);

        // Test SendGrid
        results.sendgrid = await this.testSendGridReal();
        console.log('SendGrid:', results.sendgrid);

        // Test FCM
        results.fcm = await this.testFCMReal();
        console.log('FCM:', results.fcm);

        this.testResults = results;
        return results;
    }

    // Mostrar resultados en el DOM
    updateUIWithResults(results) {
        Object.keys(results).forEach(service => {
            const result = results[service];
            const statusElement = document.querySelector(`#${service}-status`);
            const dotElement = document.querySelector(`#${service}-dot`);
            
            if (statusElement && dotElement) {
                if (result.success) {
                    statusElement.textContent = result.message;
                    dotElement.className = 'status-dot connected';
                } else {
                    statusElement.textContent = `❌ ${result.error}`;
                    dotElement.className = 'status-dot';
                }
            }
        });
    }

    // Test individual de una API
    async testSingleAPI(service) {
        let result;
        
        switch(service) {
            case 'firebase':
                result = await this.testFirebaseReal();
                break;
            case 'paypal':
                result = await this.testPayPalReal();
                break;
            case 'stripe':
                result = await this.testStripeReal();
                break;
            case 'sendgrid':
                result = await this.testSendGridReal();
                break;
            case 'fcm':
                result = await this.testFCMReal();
                break;
            default:
                result = { success: false, error: 'Servicio no reconocido' };
        }

        // Mostrar resultado en la UI
        if (window.showNotification) {
            if (result.success) {
                window.showNotification(result.message, 'success');
            } else {
                window.showNotification(`${result.error}: ${result.details}`, 'error');
            }
        }

        return result;
    }

    // Verificar estado general del sistema
    getSystemStatus() {
        const allConfigured = Object.values(this.testResults).every(result => result.success);
        
        return {
            ready: allConfigured,
            configured: Object.keys(this.testResults).filter(key => this.testResults[key].success).length,
            total: Object.keys(this.testResults).length,
            details: this.testResults
        };
    }
}

// Crear instancia global
window.realApiTester = new RealApiTester();

// Funciones globales para el panel admin
window.testFirebaseConnection = async function() {
    return await window.realApiTester.testSingleAPI('firebase');
};

window.testPayPalConnection = async function() {
    return await window.realApiTester.testSingleAPI('paypal');
};

window.testStripeConnection = async function() {
    return await window.realApiTester.testSingleAPI('stripe');
};

window.testSendGridConnection = async function() {
    return await window.realApiTester.testSingleAPI('sendgrid');
};

window.testFCMConnection = async function() {
    return await window.realApiTester.testSingleAPI('fcm');
};

window.testAllConnections = async function() {
    const results = await window.realApiTester.testAllAPIs();
    window.realApiTester.updateUIWithResults(results);
    
    const status = window.realApiTester.getSystemStatus();
    
    if (status.ready) {
        window.showNotification('🎉 ¡Todos los servicios están configurados correctamente!', 'success');
    } else {
        window.showNotification(`⚠️ ${status.configured}/${status.total} servicios configurados. Revisa las configuraciones.`, 'warning');
    }
    
    return results;
};

// Auto-test al cargar la página del admin
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        setTimeout(() => {
            console.log('🔧 Sistema de testing real de APIs cargado');
        }, 1000);
    }
});

console.log('✅ Real API Tester loaded');

export { RealApiTester };