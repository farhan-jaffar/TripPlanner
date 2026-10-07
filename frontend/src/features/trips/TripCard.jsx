import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, MoreVertical, Edit2, Trash2, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDateRange, getTripDurationInDays, getTripStatus } from '../../utils/dates';
import { useDeleteTrip } from '../../hooks/useTrips';
import { useToast } from '../../components/ui/Toast';

export const TripCard = ({ trip }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteMutation = useDeleteTrip();
  const { showToast } = useToast();

  const duration = getTripDurationInDays(trip.start_date, trip.end_date);
  const status = getTripStatus(trip.start_date, trip.end_date);

  const statusBadge = {
    upcoming: <Badge variant="sand">Upcoming</Badge>,
    ongoing: <Badge variant="terracotta">In Progress</Badge>,
    completed: <Badge variant="sage">Completed</Badge>,
  }[status];

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(trip.id);
      showToast('Trip deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    } catch {
      showToast('Failed to delete trip', 'error');
    }
  };

  return (
    <>
      <Card hoverable className="flex flex-col h-full relative group">
        <div className="p-6 flex flex-col flex-1">
          {/* Header row: Status & Action Menu */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {statusBadge}
              <span className="text-xs text-sand-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {duration} {duration === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* Dropdown Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1 text-sand-400 hover:text-sand-700 hover:bg-sand-100 rounded-lg transition-colors"
                aria-label="Trip actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-sand-200 rounded-xl shadow-warm-lg py-1 z-30 animate-in fade-in zoom-in-95">
                    <Link
                      to={`/trips/${trip.id}/edit`}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-sand-700 hover:bg-sand-100 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sand-500" />
                      Edit Trip
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      Delete Trip
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <Link to={`/trips/${trip.id}`} className="group-hover:text-terracotta-700 transition-colors">
            <h3 className="text-xl font-bold font-serif text-sand-900 leading-snug line-clamp-2 mb-2">
              {trip.title}
            </h3>
          </Link>

          {/* Description preview */}
          {trip.description && (
            <p className="text-sm text-sand-600 line-clamp-2 mb-4 leading-relaxed">
              {trip.description}
            </p>
          )}

          {/* Spacer */}
          <div className="mt-auto pt-4 border-t border-sand-100 flex flex-col gap-3">
            {/* Dates */}
            <div className="flex items-center gap-2 text-xs font-medium text-sand-700">
              <Calendar className="w-4 h-4 text-terracotta-600 shrink-0" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>

            {/* Bottom row: Stop count & View Link */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs text-sand-600 bg-sand-100/70 px-2.5 py-1 rounded-full border border-sand-200">
                <MapPin className="w-3.5 h-3.5 text-terracotta-600" />
                <span className="font-semibold text-sand-800">{trip.stop_count}</span>
                <span>{trip.stop_count === 1 ? 'stop' : 'stops'}</span>
              </div>

              <Link
                to={`/trips/${trip.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta-600 group-hover:text-terracotta-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>View Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Trip"
        description={`Are you sure you want to delete "${trip.title}"? All scheduled stops within this trip will also be permanently removed.`}
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
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};
