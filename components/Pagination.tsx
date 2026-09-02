import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Page {currentPage} sur {totalPages} • {totalItems} au total ({itemsPerPage} par page)
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-3 bg-[#128686] border border-gray-100 rounded-xl text-gray-400 hover:text-white hover:bg-[#0E6B6B] disabled:opacity-30 transition-all shadow-sm active:scale-95"
          aria-label="Page précédente"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-3 bg-[#128686] border border-gray-100 rounded-xl text-gray-400 hover:text-white hover:bg-[#0E6B6B] disabled:opacity-30 transition-all shadow-sm active:scale-95"
          aria-label="Page suivante"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
