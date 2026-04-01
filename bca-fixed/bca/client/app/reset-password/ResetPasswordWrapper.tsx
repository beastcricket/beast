'use client';

import { useSearchParams } from 'next/navigation';
import ResetPasswordPage from './ResetPasswordPage';

export default function ResetPasswordWrapper() {
  const params = useSearchParams();
  const token = params.get('token');

  return <ResetPasswordPage token={token} />;
}
