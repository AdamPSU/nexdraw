"use client";

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Clock,
  FileIcon,
  LayoutGrid,
  Settings,
  Star,
  Activity,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createWhiteboard, deleteWhiteboard, renameWhiteboard } from './actions';
import { ConstellationBackground } from '@/components/shared/ConstellationBackground';
import { cn } from '@/lib/utils';

type Whiteboard = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview?: string;
};

export default function DashboardClient({ initialWhiteboards }: { initialWhiteboards: Whiteboard[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen] = useState(true);
  
  const [optimisticWhiteboards, addOptimisticWhiteboard] = useOptimistic(
    initialWhiteboards,
    (state, action: { type: 'delete' | 'rename' | 'create', id?: string, title?: string, board?: Whiteboard }) => {
      switch (action.type) {
        case 'delete':
          return state.filter(w => w.id !== action.id);
        case 'rename':
          return state.map(w => w.id === action.id ? { ...w, title: action.title! } : w);
        case 'create':
          return [action.board!, ...state];
        default:
          return state;
      }
    }
  );

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const handleCreate = async () => {
    startTransition(async () => {
      try {
        const newBoard = await createWhiteboard();
        toast.success('Canvas created');
        router.push(`/board/${newBoard.id}`);
      } catch (error) {
        toast.error('Failed to create canvas');
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      addOptimisticWhiteboard({ type: 'delete', id });
      try {
        await deleteWhiteboard(id);
        toast.success('Canvas deleted');
      } catch (error) {
        toast.error('Failed to delete canvas');
      }
    });
  };

  const handleRename = async () => {
    if (!renameId) return;
    const id = renameId;
    const title = renameTitle;
    
    setRenameId(null);
    startTransition(async () => {
      addOptimisticWhiteboard({ type: 'rename', id, title });
      try {
        await renameWhiteboard(id, title);
        toast.success('Canvas renamed');
      } catch (error) {
        toast.error('Failed to rename canvas');
      }
    });
  };

  const filteredWhiteboards = useMemo(() => 
    optimisticWhiteboards.filter(board =>
      board.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [optimisticWhiteboards, searchQuery]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-white text-neutral-900 dark:bg-black dark:text-white overflow-hidden selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <ConstellationBackground />
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="relative z-20 h-full border-r border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl overflow-hidden hidden lg:flex flex-col"
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <Star className="text-white dark:text-black" size={18} fill="currentColor" />
            </div>
            <span className="font-bold text-lg tracking-tight">Studio</span>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarItem icon={<LayoutGrid size={18} />} label="All Canvases" active />
            <SidebarItem icon={<Star size={18} />} label="Favorites" />
            <SidebarItem icon={<Activity size={18} />} label="Recent" />
            <div className="pt-6 pb-2 px-3">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 dark:text-neutral-500">Workspace</p>
            </div>
            <SidebarItem icon={<FolderOpen size={18} />} label="Personal" />
            <SidebarItem icon={<Settings size={18} />} label="Settings" />
          </nav>

          <div className="mt-auto p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                <Activity size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Guest User</p>
                <p className="text-xs text-neutral-500 truncate">Free Plan</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={18} />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 bg-neutral-100/50 dark:bg-neutral-900/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-neutral-200 dark:focus-visible:ring-neutral-800 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-6 mr-6 text-sm font-medium text-neutral-500">
              <div className="flex flex-col items-end">
                <span className="text-neutral-900 dark:text-white font-bold">{optimisticWhiteboards.length}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60">Total</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-neutral-900 dark:text-white font-bold">{filteredWhiteboards.length}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-60">Visible</span>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={isPending}
              className="h-11 px-6 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold shadow-xl shadow-black/5 dark:shadow-white/5 transition-all active:scale-95"
            >
              {isPending ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="mr-2 h-4 w-4" strokeWidth={3} />
              )}
              Create New
            </Button>
          </div>
        </header>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-8">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* Featured Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                className="col-span-1 md:col-span-2 group relative h-48 rounded-[32px] overflow-hidden bg-black text-white dark:bg-white dark:text-black cursor-pointer shadow-2xl transition-transform active:scale-[0.98]"
                onClick={handleCreate}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative h-full p-8 flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Start Fresh</h2>
                    <p className="opacity-60 max-w-sm">Create a new canvas and let the AI assist your creative process instantly.</p>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    Launch Studio <ChevronRight size={16} strokeWidth={3} />
                  </div>
                </div>
                <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
                  <Star size={120} fill="currentColor" />
                </div>
              </div>

              <div className="h-48 rounded-[32px] border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm p-8 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Status</p>
                  <h3 className="text-xl font-bold leading-tight text-neutral-900 dark:text-neutral-100">Live Workspace</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">All systems operational</span>
                </div>
              </div>
            </section>

            {/* List Section */}
            <section className="relative overflow-visible" style={{ minHeight: '600px' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Your Canvases</h2>
              </div>

              {filteredWhiteboards.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-[32px]">
                  <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-neutral-300" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">No results found</h3>
                  <p className="text-sm text-neutral-500 mt-1 max-w-xs">Try a different keyword.</p>
                </div>
              ) : (
                <div style={{ position: 'absolute', bottom: '-80px', right: 0, transform: 'translate(20%, 20%)' }}>
                  <CardSwap
                    cardDistance={85}
                    verticalDistance={95}
                    delay={5000}
                    width={850}
                    height={550}
                    pauseOnHover
                    easing="elastic"
                  >
                    {filteredWhiteboards.slice(0, 5).map((board) => (
                      <Card key={board.id} customClass="cursor-pointer" onClick={() => router.push(`/board/${board.id}`)}>
                        {board.preview
                          ? <img src={board.preview} className="w-full h-full object-cover rounded-xl" />
                          : <div className="w-full h-full flex items-center justify-center bg-neutral-900"><FileIcon size={60} className="text-neutral-600" strokeWidth={1} /></div>
                        }
                        <div className="absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent">
                          <p className="text-white font-bold text-base truncate">{board.title}</p>
                          <p className="text-white/50 text-sm flex items-center gap-1"><Clock size={12} />{formatTime(board.updated_at)}</p>
                        </div>
                      </Card>
                    ))}
                  </CardSwap>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Dialog open={!!renameId} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent className="sm:max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Rename Canvas</DialogTitle>
            <DialogDescription className="text-neutral-500">
              Personalize your project with a new title.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="name" className="mb-2 block text-xs uppercase tracking-widest font-bold text-neutral-400">Project Title</Label>
            <Input
              id="name"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="h-12 bg-neutral-100 dark:bg-neutral-900 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRenameId(null)} className="flex-1 rounded-xl">
              Discard
            </Button>
            <Button onClick={handleRename} disabled={isPending} className="flex-1 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold">
              Update Title
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]",
      active 
        ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/5 dark:shadow-white/5" 
        : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white"
    )}>
      {icon}
      <span className="flex-1">{label}</span>
    </div>
  );
}
