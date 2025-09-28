'use client';
import { useEffect, useState, useTransition } from 'react';
import { fetchShoeRecommendations } from '@/app/actions';
import { Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function StyleGuideAssistant({ shoeDescription }: { shoeDescription: string }) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const result = await fetchShoeRecommendations({ shoeDescription });
      if (result.error) {
        setError(result.error);
        setRecommendations([]);
      } else {
        setRecommendations(result.recommendations || []);
      }
    });
  }, [shoeDescription]);

  return (
    <div>
      <h4 className="flex items-center font-semibold text-md mb-3">
        <Wand2 className="mr-2 h-5 w-5 text-primary" />
        AI Style Guide
      </h4>
      {isPending && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {!isPending && error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isPending && !error && recommendations.length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {recommendations.slice(0, 3).map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
