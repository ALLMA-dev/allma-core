import { create } from 'zustand';
import { Project, BOMPart, ProjectEditViewModel } from '@optiroq/types';
import { immer } from 'zustand/middleware/immer';

interface ProjectEditState {
  project: Partial<Project>;
  bomParts: BOMPart[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  actions: {
    initialize: (data: ProjectEditViewModel) => void;
    setProjectField: (key: string, value: any) => void;
    addPart: (part: BOMPart) => void;
    updatePart: (originalPartName: string, updatedPart: BOMPart) => void;
    deletePart: (partName: string) => void;
    setSavingStatus: (isSaving: boolean) => void;
    resetDirty: () => void;
  };
}

export const useProjectEditStore = create<ProjectEditState>()(
  immer((set) => ({
    project: {},
    bomParts: [],
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    actions: {
      initialize: (data) => set((state) => {
        state.project = data.project;
        state.bomParts = data.bomParts;
        state.isDirty = false;
        state.isSaving = false;
        state.lastSaved = null;
      }),
      setProjectField: (key, value) => set((state) => {
        // Use type assertion to allow dynamic key assignment in Immer
        (state.project as Record<string, any>)[key] = value;
        state.isDirty = true;
      }),
      addPart: (part) => set((state) => {
        state.bomParts.push(part);
        state.isDirty = true;
      }),
      updatePart: (originalPartName, updatedPart) => set((state) => {
        const index = state.bomParts.findIndex(p => p.partName === originalPartName);
        if (index !== -1) {
          state.bomParts[index] = updatedPart;
          state.isDirty = true;
        }
      }),
      deletePart: (partName) => set((state) => {
        state.bomParts = state.bomParts.filter(p => p.partName !== partName);
        state.isDirty = true;
      }),
      setSavingStatus: (isSaving) => set((state) => {
        state.isSaving = isSaving;
        if (!isSaving) {
          state.isDirty = false;
          state.lastSaved = new Date().toISOString();
        }
      }),
      resetDirty: () => set((state) => {
        state.isDirty = false;
      }),
    },
  }))
);
