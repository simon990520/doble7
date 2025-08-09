// Configuración de Firebase (igual que script.js)
const firebaseConfig = {
    apiKey: "AIzaSyCuMO-khLd132Cz4nouEnoSB_VyhxkNpPU",
    authDomain: "boble7-7191a.firebaseapp.com",
    databaseURL: "https://boble7-7191a-default-rtdb.firebaseio.com",
    projectId: "boble7-7191a",
    storageBucket: "boble7-7191a.firebasestorage.app",
    messagingSenderId: "844244773440",
    appId: "1:844244773440:web:32046d1f7298675383cda5",
    measurementId: "G-06ENVMBNDW"
};

// Variables globales
let auth = null;
let db = null;
let currentUser = null;
let adminData = null;

// Credenciales de administrador
const ADMIN_PHONE = "+573506049629";
const ADMIN_CODE = "990520";

// Función para inicializar Firebase cuando esté disponible
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            // Solo inicializar si no hay apps
            if (!firebase.apps || firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();
            console.log('Firebase inicializado correctamente en admin');
            return true;
        } else {
            console.log('Firebase aún no está disponible en admin, esperando...');
            return false;
        }
    } catch (error) {
        console.error('Error inicializando Firebase en admin:', error);
        return false;
    }
}

// Intentar inicializar Firebase inmediatamente
let firebaseReady = initializeFirebase();
if (!firebaseReady) {
    // Si no está disponible, esperar a que se cargue
    document.addEventListener('DOMContentLoaded', function() {
        const maxAttempts = 10;
        let attempts = 0;
        
        const tryInitialize = () => {
            attempts++;
            firebaseReady = initializeFirebase();
            if (firebaseReady) {
                console.log('Firebase inicializado en admin después de', attempts, 'intentos');
                initializeAdmin();
            } else if (attempts < maxAttempts) {
                setTimeout(tryInitialize, 500);
            } else {
                console.error('No se pudo inicializar Firebase en admin después de', maxAttempts, 'intentos');
                showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor. Recarga la página.', 5000);
            }
        };
        
        setTimeout(tryInitialize, 100);
    });
} else {
    // Si Firebase ya está listo, inicializar admin
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM cargado, inicializando admin...');
        initializeAdmin();
    });
}

// ==================== FUNCIONES DE NAVEGACIÓN ====================

function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Desactivar todos los botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
    
    // Cargar datos de la sección
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'investments':
            loadInvestments();
            break;
        case 'withdrawals':
            loadWithdrawals();
            break;
        case 'referrals':
            loadReferrals();
            break;
    }
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

function logout() {
    showNotification('info', 'Cerrando sesión', 'Has cerrado sesión del panel de administración', 2000);
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
    // Verificar que Firebase esté inicializado
    if (!auth || !db) {
        showNotification('error', 'Error de conexión', 'El sistema aún no está listo. Espera un momento y vuelve a intentar.', 4000);
        return;
    }
    
    try {
        console.log('Cargando dashboard...');
        
        // Cargar estadísticas
        await loadDashboardStats();
        
        // Cargar alertas
        await loadDashboardAlerts();
        
        console.log('Dashboard cargado');
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showNotification('error', 'Error', 'Error cargando dashboard', 3000);
    }
}

async function loadDashboardStats() {
    try {
        // Total de usuarios
        const usersQuery = await db.collection('users').get();
        const totalUsers = usersQuery.size;
        document.getElementById('total-users').textContent = totalUsers.toLocaleString();
        
        // Inversiones activas
        const activeInvestmentsQuery = await db.collection('inversiones')
            .where('estado', '==', 'activa')
            .get();
        const totalActiveInvestments = activeInvestmentsQuery.size;
        document.getElementById('total-active-investments').textContent = totalActiveInvestments.toLocaleString();
        
        // Total invertido
        let totalInvested = 0;
        activeInvestmentsQuery.forEach(doc => {
            totalInvested += doc.data().monto;
        });
        document.getElementById('total-invested').textContent = `$${totalInvested.toLocaleString()}`;
        
        // Total retirado
        const withdrawnInvestmentsQuery = await db.collection('inversiones')
            .where('estado', '==', 'retirada')
            .get();
        let totalWithdrawn = 0;
        withdrawnInvestmentsQuery.forEach(doc => {
            totalWithdrawn += doc.data().monto;
        });
        document.getElementById('total-withdrawn').textContent = `$${totalWithdrawn.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadDashboardAlerts() {
    try {
        const alertsList = document.getElementById('alerts-list');
        alertsList.innerHTML = '';
        
        const alerts = [];
        
        // Inversiones pendientes de aprobación
        const pendingInvestmentsQuery = await db.collection('inversiones')
            .where('estado', '==', 'pendiente')
            .get();
        
        if (pendingInvestmentsQuery.size > 0) {
            alerts.push({
                type: 'warning',
                title: 'Inversiones Pendientes',
                message: `${pendingInvestmentsQuery.size} inversión${pendingInvestmentsQuery.size > 1 ? 'es' : ''} pendiente${pendingInvestmentsQuery.size > 1 ? 's' : ''} de aprobación`,
                time: new Date()
            });
        }
        
        // Usuarios nuevos (últimas 24 horas)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const newUsersQuery = await db.collection('users')
            .where('fechaCreacion', '>=', yesterday)
            .get();
        
        if (newUsersQuery.size > 0) {
            alerts.push({
                type: 'info',
                title: 'Usuarios Nuevos',
                message: `${newUsersQuery.size} usuario${newUsersQuery.size > 1 ? 's' : ''} registrado${newUsersQuery.size > 1 ? 's' : ''} en las últimas 24 horas`,
                time: new Date()
            });
        }
        
        // Retiros pendientes
        const today = new Date();
        const pendingWithdrawalsQuery = await db.collection('inversiones')
            .where('estado', '==', 'activa')
            .where('fechaDisponibleRetiro', '<=', today)
            .get();
        
        if (pendingWithdrawalsQuery.size > 0) {
            alerts.push({
                type: 'danger',
                title: 'Retiros Disponibles',
                message: `${pendingWithdrawalsQuery.size} inversión${pendingWithdrawalsQuery.size > 1 ? 'es' : ''} disponible${pendingWithdrawalsQuery.size > 1 ? 's' : ''} para retiro`,
                time: new Date()
            });
        }
        
        // Mostrar alertas
        alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item ${alert.type}`;
            alertElement.innerHTML = `
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-time">${formatTime(alert.time)}</div>
            `;
            alertsList.appendChild(alertElement);
        });
        
        if (alerts.length === 0) {
            alertsList.innerHTML = '<div class="alert-item info"><div class="alert-message">No hay alertas pendientes</div></div>';
        }
        
    } catch (error) {
        console.error('Error cargando alertas:', error);
    }
}

function refreshDashboard() {
    loadDashboard();
    showNotification('success', 'Actualizado', 'Dashboard actualizado correctamente', 2000);
}

// ==================== GESTIÓN DE USUARIOS ====================

async function loadUsers() {
    // Verificar que Firebase esté inicializado
    if (!auth || !db) {
        showNotification('error', 'Error de conexión', 'El sistema aún no está listo. Espera un momento y vuelve a intentar.', 4000);
        return;
    }
    
    try {
        console.log('Cargando usuarios...');
        
        const usersQuery = await db.collection('users').get();
        const usersTableBody = document.getElementById('users-table-body');
        usersTableBody.innerHTML = '';
        
        const users = [];
        usersQuery.forEach(doc => {
            const userData = doc.data();
            userData.id = doc.id;
            users.push(userData);
        });
        
        // Ordenar por fecha de creación (más recientes primero)
        users.sort((a, b) => b.fechaCreacion.toDate() - a.fechaCreacion.toDate());
        
        for (const user of users) {
            const totalInvested = await getUserTotalInvested(user.uid);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.telefono || 'N/A'}</td>
                <td><code>${user.miCodigo}</code></td>
                <td>${user.referidosActivos || 0}</td>
                <td>$${totalInvested}</td>
                <td><span class="status-badge active">Activo</span></td>
                <td>${formatDate(user.fechaCreacion)}</td>
                <td>
                    <button class="action-btn primary" onclick="viewUserDetails('${user.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="action-btn danger" onclick="banUser('${user.id}')">
                        <i class="fas fa-ban"></i> Banear
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        }
        
        console.log('Usuarios cargados:', users.length);
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showNotification('error', 'Error', 'Error cargando usuarios', 3000);
    }
}

async function getUserTotalInvested(uid) {
    try {
        const investmentsQuery = await db.collection('inversiones')
            .where('uid', '==', uid)
            .where('estado', '==', 'activa')
            .get();
        
        let total = 0;
        investmentsQuery.forEach(doc => {
            total += doc.data().monto;
        });
        
        return total.toLocaleString();
    } catch (error) {
        console.error('Error calculando total invertido:', error);
        return '0';
    }
}

async function viewUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        // Obtener inversiones del usuario
        const investmentsQuery = await db.collection('inversiones')
            .where('uid', '==', userId)
            .get();
        
        const investments = [];
        investmentsQuery.forEach(doc => {
            const investment = doc.data();
            investment.id = doc.id;
            investments.push(investment);
        });
        
        // Obtener referidos del usuario
        const referralsQuery = await db.collection('users')
            .where('referidoPor', '==', userData.miCodigo)
            .get();
        
        const referrals = [];
        referralsQuery.forEach(doc => {
            referrals.push(doc.data());
        });
        
        const totalInvested = await getUserTotalInvested(userId);
        const modalBody = document.getElementById('user-modal-body');
        modalBody.innerHTML = `
            <div class="user-details">
                <div class="user-detail-item">
                    <span class="user-detail-label">Teléfono:</span>
                    <span class="user-detail-value">${userData.telefono || 'N/A'}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Código de Referido:</span>
                    <span class="user-detail-value"><code>${userData.miCodigo}</code></span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Referido Por:</span>
                    <span class="user-detail-value">${userData.referidoPor || 'Ninguno'}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Referidos Activos:</span>
                    <span class="user-detail-value">${userData.referidosActivos || 0}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Fecha de Registro:</span>
                    <span class="user-detail-value">${formatDate(userData.fechaCreacion)}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Total Invertido:</span>
                    <span class="user-detail-value">$${totalInvested}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Total de Inversiones:</span>
                    <span class="user-detail-value">${investments.length}</span>
                </div>
                <div class="user-detail-item">
                    <span class="user-detail-label">Total de Referidos:</span>
                    <span class="user-detail-value">${referrals.length}</span>
                </div>
            </div>
            
            <h4 style="margin-top: 2rem; color: #333;">Historial de Inversiones</h4>
            <div class="investment-history">
                ${investments.length > 0 ? investments.map(inv => `
                    <div class="investment-item">
                        <div class="investment-info">
                            <strong>$${inv.monto.toLocaleString()}</strong> - ${formatDate(inv.fechaInversion)}
                        </div>
                        <span class="status-badge ${inv.estado}">${getStatusText(inv.estado)}</span>
                    </div>
                `).join('') : '<p>No hay inversiones</p>'}
            </div>
        `;
        
        document.getElementById('user-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando detalles del usuario:', error);
        showNotification('error', 'Error', 'Error cargando detalles del usuario', 3000);
    }
}

async function banUser(userId) {
    const confirmed = await showAlert('question', 'Banear Usuario', '¿Estás seguro de que quieres banear a este usuario?', {
        confirmText: 'Sí, banear',
        dangerText: 'Cancelar',
        showCancel: false
    });
    
    if (confirmed) {
        try {
            await db.collection('users').doc(userId).update({
                estado: 'baneado',
                fechaBaneo: new Date()
            });
            
            showNotification('success', 'Usuario Baneado', 'El usuario ha sido baneado correctamente', 3000);
            loadUsers(); // Recargar lista
            
        } catch (error) {
            console.error('Error baneando usuario:', error);
            showNotification('error', 'Error', 'Error baneando usuario', 3000);
        }
    }
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

function refreshUsers() {
    loadUsers();
    showNotification('success', 'Actualizado', 'Lista de usuarios actualizada', 2000);
}

// ==================== GESTIÓN DE INVERSIONES ====================

async function loadInvestments() {
    try {
        console.log('Cargando inversiones...');
        
        const investmentsQuery = await db.collection('inversiones').get();
        const investmentsTableBody = document.getElementById('investments-table-body');
        investmentsTableBody.innerHTML = '';
        
        const investments = [];
        investmentsQuery.forEach(doc => {
            const investmentData = doc.data();
            investmentData.id = doc.id;
            investments.push(investmentData);
        });
        
        // Ordenar por fecha de creación (más recientes primero)
        investments.sort((a, b) => b.fechaCreacion.toDate() - a.fechaCreacion.toDate());
        
        investments.forEach(investment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${investment.id.substring(0, 8)}...</code></td>
                <td>${investment.uid}</td>
                <td>$${investment.monto.toLocaleString()}</td>
                <td>${formatDate(investment.fechaInversion)}</td>
                <td>${formatDate(investment.fechaDisponibleRetiro)}</td>
                <td><span class="status-badge ${investment.estado}">${getStatusText(investment.estado)}</span></td>
                <td>
                    <button class="action-btn primary" onclick="viewInvestmentDetails('${investment.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    ${investment.estado === 'pendiente' ? `
                        <button class="action-btn success" onclick="approveInvestment('${investment.id}')">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="action-btn danger" onclick="rejectInvestment('${investment.id}')">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    ` : ''}
                </td>
            `;
            investmentsTableBody.appendChild(row);
        });
        
        console.log('Inversiones cargadas:', investments.length);
        
    } catch (error) {
        console.error('Error cargando inversiones:', error);
        showNotification('error', 'Error', 'Error cargando inversiones', 3000);
    }
}

async function viewInvestmentDetails(investmentId) {
    try {
        const investmentDoc = await db.collection('inversiones').doc(investmentId).get();
        const investmentData = investmentDoc.data();
        
        // Obtener datos del usuario
        const userDoc = await db.collection('users').doc(investmentData.uid).get();
        const userData = userDoc.data();
        
        const modalBody = document.getElementById('investment-modal-body');
        modalBody.innerHTML = `
            <div class="investment-details">
                <div class="investment-detail-item">
                    <span class="investment-detail-label">ID de Inversión:</span>
                    <span class="investment-detail-value"><code>${investmentId}</code></span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Usuario:</span>
                    <span class="investment-detail-value">${userData.telefono || 'N/A'}</span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Monto:</span>
                    <span class="investment-detail-value">$${investmentData.monto.toLocaleString()}</span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Estado:</span>
                    <span class="investment-detail-value">
                        <span class="status-badge ${investmentData.estado}">${getStatusText(investmentData.estado)}</span>
                    </span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Fecha de Inversión:</span>
                    <span class="investment-detail-value">${formatDate(investmentData.fechaInversion)}</span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Fecha de Retiro Disponible:</span>
                    <span class="investment-detail-value">${formatDate(investmentData.fechaDisponibleRetiro)}</span>
                </div>
                <div class="investment-detail-item">
                    <span class="investment-detail-label">Fecha de Creación:</span>
                    <span class="investment-detail-value">${formatDate(investmentData.fechaCreacion)}</span>
                </div>
                ${investmentData.planTipo ? `
                    <div class="investment-detail-item">
                        <span class="investment-detail-label">Plan:</span>
                        <span class="investment-detail-value">${investmentData.planNombre || investmentData.planTipo}</span>
                    </div>
                ` : ''}
                ${investmentData.aprobadaPor ? `
                    <div class="investment-detail-item">
                        <span class="investment-detail-label">Aprobada Por:</span>
                        <span class="investment-detail-value">${investmentData.aprobadaPor}</span>
                    </div>
                    <div class="investment-detail-item">
                        <span class="investment-detail-label">Fecha de Aprobación:</span>
                        <span class="investment-detail-value">${formatDate(investmentData.fechaAprobacion)}</span>
                    </div>
                ` : ''}
                ${investmentData.fechaRetiro ? `
                    <div class="investment-detail-item">
                        <span class="investment-detail-label">Fecha de Retiro:</span>
                        <span class="investment-detail-value">${formatDate(investmentData.fechaRetiro)}</span>
                    </div>
                ` : ''}
                ${investmentData.comprobanteCargado && investmentData.comprobanteURL ? `
                    <div class="investment-detail-item">
                        <span class="investment-detail-label">Comprobante de Pago:</span>
                        <span class="investment-detail-value">
                            <button class="btn btn-small" onclick="viewPaymentProof('${investmentData.comprobanteURL}', '${investmentData.comprobanteURL.split('/').pop()}')">
                                <i class="fas fa-eye"></i> Ver Comprobante
                            </button>
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('investment-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando detalles de la inversión:', error);
        showNotification('error', 'Error', 'Error cargando detalles de la inversión', 3000);
    }
}

async function approveInvestment(investmentId) {
    console.log('🚀 approveInvestment iniciada con ID:', investmentId);
    
    try {
        console.log('🔍 Verificando funciones disponibles...');
        console.log('🔍 showAlert disponible:', typeof showAlert);
        console.log('🔍 alertSystem disponible:', typeof alertSystem);
        
        let confirmed;
        
        // Usar confirm nativo directamente para evitar bloqueos
        console.log('🔍 Usando confirm nativo...');
        confirmed = confirm('¿Estás seguro de que quieres aprobar esta inversión?');
        console.log('✅ confirm nativo resultado:', confirmed);
        
        if (confirmed) {
            console.log('👍 Usuario confirmó, actualizando inversión...');
            
            const updateData = {
                estado: 'activa',
                aprobadaPor: currentUser?.uid || 'admin-user',
                fechaAprobacion: new Date()
            };
            
            console.log('📝 Datos a actualizar:', updateData);
            console.log('🔗 currentUser:', currentUser);
            console.log('🗄️ db disponible:', !!db);
            
            if (!db) {
                throw new Error('Base de datos no disponible');
            }
            
            const result = await db.collection('inversiones').doc(investmentId).update(updateData);
            console.log('✅ Inversión actualizada exitosamente:', result);
            
            if (typeof showNotification === 'function') {
                showNotification('success', 'Inversión Aprobada', 'La inversión ha sido aprobada correctamente', 3000);
            } else {
                alert('Inversión aprobada correctamente');
            }
            
            console.log('🔄 Recargando lista de inversiones...');
            await loadInvestments();
            console.log('✅ Lista recargada');
            
        } else {
            console.log('❌ Usuario canceló la aprobación');
        }
    } catch (error) {
        console.error('💥 Error aprobando inversión:', error);
        console.error('💥 Stack trace:', error.stack);
        
        if (typeof showNotification === 'function') {
            showNotification('error', 'Error', 'Error aprobando inversión: ' + error.message, 5000);
        } else {
            alert('Error aprobando inversión: ' + error.message);
        }
    }
}

async function rejectInvestment(investmentId) {
    console.log('🚀 rejectInvestment iniciada con ID:', investmentId);
    
    // Usar confirm nativo directamente para evitar bloqueos
    const confirmed = confirm('¿Estás seguro de que quieres rechazar esta inversión?');
    console.log('✅ confirm nativo resultado:', confirmed);
    
    if (confirmed) {
        try {
            console.log('👍 Usuario confirmó, rechazando inversión...');
            
            const updateData = {
                estado: 'rechazada',
                rechazadaPor: currentUser?.uid || 'admin-user',
                fechaRechazo: new Date()
            };
            
            console.log('📝 Datos a actualizar:', updateData);
            
            await db.collection('inversiones').doc(investmentId).update(updateData);
            console.log('✅ Inversión rechazada exitosamente');
            
            if (typeof showNotification === 'function') {
                showNotification('success', 'Inversión Rechazada', 'La inversión ha sido rechazada', 3000);
            } else {
                alert('Inversión rechazada correctamente');
            }
            
            await loadInvestments(); // Recargar lista
            
        } catch (error) {
            console.error('💥 Error rechazando inversión:', error);
            if (typeof showNotification === 'function') {
                showNotification('error', 'Error', 'Error rechazando inversión', 3000);
            } else {
                alert('Error rechazando inversión: ' + error.message);
            }
        }
    } else {
        console.log('❌ Usuario canceló el rechazo');
    }
}

function closeInvestmentModal() {
    document.getElementById('investment-modal').style.display = 'none';
}

function refreshInvestments() {
    loadInvestments();
    showNotification('success', 'Actualizado', 'Lista de inversiones actualizada', 2000);
}

// ==================== GESTIÓN DE RETIROS ====================

async function loadWithdrawals() {
    try {
        console.log('Cargando retiros...');
        
        const today = new Date();
        const withdrawalsQuery = await db.collection('inversiones')
            .where('estado', '==', 'activa')
            .where('fechaDisponibleRetiro', '<=', today)
            .get();
        
        const withdrawalsTableBody = document.getElementById('withdrawals-table-body');
        withdrawalsTableBody.innerHTML = '';
        
        const withdrawals = [];
        withdrawalsQuery.forEach(doc => {
            const withdrawalData = doc.data();
            withdrawalData.id = doc.id;
            withdrawals.push(withdrawalData);
        });
        
        // Ordenar por fecha de retiro disponible
        withdrawals.sort((a, b) => a.fechaDisponibleRetiro.toDate() - b.fechaDisponibleRetiro.toDate());
        
        for (const withdrawal of withdrawals) {
            // Obtener datos del usuario
            const userDoc = await db.collection('users').doc(withdrawal.uid).get();
            const userData = userDoc.data();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.telefono || 'N/A'}</td>
                <td>$${withdrawal.monto.toLocaleString()}</td>
                <td>${formatDate(withdrawal.fechaDisponibleRetiro)}</td>
                <td>${userData.referidosActivos || 0}</td>
                <td><span class="status-badge ${userData.referidosActivos >= 3 ? 'active' : 'pending'}">${userData.referidosActivos >= 3 ? 'Disponible' : 'Faltan referidos'}</span></td>
                <td>
                    ${userData.referidosActivos >= 3 ? `
                        <button class="action-btn success" onclick="approveWithdrawal('${withdrawal.id}')">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                    ` : `
                        <button class="action-btn secondary" disabled>
                            <i class="fas fa-clock"></i> Esperando referidos
                        </button>
                    `}
                </td>
            `;
            withdrawalsTableBody.appendChild(row);
        }
        
        console.log('Retiros cargados:', withdrawals.length);
        
    } catch (error) {
        console.error('Error cargando retiros:', error);
        showNotification('error', 'Error', 'Error cargando retiros', 3000);
    }
}

async function approveWithdrawal(withdrawalId) {
    console.log('🚀 approveWithdrawal iniciada con ID:', withdrawalId);
    
    // Usar confirm nativo directamente para evitar bloqueos
    const confirmed = confirm('¿Estás seguro de que quieres aprobar este retiro?');
    console.log('✅ confirm nativo resultado:', confirmed);
    
    if (confirmed) {
        try {
            console.log('👍 Usuario confirmó, aprobando retiro...');
            
            const updateData = {
                estado: 'retirada',
                fechaRetiro: new Date(),
                aprobadoPor: currentUser?.uid || 'admin-user'
            };
            
            console.log('📝 Datos a actualizar:', updateData);
            
            await db.collection('inversiones').doc(withdrawalId).update(updateData);
            console.log('✅ Retiro aprobado exitosamente');
            
            if (typeof showNotification === 'function') {
                showNotification('success', 'Retiro Aprobado', 'El retiro ha sido aprobado correctamente', 3000);
            } else {
                alert('Retiro aprobado correctamente');
            }
            
            console.log('🔄 Recargando lista de retiros...');
            await loadWithdrawals(); // Recargar lista
            console.log('✅ Lista de retiros recargada');
            
        } catch (error) {
            console.error('💥 Error aprobando retiro:', error);
            if (typeof showNotification === 'function') {
                showNotification('error', 'Error', 'Error aprobando retiro', 3000);
            } else {
                alert('Error aprobando retiro: ' + error.message);
            }
        }
    } else {
        console.log('❌ Usuario canceló la aprobación del retiro');
    }
}

function refreshWithdrawals() {
    loadWithdrawals();
    showNotification('success', 'Actualizado', 'Lista de retiros actualizada', 2000);
}

// ==================== GESTIÓN DE REFERIDOS ====================

async function loadReferrals() {
    try {
        console.log('Cargando referidos...');
        
        const usersQuery = await db.collection('users').get();
        const referralsTableBody = document.getElementById('referrals-table-body');
        referralsTableBody.innerHTML = '';
        
        const referrals = [];
        usersQuery.forEach(doc => {
            const userData = doc.data();
            userData.id = doc.id;
            referrals.push(userData);
        });
        
        // Ordenar por número de referidos activos
        referrals.sort((a, b) => (b.referidosActivos || 0) - (a.referidosActivos || 0));
        
        for (const referral of referrals) {
            // Obtener referidos del usuario
            const userReferralsQuery = await db.collection('users')
                .where('referidoPor', '==', referral.miCodigo)
                .get();
            
            const userReferrals = [];
            userReferralsQuery.forEach(doc => {
                userReferrals.push(doc.data());
            });
            
            // Calcular total generado por referidos
            let totalGenerated = 0;
            for (const userRef of userReferrals) {
                const refInvestmentsQuery = await db.collection('inversiones')
                    .where('uid', '==', userRef.uid)
                    .where('estado', '==', 'activa')
                    .get();
                
                refInvestmentsQuery.forEach(doc => {
                    totalGenerated += doc.data().monto;
                });
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${referral.telefono || 'N/A'}</td>
                <td><code>${referral.miCodigo}</code></td>
                <td>${userReferrals.length}</td>
                <td>${referral.referidosActivos || 0}</td>
                <td>$${totalGenerated.toLocaleString()}</td>
                <td>
                    <button class="action-btn primary" onclick="viewReferralNetwork('${referral.id}')">
                        <i class="fas fa-network-wired"></i> Ver Red
                    </button>
                </td>
            `;
            referralsTableBody.appendChild(row);
        }
        
        console.log('Referidos cargados:', referrals.length);
        
    } catch (error) {
        console.error('Error cargando referidos:', error);
        showNotification('error', 'Error', 'Error cargando referidos', 3000);
    }
}

async function viewReferralNetwork(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        // Obtener referidos del usuario
        const referralsQuery = await db.collection('users')
            .where('referidoPor', '==', userData.miCodigo)
            .get();
        
        const referrals = [];
        referralsQuery.forEach(doc => {
            const refData = doc.data();
            refData.id = doc.id;
            referrals.push(refData);
        });
        
        // Calcular totales invertidos para cada referido
        const referralItems = [];
        for (const ref of referrals) {
            const totalInvested = await getUserTotalInvested(ref.uid);
            referralItems.push(`
                <div class="referral-item">
                    <div class="referral-info">
                        <strong>${ref.telefono || 'N/A'}</strong>
                        <span>Código: <code>${ref.miCodigo}</code></span>
                    </div>
                    <div class="referral-stats">
                        <span>Referidos: ${ref.referidosActivos || 0}</span>
                        <span>Total: $${totalInvested}</span>
                    </div>
                </div>
            `);
        }
        
        const modalBody = document.getElementById('user-modal-body');
        modalBody.innerHTML = `
            <h4>Red de Referidos de ${userData.telefono || 'Usuario'}</h4>
            <div class="referral-network">
                ${referrals.length > 0 ? referralItems.join('') : '<p>No tiene referidos</p>'}
            </div>
        `;
        
        document.getElementById('user-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando red de referidos:', error);
        showNotification('error', 'Error', 'Error cargando red de referidos', 3000);
    }
}

function refreshReferrals() {
    loadReferrals();
    showNotification('success', 'Actualizado', 'Lista de referidos actualizada', 2000);
}

// ==================== FUNCIONES UTILITARIAS ====================

function formatDate(date) {
    try {
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        if (typeof date === 'string') {
            date = new Date(date);
        }
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Error de fecha';
    }
}

function formatTime(date) {
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

function getStatusText(estado) {
    const statusMap = {
        'pendiente': 'Pendiente',
        'activa': 'Activa',
        'retirada': 'Retirada',
        'reinvertida': 'Reinvertida',
        'rechazada': 'Rechazada'
    };
    return statusMap[estado] || estado;
}

// Función de respaldo para showAlert si no está definida
function showAlert(type, title, message, options = {}) {
    if (typeof alertSystem !== 'undefined' && alertSystem.showAlert) {
        return alertSystem.showAlert(type, title, message, options);
    } else {
        // Fallback: usar confirm nativo
        const confirmed = confirm(`${title}\n\n${message}`);
        return Promise.resolve(confirmed);
    }
}

async function viewPaymentProof(proofURL, fileName) {
    try {
        // Crear modal para mostrar el comprobante
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>Comprobante de Pago</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="proof-viewer">
                        <div class="proof-info">
                            <h4>Archivo: ${fileName}</h4>
                        </div>
                        <div class="proof-image">
                            <img src="${proofURL}" alt="Comprobante de pago" style="max-width: 100%; height: auto; border-radius: 8px;">
                        </div>
                        <div class="proof-actions">
                            <button class="btn btn-primary" onclick="window.open('${proofURL}', '_blank')">
                                <i class="fas fa-external-link-alt"></i> Abrir en nueva pestaña
                            </button>
                            <button class="btn btn-secondary" onclick="downloadProof('${proofURL}', '${fileName}')">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer clic fuera
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
            }
        };
        
    } catch (error) {
        console.error('Error mostrando comprobante:', error);
        showNotification('error', 'Error', 'Error mostrando el comprobante', 3000);
    }
}

async function downloadProof(proofURL, fileName) {
    try {
        const response = await fetch(proofURL);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error descargando comprobante:', error);
        showNotification('error', 'Error', 'Error descargando el comprobante', 3000);
    }
}

// ==================== INICIALIZACIÓN ====================

// Función de inicialización
function initializeAdmin() {
    console.log('Inicializando panel de administración...');
    
    // Verificar que Firebase esté inicializado
    if (!auth) {
        console.error('Firebase Auth no está disponible en admin.');
        showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor. Recarga la página.', 5000);
        return;
    }
    
    // Configurar usuario administrador simulado
    currentUser = {
        uid: 'admin-user',
        phoneNumber: ADMIN_PHONE
    };
    
    console.log('Acceso directo al panel de administración');
    
    // Configurar Firebase en el sistema de notificaciones
    if (typeof notificationSystem !== 'undefined') {
        notificationSystem.setFirebase(currentUser, db);
    }
    
    // Cargar dashboard por defecto
    loadDashboard();
}

// Hacer funciones disponibles globalmente
window.showSection = showSection;
window.logout = logout;
window.refreshDashboard = refreshDashboard;
window.refreshUsers = refreshUsers;
window.refreshInvestments = refreshInvestments;
window.refreshWithdrawals = refreshWithdrawals;
window.refreshReferrals = refreshReferrals;
window.viewUserDetails = viewUserDetails;
window.banUser = banUser;
window.closeUserModal = closeUserModal;
window.viewInvestmentDetails = viewInvestmentDetails;
window.approveInvestment = approveInvestment;
window.rejectInvestment = rejectInvestment;
window.closeInvestmentModal = closeInvestmentModal;
window.approveWithdrawal = approveWithdrawal;
window.viewReferralNetwork = viewReferralNetwork;
window.viewPaymentProof = viewPaymentProof;
window.downloadProof = downloadProof;

// Debug: Verificar que las funciones están disponibles
console.log('🔧 Funciones globales disponibles:', {
    approveInvestment: typeof window.approveInvestment,
    showAlert: typeof window.showAlert,
    alertSystem: typeof alertSystem
});

// Inicializar cuando el DOM esté listo
// Ya se maneja en la inicialización de Firebase arriba

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const userModal = document.getElementById('user-modal');
    const investmentModal = document.getElementById('investment-modal');
    
    if (event.target === userModal) {
        closeUserModal();
    }
    if (event.target === investmentModal) {
        closeInvestmentModal();
    }
}

// Búsqueda de usuarios
document.getElementById('user-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#users-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Filtro de estado de inversiones
document.getElementById('investment-status-filter')?.addEventListener('change', function(e) {
    const filterValue = e.target.value;
    const rows = document.querySelectorAll('#investments-table-body tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('.status-badge');
        if (statusCell) {
            const status = statusCell.textContent.toLowerCase();
            row.style.display = !filterValue || status === filterValue ? '' : 'none';
        }
    });
});

// Búsqueda de referidos
document.getElementById('referral-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#referrals-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}); 