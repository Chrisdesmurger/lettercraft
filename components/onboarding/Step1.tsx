'use client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  firstName: z.string().min(1, 'Pr\u00e9nom requis'),
  email: z.string().email('Email invalide'),
})
export type Step1Data = z.infer<typeof schema>

interface Props {
  defaultValues: Step1Data
  onNext: (data: Step1Data) => void
}

export default function Step1({ defaultValues, onNext }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Pr\u00e9nom</label>
        <input
          type="text"
          {...register('firstName')}
          className="w-full border rounded px-3 py-2"
        />
        {errors.firstName && (
          <p className="text-red-500 text-sm">{errors.firstName.message}</p>
        )}
      </div>
      <div>
        <label className="block mb-1 font-medium">Email</label>
        <input
          type="email"
          {...register('email')}
          className="w-full border rounded px-3 py-2"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded"
      >
        Suivant
      </button>
    </form>
  )
}
