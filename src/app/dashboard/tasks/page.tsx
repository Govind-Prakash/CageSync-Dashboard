'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Edit3,
  Trash2,
  Users,
  Settings,
  SortDesc
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  type: 'protocol' | 'maintenance' | 'compliance' | 'manual'
  source: 'auto' | 'manual' | 'system'
  priority: 'critical' | 'high' | 'normal' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  dueDate: string
  assignee?: string
  cage?: string
  animal?: string
  protocol?: string
  createdAt: string
  completedAt?: string
}

const taskCategories = {
  protocol: {
    color: '#25A882',
    bgColor: '#E8F5F1',
    label: 'Protocol',
    icon: '🧪'
  },
  maintenance: {
    color: '#F5A623',
    bgColor: '#FEF3D8',
    label: 'Maintenance',
    icon: '🔧'
  },
  compliance: {
    color: '#E53E3E',
    bgColor: '#FCEBEB',
    label: 'Compliance',
    icon: '📋'
  },
  manual: {
    color: '#1A7F64',
    bgColor: '#E8F5F1',
    label: 'Manual',
    icon: '📝'
  }
}

const priorityColors = {
  critical: '#E53E3E',
  high: '#F5A623',
  normal: '#1A7F64',
  low: '#6B7280'
}

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Cage change - Room A, Cages 15-20',
    description: 'Weekly cage change protocol for breeding colony',
    type: 'maintenance',
    source: 'auto',
    priority: 'high',
    status: 'pending',
    dueDate: '2026-05-28',
    assignee: 'John Doe',
    protocol: 'MAINT-001',
    createdAt: '2026-05-26'
  },
  {
    id: '2',
    title: 'Wean litter - Cage A-107',
    description: 'Pups ready for weaning at 21 days',
    type: 'protocol',
    source: 'auto',
    priority: 'critical',
    status: 'overdue',
    dueDate: '2026-05-26',
    assignee: 'Sarah Miller',
    cage: 'A-107',
    protocol: 'BR-2024-003',
    createdAt: '2026-05-20'
  },
  {
    id: '3',
    title: 'IACUC protocol renewal - BR-2024-003',
    description: 'Annual renewal due for breeding protocol',
    type: 'compliance',
    source: 'system',
    priority: 'high',
    status: 'pending',
    dueDate: '2026-06-01',
    assignee: 'Dr. Johnson',
    protocol: 'BR-2024-003',
    createdAt: '2026-05-15'
  },
  {
    id: '4',
    title: 'Review experiment data - Study ABC',
    description: 'Analyze behavioral test results',
    type: 'manual',
    source: 'manual',
    priority: 'normal',
    status: 'in_progress',
    dueDate: '2026-05-30',
    assignee: 'Emily Chen',
    createdAt: '2026-05-25'
  },
  {
    id: '5',
    title: 'Weight check - Experiment cohort B',
    description: 'Weekly weight monitoring',
    type: 'protocol',
    source: 'auto',
    priority: 'normal',
    status: 'completed',
    dueDate: '2026-05-25',
    assignee: 'John Doe',
    animal: 'Cohort B (15 mice)',
    protocol: 'EXP-2024-005',
    createdAt: '2026-05-20',
    completedAt: '2026-05-25'
  },
  {
    id: '6',
    title: 'Equipment calibration - Scale #3',
    description: 'Monthly calibration check',
    type: 'maintenance',
    source: 'auto',
    priority: 'normal',
    status: 'pending',
    dueDate: '2026-05-29',
    assignee: 'Mike Torres',
    createdAt: '2026-05-26'
  }
]

type FilterType = 'all' | 'overdue' | 'today' | 'week' | 'upcoming'
type TaskType = 'all' | 'protocol' | 'maintenance' | 'compliance' | 'manual'
type TaskSource = 'all' | 'auto' | 'manual' | 'system'
type TaskPriority = 'all' | 'critical' | 'high' | 'normal' | 'low'
type SortBy = 'dueDate' | 'priority' | 'created' | 'assignee'

export default function TasksPage() {
  const [tasks, setTasks] = useState(sampleTasks)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [typeFilter, setTypeFilter] = useState<TaskType>('all')
  const [sourceFilter, setSourceFilter] = useState<TaskSource>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>('all')
  const [sortBy, setSortBy] = useState<SortBy>('dueDate')
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filter tasks based on active filters
  const getFilteredTasks = () => {
    let filtered = tasks

    // Apply completion filter
    if (!showCompleted) {
      filtered = filtered.filter(task => task.status !== 'completed')
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.cage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.protocol?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply time filter
    if (activeFilter !== 'all') {
      const today = new Date('2026-05-26')
      const todayStr = today.toISOString().split('T')[0]

      filtered = filtered.filter(task => {
        const dueDate = new Date(task.dueDate)
        const dueDateStr = task.dueDate

        switch (activeFilter) {
          case 'overdue':
            return task.status === 'overdue' || (dueDate < today && task.status !== 'completed')
          case 'today':
            return dueDateStr === todayStr
          case 'week':
            const weekFromNow = new Date(today)
            weekFromNow.setDate(today.getDate() + 7)
            return dueDate >= today && dueDate <= weekFromNow
          case 'upcoming':
            return dueDate > today
          default:
            return true
        }
      })
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.type === typeFilter)
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(task => task.source === sourceFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'assignee':
          return (a.assignee || '').localeCompare(b.assignee || '')
        default:
          return 0
      }
    })

    return filtered
  }

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? {
            ...task,
            status: task.status === 'completed' ? 'pending' : 'completed',
            completedAt: task.status === 'completed' ? undefined : new Date().toISOString()
          }
        : task
    ))
  }

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const getDueDateDisplay = (dueDate: string, status: string) => {
    const due = new Date(dueDate)
    const today = new Date('2026-05-26')
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (status === 'overdue' || diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, color: '#E53E3E' }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: '#F5A623' }
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: '#F5A623' }
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: '#1A7F64' }
    } else {
      return { text: due.toLocaleDateString(), color: '#6B7280' }
    }
  }

  const filteredTasks = getFilteredTasks()
  const taskCounts = {
    all: tasks.filter(t => t.status !== 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    today: tasks.filter(t => t.dueDate === '2026-05-26' && t.status !== 'completed').length,
    week: tasks.filter(t => {
      const due = new Date(t.dueDate)
      const today = new Date('2026-05-26')
      const weekFromNow = new Date(today)
      weekFromNow.setDate(today.getDate() + 7)
      return due >= today && due <= weekFromNow && t.status !== 'completed'
    }).length,
    upcoming: tasks.filter(t => new Date(t.dueDate) > new Date('2026-05-26') && t.status !== 'completed').length
  }

  return (
    <div className="flex bg-surface" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Left Sidebar - Filters */}
      <div
        className="w-80 border-r flex flex-col bg-white"
        style={{ borderColor: '#E2E8F0' }}
      >
        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg font-body"
              style={{
                borderColor: '#E2E8F0',
                fontSize: '13px',
                color: '#1A1A2E'
              }}
            />
          </div>
        </div>

        {/* Time-based Filters */}
        <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h3 className="font-display font-medium mb-3" style={{ fontSize: '14px', color: '#1A1A2E' }}>
            Due Date
          </h3>
          {[
            { key: 'all', label: 'All Tasks', count: taskCounts.all },
            { key: 'overdue', label: 'Overdue', count: taskCounts.overdue },
            { key: 'today', label: 'Due Today', count: taskCounts.today },
            { key: 'week', label: 'This Week', count: taskCounts.week },
            { key: 'upcoming', label: 'Upcoming', count: taskCounts.upcoming }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as FilterType)}
              className={`w-full flex items-center justify-between p-2 rounded-md mb-1 transition-colors ${
                activeFilter === key ? 'bg-primary-surface text-primary' : 'hover:bg-gray-50 text-gray-600'
              }`}
              style={{
                backgroundColor: activeFilter === key ? '#E8F5F1' : 'transparent',
                color: activeFilter === key ? '#1A7F64' : '#6B7280'
              }}
            >
              <span className="font-body text-sm">{label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100" style={{ color: '#6B7280' }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Type Filters */}
        <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h3 className="font-display font-medium mb-3" style={{ fontSize: '14px', color: '#1A1A2E' }}>
            Task Type
          </h3>
          {[
            { key: 'all', label: 'All Types' },
            { key: 'protocol', label: 'Protocol' },
            { key: 'maintenance', label: 'Maintenance' },
            { key: 'compliance', label: 'Compliance' },
            { key: 'manual', label: 'Manual' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center mb-2 cursor-pointer group">
              <input
                type="radio"
                name="taskType"
                checked={typeFilter === key}
                onChange={() => setTypeFilter(key as TaskType)}
                className="sr-only"
              />
              <div
                className={`w-3 h-3 rounded-full border mr-3 transition-colors ${
                  typeFilter === key ? 'border-primary bg-primary' : 'border-gray-300'
                }`}
                style={{
                  borderColor: typeFilter === key ? '#1A7F64' : '#E2E8F0',
                  backgroundColor: typeFilter === key ? '#1A7F64' : 'transparent'
                }}
              />
              <span className="font-body text-sm group-hover:text-ink transition-colors" style={{ color: '#6B7280' }}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Show completed toggle */}
        <div className="p-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded border-2 mr-3 transition-colors ${
                showCompleted ? 'border-primary bg-primary' : 'border-gray-300'
              }`}
              style={{
                borderColor: showCompleted ? '#1A7F64' : '#E2E8F0',
                backgroundColor: showCompleted ? '#1A7F64' : 'transparent'
              }}
            >
              {showCompleted && (
                <CheckCircle2 className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="font-body text-sm" style={{ color: '#6B7280' }}>
              Show completed tasks
            </span>
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Action Bar */}
        <div
          className="h-16 px-6 border-b flex items-center justify-between bg-white"
          style={{ borderColor: '#E2E8F0' }}
        >
          {/* Left side - Task count and bulk actions */}
          <div className="flex items-center space-x-4">
            <span className="font-display font-medium" style={{ fontSize: '16px', color: '#1A1A2E' }}>
              {filteredTasks.length} tasks
            </span>
            {selectedTasks.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  {selectedTasks.length} selected
                </span>
                <button
                  className="px-3 py-1 text-xs rounded-md transition-colors"
                  style={{ backgroundColor: '#E8F5F1', color: '#1A7F64' }}
                >
                  Complete
                </button>
                <button
                  className="px-3 py-1 text-xs rounded-md transition-colors"
                  style={{ backgroundColor: '#FCEBEB', color: '#E53E3E' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-3">
            {/* Sort dropdown */}
            <div className="flex items-center space-x-2">
              <SortDesc className="w-4 h-4" style={{ color: '#6B7280' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-sm border rounded-md px-2 py-1"
                style={{ borderColor: '#E2E8F0', color: '#6B7280' }}
              >
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="created">Created</option>
                <option value="assignee">Assignee</option>
              </select>
            </div>

            {/* Add Task button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#1A7F64', color: 'white' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {filteredTasks.map((task) => {
              const category = taskCategories[task.type]
              const dueInfo = getDueDateDisplay(task.dueDate, task.status)

              return (
                <div
                  key={task.id}
                  className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow group"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <div className="flex items-start space-x-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.status === 'completed'
                          ? 'bg-primary border-primary'
                          : 'border-gray-300 hover:border-primary'
                      }`}
                      style={{
                        borderColor: task.status === 'completed' ? '#1A7F64' : '#E2E8F0',
                        backgroundColor: task.status === 'completed' ? '#1A7F64' : 'transparent'
                      }}
                    >
                      {task.status === 'completed' && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </button>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Title and priority */}
                          <div className="flex items-center space-x-3 mb-2">
                            <h3
                              className={`font-medium ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}
                              style={{ fontSize: '15px', color: '#1A1A2E' }}
                            >
                              {task.title}
                            </h3>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: priorityColors[task.priority] }}
                              title={`${task.priority} priority`}
                            />
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p
                              className={`mb-2 ${task.status === 'completed' ? 'opacity-60' : ''}`}
                              style={{ fontSize: '13px', color: '#6B7280' }}
                            >
                              {task.description}
                            </p>
                          )}

                          {/* Meta information */}
                          <div className="flex flex-wrap items-center space-x-4 text-xs" style={{ color: '#9CA3AF' }}>
                            <div className="flex items-center space-x-1">
                              <span
                                className="px-2 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: category.bgColor,
                                  color: category.color
                                }}
                              >
                                {category.icon} {category.label}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span style={{ color: dueInfo.color }}>{dueInfo.text}</span>
                            </div>

                            {task.assignee && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{task.assignee}</span>
                              </div>
                            )}

                            {task.cage && (
                              <div className="flex items-center space-x-1">
                                <span>🏠 {task.cage}</span>
                              </div>
                            )}

                            {task.animal && (
                              <div className="flex items-center space-x-1">
                                <span>🐭 {task.animal}</span>
                              </div>
                            )}

                            {task.protocol && (
                              <div className="flex items-center space-x-1">
                                <span>📋 {task.protocol}</span>
                              </div>
                            )}

                            {task.source === 'auto' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions menu */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                <h3 className="font-display font-medium mb-2" style={{ color: '#1A1A2E' }}>
                  No tasks found
                </h3>
                <p className="mb-4" style={{ color: '#6B7280' }}>
                  {searchQuery ? 'Try adjusting your search or filters' : 'All caught up! No tasks match your current filters.'}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: '#1A7F64', color: 'white' }}
                >
                  Create your first task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}