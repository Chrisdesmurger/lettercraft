'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { AnimatePresence, motion } from 'framer-motion'
import Progress from './Progress'
import Step1, { Step1Data } from './Step1'
import Step2, { Step2Data } from './Step2'
import Step3, { Step3Data } from './Step3'

interface Data extends Step1Data, Step2Data {}

const STORAGE_KEY = 'onboarding'

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Data>({ firstName: '', email: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
    })
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      setStep(parsed.step || 0)
      setData(parsed.data || { firstName: '', email: '' })
    }
  }, [router])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }))
  }, [step, data])

  const nextStep = (values: Partial<Data>) => {
    setData((d) => ({ ...d, ...values }))
    setStep((s) => Math.min(2, s + 1))
  }

  const prevStep = () => setStep((s) => Math.max(0, s - 1))

  const finish = async () => {
    localStorage.removeItem(STORAGE_KEY)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('users').update({ onboarded: true }).eq('id', session.user.id)
    }
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <Progress current={step} total={3} />
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Step1
              defaultValues={{ firstName: data.firstName, email: data.email }}
              onNext={(v) => nextStep(v)}
            />
          </motion.div>
        )}
        {step === 1 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Step2
              defaultValues={{ newsletter: data.newsletter, tips: data.tips }}
              onNext={(v) => nextStep(v)}
              onBack={prevStep}
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Step3 data={data as Step3Data} onBack={prevStep} onFinish={finish} />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-4 text-sm text-gray-500 underline"
      >
        Ignorer l'onboarding
      </button>
    </div>
  )
}
