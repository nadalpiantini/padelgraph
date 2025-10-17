/**
 * Check-In Button Component
 *
 * Handles GPS-based check-in for tournaments.
 * Requests geolocation permission and validates against geofence.
 */

'use client';

import { useState } from 'react';
import { MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getCurrentPosition } from '@/lib/geolocation';

interface CheckInButtonProps {
  tournamentId: string;
  status: 'not_registered' | 'registered' | 'checked_in' | 'no_show';
  onSuccess?: () => void;
}

export function CheckInButton({
  tournamentId,
  status,
  onSuccess,
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get current GPS position
      const position = await getCurrentPosition();

      // Send check-in request
      const response = await fetch(`/api/tournaments/${tournamentId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.lat,
          lng: position.lng,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al hacer check-in');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al hacer check-in');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checked_in') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Ya hiciste check-in</span>
      </div>
    );
  }

  if (status !== 'registered') {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckIn}
        disabled={loading || success}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Validando ubicación...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Check-in exitoso</span>
          </>
        ) : (
          <>
            <MapPin className="h-5 w-5" />
            <span>Hacer Check-in</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error de check-in</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>
            Check-in completado exitosamente. ¡Estás listo para el torneo!
          </p>
        </div>
      )}
    </div>
  );
}
