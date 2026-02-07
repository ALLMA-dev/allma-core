import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


interface AppState {
    // This store is currently empty and serves as a placeholder for future global state.
    // Example future state:
    // sidebarIsOpen: boolean;
    // toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // State and actions would be defined here.
        }),
        {
            name: 'app-storage', 
            storage: createJSONStorage(() => localStorage),
        }
    )
);