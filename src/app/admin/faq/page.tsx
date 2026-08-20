"use client";

import { useState, useEffect } from "react";
import { Trash2, Loader, Sparkles } from "lucide-react";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  question_fr?: string | null;
  answer_fr?: string | null;
  category?: string;
  created_at: string;
  updated_at: string;
}

export default function FAQManagementPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionFr, setQuestionFr] = useState("");
  const [answerFr, setAnswerFr] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [suggestingFor, setSuggestingFor] = useState("");
  const [suggestingFromMessages, setSuggestingFromMessages] = useState(false);
  const [usingSuggestionIndex, setUsingSuggestionIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ question: string; answer?: string; category?: string; source?: "answer" | "messages" }>>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load FAQs
  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const res = await fetch("/api/admin/faq");
      if (!res.ok) throw new Error("Failed to load FAQs");
      const data = (await res.json()) as { faqs: FAQ[] };
      setFaqs(data.faqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FAQs");
    } finally {
      setLoadingFaqs(false);
    }
  };

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError("English question and answer are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = editingId !== null;
      const endpoint = isEditing ? `/api/admin/faq/${editingId}` : "/api/admin/faq";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          question_fr: questionFr,
          answer_fr: answerFr,
          category,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to save FAQ");
      }

      setSuccess(isEditing ? "FAQ updated successfully!" : "FAQ added successfully!");
      setEditingId(null);
      setQuestion("");
      setAnswer("");
      setQuestionFr("");
      setAnswerFr("");
      setCategory("");
      setSuggestions([]);
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save FAQ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFAQ = async (id: number) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete FAQ");
      setSuccess("FAQ deleted successfully!");
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete FAQ");
    }
  };

  const handleEditFAQ = (faq: FAQ) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setQuestionFr(faq.question_fr ?? "");
    setAnswerFr(faq.answer_fr ?? "");
    setCategory(faq.category ?? "");
    setSuccess("");
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setQuestionFr("");
    setAnswerFr("");
    setCategory("");
    setSuggestions([]);
    setError("");
    setSuccess("");
  };

  const handleSuggestQuestions = async () => {
    if (!answer.trim()) {
      setError("Enter an answer first to generate questions");
      return;
    }

    setSuggestingFor(answer);
    setError("");

    try {
      const res = await fetch("/api/admin/faq/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, source: "answer" }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to generate suggestions");
      }

      const data = (await res.json()) as {
        suggestions: Array<{ question: string; answer?: string; category?: string }>;
      };
      setSuggestions(data.suggestions.map((s) => ({ ...s, source: "answer" as const })));
      setSuccess("Questions generated! Click to use one.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
    } finally {
      setSuggestingFor("");
    }
  };

  const handleSuggestFromMessages = async () => {
    setSuggestingFromMessages(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/faq/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "messages" }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to generate from messages");
      }

      const data = (await res.json()) as {
        suggestions: Array<{ question: string; answer?: string; category?: string }>;
      };
      setSuggestions(data.suggestions.map((s) => ({ ...s, source: "messages" as const })));
      setSuccess("FAQ drafts generated from customer messages. Click one to use.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate from messages");
    } finally {
      setSuggestingFromMessages(false);
    }
  };

  const selectSuggestedQuestion = (suggestion: { question: string; answer?: string; category?: string; source?: "answer" | "messages" }) => {
    setQuestion(suggestion.question);
    if (suggestion.answer) {
      setAnswer(suggestion.answer);
    }
    if (suggestion.category) {
      setCategory(suggestion.category);
    }
    setSuccess("Draft loaded into form. Refine and submit when ready.");
  };

  const handleUseSuggestion = async (
    suggestion: { question: string; answer?: string; category?: string; source?: "answer" | "messages" },
    idx: number,
  ) => {
    const finalAnswer = suggestion.answer?.trim() || answer.trim();
    if (!finalAnswer) {
      setError("This suggestion has no answer. Click Load Draft and add an answer first.");
      return;
    }

    setUsingSuggestionIndex(idx);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: suggestion.question,
          answer: finalAnswer,
          category: suggestion.category ?? "General",
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create FAQ from suggestion");
      }

      setSuccess("FAQ created from suggestion!");
      setSuggestions((prev) => prev.filter((_, suggestionIdx) => suggestionIdx !== idx));
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create FAQ from suggestion");
    } finally {
      setUsingSuggestionIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">FAQ Management</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add/Edit Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                {editingId ? "Update FAQ" : "Add New FAQ"}
              </h2>
              <form onSubmit={handleAddFAQ} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question (English) *
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What is...?"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-950"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {question.length}/500 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Answer (English) *
                  </label>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Detailed answer..."
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-950 resize-none"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {answer.length}/5000 characters
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      French Version (Français)
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question (French / Français)
                    </label>
                    <input
                      type="text"
                      value={questionFr}
                      onChange={(e) => setQuestionFr(e.target.value)}
                      placeholder="e.g. Qu'est-ce que...?"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-950"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Answer (French / Français)
                    </label>
                    <textarea
                      value={answerFr}
                      onChange={(e) => setAnswerFr(e.target.value)}
                      placeholder="Detailed answer in French..."
                      rows={4}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-950 resize-none"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Shipping, Products"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-950"
                    disabled={loading}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSuggestQuestions}
                  disabled={loading || suggestingFor === answer}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {suggestingFor === answer ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Questions
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSuggestFromMessages}
                  disabled={loading || suggestingFromMessages}
                  className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {suggestingFromMessages ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Generating from messages...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate from Customer Messages
                    </>
                  )}
                </button>

                {suggestions.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Suggested Questions:
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((sugg, idx) => (
                        <div
                          key={idx}
                          className="w-full bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{sugg.question}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                sugg.source === "messages"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {sugg.source === "messages" ? "From Messages" : "From Answer"}
                            </span>
                          </div>
                          {sugg.answer && (
                            <p className="mt-1 text-xs text-blue-800 line-clamp-2">{sugg.answer}</p>
                          )}
                          {sugg.category && (
                            <p className="mt-1 text-[11px] text-blue-700 uppercase tracking-wide">{sugg.category}</p>
                          )}

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => selectSuggestedQuestion(sugg)}
                              className="rounded border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              Load Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUseSuggestion(sugg, idx)}
                              disabled={usingSuggestionIndex === idx}
                              className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {usingSuggestionIndex === idx ? "Using..." : "Use"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-950 text-white py-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update FAQ" : "Add FAQ")}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* FAQs List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  All FAQs ({faqs.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {loadingFaqs ? (
                  <div className="px-6 py-8 text-center">
                    <div className="inline-block">
                      <Loader className="animate-spin text-gray-400" size={32} />
                    </div>
                    <p className="mt-2 text-gray-500">Loading FAQs...</p>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No FAQs yet. Add your first one!
                  </div>
                ) : (
                  faqs.map((faq) => (
                    <div key={faq.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {faq.question}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {faq.answer}
                          </p>
                          {faq.question_fr && (
                            <div className="mb-2 p-2 bg-blue-50/60 rounded border border-blue-100 text-xs">
                              <span className="font-semibold text-blue-800">FR: </span>
                              <span className="text-blue-950 font-medium">{faq.question_fr}</span>
                              {faq.answer_fr && (
                                <p className="text-blue-900/80 mt-0.5 line-clamp-1">{faq.answer_fr}</p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {faq.category && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {faq.category}
                              </span>
                            )}
                            {faq.question_fr ? (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                                FR Translated
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[11px]">
                                No FR translation
                              </span>
                            )}
                            <span>
                              Updated:{" "}
                              {new Date(faq.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditFAQ(faq)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                          title="Edit FAQ"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFAQ(faq.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Delete FAQ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
