// Firebase Configuration
// Configuración de Firebase para Villa Vista al Mar

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "villa-vista-mar.firebaseapp.com",
    databaseURL: "https://villa-vista-mar-default-rtdb.firebaseio.com",
    projectId: "villa-vista-mar",
    storageBucket: "villa-vista-mar.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, push, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Database service class
class DatabaseService {
    constructor() {
        this.db = database;
        this.auth = auth;
        this.storage = storage;
    }

    // Reservations Management
    async createReservation(reservationData) {
        try {
            const reservationsRef = ref(this.db, 'reservations');
            const newReservationRef = push(reservationsRef);
            
            const reservation = {
                ...reservationData,
                id: newReservationRef.key,
                createdAt: new Date().toISOString(),
                status: 'pending',
                paymentStatus: 'pending'
            };

            await set(newReservationRef, reservation);
            return { success: true, id: newReservationRef.key, data: reservation };
        } catch (error) {
            console.error('Error creating reservation:', error);
            return { success: false, error: error.message };
        }
    }

    async updateReservation(reservationId, updateData) {
        try {
            const reservationRef = ref(this.db, `reservations/${reservationId}`);
            await set(reservationRef, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating reservation:', error);
            return { success: false, error: error.message };
        }
    }

    async getReservations() {
        try {
            const reservationsRef = ref(this.db, 'reservations');
            const snapshot = await get(reservationsRef);
            
            if (snapshot.exists()) {
                const reservations = [];
                snapshot.forEach((child) => {
                    reservations.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                return { success: true, data: reservations };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Error getting reservations:', error);
            return { success: false, error: error.message };
        }
    }

    // Calendar Management
    async updateCalendar(date, status, price = null) {
        try {
            const calendarRef = ref(this.db, `calendar/${date}`);
            const calendarData = {
                date,
                status, // 'available', 'booked', 'blocked'
                price,
                updatedAt: new Date().toISOString()
            };
            
            await set(calendarRef, calendarData);
            return { success: true };
        } catch (error) {
            console.error('Error updating calendar:', error);
            return { success: false, error: error.message };
        }
    }

    async getCalendar(startDate, endDate) {
        try {
            const calendarRef = ref(this.db, 'calendar');
            const snapshot = await get(calendarRef);
            
            if (snapshot.exists()) {
                const calendar = {};
                snapshot.forEach((child) => {
                    const date = child.key;
                    if (date >= startDate && date <= endDate) {
                        calendar[date] = child.val();
                    }
                });
                return { success: true, data: calendar };
            }
            return { success: true, data: {} };
        } catch (error) {
            console.error('Error getting calendar:', error);
            return { success: false, error: error.message };
        }
    }

    // Settings Management
    async updateSettings(settingsData) {
        try {
            const settingsRef = ref(this.db, 'settings');
            await set(settingsRef, {
                ...settingsData,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating settings:', error);
            return { success: false, error: error.message };
        }
    }

    async getSettings() {
        try {
            const settingsRef = ref(this.db, 'settings');
            const snapshot = await get(settingsRef);
            
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            }
            return { success: true, data: {} };
        } catch (error) {
            console.error('Error getting settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Chat Management
    async sendMessage(conversationId, message) {
        try {
            const messagesRef = ref(this.db, `conversations/${conversationId}/messages`);
            const newMessageRef = push(messagesRef);
            
            const messageData = {
                id: newMessageRef.key,
                text: message.text,
                sender: message.sender,
                timestamp: new Date().toISOString(),
                read: false
            };

            await set(newMessageRef, messageData);
            
            // Update conversation last message
            const conversationRef = ref(this.db, `conversations/${conversationId}`);
            await set(conversationRef, {
                lastMessage: messageData,
                updatedAt: new Date().toISOString()
            });

            return { success: true, data: messageData };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    onMessagesUpdate(conversationId, callback) {
        const messagesRef = ref(this.db, `conversations/${conversationId}/messages`);
        onValue(messagesRef, callback);
        return () => off(messagesRef, 'value', callback);
    }

    // Analytics
    async logEvent(eventName, eventData) {
        try {
            const analyticsRef = ref(this.db, 'analytics/events');
            const newEventRef = push(analyticsRef);
            
            const event = {
                name: eventName,
                data: eventData,
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0]
            };

            await set(newEventRef, event);
            return { success: true };
        } catch (error) {
            console.error('Error logging event:', error);
            return { success: false, error: error.message };
        }
    }

    async getAnalytics(startDate, endDate) {
        try {
            const analyticsRef = ref(this.db, 'analytics/events');
            const snapshot = await get(analyticsRef);
            
            if (snapshot.exists()) {
                const events = [];
                snapshot.forEach((child) => {
                    const event = child.val();
                    if (event.date >= startDate && event.date <= endDate) {
                        events.push({
                            id: child.key,
                            ...event
                        });
                    }
                });
                return { success: true, data: events };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Error getting analytics:', error);
            return { success: false, error: error.message };
        }
    }

    // File Upload
    async uploadFile(file, path) {
        try {
            const fileRef = storageRef(this.storage, path);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL };
        } catch (error) {
            console.error('Error uploading file:', error);
            return { success: false, error: error.message };
        }
    }

    // Authentication
    async signInAdmin(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            await signOut(this.auth);
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    }

    onAuthStateChanged(callback) {
        return onAuthStateChanged(this.auth, callback);
    }
}

// Create global instance
window.dbService = new DatabaseService();

// Export for module use
export { DatabaseService, firebaseConfig };