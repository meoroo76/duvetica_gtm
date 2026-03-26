import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, Milestone, User, Department, Season } from '@/lib/types';
import { DEFAULT_MILESTONES, DEFAULT_SEASONS, generateMilestonesForSeason } from '@/data/milestones';
import { INITIAL_TASKS } from '@/data/initialTasks';
import { v4 as uuidv4 } from 'uuid';

const AUTHORIZED_USERS: User[] = [
  { username: 'admin', displayName: '관리자' },
  { username: 'planner', displayName: '기획팀' },
  { username: 'manager', displayName: '매니저' },
];

const PASSWORDS: Record<string, string> = {
  admin: 'duvetica2025!',
  planner: 'plan2025!',
  manager: 'mgr2025!',
};

interface GTMState {
  tasks: Task[];
  milestones: Milestone[];
  seasons: Season[];
  currentUser: User | null;
  initialized: boolean;
  dataVersion?: number;
  syncing: boolean;
  lastSyncedAt: string | null;

  // Auth
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdBy' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTasksForDateAndDept: (date: string, season: string, dept: Department) => Task[];

  // Milestones
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;
  getMilestoneForDate: (date: string, season: string) => Milestone | undefined;

  // Seasons
  addSeason: (season: Season) => void;
  updateSeason: (id: string, updates: Partial<Season>) => void;
  deleteSeason: (id: string) => void;

  // Server sync
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;

  // Initialize
  initializeData: () => void;
}

// Debounce sync to server
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleSyncToServer() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    useGTMStore.getState().syncToServer();
  }, 1000); // 1초 후 서버 동기화
}

export const useGTMStore = create<GTMState>()(
  persist(
    (set, get) => ({
      tasks: [],
      milestones: [],
      seasons: [],
      currentUser: null,
      initialized: false,
      syncing: false,
      lastSyncedAt: null,

      login: (username: string, password: string) => {
        const user = AUTHORIZED_USERS.find((u) => u.username === username);
        if (user && PASSWORDS[username] === password) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null }),

      addTask: (taskData) => {
        const user = get().currentUser;
        if (!user) return;
        const newTask: Task = {
          ...taskData,
          id: uuidv4(),
          createdBy: user.username,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
        scheduleSyncToServer();
      },

      updateTask: (id, updates) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
        scheduleSyncToServer();
      },

      deleteTask: (id) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        scheduleSyncToServer();
      },

      getTasksForDateAndDept: (date, season, dept) => {
        return get().tasks.filter(
          (t) => t.date === date && t.season === season && t.department === dept
        );
      },

      getMilestoneForDate: (date, season) => {
        return get().milestones.find(
          (m) => m.season === season && date >= m.startDate && date <= m.endDate
        );
      },

      addMilestone: (milestoneData) => {
        const user = get().currentUser;
        if (!user) return;
        const newMilestone: Milestone = {
          ...milestoneData,
          id: uuidv4(),
        };
        set((state) => ({ milestones: [...state.milestones, newMilestone] }));
        scheduleSyncToServer();
      },

      updateMilestone: (id, updates) => {
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
        scheduleSyncToServer();
      },

      deleteMilestone: (id) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
          tasks: state.tasks.map((t) =>
            t.milestone === id ? { ...t, milestone: undefined } : t
          ),
        }));
        scheduleSyncToServer();
      },

      // Season CRUD
      addSeason: (season) => {
        const user = get().currentUser;
        if (!user) return;
        // 시즌 추가 + 기본 마일스톤 자동 생성
        const newMilestones = generateMilestonesForSeason(season.id, season.startDate);
        set((state) => ({
          seasons: [...state.seasons, season].sort((a, b) => a.order - b.order),
          milestones: [...state.milestones, ...newMilestones],
        }));
        scheduleSyncToServer();
      },

      updateSeason: (id, updates) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({
          seasons: state.seasons.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
        scheduleSyncToServer();
      },

      deleteSeason: (id) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({
          seasons: state.seasons.filter((s) => s.id !== id),
          milestones: state.milestones.filter((m) => m.season !== id),
          tasks: state.tasks.filter((t) => t.season !== id),
        }));
        scheduleSyncToServer();
      },

      // 서버에 데이터 저장
      syncToServer: async () => {
        const state = get();
        if (!state.currentUser) return;

        set({ syncing: true });
        try {
          const res = await fetch('/api/gtm-data', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-gtm-user': state.currentUser.username,
            },
            body: JSON.stringify({
              tasks: state.tasks,
              milestones: state.milestones,
              seasons: state.seasons,
              dataVersion: state.dataVersion,
            }),
          });

          if (res.ok) {
            set({ lastSyncedAt: new Date().toISOString(), syncing: false });
          } else {
            console.error('Sync failed:', res.status);
            set({ syncing: false });
          }
        } catch (error) {
          console.error('Sync error:', error);
          set({ syncing: false });
        }
      },

      // 서버에서 데이터 로드
      loadFromServer: async () => {
        try {
          const res = await fetch('/api/gtm-data');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();

          // 서버에 데이터가 있으면 서버 데이터 우선
          if (data.tasks && data.tasks.length > 0) {
            set({
              tasks: data.tasks,
              milestones: data.milestones || DEFAULT_MILESTONES,
              seasons: data.seasons || DEFAULT_SEASONS,
              dataVersion: data.dataVersion,
              initialized: true,
              lastSyncedAt: new Date().toISOString(),
            });
          } else if (data.milestones && data.milestones.length > 0) {
            set({
              milestones: data.milestones,
              seasons: data.seasons || DEFAULT_SEASONS,
              dataVersion: data.dataVersion,
              initialized: true,
              lastSyncedAt: new Date().toISOString(),
            });
          }
          // 서버에 데이터가 없으면 로컬 데이터 유지
        } catch (error) {
          console.warn('Server load failed, using local data:', error);
        }
      },

      initializeData: () => {
        const DATA_VERSION = 4;
        const current = get();
        if (!current.initialized || current.dataVersion !== DATA_VERSION) {
          set({
            tasks: INITIAL_TASKS,
            milestones: DEFAULT_MILESTONES,
            seasons: DEFAULT_SEASONS,
            initialized: true,
            dataVersion: DATA_VERSION,
          });
        }
        // 서버에서 최신 데이터 로드 시도
        get().loadFromServer();
      },
    }),
    {
      name: 'duvetica-gtm-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        milestones: state.milestones,
        seasons: state.seasons,
        currentUser: state.currentUser,
        initialized: state.initialized,
        dataVersion: state.dataVersion,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
