import { useState, useEffect, useCallback } from 'react';
import { Download, Cpu, CheckCircle, Loader2, HardDrive, WifiOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  downloadAllKJV,
  fetchSwahiliBible,
  getBibleDownloadStatus,
  KJV_BOOKS,
} from '@/lib/bibleData';
import {
  loadModel,
  getModelStatus,
  unloadModel,
} from '@/lib/localAI';

const BibleDownloadManager = () => {
  const [kjvCount, setKjvCount] = useState(0);
  const [swCount, setSwCount] = useState(0);
  const [downloading, setDownloading] = useState<'kjv' | 'sw' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMsg, setDownloadMsg] = useState('');
  const [modelStatus, setModelStatus] = useState(getModelStatus());
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMsg, setModelMsg] = useState('');

  const refreshStatus = useCallback(async () => {
    const status = await getBibleDownloadStatus();
    setKjvCount(status.kjvCount);
    setSwCount(status.swCount);
    setModelStatus(getModelStatus());
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleDownloadKJV = async () => {
    setDownloading('kjv');
    setDownloadProgress(0);
    try {
      const count = await downloadAllKJV((msg, pct) => {
        setDownloadMsg(msg);
        setDownloadProgress(pct);
      });
      toast({ title: `Downloaded ${count} KJV books ✅` });
    } catch (err) {
      toast({ title: 'Download failed', description: String(err), variant: 'destructive' });
    } finally {
      setDownloading(null);
      refreshStatus();
    }
  };

  const handleDownloadSwahili = async () => {
    setDownloading('sw');
    setDownloadProgress(0);
    try {
      const count = await fetchSwahiliBible((msg, pct) => {
        setDownloadMsg(msg);
        setDownloadProgress(pct);
      });
      toast({ title: `Downloaded ${count} Swahili books ✅` });
    } catch (err) {
      toast({ title: 'Download failed', description: String(err), variant: 'destructive' });
    } finally {
      setDownloading(null);
      refreshStatus();
    }
  };

  const handleLoadModel = async () => {
    setLoadingModel(true);
    setModelProgress(0);
    try {
      const success = await loadModel((pct, msg) => {
        setModelProgress(pct);
        setModelMsg(msg);
      });
      if (success) {
        toast({ title: 'Offline AI model ready! 🤖' });
      } else {
        toast({ title: 'Failed to load AI model', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error loading model', description: String(err), variant: 'destructive' });
    } finally {
      setLoadingModel(false);
      setModelStatus(getModelStatus());
    }
  };

  const handleUnloadModel = () => {
    unloadModel();
    setModelStatus(getModelStatus());
    toast({ title: 'AI model unloaded' });
  };

  const kjvComplete = kjvCount >= KJV_BOOKS.length;
  const swComplete = swCount > 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          Offline Bible & AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KJV Download */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">KJV Bible (English)</span>
              {kjvComplete && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Downloaded
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {kjvCount}/{KJV_BOOKS.length} books
            </span>
          </div>
          {downloading === 'kjv' ? (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{downloadMsg}</p>
            </div>
          ) : !kjvComplete ? (
            <Button size="sm" variant="outline" onClick={handleDownloadKJV} className="w-full">
              <Download className="w-3 h-3 mr-2" />
              Download KJV (~4.5MB)
            </Button>
          ) : null}
        </div>

        {/* Swahili Download */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Biblia Takatifu (Swahili)</span>
              {swComplete && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Downloaded
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {swCount > 0 ? `${swCount} books` : 'Not downloaded'}
            </span>
          </div>
          {downloading === 'sw' ? (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{downloadMsg}</p>
            </div>
          ) : !swComplete ? (
            <Button size="sm" variant="outline" onClick={handleDownloadSwahili} className="w-full">
              <Download className="w-3 h-3 mr-2" />
              Download Swahili Bible (~4.5MB)
            </Button>
          ) : null}
        </div>

        {/* Local AI Model */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Offline AI Model</span>
              {modelStatus.isLoaded && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Runs Qwen2.5 AI model in your browser for offline Q&A. Downloads ~400MB on first use (cached after).
          </p>
          {loadingModel ? (
            <div className="space-y-1">
              <Progress value={modelProgress} className="h-2" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {modelMsg}
              </p>
            </div>
          ) : modelStatus.isLoaded ? (
            <Button size="sm" variant="ghost" onClick={handleUnloadModel} className="w-full text-destructive">
              <Trash2 className="w-3 h-3 mr-2" />
              Unload Model (free memory)
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleLoadModel} className="w-full">
              <Cpu className="w-3 h-3 mr-2" />
              Load Offline AI Model
            </Button>
          )}
          {modelStatus.error && (
            <p className="text-xs text-destructive">{modelStatus.error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BibleDownloadManager;
