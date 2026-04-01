import { Suspense } from 'react';
import VerifyEmailWrapper from './VerifyEmailWrapper';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailWrapper />
    </Suspense>
  );
}
