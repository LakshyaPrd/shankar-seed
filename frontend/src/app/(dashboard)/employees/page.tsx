'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/activity-tracker');
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-muted-foreground">
      Redirecting to Labour Activity Tracker...
    </div>
  );
}

