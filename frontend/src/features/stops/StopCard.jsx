import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDateRange, formatDate } from '../../utils/dates';
import { useDeleteStop } from '../../hooks/useStops';
import { useToast } from '../../components/ui/Toast';

export const StopCard = ({ stop, trip }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteMutation = useDeleteStop(trip.id);
  const { showToast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(stop.id);
      showToast('Stop removed from itinerary', 'success');
      setIsDeleteModalOpen(false);
    } catch {
      showToast('Failed to delete stop', 'error');
    }
  };

  const datesFormatted =
    stop.arrival_date && stop.departure_date
      ? formatDateRange(stop.arrival_date, stop.departure_date)
      : stop.arrival_date
      ? `Arrives ${formatDate(stop.arrival_date)}`
      : stop.departure_date
      ? `Departs ${formatDate(stop.departure_date)}`
      : null;

  return (
    <>
      <Card className="p-5 sm:p-6 relative group border-sand-200 hover:border-sand-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Main Info */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-800 text-xs font-bold border border-terracotta-200">
                {stop.order + 1}
              </span>
              <h4 className="text-base sm:text-lg font-bold font-serif text-sand-900">
                {stop.name}
              </h4>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-terracotta-700">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{stop.location}</span>
            </div>

            {/* Description */}
            {stop.description && (
              <p className="text-xs sm:text-sm text-sand-600 pt-1 leading-relaxed">
                {stop.description}
              </p>
            )}

            {/* Date Range if set */}
            {datesFormatted && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-sand-600 pt-2">
                <Calendar className="w-3.5 h-3.5 text-sand-500 shrink-0" />
                <span>{datesFormatted}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
            <Link to={`/trips/${trip.id}/stops/${stop.id}/edit`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs p-2 h-auto text-sand-600 hover:text-sand-900"
                aria-label="Edit stop"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs p-2 h-auto text-red-500 hover:text-red-700 hover:bg-red-50"
              aria-label="Delete stop"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Stop Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Stop"
        description={`Are you sure you want to remove "${stop.name}" from your itinerary?`}
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Remove Stop
          </Button>
        </div>
      </Modal>
    </>
  );
};
