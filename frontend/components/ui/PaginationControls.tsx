type PaginationControlsProps = { currentPage: number; lastPage: number; canGoPrevious: boolean; canGoNext: boolean; onPrevious: () => void; onNext: () => void };
export default function PaginationControls({ currentPage, lastPage, canGoPrevious, canGoNext, onPrevious, onNext }: PaginationControlsProps) {
  if (lastPage <= 1) return null;
  return <div className="pagination-modern"><p>Page <strong>{currentPage}</strong> of {lastPage}</p><div className="pagination-actions"><button type="button" disabled={!canGoPrevious} onClick={onPrevious}>Previous</button><button type="button" disabled={!canGoNext} onClick={onNext}>Next</button></div></div>;
}
