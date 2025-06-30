import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from './useUser'
import type { FlowState } from '@/types'

const STORAGE_KEY = 'letter_creation_flow'

export function useLetterFlow() {
    const router = useRouter()
    const { user } = useUser()
    const [flowState, setFlowState] = useState<FlowState>({
        currentStep: 0,
        completedSteps: [],
        data: {}
    })

    // Charger l'état depuis le localStorage
    useEffect(() => {
        const savedState = localStorage.getItem(STORAGE_KEY)
        if (savedState) {
            try {
                setFlowState(JSON.parse(savedState))
            } catch (error) {
                console.error('Erreur lors du chargement de l\'état:', error)
            }
        }
    }, [])

    // Sauvegarder l'état dans le localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flowState))
    }, [flowState])

    const updateStep = useCallback((step: number) => {
        setFlowState(prev => ({
            ...prev,
            currentStep: step
        }))
    }, [])

    const completeStep = useCallback((step: number) => {
        setFlowState(prev => ({
            ...prev,
            completedSteps: [...new Set([...prev.completedSteps, step])]
        }))
    }, [])

    const updateData = useCallback((key: string, data: any) => {
        setFlowState(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [key]: data
            }
        }))
    }, [])

    const resetFlow = useCallback(() => {
        setFlowState({
            currentStep: 0,
            completedSteps: [],
            data: {}
        })
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    const canNavigateToStep = useCallback((targetStep: number) => {
        if (targetStep === 0) return true
        return flowState.completedSteps.includes(targetStep - 1)
    }, [flowState.completedSteps])

    return {
        ...flowState,
        updateStep,
        completeStep,
        updateData,
        resetFlow,
        canNavigateToStep,
        isAuthenticated: !!user
    }
}