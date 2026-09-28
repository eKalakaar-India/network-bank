import React, { useEffect, useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import axios from 'axios';
import { 
  Search, 
  Trash2, 
  Download, 
  Edit, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  X,
  Plus,
  RefreshCw,
  Sparkles,
  GitMerge,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export default function Records() {
  const { 
    records, 
    recordsLoading, 
    pagination, 
    filters, 
    aggregates,
    fetchRecords, 
    setFilters, 
    deleteRecord, 
    bulkDeleteRecords,
    updateRecord,
    deduplicateRecords
  } = useVaultStore();

  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeForm, setMergeForm] = useState({});

  const [searchVal, setSearchVal] = useState(filters.search);
  const [nameSearchVal, setNameSearchVal] = useState(filters.name || '');

  // Custom searchable dropdown states
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  
  const [reliabilityDropdownOpen, setReliabilityDropdownOpen] = useState(false);
  const [reliabilitySearch, setReliabilitySearch] = useState('');

  // States for Edit Modal custom searchable dropdowns
  const [editCategoryDropdownOpen, setEditCategoryDropdownOpen] = useState(false);
  const [editCategorySearch, setEditCategorySearch] = useState('');
  const [editReliabilityDropdownOpen, setEditReliabilityDropdownOpen] = useState(false);
  const [editReliabilitySearch, setEditReliabilitySearch] = useState('');
  const [editStateDropdownOpen, setEditStateDropdownOpen] = useState(false);
  const [editStateSearch, setEditStateSearch] = useState('');

  // Synchronized scrollbar refs
  const topScrollRef = React.useRef(null);
  const tableScrollRef = React.useRef(null);

  const handleTopScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters({ search: searchVal });
      fetchRecords(1);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setFilters({ name: nameSearchVal });
      fetchRecords(1);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [nameSearchVal]);

  const handleFilterChange = (key, val) => {
    setFilters({ [key]: val });
    fetchRecords(1);
  };

  const handlePageChange = (newPage) => {
    fetchRecords(newPage);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(records.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} relationships? This is irreversible.`)) {
      const success = await bulkDeleteRecords(selectedIds);
      if (success) {
        setSelectedIds([]);
      }
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to clear this entry?')) {
      await deleteRecord(id);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateRecord(editingRecord.id, editingRecord);
      setEditingRecord(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerExport = (type) => {
    const idsQuery = selectedIds.length > 0 ? `?ids=${selectedIds.join(',')}` : '';
    axios.get(`/export/${type}${idsQuery}`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Vault_Intelligence_Export_${Date.now()}.${type}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(err => {
        console.error('Export failed:', err);
        alert('Failed to export files from the vault. Please verify your connection.');
      });
  };

  const categories = ['Govt', 'Corporate', 'NGO', 'Academic', 'Political', 'Other'];

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
  ];

  // Reusable pagination element
  const renderPagination = (positionLabel) => {
    if (recordsLoading || pagination.totalPages <= 1) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-[#DDE3EA] rounded-xl shadow-sm text-xs">
        <span className="font-semibold text-slate-500">
          Displaying {positionLabel} entries {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-1.5 border border-[#DDE3EA] bg-white rounded-lg hover:bg-[#ECEFF4] disabled:opacity-30 transition-colors text-slate-700 shadow-sm"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-bold px-3 py-1 bg-[#ECEFF4] border border-[#DDE3EA] rounded-md text-[var(--accent-primary)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-1.5 border border-[#DDE3EA] bg-white rounded-lg hover:bg-[#ECEFF4] disabled:opacity-30 transition-colors text-slate-700 shadow-sm"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
          
          <div className="flex items-center gap-1.5 ml-2 border-l border-[#DDE3EA] pl-3">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Go to Page:</span>
            <input
              type="number"
              min={1}
              max={pagination.totalPages}
              placeholder={pagination.page}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= pagination.totalPages) {
                    handlePageChange(val);
                    e.target.value = '';
                  } else {
                    alert(`Please enter a page between 1 and ${pagination.totalPages}`);
                  }
                }
              }}
              className="w-12 px-1.5 py-1 text-center bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/65 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/20"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 text-slate-800">
      
      {/* Table Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-bold tracking-wide text-slate-900">
            Partnership <span className="font-normal italic text-[var(--accent-primary)]">Vault Ledger</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-medium">
            Search, sort, filter, and extract intelligence from active records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => triggerExport('csv')}
            className="btn-frosted text-sm font-semibold flex items-center gap-2"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button 
            onClick={() => triggerExport('xlsx')}
            className="btn-gold text-sm font-semibold"
          >
            <span>Excel Sheet</span>
          </button>
        </div>
      </div>

      {/* Global Search and Bulk Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-[#DDE3EA] rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Global search by Name, Expert, Organization, Domain expertise..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/65 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/20"
            />
          </div>
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to run deduplication on all active database records? This will automatically merge identical or related profiles under the same person name.")) {
                try {
                  const res = await deduplicateRecords();
                  alert(`Deduplication complete! Merged and cleaned ${res.deletedCount} duplicate entries.`);
                } catch (err) {
                  alert(err.message);
                }
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all whitespace-nowrap"
          >
            <GitMerge size={16} />
            <span>Remove Duplicates</span>
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-xs font-semibold text-red-650 shadow-sm">
            <span>Selected {selectedIds.length} Entries</span>
            <button 
              onClick={handleBulkDelete}
              className="p-1.5 hover:bg-red-100 rounded-lg border border-red-200 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Filters Area (Horizontal Grid above the table) */}
      <div className="vault-card !overflow-visible grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border-[#DDE3EA]">
        {/* Category */}
        <div className="flex flex-col relative">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Category</label>
          <button
            type="button"
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
          >
            <span>{filters.category || '-- All Categories --'}</span>
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
                <button
                  type="button"
                  onClick={() => {
                    handleFilterChange('category', '');
                    setCategoryDropdownOpen(false);
                    setCategorySearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!filters.category ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                >
                  -- All Categories --
                </button>
                {categories
                  .filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleFilterChange('category', c);
                        setCategoryDropdownOpen(false);
                        setCategorySearch('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${filters.category === c ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                    >
                      {c}
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>

        {/* State */}
        <div className="flex flex-col relative">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">State Jurisdiction</label>
          <button
            type="button"
            onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
            className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
          >
            <span>{filters.state || '-- All States --'}</span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {stateDropdownOpen && (
            <>
              {/* Invisible Click Overlay to Close */}
              <div className="fixed inset-0 z-30" onClick={() => setStateDropdownOpen(false)} />
              
              {/* Dropdown Container */}
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
                    handleFilterChange('state', '');
                    setStateDropdownOpen(false);
                    setStateSearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!filters.state ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                >
                  -- All States --
                </button>
                {INDIAN_STATES
                  .filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()))
                  .map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        handleFilterChange('state', s);
                        setStateDropdownOpen(false);
                        setStateSearch('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${filters.state === s ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                    >
                      {s}
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>

        {/* Reliability */}
        <div className="flex flex-col relative">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Reliability Scale</label>
          <button
            type="button"
            onClick={() => setReliabilityDropdownOpen(!reliabilityDropdownOpen)}
            className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
          >
            <span>{filters.reliability || '-- All Ratings --'}</span>
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
                    handleFilterChange('reliability', '');
                    setReliabilityDropdownOpen(false);
                    setReliabilitySearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!filters.reliability ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                >
                  -- All Ratings --
                </button>
                {['High', 'Medium', 'Low']
                  .filter(r => r.toLowerCase().includes(reliabilitySearch.toLowerCase()))
                  .map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        handleFilterChange('reliability', r);
                        setReliabilityDropdownOpen(false);
                        setReliabilitySearch('');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${filters.reliability === r ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                    >
                      {r}
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setSearchVal('');
              setNameSearchVal('');
              setFilters({ name: '', category: '', state: '', reliability: '' });
              fetchRecords(1);
            }}
            className="w-full py-2.5 bg-[#E8ECF2] hover:bg-[#DDE3EA] text-xs text-[var(--accent-primary)] hover:text-red-750 border border-[#DDE3EA] rounded-lg transition-colors font-bold shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Pagination Controls at the Start (Top) of Vault Data */}
      {renderPagination("top")}

      {/* Scrollable Spreadsheet Table Container */}
      <div className="vault-table-container transition-all duration-300">
        {recordsLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white">
            <RefreshCw className="text-[var(--accent-primary)] animate-spin" size={32} />
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Unlocking Vault Records...</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Top Horizontal Scrollbar Helper */}
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll}
              className="overflow-x-auto w-full border-b border-[#DDE3EA] bg-[#F5F7FA]"
              style={{ height: '12px' }}
            >
              <div style={{ width: '2200px', height: '1px' }} />
            </div>
            
            {/* Table Scrollable Container */}
            <div 
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto"
            >
              <table className="vault-table min-w-[2200px]">
              <thead>
                <tr>
                  <th className="w-12 text-center sticky left-0 bg-[#E8ECF2] z-20 border-r border-[#DDE3EA]">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={records.length > 0 && selectedIds.length === records.length}
                      className="rounded border-[#DDE3EA] bg-white text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20 h-4 w-4"
                    />
                  </th>
                  <th className="w-16">Sr No</th>
                  <th className="w-24">Category</th>
                  <th className="w-56">Name of Organization</th>
                  <th className="w-56">Authorised Person / Expert</th>
                  <th className="w-40">Designation</th>
                  <th className="w-40">Sector</th>
                  <th className="w-56">Strength / Expertise</th>
                  <th className="w-44">Contact Number</th>
                  <th className="w-52">Email</th>
                  <th className="w-32">State</th>
                  <th className="w-36">District / City</th>
                  <th className="w-36">Languages</th>
                  <th className="w-72">Scope of Collaboration</th>
                  <th className="w-32">Reliability</th>
                  <th className="w-72">Remarks</th>
                  <th className="w-24 text-center sticky right-0 bg-[#E8ECF2] z-20 border-l border-[#DDE3EA]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr 
                    key={rec.id} 
                    className={selectedIds.includes(rec.id) ? 'bg-[var(--accent-glow)]' : ''}
                  >
                    <td className="text-center sticky left-0 z-10 border-r border-[#DDE3EA] sticky-col">
                      <input 
                        type="checkbox" 
                        onChange={(e) => handleSelectRow(e, rec.id)}
                        checked={selectedIds.includes(rec.id)}
                        className="rounded border-[#DDE3EA] bg-white text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20 h-4 w-4"
                      />
                    </td>
                    <td className="font-semibold text-[var(--accent-primary)]">{rec.srNo || '-'}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        rec.category === 'Govt' ? 'bg-red-50 text-red-700 border border-red-200' :
                        rec.category === 'Corporate' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        rec.category === 'NGO' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                        rec.category === 'Academic' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        rec.category === 'Political' ? 'bg-red-50 text-red-650 border border-red-200' :
                        'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {rec.category}
                      </span>
                    </td>
                    <td className="font-serif font-bold text-slate-800 text-sm max-w-[220px] truncate">{rec.nameOfOrganization || '-'}</td>
                    <td className="font-medium text-slate-700 max-w-[220px] truncate">{rec.nameOfAuthorisedPerson || '-'}</td>
                    <td className="text-xs text-slate-500 max-w-[160px] truncate">{rec.designation || '-'}</td>
                    <td className="text-xs text-slate-550 max-w-[160px] truncate">{rec.sector || '-'}</td>
                    <td className="text-xs text-slate-550 max-w-[220px] truncate">{rec.strengthExpertise || '-'}</td>
                    <td className="text-xs font-mono text-slate-650 max-w-[180px] truncate">{rec.contactNumber || '-'}</td>
                    <td className="text-xs font-mono text-slate-650 max-w-[200px] truncate">{rec.email || '-'}</td>
                    <td className="text-xs text-slate-500 max-w-[120px] truncate">{rec.state || '-'}</td>
                    <td className="text-xs text-slate-500 max-w-[140px] truncate">{rec.districtCity || '-'}</td>
                    <td className="text-xs text-slate-500 max-w-[140px] truncate">{rec.languages || '-'}</td>
                    <td className="text-xs text-slate-600 max-w-[280px] truncate">{rec.scopeOfCollaboration || '-'}</td>
                    <td>
                      {rec.reliability ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.reliability === 'High' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          rec.reliability === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-red-50 text-red-655 border border-red-200'
                        }`}>
                          {rec.reliability}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="text-xs text-slate-500 max-w-[280px] truncate">{rec.remarks || '-'}</td>
                    <td className="text-center sticky right-0 z-10 border-l border-[#DDE3EA] sticky-col">
                      <div className="inline-flex gap-2">
                        <button 
                          onClick={() => setEditingRecord(rec)}
                          className="p-1 hover:bg-[#F5F7FA] rounded text-slate-500 hover:text-[var(--accent-primary)] transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(rec.id)}
                          className="p-1 hover:bg-[#F5F7FA] rounded text-slate-550 hover:text-red-650 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={17} className="text-center py-24 text-slate-400 text-xs font-medium">No ledger records decrypted matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      {/* Pagination Controls at the Bottom of Vault Data */}
      {renderPagination("bottom")}

      {/* Quick Edit Popup Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE3EA] max-w-3xl w-full rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-fadeIn">
            <button 
              onClick={() => setEditingRecord(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-650"
            >
              <X size={18} />
            </button>
            <h3 className="font-serif text-xl font-bold text-slate-900 mb-6">Modify Ledger relationship entry</h3>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Category Custom Dropdown */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Category *</label>
                  <button
                    type="button"
                    onClick={() => setEditCategoryDropdownOpen(!editCategoryDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{editingRecord.category}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {editCategoryDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setEditCategoryDropdownOpen(false)} />
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search category..."
                          value={editCategorySearch}
                          onChange={(e) => setEditCategorySearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        {categories
                          .filter(c => c.toLowerCase().includes(editCategorySearch.toLowerCase()))
                          .map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setEditingRecord({...editingRecord, category: c});
                                setEditCategoryDropdownOpen(false);
                                setEditCategorySearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${editingRecord.category === c ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
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
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Name of Organization</label>
                  <input
                    type="text"
                    value={editingRecord.nameOfOrganization || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, nameOfOrganization: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Authorized Representative / Expert */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Authorized Representative / Expert</label>
                  <input
                    type="text"
                    value={editingRecord.nameOfAuthorisedPerson || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, nameOfAuthorisedPerson: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Official Designation</label>
                  <input
                    type="text"
                    value={editingRecord.designation || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, designation: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Sector */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Sector Domain</label>
                  <input
                    type="text"
                    value={editingRecord.sector || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, sector: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Strength/Expertise */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Expertise / Specialisation</label>
                  <input
                    type="text"
                    value={editingRecord.strengthExpertise || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, strengthExpertise: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Contact Number</label>
                  <input
                    type="text"
                    value={editingRecord.contactNumber || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, contactNumber: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Email Address</label>
                  <input
                    type="email"
                    value={editingRecord.email || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, email: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* State Custom Dropdown */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">State Jurisdiction</label>
                  <button
                    type="button"
                    onClick={() => setEditStateDropdownOpen(!editStateDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{editingRecord.state || '-- Select State --'}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {editStateDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setEditStateDropdownOpen(false)} />
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search state..."
                          value={editStateSearch}
                          onChange={(e) => setEditStateSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord({...editingRecord, state: ''});
                            setEditStateDropdownOpen(false);
                            setEditStateSearch('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!editingRecord.state ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                        >
                          -- Select State --
                        </button>
                        {INDIAN_STATES
                          .filter(s => s.toLowerCase().includes(editStateSearch.toLowerCase()))
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setEditingRecord({...editingRecord, state: s});
                                setEditStateDropdownOpen(false);
                                setEditStateSearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${editingRecord.state === s ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
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
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">District/City</label>
                  <input
                    type="text"
                    value={editingRecord.districtCity || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, districtCity: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Languages */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Languages Spoken</label>
                  <input
                    type="text"
                    value={editingRecord.languages || ''}
                    onChange={(e) => setEditingRecord({...editingRecord, languages: e.target.value})}
                    className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                  />
                </div>

                {/* Reliability Custom Dropdown */}
                <div className="flex flex-col relative">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Reliability Scale (Rating)</label>
                  <button
                    type="button"
                    onClick={() => setEditReliabilityDropdownOpen(!editReliabilityDropdownOpen)}
                    className="bg-[#F5F7FA] border border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] font-semibold flex justify-between items-center w-full shadow-sm text-left transition-all"
                  >
                    <span>{editingRecord.reliability || 'Unrated'}</span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {editReliabilityDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setEditReliabilityDropdownOpen(false)} />
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE3EA] rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fadeIn"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          placeholder="Search reliability..."
                          value={editReliabilitySearch}
                          onChange={(e) => setEditReliabilitySearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#DDE3EA] rounded-lg text-xs focus:outline-none focus:border-[var(--accent-primary)] mb-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord({...editingRecord, reliability: ''});
                            setEditReliabilityDropdownOpen(false);
                            setEditReliabilitySearch('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${!editingRecord.reliability ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
                        >
                          Unrated
                        </button>
                        {['High', 'Medium', 'Low']
                          .filter(r => r.toLowerCase().includes(editReliabilitySearch.toLowerCase()))
                          .map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setEditingRecord({...editingRecord, reliability: r});
                                setEditReliabilityDropdownOpen(false);
                                setEditReliabilitySearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold ${editingRecord.reliability === r ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold' : 'text-slate-700 hover:bg-[#F5F7FA] transition-colors'}`}
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
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Scope of Collaboration</label>
                <textarea
                  value={editingRecord.scopeOfCollaboration || ''}
                  onChange={(e) => setEditingRecord({...editingRecord, scopeOfCollaboration: e.target.value})}
                  rows={2}
                  className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Remarks</label>
                <textarea
                  value={editingRecord.remarks || ''}
                  onChange={(e) => setEditingRecord({...editingRecord, remarks: e.target.value})}
                  rows={2}
                  className="w-full bg-[#F5F7FA] border border-[#DDE3EA] focus:border-[var(--accent-primary)]/60 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div className="border-t border-[#DDE3EA] pt-4 mt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingRecord(null)} className="btn-frosted text-sm font-semibold">Discard</button>
                <button type="submit" className="btn-gold text-sm font-semibold">
                  <Check size={14} />
                  <span>Update record details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
