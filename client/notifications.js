// Notification System Class
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.panel = null;
        this.badge = null;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.createNotificationsPanel();
        this.updateBadge();
    }

    createNotificationContainer() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    createNotificationsPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'notifications-panel';
        this.panel.innerHTML = `
            <div class="notifications-header">
                <h3><i class="fas fa-bell"></i> Notificaciones</h3>
                <button class="notifications-close" onclick="notificationSystem.closePanel()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notifications-content" id="notifications-content">
                <div class="notifications-empty">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No hay notificaciones</h4>
                    <p>Las notificaciones aparecerán aquí</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);
    }

    showNotification(type, title, message, duration = 5000) {
        const notification = {
            id: Date.now() + Math.random(),
            type,
            title,
            message,
            time: new Date(),
            duration
        };

        this.notifications.unshift(notification);
        this.renderNotification(notification);
        this.updateBadge();

        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, duration);
        }

        return notification.id;
    }

    renderNotification(notification) {
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification ${notification.type}`;
        notificationElement.dataset.id = notification.id;

        const iconClass = this.getNotificationIconClass(notification.type);
        const timeString = this.formatTime(notification.time);

        notificationElement.innerHTML = `
            <div class="notification-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeString}</div>
            </div>
            <button class="notification-close" onclick="notificationSystem.removeNotification('${notification.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(notificationElement);

        // Animate in
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(0)';
            notificationElement.style.opacity = '1';
        }, 10);
    }

    removeNotification(id) {
        const notificationElement = this.container.querySelector(`[data-id="${id}"]`);
        if (notificationElement) {
            notificationElement.style.transform = 'translateX(100%)';
            notificationElement.style.opacity = '0';
            
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id != id);
        this.updateBadge();
        this.updatePanel();
    }

    getNotificationIconClass(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
            investment: 'fas fa-chart-line'
        };
        return icons[type] || icons.info;
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours} h`;
        if (days < 7) return `Hace ${days} días`;
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    updateBadge() {
        if (!this.badge) {
            this.badge = document.getElementById('notification-badge');
        }
        
        if (this.badge) {
            const count = this.notifications.length;
            this.badge.textContent = count;
            this.badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    showPanel() {
        this.panel.classList.add('open');
        this.updatePanel();
    }

    closePanel() {
        this.panel.classList.remove('open');
    }

    updatePanel() {
        const content = this.panel.querySelector('#notifications-content');
        
        if (this.notifications.length === 0) {
            content.innerHTML = `
                <div class="notifications-empty">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No hay notificaciones</h4>
                    <p>Las notificaciones aparecerán aquí</p>
                </div>
            `;
        } else {
            content.innerHTML = this.notifications.map(notification => `
                <div class="notification-item ${notification.type}" onclick="notificationSystem.removeNotification('${notification.id}')">
                    <div class="notification-item-header">
                        <div class="notification-item-icon">
                            <i class="${this.getNotificationIconClass(notification.type)}"></i>
                        </div>
                        <div class="notification-item-title">${notification.title}</div>
                        <div class="notification-item-time">${this.formatTime(notification.time)}</div>
                    </div>
                    <div class="notification-item-message">${notification.message}</div>
                </div>
            `).join('');
        }
    }

    clearAll() {
        this.notifications = [];
        this.container.innerHTML = '';
        this.updateBadge();
        this.updatePanel();
    }
}

// Alert System Class
class AlertSystem {
    constructor() {
        this.currentAlert = null;
    }

    showAlert(type, title, message, options = {}) {
        return new Promise((resolve) => {
            const alertId = Date.now() + Math.random();
            
            const alertOverlay = document.createElement('div');
            alertOverlay.className = 'alert-overlay';
            alertOverlay.dataset.alertId = alertId;

            const iconClass = this.getAlertIconClass(type);
            const buttons = this.generateButtons(options, resolve, alertId);

            alertOverlay.innerHTML = `
                <div class="alert">
                    <div class="alert-header">
                        <div class="alert-icon">
                            <i class="${iconClass}"></i>
                        </div>
                        <h3 class="alert-title">${title}</h3>
                        <button class="alert-close" onclick="alertSystem.closeAlert('${alertId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="alert-body">
                        <p class="alert-message">${message}</p>
                    </div>
                    <div class="alert-footer">
                        ${buttons}
                    </div>
                </div>
            `;

            document.body.appendChild(alertOverlay);
            this.currentAlert = alertId;

            // Auto-close if specified
            if (options.autoClose) {
                setTimeout(() => {
                    this.closeAlert(alertId);
                }, options.autoClose);
            }
        });
    }

    getAlertIconClass(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
            question: 'fas fa-question-circle'
        };
        return icons[type] || icons.info;
    }

    generateButtons(options, resolve, alertId) {
        const buttons = [];
        
        if (options.showCancel !== false) {
            buttons.push(`
                <button class="alert-btn alert-btn-secondary" onclick="alertSystem.closeAlert('${alertId}', false)">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            `);
        }

        if (options.confirmText) {
            buttons.push(`
                <button class="alert-btn alert-btn-primary" onclick="alertSystem.closeAlert('${alertId}', true)">
                    <i class="fas fa-check"></i> ${options.confirmText}
                </button>
            `);
        } else if (options.showCancel === false) {
            buttons.push(`
                <button class="alert-btn alert-btn-primary" onclick="alertSystem.closeAlert('${alertId}', true)">
                    <i class="fas fa-check"></i> Aceptar
                </button>
            `);
        }

        if (options.dangerText) {
            buttons.push(`
                <button class="alert-btn alert-btn-danger" onclick="alertSystem.closeAlert('${alertId}', 'danger')">
                    <i class="fas fa-trash"></i> ${options.dangerText}
                </button>
            `);
        }

        return buttons.join('');
    }

    closeAlert(alertId, result = false) {
        const overlay = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                if (this.currentAlert === alertId) {
                    this.currentAlert = null;
                }
            }, 300);
        }
    }

    // Convenience methods
    success(title, message, options = {}) {
        return this.showAlert('success', title, message, options);
    }

    error(title, message, options = {}) {
        return this.showAlert('error', title, message, options);
    }

    warning(title, message, options = {}) {
        return this.showAlert('warning', title, message, options);
    }

    info(title, message, options = {}) {
        return this.showAlert('info', title, message, options);
    }

    confirm(title, message, options = {}) {
        return this.showAlert('question', title, message, {
            confirmText: 'Confirmar',
            ...options
        });
    }
}

// Global instances
const notificationSystem = new NotificationSystem();
const alertSystem = new AlertSystem();

// Global functions for easy access
function showNotification(type, title, message, duration) {
    return notificationSystem.showNotification(type, title, message, duration);
}

function showAlert(type, title, message, options) {
    return alertSystem.showAlert(type, title, message, options);
}

function showNotificationsPanel() {
    notificationSystem.showPanel();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Show welcome notification if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(() => {
            showNotification('info', '¡Bienvenido!', 'Has iniciado sesión correctamente en Doble7', 3000);
        }, 1000);
    }
}); 