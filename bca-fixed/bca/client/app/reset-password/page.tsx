import { Suspense } from 'react';
import ResetPasswordWrapper from './ResetPasswordWrapper';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordWrapper />
    </Suspense>
  );
}
