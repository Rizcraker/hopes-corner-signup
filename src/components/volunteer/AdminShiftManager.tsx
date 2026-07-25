import type { Shift } from '../../types/shift'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect } from 'react'

interface AdminShiftManagerProps {
  shifts: Shift[]
  setShifts: (shifts: Shift[]) => void
  loading: boolean
  fetchShifts: () => Promise<void>
  handleRefreshShifts: () => void
  isRefreshSpinning: boolean
}

export default function AdminShiftManager({
  shifts,
  setShifts,
  loading,
  fetchShifts,
  handleRefreshShifts,
  isRefreshSpinning,
}: AdminShiftManagerProps) {
  const [newShift, setNewShift] = useState<Partial<Shift>>({
    title: '',
    description: '',
    shift_start: '',
    shift_end: '',
    location: '',
    requirements: '',
    spots_left: 0,
  })
  const [editShiftId, setEditShiftId] = useState<number | null>(null)
  const [editShift, setEditShift] = useState<Partial<Shift>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16) // For datetime-local input
  }

  const handleNewShiftChange = (field: keyof Partial<Shift>, value: string | number) => {
    setNewShift(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleEditShiftChange = (field: keyof Partial<Shift>, value: string | number) => {
    setEditShift(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('shifts')
        .insert({
          title: newShift.title,
          description: newShift.description,
          shift_start: newShift.shift_start,
          shift_end: newShift.shift_end,
          location: newShift.location,
          requirements: newShift.requirements,
          spots_left: newShift.spots_left,
        })

      if (error) throw error

      setSuccessMessage('Shift created successfully!')
      // Reset form
      setNewShift({
        title: '',
        description: '',
        shift_start: '',
        shift_end: '',
        location: '',
        requirements: '',
        spots_left: 0,
      })
      // Refetch shifts
      await fetchShifts()
    } catch (err) {
      console.error('Error creating shift:', err)
      setError('Failed to create shift. Please try again.')
    }
  }

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editShiftId) return

    setError(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          title: editShift.title,
          description: editShift.description,
          shift_start: editShift.shift_start,
          shift_end: editShift.shift_end,
          location: editShift.location,
          requirements: editShift.requirements,
          spots_left: editShift.spots_left,
        })
        .eq('id', editShiftId)

      if (error) throw error

      setSuccessMessage('Shift updated successfully!')
      setEditShiftId(null)
      // Refetch shifts
      await fetchShifts()
    } catch (err) {
      console.error('Error updating shift:', err)
      setError('Failed to update shift. Please try again.')
    }
  }

  const handleDeleteShift = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Shift deleted successfully!')
      // Refetch shifts
      await fetchShifts()
    } catch (err) {
      console.error('Error deleting shift:', err)
      setError('Failed to delete shift. Please try again.')
    }
  }

  const handleEditClick = async (id: number) => {
    setLoadingEdit(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setEditShift(data)
      setEditShiftId(id)
    } catch (err) {
      console.error('Error fetching shift for edit:', err)
      setError('Failed to load shift for editing. Please try again.')
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <div className="admin-shift-manager">
      <h3>Manage Shifts</h3>

      {/* Error and Success Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* New Shift Form */}
      <div className="shift-form">
        <h4>Add New Shift</h4>
        <form onSubmit={handleCreateShift}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={newShift.title || ''}
              onChange={(e) => handleNewShiftChange('title', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newShift.description || ''}
              onChange={(e) => handleNewShiftChange('description', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Start Time:</label>
            <input
              type="datetime-local"
              value={newShift.shift_start ? formatDateForInput(newShift.shift_start) : ''}
              onChange={(e) => handleNewShiftChange('shift_start', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>End Time:</label>
            <input
              type="datetime-local"
              value={newShift.shift_end ? formatDateForInput(newShift.shift_end) : ''}
              onChange={(e) => handleNewShiftChange('shift_end', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              value={newShift.location || ''}
              onChange={(e) => handleNewShiftChange('location', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Requirements:</label>
            <input
              type="text"
              value={newShift.requirements || ''}
              onChange={(e) => handleNewShiftChange('requirements', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Spots Left:</label>
            <input
              type="number"
              value={newShift.spots_left || 0}
              onChange={(e) => handleNewShiftChange('spots_left', Number(e.target.value) || 0)}
              min="0"
            />
          </div>
          <button type="submit" className="btn-primary">Create Shift</button>
          <button
            type="button"
            onClick={() => {
              setNewShift({
                title: '',
                description: '',
                shift_start: '',
                shift_end: '',
                location: '',
                requirements: '',
                spots_left: 0,
              })
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </form>
      </div>

      {/* Shifts List */}
      <div className="shifts-list">
        <h4>Existing Shifts ({shifts.length})</h4>
        {loading ? (
          <p>Loading shifts...</p>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="shift-card">
              {editShiftId === shift.id ? (
                // Edit Form
                <div className="edit-shift-form">
                  <h4>Edit Shift</h4>
                  <form onSubmit={handleUpdateShift}>
                    <div className="form-group">
                      <label>Title:</label>
                      <input
                        type="text"
                        value={editShift.title || ''}
                        onChange={(e) => handleEditShiftChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <textarea
                        value={editShift.description || ''}
                        onChange={(e) => handleEditShiftChange('description', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Start Time:</label>
                      <input
                        type="datetime-local"
                        value={editShift.shift_start ? formatDateForInput(editShift.shift_start) : ''}
                        onChange={(e) => handleEditShiftChange('shift_start', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Time:</label>
                      <input
                        type="datetime-local"
                        value={editShift.shift_end ? formatDateForInput(editShift.shift_end) : ''}
                        onChange={(e) => handleEditShiftChange('shift_end', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Location:</label>
                      <input
                        type="text"
                        value={editShift.location || ''}
                        onChange={(e) => handleEditShiftChange('location', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Requirements:</label>
                      <input
                        type="text"
                        value={editShift.requirements || ''}
                        onChange={(e) => handleEditShiftChange('requirements', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Spots Left:</label>
                      <input
                        type="number"
                        value={editShift.spots_left ?? 0}
                        onChange={(e) => handleEditShiftChange('spots_left', Number(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <button type="submit" className="btn-primary">Update Shift</button>
                    <button
                      type="button"
                      onClick={() => setEditShiftId(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              ) : (
                // Shift Details
                <div className="shift-details">
                  <div className="shift-info">
                    <strong>{shift.role}</strong>
                    <p>{shift.time}</p>
                    <p>{shift.location}</p>
                    <p>{shift.description}</p>
                    <p><em>Requirements:</em> {shift.requirements}</p>
                    <p><em>Spots Left:</em> {shift.spotsLeft}</p>
                  </div>
                  <div className="shift-actions">
                    <button
                      onClick={() => handleEditClick(shift.id)}
                      className="btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}