import { AlertCircle, Building2, Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function OrganizationSelection() {
  const { data: organizations, isPending: isListPending, refetch } = authClient.useListOrganizations()
  const orgNameInputId = useId()
  const orgSlugInputId = useId()
  const [isCreating, setIsCreating] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [slugModified, setSlugModified] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSelectingId, setIsSelectingId] = useState<string | null>(null)

  useEffect(() => {
    void refetch()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refetch])

  const handleSelect = async (orgId: string) => {
    setIsSelectingId(orgId)
    await authClient.organization.setActive({ organizationId: orgId })
    setIsSelectingId(null)
  }

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters, numbers and hyphens
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setNewOrgSlug(value)
    setSlugModified(true)
  }, [])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setNewOrgName(newName)
    
    // Only auto-update the slug if it hasn't been manually modified by the user
    if (!slugModified) {
      setNewOrgSlug(newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
    }
  }, [slugModified])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      if (!newOrgName || !newOrgSlug) {
        setErrorMsg('Por favor completa todos los campos')
        setIsSubmitting(false)
        return
      }

      // Check if slug is taken
      const checkResult = await authClient.organization.checkSlug({ slug: newOrgSlug })
      
      if (checkResult?.error) {
        setErrorMsg(checkResult.error.message || 'Error al verificar el identificador.')
        setIsSubmitting(false)
        return
      }

      if (checkResult?.data?.status === false) {
        setErrorMsg('Este identificador (slug) ya está en uso. Por favor elige otro.')
        setIsSubmitting(false)
        return
      }

      const { data, error } = await authClient.organization.create({
        name: newOrgName,
        slug: newOrgSlug,
      })

      if (error) {
        setErrorMsg(error.message || 'Error al crear la organización')
      } else if (data) {
        await refetch()
        await authClient.organization.setActive({ organizationId: data.id })
      }
    } catch {
      setErrorMsg('Ocurrió un error inesperado')
    }

    setIsSubmitting(false)
  }

  if (isListPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-void)] text-[var(--color-photon)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-voltage)]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-void)] text-[var(--color-photon)] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Selecciona tu Organización
          </h2>
          <p className="text-gray-400">
            Elige un espacio de trabajo para continuar o crea uno nuevo
          </p>
        </div>

        {!isCreating ? (
          <div className="space-y-6">
            <div className="space-y-3">
              {organizations && organizations.length > 0 ? (
                organizations.map((org: { id: string; name: string; slug: string }) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    disabled={isSelectingId !== null}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[var(--color-carbon)] hover:border-[var(--color-voltage)]/50 hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] flex items-center justify-center group-hover:bg-[var(--color-voltage)]/20 transition-colors">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white">{org.name}</p>
                        <p className="text-sm text-gray-400">/{org.slug}</p>
                      </div>
                    </div>
                    {isSelectingId === org.id && (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--color-voltage)]" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center p-8 border border-dashed border-gray-800 rounded-xl bg-[var(--color-carbon)]/50">
                  <p className="text-gray-400 mb-2">No tienes ninguna organización aún</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              className="w-full h-12 border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 text-gray-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear nueva organización
            </Button>
          </div>
        ) : (
          <div className="bg-[var(--color-carbon)] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={orgNameInputId} className="text-xs font-semibold text-gray-200">
                    Nombre de la Organización
                  </Label>
                  <Input
                    id={orgNameInputId}
                    value={newOrgName}
                    onChange={handleNameChange}
                    placeholder="Ej. Mi Tienda"
                    className="bg-gray-900/50 border-gray-800"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={orgSlugInputId} className="text-xs font-semibold text-gray-200">
                    Identificador (Slug)
                  </Label>
                  <Input
                    id={orgSlugInputId}
                    value={newOrgSlug}
                    onChange={handleSlugChange}
                    placeholder="ej-mi-tienda"
                    className="bg-gray-900/50 border-gray-800"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500">
                    Este será el identificador único para tu organización.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false)
                      setErrorMsg(null)
                      setNewOrgName('')
                      setNewOrgSlug('')
                      setSlugModified(false)
                    }}
                    className="flex-1 border-gray-800 hover:bg-gray-800 hover:text-white"
                    disabled={isSubmitting}
                  >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[var(--color-voltage)] hover:bg-[#c9e605] text-black font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear y Continuar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
