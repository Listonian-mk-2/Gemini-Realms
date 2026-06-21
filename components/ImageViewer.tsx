
import React from 'react';

interface ImageViewerProps {
  imageUrl: string | null;
  isLoading: boolean;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, isLoading }) => {
  return (
    <div className="w-full h-48 md:h-64 lg:h-96 bg-black flex-shrink-0 relative border-b-4 border-gray-700 overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
            <p className="ml-4 text-lg">Conjuring the scene...</p>
        </div>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="Scene" className="w-full h-full object-cover ken-burns-effect" />
      )}
       <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black to-transparent"></div>
    </div>
  );
};