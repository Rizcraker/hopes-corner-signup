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

// Type for our shift form state (matches database columns)
interface ShiftFormState {
  title: string
  description: string
  shift_start: string
  shift_end: string
  location: string
  requirements: string
  spots_left: number
}

export default function AdminShiftManager({
  shifts,
  setShifts,
  loading,
  fetchShifts,
  handleRefreshShifts,
  isRefreshSpinning,
}: AdminShiftManagerProps) {
  // Form state for new shift - using database column names for direct Supabase mapping
  const [newShift, setNewShift] = useState<ShiftFormState>({
    title: '',
    description: '',
    shift_start: '',
    shift_end: '',
    location: '',
    requirements: '',
    spots_left: 0,
  })

  // Edit state
  const [editShiftId, setEditShiftId] = useState<number | null>(null)
  const [editShift, setEditShift] = useState<ShiftFormState | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Helper to format date for datetime-local input
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16) // For datetime-local input
  }

  const handleNewShiftChange = (field: keyof ShiftFormState, value: string | number) => {
    setNewShift(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEditShiftChange = (field: keyof ShiftFormState, value: string | number) => {
    if (!editShift) return
    setEditShift(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [field]: value
      }
    })
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
    if (!editShiftId || !editShift) return

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
      setEditShift(null)
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
      // Fetch the complete shift record from database to get exact shift_start/shift_end
      const { data, error } = await supabase
        .from('shifts')
        .select('id, title, description, shift_start, shift_end, location, requirements, spots_left')
        .eq('id', id)
        .single()

      if (error) throw error

      // Convert database format to form state
      setEditShift({
        title: data.title,
        description: data.description,
        shift_start: data.shift_start,
        shift_end: data.shift_end,
        location: data.location,
        requirements: data.requirements,
        spots_left: data.spots_left ?? 0,
      })
      setEditShiftId(id)
    } catch (err) {
      console.error('Error fetching shift for edit:', err)
      setError('Failed to load shift for editing. Please try again.')
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <div className="admin-shift-manager" style={{ maxWidth: '800px' }}>
      <h3 style={{ marginBottom: '1rem' }}>Manage Shifts</h3>

      {/* Error and Success Messages */}
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem' }}>{error}</div>}
      {successMessage && <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem' }}>{successMessage}</div>}

      {/* New Shift Form */}
      <div className="shift-form" style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Add New Shift</h4>
        <form onSubmit={handleCreateShift} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Title:</label>
            <input
              type="text"
              value={newShift.title || ''}
              onChange={(e) => handleNewShiftChange('title', e.target.value)}
              required
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Description:</label>
            <textarea
              value={newShift.description || ''}
              onChange={(e) => handleNewShiftChange('description', e.target.value)}
              rows={2}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Start Time:</label>
            <input
              type="datetime-local"
              value={newShift.shift_start ? formatDateForInput(newShift.shift_start) : ''}
              onChange={(e) => handleNewShiftChange('shift_start', e.target.value)}
              required
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>End Time:</label>
            <input
              type="datetime-local"
              value={newShift.shift_end ? formatDateForInput(newShift.shift_end) : ''}
              onChange={(e) => handleNewShiftChange('shift_end', e.target.value)}
              required
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Location:</label>
            <input
              type="text"
              value={newShift.location || ''}
              onChange={(e) => handleNewShiftChange('location', e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Requirements:</label>
            <input
              type="text"
              value={newShift.requirements || ''}
              onChange={(e) => handleNewShiftChange('requirements', e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Spots Left:</label>
            <input
              type="number"
              value={newShift.spots_left || 0}
              onChange={(e) => handleNewShiftChange('spots_left', Number(e.target.value) || 0)}
              min="0"
              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', width: '80px' }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
            <button type="submit" style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#22634d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Create Shift
            </button>
          </div>
        </form>
      </div>

      {/* Shifts List */}
      <div className="shifts-list">
        <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Existing Shifts ({shifts.length})</h4>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Loading shifts...</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {shifts.map((shift) => (
              <div key={shift.id} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {editShiftId === shift.id ? (
                  // Edit Form
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Edit Shift</h4>
                    <form onSubmit={handleUpdateShift} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      {editShift ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Title:</label>
                            <input
                              type="text"
                              value={editShift.title || ''}
                              onChange={(e) => handleEditShiftChange('title', e.target.value)}
                              required
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Description:</label>
                            <textarea
                              value={editShift.description || ''}
                              onChange={(e) => handleEditShiftChange('description', e.target.value)}
                              rows={2}
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Start Time:</label>
                            <input
                              type="datetime-local"
                              value={editShift.shift_start ? formatDateForInput(editShift.shift_start) : ''}
                              onChange={(e) => handleEditShiftChange('shift_start', e.target.value)}
                              required
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>End Time:</label>
                            <input
                              type="datetime-local"
                              value={editShift.shift_end ? formatDateForInput(editShift.shift_end) : ''}
                              onChange={(e) => handleEditShiftChange('shift_end', e.target.value)}
                              required
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Location:</label>
                            <input
                              type="text"
                              value={editShift.location || ''}
                              onChange={(e) => handleEditShiftChange('location', e.target.value)}
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Requirements:</label>
                            <input
                              type="text"
                              value={editShift.requirements || ''}
                              onChange={(e) => handleEditShiftChange('requirements', e.target.value)}
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Spots Left:</label>
                            <input
                              type="number"
                              value={editShift.spots_left ?? 0}
                              onChange={(e) => handleEditShiftChange('spots_left', Number(e.target.value) || 0)}
                              min="0"
                              style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', width: '80px' }}
                            />
                          </div>
                        </>
                      ) : (
                        // Fallback while loading edit data
                        <div>
                          <p>Loading shift data for editing...</p>
                        </div>
                      )}
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditShiftId(null)
                            setEditShift(null)
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" style={{
                          padding: '0.5rem 1.5rem',
                          backgroundColor: '#22634d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}>
                          Update Shift
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  // Shift Details
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#22634d' }}>{shift.role}</h4>
                        <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>{shift.time}</p>
                        <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>{shift.location}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEditClick(shift.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ffebee',
                            color: '#c0392b',
                            border: '1px solid #f5c6cb',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '0.5rem 0', fontWeight: '600' }}><em>Requirements:</em> {shift.requirements}</p>
                    <p style={{ margin: '0.5rem 0', fontWeight: '600' }}><em>Spots Left:</em> {shift.spotsLeft}</p>
                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>{shift.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}