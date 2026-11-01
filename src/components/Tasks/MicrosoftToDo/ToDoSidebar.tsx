import React, { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  User,
  CheckSquare,
  FileText,
  Zap,
  PhoneCall,
  Wrench,
  CheckCircle2,
  FolderPlus,
  Trash2,
  Plus,
  X,
  Layers,
} from 'lucide-react';
import { ToDoListType, ToDoCustomList, EnrichedTask } from '../../../types/todo';

interface ToDoSidebarProps {
  currentList: ToDoListType;
  customListId?: string;
  onSelectList: (type: ToDoListType, customId?: string) => void;
  tasks: EnrichedTask[];
  customLists: ToDoCustomList[];
  onAddCustomList: (name: string) => void;
  onDeleteCustomList: (id: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function ToDoSidebar({
  currentList,
  customListId,
  onSelectList,
  tasks,
  customLists,
  onAddCustomList,
  onDeleteCustomList,
  isMobileOpen = false,
  onCloseMobile,
}: ToDoSidebarProps) {
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Counts for each list
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const myDayCount = activeTasks.filter((t) => t.isMyDay).length;
  const importantCount = activeTasks.filter((t) => t.isImportant).length;
  const plannedCount = activeTasks.filter((t) => Boolean(t.due_date)).length;
  const assignedToMeCount = activeTasks.length; // will be filtered by parent or in caller
  const allTasksCount = activeTasks.length;

  const countByStage = (stage: string) =>
    activeTasks.filter((t) => t.task_type === stage).length;

  const countByCustomList = (cId: string) =>
    activeTasks.filter((t) => t.meta.custom_list_id === cId).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onAddCustomList(newListName.trim());
    setNewListName('');
    setIsCreatingList(false);
  };

  const navItemClass = (isSelected: boolean, accentColor = 'blue') =>
    `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
      isSelected
        ? 'bg-blue-600 text-white shadow-sm font-bold'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const content = (
    <div className="flex flex-col h-full bg-slate-50/80 border-r border-gray-200 w-64 flex-shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-sm">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">Solar To Do</h3>
            <p className="text-[10px] text-gray-500 font-medium">Tejo Bharat Operations</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lists Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 text-xs">
        {/* Smart Lists */}
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Focus Lists
          </p>
          <div className="space-y-1">
            <button
              onClick={() => onSelectList('my_day')}
              className={navItemClass(currentList === 'my_day')}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`w-4 h-4 ${currentList === 'my_day' ? 'text-white' : 'text-amber-500'}`} />
                <span>My Day</span>
              </div>
              {myDayCount > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    currentList === 'my_day' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {myDayCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectList('important')}
              className={navItemClass(currentList === 'important')}
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${currentList === 'important' ? 'text-white' : 'text-rose-500 fill-rose-500'}`} />
                <span>Important</span>
              </div>
              {importantCount > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    currentList === 'important' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {importantCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectList('planned')}
              className={navItemClass(currentList === 'planned')}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${currentList === 'planned' ? 'text-white' : 'text-emerald-500'}`} />
                <span>Planned</span>
              </div>
              {plannedCount > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    currentList === 'planned' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {plannedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectList('assigned_to_me')}
              className={navItemClass(currentList === 'assigned_to_me')}
            >
              <div className="flex items-center gap-2.5">
                <User className={`w-4 h-4 ${currentList === 'assigned_to_me' ? 'text-white' : 'text-indigo-500'}`} />
                <span>Assigned to me</span>
              </div>
            </button>

            <button
              onClick={() => onSelectList('all_tasks')}
              className={navItemClass(currentList === 'all_tasks')}
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className={`w-4 h-4 ${currentList === 'all_tasks' ? 'text-white' : 'text-blue-500'}`} />
                <span>All Tasks</span>
              </div>
              {allTasksCount > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    currentList === 'all_tasks' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {allTasksCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Solar Workflow Categories */}
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Solar Stages</span>
          </p>
          <div className="space-y-1">
            <button
              onClick={() => onSelectList('follow_up')}
              className={navItemClass(currentList === 'follow_up')}
            >
              <div className="flex items-center gap-2.5">
                <PhoneCall className={`w-4 h-4 ${currentList === 'follow_up' ? 'text-white' : 'text-blue-600'}`} />
                <span>Follow-ups</span>
              </div>
              {countByStage('follow_up') > 0 && (
                <span className="text-[10px] text-gray-500">{countByStage('follow_up')}</span>
              )}
            </button>

            <button
              onClick={() => onSelectList('document_collection')}
              className={navItemClass(currentList === 'document_collection')}
            >
              <div className="flex items-center gap-2.5">
                <FileText className={`w-4 h-4 ${currentList === 'document_collection' ? 'text-white' : 'text-amber-600'}`} />
                <span>Doc Collection</span>
              </div>
              {countByStage('document_collection') > 0 && (
                <span className="text-[10px] text-gray-500">{countByStage('document_collection')}</span>
              )}
            </button>

            <button
              onClick={() => onSelectList('eb_change')}
              className={navItemClass(currentList === 'eb_change')}
            >
              <div className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 ${currentList === 'eb_change' ? 'text-white' : 'text-purple-600'}`} />
                <span>EB / Net Metering</span>
              </div>
              {countByStage('eb_change') > 0 && (
                <span className="text-[10px] text-gray-500">{countByStage('eb_change')}</span>
              )}
            </button>

            <button
              onClick={() => onSelectList('installation')}
              className={navItemClass(currentList === 'installation')}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className={`w-4 h-4 ${currentList === 'installation' ? 'text-white' : 'text-teal-600'}`} />
                <span>Solar Installation</span>
              </div>
              {countByStage('installation') > 0 && (
                <span className="text-[10px] text-gray-500">{countByStage('installation')}</span>
              )}
            </button>

            <button
              onClick={() => onSelectList('verification')}
              className={navItemClass(currentList === 'verification')}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-4 h-4 ${currentList === 'verification' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Site Verification</span>
              </div>
              {countByStage('verification') > 0 && (
                <span className="text-[10px] text-gray-500">{countByStage('verification')}</span>
              )}
            </button>
          </div>
        </div>

        {/* Custom User Lists */}
        <div>
          <div className="px-2 pb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-indigo-500" />
              <span>Custom Lists</span>
            </p>
          </div>

          <div className="space-y-1">
            {customLists.map((list) => {
              const isSelected = currentList === 'custom' && customListId === list.id;
              const count = countByCustomList(list.id);

              return (
                <div
                  key={list.id}
                  className={`group w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => onSelectList('custom', list.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{list.icon || '📋'}</span>
                    <span className="truncate">{list.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {count > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete list "${list.name}"?`)) {
                          onDeleteCustomList(list.id);
                        }
                      }}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500 hover:text-white transition-opacity ${
                        isSelected ? 'text-white' : 'text-gray-400'
                      }`}
                      title="Delete List"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {isCreatingList ? (
              <form onSubmit={handleCreateSubmit} className="pt-1">
                <input
                  type="text"
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onBlur={() => {
                    if (!newListName.trim()) setIsCreatingList(false);
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingList(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New list</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-full">{content}</div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 bg-white h-full shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
}
