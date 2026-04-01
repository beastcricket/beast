import { Suspense } from 'react';
import ResetPasswordWrapper from './ResetPasswordWrapper';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordWrapper />
    </Suspense>
  );
}
