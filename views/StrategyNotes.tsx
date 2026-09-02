import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { StickyNote, Plus, X, Trash2, Calendar, Edit3, Save, PenTool } from 'lucide-react';
import { supabase } from '../supabase';

const StrategyNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn("Error fetching notes:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setNotes(data.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        createdAt: n.created_at || new Date().toISOString()
      } as Note)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();

    // Set up realtime channel subscription for real-time note updates
    const channel = supabase
      .channel('public:notes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes'
      }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNewTitle(note.title);
      setNewContent(note.content);
    } else {
      setEditingNote(null);
      setNewTitle('');
      setNewContent('');
    }
    setIsModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: newTitle,
            content: newContent
          })
          .eq('id', editingNote.id)
          .eq('userId', session.user.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert({
            title: newTitle,
            content: newContent,
            userId: session.user.id
          });

        if (error) throw error;
      }

      // Cleanup
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error("Error saving note: ", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette note ?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .eq('userId', session.user.id);

        if (error) throw error;
        fetchNotes();
      } catch (error) {
        console.error("Error deleting note: ", error);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Notes de Stratégie</h2>
          <p className="text-gray-500 text-sm font-medium">Sauvegardez vos meilleures accroches et idées marketing.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 justify-center active:scale-95"
        >
          <Plus size={18} /> Nouvelle Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.length === 0 && !loading ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <StickyNote size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucune note pour le moment</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
            >
              Créer ma première note
            </button>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col h-64 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                  <StickyNote size={20} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => handleOpenModal(note)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Modifier"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{note.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 flex-1 whitespace-pre-line font-medium">
                {note.content}
              </p>
              <div className="pt-4 border-t border-gray-50 mt-4 flex items-center gap-2 text-[10px] text-gray-300 font-black uppercase tracking-widest">
                <Calendar size={12} />
                {new Date(note.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  {editingNote ? <Edit3 size={20} /> : <PenTool size={20} />}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {editingNote ? 'Modifier la note' : 'Nouvelle Idée'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Titre de l'idée</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <StickyNote size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-all focus:bg-white text-gray-900 placeholder:text-gray-300"
                    placeholder="Ex: Stratégie Marketing WhatsApp"
                    autoFocus
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenu</span>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full h-48 bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all focus:bg-white text-gray-700 resize-none placeholder:text-gray-300"
                  placeholder="Écrivez vos idées, scripts ou stratégies ici..."
                />
              </label>

              <button 
                onClick={handleSaveNote}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Save size={18} />
                {editingNote ? 'Mettre à jour' : 'Enregistrer la note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyNotes;
