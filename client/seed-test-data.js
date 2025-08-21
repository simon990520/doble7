// Seeder de datos de prueba para inversiones, ganancias y retiros
// Al abrir este archivo desde una página HTML, creará 10 inversiones
// para el usuario objetivo con diferentes fechas y estados.

(async function seed() {
  const TARGET_UID = 'OJrpihUpovbrZlL1NRBDNk97By93';

  // Evitar doble inicialización
  if (!firebase.apps || firebase.apps.length === 0) {
    const firebaseConfig = {
      apiKey: 'AIzaSyCuMO-khLd132Cz4nouEnoSB_VyhxkNpPU',
      authDomain: 'boble7-7191a.firebaseapp.com',
      databaseURL: 'https://boble7-7191a-default-rtdb.firebaseio.com',
      projectId: 'boble7-7191a',
      storageBucket: 'boble7-7191a.firebasestorage.app',
      messagingSenderId: '844244773440',
      appId: '1:844244773440:web:32046d1f7298675383cda5',
      measurementId: 'G-06ENVMBNDW'
    };
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();

  // Crear/asegurar el documento del usuario para que las vistas de admin funcionen
  async function ensureUserDoc() {
    const userRef = db.collection('users').doc(TARGET_UID);
    const snap = await userRef.get();
    const baseUser = {
      uid: TARGET_UID,
      telefono: '+57 3000000000',
      referidosActivos: 5, // suficiente para permitir retiros en pruebas
      miCodigo: 'TEST123',
      fechaCreacion: firebase.firestore.Timestamp.fromDate(new Date())
    };
    if (!snap.exists) {
      await userRef.set(baseUser);
      console.log('✅ Usuario de prueba creado');
    } else {
      await userRef.update(baseUser);
      console.log('✅ Usuario de prueba actualizado');
    }
  }

  function planFromAmount(monto) {
    if (monto >= 1000000) return { tipo: 'elite', nombre: 'Plan Élite' };
    if (monto === 500000) return { tipo: 'premium', nombre: 'Plan Premium' };
    if (monto === 250000) return { tipo: 'avanzado', nombre: 'Plan Avanzado' };
    if (monto === 100000) return { tipo: 'progreso', nombre: 'Plan Progreso' };
    if (monto === 50000) return { tipo: 'inicial', nombre: 'Plan Inicial' };
    if (monto === 30000) return { tipo: 'basico', nombre: 'Plan Básico' };
    return { tipo: 'basico', nombre: 'Plan Básico' };
  }

  function ts(date) {
    return firebase.firestore.Timestamp.fromDate(date);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Crea una inversión consistente con el esquema del proyecto
  function buildInvestment({ monto, daysAgo, estado = 'activa', withProof = true, markWithdrawal = false }) {
    const today = new Date();
    const fechaInversion = addDays(today, -Math.abs(daysAgo));
    const fechaDisponibleRetiro = addDays(fechaInversion, 7);
    const { tipo, nombre } = planFromAmount(monto);

    const inv = {
      uid: TARGET_UID,
      monto,
      planTipo: tipo,
      planNombre: nombre,
      fechaInversion: ts(fechaInversion),
      fechaDisponibleRetiro: ts(fechaDisponibleRetiro),
      estado, // 'pendiente' | 'activa' | 'retirada' | 'rechazada' | 'reinvertida'
      fechaCreacion: ts(new Date())
    };

    if (withProof) {
      inv.comprobanteCargado = true;
      inv.fechaComprobante = ts(new Date());
      inv.comprobanteURL = 'https://via.placeholder.com/600x300.png?text=Comprobante+Prueba';
    }

    if (markWithdrawal && estado === 'activa' && fechaDisponibleRetiro <= today) {
      // Marcar como que ya solicitó retiro para probar flujo admin
      inv.solicitudRetiro = true;
      inv.fechaSolicitudRetiro = ts(new Date());
    }

    if (estado === 'retirada') {
      inv.fechaRetiro = ts(addDays(today, -1));
    }

    return inv;
  }

  async function seedInvestments() {
    const specs = [
      // días en el pasado y estados variados
      { monto: 30000, daysAgo: 14, estado: 'activa', markWithdrawal: true }, // elegible retiro
      { monto: 50000, daysAgo: 10, estado: 'activa', markWithdrawal: true }, // elegible retiro
      { monto: 100000, daysAgo: 8, estado: 'activa', markWithdrawal: true }, // elegible retiro
      { monto: 250000, daysAgo: 6, estado: 'activa' },
      { monto: 500000, daysAgo: 5, estado: 'activa' },
      { monto: 1000000, daysAgo: 4, estado: 'activa' },
      { monto: 100000, daysAgo: 3, estado: 'pendiente' },
      { monto: 50000, daysAgo: 1, estado: 'pendiente' },
      { monto: 30000, daysAgo: 0, estado: 'pendiente' },
      { monto: 500000, daysAgo: 20, estado: 'retirada' },
      { monto: 30000, daysAgo: 15, estado: 'reinvertida' }
    ];

    const batchAdds = specs.map(spec => db.collection('inversiones').add(buildInvestment(spec)));
    const results = await Promise.all(batchAdds);
    console.log(`✅ ${results.length} inversiones de prueba creadas`);
  }

  try {
    console.log('⏳ Sembrando datos de prueba para UID:', TARGET_UID);
    await ensureUserDoc();
    await seedInvestments();
    console.log('🎉 Datos de prueba listos');
  } catch (err) {
    console.error('❌ Error sembrando datos:', err);
  }
})();

