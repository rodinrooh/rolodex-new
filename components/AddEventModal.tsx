"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  personId: string;
}

type Sentiment = "good" | "neutral" | "bad";

export default function AddEventModal({
  isOpen,
  onClose,
  onSave,
  personId,
}: AddEventModalProps) {
  const [description, setDescription] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Trigger animation when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset animation state, then trigger after a tiny delay
      setShouldAnimate(false);
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setShouldAnimate(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsClosing(true);
        setShouldAnimate(false);
        setTimeout(() => {
          onClose();
        }, 300);
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setDescription("");
      setSentiment(null);
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sentiment || !description.trim()) {
      alert("Please provide a description and select a sentiment.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("events").insert({
        person_id: personId,
        description: description.trim(),
        sentiment: sentiment,
      });

      if (error) throw error;

      setDescription("");
      setSentiment(null);
      onSave();
      handleClose();
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to add event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen && !isClosing ? "opacity-100" : "opacity-0 pointer-events-none"
      } transition-opacity duration-300`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop with blur - separate layer for proper blur effect */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isOpen && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out ${
          shouldAnimate && !isClosing
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-gray-200 relative">
          <h2 className="text-2xl font-semibold text-gray-900">Add Event</h2>
          <button
            onClick={handleClose}
            className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What happened?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
                placeholder="Describe what happened."
              />
            </div>

            {/* Sentiment buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sentiment *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSentiment("good")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    sentiment === "good"
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl mb-1 block">👍</span>
                  <span className="text-sm font-medium">Good</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSentiment("neutral")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    sentiment === "neutral"
                      ? "bg-gray-50 border-gray-500 text-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl mb-1 block">⚪</span>
                  <span className="text-sm font-medium">Neutral</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSentiment("bad")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    sentiment === "bad"
                      ? "bg-red-50 border-red-500 text-red-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl mb-1 block">👎</span>
                  <span className="text-sm font-medium">Bad</span>
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={isSaving || !sentiment}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

