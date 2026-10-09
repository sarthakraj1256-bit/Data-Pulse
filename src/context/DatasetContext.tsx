import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset, CleaningOperationType, LineageRecord } from '../types';
import { StorageService } from '../services/storage';
import { DataEngine } from '../services/dataEngine';
import { QualityEngine } from '../services/qualityEngine';
import { CleaningEngine } from '../services/cleaningEngine';
import { SYNTHETIC_TELEMETRY_RAW_CSV } from '../services/sampleData';
import { AuditService } from '../services/auditService';
import { useAuth } from './AuthContext';

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: 'download' | 'arrow' | 'undo';
}

export interface ToastMessage {
  id?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  title?: string;
  action?: ToastAction;
  duration?: number;
}

interface DatasetContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  loading: boolean;
  selectDataset: (id: string) => void;
  loadSyntheticBenchmark: () => Promise<Dataset>;
  saveNewDataset: (
    name: string,
    description: string,
    parsed: {
      fileName: string;
      fileSize: number;
      fileType: 'csv' | 'xlsx' | 'json';
      records: Record<string, any>[];
      columns: any[];
      rowCount: number;
      columnCount: number;
    }
  ) => Dataset;
  deleteDataset: (id: string) => void;
  bulkDeleteDatasets: (ids: string[]) => void;
  updateDatasetTags: (id: string, tags: string[]) => void;
  applyCleaningOperation: (
    method: CleaningOperationType,
    column?: string,
    reason?: string
  ) => { updated: Dataset; lineage: LineageRecord };
  undoCleaningOperation: () => Dataset | null;
  refreshDatasets: () => void;
  toastMessage: ToastMessage | null;
  showToast: (
    text: string,
    type?: 'success' | 'warning' | 'error' | 'info',
    action?: ToastAction,
    title?: string,
    duration?: number
  ) => void;
  notifyExportComplete: (options: {
    filename: string;
    format: 'PDF' | 'CSV' | 'JSON' | 'XLSX' | 'MD';
    downloadFn: () => void;
    title?: string;
    text?: string;
  }) => void;
  clearToast: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (
      text: string,
      type: 'success' | 'warning' | 'error' | 'info' = 'info',
      action?: ToastAction,
      title?: string,
      duration?: number
    ) => {
      setToastMessage({
        id: 'toast_' + Math.random().toString(36).substring(2, 9),
        text,
        type,
        action,
        title,
        duration,
      });
    },
    []
  );

  const notifyExportComplete = useCallback(
    (options: {
      filename: string;
      format: 'PDF' | 'CSV' | 'JSON' | 'XLSX' | 'MD';
      downloadFn: () => void;
      title?: string;
      text?: string;
    }) => {
      const { filename, format, downloadFn, title, text } = options;
      try {
        // Execute the download
        downloadFn();

        // Alert user with success toast featuring the direct 'Download' action
        setToastMessage({
          id: 'toast_export_' + Date.now(),
          type: 'success',
          title: title || `${format} Export Ready`,
          text:
            text ||
            `Export of "${filename}" completed. Click Download if the browser did not automatically save the file.`,
          action: {
            label: 'Download',
            icon: 'download',
            onClick: () => {
              downloadFn();
            },
          },
          duration: 8000,
        });
      } catch (err: any) {
        setToastMessage({
          id: 'toast_export_err_' + Date.now(),
          type: 'error',
          title: 'Export Failed',
          text: `Failed to export ${format} file: ${err?.message || 'Unknown error'}`,
          duration: 6000,
        });
      }
    },
    []
  );

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const refreshDatasets = useCallback(() => {
    if (!user) {
      setDatasets([]);
      setCurrentDataset(null);
      setLoading(false);
      return;
    }

    try {
      const list = StorageService.getUserDatasets(user.id);
      setDatasets(list);
      if (list.length > 0) {
        // Keep current if still exists, or default to first
        setCurrentDataset(prev => {
          if (!prev) return list[0];
          const found = list.find(d => d.id === prev.id);
          return found || list[0];
        });
      } else {
        setCurrentDataset(null);
      }
    } catch (e) {
      console.error('Error refreshing datasets', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshDatasets();
  }, [refreshDatasets]);

  const selectDataset = (id: string) => {
    const found = datasets.find(d => d.id === id);
    if (found) {
      setCurrentDataset(found);
    }
  };

  const saveNewDataset = (
    name: string,
    description: string,
    parsed: {
      fileName: string;
      fileSize: number;
      fileType: 'csv' | 'xlsx' | 'json';
      records: Record<string, any>[];
      columns: any[];
      rowCount: number;
      columnCount: number;
    }
  ): Dataset => {
    if (!user) throw new Error('User must be authenticated to upload datasets.');

    const qualityAssessment = QualityEngine.assessQuality(parsed.records, parsed.columns);

    const newDataset: Dataset = {
      id: 'ds_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      name: name.trim() || parsed.fileName.replace(/\.[^/.]+$/, ''),
      description: description.trim() || 'Ingested dataset for quality profiling and cleaning.',
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      fileType: parsed.fileType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynthetic: false,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      columns: parsed.columns,
      rawRecords: JSON.parse(JSON.stringify(parsed.records)), // Immutable snapshot
      cleanedRecords: JSON.parse(JSON.stringify(parsed.records)),
      qualityAssessment,
      lineage: [],
      tags: [parsed.fileType.toLowerCase(), 'raw', 'ingested'],
    };

    StorageService.saveOrUpdateDataset(user.id, newDataset);
    refreshDatasets();
    setCurrentDataset(newDataset);
    AuditService.log(
      user,
      'DATASET_UPLOADED',
      'ingestion',
      `Ingested dataset "${newDataset.name}" (${newDataset.rowCount} rows, ${newDataset.columnCount} columns)`,
      { datasetId: newDataset.id, datasetName: newDataset.name, severity: 'success' }
    );
    showToast(`Dataset "${newDataset.name}" ingested successfully with ${newDataset.rowCount} rows.`, 'success');
    return newDataset;
  };

  const loadSyntheticBenchmark = async (): Promise<Dataset> => {
    if (!user) throw new Error('Sign in required to load synthetic benchmark.');

    const parsed = DataEngine.parseCSVString(SYNTHETIC_TELEMETRY_RAW_CSV, 'synthetic_telemetry_benchmark.csv');
    const qualityAssessment = QualityEngine.assessQuality(parsed.records, parsed.columns);

    const syntheticDataset: Dataset = {
      id: 'ds_synth_' + Math.random().toString(36).substring(2, 7),
      userId: user.id,
      name: 'Controlled Synthetic IoT Telemetry Benchmark',
      description: 'Standardized experimental dataset containing intentional missing values, spikes, duplicates, and casing inconsistencies.',
      fileName: 'synthetic_telemetry_benchmark.csv',
      fileSize: parsed.fileSize,
      fileType: 'csv',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynthetic: true,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      columns: parsed.columns,
      rawRecords: JSON.parse(JSON.stringify(parsed.records)),
      cleanedRecords: JSON.parse(JSON.stringify(parsed.records)),
      qualityAssessment,
      lineage: [],
      tags: ['synthetic', 'benchmark', 'iot-telemetry', 'csv'],
    };

    StorageService.saveOrUpdateDataset(user.id, syntheticDataset);
    refreshDatasets();
    setCurrentDataset(syntheticDataset);
    AuditService.log(
      user,
      'BENCHMARK_LOADED',
      'ingestion',
      `Initialized Controlled Synthetic IoT Telemetry Benchmark (${syntheticDataset.rowCount} rows)`,
      { datasetId: syntheticDataset.id, datasetName: syntheticDataset.name, severity: 'info' }
    );
    showToast('Loaded Synthetic IoT Benchmark dataset successfully.', 'success');
    return syntheticDataset;
  };

  const deleteDataset = (id: string) => {
    if (!user) return;
    const target = datasets.find(d => d.id === id);
    const success = StorageService.deleteDataset(user.id, id);
    if (success) {
      AuditService.log(
        user,
        'DATASET_DELETED',
        'ingestion',
        `Deleted dataset "${target?.name || id}"`,
        { datasetId: id, datasetName: target?.name, severity: 'warning' }
      );
      refreshDatasets();
      showToast(`Dataset "${target?.name || 'Dataset'}" deleted.`, 'info');
    }
  };

  const bulkDeleteDatasets = (ids: string[]) => {
    if (!user || ids.length === 0) return;
    const targets = datasets.filter(d => ids.includes(d.id));
    const targetNames = targets.map(t => t.name).join(', ');
    const count = StorageService.deleteMultipleDatasets(user.id, ids);
    if (count > 0) {
      AuditService.log(
        user,
        'DATASET_BULK_DELETED',
        'ingestion',
        `Bulk deleted ${count} dataset(s): [${targetNames}]`,
        {
          metadata: {
            deletedIds: ids,
            deletedNames: targets.map(t => t.name),
            count,
          },
          severity: 'warning',
        }
      );
      if (currentDataset && ids.includes(currentDataset.id)) {
        setCurrentDataset(null);
      }
      refreshDatasets();
      showToast(`Successfully deleted ${count} dataset${count > 1 ? 's' : ''}.`, 'info');
    }
  };

  const updateDatasetTags = (id: string, tags: string[]) => {
    if (!user) return;
    const target = datasets.find(d => d.id === id);
    if (!target) return;
    const cleanTags = Array.from(new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean)));
    const updated = { ...target, tags: cleanTags, updatedAt: new Date().toISOString() };
    StorageService.saveOrUpdateDataset(user.id, updated);
    setDatasets(prev => prev.map(d => (d.id === id ? updated : d)));
    if (currentDataset?.id === id) {
      setCurrentDataset(updated);
    }
    AuditService.log(
      user,
      'DATASET_TAGS_UPDATED',
      'ingestion',
      `Updated tags for dataset "${target.name}": [${cleanTags.join(', ')}]`,
      { datasetId: id, datasetName: target.name, severity: 'info' }
    );
    showToast(`Updated tags for "${target.name}".`, 'success');
  };

  const applyCleaningOperation = (
    method: CleaningOperationType,
    column?: string,
    reason?: string
  ) => {
    if (!user || !currentDataset) throw new Error('No active dataset to clean.');

    const { updatedDataset, lineageRecord } = CleaningEngine.applyOperation(
      currentDataset,
      method,
      column,
      reason,
      user.name || user.email
    );

    StorageService.saveOrUpdateDataset(user.id, updatedDataset);
    setCurrentDataset(updatedDataset);
    setDatasets(prev => prev.map(d => (d.id === updatedDataset.id ? updatedDataset : d)));

    AuditService.log(
      user,
      'TRANSFORMATION_APPLIED',
      'transformation',
      `Applied ${method.replace(/_/g, ' ')} on ${column || 'dataset'}: score shift ${lineageRecord.scoreBefore}% -> ${lineageRecord.scoreAfter}%`,
      {
        datasetId: currentDataset.id,
        datasetName: currentDataset.name,
        traceId: lineageRecord.traceId,
        severity: 'success',
      }
    );

    showToast(
      `Applied ${method.replace(/_/g, ' ')}. Quality score changed from ${lineageRecord.scoreBefore}% to ${lineageRecord.scoreAfter}%. Trace: ${lineageRecord.traceId}`,
      'success'
    );

    return { updated: updatedDataset, lineage: lineageRecord };
  };

  const undoCleaningOperation = (): Dataset | null => {
    if (!user || !currentDataset) return null;
    if (currentDataset.lineage.length === 0) {
      showToast('No cleaning operations to undo; dataset is in original raw state.', 'warning');
      return null;
    }

    const undoneDataset = CleaningEngine.undoLastOperation(currentDataset);
    if (undoneDataset) {
      StorageService.saveOrUpdateDataset(user.id, undoneDataset);
      setCurrentDataset(undoneDataset);
      setDatasets(prev => prev.map(d => (d.id === undoneDataset.id ? undoneDataset : d)));

      AuditService.log(
        user,
        'TRANSFORMATION_UNDONE',
        'transformation',
        `Reverted most recent transformation on dataset "${currentDataset.name}"`,
        { datasetId: currentDataset.id, datasetName: currentDataset.name, severity: 'warning' }
      );

      showToast('Undid the most recent transformation. Dataset state restored.', 'info');
      return undoneDataset;
    }
    return null;
  };

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        currentDataset,
        loading,
        selectDataset,
        loadSyntheticBenchmark,
        saveNewDataset,
        deleteDataset,
        bulkDeleteDatasets,
        updateDatasetTags,
        applyCleaningOperation,
        undoCleaningOperation,
        refreshDatasets,
        toastMessage,
        showToast,
        notifyExportComplete,
        clearToast,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
};
