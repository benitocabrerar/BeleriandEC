// Payment Service - PayPal & Stripe Integration
// Sistema de Pagos para Villa Vista al Mar

class PaymentService {
    constructor() {
        this.paypalClientId = 'YOUR_PAYPAL_CLIENT_ID';
        this.stripePublishableKey = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY';
        this.paypalLoaded = false;
        this.stripeLoaded = false;
        this.stripe = null;
        
        this.init();
    }

    async init() {
        await this.loadPayPal();
        await this.loadStripe();
    }

    // PayPal Integration
    async loadPayPal() {
        if (this.paypalLoaded) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${this.paypalClientId}&currency=USD&components=buttons,hosted-fields`;
            script.onload = () => {
                this.paypalLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createPayPalButton(containerId, orderData, onSuccess, onError) {
        if (!window.paypal) {
            console.error('PayPal SDK not loaded');
            return;
        }

        window.paypal.Buttons({
            style: {
                color: 'blue',
                shape: 'rect',
                label: 'pay',
                height: 50
            },
            
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        description: `Villa Vista al Mar - ${orderData.nights} noches`,
                        amount: {
                            value: orderData.total.toString(),
                            currency_code: 'USD'
                        },
                        custom_id: orderData.reservationId
                    }]
                });
            },
            
            onApprove: async (data, actions) => {
                try {
                    const order = await actions.order.capture();
                    
                    // Save payment to database
                    const paymentData = {
                        reservationId: orderData.reservationId,
                        paymentId: order.id,
                        method: 'paypal',
                        amount: orderData.total,
                        currency: 'USD',
                        status: 'completed',
                        payerInfo: order.payer,
                        createdAt: new Date().toISOString()
                    };
                    
                    await this.savePayment(paymentData);
                    
                    if (onSuccess) onSuccess(order, paymentData);
                } catch (error) {
                    console.error('PayPal payment error:', error);
                    if (onError) onError(error);
                }
            },
            
            onError: (err) => {
                console.error('PayPal error:', err);
                if (onError) onError(err);
            }
        }).render(`#${containerId}`);
    }

    // Stripe Integration
    async loadStripe() {
        if (this.stripeLoaded) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                this.stripe = Stripe(this.stripePublishableKey);
                this.stripeLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async createStripePayment(orderData, cardElement) {
        if (!this.stripe) {
            throw new Error('Stripe not loaded');
        }

        try {
            // Create payment intent on server
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: Math.round(orderData.total * 100), // Convert to cents
                    currency: 'usd',
                    reservationId: orderData.reservationId,
                    customerInfo: orderData.customerInfo
                })
            });

            const { clientSecret } = await response.json();

            // Confirm payment
            const result = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: orderData.customerInfo.name,
                        email: orderData.customerInfo.email,
                    },
                }
            });

            if (result.error) {
                throw result.error;
            }

            // Save payment to database
            const paymentData = {
                reservationId: orderData.reservationId,
                paymentId: result.paymentIntent.id,
                method: 'stripe',
                amount: orderData.total,
                currency: 'USD',
                status: result.paymentIntent.status,
                customerInfo: orderData.customerInfo,
                createdAt: new Date().toISOString()
            };

            await this.savePayment(paymentData);
            
            return { success: true, payment: result.paymentIntent, paymentData };
        } catch (error) {
            console.error('Stripe payment error:', error);
            return { success: false, error: error.message };
        }
    }

    createStripeCardElement(containerId) {
        if (!this.stripe) {
            console.error('Stripe not loaded');
            return null;
        }

        const elements = this.stripe.elements();
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
            },
        });

        cardElement.mount(`#${containerId}`);
        return cardElement;
    }

    // Save payment to database
    async savePayment(paymentData) {
        try {
            if (window.dbService) {
                // Save to Firebase
                const result = await window.dbService.db.ref('payments').push(paymentData);
                
                // Update reservation payment status
                await window.dbService.updateReservation(paymentData.reservationId, {
                    paymentStatus: 'paid',
                    paymentId: paymentData.paymentId,
                    paymentMethod: paymentData.method
                });

                // Log analytics
                await window.dbService.logEvent('payment_completed', {
                    reservationId: paymentData.reservationId,
                    amount: paymentData.amount,
                    method: paymentData.method
                });

                // Generate invoice
                await this.generateInvoice(paymentData);

                return { success: true, id: result.key };
            }
        } catch (error) {
            console.error('Error saving payment:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate invoice
    async generateInvoice(paymentData) {
        try {
            // Get reservation details
            const reservationResult = await window.dbService.getReservations();
            const reservation = reservationResult.data.find(r => r.id === paymentData.reservationId);

            if (!reservation) {
                throw new Error('Reservation not found');
            }

            const invoiceData = {
                invoiceNumber: `VVM-${Date.now()}`,
                date: new Date().toISOString(),
                dueDate: reservation.checkinDate,
                customer: {
                    name: reservation.guestName,
                    email: reservation.guestEmail,
                    phone: reservation.guestPhone
                },
                items: [
                    {
                        description: `Villa Vista al Mar - ${reservation.nights} noches`,
                        quantity: reservation.nights,
                        unitPrice: reservation.nightlyRate,
                        total: reservation.nights * reservation.nightlyRate
                    },
                    {
                        description: 'Tarifa de limpieza',
                        quantity: 1,
                        unitPrice: reservation.cleaningFee,
                        total: reservation.cleaningFee
                    }
                ],
                subtotal: reservation.subtotal,
                total: reservation.total,
                paymentStatus: 'paid',
                paymentMethod: paymentData.method,
                paymentId: paymentData.paymentId
            };

            // Save invoice to database
            await window.dbService.db.ref('invoices').push(invoiceData);

            // Send invoice email (integration with email service)
            await this.sendInvoiceEmail(invoiceData);

            return invoiceData;
        } catch (error) {
            console.error('Error generating invoice:', error);
        }
    }

    // Send invoice email
    async sendInvoiceEmail(invoiceData) {
        try {
            // Generate PDF
            const pdfBlob = await this.generateInvoicePDF(invoiceData);
            
            // Send via email service (EmailJS, SendGrid, etc.)
            const emailData = {
                to: invoiceData.customer.email,
                subject: `Factura ${invoiceData.invoiceNumber} - Villa Vista al Mar`,
                template: 'invoice',
                data: invoiceData,
                attachments: [{
                    filename: `factura-${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBlob
                }]
            };

            // This would integrate with your email service
            console.log('Invoice email sent:', emailData);
        } catch (error) {
            console.error('Error sending invoice email:', error);
        }
    }

    // Generate PDF invoice
    async generateInvoicePDF(invoiceData) {
        try {
            // Using jsPDF library
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add logo and header
            doc.setFontSize(20);
            doc.text('🏖️ Villa Vista al Mar', 20, 30);
            
            doc.setFontSize(12);
            doc.text('Tonsupa, Esmeraldas, Ecuador', 20, 40);
            doc.text('info@villavistamar.com', 20, 50);

            // Invoice details
            doc.setFontSize(16);
            doc.text(`Factura ${invoiceData.invoiceNumber}`, 120, 30);
            
            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date(invoiceData.date).toLocaleDateString()}`, 120, 40);
            doc.text(`Vencimiento: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 120, 50);

            // Customer info
            doc.setFontSize(14);
            doc.text('Facturar a:', 20, 80);
            
            doc.setFontSize(10);
            doc.text(invoiceData.customer.name, 20, 90);
            doc.text(invoiceData.customer.email, 20, 100);
            doc.text(invoiceData.customer.phone, 20, 110);

            // Items table
            let yPos = 130;
            doc.setFontSize(12);
            doc.text('Descripción', 20, yPos);
            doc.text('Cant.', 100, yPos);
            doc.text('Precio Unit.', 130, yPos);
            doc.text('Total', 170, yPos);

            yPos += 10;
            doc.line(20, yPos, 190, yPos);

            yPos += 10;
            doc.setFontSize(10);
            invoiceData.items.forEach(item => {
                doc.text(item.description, 20, yPos);
                doc.text(item.quantity.toString(), 100, yPos);
                doc.text(`$${item.unitPrice}`, 130, yPos);
                doc.text(`$${item.total}`, 170, yPos);
                yPos += 10;
            });

            // Totals
            yPos += 10;
            doc.line(130, yPos, 190, yPos);
            yPos += 10;
            
            doc.text(`Subtotal: $${invoiceData.subtotal}`, 130, yPos);
            yPos += 10;
            
            doc.setFontSize(12);
            doc.text(`Total: $${invoiceData.total}`, 130, yPos);

            // Payment info
            yPos += 20;
            doc.setFontSize(10);
            doc.text(`Estado de Pago: ${invoiceData.paymentStatus}`, 20, yPos);
            doc.text(`Método de Pago: ${invoiceData.paymentMethod}`, 20, yPos + 10);
            doc.text(`ID de Transacción: ${invoiceData.paymentId}`, 20, yPos + 20);

            return doc.output('blob');
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    // Refund payment
    async refundPayment(paymentId, amount, reason = '') {
        try {
            // This would call your backend API for refunds
            const response = await fetch('/api/refund-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentId,
                    amount,
                    reason
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Log refund
                await window.dbService.logEvent('payment_refunded', {
                    paymentId,
                    amount,
                    reason
                });
            }

            return result;
        } catch (error) {
            console.error('Error processing refund:', error);
            return { success: false, error: error.message };
        }
    }

    // Get payment history
    async getPaymentHistory(reservationId = null) {
        try {
            let paymentsRef = window.dbService.db.ref('payments');
            
            if (reservationId) {
                paymentsRef = paymentsRef.orderByChild('reservationId').equalTo(reservationId);
            }

            const snapshot = await paymentsRef.once('value');
            const payments = [];
            
            snapshot.forEach(child => {
                payments.push({
                    id: child.key,
                    ...child.val()
                });
            });

            return { success: true, data: payments };
        } catch (error) {
            console.error('Error getting payment history:', error);
            return { success: false, error: error.message };
        }
    }

    // Update payment configuration
    updateConfig(config) {
        if (config.paypalClientId) {
            this.paypalClientId = config.paypalClientId;
        }
        if (config.stripePublishableKey) {
            this.stripePublishableKey = config.stripePublishableKey;
        }
    }
}

// Create global instance
window.paymentService = new PaymentService();

// Export for module use
export { PaymentService };