const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🚀 RESOLVIENDO BLOQUEO EN "VERIFICANDO SESIÓN..."');
console.log('====================================================\n');

// 1. REPARAR use-user.tsx (CON BACKUP .bak)
const useUserPath = path.join(ROOT, 'src/firebase/auth/use-user.tsx');
const useUserBackup = path.join(ROOT, 'src/firebase/auth/use-user.tsx.bak');

if (fs.existsSync(useUserPath)) {
  fs.copyFileSync(useUserPath, useUserBackup);
  console.log('📦 Respaldo creado: src/firebase/auth/use-user.tsx.bak');

  let code = fs.readFileSync(useUserPath, 'utf8');

  // Asegurar que si el usuario ya está en /login y hay user, redirija inmediatamente
  // sin esperar indefinidamente el snapshot de Firestore
  const oldRedir = `if (profile) {\n        const isAdmin = profile.role === 'super_admin';`;
  const fastRedir = `// Fast-path: Si hay usuario y estamos en página de auth, deducir rol por email inmediatamente
    const userEmail = authState.user?.email?.toLowerCase().trim() || '';
    const isDirectAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);

    if (authState.user && isAuthPage && !isRedirecting.current) {
        isRedirecting.current = true;
        router.replace(isDirectAdmin ? '/superadmin' : '/dashboard');
        return;
    }

    if (profile) {
        const isAdmin = profile.role === 'super_admin';`;

  if (code.includes(oldRedir) && !code.includes('Fast-path: Si hay usuario')) {
    code = code.replace(oldRedir, fastRedir);
    console.log('✅ Redirección inmediata (Fast-path) inyectada en use-user.tsx');
  }

  // Timeout de seguridad en onAuthStateChanged
  const oldListener = `const unsubscribe = onAuthStateChanged(auth, (user) => {`;
  const timeoutGuard = `// Timeout preventivo de seguridad: desbloquear tras 2.5s si Firebase no responde
    const authTimeout = setTimeout(() => {
      setAuthState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev);
      setProfileLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(authTimeout);`;

  if (code.includes(oldListener) && !code.includes('authTimeout')) {
    code = code.replace(oldListener, timeoutGuard);
    console.log('✅ Timeout de seguridad (2.5s) inyectado para evitar bloqueo indefinido.');
  }

  fs.writeFileSync(useUserPath, code, 'utf8');
}

// 2. REPARAR login/page.tsx (CON BACKUP .bak)
const loginPath = path.join(ROOT, 'src/app/(auth)/login/page.tsx');
const loginBackup = path.join(ROOT, 'src/app/(auth)/login/page.tsx.bak');

if (fs.existsSync(loginPath)) {
  fs.copyFileSync(loginPath, loginBackup);
  console.log('📦 Respaldo creado: src/app/(auth)/login/page.tsx.bak');

  let loginCode = fs.readFileSync(loginPath, 'utf8');

  // Agregar timeout local para que el loader de login no se congele
  if (!loginCode.includes('fallbackTimeout')) {
    const hookMarker = 'const [isSubmitting, setIsSubmitting] = useState(false);';
    if (loginCode.includes(hookMarker)) {
      loginCode = loginCode.replace(
        hookMarker,
        `${hookMarker}\n  const [forceShowForm, setForceShowForm] = useState(false);\n\n  useEffect(() => {\n    const timer = setTimeout(() => setForceShowForm(true), 2500);\n    return () => clearTimeout(timer);\n  }, []);`
      );
      console.log('✅ Guard local de tiempo máximo (2.5s) agregado a LoginPage.');
    }

    const loaderMarker = 'if (user || isUserLoading) {';
    if (loginCode.includes(loaderMarker)) {
      loginCode = loginCode.replace(
        loaderMarker,
        `if (!forceShowForm && (user || isUserLoading)) {`
      );
      console.log('✅ Condición de loader actualizada con bypass automático.');
    }

    fs.writeFileSync(loginPath, loginCode, 'utf8');
  }
}

console.log('\n✅ Corrección aplicada con éxito.');
