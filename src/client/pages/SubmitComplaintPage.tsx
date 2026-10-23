import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.js';
import {
  ComplaintCategory,
  SupportedLanguage,
  CATEGORY_LABELS,
  AIAnalysisResult,
} from '../../shared/types.js';
import {
  FilePlus2,
  Sparkles,
  MapPin,
  Camera,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  UploadCloud,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge.js';

interface SubmitComplaintPageProps {
  navigate: (path: string) => void;
}

export const SubmitComplaintPage: React.FC<SubmitComplaintPageProps> = ({ navigate }) => {
  const { success, error, info } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory | 'AUTO_DETECT'>('AUTO_DETECT');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [state, setState] = useState('Karnataka');
  const [city, setCity] = useState('Bengaluru');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Live AI preview state
  const [aiPreview, setAiPreview] = useState<AIAnalysisResult | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debounced live AI classification preview as citizen types
  useEffect(() => {
    if (!title.trim() && !description.trim()) {
      setAiPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setAnalyzingAi(true);
        const data = await api.post<{ analysis: AIAnalysisResult }>('/ai/analyze', {
          title,
          description,
          locality: locality || 'Indiranagar',
          city,
        });
        setAiPreview(data.analysis);
      } catch {
        // Ignored in preview
      } finally {
        setAnalyzingAi(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description, locality, city]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        error('File too large', 'Please upload an image smaller than 8MB.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      error('Geolocation not supported by browser.');
      return;
    }

    info('Detecting Location', 'Retrieving GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        success('Location Captured', `Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`);
      },
      () => {
        // Fallback demo coordinates
        setLatitude(12.9716);
        setLongitude(77.5946);
        info('Default Applied', 'Set to Bengaluru municipal center coordinates.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      error('Please provide a complaint headline.');
      return;
    }
    if (!description.trim()) {
      error('Please provide detailed grievance description.');
      return;
    }
    if (!locality.trim()) {
      error('Locality / Ward name is required.');
      return;
    }

    try {
      setSubmitting(true);

      let uploadedUrl: string | null = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await api.post<{ url: string }>('/complaints/upload', formData);
        uploadedUrl = uploadRes.url;
      }

      const res = await api.post<{
        message: string;
        complaintId: string;
        trackingUrl: string;
        analysis: AIAnalysisResult;
      }>('/complaints', {
        title: title.trim(),
        description: description.trim(),
        category,
        language,
        state,
        city,
        locality: locality.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
        imageUrl: uploadedUrl,
      });

      success('Grievance Registered', `Assigned Reference #${res.complaintId}. Automated priority: ${res.analysis.priorityPredicted}.`);
      navigate(`/complaints/${res.complaintId}`);
    } catch (err: any) {
      error('Submission Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" /> AI-Assisted Ingestion
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          File a Civic Grievance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Your report will be automatically analyzed by CivicNLP for category, priority, and department dispatch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-5">
            {/* Language Selector */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-indigo-600" />
                Language of Report:
              </span>
              <div className="flex gap-1">
                {(['en', 'te', 'hi'] as SupportedLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      language === lang
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'te' ? 'తెలుగు (Telugu)' : 'हिन्दी (Hindi)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grievance Title / Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Major water leak flooding road outside Indiranagar Metro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Grievance Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Describe what happened, exact landmarks, severity, and any hazards (e.g. gushing water, open live wire, deep crater, broken cover)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                required
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Selection
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AUTO_DETECT">✨ Auto-Detect via AI Engine (Recommended)</option>
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Section */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Location Information
                </span>
                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Use Current GPS
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Locality / Ward <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, HSR Layout"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Specific Street / Landmark Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100 Feet Road, opposite Metro Pillar 42, near junction"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {latitude && longitude && (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    GPS Coordinates: {latitude}, {longitude}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setLatitude(null); setLongitude(null); }}
                    className="text-indigo-400 hover:text-indigo-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Photo Evidence <span className="text-slate-400 font-normal">(Optional, max 8MB)</span>
              </label>

              {!imagePreview ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all group">
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload photo of the grievance</span>
                  <span className="text-[11px] text-slate-400 mt-1">JPEG, PNG, WebP supported</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 w-fit">
                  <img src={imagePreview} alt="Preview" className="h-44 object-cover rounded-2xl" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Submit Grievance
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live AI Assistant Sidebar */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-indigo-500/30 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Live CivicNLP Triage
              </span>
              {analyzingAi && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            </div>

            {aiPreview ? (
              <div className="space-y-4 text-xs">
                {/* Predicted Category */}
                <div>
                  <span className="text-slate-400 block mb-1 text-[11px]">Detected Category:</span>
                  <p className="text-sm font-bold text-indigo-200">
                    {CATEGORY_LABELS[aiPreview.categoryPredicted]}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 italic leading-relaxed">
                    "{aiPreview.categoryExplanation}"
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <span className="text-slate-400 block mb-1 text-[11px]">Assessed Priority:</span>
                  <PriorityBadge priority={aiPreview.priorityPredicted} size="sm" />
                  <span className="text-[11px] text-amber-300 font-mono block mt-1">
                    Urgency Score: {aiPreview.urgencyScore} / 100
                  </span>
                </div>

                {/* Recommended Department */}
                <div>
                  <span className="text-slate-400 block mb-1 text-[11px]">Department Recommendation:</span>
                  <p className="text-xs font-semibold text-slate-100">
                    {aiPreview.recommendedDepartmentName}
                  </p>
                </div>

                {/* Duplicate matches indicator */}
                {aiPreview.potentialDuplicates && aiPreview.potentialDuplicates.length > 0 && (
                  <div className="p-3 bg-amber-950/50 border border-amber-500/30 rounded-xl text-amber-200 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {aiPreview.potentialDuplicates.length} Similar Nearby Reports
                    </p>
                    <p className="text-[10px] text-amber-300/80">
                      SmartGov will cross-reference this to avoid duplicate dispatch while registering your voice.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                <Sparkles className="w-6 h-6 text-indigo-400/60 mx-auto" />
                <p>Start typing the grievance title and description to preview live AI auto-categorization and urgency routing.</p>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-xs text-slate-500 space-y-2 shadow-subtle">
            <h4 className="font-bold text-slate-800">Redressal SLA Standards</h4>
            <ul className="space-y-1 list-disc list-inside text-[11px]">
              <li><strong className="text-rose-600">Critical Hazards:</strong> Response within 2 hours.</li>
              <li><strong className="text-amber-600">High Urgency:</strong> Response within 24 hours.</li>
              <li><strong className="text-slate-700">Standard Reports:</strong> Resolution in 3-5 working days.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
