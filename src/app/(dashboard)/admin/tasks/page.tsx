'use client'

import { Header } from '@/components/dashboard/header'
import { TaskAssignmentForm } from '@/components/forms/task-assignment-form'

export default function TasksPage() {
  return (
    <div className="space-y-6 p-6">
      <Header title="Görevler" description="Temizlik görevlerini yönetin" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskAssignmentForm />
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Son Atanan Görevler</h3>
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-slate-400">Görev geçmişi yakında eklenecek...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
