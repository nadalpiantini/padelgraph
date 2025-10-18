/**
 * Fair-Play Panel Component
 * 
 * Admin panel for managing fair-play incidents in tournaments.
 * Allows admins to issue cards, violations, and positive conduct bonuses.
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  X, 
  Save,
  Clock
} from 'lucide-react';
import type { 
  FairPlayIncidentType,
  TournamentFairPlayWithProfile,
  CreateFairPlayIncidentRequest,
  TournamentParticipantWithProfile
} from '@/types/database';

interface FairPlayPanelProps {
  tournamentId: string;
  participants: TournamentParticipantWithProfile[];
}

const incidentTypes: { value: FairPlayIncidentType; label: string; color: string }[] = [
  { value: 'yellow_card', label: 'Tarjeta Amarilla', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'red_card', label: 'Tarjeta Roja', color: 'bg-red-100 text-red-800' },
  { value: 'code_violation', label: 'Violación de Código', color: 'bg-orange-100 text-orange-800' },
  { value: 'time_violation', label: 'Violación de Tiempo', color: 'bg-blue-100 text-blue-800' },
  { value: 'unsportsmanlike_conduct', label: 'Conducta Antideportiva', color: 'bg-purple-100 text-purple-800' },
  { value: 'equipment_abuse', label: 'Abuso de Equipamiento', color: 'bg-gray-100 text-gray-800' },
  { value: 'positive_conduct', label: 'Conducta Positiva', color: 'bg-green-100 text-green-800' },
];

export default function FairPlayPanel({ tournamentId, participants }: FairPlayPanelProps) {
  const [incidents, setIncidents] = useState<TournamentFairPlayWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateFairPlayIncidentRequest>>({
    incident_type: 'yellow_card',
    severity: 2,
  });

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fair-play`);
      if (res.ok) {
        const result = await res.json();
        setIncidents(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.incident_type || !formData.severity) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    setActionLoading('submit');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fair-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ incident_type: 'yellow_card', severity: 2 });
        await fetchIncidents();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      alert('Error al crear incidente');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este incidente?')) return;

    setActionLoading(`delete-${id}`);
    try {
      const res = await fetch(`/api/fair-play/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchIncidents();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Error al eliminar incidente');
    } finally {
      setActionLoading(null);
    }
  };

  const getIncidentTypeData = (type: FairPlayIncidentType) => {
    return incidentTypes.find(t => t.value === type) || incidentTypes[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Clock className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Fair-Play System
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? 'Cancelar' : 'Nuevo Incidente'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jugador *
                </label>
                <select
                  value={formData.user_id || ''}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccionar jugador...</option>
                  {participants.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.profile?.name || 'Usuario'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incident Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Incidente *
                </label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value as FairPlayIncidentType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {incidentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severidad * (1-5)
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value={1}>1 - Menor</option>
                  <option value={2}>2 - Leve</option>
                  <option value={3}>3 - Moderada</option>
                  <option value={4}>4 - Grave</option>
                  <option value={5}>5 - Muy Grave</option>
                </select>
              </div>

              {/* Points Override (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.incident_type === 'positive_conduct' ? 'Puntos Bonus' : 'Puntos Penalización'}
                  <span className="text-gray-500 text-xs ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.incident_type === 'positive_conduct' ? formData.bonus_points || '' : formData.penalty_points || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (formData.incident_type === 'positive_conduct') {
                      setFormData({ ...formData, bonus_points: value });
                    } else {
                      setFormData({ ...formData, penalty_points: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={formData.incident_type === 'positive_conduct' ? 'Auto (severity)' : 'Auto (severity × 2)'}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Detalles del incidente..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={actionLoading === 'submit'}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {actionLoading === 'submit' ? 'Creando...' : 'Crear Incidente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Incidents List */}
      <div className="p-6">
        {incidents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay incidentes registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(incidents) && incidents.map((incident) => {
              const typeData = getIncidentTypeData(incident.incident_type);
              const isPositive = incident.incident_type === 'positive_conduct';

              return (
                <div
                  key={incident.id}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeData.color}`}>
                        {typeData.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        Severidad: {incident.severity}
                      </span>
                      {isPositive ? (
                        <span className="text-sm font-medium text-green-600">
                          +{incident.bonus_points} puntos
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-red-600">
                          -{incident.penalty_points} puntos
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {incident.user_profile.name}
                    </p>
                    
                    {incident.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {incident.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(incident.issued_at)}
                      </span>
                      {incident.issuer_profile && (
                        <span>
                          Por: {incident.issuer_profile.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(incident.id)}
                      disabled={actionLoading === `delete-${incident.id}`}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Eliminar incidente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {incidents.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {incidents.filter(i => i.incident_type === 'yellow_card').length}
              </p>
              <p className="text-xs text-gray-600">Tarjetas Amarillas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {incidents.filter(i => i.incident_type === 'red_card').length}
              </p>
              <p className="text-xs text-gray-600">Tarjetas Rojas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {incidents.filter(i => !['yellow_card', 'red_card', 'positive_conduct'].includes(i.incident_type)).length}
              </p>
              <p className="text-xs text-gray-600">Violaciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {incidents.filter(i => i.incident_type === 'positive_conduct').length}
              </p>
              <p className="text-xs text-gray-600">Conductas Positivas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
