// Configuración de Firebase
// IMPORTANTE: Reemplaza con tu configuración real de Firebase
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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Firebase Storage puede no estar disponible en todas las páginas (p.ej. login).
// Evitar error si el SDK de storage no fue cargado en esa página.
var storage = null;
if (typeof firebase.storage === 'function') {
    storage = firebase.storage();
}

// Variables globales (usar var para evitar problemas de TDZ en algunos navegadores)
var currentUser = null;
let userData = null;
let currentInvestment = null;

// Credenciales de administrador
const ADMIN_PHONE = "+573506049629";
const ADMIN_CODE = "990520";

// Función de respaldo para notificaciones si el sistema no está disponible
function showNotification(type, title, message, duration = 5000, persistent = false) {
    if (typeof notificationSystem !== 'undefined' && notificationSystem.showNotification) {
        notificationSystem.showNotification(type, title, message, duration, persistent);
    } else {
        // Fallback: usar alert nativo
        console.warn('Sistema de notificaciones no disponible, usando alert:', title, message);
        alert(`${title}: ${message}`);
    }
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

// Enviar código OTP
async function sendOTP() {
    const phone = document.getElementById('phone').value;
    const referralCode = document.getElementById('referral-code').value;
    
    if (!phone) {
        showNotification('warning', 'Campo requerido', 'Por favor ingresa tu número de teléfono', 4000);
        return;
    }
    
    try {
        // Configurar reCAPTCHA
        const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sendOTP', {
            'size': 'invisible'
        });
        
        // Enviar código SMS
        const confirmationResult = await auth.signInWithPhoneNumber(phone, recaptchaVerifier);
        window.confirmationResult = confirmationResult;
        
        // Mostrar formulario OTP
        document.getElementById('phone-form').style.display = 'none';
        document.getElementById('otp-form').style.display = 'block';
        
        // Guardar código de referido temporalmente
        sessionStorage.setItem('tempReferralCode', referralCode);
        
    } catch (error) {
        console.error('Error enviando OTP:', error);
        
        // Manejar errores específicos
        if (error.code === 'auth/captcha-check-failed') {
            showNotification('error', 'Error de reCAPTCHA', 'Asegúrate de que el dominio esté autorizado en Firebase Console. Para desarrollo local, agrega "localhost" y "127.0.0.1" en Authentication > Settings > Authorized domains.', 6000);
        } else if (error.code === 'auth/invalid-phone-number') {
            showNotification('error', 'Número inválido', 'Número de teléfono inválido. Asegúrate de incluir el código de país (+57 para Colombia).', 5000);
        } else if (error.code === 'auth/too-many-requests') {
            showNotification('warning', 'Demasiados intentos', 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.', 5000);
        } else {
            showNotification('error', 'Error de envío', 'Error enviando código: ' + error.message, 5000);
        }
    }
}

// Verificar código OTP
async function verifyOTP() {
    const otp = document.getElementById('otp').value;
    
    if (!otp) {
        showNotification('warning', 'Código requerido', 'Por favor ingresa el código de verificación', 4000);
        return;
    }
    
    try {
        const result = await window.confirmationResult.confirm(otp);
        currentUser = result.user;
        
        // Procesar registro/ingreso
        await processUserLogin();
        
    } catch (error) {
        console.error('Error verificando OTP:', error);
        showNotification('error', 'Código incorrecto', 'El código ingresado no es válido. Intenta de nuevo.', 4000);
    }
}

// Volver al formulario de teléfono
function backToPhone() {
    document.getElementById('otp-form').style.display = 'none';
    document.getElementById('phone-form').style.display = 'block';
    document.getElementById('otp').value = '';
}

// Procesar login del usuario
async function processUserLogin() {
    const referralCode = sessionStorage.getItem('tempReferralCode');
    sessionStorage.removeItem('tempReferralCode');
    
    try {
        // Verificar si el usuario ya existe
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            // Usuario existente
            userData = userDoc.data();
            showNotification('info', '¡Bienvenido de vuelta!', 'Has iniciado sesión correctamente', 3000, true);
        } else {
            // Nuevo usuario
            const newUserData = {
                uid: currentUser.uid,
                telefono: currentUser.phoneNumber,
                referidoPor: referralCode || null,
                miCodigo: generateReferralCode(),
                referidosActivos: 0,
                fechaCreacion: await getServerTimestamp()
            };
            
            await db.collection('users').doc(currentUser.uid).set(newUserData);
            userData = newUserData;
            
            // Si tiene código de referido, actualizar contador del referidor
            if (referralCode) {
                await updateReferrerCount(referralCode);
            }
        }
        
        // Mostrar notificación de registro exitoso
        showNotification('success', '¡Registro exitoso!', 'Tu cuenta ha sido creada correctamente', 5000, true);
        
        // Si tiene código de referido, mostrar notificación adicional
        if (referralCode) {
            showNotification('info', 'Código de referido aplicado', `Te registraste usando el código: ${referralCode}`, 5000, true);
        }
        
        // Redirigir al dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Error procesando login:', error);
        showNotification('error', 'Error de login', 'Error procesando login. Intenta de nuevo.', 5000);
    }
}

// Generar código de referido único
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Actualizar contador de referidos del referidor
async function updateReferrerCount(referralCode) {
    try {
        const referrerQuery = await db.collection('users')
            .where('miCodigo', '==', referralCode)
            .get();
        
        if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            await referrerDoc.ref.update({
                referidosActivos: firebase.firestore.FieldValue.increment(1)
            });
            
            // Notificar al referidor sobre el nuevo referido
            const referrerData = referrerDoc.data();
            const newUserData = userData;
            
            // Solo mostrar notificación si el referidor está en el dashboard
            if (window.location.pathname.includes('dashboard.html') && currentUser && currentUser.uid === referrerDoc.id) {
                showNotification('investment', '¡Nuevo referido!', `Alguien se registró usando tu código: ${newUserData.telefono}`, 5000, true);
            }
        }
    } catch (error) {
        console.error('Error actualizando contador de referidos:', error);
    }
}

// Cerrar sesión
function logout() {
    showNotification('info', 'Cerrando sesión', 'Has cerrado sesión correctamente', 2000);
    
    setTimeout(() => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error cerrando sesión:', error);
        });
    }, 1000);
}

// Función para ir al panel de administración
function goToAdmin() {
    window.location.href = 'admin.html';
}

// ==================== FUNCIONES DEL DASHBOARD ====================

// Cargar datos del dashboard
async function loadDashboard() {
    console.log('=== INICIANDO CARGA DEL DASHBOARD ===');
    
    if (!currentUser) {
        console.log('No hay usuario autenticado, redirigiendo...');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        console.log('Cargando datos del usuario:', currentUser.uid);
        
        // Cargar datos del usuario
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        userData = userDoc.data();
        console.log('Datos del usuario cargados:', userData);
        
        // Mostrar información del usuario
        const userPhoneElement = document.getElementById('user-phone');
        const referralCodeElement = document.getElementById('my-referral-code');
        const activeReferralsElement = document.getElementById('active-referrals');
        const adminButton = document.getElementById('admin-btn');
        
        if (userPhoneElement) userPhoneElement.textContent = userData.telefono;
        if (referralCodeElement) referralCodeElement.textContent = userData.miCodigo;
        if (activeReferralsElement) activeReferralsElement.textContent = userData.referidosActivos;
        
        // Mostrar botón de administración si es el administrador
        if (adminButton && userData.telefono === ADMIN_PHONE) {
            adminButton.style.display = 'flex';
        }
        
        console.log('Información del usuario actualizada en el DOM');
        
        // Verificar si alcanzó los 3 referidos necesarios
        if (userData.referidosActivos >= 3) {
            showNotification('success', '¡Meta alcanzada!', 'Ya tienes los 3 referidos necesarios para retirar tu inversión', 5000, true);
        }
        
        // Cargar inversión activa
        console.log('Cargando inversión activa...');
        await loadCurrentInvestment();
        console.log('Inversión activa cargada');
        
        // Cargar historial
        console.log('Iniciando carga de historial de inversiones...');
        await loadInvestmentHistory();
        console.log('Historial de inversiones cargado');
        
        // Cargar notificaciones guardadas
        console.log('Cargando notificaciones guardadas...');
        if (typeof notificationSystem !== 'undefined') {
            await notificationSystem.loadSavedNotifications();
            console.log('Notificaciones guardadas cargadas');
        } else {
            console.error('ERROR: notificationSystem no está disponible para cargar notificaciones');
        }
        
        // Mostrar notificación de bienvenida
        showNotification('info', '¡Bienvenido!', 'Tu dashboard ha sido cargado correctamente', 3000);
        
        console.log('=== DASHBOARD CARGADO COMPLETAMENTE ===');
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showNotification('error', 'Error de carga', 'Error cargando datos. Recarga la página.', 5000);
    }
}

// Cargar inversión activa y calcular total
async function loadCurrentInvestment() {
    try {
        console.log('=== CARGANDO INVERSIÓN ACTIVA ===');
        console.log('Usuario actual:', currentUser.uid);
        
        // Cargar inversión activa
        console.log('Consultando inversión activa...');
        const investmentQuery = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .where('estado', '==', 'activa')
            .orderBy('fechaInversion', 'desc')
            .limit(1)
            .get();
        
        console.log('Inversión activa encontrada:', !investmentQuery.empty);
        
        if (!investmentQuery.empty) {
            currentInvestment = investmentQuery.docs[0].data();
            currentInvestment.id = investmentQuery.docs[0].id;
            console.log('Inversión activa cargada:', currentInvestment);
        } else {
            currentInvestment = null;
            console.log('No hay inversión activa');
        }
        
        // Calcular total de todas las inversiones y métricas de ganancias
        console.log('Calculando totales y métricas de inversiones...');
        const allInvestmentsQuery = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .get();
        
        console.log('Total de inversiones encontradas:', allInvestmentsQuery.size);
        
        const today = new Date();
        const msPerDay = 24 * 60 * 60 * 1000;
        
        let totalInvertido = 0;
        let totalGananciasAcumuladas = 0;
        let totalDisponibleRetiro = 0;
        const allInvestments = [];
        
        allInvestmentsQuery.forEach(docSnap => {
            const inv = docSnap.data();
            inv.id = docSnap.id;
            allInvestments.push(inv);
            const monto = Number(inv.monto) || 0;
            totalInvertido += monto;
            
            const fechaInv = inv.fechaInversion && typeof inv.fechaInversion.toDate === 'function'
                ? inv.fechaInversion.toDate() : new Date(inv.fechaInversion);
            const fechaRetiro = inv.fechaDisponibleRetiro && typeof inv.fechaDisponibleRetiro.toDate === 'function'
                ? inv.fechaDisponibleRetiro.toDate() : new Date(inv.fechaDisponibleRetiro);
            
            const estado = inv.estado || 'pendiente';
            // Ganancias acumuladas solo para inversiones activas/pendientes
            if (estado === 'activa' || estado === 'pendiente') {
                const daysElapsed = Math.max(0, Math.min(7, Math.floor((today - fechaInv) / msPerDay)));
                const dailyProfit = monto / 7;
                totalGananciasAcumuladas += Math.max(0, Math.round(dailyProfit * daysElapsed));
                if (today >= fechaRetiro) {
                    // Disponible para retiro = solo ganancias maduras (monto)
                    totalDisponibleRetiro += monto;
                }
            }
        });
        
        console.log('Total invertido calculado:', totalInvertido);
        console.log('Ganancias acumuladas calculadas:', totalGananciasAcumuladas);
        console.log('Disponible para retiro calculado:', totalDisponibleRetiro);
        
        // Guardar en variables globales para el display y acciones
        window.totalInvertido = totalInvertido;
        window.totalGananciasAcumuladas = totalGananciasAcumuladas;
        window.totalDisponibleRetiro = totalDisponibleRetiro;
        window.allInvestments = allInvestments;
        
        console.log('Actualizando display de inversión...');
        updateInvestmentDisplay();
        console.log('=== INVERSIÓN ACTIVA CARGADA ===');
        
    } catch (error) {
        console.error('Error cargando inversión:', error);
    }
}

// Actualizar display de inversión
function updateInvestmentDisplay() {
    console.log('=== ACTUALIZANDO DISPLAY DE INVERSIÓN ===');
    
    const investBtn = document.getElementById('invest-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const reinvestBtn = document.getElementById('reinvest-btn');
    
    console.log('Elementos encontrados:', {
        investBtn: !!investBtn,
        withdrawBtn: !!withdrawBtn,
        reinvestBtn: !!reinvestBtn
    });
    
    if (currentInvestment) {
        console.log('Hay inversión activa, actualizando display...');
        
        // Mostrar total de todas las inversiones
        const currentInvestmentElement = document.getElementById('current-investment');
        const investmentDateElement = document.getElementById('investment-date');
        const withdrawalDateElement = document.getElementById('withdrawal-date');
        const investmentStatusElement = document.getElementById('investment-status');
        const accumulatedEarningsElement = document.getElementById('accumulated-earnings');
        const availableWithdrawAmountElement = document.getElementById('available-withdraw-amount');
        const withdrawRequestBtn = document.getElementById('withdraw-request-btn');
        
        if (currentInvestmentElement) {
            currentInvestmentElement.textContent = `$${window.totalInvertido.toLocaleString()}`;
            console.log('Total invertido actualizado:', window.totalInvertido);
        }
        
        if (investmentDateElement) {
            investmentDateElement.textContent = formatDate(currentInvestment.fechaInversion);
            console.log('Fecha de inversión actualizada');
        }
        
        if (withdrawalDateElement) {
            withdrawalDateElement.textContent = formatDate(currentInvestment.fechaDisponibleRetiro);
            console.log('Fecha de retiro actualizada');
        }
        
        if (investmentStatusElement) {
            investmentStatusElement.textContent = 'Activa';
            console.log('Estado actualizado a Activa');
        }

        // Usar los agregados globales calculados considerando TODAS las inversiones
        const accumulated = Number(window.totalGananciasAcumuladas) || 0;
        const available = Number(window.totalDisponibleRetiro) || 0;

        if (accumulatedEarningsElement) accumulatedEarningsElement.textContent = `$${(accumulated || 0).toLocaleString()}`;
        if (availableWithdrawAmountElement) availableWithdrawAmountElement.textContent = `$${(available || 0).toLocaleString()}`;
        if (withdrawRequestBtn) withdrawRequestBtn.disabled = available <= 0;
        
        // Verificar si puede retirar
        const canWithdraw = canUserWithdraw();
        console.log('Puede retirar:', canWithdraw);
        
        if (withdrawBtn) withdrawBtn.disabled = !canWithdraw;
        if (reinvestBtn) reinvestBtn.disabled = !canWithdraw;
        if (investBtn) investBtn.disabled = true;
        
        // Notificar si la inversión está disponible para retiro
        if (canWithdraw) {
            showNotification('investment', '¡Inversión disponible!', 'Tu inversión ya está disponible para retiro', 5000, true);
        } else if (currentInvestment) {
            // Verificar si falta tiempo o referidos
            const today = new Date();
            const withdrawalDate = new Date(currentInvestment.fechaDisponibleRetiro);
            const hasEnoughReferrals = userData.referidosActivos >= 3;
            
            if (today < withdrawalDate && !hasEnoughReferrals) {
                showNotification('warning', 'Faltan requisitos', 'Necesitas 3 referidos y esperar 7 días para retirar', 5000, true);
            } else if (today < withdrawalDate) {
                showNotification('info', 'Esperando tiempo', 'Tu inversión estará disponible pronto', 5000, true);
            } else if (!hasEnoughReferrals) {
                showNotification('warning', 'Faltan referidos', `Necesitas ${3 - userData.referidosActivos} referidos más para retirar`, 5000, true);
            }
        }
        
    } else {
        console.log('No hay inversión activa, mostrando estado vacío...');
        
        // Sin inversión activa
        const currentInvestmentElement = document.getElementById('current-investment');
        const investmentDateElement = document.getElementById('investment-date');
        const withdrawalDateElement = document.getElementById('withdrawal-date');
        const investmentStatusElement = document.getElementById('investment-status');
        
        if (currentInvestmentElement) currentInvestmentElement.textContent = '$0';
        if (investmentDateElement) investmentDateElement.textContent = '-';
        if (withdrawalDateElement) withdrawalDateElement.textContent = '-';
        if (investmentStatusElement) investmentStatusElement.textContent = 'Sin inversión activa';
        
        if (withdrawBtn) withdrawBtn.disabled = true;
        if (reinvestBtn) reinvestBtn.disabled = true;
        if (investBtn) investBtn.disabled = false;
        
        console.log('Display actualizado para estado sin inversión');
    }
    
    console.log('=== DISPLAY DE INVERSIÓN ACTUALIZADO ===');
}

// Verificar si el usuario puede retirar
async function canUserWithdraw() {
    if (!currentInvestment) return false;
    
    try {
        const today = await getServerDate();
        const withdrawalDate = new Date(currentInvestment.fechaDisponibleRetiro);
        const hasEnoughReferrals = userData.referidosActivos >= 3;
        
        return today >= withdrawalDate && hasEnoughReferrals;
    } catch (error) {
        console.error('Error obteniendo fecha del servidor para validación:', error);
        // Fallback a fecha local (menos seguro)
        const today = new Date();
        const withdrawalDate = new Date(currentInvestment.fechaDisponibleRetiro);
        const hasEnoughReferrals = userData.referidosActivos >= 3;
        
        return today >= withdrawalDate && hasEnoughReferrals;
    }
}

// Solicitar retiro al administrador (valida 7 días)
async function requestWithdrawal() {
    try {
        const today = await getServerDate();
        // Validar que exista al menos una inversión madura (>= 7 días)
        const mature = (window.allInvestments || []).filter(inv => {
            const fechaRetiro = inv.fechaDisponibleRetiro && typeof inv.fechaDisponibleRetiro.toDate === 'function'
                ? inv.fechaDisponibleRetiro.toDate() : new Date(inv.fechaDisponibleRetiro);
            return (inv.estado === 'activa' || inv.estado === 'pendiente') && today >= fechaRetiro;
        });

        if (mature.length === 0) {
            showNotification('warning', 'Aún no disponible', 'No tienes inversiones con 7 días cumplidos.', 4000);
            return;
        }

        // Marcar todas las inversiones maduras con solicitud de retiro usando fechas del servidor
        const serverTimestamp = await getServerTimestamp();
        await Promise.all(mature.map(inv => db.collection('inversiones').doc(inv.id).update({
            solicitudRetiro: true,
            fechaSolicitudRetiro: serverTimestamp
        })));
        
        showNotification('success', 'Solicitud enviada', 'Tu solicitud de retiro fue enviada al administrador.', 4000);
        
        // Opcional: refrescar datos
        await loadCurrentInvestment();
        await loadInvestmentHistory();
        
    } catch (error) {
        console.error('Error solicitando retiro:', error);
        showNotification('error', 'Error', 'No se pudo enviar la solicitud de retiro.', 4000);
    }
}

// Cargar historial de inversiones
async function loadInvestmentHistory() {
    try {
        console.log('Cargando historial de inversiones para usuario:', currentUser.uid);
        
        const historyQuery = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .orderBy('fechaInversion', 'desc')
            .get();
        
        console.log('Inversiones encontradas en historial:', historyQuery.size);
        
        const historyList = document.getElementById('history-list');
        if (!historyList) {
            console.error('Elemento history-list no encontrado en el DOM');
            return;
        }
        
        historyList.innerHTML = '';
        
        if (historyQuery.empty) {
            console.log('No hay inversiones en el historial');
            historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-chart-line"></i>
                    <h4>No hay historial de inversiones</h4>
                    <p>Realiza tu primera inversión para ver el historial aquí</p>
                </div>
            `;
        } else {
            console.log('Procesando', historyQuery.size, 'inversiones');
            historyQuery.forEach(doc => {
                const investment = doc.data();
                console.log('Inversión:', investment);
                const historyItem = createHistoryItem(investment);
                historyList.appendChild(historyItem);
            });
        }
        
        console.log('Historial de inversiones cargado correctamente');
        
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// Crear elemento de historial
function createHistoryItem(investment) {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const statusClass = `status-${investment.estado}`;
    const statusText = getStatusText(investment.estado);
    
    let additionalInfo = '';
    if (investment.fechaRetiro) {
        additionalInfo = `<p>Retirado: ${formatDate(investment.fechaRetiro)}</p>`;
    } else if (investment.fechaReinversion) {
        additionalInfo = `<p>Reinvertido: ${formatDate(investment.fechaReinversion)}</p>`;
    }
    
    item.innerHTML = `
        <div class="history-info">
            <h4>$${investment.monto.toLocaleString()}</h4>
            <p><strong>Invertido:</strong> ${formatDate(investment.fechaInversion)}</p>
            <p><strong>Disponible:</strong> ${formatDate(investment.fechaDisponibleRetiro)}</p>
            ${additionalInfo}
        </div>
        <div class="history-status-container">
            <span class="history-status ${statusClass}">${statusText}</span>
        </div>
    `;
    
    return item;
}

// Función para obtener texto del estado
function getStatusText(estado) {
    const statusMap = {
        'activa': 'Activa',
        'retirada': 'Retirada',
        'reinvertida': 'Reinvertida'
    };
    return statusMap[estado] || estado;
}

// ==================== FUNCIONES DE INVERSIÓN ====================

// Seleccionar plan de inversión
async function selectPlan(planType, defaultAmount) {
    const modal = document.getElementById('investment-modal');
    const amountInput = document.getElementById('investment-amount');
    const modalTitle = document.querySelector('#investment-modal .modal-header h3');
    const planNameSpan = document.getElementById('modal-plan-name');
    const planDescriptionSpan = document.getElementById('modal-plan-description');
    const investmentHint = document.getElementById('investment-hint');
    
    // Configurar el modal según el plan seleccionado
    let planName, planDescription, minAmount, maxAmount, hint;
    
    switch(planType) {
        case 'basico':
            planName = 'Plan Básico 🌱';
            planDescription = 'Inversión: $30.000 COP - Rentabilidad: 100%';
            minAmount = 30000;
            maxAmount = 30000;
            hint = 'Monto fijo: $30.000 COP';
            break;
        case 'inicial':
            planName = 'Plan Inicial 🚀';
            planDescription = 'Inversión: $50.000 COP - Rentabilidad: 100%';
            minAmount = 50000;
            maxAmount = 50000;
            hint = 'Monto fijo: $50.000 COP';
            break;
        case 'progreso':
            planName = 'Plan Progreso ⚡';
            planDescription = 'Inversión: $100.000 COP - Rentabilidad: 100%';
            minAmount = 100000;
            maxAmount = 100000;
            hint = 'Monto fijo: $100.000 COP';
            break;
        case 'avanzado':
            planName = 'Plan Avanzado 🔥';
            planDescription = 'Inversión: $250.000 COP - Rentabilidad: 100%';
            minAmount = 250000;
            maxAmount = 250000;
            hint = 'Monto fijo: $250.000 COP';
            break;
        case 'premium':
            planName = 'Plan Premium 💎';
            planDescription = 'Inversión: $500.000 COP - Rentabilidad: 100%';
            minAmount = 500000;
            maxAmount = 500000;
            hint = 'Monto fijo: $500.000 COP';
            break;
        case 'elite':
            planName = 'Plan Élite 👑';
            planDescription = 'Inversión: $1.000.000 COP - Rentabilidad: 100%';
            minAmount = 1000000;
            maxAmount = 1000000;
            hint = 'Monto fijo: $1.000.000 COP';
            break;
    }
    
    // Actualizar el modal
    modalTitle.textContent = planName;
    planNameSpan.textContent = planName;
    planDescriptionSpan.textContent = planDescription;
    investmentHint.textContent = hint;
    
    // Actualizar el campo de monto
    amountInput.value = defaultAmount;
    amountInput.min = minAmount;
    amountInput.max = maxAmount;
    if (minAmount === maxAmount) {
        amountInput.readOnly = true;
        amountInput.style.backgroundColor = '#f8f9fa';
    } else {
        amountInput.readOnly = false;
        amountInput.style.backgroundColor = 'white';
    }
    
    // Mostrar fechas del servidor (seguras)
    try {
        const today = await getServerDate();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        document.getElementById('modal-investment-date').textContent = formatDate(today);
        document.getElementById('modal-withdrawal-date').textContent = formatDate(withdrawalDate);
    } catch (error) {
        console.error('Error obteniendo fechas del servidor:', error);
        // Fallback a fechas locales (menos seguro)
        const today = new Date();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        document.getElementById('modal-investment-date').textContent = formatDate(today);
        document.getElementById('modal-withdrawal-date').textContent = formatDate(withdrawalDate);
    }
    
    modal.style.display = 'block';
    
    showNotification('info', 'Plan Seleccionado', `Has seleccionado el ${planName}`, 3000);
}

// Mostrar modal de inversión
async function showInvestmentModal() {
    const modal = document.getElementById('investment-modal');
    
    try {
        const today = await getServerDate();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        document.getElementById('modal-investment-date').textContent = formatDate(today);
        document.getElementById('modal-withdrawal-date').textContent = formatDate(withdrawalDate);
    } catch (error) {
        console.error('Error obteniendo fechas del servidor:', error);
        // Fallback a fechas locales (menos seguro)
        const today = new Date();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        document.getElementById('modal-investment-date').textContent = formatDate(today);
        document.getElementById('modal-withdrawal-date').textContent = formatDate(withdrawalDate);
    }
    
    modal.style.display = 'block';
    
    showNotification('info', 'Nueva inversión', 'Completa los detalles de tu inversión', 3000);
}

// Cerrar modal de inversión
function closeInvestmentModal() {
    document.getElementById('investment-modal').style.display = 'none';
}

// Confirmar inversión
async function confirmInvestment() {
    const amount = parseInt(document.getElementById('investment-amount').value);
    const modalTitle = document.querySelector('#investment-modal .modal-header h3').textContent;
    
    // Determinar el plan basado en el título del modal
    let planType = 'general';
    if (modalTitle.includes('Básico')) {
        planType = 'basico';
        if (amount !== 30000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Básico requiere exactamente $30.000', 4000);
            return;
        }
    } else if (modalTitle.includes('Inicial')) {
        planType = 'inicial';
        if (amount !== 50000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Inicial requiere exactamente $50.000', 4000);
            return;
        }
    } else if (modalTitle.includes('Progreso')) {
        planType = 'progreso';
        if (amount !== 100000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Progreso requiere exactamente $100.000', 4000);
            return;
        }
    } else if (modalTitle.includes('Avanzado')) {
        planType = 'avanzado';
        if (amount !== 250000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Avanzado requiere exactamente $250.000', 4000);
            return;
        }
    } else if (modalTitle.includes('Premium')) {
        planType = 'premium';
        if (amount !== 500000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Premium requiere exactamente $500.000', 4000);
            return;
        }
    } else if (modalTitle.includes('Élite')) {
        planType = 'elite';
        if (amount !== 1000000) {
            showNotification('warning', 'Monto incorrecto', 'El Plan Élite requiere exactamente $1.000.000', 4000);
            return;
        }
    }
    
    if (amount < 30000) {
        showNotification('warning', 'Monto mínimo', 'El monto mínimo es $30.000', 4000);
        return;
    }
    
    // Cerrar modal de inversión y mostrar modal de pago
    closeInvestmentModal();
    showPaymentModal(planType, amount, modalTitle);
}

// Mostrar modal de pago
async function showPaymentModal(planType, amount, planName) {
    const modal = document.getElementById('payment-modal');
    
    // Actualizar detalles del pago
    document.getElementById('payment-plan-name').textContent = planName;
    document.getElementById('payment-amount').textContent = `$${amount.toLocaleString()}`;
    
    // Usar fecha del servidor para el pago
    try {
        const serverDate = await getServerDate();
        document.getElementById('payment-date').textContent = formatDate(serverDate);
    } catch (error) {
        console.error('Error obteniendo fecha del servidor para pago:', error);
        document.getElementById('payment-date').textContent = formatDate(new Date());
    }
    
    // Guardar datos temporalmente
    window.tempInvestmentData = {
        planType: planType,
        amount: amount,
        planName: planName
    };
    
    modal.style.display = 'block';
    
    showNotification('info', 'Proceso de Pago', 'Completa el proceso de pago para continuar', 3000);
}

// Cerrar modal de pago
function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    // Limpiar datos temporales
    window.tempInvestmentData = null;
    // Limpiar archivo cargado
    removeFile();
}

// Copiar número de Nequi
function copyNequiNumber() {
    const nequiNumber = '3506049629';
    navigator.clipboard.writeText(nequiNumber).then(() => {
        showNotification('success', 'Número copiado', 'Número de Nequi copiado al portapapeles', 2000);
    }).catch(() => {
        showNotification('error', 'Error', 'No se pudo copiar el número', 2000);
    });
}

// Manejar carga de archivo
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showNotification('error', 'Tipo de archivo no válido', 'Solo se permiten imágenes (JPG, PNG, GIF) y PDF', 4000);
            return;
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('error', 'Archivo muy grande', 'El archivo debe ser menor a 5MB', 4000);
            return;
        }
        
        // Mostrar archivo cargado
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('uploaded-file').style.display = 'block';
        document.getElementById('process-payment-btn').disabled = false;
        
        // Guardar archivo temporalmente
        window.tempFile = file;
        
        showNotification('success', 'Archivo cargado', 'Comprobante cargado correctamente', 2000);
    }
}

// Remover archivo
function removeFile() {
    document.getElementById('proof-file').value = '';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('uploaded-file').style.display = 'none';
    document.getElementById('process-payment-btn').disabled = true;
    window.tempFile = null;
}

// Procesar pago
async function processPayment() {
    if (!window.tempFile) {
        showNotification('warning', 'Comprobante requerido', 'Debes cargar el comprobante de pago', 4000);
        return;
    }
    
    if (!window.tempInvestmentData) {
        showNotification('error', 'Error', 'Datos de inversión no encontrados', 4000);
        return;
    }
    
    try {
        const { planType, amount, planName } = window.tempInvestmentData;
        
        // Crear la inversión con estado 'pendiente' usando fechas del servidor
        const serverTimestamp = await getServerTimestamp();
        const withdrawalTimestamp = await calculateWithdrawalDate();
        
        const investmentData = {
            uid: currentUser.uid,
            monto: amount,
            planTipo: planType,
            planNombre: planName,
            fechaInversion: serverTimestamp,
            fechaDisponibleRetiro: withdrawalTimestamp,
            estado: 'pendiente',
            fechaCreacion: serverTimestamp,
            comprobanteCargado: true,
            fechaComprobante: serverTimestamp
        };
        
        // Subir el comprobante a Firebase Storage
        const storageRef = storage.ref();
        const fileName = `${Date.now()}_${window.tempFile.name}`;
        const fileRef = storageRef.child(`comprobantes/${currentUser.uid}/${fileName}`);
        
        // Usar putString con base64 para evitar problemas CORS
        const uploadTask = fileRef.put(window.tempFile, {
            contentType: window.tempFile.type,
            customMetadata: {
                'uploadedBy': currentUser.uid,
                'originalName': window.tempFile.name
            }
        });
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Progreso de carga
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                console.error('Error uploading file:', error);
                showNotification('error', 'Error', 'Error cargando el comprobante', 4000);
            },
            async () => {
                // Carga completada
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                investmentData.comprobanteURL = downloadURL;
                
                // Guardar inversión en Firestore
                const investmentRef = await db.collection('inversiones').add(investmentData);
                
                // Cerrar modal de pago
                closePaymentModal();
                
                // Redirigir a WhatsApp
                const message = `Confirmen mi inversión de $${amount.toLocaleString()}`;
                const whatsappURL = `https://wa.me/573506049629?text=${encodeURIComponent(message)}`;
                window.open(whatsappURL, '_blank');
                
                // Recargar dashboard
                await loadCurrentInvestment();
                await loadInvestmentHistory();
                
                showNotification('success', '¡Inversión enviada!', 'Tu inversión ha sido enviada para aprobación. Revisa WhatsApp para confirmar.', 5000, true);
            }
        );
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        showNotification('error', 'Error de pago', 'Error procesando el pago. Intenta de nuevo.', 5000);
    }
}

// Retirar inversión
async function withdrawInvestment() {
    if (!canUserWithdraw()) {
        showNotification('warning', 'No puedes retirar', 'Necesitas 3 referidos activos y esperar 7 días para poder retirar tu inversión.', 5000);
        return;
    }
    
    const confirmed = await showAlert('question', 'Confirmar retiro', '¿Estás seguro de que quieres retirar tu inversión?', {
        confirmText: 'Sí, retirar',
        showCancel: true
    });
    
    if (confirmed) {
        try {
            const serverTimestamp = await getServerTimestamp();
            await db.collection('inversiones').doc(currentInvestment.id).update({
                estado: 'retirada',
                fechaRetiro: serverTimestamp
            });
            
            await loadCurrentInvestment();
            await loadInvestmentHistory();
            
            showNotification('success', '¡Retiro exitoso!', 'Tu inversión ha sido retirada correctamente', 5000, true);
            
        } catch (error) {
            console.error('Error retirando inversión:', error);
            showNotification('error', 'Error de retiro', 'Error retirando inversión. Intenta de nuevo.', 5000);
        }
    }
}

// Reinvertir
async function reinvestInvestment() {
    if (!canUserWithdraw()) {
        showNotification('warning', 'No puedes reinvertir', 'Necesitas 3 referidos activos y esperar 7 días para poder reinvertir.', 5000);
        return;
    }
    
    const confirmed = await showAlert('question', 'Confirmar reinversión', '¿Estás seguro de que quieres reinvertir?', {
        confirmText: 'Sí, reinvertir',
        showCancel: true
    });
    
    if (confirmed) {
        try {
            // Marcar inversión actual como reinvertida usando fechas del servidor
            const serverTimestamp = await getServerTimestamp();
            const withdrawalTimestamp = await calculateWithdrawalDate();
            
            await db.collection('inversiones').doc(currentInvestment.id).update({
                estado: 'reinvertida',
                fechaReinversion: serverTimestamp
            });
            
            // Crear nueva inversión usando fechas del servidor
            const newInvestmentData = {
                uid: currentUser.uid,
                monto: currentInvestment.monto,
                fechaInversion: serverTimestamp,
                fechaDisponibleRetiro: withdrawalTimestamp,
                estado: 'activa',
                fechaCreacion: serverTimestamp
            };
            
            await db.collection('inversiones').add(newInvestmentData);
            
            await loadCurrentInvestment();
            await loadInvestmentHistory();
            
            showNotification('success', '¡Reinversión exitosa!', 'Tu reinversión ha sido realizada correctamente', 5000, true);
            
        } catch (error) {
            console.error('Error reinvirtiendo:', error);
            showNotification('error', 'Error de reinversión', 'Error reinvirtiendo. Intenta de nuevo.', 5000);
        }
    }
}

// Copiar código de referido
function copyReferralCode() {
    const code = document.getElementById('my-referral-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('success', 'Código copiado', 'El código de referido ha sido copiado al portapapeles', 3000, true);
    }).catch(() => {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('success', 'Código copiado', 'El código de referido ha sido copiado al portapapeles', 3000, true);
    });
}

// ==================== FUNCIONES UTILITARIAS ====================

// Función para obtener la fecha actual del servidor (segura)
async function getServerTimestamp() {
    try {
        // Usar Firebase Timestamp.now() que es generado por el servidor
        return firebase.firestore.Timestamp.now();
    } catch (error) {
        console.error('Error obteniendo timestamp del servidor:', error);
        // Fallback: usar fecha local pero registrar advertencia
        console.warn('⚠️ Usando fecha local como fallback - esto puede ser inseguro');
        return firebase.firestore.Timestamp.fromDate(new Date());
    }
}

// Función para obtener fecha del servidor como Date object
async function getServerDate() {
    const timestamp = await getServerTimestamp();
    return timestamp.toDate();
}

// Función para calcular fecha de retiro usando timestamp del servidor
async function calculateWithdrawalDate() {
    const serverDate = await getServerDate();
    const withdrawalDate = new Date(serverDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    return firebase.firestore.Timestamp.fromDate(withdrawalDate);
}

// Formatear fecha
function formatDate(date) {
    try {
        // Si es un timestamp de Firestore, convertirlo a Date
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        
        // Si es string, convertir a Date
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // Verificar que sea una fecha válida
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.warn('Fecha inválida:', date);
            return 'Fecha inválida';
        }
        
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error, 'Fecha original:', date);
        return 'Error de fecha';
    }
}

// ==================== INICIALIZACIÓN ====================

// Verificar estado de autenticación
auth.onAuthStateChanged(async (user) => {
    console.log('Estado de autenticación cambiado:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
    
    if (user) {
        currentUser = user;
        console.log('Usuario actual establecido:', user.uid);
        
        // Configurar Firebase en el sistema de notificaciones
        console.log('Configurando Firebase en sistema de notificaciones...');
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.setFirebase(user, db);
            console.log('Firebase configurado en sistema de notificaciones');
        } else {
            console.error('ERROR: notificationSystem no está definido');
        }
        
        // Si estamos en el dashboard, cargar datos
        if (window.location.pathname.includes('dashboard.html')) {
            console.log('Cargando dashboard...');
            await loadDashboard();
            console.log('Dashboard cargado');
        }
    } else {
        console.log('No hay usuario autenticado');
        // Si no hay usuario autenticado y estamos en dashboard, redirigir
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('investment-modal');
    if (event.target === modal) {
        closeInvestmentModal();
    }
}

// Hacer funciones disponibles globalmente
window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;
window.backToPhone = backToPhone;
window.logout = logout;
window.goToAdmin = goToAdmin;
window.showInvestmentModal = showInvestmentModal;
window.closeInvestmentModal = closeInvestmentModal;
window.confirmInvestment = confirmInvestment;
window.withdrawInvestment = withdrawInvestment;
window.reinvestInvestment = reinvestInvestment;
window.copyReferralCode = copyReferralCode;
window.showNotificationsPanel = showNotificationsPanel;
window.selectPlan = selectPlan;
window.showPaymentModal = showPaymentModal;
window.closePaymentModal = closePaymentModal;
window.copyNequiNumber = copyNequiNumber;
window.handleFileUpload = handleFileUpload;
window.removeFile = removeFile;
window.processPayment = processPayment; 
window.requestWithdrawal = requestWithdrawal;