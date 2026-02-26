import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/skeleton';

interface Props {
  reference: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

const BiblePassageDialog = ({ reference, open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verses, setVerses] = useState<ApiVerse[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPassage = async () => {
      if (!reference || !open) return;
      setLoading(true);
      setError(null);
      setVerses(null);
      try {
        const encoded = encodeURIComponent(reference);
        const res = await fetch(`https://bible-api.com/${encoded}`);
        if (!res.ok) throw new Error('Failed to fetch passage');
        const data = await res.json();
        // data.verses is an array
        if (mounted) {
          setVerses(data.verses || null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error fetching passage');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPassage();

    return () => {
      mounted = false;
    };
  }, [reference, open]);

  const openWholeChapter = () => {
    if (!verses || verses.length === 0) return;
    const v = verses[0];
    const q = encodeURIComponent(`${v.book_name} ${v.chapter}`);
    const url = `https://www.biblegateway.com/passage/?search=${q}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-transparent shadow-none">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-lg">{reference || 'Passage'}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>

          <div className="p-4 max-h-[60vh] overflow-auto">
            {loading && (
              <div className="flex items-center gap-2">
                <Spinner />
                <div>Loading passage…</div>
              </div>
            )}

            {error && (
              <div className="text-destructive">{error}</div>
            )}

            {!loading && !error && verses && (
              <div className="space-y-3">
                {verses.map((v) => (
                  <div key={`${v.chapter}:${v.verse}`} className="text-sm leading-relaxed">
                    <span className="font-medium text-muted-foreground mr-2">{v.verse}</span>
                    <span>{v.text}</span>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && !verses && (
              <div className="text-muted-foreground">No passage found.</div>
            )}
          </div>

          <div className="p-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={openWholeChapter}>
              Read whole chapter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BiblePassageDialog;
