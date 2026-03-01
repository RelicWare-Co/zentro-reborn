import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const inputBase =
  'pl-10 h-11 bg-transparent border-gray-800 text-white placeholder:text-gray-600 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 rounded-xl'

function LoginForm() {
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setErrorMsg(null)

    const { error } = await authClient.signIn.email({
      email,
      password,
    })

    setIsPending(false)

    if (error) {
      setErrorMsg(error.message || 'Credenciales inválidas')
    } else {
      navigate({ to: '/products' })
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleLogin}>
      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-xs font-semibold text-gray-200">
          Correo electrónico <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="tu@email.com"
            className={inputBase}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId} className="text-xs font-semibold text-gray-200">
            Contraseña <span className="text-red-500">*</span>
          </Label>
          <Link
            to="/"
            className="text-xs text-[var(--color-voltage)] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            placeholder="••••••••"
            className={`${inputBase} pr-10`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="text-red-500 text-sm font-medium mt-2">{errorMsg}</div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold text-[15px] rounded-xl transition-all"
      >
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden')
      return
    }

    setIsPending(true)

    const { error } = await authClient.signUp.email({
      email,
      password,
      name: name.trim() || email.split('@')[0],
    })

    setIsPending(false)

    if (error) {
      setErrorMsg(error.message || 'Error al crear la cuenta')
    } else {
      setSuccessMsg('¡Cuenta creada! Redirigiendo...')
      navigate({ to: '/products' })
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleRegister}>
      <div className="space-y-2">
        <Label htmlFor={nameId} className="text-xs font-semibold text-gray-200">
          Nombre
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <User className="h-4 w-4" />
          </div>
          <Input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            placeholder="Tu nombre"
            className={inputBase}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-xs font-semibold text-gray-200">
          Correo electrónico <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="tu@email.com"
            className={inputBase}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-xs font-semibold text-gray-200">
          Contraseña <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            placeholder="••••••••"
            className={`${inputBase} pr-10`}
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor={confirmId}
          className="text-xs font-semibold text-gray-200"
        >
          Confirmar contraseña <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id={confirmId}
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
            placeholder="••••••••"
            className={`${inputBase} pr-10`}
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isPending}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`text-sm font-medium mt-2 ${errorMsg ? 'text-red-500' : 'text-green-400'}`}
        >
          {errorMsg || successMsg}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold text-[15px] rounded-xl transition-all"
      >
        {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
    </form>
  )
}

function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-void)] text-[var(--color-photon)]">
      {/* Left Column */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-[var(--color-carbon)] relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <h1 className="text-6xl font-bold tracking-tight text-[var(--color-voltage)] mb-6">
            Zentro
          </h1>
          <p className="text-xl text-gray-400 max-w-md">
            El sistema POS más inteligente para tu negocio
          </p>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 md:p-16 lg:p-24 relative">
        <div className="w-full max-w-[440px] space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}{' '}
              <span className="text-[var(--color-voltage)]">Zentro™</span>
            </h2>
            <p className="text-sm text-gray-400">
              {mode === 'login'
                ? 'Ingresa tus credenciales para acceder'
                : 'Regístrate para empezar a vender más'}
            </p>
          </div>

          <div className="w-full flex bg-gray-900/50 border border-gray-800 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-[var(--color-voltage)] text-black shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-[var(--color-voltage)] text-black shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              Registrarse
            </button>
          </div>

          <div className="mt-0">
            {mode === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        {/* Footer Text */}
        <div className="absolute bottom-8 left-0 w-full flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
          <p>2025 Zentro POS System Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-gray-300 transition-colors">
              Privacidad
            </Link>
            <Link to="/" className="hover:text-gray-300 transition-colors">
              Términos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
