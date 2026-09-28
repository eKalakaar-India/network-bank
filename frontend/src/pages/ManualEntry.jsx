import React, { useState, useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { 
  FileText, 
  Save, 
  Trash2, 
  CheckCircle2, 
  HelpCircle,
  Undo
} from 'lucide-react';

const INITIAL_STATE = {
  category: 'Other',
  nameOfOrganization: '',
  nameOfAuthorisedPerson: '',
  designation: '',
  sector: '',
  strengthExpertise: '',
  contactNumber: '',
  email: '',
  state: '',
  districtCity: '',
  languages: '',
  scopeOfCollaboration: '',
  reliability: '',
  remarks: ''
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

export default function ManualEntry() {
  const { addRecord } = useVaultStore();
  const [form, setForm] = useState(INITIAL_STATE);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [reliabilityDropdownOpen, setReliabilityDropdownOpen] = useState(false);
  const [reliabilitySearch, setReliabilitySearch] = useState('');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  useEffect(() => {
    const cachedDraft = localStorage.getItem('vault_draft_record');
    if (cachedDraft) {
      try {
        setForm(JSON.parse(cachedDraft));
        setIsDraftLoaded(true);
      } catch (err) {
        console.error('Failed to parse cached relationship draft:', err);
      }
    }
  }, []);

  const handleInputChange = (key, val) => {
    const updatedForm = { ...form, [key]: val };
    setForm(updatedForm);
    localStorage.setItem('vault_draft_record', JSON.stringify(updatedForm));
    setFeedback({ type: '', msg: '' });
  };

  const handleClearDraft = () => {
    if (confirm('Clear current drafts?')) {
      setForm(INITIAL_STATE);
      localStorage.removeItem('vault_draft_record');
      setIsDraftLoaded(false);
      setFeedback({ type: 'info', msg: 'Draft memory purged.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', msg: '' });

    if (!form.nameOfOrganization && !form.nameOfAuthorisedPerson) {
      setFeedback({ 
        type: 'error', 
        msg: 'Please provide either the organization name or the authorized person name.' 
      });
      return;
    }

    try {
      await addRecord(form);
      setForm(INITIAL_STATE);
      localStorage.removeItem('vault_draft_record');
      setIsDraftLoaded(false);
      setFeedback({ 
        type: 'success', 
        msg: 'Record successfully committed to the primary relationship ledger.' 
      });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const categories = ['Govt', 'Corporate', 'NGO', 'Academic', 'Political', 'Other'];

  return (
    <div className="space-y-6 pb-10 text-slate-800">
      
      {/* Title */}
      <div>
        <h2 className="font-serif text-3xl font-bold tracking-wide text-slate-900">
          Manual <span className="font-normal italic text-[var(--accent-primary)]">Vault Ledger</span>
        </h2>
        <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-medium">
          Log high value partnership profiles directly. Forms are auto-saved in local memory drafts.
        </p>
      </div>

      <div className="flex justify-center w-full">
        <div className="w-full max-w-3xl space-y-6">
          
          {feedback.msg && (
            <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-255 text-emerald-700' :
              feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
              'bg-[var(--accent-glow)] border-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
            }`}>
              {feedback.type === 'success' && <CheckCircle2 size={16} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {isDraftLoaded && !feedback.msg && (
            <div className="p-3 bg-[var(--accent-glow)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-xl text-xs flex justify-between items-center">
              <span>Draft configuration restored from local archive cache.</span>
              <button 
                onClick={handleClearDraft} 
                className="text-[10px] uppercase font-bold text-red-650 hover:text-red-700 transition-colors"
              >
                Purge Draft
              </button>
            </div>
          )}

          {/* Manual Entry Form Card */}
          <div className="vault-card">
            <div className="flex items-center gap-2 border-b border-[#DDE3EA] pb-4 mb-6">
              <FileText className="text-[var(--accent-primary)]" size={16} />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">Relationship Metadata Matrix</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Category */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Category *</label>
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{form.category}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {categoryDropdownOpen && (
                    <>
                      {/* Invisible Click Overlay to Close */}
                      <div className="fixed inset-0 z-30" onClick={() => setCategoryDropdownOpen(false)} />
                      
                      {/* Dropdown Container */}
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search category..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        {categories
                          .filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                handleInputChange('category', c);
                                setCategoryDropdownOpen(false);
                                setCategorySearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${form.category === c ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                            >
                              {c}
                            </button>
                          ))
                        }
                      </div>
                    </>
                  )}
                </div>

                {/* Name of Organization */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Name of Organization</label>
                  <input
                    type="text"
                    value={form.nameOfOrganization}
                    onChange={(e) => handleInputChange('nameOfOrganization', e.target.value)}
                    placeholder="Ministry, Conglomerate or Institution name"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Name of Authorized Person */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Authorized Representative / Expert</label>
                  <input
                    type="text"
                    value={form.nameOfAuthorisedPerson}
                    onChange={(e) => handleInputChange('nameOfAuthorisedPerson', e.target.value)}
                    placeholder="Full official name"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Designation */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Official Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    placeholder="e.g. Director, Executive Trustee, Minister"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Sector */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Sector Domain</label>
                  <input
                    type="text"
                    value={form.sector}
                    onChange={(e) => handleInputChange('sector', e.target.value)}
                    placeholder="e.g. Foreign Relations, Public Health, Tech Ventures"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Strength/Expertise */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Expertise / Specialisation</label>
                  <input
                    type="text"
                    value={form.strengthExpertise}
                    onChange={(e) => handleInputChange('strengthExpertise', e.target.value)}
                    placeholder="Domains of excellence"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Contact Number */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Secure Contact Phone</label>
                  <input
                    type="text"
                    value={form.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="Normalized digits (includes international dial codes)"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Secure Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="name@organization.gov.in"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* State */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">State Jurisdiction</label>
                  <button
                    type="button"
                    onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{form.state || '-- Select State --'}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {stateDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setStateDropdownOpen(false)} />
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search state..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('state', '');
                            setStateDropdownOpen(false);
                            setStateSearch('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!form.state ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                        >
                          -- Select State --
                        </button>
                        {INDIAN_STATES
                          .filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()))
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                handleInputChange('state', s);
                                setStateDropdownOpen(false);
                                setStateSearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${form.state === s ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                            >
                              {s}
                            </button>
                          ))
                        }
                      </div>
                    </>
                  )}
                </div>

                {/* District/City */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">District/City Headquarters</label>
                  <input
                    type="text"
                    value={form.districtCity}
                    onChange={(e) => handleInputChange('districtCity', e.target.value)}
                    placeholder="HQ city location"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Languages */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Languages Spoken</label>
                  <input
                    type="text"
                    value={form.languages}
                    onChange={(e) => handleInputChange('languages', e.target.value)}
                    placeholder="e.g. English, Hindi, Tamil"
                    className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                  />
                </div>

                {/* Reliability */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Reliability Scale (Rating)</label>
                  <button
                    type="button"
                    onClick={() => setReliabilityDropdownOpen(!reliabilityDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{form.reliability || 'Unrated'}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {reliabilityDropdownOpen && (
                    <>
                      {/* Invisible Click Overlay to Close */}
                      <div className="fixed inset-0 z-30" onClick={() => setReliabilityDropdownOpen(false)} />
                      
                      {/* Dropdown Container */}
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search reliability..."
                          value={reliabilitySearch}
                          onChange={(e) => setReliabilitySearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('reliability', '');
                            setReliabilityDropdownOpen(false);
                            setReliabilitySearch('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!form.reliability ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                        >
                          Unrated
                        </button>
                        {['High', 'Medium', 'Low']
                          .filter(r => r.toLowerCase().includes(reliabilitySearch.toLowerCase()))
                          .map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                handleInputChange('reliability', r);
                                setReliabilityDropdownOpen(false);
                                setReliabilitySearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${form.reliability === r ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                            >
                              {r}
                            </button>
                          ))
                        }
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Scope of Collaboration */}
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Scope of Collaboration / Relationship with Us</label>
                <textarea
                  value={form.scopeOfCollaboration}
                  onChange={(e) => handleInputChange('scopeOfCollaboration', e.target.value)}
                  rows={2}
                  placeholder="Detail mutual support agreements, JV focus areas or project pipelines"
                  className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  rows={2}
                  placeholder="Important notes, meeting context, specific access credentials"
                  className="bg-[#F5F7FA] border border-[#DDE3EA] text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent-primary)]/80 focus:ring-1 focus:ring-[var(--accent-primary)]/20"
                />
              </div>

              {/* CTA Footer */}
              <div className="border-t border-[#DDE3EA] pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="btn-frosted text-sm font-semibold flex items-center gap-2"
                >
                  <Undo size={14} />
                  <span>Discard Ledger Form</span>
                </button>
                <button
                  type="submit"
                  className="btn-gold text-sm font-semibold flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>Log relationship entry</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
