// Analytics Service - Reportes Avanzados con Gráficos
// Sistema completo de análisis y reportes para Villa Vista al Mar

class AnalyticsService {
    constructor() {
        this.charts = new Map();
        this.chartColors = {
            primary: '#667eea',
            secondary: '#764ba2',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#3498db',
            light: '#ecf0f1',
            dark: '#2c3e50'
        };
        
        this.init();
    }

    async init() {
        await this.loadChartJS();
    }

    // Load Chart.js library
    async loadChartJS() {
        if (window.Chart) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Revenue Analytics
    async generateRevenueReport(startDate, endDate, containerId) {
        try {
            // Get reservations data
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const reservations = reservationsResult.data.filter(r => {
                const date = new Date(r.createdAt);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

            // Process data by month
            const monthlyRevenue = this.processMonthlyRevenue(reservations);
            
            // Create chart
            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthlyRevenue.labels,
                    datasets: [{
                        label: 'Ingresos Mensuales ($)',
                        data: monthlyRevenue.data,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencia de Ingresos Mensuales'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: monthlyRevenue };
        } catch (error) {
            console.error('Error generating revenue report:', error);
            return { success: false, error: error.message };
        }
    }

    // Occupancy Analytics
    async generateOccupancyReport(year, containerId) {
        try {
            // Get calendar data
            const calendarResult = await window.dbService.getCalendar(
                `${year}-01-01`, 
                `${year}-12-31`
            );
            
            if (!calendarResult.success) {
                throw new Error('Failed to fetch calendar data');
            }

            const calendarData = calendarResult.data;
            const occupancyByMonth = this.processOccupancyData(calendarData, year);

            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                    datasets: [{
                        label: 'Ocupación (%)',
                        data: occupancyByMonth,
                        backgroundColor: this.chartColors.success + '80',
                        borderColor: this.chartColors.success,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Porcentaje de Ocupación ${year}`
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: occupancyByMonth };
        } catch (error) {
            console.error('Error generating occupancy report:', error);
            return { success: false, error: error.message };
        }
    }

    // Booking Source Analytics
    async generateBookingSourceReport(startDate, endDate, containerId) {
        try {
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const reservations = reservationsResult.data.filter(r => {
                const date = new Date(r.createdAt);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

            const sourceData = this.processBookingSources(reservations);

            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sourceData.labels,
                    datasets: [{
                        data: sourceData.data,
                        backgroundColor: [
                            this.chartColors.primary,
                            this.chartColors.secondary,
                            this.chartColors.success,
                            this.chartColors.warning,
                            this.chartColors.info
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Fuentes de Reservas'
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: sourceData };
        } catch (error) {
            console.error('Error generating booking source report:', error);
            return { success: false, error: error.message };
        }
    }

    // Guest Demographics
    async generateGuestDemographicsReport(startDate, endDate, containerId) {
        try {
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const reservations = reservationsResult.data.filter(r => {
                const date = new Date(r.createdAt);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

            const demographicsData = this.processGuestDemographics(reservations);

            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: demographicsData.labels,
                    datasets: [{
                        label: 'Distribución de Huéspedes',
                        data: demographicsData.data,
                        backgroundColor: this.chartColors.info + '20',
                        borderColor: this.chartColors.info,
                        pointBackgroundColor: this.chartColors.info,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: this.chartColors.info
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Demografía de Huéspedes'
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: demographicsData };
        } catch (error) {
            console.error('Error generating demographics report:', error);
            return { success: false, error: error.message };
        }
    }

    // Average Daily Rate (ADR) Report
    async generateADRReport(startDate, endDate, containerId) {
        try {
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const reservations = reservationsResult.data.filter(r => {
                const date = new Date(r.createdAt);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

            const adrData = this.processADRData(reservations);

            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: adrData.labels,
                    datasets: [{
                        label: 'Tarifa Promedio Diaria ($)',
                        data: adrData.adr,
                        borderColor: this.chartColors.warning,
                        backgroundColor: this.chartColors.warning + '20',
                        yAxisID: 'y'
                    }, {
                        label: 'Ocupación (%)',
                        data: adrData.occupancy,
                        borderColor: this.chartColors.success,
                        backgroundColor: this.chartColors.success + '20',
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tarifa Promedio Diaria vs Ocupación'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            ticks: {
                                callback: function(value) {
                                    return '$' + value;
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: adrData };
        } catch (error) {
            console.error('Error generating ADR report:', error);
            return { success: false, error: error.message };
        }
    }

    // Seasonal Trends
    async generateSeasonalTrendsReport(containerId) {
        try {
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const seasonalData = this.processSeasonalTrends(reservationsResult.data);

            const ctx = document.getElementById(containerId);
            if (!ctx) {
                throw new Error(`Container ${containerId} not found`);
            }

            // Destroy existing chart
            if (this.charts.has(containerId)) {
                this.charts.get(containerId).destroy();
            }

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Primavera', 'Verano', 'Otoño', 'Invierno'],
                    datasets: [{
                        label: 'Reservas',
                        data: seasonalData.bookings,
                        backgroundColor: this.chartColors.primary + '80',
                        borderColor: this.chartColors.primary,
                        borderWidth: 2,
                        yAxisID: 'y'
                    }, {
                        label: 'Ingresos ($)',
                        data: seasonalData.revenue,
                        backgroundColor: this.chartColors.secondary + '80',
                        borderColor: this.chartColors.secondary,
                        borderWidth: 2,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencias Estacionales'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Número de Reservas'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                            title: {
                                display: true,
                                text: 'Ingresos ($)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

            this.charts.set(containerId, chart);
            return { success: true, chart, data: seasonalData };
        } catch (error) {
            console.error('Error generating seasonal trends report:', error);
            return { success: false, error: error.message };
        }
    }

    // Process monthly revenue data
    processMonthlyRevenue(reservations) {
        const monthlyData = {};
        
        reservations.forEach(reservation => {
            const date = new Date(reservation.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            
            monthlyData[monthKey] += parseFloat(reservation.total || 0);
        });

        const sortedKeys = Object.keys(monthlyData).sort();
        const labels = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        });
        
        const data = sortedKeys.map(key => monthlyData[key]);

        return { labels, data };
    }

    // Process occupancy data
    processOccupancyData(calendarData, year) {
        const monthlyOccupancy = new Array(12).fill(0);
        const monthlyDays = new Array(12).fill(0);

        Object.values(calendarData).forEach(day => {
            const date = new Date(day.date);
            if (date.getFullYear() === parseInt(year)) {
                const month = date.getMonth();
                monthlyDays[month]++;
                if (day.status === 'booked') {
                    monthlyOccupancy[month]++;
                }
            }
        });

        return monthlyOccupancy.map((occupied, index) => {
            const totalDays = monthlyDays[index] || 1;
            return Math.round((occupied / totalDays) * 100);
        });
    }

    // Process booking sources
    processBookingSources(reservations) {
        const sources = {};
        
        reservations.forEach(reservation => {
            const source = reservation.source || 'Directo';
            sources[source] = (sources[source] || 0) + 1;
        });

        return {
            labels: Object.keys(sources),
            data: Object.values(sources)
        };
    }

    // Process guest demographics
    processGuestDemographics(reservations) {
        const demographics = {
            'Familias': 0,
            'Parejas': 0,
            'Grupos': 0,
            'Solo': 0,
            'Negocios': 0
        };

        reservations.forEach(reservation => {
            const guests = parseInt(reservation.guests || 1);
            const type = reservation.guestType || this.inferGuestType(guests);
            
            if (demographics[type] !== undefined) {
                demographics[type]++;
            }
        });

        return {
            labels: Object.keys(demographics),
            data: Object.values(demographics)
        };
    }

    inferGuestType(guests) {
        if (guests === 1) return 'Solo';
        if (guests === 2) return 'Parejas';
        if (guests <= 4) return 'Familias';
        return 'Grupos';
    }

    // Process ADR data
    processADRData(reservations) {
        const monthlyData = {};
        
        reservations.forEach(reservation => {
            const date = new Date(reservation.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { revenue: 0, nights: 0, bookings: 0 };
            }
            
            monthlyData[monthKey].revenue += parseFloat(reservation.total || 0);
            monthlyData[monthKey].nights += parseInt(reservation.nights || 1);
            monthlyData[monthKey].bookings++;
        });

        const sortedKeys = Object.keys(monthlyData).sort();
        const labels = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(year, month - 1);
            return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        });
        
        const adr = sortedKeys.map(key => {
            const data = monthlyData[key];
            return data.nights > 0 ? Math.round(data.revenue / data.nights) : 0;
        });

        const occupancy = sortedKeys.map(key => {
            const data = monthlyData[key];
            const daysInMonth = new Date(sortedKeys[0].split('-')[0], parseInt(key.split('-')[1]), 0).getDate();
            return Math.round((data.nights / daysInMonth) * 100);
        });

        return { labels, adr, occupancy };
    }

    // Process seasonal trends
    processSeasonalTrends(reservations) {
        const seasons = {
            'Primavera': { bookings: 0, revenue: 0 }, // Mar-May
            'Verano': { bookings: 0, revenue: 0 },    // Jun-Aug
            'Otoño': { bookings: 0, revenue: 0 },     // Sep-Nov
            'Invierno': { bookings: 0, revenue: 0 }   // Dec-Feb
        };

        reservations.forEach(reservation => {
            const date = new Date(reservation.createdAt);
            const month = date.getMonth();
            
            let season;
            if (month >= 2 && month <= 4) season = 'Primavera';
            else if (month >= 5 && month <= 7) season = 'Verano';
            else if (month >= 8 && month <= 10) season = 'Otoño';
            else season = 'Invierno';

            seasons[season].bookings++;
            seasons[season].revenue += parseFloat(reservation.total || 0);
        });

        return {
            bookings: Object.values(seasons).map(s => s.bookings),
            revenue: Object.values(seasons).map(s => s.revenue)
        };
    }

    // Export data to CSV
    exportToCSV(data, filename) {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }

    // Generate executive summary
    async generateExecutiveSummary(startDate, endDate) {
        try {
            const reservationsResult = await window.dbService.getReservations();
            if (!reservationsResult.success) {
                throw new Error('Failed to fetch reservations data');
            }

            const reservations = reservationsResult.data.filter(r => {
                const date = new Date(r.createdAt);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });

            const summary = {
                totalRevenue: reservations.reduce((sum, r) => sum + parseFloat(r.total || 0), 0),
                totalBookings: reservations.length,
                averageBookingValue: 0,
                averageStayLength: 0,
                topSource: 'Directo',
                occupancyRate: 0,
                cancellationRate: 0,
                repeatGuestRate: 0
            };

            if (summary.totalBookings > 0) {
                summary.averageBookingValue = summary.totalRevenue / summary.totalBookings;
                summary.averageStayLength = reservations.reduce((sum, r) => sum + parseInt(r.nights || 1), 0) / summary.totalBookings;
            }

            // Calculate cancellation rate
            const cancelledBookings = reservations.filter(r => r.status === 'cancelled').length;
            summary.cancellationRate = summary.totalBookings > 0 ? (cancelledBookings / summary.totalBookings) * 100 : 0;

            return { success: true, summary };
        } catch (error) {
            console.error('Error generating executive summary:', error);
            return { success: false, error: error.message };
        }
    }

    // Destroy specific chart
    destroyChart(containerId) {
        if (this.charts.has(containerId)) {
            this.charts.get(containerId).destroy();
            this.charts.delete(containerId);
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        this.charts.forEach((chart, id) => {
            chart.destroy();
        });
        this.charts.clear();
    }
}

// Create global instance
window.analyticsService = new AnalyticsService();

// Export for module use
export { AnalyticsService };