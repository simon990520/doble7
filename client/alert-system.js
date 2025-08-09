// Sistema de Alertas
class AlertSystem {
    constructor() {
        this.init();
    }

    init() {
        this.createAlertContainer();
    }

    createAlertContainer() {
        // Crear contenedor de alertas si no existe
        if (!document.getElementById('alert-container')) {
            const container = document.createElement('div');
            container.id = 'alert-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            `;
            document.body.appendChild(container);
        }
    }

    showAlert(type, title, message, options = {}) {
        return new Promise((resolve) => {
            const container = document.getElementById('alert-container');
            
            const alertBox = document.createElement('div');
            alertBox.style.cssText = `
                background: white;
                border-radius: 15px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: alertSlideIn 0.3s ease;
            `;

            // Icono según el tipo
            let icon = 'info-circle';
            let iconColor = '#667eea';
            
            switch(type) {
                case 'success':
                    icon = 'check-circle';
                    iconColor = '#4ecdc4';
                    break;
                case 'warning':
                    icon = 'exclamation-triangle';
                    iconColor = '#ffd700';
                    break;
                case 'error':
                    icon = 'times-circle';
                    iconColor = '#ff6b6b';
                    break;
                case 'question':
                    icon = 'question-circle';
                    iconColor = '#667eea';
                    break;
            }

            alertBox.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <i class="fas fa-${icon}" style="font-size: 3rem; color: ${iconColor};"></i>
                </div>
                <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.3rem;">${title}</h3>
                <p style="margin: 0 0 2rem 0; color: #666; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    ${options.showCancel !== false ? `
                        <button id="alert-cancel" class="btn btn-secondary" style="min-width: 100px;">
                            ${options.cancelText || 'Cancelar'}
                        </button>
                    ` : ''}
                    <button id="alert-confirm" class="btn btn-primary" style="min-width: 100px;">
                        ${options.confirmText || 'Aceptar'}
                    </button>
                    ${options.dangerText ? `
                        <button id="alert-danger" class="btn btn-danger" style="min-width: 100px;">
                            ${options.dangerText}
                        </button>
                    ` : ''}
                </div>
            `;

            container.appendChild(alertBox);
            container.style.display = 'flex';

            // Event listeners
            const confirmBtn = alertBox.querySelector('#alert-confirm');
            const cancelBtn = alertBox.querySelector('#alert-cancel');
            const dangerBtn = alertBox.querySelector('#alert-danger');

            confirmBtn.addEventListener('click', () => {
                this.closeAlert(container, alertBox);
                resolve(true);
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeAlert(container, alertBox);
                    resolve(false);
                });
            }

            if (dangerBtn) {
                dangerBtn.addEventListener('click', () => {
                    this.closeAlert(container, alertBox);
                    resolve('danger');
                });
            }

            // Cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closeAlert(container, alertBox);
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Cerrar al hacer clic fuera
            container.addEventListener('click', (e) => {
                if (e.target === container) {
                    this.closeAlert(container, alertBox);
                    resolve(false);
                }
            });
        });
    }

    closeAlert(container, alertBox) {
        alertBox.style.animation = 'alertSlideOut 0.3s ease';
        setTimeout(() => {
            container.removeChild(alertBox);
            if (container.children.length === 0) {
                container.style.display = 'none';
            }
        }, 300);
    }
}

// Crear instancia global
const alertSystem = new AlertSystem();

// Función global para usar fácilmente
function showAlert(type, title, message, options = {}) {
    return alertSystem.showAlert(type, title, message, options);
}

// Agregar estilos CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes alertSlideIn {
        from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    @keyframes alertSlideOut {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
        }
    }
`;
document.head.appendChild(style); 