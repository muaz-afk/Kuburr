import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center">
      <FontAwesomeIcon 
        icon={faSpinner} 
        spin 
        size="3x" 
        className="text-primary mb-4"
      />
      <p className="text-gray-600 text-sm">Sila tunggu sebentar...</p>
    </div>
  );
} 