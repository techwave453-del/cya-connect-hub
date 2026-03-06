import { useState, useEffect, useCallback } from 'react';
import { Download, Cpu, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  downloadAllKJV,
  fetchSwahiliBible,
  getBibleDownloadStatus,
  KJV_BOOKS,
} from '@/lib/bibleData';
import { loadModel, getModelStatus } from '@/lib/localAI';

const InlineBibleDownload = () => {
  const [kjvCount, setKjvCount] = useState(0);
  const [swCount, setSwCount] = useState(0);
  const [downloading, setDownloading] = useState<'kjv' | 'sw' | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [modelStatus, setModelStatus] = useState(getModelStatus());
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMsg, setModelMsg] = useState('');

  const refresh = useCallback(async () => {
    const s = await getBibleDownloadStatus();
    setKjvCount(s.kjvCount);
    setSwCount(s.swCount);
    setModelStatus(getModelStatus());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleKJV = async () => {
    setDownloading('kjv');
    setProgress(0);
    try {
      const c = await downloadAllKJV((msg, pct) => { setProgressMsg(msg); setProgress(pct); });
      toast({ title: `Downloaded ${c} KJV books ✅` });
    } catch { toast({ title: 'Download failed', variant: 'destructive' }); }
    finally { setDownloading(null); refresh(); }
  };

  const handleSW = async () => {
    setDownloading('sw');
    setProgress(0);
    try {
      const c = await fetchSwahiliBible((msg, pct) => { setProgressMsg(msg); setProgress(pct); });
      toast({ title: `Downloaded ${c} Swahili books ✅` });
    } catch { toast({ title: 'Download failed', variant: 'destructive' }); }
    finally { setDownloading(null); refresh(); }
  };

  const handleModel = async () => {
    setLoadingModel(true);
    setModelProgress(0);
    try {
      const ok = await loadModel((pct, msg) => { setModelProgress(pct); setModelMsg(msg); });
      toast({ title: ok ? 'Offline AI ready! 🤖' : 'Failed to load model', variant: ok ? 'default' : 'destructive' });
    } catch { toast({ title: 'Error loading model', variant: 'destructive' }); }
    finally { setLoadingModel(false); setModelStatus(getModelStatus()); }
  };

  const kjvDone = kjvCount >= KJV_BOOKS.length;
  const swDone = swCount > 0;

  return (
    <div
      className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-primary">📥 Quick Download</p>

      {/* KJV */}
      {downloading === 'kjv' ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">{progressMsg}</p>
        </div>
      ) : kjvDone ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3 text-green-500" /> KJV Bible ready
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={handleKJV} className="w-full h-7 text-xs" disabled={!!downloading}>
          <Download className="w-3 h-3 mr-1" /> Download KJV Bible (~4.5MB)
        </Button>
      )}

      {/* Swahili */}
      {downloading === 'sw' ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">{progressMsg}</p>
        </div>
      ) : swDone ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3 text-green-500" /> Swahili Bible ready
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={handleSW} className="w-full h-7 text-xs" disabled={!!downloading}>
          <Download className="w-3 h-3 mr-1" /> Download Swahili Bible (~4.5MB)
        </Button>
      )}

      {/* AI Model */}
      {loadingModel ? (
        <div className="space-y-1">
          <Progress value={modelProgress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> {modelMsg}
          </p>
        </div>
      ) : modelStatus.isLoaded ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3 text-green-500" /> Offline AI active
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={handleModel} className="w-full h-7 text-xs" disabled={!!downloading}>
          <Cpu className="w-3 h-3 mr-1" /> Load Offline AI (~250MB)
        </Button>
      )}
    </div>
  );
};

export default InlineBibleDownload;
