'use client'

import { Header } from '@/components/dashboard/header'
import { TaskList } from '@/components/dashboard/task-list'

export default function MyTasksPage() {
  return (
    <div className="space-y-6 p-6">
      <Header title="Görevlerim" description="Size atanan görevler" />
      <TaskList />
    </div>
  )
}
