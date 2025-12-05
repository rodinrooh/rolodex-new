"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userId: string;
  existingPeople: Array<{ id: string; name: string }>;
}

type HowDidYouMeet = "introduced" | "direct" | "other";

export default function AddPersonModal({
  isOpen,
  onClose,
  onSave,
  userId,
  existingPeople,
}: AddPersonModalProps) {
  const [name, setName] = useState("");
  const [roleCompany, setRoleCompany] = useState("");
  const [howDidYouMeet, setHowDidYouMeet] = useState<HowDidYouMeet>("direct");
  const [introducerId, setIntroducerId] = useState("");
  const [introducerName, setIntroducerName] = useState("");
  const [introducerDescription, setIntroducerDescription] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [notes, setNotes] = useState("");
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
      setName("");
      setRoleCompany("");
      setHowDidYouMeet("direct");
      setIntroducerId("");
      setIntroducerName("");
      setIntroducerDescription("");
      setOtherDescription("");
      setNotes("");
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
    setIsSaving(true);

    try {
      // Determine introducer_id
      let finalIntroducerId: string | null = null;
      if (howDidYouMeet === "introduced") {
        if (introducerId && introducerId !== "") {
          // Selected an existing contact
          finalIntroducerId = introducerId;
        } else if (introducerId === "" && introducerDescription.trim()) {
          // "Someone who isn't my contact" selected - create new introducer
          const { data: newIntroducer, error: introError } = await supabase
            .from("people")
            .insert({
              user_id: userId,
              name: introducerDescription.trim(),
              role: null,
              company: null,
              introducer_id: null,
            })
            .select()
            .single();

          if (introError) throw introError;
          finalIntroducerId = newIntroducer.id;
        }
      }

      // Combine notes with "other" description if applicable
      let finalNotes = notes.trim() || "";
      if (howDidYouMeet === "other" && otherDescription.trim()) {
        const otherText = `How we met: ${otherDescription.trim()}`;
        finalNotes = finalNotes ? `${otherText}\n\n${finalNotes}` : otherText;
      }

      // Insert the new person
      const { data: newPerson, error } = await supabase
        .from("people")
        .insert({
          user_id: userId,
          name: name.trim(),
          role: roleCompany.trim() || null,
          company: roleCompany.trim() || null,
          introducer_id: finalIntroducerId,
          notes: finalNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      onSave();
      handleClose();
    } catch (error) {
      console.error("Error adding person:", error);
      alert("Failed to add person. Please try again.");
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
          <h2 className="text-2xl font-semibold text-gray-900">Add Connection</h2>
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
            />
          </div>

          {/* Role / Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role / Company
            </label>
            <input
              type="text"
              value={roleCompany}
              onChange={(e) => setRoleCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
            />
          </div>

          {/* How did you meet? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How did you meet? *
            </label>
            <select
              value={howDidYouMeet}
              onChange={(e) => setHowDidYouMeet(e.target.value as HowDidYouMeet)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
            >
              <option value="introduced">Introduced by someone</option>
              <option value="direct">Met directly</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Introduced by someone - secondary dropdown */}
          {howDidYouMeet === "introduced" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Introduced by
              </label>
              <select
                value={introducerId}
                onChange={(e) => {
                  setIntroducerId(e.target.value);
                  setIntroducerName("");
                  setIntroducerDescription("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600 mb-2"
              >
                <option value="">Someone who isn't my contact</option>
                {existingPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {introducerId === "" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={introducerDescription}
                    onChange={(e) => setIntroducerDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Other - description */}
          {howDidYouMeet === "other" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-gray-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-6">
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={isSaving}
            >
              {isSaving ? "Adding..." : "Add Connection"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

