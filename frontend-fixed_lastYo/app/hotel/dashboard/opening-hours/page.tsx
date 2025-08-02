"use client";

import { useState, useEffect } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";
import { Calendar } from "lucide-react";

// GraphQL queries
const GET_HOTEL_OPENING = gql`
  query GetHotel($id: ID!) {
    hotel(id: $id) {
      id
      openingPeriods {
        startDate
        endDate
      }
    }
  }
`;

const UPDATE_HOTEL = gql`
  mutation UpdateHotel($id: ID!, $input: HotelInput!) {
    updateHotel(id: $id, input: $input) {
      id
    }
  }
`;

interface OpeningPeriod {
  startDate: string;
  endDate: string;
}

export default function OpeningHoursPage() {
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/session");
        if (!res.ok) {
          setSessionLoading(false);
          return;
        }
        const data = await res.json();
        if (data.businessType && data.businessType.toLowerCase() === "hotel" && data.businessId) {
          setHotelId(data.businessId);
        } else {
          setSessionError("You are not associated with a hotel business.");
        }
      } catch (err) {
        setSessionError("Failed to load session.");
      } finally {
        setSessionLoading(false);
      }
    }
    fetchSession();
  }, []);

  // Fetch current opening periods
  const {
    data: hotelData,
    loading: hotelLoading,
    error: hotelError,
    refetch: refetchHotel,
  } = useQuery(GET_HOTEL_OPENING, {
    variables: { id: hotelId },
    skip: !hotelId,
  });

  const [updateHotel] = useMutation(UPDATE_HOTEL);

  // Local state for new period form
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loadingMutation, setLoadingMutation] = useState(false);

  const periods: OpeningPeriod[] = hotelData?.hotel?.openingPeriods || [];

  // Add a new opening period
  const handleAddPeriod = async () => {
    if (!hotelId) return;
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date.");
      return;
    }
    const newPeriods = [...periods, { startDate, endDate }];
    try {
      setLoadingMutation(true);
      await updateHotel({
        variables: {
          id: hotelId,
          input: { openingPeriods: newPeriods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })) },
        },
      });
      setStartDate("");
      setEndDate("");
      refetchHotel();
    } catch (err) {
      console.error(err);
      alert("Failed to update opening periods.");
    } finally {
      setLoadingMutation(false);
    }
  };

  // Remove a period by index
  const handleRemovePeriod = async (index: number) => {
    if (!hotelId) return;
    const newPeriods = periods.filter((_, i) => i !== index);
    try {
      setLoadingMutation(true);
      await updateHotel({
        variables: {
          id: hotelId,
          input: { openingPeriods: newPeriods.map((p) => ({ startDate: p.startDate, endDate: p.endDate })) },
        },
      });
      refetchHotel();
    } catch (err) {
      console.error(err);
      alert("Failed to remove opening period.");
    } finally {
      setLoadingMutation(false);
    }
  };

  if (sessionLoading || hotelLoading) {
    return <div className="p-6">Loading...</div>;
  }
  if (sessionError) {
    return <div className="p-6 text-red-600">{sessionError}</div>;
  }
  if (hotelError) {
    return <div className="p-6 text-red-600">Error loading hotel data.</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Horaires d'ouverture</h1>
        <p className="text-gray-600">
          Définissez les périodes pendant lesquelles votre établissement est ouvert aux réservations.
        </p>
      </div>
      {/* Form to add new period */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ajouter une période d'ouverture</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={handleAddPeriod}
          disabled={loadingMutation}
          className={`mt-4 px-4 py-2 rounded text-white ${loadingMutation ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          Ajouter
        </button>
      </div>
      {/* List of periods */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Périodes d'ouverture configurées</h2>
        {periods.length > 0 ? (
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-700">Date de début</th>
                <th className="px-4 py-2 font-medium text-gray-700">Date de fin</th>
                <th className="px-4 py-2 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(period.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(period.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleRemovePeriod(index)}
                      className="text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Aucune période configurée.</p>
        )}
      </div>
    </div>
  );
}