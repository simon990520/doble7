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

// Variables globales
let currentUser = null;
let userData = null;
let currentInvestment = null;

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

// Enviar código OTP
async function sendOTP() {
    const phone = document.getElementById('phone').value;
    const referralCode = document.getElementById('referral-code').value;
    
    if (!phone) {
        alert('Por favor ingresa tu número de teléfono');
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
            alert('Error de reCAPTCHA. Asegúrate de que el dominio esté autorizado en Firebase Console.\n\nPara desarrollo local, agrega "localhost" y "127.0.0.1" en Authentication > Settings > Authorized domains.');
        } else if (error.code === 'auth/invalid-phone-number') {
            alert('Número de teléfono inválido. Asegúrate de incluir el código de país (+57 para Colombia).');
        } else if (error.code === 'auth/too-many-requests') {
            alert('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.');
        } else {
            alert('Error enviando código: ' + error.message);
        }
    }
}

// Verificar código OTP
async function verifyOTP() {
    const otp = document.getElementById('otp').value;
    
    if (!otp) {
        alert('Por favor ingresa el código de verificación');
        return;
    }
    
    try {
        const result = await window.confirmationResult.confirm(otp);
        currentUser = result.user;
        
        // Procesar registro/ingreso
        await processUserLogin();
        
    } catch (error) {
        console.error('Error verificando OTP:', error);
        alert('Código incorrecto. Intenta de nuevo.');
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
        } else {
            // Nuevo usuario
            const newUserData = {
                uid: currentUser.uid,
                telefono: currentUser.phoneNumber,
                referidoPor: referralCode || null,
                miCodigo: generateReferralCode(),
                referidosActivos: 0,
                fechaCreacion: new Date()
            };
            
            await db.collection('users').doc(currentUser.uid).set(newUserData);
            userData = newUserData;
            
            // Si tiene código de referido, actualizar contador del referidor
            if (referralCode) {
                await updateReferrerCount(referralCode);
            }
        }
        
        // Redirigir al dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Error procesando login:', error);
        alert('Error procesando login. Intenta de nuevo.');
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
        }
    } catch (error) {
        console.error('Error actualizando contador de referidos:', error);
    }
}

// Cerrar sesión
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error cerrando sesión:', error);
    });
}

// ==================== FUNCIONES DEL DASHBOARD ====================

// Cargar datos del dashboard
async function loadDashboard() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Cargar datos del usuario
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        userData = userDoc.data();
        
        // Mostrar información del usuario
        document.getElementById('user-phone').textContent = userData.telefono;
        document.getElementById('my-referral-code').textContent = userData.miCodigo;
        document.getElementById('active-referrals').textContent = userData.referidosActivos;
        
        // Cargar inversión activa
        await loadCurrentInvestment();
        
        // Cargar historial
        await loadInvestmentHistory();
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        alert('Error cargando datos. Recarga la página.');
    }
}

// Cargar inversión activa
async function loadCurrentInvestment() {
    try {
        const investmentQuery = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .where('estado', '==', 'activa')
            .orderBy('fechaInversion', 'desc')
            .limit(1)
            .get();
        
        if (!investmentQuery.empty) {
            currentInvestment = investmentQuery.docs[0].data();
            currentInvestment.id = investmentQuery.docs[0].id;
            updateInvestmentDisplay();
        } else {
            currentInvestment = null;
            updateInvestmentDisplay();
        }
        
    } catch (error) {
        console.error('Error cargando inversión:', error);
    }
}

// Actualizar display de inversión
function updateInvestmentDisplay() {
    const investBtn = document.getElementById('invest-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const reinvestBtn = document.getElementById('reinvest-btn');
    
    if (currentInvestment) {
        // Mostrar datos de inversión activa
        document.getElementById('current-investment').textContent = 
            `$${currentInvestment.monto.toLocaleString()}`;
        document.getElementById('investment-date').textContent = 
            formatDate(currentInvestment.fechaInversion);
        document.getElementById('withdrawal-date').textContent = 
            formatDate(currentInvestment.fechaDisponibleRetiro);
        document.getElementById('investment-status').textContent = 'Activa';
        
        // Verificar si puede retirar
        const canWithdraw = canUserWithdraw();
        withdrawBtn.disabled = !canWithdraw;
        reinvestBtn.disabled = !canWithdraw;
        investBtn.disabled = true;
        
    } else {
        // Sin inversión activa
        document.getElementById('current-investment').textContent = '$0';
        document.getElementById('investment-date').textContent = '-';
        document.getElementById('withdrawal-date').textContent = '-';
        document.getElementById('investment-status').textContent = 'Sin inversión activa';
        
        withdrawBtn.disabled = true;
        reinvestBtn.disabled = true;
        investBtn.disabled = false;
    }
}

// Verificar si el usuario puede retirar
function canUserWithdraw() {
    if (!currentInvestment) return false;
    
    const today = new Date();
    const withdrawalDate = new Date(currentInvestment.fechaDisponibleRetiro);
    const hasEnoughReferrals = userData.referidosActivos >= 3;
    
    return today >= withdrawalDate && hasEnoughReferrals;
}

// Cargar historial de inversiones
async function loadInvestmentHistory() {
    try {
        const historyQuery = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .orderBy('fechaInversion', 'desc')
            .get();
        
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        historyQuery.forEach(doc => {
            const investment = doc.data();
            const historyItem = createHistoryItem(investment);
            historyList.appendChild(historyItem);
        });
        
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// Crear elemento de historial
function createHistoryItem(investment) {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const statusClass = `status-${investment.estado}`;
    
    item.innerHTML = `
        <div class="history-info">
            <h4>$${investment.monto.toLocaleString()}</h4>
            <p>Invertido: ${formatDate(investment.fechaInversion)}</p>
            <p>Disponible: ${formatDate(investment.fechaDisponibleRetiro)}</p>
        </div>
        <span class="history-status ${statusClass}">${investment.estado}</span>
    `;
    
    return item;
}

// ==================== FUNCIONES DE INVERSIÓN ====================

// Mostrar modal de inversión
function showInvestmentModal() {
    const modal = document.getElementById('investment-modal');
    const today = new Date();
    const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    document.getElementById('modal-investment-date').textContent = formatDate(today);
    document.getElementById('modal-withdrawal-date').textContent = formatDate(withdrawalDate);
    
    modal.style.display = 'block';
}

// Cerrar modal de inversión
function closeInvestmentModal() {
    document.getElementById('investment-modal').style.display = 'none';
}

// Confirmar inversión
async function confirmInvestment() {
    const amount = parseInt(document.getElementById('investment-amount').value);
    
    if (amount < 10000) {
        alert('El monto mínimo es $10.000');
        return;
    }
    
    try {
        const today = new Date();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const investmentData = {
            uid: currentUser.uid,
            monto: amount,
            fechaInversion: today,
            fechaDisponibleRetiro: withdrawalDate,
            estado: 'activa',
            fechaCreacion: new Date()
        };
        
        await db.collection('inversiones').add(investmentData);
        
        closeInvestmentModal();
        await loadCurrentInvestment();
        await loadInvestmentHistory();
        
        alert('Inversión realizada exitosamente');
        
    } catch (error) {
        console.error('Error realizando inversión:', error);
        alert('Error realizando inversión. Intenta de nuevo.');
    }
}

// Retirar inversión
async function withdrawInvestment() {
    if (!canUserWithdraw()) {
        alert('No puedes retirar aún. Necesitas 3 referidos activos y esperar 7 días.');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres retirar tu inversión?')) {
        try {
            await db.collection('inversiones').doc(currentInvestment.id).update({
                estado: 'retirada',
                fechaRetiro: new Date()
            });
            
            await loadCurrentInvestment();
            await loadInvestmentHistory();
            
            alert('Inversión retirada exitosamente');
            
        } catch (error) {
            console.error('Error retirando inversión:', error);
            alert('Error retirando inversión. Intenta de nuevo.');
        }
    }
}

// Reinvertir
async function reinvestInvestment() {
    if (!canUserWithdraw()) {
        alert('No puedes reinvertir aún. Necesitas 3 referidos activos y esperar 7 días.');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres reinvertir?')) {
        try {
            // Marcar inversión actual como reinvertida
            await db.collection('inversiones').doc(currentInvestment.id).update({
                estado: 'reinvertida',
                fechaReinversion: new Date()
            });
            
            // Crear nueva inversión
            const today = new Date();
            const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
            
            const newInvestmentData = {
                uid: currentUser.uid,
                monto: currentInvestment.monto,
                fechaInversion: today,
                fechaDisponibleRetiro: withdrawalDate,
                estado: 'activa',
                fechaCreacion: new Date()
            };
            
            await db.collection('inversiones').add(newInvestmentData);
            
            await loadCurrentInvestment();
            await loadInvestmentHistory();
            
            alert('Reinversión realizada exitosamente');
            
        } catch (error) {
            console.error('Error reinvirtiendo:', error);
            alert('Error reinvirtiendo. Intenta de nuevo.');
        }
    }
}

// Copiar código de referido
function copyReferralCode() {
    const code = document.getElementById('my-referral-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Código copiado al portapapeles');
    }).catch(() => {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Código copiado al portapapeles');
    });
}

// ==================== FUNCIONES UTILITARIAS ====================

// Formatear fecha
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ==================== INICIALIZACIÓN ====================

// Verificar estado de autenticación
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Si estamos en el dashboard, cargar datos
        if (window.location.pathname.includes('dashboard.html')) {
            await loadDashboard();
        }
    } else {
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