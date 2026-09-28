import React, { useState, useRef } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { 
  FileUp, 
  Map, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Trash2, 
  ArrowRight,
  Database,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function Ingest({ setCurrentTab }) {
  const { 
    uploadFilePreview, 
    importFileFinal, 
    uploadPreview, 
    uploadLoading, 
    uploadError 
  } = useVaultStore();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Validation Review & Commit
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      await processUpload(file);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      await processUpload(file);
    }
  };

  const processUpload = async (file) => {
    const preview = await uploadFilePreview(file);
    if (preview) {
      setMapping(preview.recommendedMapping);
      setStep(2);
    }
  };

  const handleMappingChange = (rawHeader, targetKey) => {
    setMapping(prev => ({
      ...prev,
      [rawHeader]: targetKey
    }));
  };

  const handleCommitMapping = async () => {
    try {
      const result = await importFileFinal(uploadPreview.filePath, mapping);
      setImportResult(result);
      setStep(3);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setStep(1);
    setImportResult(null);
  };

  const allowedDbColumns = [
    { key: 'category', label: 'Category (Govt/NGO/etc)' },
    { key: 'nameOfOrganization', label: 'Name of Organization' },
    { key: 'nameOfAuthorisedPerson', label: 'Name of Authorised Person/ Expert' },
    { key: 'designation', label: 'Designation' },
    { key: 'sector', label: 'Sector' },
    { key: 'strengthExpertise', label: 'Strength/ Expertise/ Specilisation' },
    { key: 'contactNumber', label: 'Contact Number' },
    { key: 'email', label: 'Email' },
    { key: 'state', label: 'State' },
    { key: 'districtCity', label: 'District/City' },
    { key: 'languages', label: 'Languages' },
    { key: 'scopeOfCollaboration', label: 'Scope of Collaboration' },
    { key: 'reliability', label: 'Reliability (Time, Resource, etc)' },
    { key: 'remarks', label: 'Remarks' }
  ];

  return (
    <div className="space-y-8 pb-10 text-slate-800">
      
      {/* Title */}
      <div>
        <h2 className="font-serif text-3xl font-bold tracking-wide text-slate-900">
          Smart Ingestion <span className="font-normal italic text-[var(--accent-primary)]">Engine</span>
        </h2>
        <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-medium">
          Drag and drop messy spreadsheets and map columns into high-value relationship profiles
        </p>
      </div>

      <div className="flex justify-center w-full">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Upload Steps Progress Bar */}
          <div className="flex items-center gap-4 max-w-xl bg-white border border-[#DDE3EA] p-4 rounded-2xl text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
            <span className={step === 1 ? 'text-[var(--accent-primary)] font-bold' : 'text-slate-400'}>1. Load Ledger</span>
            <ArrowRight size={12} className="text-slate-300" />
            <span className={step === 2 ? 'text-[var(--accent-primary)] font-bold' : 'text-slate-400'}>2. Align AI Mapping</span>
            <ArrowRight size={12} className="text-slate-300" />
            <span className={step === 3 ? 'text-[var(--accent-primary)] font-bold' : 'text-slate-400'}>3. Commit Vault Records</span>
          </div>

          {/* Step 1: Upload Drag Area */}
          {step === 1 && (
            <div className="w-full">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`h-72 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 relative group ${
                  dragActive 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)]' 
                    : 'border-[#DDE3EA] hover:border-[var(--accent-primary)]/40 bg-white hover:bg-slate-50 shadow-sm'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  className="hidden" 
                  accept=".csv,.xlsx,.xls"
                />
                {uploadLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="text-[var(--accent-primary)] animate-spin" size={40} />
                    <span className="text-slate-800 font-serif italic text-lg">Decrypting dataset rows...</span>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white border border-[#DDE3EA] rounded-2xl text-[var(--accent-primary)] group-hover:scale-110 duration-300 shadow-sm">
                      <FileUp size={32} />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-slate-800 mt-4">Select or Drop spreadsheet file</h3>
                    <p className="text-slate-500 text-xs mt-2 max-w-sm">Supports Microsoft Excel (.xlsx, .xls) and standard text delimited CSV exports.</p>
                    <div className="mt-4 px-3 py-1 bg-[#ECEFF4] border border-[#DDE3EA] rounded-full text-[10px] text-[var(--accent-primary)] flex items-center gap-1 font-semibold">
                      <Sparkles size={10} className="text-[var(--accent-primary)] animate-pulse" />
                      <span>Includes automatic phone & email normalizer</span>
                    </div>
                  </>
                )}
              </div>
              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-650 rounded-2xl text-xs font-semibold">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Custom Mapping Alignments */}
          {step === 2 && uploadPreview && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Smart Columns Match Board */}
              <div className="xl:col-span-2 space-y-6">
                <div className="vault-card">
                  <div className="flex items-center justify-between border-b border-[#DDE3EA] pb-4 mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Map size={14} className="text-[var(--accent-primary)]" />
                      <span>Align AI Column Mapping</span>
                    </h3>
                    <button 
                      onClick={handleReset}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 border border-red-200 px-2.5 py-1 rounded-lg bg-red-50"
                    >
                      <Trash2 size={12} />
                      <span>Discard Ingestion</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                    {uploadPreview.headers.map((header) => (
                      <div key={header} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[#F5F7FA] border border-[#DDE3EA] rounded-xl hover:border-[var(--accent-primary)]/30 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Raw Column Header</span>
                          <span className="text-sm font-serif font-bold text-slate-800 mt-1">{header}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-400 text-[10px]">→ Maps To →</span>
                          <select
                            value={mapping[header] || ''}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                            className="bg-white border border-[#DDE3EA] text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-semibold shadow-sm"
                          >
                            <option value="">-- Drop Column / Skip --</option>
                            {allowedDbColumns.map((col) => (
                              <option key={col.key} value={col.key}>
                                {col.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#DDE3EA] pt-6 mt-6 flex justify-end gap-3">
                    <button onClick={handleReset} className="btn-frosted text-sm font-semibold">Cancel</button>
                    <button onClick={handleCommitMapping} className="btn-gold">
                      <span>Commit to Vault Ledger</span>
                      <Database size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded File preview sidebar */}
              <div className="xl:col-span-1 space-y-6">
                <div className="vault-card">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Ingested Spreadsheet info</h3>
                  <div className="space-y-4 text-xs font-semibold">
                    <div className="flex justify-between border-b border-[#DDE3EA] pb-2">
                      <span className="text-slate-500">File Name:</span>
                      <span className="text-slate-800">{uploadPreview.fileName}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#DDE3EA] pb-2">
                      <span className="text-slate-500">Total Records:</span>
                      <span className="text-slate-900 font-bold text-sm">{uploadPreview.totalRows} Rows</span>
                    </div>
                    <div className="flex justify-between border-b border-[#DDE3EA] pb-2">
                      <span className="text-slate-500">Columns Discovered:</span>
                      <span className="text-slate-800">{uploadPreview.headers.length}</span>
                    </div>
                  </div>
                </div>

                <div className="vault-card">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Ingested Rows Sample (First 2)</h3>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {uploadPreview.preview.slice(0, 2).map((row, idx) => (
                      <div key={idx} className="p-3 bg-[#F5F7FA] rounded-xl border border-[#DDE3EA] text-[10px] space-y-1">
                        {Object.entries(row).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-slate-500 font-semibold">{k}:</span>
                            <span className="text-slate-700 truncate pl-4">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Step 3: Success logs & Duplicate diagnostic summary */}
          {step === 3 && importResult && (
            <div className="space-y-6">
              <div className="vault-card text-center py-10">
                <div className="inline-flex h-16 w-16 rounded-full bg-emerald-50 border border-emerald-250 items-center justify-center text-emerald-600 mb-4 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-serif text-2xl font-bold text-slate-900">Ingestion Transaction Successful</h3>
                <p className="text-slate-550 text-xs uppercase tracking-widest mt-1 font-bold">Cleared and logged to executive repository</p>
                
                {/* Import Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
                  <div className="p-4 bg-[#F5F7FA] border border-[#DDE3EA] rounded-2xl">
                    <span className="block text-[10px] text-slate-555 uppercase tracking-wider font-bold">Imported</span>
                    <span className="block text-2xl font-bold text-emerald-650 mt-1">{importResult.importLog.successfullyImported}</span>
                  </div>
                  <div className="p-4 bg-[#F5F7FA] border border-[#DDE3EA] rounded-2xl">
                    <span className="block text-[10px] text-slate-555 uppercase tracking-wider font-bold">Duplicate SKips</span>
                    <span className="block text-2xl font-bold text-amber-600 mt-1">{importResult.importLog.duplicateRows}</span>
                  </div>
                  <div className="p-4 bg-[#F5F7FA] border border-[#DDE3EA] rounded-2xl">
                    <span className="block text-[10px] text-slate-555 uppercase tracking-wider font-bold">Malformed skips</span>
                    <span className="block text-2xl font-bold text-red-600 mt-1">{importResult.importLog.failedRows}</span>
                  </div>
                  <div className="p-4 bg-[#F5F7FA] border border-[#DDE3EA] rounded-2xl">
                    <span className="block text-[10px] text-slate-555 uppercase tracking-wider font-bold">Total rows in file</span>
                    <span className="block text-2xl font-bold text-slate-800 mt-1">{importResult.importLog.totalRows}</span>
                  </div>
                </div>

                {/* If duplicate warning triggers are present */}
                {importResult.importLog.duplicateRows > 0 && (
                  <div className="max-w-2xl mx-auto mt-6 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-xs font-semibold flex items-center gap-3">
                    <AlertTriangle size={18} className="shrink-0 animate-bounce" />
                    <span className="text-left leading-relaxed">
                      We identified and bypassed **{importResult.importLog.duplicateRows} duplicate records** using unique email, contact numbers, or organization matching values to safeguard ledger integrity.
                    </span>
                  </div>
                )}

                <div className="mt-8 flex justify-center gap-4">
                  <button 
                    onClick={() => setCurrentTab('records')}
                    className="btn-gold text-sm font-semibold"
                  >
                    <span>Navigate to Relationship Table</span>
                  </button>
                  <button 
                    onClick={handleReset}
                    className="btn-frosted text-sm font-semibold"
                  >
                    <span>Upload Another spreadsheet</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic Log Table */}
              {importResult.logs && importResult.logs.length > 0 && (
                <div className="vault-card">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-800 mb-4">Diagnostics Log Trail</h4>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#DDE3EA] bg-[#F5F7FA]">
                          <th className="p-3 text-slate-500 uppercase tracking-wider font-semibold">Sheet / Row No</th>
                          <th className="p-3 text-slate-500 uppercase tracking-wider font-semibold">Trigger Cause</th>
                          <th className="p-3 text-slate-500 uppercase tracking-wider font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.logs.map((log, idx) => (
                          <tr key={idx} className="border-b border-[#DDE3EA]/45 bg-white">
                            <td className="p-3 font-bold text-[var(--accent-primary)]">
                              {log.sheetName && log.sheetName !== 'N/A' ? `${log.sheetName} (Row ${log.rowNumber})` : `Row ${log.rowNumber}`}
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">{log.error}</td>
                            <td className="p-3 text-slate-550">
                              {log.warnings.length > 0 ? log.warnings.join(', ') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
