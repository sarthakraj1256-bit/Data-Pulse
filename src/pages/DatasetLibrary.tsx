import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Search,
  FlaskConical,
  Calendar,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Filter,
  ArrowUpDown,
  X,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  CornerDownLeft,
  Check,
  Eye,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { ExportService } from '../services/exportService';
import { Dataset } from '../types';
import { QuickViewModal } from '../components/common/QuickViewModal';

interface DatasetLibraryProps {
  navigate: (path: string) => void;
}

type SortOptionType = 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc' | 'rows_desc' | 'name_asc';

export const DatasetLibrary: React.FC<DatasetLibraryProps> = ({ navigate }) => {
  const {
    datasets,
    currentDataset,
    selectDataset,
    deleteDataset,
    bulkDeleteDatasets,
    loadSyntheticBenchmark,
    updateDatasetTags,
    notifyExportComplete
  } = useDataset();

  // Search, tag, date, sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOptionType>('date_desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Bulk selection states
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Quick View drawer modal state
  const [quickViewDataset, setQuickViewDataset] = useState<Dataset | null>(null);

  // Predictive search dropdown visibility and keyboard navigation
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inline Tag Editing on Cards
  const [editingTagDatasetId, setEditingTagDatasetId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Close predictive suggestion on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close bulk delete modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBulkDeleteModalOpen) {
        setIsBulkDeleteModalOpen(false);
      }
    };
    if (isBulkDeleteModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBulkDeleteModalOpen]);

  // Collect all unique tags across all datasets (both custom tags & derived tags)
  const allAvailableTags = useMemo(() => {
    const tagSet = new Map<string, { id: string; label: string; count: number; isCustom?: boolean }>();

    // Standard system filters
    tagSet.set('synthetic', {
      id: 'synthetic',
      label: 'Synthetic Benchmark',
      count: datasets.filter(d => d.isSynthetic).length,
    });
    tagSet.set('csv', {
      id: 'csv',
      label: 'CSV Format',
      count: datasets.filter(d => d.fileType === 'csv').length,
    });
    tagSet.set('xlsx', {
      id: 'xlsx',
      label: 'Excel XLSX',
      count: datasets.filter(d => d.fileType === 'xlsx').length,
    });
    tagSet.set('json', {
      id: 'json',
      label: 'JSON Format',
      count: datasets.filter(d => d.fileType === 'json').length,
    });
    tagSet.set('healthy', {
      id: 'healthy',
      label: 'Healthy (Score ≥ 90%)',
      count: datasets.filter(d => d.qualityAssessment.overallScore >= 90).length,
    });
    tagSet.set('needs-attention', {
      id: 'needs-attention',
      label: 'Needs Attention (Score < 70%)',
      count: datasets.filter(d => d.qualityAssessment.overallScore < 70).length,
    });
    tagSet.set('transformed', {
      id: 'transformed',
      label: 'Transformed / Has Traces',
      count: datasets.filter(d => d.lineage && d.lineage.length > 0).length,
    });

    // Custom tags from dataset objects
    datasets.forEach(d => {
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => {
          const clean = t.trim().toLowerCase();
          if (clean && !tagSet.has(clean)) {
            const count = datasets.filter(ds => ds.tags?.includes(clean)).length;
            tagSet.set(clean, {
              id: clean,
              label: `#${clean}`,
              count,
              isCustom: true,
            });
          }
        });
      }
    });

    return Array.from(tagSet.values());
  }, [datasets]);

  // Predictive suggestions matching user query
  const predictiveSuggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1. Matching dataset names
    const names = datasets
      .filter(d => {
        if (!term) return false;
        return (
          d.name.toLowerCase().includes(term) ||
          d.fileName.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term)
        );
      })
      .slice(0, 4);

    // 2. Matching tags
    const tags = allAvailableTags
      .filter(t => {
        if (!term) return t.count > 0;
        return t.id.toLowerCase().includes(term) || t.label.toLowerCase().includes(term);
      })
      .slice(0, 5);

    // 3. Matching dates (month or year in query)
    const dates = datasets
      .map(d => {
        const fullDate = new Date(d.createdAt).toLocaleDateString([], {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const monthYear = new Date(d.createdAt).toLocaleDateString([], {
          month: 'long',
          year: 'numeric',
        });
        return { fullDate, monthYear, iso: d.createdAt.split('T')[0] };
      })
      .filter(d => {
        if (!term) return false;
        return (
          d.fullDate.toLowerCase().includes(term) ||
          d.monthYear.toLowerCase().includes(term) ||
          d.iso.includes(term) ||
          (term === 'today' && d.iso === new Date().toISOString().split('T')[0])
        );
      })
      .map(d => d.monthYear)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);

    return { names, tags, dates };
  }, [datasets, searchTerm, allAvailableTags]);

  // Flatten suggestions for keyboard navigation
  const flatSuggestions = useMemo(() => {
    const items: Array<{ type: 'name' | 'tag' | 'date'; data: any }> = [];
    predictiveSuggestions.names.forEach(d => items.push({ type: 'name', data: d }));
    predictiveSuggestions.tags.forEach(t => items.push({ type: 'tag', data: t }));
    predictiveSuggestions.dates.forEach(dt => items.push({ type: 'date', data: dt }));
    return items;
  }, [predictiveSuggestions]);

  // Filter & sort datasets
  const filteredAndSortedDatasets = useMemo(() => {
    return datasets
      .filter(d => {
        // Text search across name, fileName, description, tags, and date
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = d.name.toLowerCase().includes(term);
          const matchFile = d.fileName.toLowerCase().includes(term);
          const matchDesc = d.description.toLowerCase().includes(term);
          const matchTag = d.tags?.some(t => t.toLowerCase().includes(term));
          const matchDate = new Date(d.createdAt).toLocaleDateString().toLowerCase().includes(term) ||
            new Date(d.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' }).toLowerCase().includes(term);
          if (!matchName && !matchFile && !matchDesc && !matchTag && !matchDate) return false;
        }

        // Tag filter
        if (selectedTag !== 'all') {
          if (selectedTag === 'synthetic' && !d.isSynthetic) return false;
          else if (selectedTag === 'csv' && d.fileType !== 'csv') return false;
          else if (selectedTag === 'xlsx' && d.fileType !== 'xlsx') return false;
          else if (selectedTag === 'json' && d.fileType !== 'json') return false;
          else if (selectedTag === 'healthy' && d.qualityAssessment.overallScore < 90) return false;
          else if (selectedTag === 'needs-attention' && d.qualityAssessment.overallScore >= 70) return false;
          else if (selectedTag === 'transformed' && (!d.lineage || d.lineage.length === 0)) return false;
          else if (!['synthetic', 'csv', 'xlsx', 'json', 'healthy', 'needs-attention', 'transformed'].includes(selectedTag)) {
            // Custom tag match
            if (!d.tags || !d.tags.map(t => t.toLowerCase()).includes(selectedTag.toLowerCase())) {
              return false;
            }
          }
        }

        // Date filter
        if (selectedDateFilter !== 'all') {
          const created = new Date(d.createdAt).getTime();
          const now = Date.now();
          const diffHours = (now - created) / (1000 * 60 * 60);

          if (selectedDateFilter === 'today' && diffHours > 24) return false;
          if (selectedDateFilter === '7days' && diffHours > 24 * 7) return false;
          if (selectedDateFilter === '30days' && diffHours > 24 * 30) return false;
          if (selectedDateFilter.startsWith('month:')) {
            const targetMonth = selectedDateFilter.replace('month:', '').toLowerCase();
            const createdMonth = new Date(d.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' }).toLowerCase();
            if (createdMonth !== targetMonth) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date_desc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'date_asc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'score_desc':
            return b.qualityAssessment.overallScore - a.qualityAssessment.overallScore;
          case 'score_asc':
            return a.qualityAssessment.overallScore - b.qualityAssessment.overallScore;
          case 'rows_desc':
            return b.rowCount - a.rowCount;
          case 'name_asc':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [datasets, searchTerm, selectedTag, selectedDateFilter, sortBy]);

  // Bulk selection helper handlers
  const toggleSelectDataset = (id: string) => {
    setSelectedDatasetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected =
    filteredAndSortedDatasets.length > 0 &&
    filteredAndSortedDatasets.every(d => selectedDatasetIds.has(d.id));

  const isIndeterminate =
    selectedDatasetIds.size > 0 &&
    !isAllSelected &&
    filteredAndSortedDatasets.some(d => selectedDatasetIds.has(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDatasetIds(new Set());
    } else {
      setSelectedDatasetIds(new Set(filteredAndSortedDatasets.map(d => d.id)));
    }
  };

  const handleConfirmBulkDelete = () => {
    const ids = Array.from(selectedDatasetIds);
    if (ids.length > 0) {
      const success = bulkDeleteDatasets(ids);
      if (success) {
        setSelectedDatasetIds(new Set());
      }
      setIsBulkDeleteModalOpen(false);
    }
  };

  const activeFiltersCount =
    (selectedTag !== 'all' ? 1 : 0) +
    (selectedDateFilter !== 'all' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedTag('all');
    setSelectedDateFilter('all');
    setIsSuggestOpen(false);
    setActiveSuggestionIndex(-1);
  };

  // Keyboard navigation for predictive search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || flatSuggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsSuggestOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < flatSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : flatSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < flatSuggestions.length) {
        const item = flatSuggestions[activeSuggestionIndex];
        selectPredictiveItem(item);
      } else {
        setIsSuggestOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const selectPredictiveItem = (item: { type: 'name' | 'tag' | 'date'; data: any }) => {
    if (item.type === 'name') {
      selectDataset(item.data.id);
      setIsSuggestOpen(false);
      navigate(`/app/datasets/${item.data.id}`);
    } else if (item.type === 'tag') {
      setSelectedTag(item.data.id);
      setSearchTerm('');
      setIsSuggestOpen(false);
    } else if (item.type === 'date') {
      setSelectedDateFilter(`month:${item.data.toLowerCase()}`);
      setSearchTerm('');
      setIsSuggestOpen(false);
    }
  };

  // Tag editing functions for dataset cards
  const handleAddTag = (datasetId: string) => {
    if (!newTagInput.trim()) return;
    const ds = datasets.find(d => d.id === datasetId);
    if (!ds) return;
    const existing = ds.tags || [];
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!existing.includes(cleanTag)) {
      updateDatasetTags(datasetId, [...existing, cleanTag]);
    }
    setNewTagInput('');
    setEditingTagDatasetId(null);
  };

  const handleRemoveTag = (datasetId: string, tagToRemove: string) => {
    const ds = datasets.find(d => d.id === datasetId);
    if (!ds) return;
    const updated = (ds.tags || []).filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    updateDatasetTags(datasetId, updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
            Dataset Library
          </h1>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Manage, discover, and branch your ingested data assets with predictive search across name, tag, or creation date.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadSyntheticBenchmark()}
            className="px-4 py-2 rounded-xl bg-[#F8EFE5] border border-[#D9A0AE]/40 text-[#641B32] font-semibold text-xs hover:bg-[#FFF8EF] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Load Synthetic Benchmark</span>
          </button>
          <button
            onClick={() => navigate('/app/upload')}
            className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>
        </div>
      </div>

      {/* Predictive Search and Controls Bar */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Predictive Search Input Container */}
          <div ref={searchContainerRef} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756772]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search datasets by name, tag (e.g. #synthetic, #csv), or date (e.g. October 2026, today)..."
              value={searchTerm}
              onFocus={() => setIsSuggestOpen(true)}
              onKeyDown={handleKeyDown}
              onChange={e => {
                setSearchTerm(e.target.value);
                setIsSuggestOpen(true);
                setActiveSuggestionIndex(-1);
              }}
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl text-[#29212A] placeholder-[#756772]/70 focus:outline-none focus:border-[#641B32] focus:ring-1 focus:ring-[#641B32]/30 shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756772] hover:text-[#29212A]"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Predictive Suggestions Dropdown Menu */}
            {isSuggestOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-2xl shadow-2xl p-3.5 z-40 space-y-3.5 animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto">
                {/* Header Hint */}
                <div className="flex items-center justify-between pb-1.5 border-b border-[#D9A0AE]/20 text-[10px] text-[#756772] font-mono">
                  <span>Predictive Intelligence Suggestions</span>
                  <span className="flex items-center gap-1">
                    <span>Use ↑↓ to navigate</span>
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </span>
                </div>

                {/* 1. Matching Datasets by Name */}
                {predictiveSuggestions.names.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-bold block mb-1.5 flex items-center gap-1">
                      <Database className="w-3 h-3 text-[#641B32]" />
                      Matching Datasets by Name
                    </span>
                    <div className="space-y-1">
                      {predictiveSuggestions.names.map(d => {
                        const globalIndex = flatSuggestions.findIndex(
                          item => item.type === 'name' && item.data.id === d.id
                        );
                        const isKeyboardActive = activeSuggestionIndex === globalIndex;

                        return (
                          <button
                            key={d.id}
                            onClick={() => selectPredictiveItem({ type: 'name', data: d })}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between text-[#29212A] group transition-all ${
                              isKeyboardActive
                                ? 'bg-[#641B32] text-[#FFF8EF]'
                                : 'hover:bg-[#F8EFE5]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                                  isKeyboardActive
                                    ? 'bg-[#FFF8EF]/20 text-[#FFF8EF]'
                                    : 'bg-[#F8EFE5] text-[#641B32] border border-[#D9A0AE]/20'
                                }`}
                              >
                                {d.fileType}
                              </span>
                              <span className="font-semibold truncate">{d.name}</span>
                              <span
                                className={`text-[10px] font-mono ${
                                  isKeyboardActive ? 'text-[#FFF8EF]/80' : 'text-[#756772]'
                                }`}
                              >
                                ({d.rowCount} rows)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  d.qualityAssessment.overallScore >= 90
                                    ? 'bg-[#277A58]/20 text-[#277A58]'
                                    : d.qualityAssessment.overallScore >= 70
                                    ? 'bg-[#B77722]/20 text-[#B77722]'
                                    : 'bg-[#B4233D]/20 text-[#B4233D]'
                                } ${isKeyboardActive ? 'bg-[#FFF8EF] text-[#29212A]' : ''}`}
                              >
                                {d.qualityAssessment.overallScore}%
                              </span>
                              <span
                                className={`text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isKeyboardActive ? 'opacity-100 text-[#FFF8EF]' : 'text-[#641B32]'
                                }`}
                              >
                                Open →
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Matching Tags */}
                {predictiveSuggestions.tags.length > 0 && (
                  <div className="pt-2 border-t border-[#D9A0AE]/20">
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-bold block mb-1.5 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#641B32]" />
                      Filter by Matching Tag
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {predictiveSuggestions.tags.map(t => {
                        const globalIndex = flatSuggestions.findIndex(
                          item => item.type === 'tag' && item.data.id === t.id
                        );
                        const isKeyboardActive = activeSuggestionIndex === globalIndex;

                        return (
                          <button
                            key={t.id}
                            onClick={() => selectPredictiveItem({ type: 'tag', data: t })}
                            className={`px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 ${
                              isKeyboardActive
                                ? 'bg-[#641B32] text-[#FFF8EF] shadow-sm'
                                : 'bg-[#F8EFE5] text-[#641B32] hover:bg-[#641B32] hover:text-[#FFF8EF] border border-[#D9A0AE]/30'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                            <span>{t.label}</span>
                            <span className="text-[10px] font-mono opacity-75">({t.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Matching Creation Periods */}
                {predictiveSuggestions.dates.length > 0 && (
                  <div className="pt-2 border-t border-[#D9A0AE]/20">
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-bold block mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#641B32]" />
                      Filter by Creation Period
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {predictiveSuggestions.dates.map(dateText => {
                        const globalIndex = flatSuggestions.findIndex(
                          item => item.type === 'date' && item.data === dateText
                        );
                        const isKeyboardActive = activeSuggestionIndex === globalIndex;

                        return (
                          <button
                            key={dateText}
                            onClick={() => selectPredictiveItem({ type: 'date', data: dateText })}
                            className={`px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5 ${
                              isKeyboardActive
                                ? 'bg-[#3D1023] text-[#FFF8EF] shadow-sm'
                                : 'bg-[#F8EFE5] text-[#3D1023] hover:bg-[#3D1023] hover:text-[#FFF8EF] border border-[#D9A0AE]/30'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Created in {dateText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State in Suggestions */}
                {searchTerm.trim() &&
                  predictiveSuggestions.names.length === 0 &&
                  predictiveSuggestions.tags.length === 0 &&
                  predictiveSuggestions.dates.length === 0 && (
                    <div className="py-3 text-center text-xs text-[#756772]">
                      No direct predictive matches for "{searchTerm}". Press Enter to search raw textual metadata.
                    </div>
                  )}

                {/* Quick suggestions when input is empty */}
                {!searchTerm.trim() && (
                  <div className="pt-2 text-xs text-[#756772] space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#756772] font-bold block">
                      Quick Discovery Suggestions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedTag('synthetic')}
                        className="px-2 py-1 rounded-md bg-[#F8EFE5] text-[#641B32] hover:bg-[#641B32] hover:text-[#FFF8EF] text-[11px]"
                      >
                        #synthetic benchmark
                      </button>
                      <button
                        onClick={() => setSelectedTag('healthy')}
                        className="px-2 py-1 rounded-md bg-[#F8EFE5] text-[#277A58] hover:bg-[#277A58] hover:text-[#FFF8EF] text-[11px]"
                      >
                        #healthy (&ge;90%)
                      </button>
                      <button
                        onClick={() => setSelectedDateFilter('today')}
                        className="px-2 py-1 rounded-md bg-[#F8EFE5] text-[#3D1023] hover:bg-[#3D1023] hover:text-[#FFF8EF] text-[11px]"
                      >
                        Created Today
                      </button>
                      <button
                        onClick={() => setSelectedTag('transformed')}
                        className="px-2 py-1 rounded-md bg-[#F8EFE5] text-[#B94B68] hover:bg-[#B94B68] hover:text-[#FFF8EF] text-[11px]"
                      >
                        #has lineage traces
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Creation Date Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedDateFilter}
                onChange={e => setSelectedDateFilter(e.target.value)}
                className="text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-3 py-2.5 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32] appearance-none pr-8 cursor-pointer shadow-xs"
                aria-label="Filter by creation date"
              >
                <option value="all">All Dates</option>
                <option value="today">Created Today (&lt;24h)</option>
                <option value="7days">Past 7 Days</option>
                <option value="30days">Past 30 Days</option>
                {selectedDateFilter.startsWith('month:') && (
                  <option value={selectedDateFilter}>
                    Month: {selectedDateFilter.replace('month:', '')}
                  </option>
                )}
              </select>
              <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#756772] pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOptionType)}
                className="text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-xl px-3 py-2.5 text-[#29212A] font-medium focus:outline-none focus:border-[#641B32] appearance-none pr-8 cursor-pointer shadow-xs"
                aria-label="Sort datasets"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="score_desc">Quality Score (High to Low)</option>
                <option value="score_asc">Quality Score (Low to High)</option>
                <option value="rows_desc">Rows Count (Largest)</option>
                <option value="name_asc">Name (A to Z)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#756772] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tag Filters Row with Tag Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-[#D9A0AE]/20">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs flex-wrap">
            <span className="text-[11px] font-semibold text-[#756772] mr-1 flex items-center gap-1 shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#641B32]" />
              Tags:
            </span>

            {/* All Tag */}
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedTag === 'all'
                  ? 'bg-[#641B32] text-[#FFF8EF] shadow-xs'
                  : 'bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[#756772] hover:text-[#29212A]'
              }`}
            >
              All ({datasets.length})
            </button>

            {/* Standard System Tags */}
            {allAvailableTags
              .filter(t => !t.isCustom)
              .map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTag(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedTag === t.id
                      ? 'bg-[#641B32] text-[#FFF8EF] shadow-xs'
                      : 'bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[#756772] hover:text-[#29212A]'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}

            {/* Custom User Tags */}
            {allAvailableTags
              .filter(t => t.isCustom)
              .map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTag(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedTag === t.id
                      ? 'bg-[#B94B68] text-[#FFF8EF] shadow-xs'
                      : 'bg-[#FFF8EF] border border-[#D9A0AE]/30 text-[#B94B68] hover:bg-[#B94B68]/10'
                  }`}
                >
                  #{t.id} ({t.count})
                </button>
              ))}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-[#641B32] hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset All ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Active Filter Pills Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 text-xs">
            <span className="text-[11px] text-[#756772]">Active Filters:</span>
            {searchTerm.trim() && (
              <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] flex items-center gap-1 text-[11px]">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:text-[#29212A]"
                  aria-label="Remove search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTag !== 'all' && (
              <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#641B32] flex items-center gap-1 text-[11px]">
                Tag: #{selectedTag}
                <button
                  onClick={() => setSelectedTag('all')}
                  className="hover:text-[#29212A]"
                  aria-label="Remove tag filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDateFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-full bg-[#FFF8EF] border border-[#D9A0AE]/40 text-[#3D1023] flex items-center gap-1 text-[11px]">
                Date: {selectedDateFilter.replace('month:', '')}
                <button
                  onClick={() => setSelectedDateFilter('all')}
                  className="hover:text-[#29212A]"
                  aria-label="Remove date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="text-[11px] font-mono text-[#756772] ml-auto">
              Found {filteredAndSortedDatasets.length} of {datasets.length} dataset(s)
            </span>
          </div>
        )}
      </div>

      {/* Bulk Selection & Actions Toolbar */}
      {filteredAndSortedDatasets.length > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl shadow-xs flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#29212A] hover:text-[#641B32] transition-colors focus:outline-none"
              aria-label={isAllSelected ? 'Deselect all datasets' : 'Select all datasets'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#641B32]" />
              ) : isIndeterminate ? (
                <div className="w-4 h-4 rounded border border-[#641B32] bg-[#F8EFE5] flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-[#641B32]" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-[#756772]" />
              )}
              <span>
                {selectedDatasetIds.size > 0
                  ? `${selectedDatasetIds.size} of ${filteredAndSortedDatasets.length} selected`
                  : `Select All (${filteredAndSortedDatasets.length})`}
              </span>
            </button>

            {selectedDatasetIds.size > 0 && (
              <button
                onClick={() => setSelectedDatasetIds(new Set())}
                className="text-xs text-[#756772] hover:text-[#29212A] hover:underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedDatasetIds.size > 0 ? (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#B4233D] text-[#FFF8EF] text-xs font-bold hover:bg-[#8B182C] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bulk Delete ({selectedDatasetIds.size})</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#756772] hidden sm:inline">
                Select datasets via checkboxes for batch operations
              </span>
            )}
          </div>
        </div>
      )}

      {/* Datasets Grid */}
      {filteredAndSortedDatasets.length === 0 ? (
        <div className="bg-[#F8EFE5]/50 border border-[#D9A0AE]/30 rounded-3xl p-10 text-center">
          <Database className="w-10 h-10 text-[#756772] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif font-bold text-base text-[#29212A]">No Matching Datasets Found</h3>
          <p className="text-xs text-[#756772] mt-1 max-w-sm mx-auto">
            {activeFiltersCount > 0
              ? 'No dataset matches your active filter criteria. Try adjusting your query or resetting filters.'
              : 'Your library is empty. Upload a CSV, XLSX, or JSON file to begin.'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] text-xs font-bold hover:bg-[#3D1023] transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedDatasets.map(ds => {
            const isSelected = currentDataset?.id === ds.id;
            const isBulkSelected = selectedDatasetIds.has(ds.id);
            const score = ds.qualityAssessment.overallScore;
            const tags = ds.tags || (ds.isSynthetic ? ['synthetic', 'iot-telemetry', 'benchmark', 'csv'] : [ds.fileType, 'raw']);

            return (
              <div
                key={ds.id}
                className={`border rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between ${
                  isBulkSelected
                    ? 'border-[#641B32] ring-2 ring-[#641B32] bg-[#F8EFE5]/50 shadow-md'
                    : isSelected
                    ? 'border-[#641B32] ring-1 ring-[#641B32]/40 bg-[#FFF8EF]'
                    : 'bg-[#FFF8EF] border-[#D9A0AE]/30 hover:border-[#641B32]/50'
                }`}
              >
                <div>
                  {/* Card top badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Checkbox button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleSelectDataset(ds.id);
                        }}
                        className="text-[#641B32] hover:text-[#3D1023] p-0.5 rounded transition-colors focus:outline-none"
                        title={isBulkSelected ? 'Deselect dataset' : 'Select dataset for bulk action'}
                        aria-label={`Select ${ds.name}`}
                      >
                        {isBulkSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#641B32]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#756772]/70 hover:text-[#641B32]" />
                        )}
                      </button>

                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#F8EFE5] text-[#641B32] font-semibold border border-[#D9A0AE]/20">
                        {ds.fileType.toUpperCase()}
                      </span>
                      {ds.isSynthetic && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#B77722]/10 text-[#B77722] font-bold border border-[#B77722]/20">
                          Synthetic
                        </span>
                      )}
                      {ds.lineage && ds.lineage.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#B94B68]/10 text-[#B94B68] font-bold border border-[#B94B68]/20">
                          {ds.lineage.length} trace{ds.lineage.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        score >= 90
                          ? 'bg-[#277A58]/10 text-[#277A58] border-[#277A58]/20'
                          : score >= 70
                          ? 'bg-[#B77722]/10 text-[#B77722] border-[#B77722]/20'
                          : 'bg-[#B4233D]/10 text-[#B4233D] border-[#B4233D]/20'
                      }`}
                    >
                      {score}% Score
                    </span>
                  </div>

                  {/* Title and desc */}
                  <h3 className="font-bold text-sm text-[#29212A] mb-1 line-clamp-1">
                    {ds.name}
                  </h3>
                  <p className="text-xs text-[#756772] line-clamp-2 mb-3 leading-relaxed">
                    {ds.description}
                  </p>

                  {/* Tags Row with Add/Remove custom tags */}
                  <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8EFE5] text-[10px] font-mono text-[#641B32] border border-[#D9A0AE]/20 group"
                      >
                        <button
                          onClick={() => setSelectedTag(tag)}
                          className="hover:underline"
                          title={`Filter by tag #${tag}`}
                        >
                          #{tag}
                        </button>
                        {editingTagDatasetId === ds.id && (
                          <button
                            onClick={() => handleRemoveTag(ds.id, tag)}
                            className="hover:text-[#B4233D] ml-0.5"
                            title="Remove tag"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}

                    {/* Inline Tag Add input */}
                    {editingTagDatasetId === ds.id ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="tag..."
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddTag(ds.id);
                            if (e.key === 'Escape') setEditingTagDatasetId(null);
                          }}
                          className="w-16 px-1.5 py-0.5 text-[10px] font-mono bg-[#FFF8EF] border border-[#641B32] rounded focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddTag(ds.id)}
                          className="text-[#277A58] hover:text-[#3D1023]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingTagDatasetId(null)}
                          className="text-[#756772] hover:text-[#29212A]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingTagDatasetId(ds.id);
                          setNewTagInput('');
                        }}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-[#756772] hover:text-[#641B32] hover:bg-[#F8EFE5] border border-dashed border-[#D9A0AE]/40 flex items-center gap-0.5 transition-colors"
                        title="Add custom tag"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>tag</span>
                      </button>
                    )}
                  </div>

                  {/* Metrics preview */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#F8EFE5] rounded-xl text-center text-xs mb-3">
                    <div>
                      <div className="text-[10px] text-[#756772] uppercase font-mono">Rows</div>
                      <div className="font-bold font-mono text-[#29212A]">{ds.rowCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#756772] uppercase font-mono">Cols</div>
                      <div className="font-bold font-mono text-[#29212A]">{ds.columnCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#756772] uppercase font-mono">Traces</div>
                      <div className="font-bold font-mono text-[#641B32]">{ds.lineage ? ds.lineage.length : 0}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#756772] font-mono mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#756772]" />
                      <span>{new Date(ds.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    <span>{(ds.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#D9A0AE]/20 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        selectDataset(ds.id);
                        navigate(`/app/datasets/${ds.id}`);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#641B32] text-[#FFF8EF] font-semibold hover:bg-[#3D1023] transition-colors flex items-center gap-1 shadow-xs"
                      title="Open dataset in workspace"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setQuickViewDataset(ds)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F8EFE5] text-[#3D1023] font-semibold hover:bg-[#641B32] hover:text-[#FFF8EF] transition-colors flex items-center gap-1 border border-[#D9A0AE]/30"
                      title="Quick-View summary statistics and metadata without navigating away"
                      aria-label={`Quick View ${ds.name}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Quick View</span>
                    </button>
                    <button
                      onClick={() => {
                        const filename = `${ds.name}_cleaned.csv`;
                        notifyExportComplete({
                          format: 'CSV',
                          filename,
                          downloadFn: () => ExportService.downloadCSV(ds.cleanedRecords, ds.name),
                          title: 'CSV Export Ready',
                          text: `Dataset "${ds.name}" exported to CSV.`,
                        });
                      }}
                      title="Download Cleaned CSV"
                      className="p-1.5 rounded-xl text-[#756772] hover:text-[#29212A] hover:bg-[#F8EFE5] transition-colors"
                      aria-label="Download Cleaned CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {deleteConfirmId === ds.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          deleteDataset(ds.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 rounded bg-[#B4233D] text-[#FFF8EF] text-[10px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[10px] text-[#756772] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(ds.id)}
                      className="p-1.5 rounded-xl text-[#756772] hover:text-[#B4233D] hover:bg-[#B4233D]/10 transition-colors"
                      title="Delete dataset"
                      aria-label="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#29212A]/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            className="bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-[#B4233D]/10 text-[#B4233D] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-[#3D1023]">
                  Bulk Delete {selectedDatasetIds.size} Dataset{selectedDatasetIds.size > 1 ? 's' : ''}?
                </h3>
                <p className="text-xs text-[#756772] leading-relaxed">
                  This action will permanently delete {selectedDatasetIds.size} dataset asset{selectedDatasetIds.size > 1 ? 's' : ''}, including all raw immutable snapshots, working cleaned states, and associated lineage traces. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* List of datasets queued for deletion */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-[#F8EFE5] border border-[#D9A0AE]/30 text-xs">
              {datasets
                .filter(d => selectedDatasetIds.has(d.id))
                .map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-[#29212A] py-1 border-b border-[#D9A0AE]/20 last:border-b-0"
                  >
                    <span className="font-semibold truncate max-w-[240px]">{d.name}</span>
                    <span className="font-mono text-[11px] text-[#756772]">
                      {d.rowCount} rows · {d.fileType.toUpperCase()}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#756772] hover:text-[#29212A] hover:bg-[#F8EFE5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-[#B4233D] text-[#FFF8EF] text-xs font-bold hover:bg-[#8B182C] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Bulk Delete ({selectedDatasetIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Slide-over Drawer Modal */}
      <QuickViewModal
        dataset={quickViewDataset}
        isOpen={!!quickViewDataset}
        onClose={() => setQuickViewDataset(null)}
        onOpenWorkspace={id => {
          selectDataset(id);
          navigate(`/app/datasets/${id}`);
        }}
        onDelete={id => {
          deleteDataset(id);
          if (quickViewDataset?.id === id) {
            setQuickViewDataset(null);
          }
        }}
      />
    </div>
  );
};
