// Script de debug para probar inversiones
async function debugInvestmentCreation() {
    if (!currentUser) {
        console.log('No hay usuario autenticado');
        return;
    }
    
    console.log('=== DEBUG: Información del Usuario ===');
    console.log('UID:', currentUser.uid);
    console.log('Phone:', currentUser.phoneNumber);
    console.log('User Data:', userData);
    
    console.log('=== DEBUG: Probando Creación de Inversión ===');
    
    try {
        const today = new Date();
        const withdrawalDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const testInvestment = {
            uid: currentUser.uid,
            telefono: currentUser.phoneNumber,
            monto: 15000,
            fechaInversion: firebase.firestore.Timestamp.fromDate(today),
            fechaDisponibleRetiro: firebase.firestore.Timestamp.fromDate(withdrawalDate),
            estado: 'activa',
            fechaCreacion: firebase.firestore.Timestamp.fromDate(new Date()),
            userId: currentUser.uid,
            debug: true
        };
        
        console.log('Creando inversión de prueba:', testInvestment);
        
        const docRef = await db.collection('inversiones').add(testInvestment);
        console.log('✅ Inversión creada con ID:', docRef.id);
        
        // Verificar que se puede leer
        const doc = await db.collection('inversiones').doc(docRef.id).get();
        console.log('✅ Inversión leída:', doc.data());
        
        // Probar consulta
        const query = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .where('estado', '==', 'activa')
            .get();
        
        console.log('✅ Consulta exitosa, inversiones encontradas:', query.size);
        
        query.forEach(doc => {
            console.log('Inversión encontrada:', doc.id, doc.data());
        });
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
    }
}

// Función para limpiar inversiones de prueba
async function cleanupTestInvestments() {
    if (!currentUser) {
        console.log('No hay usuario autenticado');
        return;
    }
    
    try {
        const query = await db.collection('inversiones')
            .where('uid', '==', currentUser.uid)
            .where('debug', '==', true)
            .get();
        
        console.log('Limpiando', query.size, 'inversiones de prueba');
        
        query.forEach(async (doc) => {
            await doc.ref.delete();
            console.log('Eliminada inversión:', doc.id);
        });
        
        console.log('✅ Limpieza completada');
        
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
    }
}

// Agregar funciones al objeto window para acceso desde consola
window.debugInvestmentCreation = debugInvestmentCreation;
window.cleanupTestInvestments = cleanupTestInvestments; 