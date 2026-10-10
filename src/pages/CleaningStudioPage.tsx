import React from 'react';
import { CleaningStudio } from './CleaningStudio';

interface CleaningStudioPageProps {
  navigate: (path: string) => void;
}

export const CleaningStudioPage: React.FC<CleaningStudioPageProps> = ({ navigate }) => {
  return <CleaningStudio navigate={navigate} />;
};

export { CleaningStudio };
export default CleaningStudioPage;
