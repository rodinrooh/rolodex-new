"use client";

import { useState, useEffect } from "react";
import { Person, Event, getEventsForPerson, deleteEvent, deletePerson } from "@/lib/db";
import AddEventModal from "./AddEventModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface ProfilePanelProps {
  person: Person | null;
  onClose: () => void;
  onEventAdded: () => void;
  onPersonDeleted?: () => void;
}

export default function ProfilePanel({ person, onClose, onEventAdded, onPersonDeleted }: ProfilePanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [displayPerson, setDisplayPerson] = useState<Person | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [showDeletePersonModal, setShowDeletePersonModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger animation when panel opens and keep person reference during closing
  useEffect(() => {
    if (person) {
      setDisplayPerson(person);
      setIsClosing(false);
      setShouldAnimate(false);
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [person]);

  // Handle Escape key
  useEffect(() => {
    if (!person) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsClosing(true);
        setShouldAnimate(false);
        setTimeout(() => {
          onClose();
          setIsClosing(false);
        }, 300);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [person, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setShouldAnimate(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDisplayPerson(null);
    }, 300); // Match animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const loadEvents = async (personId: string) => {
    setIsLoading(true);
    try {
      const fetchedEvents = await getEventsForPerson(personId);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (displayPerson) {
      loadEvents(displayPerson.id);
    } else {
      setEvents([]);
    }
  }, [displayPerson]);

  const handleEventAdded = () => {
    if (displayPerson) {
      loadEvents(displayPerson.id);
    }
    onEventAdded();
    setShowAddEventModal(false);
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteEvent(eventToDelete.id);
      if (success) {
        // Update local state immediately
        setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
        // Trigger graph recalculation for line colors
        onEventAdded();
      } else {
        alert("Failed to delete event. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setIsDeleting(false);
      setEventToDelete(null);
      setShowDeleteEventModal(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!displayPerson) return;

    setIsDeleting(true);
    try {
      const success = await deletePerson(displayPerson.id);
      if (success) {
        // Close the panel
        handleClose();
        // Trigger graph update to remove node and edges
        if (onPersonDeleted) {
          onPersonDeleted();
        }
      } else {
        alert("Failed to delete person. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting person:", error);
      alert("Failed to delete person. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeletePersonModal(false);
    }
  };

  if (!displayPerson && !isClosing) return null;

  return (
    <>
      {/* Full-screen transparent backdrop for click-outside detection */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleBackdropClick}
      >
        {/* Panel - Left side, floating, with animation */}
        <div
          className={`fixed left-6 top-12 bottom-12 w-full max-w-md bg-white shadow-2xl overflow-y-auto rounded-2xl border border-gray-200 transform transition-all duration-300 ease-out ${
            shouldAnimate && !isClosing
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>
            <div className="flex items-center gap-2">
              {/* Delete Person Button */}
              <button
                onClick={() => setShowDeletePersonModal(true)}
                className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                aria-label="Delete person"
                disabled={isDeleting}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close panel"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="mb-3">
            <h3 className="text-2xl font-semibold text-gray-900">{displayPerson?.name}</h3>
          </div>

          {/* Role / Company */}
          {(displayPerson?.role || displayPerson?.company) && (
            <div className="mb-6">
              <div className="text-gray-600 text-base">
                {displayPerson?.role || displayPerson?.company}
              </div>
            </div>
          )}

          {/* Notes */}
          {displayPerson?.notes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
              <div className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{displayPerson.notes}</div>
            </div>
          )}

          {/* Events Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Events</h4>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Add Event
              </button>
            </div>

            {/* Events List */}
            {isLoading ? (
              <div className="text-gray-500 text-sm">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-gray-500 text-sm">No events yet</div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {event.sentiment === "good" && <span>👍</span>}
                        {event.sentiment === "neutral" && <span>⚪</span>}
                        {event.sentiment === "bad" && <span>👎</span>}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {event.sentiment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => {
                            setEventToDelete(event);
                            setShowDeleteEventModal(true);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                          aria-label="Delete event"
                          disabled={isDeleting}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{event.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && displayPerson && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          onSave={handleEventAdded}
          personId={displayPerson.id}
        />
      )}

      {/* Delete Event Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteEventModal}
        onClose={() => {
          setShowDeleteEventModal(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDeleteEvent}
        title="Delete this event?"
        message="This action cannot be undone. The event will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Delete Person Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeletePersonModal}
        onClose={() => setShowDeletePersonModal(false)}
        onConfirm={handleDeletePerson}
        title="Delete this person and all their events?"
        message="This action cannot be undone. The person and all associated events will be permanently removed from your Rolodex."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}

