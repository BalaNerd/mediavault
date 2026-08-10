'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Folder, Cpu, Activity, CheckCircle2, XCircle, ShieldCheck, AlertTriangle, Server } from 'lucide-react';
import { toast } from 'sonner';
import type { AppSettings, DuplicateBehavior } from '@/types/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => toast.error('Failed to load settings'));

    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings');
        return;
      }

      setSettings(data.settings);
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  const isWorkerMode = health?.mode === 'worker';
  const workerInfo = health?.worker as { configured: boolean; url?: string; connected?: boolean; error?: string } | undefined;
  const binaries = (health?.binaries as Record<string, { available: boolean; version?: string; path?: string; warning?: string; error?: string }>) || {};
  const pythonInfo = binaries.python;
  const sqliteInfo = health?.sqlite as { status: string; path?: string; error?: string } | undefined;
  const downloadDirInfo = health?.downloadDir as { path: string; status: string; error?: string } | undefined;

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure MediaVault download paths, backends, duplicate behavior, and system preferences.
          </p>
        </div>
        <div>
          {isWorkerMode ? (
            <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs">
              <Server className="w-3.5 h-3.5 mr-1.5" /> Worker Mode
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> Local Mode
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Worker Status Banner if in worker mode */}
        {isWorkerMode && (
          <Card className="border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md">
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" /> Remote Download Worker
                </span>
                {workerInfo?.connected ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/10">
                    <XCircle className="w-3 h-3 mr-1" /> Disconnected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="font-mono text-xs text-muted-foreground">
                Target: {workerInfo?.url || 'Configured via MEDIAVAULT_WORKER_URL'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Storage Configuration */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" /> Storage Configuration
            </CardTitle>
            <CardDescription>
              Set output directory and handle duplicate file collisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="downloadDir">Download Directory Path</Label>
              <Input
                id="downloadDir"
                value={isWorkerMode ? 'Managed by Download Worker (Remote Volume)' : settings.downloadDir}
                disabled={isWorkerMode}
                onChange={(e) =>
                  setSettings({ ...settings, downloadDir: e.target.value })
                }
                className="bg-secondary/40 font-mono text-sm"
                placeholder="~/Downloads/MediaVault"
              />
              <p className="text-xs text-muted-foreground">
                {isWorkerMode
                  ? 'In production worker mode, storage path is managed securely by the worker environment.'
                  : 'Files will be saved in this folder on your system or volume.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicateBehavior">Duplicate File Handling</Label>
              <select
                id="duplicateBehavior"
                value={settings.duplicateBehavior || 'rename'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    duplicateBehavior: e.target.value as DuplicateBehavior,
                  })
                }
                className="w-full sm:w-64 h-10 px-3 rounded-xl bg-secondary/40 border border-border/60 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="rename">Rename automatically (e.g. file (1).mp4)</option>
                <option value="overwrite">Overwrite existing file</option>
                <option value="skip">Skip download if file exists</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Queue & Performance */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Queue &amp; Concurrency
            </CardTitle>
            <CardDescription>
              Manage concurrent download limits and process timeout protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxConcurrent">Max Concurrent Downloads</Label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxConcurrentDownloads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxConcurrentDownloads: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="bg-secondary/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="processTimeout">Process Timeout (seconds)</Label>
                <Input
                  id="processTimeout"
                  type="number"
                  min={60}
                  max={3600}
                  value={settings.processTimeoutSeconds || 900}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      processTimeoutSeconds: parseInt(e.target.value, 10) || 900,
                    })
                  }
                  className="bg-secondary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="resumeDownloads"
                checked={settings.resumeDownloads ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, resumeDownloads: e.target.checked })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <Label htmlFor="resumeDownloads" className="cursor-pointer text-sm font-normal">
                Resume interrupted downloads automatically when provider supports it
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Binary Paths (Local Mode only) */}
        {!isWorkerMode && (
          <Card className="border-border/80 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Executable Binary Paths
              </CardTitle>
              <CardDescription>
                Specify explicit system paths if binaries are not on default system PATH.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ytdlpPath">yt-dlp Path</Label>
                <Input
                  id="ytdlpPath"
                  value={settings.ytdlpPath || 'yt-dlp'}
                  onChange={(e) => setSettings({ ...settings, ytdlpPath: e.target.value })}
                  className="bg-secondary/40 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ffmpegPath">FFmpeg Path</Label>
                <Input
                  id="ffmpegPath"
                  value={settings.ffmpegPath || 'ffmpeg'}
                  onChange={(e) => setSettings({ ...settings, ffmpegPath: e.target.value })}
                  className="bg-secondary/40 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spotdlPath">spotdl Path</Label>
                <Input
                  id="spotdlPath"
                  value={settings.spotdlPath || 'spotdl'}
                  onChange={(e) => setSettings({ ...settings, spotdlPath: e.target.value })}
                  className="bg-secondary/40 font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Status */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> System Diagnostics
            </CardTitle>
            <CardDescription>
              Live verification of system tools, SQLite database, and download directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* System Info */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="font-semibold text-primary">{isWorkerMode ? 'Production Worker' : 'Local Engine'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span>{String(health?.platform || (health?.frontend as Record<string, unknown>)?.platform || 'unknown')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node:</span>
                <span>{String(health?.nodeVersion || (health?.frontend as Record<string, unknown>)?.nodeVersion || 'unknown')}</span>
              </div>
            </div>

            {/* Python Status & Warning */}
            {pythonInfo && (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold block">Python Runtime</span>
                    <span className="text-[11px] font-mono text-muted-foreground truncate block">
                      Version: {pythonInfo.version || 'unknown'}
                    </span>
                  </div>
                  {pythonInfo.available ? (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 shrink-0">
                      <XCircle className="w-3 h-3 mr-1" /> Missing
                    </Badge>
                  )}
                </div>
                {pythonInfo.warning && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pythonInfo.warning}</span>
                  </div>
                )}
              </div>
            )}

            {/* SQLite Status */}
            {sqliteInfo && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50 text-sm">
                <div>
                  <span className="font-semibold block">SQLite Database</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block max-w-[200px]">
                    {sqliteInfo?.path || 'unknown'}
                  </span>
                </div>
                {sqliteInfo?.status === 'Connected' ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/10 shrink-0">
                    <XCircle className="w-3 h-3 mr-1" /> Error
                  </Badge>
                )}
              </div>
            )}

            {/* Download Directory Status */}
            {downloadDirInfo && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50 text-sm">
                <div>
                  <span className="font-semibold block">Download Directory</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate block max-w-[200px]">
                    {downloadDirInfo?.path || 'unknown'}
                  </span>
                </div>
                {downloadDirInfo?.status === 'OK' ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-400 border-rose-500/30 bg-rose-500/10 shrink-0">
                    <XCircle className="w-3 h-3 mr-1" /> {downloadDirInfo?.status || 'Error'}
                  </Badge>
                )}
              </div>
            )}

            {/* Binary Tools */}
            {binaries && Object.keys(binaries).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: 'yt-dlp', data: binaries.ytdlp },
                  { name: 'ffmpeg', data: binaries.ffmpeg },
                  { name: 'spotdl', data: binaries.spotdl },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50 text-sm"
                  >
                    <div>
                      <span className="font-semibold block">{tool.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground truncate block max-w-[130px]">
                        {tool.data?.version ? tool.data.version.slice(0, 25) : tool.data?.path || 'default'}
                      </span>
                    </div>

                    {tool.data?.available ? (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 shrink-0">
                        <XCircle className="w-3 h-3 mr-1" /> Not Found
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-6 h-11 rounded-xl glow-violet">
            <Save className="w-4 h-4 mr-2" />
            <span>Save Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
