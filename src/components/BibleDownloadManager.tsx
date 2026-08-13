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
  downloadBibleVersion,
  BIBLE_VERSIONS,
  BibleVersionId,
  getPreferredBibleVersion,
  setPreferredBibleVersion,
} from '@/lib/bibleData';
import {
  loadModel,
  getModelStatus,
  unloadModel,
  checkDeviceCapability,
} from '@/lib/localAI';

const BibleDownloadManager = () => {
  const [kjvCount, setKjvCount] = useState(0);
  const [webCount, setWebCount] = useState(0);
  const [asvCount, setAsvCount] = useState(0);
  const [swCount, setSwCount] = useState(0);
  const [downloading, setDownloading] = useState<BibleVersionId | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<BibleVersionId>(getPreferredBibleVersion());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMsg, setDownloadMsg] = useState('');
  const [modelStatus, setModelStatus] = useState(getModelStatus());
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelMsg, setModelMsg] = useState('');

  const refreshStatus = useCallback(async () => {
    const status = await getBibleDownloadStatus();
    setKjvCount(status.kjvCount);
    setWebCount(status.webCount);
    setAsvCount(status.asvCount);
    setSwCount(status.swCount);
    setSelectedVersion(getPreferredBibleVersion());
    setModelStatus(getModelStatus());
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleDownloadVersion = async (version: BibleVersionId) => {
    setDownloading(version);
    setDownloadProgress(0);
    try {
      const count = await downloadBibleVersion(version, (msg, pct) => {
        setDownloadMsg(msg);
        setDownloadProgress(pct);
      });
      setPreferredBibleVersion(version);
      setSelectedVersion(version);
      const label = BIBLE_VERSIONS.find(v => v.id === version)?.label ?? version;
      toast({ title: `Downloaded ${count} ${label} books ✅` });
    } catch (err) {
      toast({ title: 'Download failed', description: String(err), variant: 'destructive' });
    } finally {
      setDownloading(null);
      refreshStatus();
    }
  };

  const handleDownloadKJV = async () => { await handleDownloadVersion('kjv'); };
  const handleDownloadWeb = async () => { await handleDownloadVersion('web'); };
  const handleDownloadAsv = async () => { await handleDownloadVersion('asv'); };
  const handleDownloadSwahili = async () => { await handleDownloadVersion('swahili'); };

  const [memoryWarningShown, setMemoryWarningShown] = useState(false);

  const handleLoadModel = async () => {
    const capability = checkDeviceCapability();
    if (!capability.safe && !memoryWarningShown) {
      setMemoryWarningShown(true);
      toast({ title: '⚠️ Memory Warning', description: capability.warning, variant: 'destructive' });
      return;
    }
    setMemoryWarningShown(false);
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
  const webComplete = webCount >= KJV_BOOKS.length;
  const asvComplete = asvCount >= KJV_BOOKS.length;
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

        {/* WEB Download */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">WEB Bible</span>
              {webComplete && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Downloaded
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {webCount}/{KJV_BOOKS.length} books
            </span>
          </div>
          {downloading === 'web' ? (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{downloadMsg}</p>
            </div>
          ) : !webComplete ? (
            <Button size="sm" variant="outline" onClick={handleDownloadWeb} className="w-full">
              <Download className="w-3 h-3 mr-2" />
              Download WEB (~4.5MB)
            </Button>
          ) : null}
        </div>

        {/* ASV Download */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">ASV Bible</span>
              {asvComplete && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Downloaded
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {asvCount}/{KJV_BOOKS.length} books
            </span>
          </div>
          {downloading === 'asv' ? (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{downloadMsg}</p>
            </div>
          ) : !asvComplete ? (
            <Button size="sm" variant="outline" onClick={handleDownloadAsv} className="w-full">
              <Download className="w-3 h-3 mr-2" />
              Download ASV (~4.5MB)
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
          {downloading === 'swahili' ? (
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

        <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Preferred offline version</div>
          <div className="flex flex-wrap gap-2">
            {BIBLE_VERSIONS.map(version => (
              <Button
                key={version.id}
                size="sm"
                variant={selectedVersion === version.id ? 'default' : 'outline'}
                className="h-7 text-[10px]"
                onClick={() => {
                  setSelectedVersion(version.id);
                  setPreferredBibleVersion(version.id);
                  toast({ title: `${version.label} selected for offline Scripture Guide` });
                }}
              >
                {version.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Scripture Bot (lightweight offline assistant) */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Scripture Bot (Offline)</span>
              {modelStatus.isLoaded && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A lightweight, purpose-built Bible assistant that works fully offline using your downloaded scriptures. No big download, no memory crashes — instant answers for verses, topics, and characters.
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
              Disable Scripture Bot
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleLoadModel} className="w-full">
              <Cpu className="w-3 h-3 mr-2" />
              Enable Scripture Bot
            </Button>
          )}
          {modelStatus.error && (
            <p className="text-xs text-destructive">{modelStatus.error}</p>
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
